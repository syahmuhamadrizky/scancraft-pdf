import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  FilePlus2,
  Loader2,
  MoveHorizontal,
  ScanLine,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { LoadedPdfFile, ScanSettings, ViewMode } from '../types/scan';

interface PreviewStageProps {
  files: LoadedPdfFile[];
  activeFile: LoadedPdfFile;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  pageNumber: number;
  onChangePage: (page: number) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  originalUrl: string | null;
  scannedUrl: string | null;
  pageSizePt: { widthPt: number; heightPt: number } | null;
  renderMs: number | null;
  isRendering: boolean;
  settings: ScanSettings;
}

const ZOOM_STEPS = [0.65, 0.85, 1.0, 1.25, 1.5];

export const PreviewStage: React.FC<PreviewStageProps> = ({
  files,
  activeFile,
  onSelectFile,
  onRemoveFile,
  onAddFiles,
  pageNumber,
  onChangePage,
  viewMode,
  onChangeViewMode,
  originalUrl,
  scannedUrl,
  pageSizePt,
  renderMs,
  isRendering,
  settings,
}) => {
  const addInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');

  const updateSplitFromClientX = (clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(2, Math.min(98, pct)));
  };

  const aspectRatio = pageSizePt
    ? pageSizePt.widthPt / pageSizePt.heightPt
    : 595 / 842;

  const widthMm = pageSizePt ? Math.round((pageSizePt.widthPt * 25.4) / 72) : 210;
  const heightMm = pageSizePt ? Math.round((pageSizePt.heightPt * 25.4) / 72) : 297;

  const frameStyle: React.CSSProperties =
    zoomMode === 'fit'
      ? {
          width:
            viewMode === 'side-by-side'
              ? `min(42vw, 460px, calc((100vh - 250px) * ${aspectRatio}))`
              : `min(90%, 640px, calc((100vh - 225px) * ${aspectRatio}))`,
          aspectRatio: `${aspectRatio}`,
        }
      : {
          width: `${Math.round((viewMode === 'side-by-side' ? 420 : 620) * zoomMode)}px`,
          aspectRatio: `${aspectRatio}`,
          flexShrink: 0,
        };

  const zoomIn = () => {
    if (zoomMode === 'fit') {
      setZoomMode(1.0);
      return;
    }
    const next = ZOOM_STEPS.find((z) => z > zoomMode);
    if (next) setZoomMode(next);
  };

  const zoomOut = () => {
    if (zoomMode === 'fit') {
      setZoomMode(0.85);
      return;
    }
    const prev = [...ZOOM_STEPS].reverse().find((z) => z < zoomMode);
    if (prev) setZoomMode(prev);
  };

  const modeLabel =
    settings.colorMode === 'color'
      ? 'Berwarna'
      : settings.colorMode === 'grayscale'
        ? 'Grayscale'
        : 'Hitam-Putih';

  return (
    <section className="preview-column">
      {/* Multi-file bar */}
      <div className="file-tabs-bar">
        {files.map((f) => (
          <div
            key={f.id}
            className={`file-tab ${f.id === activeFile.id ? 'active' : ''}`}
            onClick={() => onSelectFile(f.id)}
            title={`${f.name} (${f.numPages} hal)`}
          >
            <span className="file-tab-name">{f.name}</span>
            <span style={{ opacity: 0.72, fontSize: '11px' }}>
              ({f.numPages})
            </span>
            <span
              className="file-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFile(f.id);
              }}
              title="Hapus file ini"
            >
              <X size={12} />
            </span>
          </div>
        ))}

        <input
          ref={addInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          className="dark-btn"
          onClick={() => addInputRef.current?.click()}
          title="Tambahkan file PDF lain"
        >
          <FilePlus2 size={13} />
          Tambah PDF
        </button>
      </div>

      {/* Stage Toolbar */}
      <div className="stage-toolbar">
        {/* Page pagination */}
        <div className="toolbar-group">
          <button
            type="button"
            className="dark-btn"
            disabled={pageNumber <= 1}
            onClick={() => onChangePage(pageNumber - 1)}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>
          {activeFile.numPages > 1 ? (
            <select
              className="page-select"
              value={pageNumber}
              aria-label="Pilih Halaman"
              onChange={(e) => onChangePage(Number(e.target.value))}
            >
              {Array.from({ length: activeFile.numPages }, (_, i) => i + 1).map(
                (p) => (
                  <option key={p} value={p}>
                    Hal {p} / {activeFile.numPages}
                  </option>
                )
              )}
            </select>
          ) : (
            <span className="page-counter">Hal 1 / 1</span>
          )}
          <button
            type="button"
            className="dark-btn"
            disabled={pageNumber >= activeFile.numPages}
            onClick={() => onChangePage(pageNumber + 1)}
            title="Halaman Berikutnya"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* View mode switcher */}
        <div className="segmented-dark">
          <button
            type="button"
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => onChangeViewMode('split')}
            title="Geser garis pemisah untuk membandingkan Asli vs Hasil Scan"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MoveHorizontal size={13} />
              Split Geser
            </span>
          </button>
          <button
            type="button"
            className={viewMode === 'scanned' ? 'active' : ''}
            onClick={() => onChangeViewMode('scanned')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ScanLine size={13} />
              Hasil Scan
            </span>
          </button>
          <button
            type="button"
            className={viewMode === 'side-by-side' ? 'active' : ''}
            onClick={() => onChangeViewMode('side-by-side')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Columns2 size={13} />
              Berdampingan
            </span>
          </button>
          <button
            type="button"
            className={viewMode === 'original' ? 'active' : ''}
            onClick={() => onChangeViewMode('original')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Eye size={13} />
              Asli
            </span>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="toolbar-group">
          <button
            type="button"
            className="dark-btn"
            onClick={zoomOut}
            title="Perkecil"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className={`dark-btn ${zoomMode === 'fit' ? 'active' : ''}`}
            onClick={() => setZoomMode('fit')}
          >
            {zoomMode === 'fit' ? 'Fit' : `${Math.round(zoomMode * 100)}%`}
          </button>
          <button
            type="button"
            className="dark-btn"
            onClick={zoomIn}
            title="Perbesar"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Main Stage Viewport */}
      <div className="stage-viewport">
        {viewMode === 'side-by-side' ? (
          <div className="side-by-side-wrap">
            <div className="side-card">
              <span className="side-label">Asli (PDF Word)</span>
              <div className="paper-frame" style={frameStyle}>
                {originalUrl && <img src={originalUrl} alt="PDF Asli" />}
              </div>
            </div>
            <div className="side-card">
              <span className="side-label" style={{ background: 'rgba(37,99,235,0.35)', color: '#dbeafe' }}>
                Hasil Scan
              </span>
              <div className="paper-frame" style={frameStyle}>
                {scannedUrl && <img src={scannedUrl} alt="Hasil Scan" />}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={frameRef}
            className="paper-frame"
            style={{
              ...frameStyle,
              cursor: viewMode === 'split' ? 'ew-resize' : 'default',
            }}
            onPointerDown={(e) => {
              if (viewMode !== 'split') return;
              setDraggingSplit(true);
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              updateSplitFromClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!draggingSplit || viewMode !== 'split') return;
              updateSplitFromClientX(e.clientX);
            }}
            onPointerUp={(e) => {
              if (draggingSplit) {
                setDraggingSplit(false);
                (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
              }
            }}
          >
            {viewMode === 'original' ? (
              originalUrl && <img src={originalUrl} alt="Halaman Asli" />
            ) : viewMode === 'scanned' ? (
              scannedUrl && <img src={scannedUrl} alt="Halaman Hasil Scan" />
            ) : (
              <>
                {scannedUrl && <img src={scannedUrl} alt="Hasil Scan" />}
                {originalUrl && (
                  <div
                    className="split-original-layer"
                    style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
                  >
                    <img src={originalUrl} alt="Asli Word" />
                  </div>
                )}

                <span className="corner-badge left">ASLI (WORD)</span>
                <span className="corner-badge right">HASIL SCAN</span>

                <div
                  className="split-handle"
                  style={{ left: `${splitPct}%` }}
                >
                  <div className="split-line" />
                  <div className="split-knob">
                    <MoveHorizontal size={15} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {isRendering && (
          <div className="rendering-pill">
            <Loader2 size={14} className="spin" />
            Memproses preview...
          </div>
        )}
      </div>

      {/* Stage Footer */}
      <div className="stage-footer">
        <span className="stage-footer-mono">
          Ukuran: {widthMm} × {heightMm} mm • Output: {settings.dpi} DPI • {modeLabel}
        </span>
        <span className="stage-footer-mono">
          {renderMs !== null ? `Preview: ${renderMs} ms` : 'Menyiapkan preview...'}
        </span>
      </div>
    </section>
  );
};

