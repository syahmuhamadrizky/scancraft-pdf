import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { ScanSettings } from '../types/scan';
import { applyScanEffects } from './scanProcessor';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfDocHandle = pdfjsLib.PDFDocumentProxy;

export async function openPdfDocument(bytes: Uint8Array): Promise<PdfDocHandle> {
  // Always clone bytes so pdf.js worker transfer never detaches caller's Uint8Array
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  return loadingTask.promise;
}

export async function destroyPdfDocument(doc: PdfDocHandle): Promise<void> {
  try {
    await doc.cleanup();
    await doc.loadingTask.destroy();
  } catch {
    // ignore cleanup errors if already destroyed
  }
}

export interface RenderedPageResult {
  canvas: HTMLCanvasElement;
  widthPt: number;
  heightPt: number;
}

export async function renderPdfPage(
  pdfDoc: PdfDocHandle,
  pageNumber: number,
  dpi: number,
  reuseCanvas?: HTMLCanvasElement
): Promise<RenderedPageResult> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = reuseCanvas ?? document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal membuat canvas context untuk merender PDF.');

  // Fill pure white first so transparent PDF backgrounds don't turn black in JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  page.cleanup();

  return {
    canvas,
    widthPt: baseViewport.width,
    heightPt: baseViewport.height,
  };
}

export function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Gagal mengonversi halaman ke gambar JPEG.'));
          return;
        }
        try {
          const buffer = await blob.arrayBuffer();
          resolve(new Uint8Array(buffer));
        } catch (err) {
          reject(err);
        }
      },
      'image/jpeg',
      quality
    );
  });
}

export async function exportScannedPdf(
  pdfBytes: Uint8Array,
  settings: ScanSettings,
  onProgress: (currentPage: number, totalPages: number) => void,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const srcDoc = await openPdfDocument(pdfBytes);
  const outPdf = await PDFDocument.create();
  outPdf.setProducer('ScanCraft PDF');
  outPdf.setCreator('ScanCraft PDF Local Studio');

  const workSrcCanvas = document.createElement('canvas');
  const workOutCanvas = document.createElement('canvas');

  try {
    const total = srcDoc.numPages;
    for (let pageIdx = 1; pageIdx <= total; pageIdx++) {
      if (signal?.aborted) {
        throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
      }

      onProgress(pageIdx, total);
      // Let browser paint progress UI smoothly
      await new Promise((r) => setTimeout(r, 0));

      const { canvas, widthPt, heightPt } = await renderPdfPage(
        srcDoc,
        pageIdx,
        settings.dpi,
        workSrcCanvas
      );

      if (signal?.aborted) {
        throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
      }

      const scannedCanvas = applyScanEffects(canvas, pageIdx, settings, workOutCanvas);
      const jpegBytes = await canvasToJpegBytes(scannedCanvas, settings.jpegQuality);

      const embeddedImg = await outPdf.embedJpg(jpegBytes);
      const outPage = outPdf.addPage([widthPt, heightPt]);
      outPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
      });
    }

    return await outPdf.save();
  } finally {
    workSrcCanvas.width = 0;
    workSrcCanvas.height = 0;
    workOutCanvas.width = 0;
    workOutCanvas.height = 0;
    await destroyPdfDocument(srcDoc);
  }
}
