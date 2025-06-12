import { useState, useEffect } from 'react';
import { AppSettings, defaultSettings } from '@/types/settings';

// ユーザーの環境に応じて最適なズーム感度を検出
const detectOptimalZoomSensitivity = (): number => {
  // デバイスタイプを検出
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isTrackpad = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // デバイスピクセル比も考慮
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Mac + トラックパッドの場合はより敏感に
  if (isMac && isTrackpad) {
    return devicePixelRatio > 1 ? 0.03 : 0.025;
  }
  
  // 通常のマウスの場合
  if (!isTrackpad) {
    return devicePixelRatio > 1 ? 0.02 : 0.015;
  }
  
  // その他の場合はデフォルト
  return defaultSettings.zoomSensitivity;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('canvasSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        
        // Validate zoom sensitivity and apply defaults if invalid
        const validatedSettings = {
          ...defaultSettings,
          ...parsed,
          zoomSensitivity: (parsed.zoomSensitivity >= 0.01 && parsed.zoomSensitivity <= 0.05) 
            ? parsed.zoomSensitivity 
            : defaultSettings.zoomSensitivity
        };
        
        setSettings(validatedSettings);
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    } else {
      // 初回利用時に自動的に適切なズーム感度を設定
      const autoDetectedSensitivity = detectOptimalZoomSensitivity();
      if (autoDetectedSensitivity !== defaultSettings.zoomSensitivity) {
        setSettings(prev => ({ ...prev, zoomSensitivity: autoDetectedSensitivity }));
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('canvasSettings', JSON.stringify(settings));
  }, [settings]);


  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};