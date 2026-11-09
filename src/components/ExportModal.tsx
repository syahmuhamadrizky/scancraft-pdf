import React from 'react';
import { Loader2 } from 'lucide-react';
import { ExportProgress } from '../types/scan';

interface ExportModalProps {
  progress: ExportProgress;
  onCancel: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ progress, onCancel }) => {
  if (!progress.active) return null;

  const pct =
    progress.totalPages > 0
      ? Math.round((progress.currentPage / progress.totalPages) * 100)
      : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Loader2 size={20} className="spin" style={{ color: 'var(--accent)' }} />
          <h2 className="modal-title" style={{ margin: 0 }}>
            Membuat PDF Hasil Scan...
          </h2>
        </div>

        <p className="modal-sub">
          {progress.totalFiles > 1
            ? `File ${progress.currentFileIndex} dari ${progress.totalFiles}: `
            : ''}
          <strong>{progress.fileName}</strong>
        </p>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="progress-meta">
          <span>
            Memproses halaman {progress.currentPage} dari {progress.totalPages}
          </span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {pct}%
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Batalkan
          </button>
        </div>
      </div>
    </div>
  );
};

