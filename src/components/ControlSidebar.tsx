import React from 'react';
import {
  Download,
  FolderArchive,
  Palette,
  RotateCcw,
  Scan,
  Shuffle,
  Sliders,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import { ColorMode, PaperTone, ScanPreset, ScanSettings } from '../types/scan';
import { PAPER_TONE_COLORS, SCAN_PRESETS } from '../engine/presets';

interface ControlSidebarProps {
  settings: ScanSettings;
  onUpdate: (patch: Partial<ScanSettings>) => void;
  onApplyPreset: (preset: ScanPreset) => void;
  onRandomizeSeed: () => void;
  onReset: () => void;
  onDownloadCurrent: () => void;
  onDownloadAllZip: () => void;
  fileCount: number;
  activeFilePages: number;
  isExporting: boolean;
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (val: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}) => {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <div className="slider-top">
        <span className="slider-label">{label}</span>
        <span className="slider-val">{displayValue}</span>
      </div>
      <input
        type="range"
        className="styled-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct.toFixed(1)}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};

const DPI_OPTIONS: Array<ScanSettings['dpi']> = [100, 150, 200, 300];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  settings,
  onUpdate,
  onApplyPreset,
  onRandomizeSeed,
  onReset,
  onDownloadCurrent,
  onDownloadAllZip,
  fileCount,
  activeFilePages,
  isExporting,
}) => {
  return (
    <aside className="control-sidebar">
      <div className="sidebar-scroll">
        {/* 1. Presets */}
        <section className="section-block">
          <div className="section-header">
            <div className="section-title">
              <Sparkles size={14} />
              Preset Cepat
            </div>
            {settings.presetId === 'custom' && (
              <span className="custom-badge">Kustom</span>
            )}
          </div>
          <div className="preset-grid">
            {SCAN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-card ${settings.presetId === preset.id ? 'active' : ''}`}
                onClick={() => onApplyPreset(preset)}
              >
                <div className="preset-top">
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-tag">{preset.badge}</span>
                </div>
                <div className="preset-desc">{preset.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Color & Paper */}
        <section className="section-block">
          <div className="section-title">
            <Palette size={14} />
            Warna &amp; Kertas
          </div>

          <div className="segmented-light">
            {(
              [
                { id: 'color', label: 'Berwarna' },
                { id: 'grayscale', label: 'Grayscale' },
                { id: 'bw', label: 'Hitam-Putih' },
              ] as Array<{ id: ColorMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                className={settings.colorMode === m.id ? 'active' : ''}
                onClick={() => onUpdate({ colorMode: m.id, presetId: 'custom' })}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="swatch-row">
            {(Object.keys(PAPER_TONE_COLORS) as PaperTone[]).map((tone) => {
              const item = PAPER_TONE_COLORS[tone];
              return (
                <button
                  key={tone}
                  type="button"
                  className={`swatch-btn ${settings.paperTone === tone ? 'active' : ''}`}
                  onClick={() => onUpdate({ paperTone: tone, presetId: 'custom' })}
                >
                  <span
                    className="swatch-dot"
                    style={{ background: item.swatch }}
                  />
                  <span>{item.label.split(' ')[1] ?? item.label}</span>
                </button>
              );
            })}
          </div>

          {settings.paperTone !== 'pure' && (
            <SliderControl
              label="Intensitas Warna Kertas"
              value={settings.paperToneStrength}
              min={0}
              max={100}
              step={1}
              displayValue={`${settings.paperToneStrength}%`}
              onChange={(v) => onUpdate({ paperToneStrength: v, presetId: 'custom' })}
            />
          )}

          {settings.colorMode === 'bw' && (
            <SliderControl
              label="Ambang Batas B&W (Threshold)"
              value={settings.bwThreshold}
              min={80}
              max={220}
              step={1}
              displayValue={`${settings.bwThreshold}`}
              onChange={(v) => onUpdate({ bwThreshold: v, presetId: 'custom' })}
            />
          )}

          <SliderControl
            label="Kontras"
            value={settings.contrast}
            min={0.7}
            max={1.7}
            step={0.02}
            displayValue={`${Math.round(settings.contrast * 100)}%`}
            onChange={(v) => onUpdate({ contrast: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Kecerahan"
            value={settings.brightness}
            min={-35}
            max={35}
            step={1}
            displayValue={
              settings.brightness > 0
                ? `+${settings.brightness}`
                : `${settings.brightness}`
            }
            onChange={(v) => onUpdate({ brightness: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Penebalan Tinta (Ink Bleed)"
            value={settings.inkBleed}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.inkBleed}%`}
            onChange={(v) => onUpdate({ inkBleed: v, presetId: 'custom' })}
          />
        </section>

        {/* 3. Geometry & Scanner Alignment */}
        <section className="section-block">
          <div className="section-title">
            <Scan size={14} />
            Geometri &amp; Posisi Kertas
          </div>

          <SliderControl
            label="Kemiringan (Skew)"
            value={settings.skew}
            min={0}
            max={3.5}
            step={0.05}
            displayValue={`${settings.skew.toFixed(2)}°`}
            onChange={(v) => onUpdate({ skew: v, presetId: 'custom' })}
          />

          <label className="toggle-row">
            <span>Acak arah &amp; sudut tiap halaman</span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.randomizeSkew}
                onChange={(e) =>
                  onUpdate({ randomizeSkew: e.target.checked, presetId: 'custom' })
                }
              />
              <span className="toggle-track" />
            </span>
          </label>

          <SliderControl
            label="Pergeseran Margin (Offset)"
            value={settings.offset}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.offset}%`}
            onChange={(v) => onUpdate({ offset: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Tepi Tutup Scanner (Border)"
            value={settings.scannerBorder}
            min={0}
            max={100}
            step={1}
            displayValue={settings.scannerBorder === 0 ? 'Mati' : `${settings.scannerBorder}%`}
            onChange={(v) => onUpdate({ scannerBorder: v, presetId: 'custom' })}
          />
        </section>

        {/* 4. Texture, Noise & Shadows */}
        <section className="section-block">
          <div className="section-title">
            <SunMedium size={14} />
            Tekstur, Noise &amp; Bayangan
          </div>

          <SliderControl
            label="Noise / Bintik Kertas"
            value={settings.noise}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.noise}%`}
            onChange={(v) => onUpdate({ noise: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Debu &amp; Garis Halus Scanner"
            value={settings.dust}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.dust}%`}
            onChange={(v) => onUpdate({ dust: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Blur / Kelembutan Tinta"
            value={settings.blur}
            min={0}
            max={2.2}
            step={0.05}
            displayValue={`${settings.blur.toFixed(2)} px`}
            onChange={(v) => onUpdate({ blur: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Bayangan Pinggir (Vignette)"
            value={settings.vignette}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.vignette}%`}
            onChange={(v) => onUpdate({ vignette: v, presetId: 'custom' })}
          />

          <SliderControl
            label="Bayangan Sisi Kiri / Jilid"
            value={settings.spineShadow}
            min={0}
            max={100}
            step={1}
            displayValue={`${settings.spineShadow}%`}
            onChange={(v) => onUpdate({ spineShadow: v, presetId: 'custom' })}
          />
        </section>

        {/* 5. Output Quality */}
        <section className="section-block">
          <div className="section-title">
            <Sliders size={14} />
            Kualitas PDF Output
          </div>

          <div className="slider-row">
            <div className="slider-top">
              <span className="slider-label">Resolusi Scan (DPI)</span>
              <span className="slider-val">{settings.dpi} DPI</span>
            </div>
            <div className="segmented-light cols-4">
              {DPI_OPTIONS.map((dpi) => (
                <button
                  key={dpi}
                  type="button"
                  className={settings.dpi === dpi ? 'active' : ''}
                  onClick={() => onUpdate({ dpi, presetId: 'custom' })}
                >
                  {dpi}
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            label="Kualitas Kompresi JPEG"
            value={Math.round(settings.jpegQuality * 100)}
            min={45}
            max={95}
            step={1}
            displayValue={`${Math.round(settings.jpegQuality * 100)}%`}
            onChange={(v) =>
              onUpdate({ jpegQuality: Number((v / 100).toFixed(2)), presetId: 'custom' })
            }
          />
        </section>
      </div>

      {/* Sticky Footer Actions */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRandomizeSeed}
            title="Acak ulang sudut kemiringan dan letak bintik debu"
          >
            <Shuffle size={13} />
            Acak Variasi
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReset}
            title="Kembalikan ke pengaturan standar"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isExporting}
          onClick={onDownloadCurrent}
        >
          <Download size={16} />
          {fileCount > 1
            ? `Download File Ini (${activeFilePages} Hal)`
            : `Download PDF Hasil Scan (${activeFilePages} Hal)`}
        </button>

        {fileCount > 1 && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isExporting}
            onClick={onDownloadAllZip}
          >
            <FolderArchive size={15} />
            Download Semua ({fileCount} File .ZIP)
          </button>
        )}
      </div>
    </aside>
  );
};

