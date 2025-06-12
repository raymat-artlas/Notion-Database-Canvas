export interface AppSettings {
  zoomSensitivity: number;
  panSensitivity: number;
  gridVisible: boolean;
  backgroundPattern: 'none' | 'dots' | 'grid';
  snapToGrid: boolean;
  confirmPropertyDeletion: boolean;
}

export const defaultSettings: AppSettings = {
  zoomSensitivity: 0.02, // 2% per scroll
  panSensitivity: 1.0,
  gridVisible: true,
  backgroundPattern: 'grid',
  snapToGrid: false,
  confirmPropertyDeletion: true,
};