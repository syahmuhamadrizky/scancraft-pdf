import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RotateCw, ScanLine, ShieldCheck } from 'lucide-react';
import {
  ExportProgress,
  LoadedPdfFile,
  ScanPreset,
  ScanSettings,
  ViewMode,
} from './types/scan';
import { DEFAULT_SCAN_SETTINGS } from './engine/presets';
import {
  destroyPdfDocument,
  exportScannedPdf,
  openPdfDocument,
  PdfDocHandle,
  renderPdfPage,
} from './engine/pdfService';
import { applyScanEffects } from './engine/scanProcessor';
import { generateSampleWordPdf } from './engine/samplePdfGenerator';
import { createZipArchive } from './engine/zipBuilder';
import { DropzoneView } from './components/DropzoneView';
import { PreviewStage } from './components/PreviewStage';
import { ControlSidebar } from './components/ControlSidebar';
import { ExportModal } from './components/ExportModal';

interface CachedSourcePage {
  key: string;
  canvas: HTMLCanvasElement;
  originalUrl: string;
  widthPt: number;
  heightPt: number;
}

function triggerBlobDownload(bytes: Uint8Array, filename: string, mime: string) {
  const safeCopy = new Uint8Array(bytes.byteLength);
  safeCopy.set(bytes);
  const blob = new Blob([safeCopy.buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function makeScannedFilename(originalName: string): string {
  const clean = originalName.replace(/\.pdf$/i, '');
  return `${clean}_scanned.pdf`;
}

export function App() {
  const [files, setFiles] = useState<LoadedPdfFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SCAN_SETTINGS);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDraggingOverStudio, setIsDraggingOverStudio] = useState(false);

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [pageSizePt, setPageSizePt] = useState<{
    widthPt: number;
    heightPt: number;
  } | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    active: false,
    fileName: '',
    currentFileIndex: 0,
    totalFiles: 0,
    currentPage: 0,
    totalPages: 0,
  });

  const pdfDocsRef = useRef<Map<string, PdfDocHandle>>(new Map());
  const sourceCacheRef = useRef<CachedSourcePage | null>(null);
  const scannedUrlRef = useRef<string | null>(null);
  const previewReqIdRef = useRef(0);
  const exportAbortRef = useRef<AbortController | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannedUrlRef.current) URL.revokeObjectURL(scannedUrlRef.current);
      if (sourceCacheRef.current) {
        URL.revokeObjectURL(sourceCacheRef.current.originalUrl);
      }
      pdfDocsRef.current.forEach((doc) => {
        void destroyPdfDocument(doc);
      });
      pdfDocsRef.current.clear();
    };
  }, []);

  const loadPdfEntries = useCallback(
    async (incoming: Array<{ name: string; bytes: Uint8Array }>) => {
      setIsLoadingFile(true);
      setLoadError(null);
      try {
        const added: LoadedPdfFile[] = [];
        for (const item of incoming) {
          const doc = await openPdfDocument(item.bytes);
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          pdfDocsRef.current.set(id, doc);
          added.push({
            id,
            name: item.name,
            sizeBytes: item.bytes.byteLength,
            numPages: doc.numPages,
            bytes: item.bytes,
          });
        }
        if (added.length > 0) {
          setFiles((prev) => [...prev, ...added]);
          setActiveFileId(added[0].id);
          setPageNumber(1);
        }
      } catch (err) {
        console.error(err);
        setLoadError(
          'Gagal membaca file PDF. Pastikan file tidak rusak atau terkunci password.'
        );
      } finally {
        setIsLoadingFile(false);
      }
    },
    []
  );

  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      const pdfFiles = selectedFiles.filter(
        (f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (pdfFiles.length === 0) {
        setLoadError('Mohon pilih file berformat .pdf (misalnya hasil Save As PDF dari Word).');
        return;
      }

      const entries: Array<{ name: string; bytes: Uint8Array }> = [];
      for (const f of pdfFiles) {
        const buf = await f.arrayBuffer();
        entries.push({ name: f.name, bytes: new Uint8Array(buf) });
      }
      await loadPdfEntries(entries);
    },
    [loadPdfEntries]
  );

  const handleLoadSample = useCallback(async () => {
    setIsLoadingFile(true);
    setLoadError(null);
    try {
      const bytes = await generateSampleWordPdf();
      await loadPdfEntries([{ name: 'Contoh_Dokumen_Word.pdf', bytes }]);
    } catch (err) {
      console.error(err);
      setLoadError('Gagal membuat contoh PDF.');
      setIsLoadingFile(false);
    }
  }, [loadPdfEntries]);

  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
    setPageNumber(1);
  };

  const handleRemoveFile = (id: string) => {
    const doc = pdfDocsRef.current.get(id);
    if (doc) {
      void destroyPdfDocument(doc);
      pdfDocsRef.current.delete(id);
    }
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
        setPageNumber(1);
      }
      return next;
    });
  };

  // Live preview pipeline
  useEffect(() => {
    if (!activeFile) return;

    const reqId = ++previewReqIdRef.current;
    const previewDpi = settings.dpi === 300 ? 200 : settings.dpi;
    const cacheKey = `${activeFile.id}:${pageNumber}:${previewDpi}`;

    const timer = window.setTimeout(async () => {
      setIsRendering(true);
      const t0 = performance.now();

      try {
        let cached = sourceCacheRef.current;
        if (!cached || cached.key !== cacheKey) {
          let doc = pdfDocsRef.current.get(activeFile.id);
          if (!doc) {
            doc = await openPdfDocument(activeFile.bytes);
            pdfDocsRef.current.set(activeFile.id, doc);
          }

          const { canvas, widthPt, heightPt } = await renderPdfPage(
            doc,
            pageNumber,
            previewDpi
          );
          if (reqId !== previewReqIdRef.current) return;

          const origBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, 'image/png')
          );
          if (!origBlob || reqId !== previewReqIdRef.current) return;

          const origUrl = URL.createObjectURL(origBlob);
          if (sourceCacheRef.current) {
            URL.revokeObjectURL(sourceCacheRef.current.originalUrl);
            sourceCacheRef.current.canvas.width = 0;
            sourceCacheRef.current.canvas.height = 0;
          }
          cached = {
            key: cacheKey,
            canvas,
            originalUrl: origUrl,
            widthPt,
            heightPt,
          };
          sourceCacheRef.current = cached;
          setOriginalUrl(origUrl);
          setPageSizePt({ widthPt, heightPt });
        }

        // Apply realistic scan effects
        const scannedCanvas = applyScanEffects(
          cached.canvas,
          pageNumber,
          settings
        );
        if (reqId !== previewReqIdRef.current) {
          scannedCanvas.width = 0;
          return;
        }

        const scanBlob = await new Promise<Blob | null>((res) =>
          scannedCanvas.toBlob(res, 'image/jpeg', settings.jpegQuality)
        );
        scannedCanvas.width = 0;
        scannedCanvas.height = 0;

        if (!scanBlob || reqId !== previewReqIdRef.current) return;

        const nextUrl = URL.createObjectURL(scanBlob);
        const prevUrl = scannedUrlRef.current;
        scannedUrlRef.current = nextUrl;
        setScannedUrl(nextUrl);
        if (prevUrl) {
          setTimeout(() => URL.revokeObjectURL(prevUrl), 250);
        }

        setRenderMs(Math.max(1, Math.round(performance.now() - t0)));
      } catch (err) {
        console.error('Preview error:', err);
      } finally {
        if (reqId === previewReqIdRef.current) {
          setIsRendering(false);
        }
      }
    }, 35);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeFile, pageNumber, settings]);

  const updateSettings = (patch: Partial<ScanSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (preset: ScanPreset) => {
    setSettings((prev) => ({
      ...preset.settings,
      seed: prev.seed,
    }));
  };

  const randomizeSeed = () => {
    setSettings((prev) => ({
      ...prev,
      seed: Math.floor(Math.random() * 900000) + 1000,
    }));
  };

  const resetSettings = () => {
    setSettings({
      ...DEFAULT_SCAN_SETTINGS,
      seed: settings.seed,
    });
  };

  const handleDownloadCurrent = async () => {
    if (!activeFile) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;

    setExportProgress({
      active: true,
      fileName: activeFile.name,
      currentFileIndex: 1,
      totalFiles: 1,
      currentPage: 1,
      totalPages: activeFile.numPages,
    });

    try {
      const outBytes = await exportScannedPdf(
        activeFile.bytes,
        settings,
        (currentPage, totalPages) => {
          setExportProgress((prev) => ({
            ...prev,
            currentPage,
            totalPages,
          }));
        },
        controller.signal
      );

      triggerBlobDownload(
        outBytes,
        makeScannedFilename(activeFile.name),
        'application/pdf'
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        alert('Terjadi kesalahan saat membuat PDF hasil scan.');
      }
    } finally {
      exportAbortRef.current = null;
      setExportProgress((prev) => ({ ...prev, active: false }));
    }
  };

  const handleDownloadAllZip = async () => {
    if (files.length === 0) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const zipEntries: Array<{ name: string; data: Uint8Array }> = [];
      const usedNames = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setExportProgress({
          active: true,
          fileName: f.name,
          currentFileIndex: i + 1,
          totalFiles: files.length,
          currentPage: 1,
          totalPages: f.numPages,
        });

        const outBytes = await exportScannedPdf(
          f.bytes,
          settings,
          (currentPage, totalPages) => {
            setExportProgress((prev) => ({
              ...prev,
              currentPage,
              totalPages,
            }));
          },
          controller.signal
        );

        let outName = makeScannedFilename(f.name);
        if (usedNames.has(outName)) {
          outName = `${i + 1}_${outName}`;
        }
        usedNames.add(outName);
        zipEntries.push({ name: outName, data: outBytes });
      }

      const zipBytes = createZipArchive(zipEntries);
      triggerBlobDownload(zipBytes, 'Hasil_Scan_PDF.zip', 'application/zip');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        alert('Terjadi kesalahan saat memproses batch PDF.');
      }
    } finally {
      exportAbortRef.current = null;
      setExportProgress((prev) => ({ ...prev, active: false }));
    }
  };

  const cancelExport = () => {
    exportAbortRef.current?.abort();
  };

  return (
    <div
      className="app-shell"
      onDragOver={(e) => {
        if (activeFile) {
          e.preventDefault();
          setIsDraggingOverStudio(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDraggingOverStudio(false);
        }
      }}
      onDrop={(e) => {
        if (activeFile) {
          e.preventDefault();
          setIsDraggingOverStudio(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void handleFilesSelected(Array.from(e.dataTransfer.files));
          }
        }
      }}
    >
      {/* Top Bar */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <ScanLine size={19} />
          </div>
          <div>
            <div className="brand-title">ScanCraft PDF</div>
            <div className="brand-sub">Konverter PDF Word ke Tampilan Hasil Scan</div>
          </div>
        </div>

        <div className="header-actions">
          <span className="privacy-pill" title="Semua proses berjalan offline di browser Anda">
            <ShieldCheck size={14} />
            100% Lokal &amp; Aman
          </span>

          {activeFile && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  pdfDocsRef.current.forEach((d) => void destroyPdfDocument(d));
                  pdfDocsRef.current.clear();
                  if (sourceCacheRef.current) {
                    URL.revokeObjectURL(sourceCacheRef.current.originalUrl);
                    sourceCacheRef.current.canvas.width = 0;
                    sourceCacheRef.current = null;
                  }
                  if (scannedUrlRef.current) {
                    URL.revokeObjectURL(scannedUrlRef.current);
                    scannedUrlRef.current = null;
                  }
                  setFiles([]);
                  setActiveFileId(null);
                  setOriginalUrl(null);
                  setScannedUrl(null);
                }}
              >
                <RotateCw size={14} />
                Ganti Semua File
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={exportProgress.active}
                onClick={handleDownloadCurrent}
              >
                <Download size={14} />
                Download PDF Scan
              </button>
            </>
          )}
        </div>
      </header>

      {!activeFile ? (
        <DropzoneView
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isLoading={isLoadingFile}
          errorMsg={loadError}
        />
      ) : (
        <main className={`studio-body ${isDraggingOverStudio ? 'drag-overlay' : ''}`}>
          <PreviewStage
            files={files}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            onRemoveFile={handleRemoveFile}
            onAddFiles={handleFilesSelected}
            pageNumber={pageNumber}
            onChangePage={setPageNumber}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            originalUrl={originalUrl}
            scannedUrl={scannedUrl}
            pageSizePt={pageSizePt}
            renderMs={renderMs}
            isRendering={isRendering}
            settings={settings}
          />

          <ControlSidebar
            settings={settings}
            onUpdate={updateSettings}
            onApplyPreset={applyPreset}
            onRandomizeSeed={randomizeSeed}
            onReset={resetSettings}
            onDownloadCurrent={handleDownloadCurrent}
            onDownloadAllZip={handleDownloadAllZip}
            fileCount={files.length}
            activeFilePages={activeFile.numPages}
            isExporting={exportProgress.active}
          />
        </main>
      )}

      <ExportModal progress={exportProgress} onCancel={cancelExport} />
    </div>
  );
}

export default App;
