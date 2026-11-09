export type ColorMode = 'color' | 'grayscale' | 'bw';

export type PaperTone = 'pure' | 'hvs' | 'warm' | 'aged';

export type PresetId = 'office' | 'natural' | 'aged' | 'photocopy' | 'custom';

export type ViewMode = 'split' | 'scanned' | 'side-by-side' | 'original';

export interface ScanSettings {
  presetId: PresetId;
  colorMode: ColorMode;
  paperTone: PaperTone;
  paperToneStrength: number; // 0..100
  contrast: number; // 0.7..1.7
  brightness: number; // -35..35
  bwThreshold: number; // 80..220
  skew: number; // 0..3.5 degrees
  randomizeSkew: boolean;
  offset: number; // 0..100
  scannerBorder: number; // 0..100
  noise: number; // 0..100
  dust: number; // 0..100
  blur: number; // 0..2.2 px
  vignette: number; // 0..100
  spineShadow: number; // 0..100
  inkBleed: number; // 0..100
  dpi: 100 | 150 | 200 | 300;
  jpegQuality: number; // 0.45..0.95
  seed: number;
}

export interface ScanPreset {
  id: Exclude<PresetId, 'custom'>;
  name: string;
  description: string;
  badge: string;
  settings: Omit<ScanSettings, 'seed'>;
}

export interface LoadedPdfFile {
  id: string;
  name: string;
  sizeBytes: number;
  numPages: number;
  bytes: Uint8Array;
}

export interface ExportProgress {
  active: boolean;
  fileName: string;
  currentFileIndex: number;
  totalFiles: number;
  currentPage: number;
  totalPages: number;
}

