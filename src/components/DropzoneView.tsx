import React, { useRef, useState } from 'react';
import { FileUp, FileText, Sparkles } from 'lucide-react';

interface DropzoneViewProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  errorMsg: string | null;
}

export const DropzoneView: React.FC<DropzoneViewProps> = ({
  onFilesSelected,
  onLoadSample,
  isLoading,
  errorMsg,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <main className="dropzone-page">
      <div
        className={`dropzone-card ${dragging ? 'dragging' : ''}`}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />

        <div className="dropzone-hero-icon">
          <FileUp size={32} />
        </div>

        <h1 className="dropzone-title">
          Ubah PDF dari Word Jadi Seperti Hasil Scan
        </h1>
        <p className="dropzone-desc">
          Tarik &amp; lepas satu atau beberapa file PDF ke sini. Setiap halaman akan
          di-rasterisasi menjadi gambar dan diberi efek kertas, kemiringan, noise,
          hingga bayangan scanner secara realistis.
        </p>

        <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            <FileText size={16} />
            {isLoading ? 'Memuat Dokumen...' : 'Pilih File PDF'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={isLoading}
            onClick={onLoadSample}
          >
            <Sparkles size={16} />
            Coba Pakai Contoh PDF Word
          </button>
        </div>

        {errorMsg && (
          <p
            style={{
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </p>
        )}

        <div className="dropzone-steps">
          <div className="step-box">
            <span className="step-num">1</span>
            <div className="step-title">Upload PDF Word</div>
            <div className="step-text">
              File tetap di perangkatmu (100% lokal di browser, tanpa upload ke server).
            </div>
          </div>
          <div className="step-box">
            <span className="step-num">2</span>
            <div className="step-title">Atur &amp; Live Preview</div>
            <div className="step-text">
              Geser slider perbandingan sebelum &amp; sesudah untuk mengatur miring, noise,
              dan warna.
            </div>
          </div>
          <div className="step-box">
            <span className="step-num">3</span>
            <div className="step-title">Download PDF Scan</div>
            <div className="step-text">
              Hasil akhir berupa PDF berbasis gambar yang tidak bisa di-select teksnya seperti
              scan asli.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

