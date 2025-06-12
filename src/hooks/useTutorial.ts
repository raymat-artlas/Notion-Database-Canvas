'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  target: string; // CSS selector or ID
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'scroll' | 'none';
}

export interface TutorialConfig {
  id: string;
  name: string;
  steps: TutorialStep[];
  skippable: boolean;
}

const TUTORIAL_STORAGE_KEY = 'tutorial-progress';

interface TutorialProgress {
  [tutorialId: string]: {
    completed: boolean;
    currentStep: number;
    skipped: boolean;
  };
}

export const useTutorial = (config: TutorialConfig, options?: { disabled?: boolean }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<TutorialProgress>({});
  const [isReady, setIsReady] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.error('Failed to parse tutorial progress:', error);
      }
    }
    
    // Mark as ready after a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: TutorialProgress) => {
    setProgress(newProgress);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(newProgress));
  }, []);

  // Check if tutorial is completed
  const isCompleted = progress[config.id]?.completed || false;
  const isSkipped = progress[config.id]?.skipped || false;

  // Start tutorial
  const startTutorial = useCallback((force = false) => {
    if (!force && (isCompleted || isSkipped)) return;
    
    setIsActive(true);
    setCurrentStep(0);
    
    const newProgress = {
      ...progress,
      [config.id]: {
        completed: false,
        currentStep: 0,
        skipped: false,
      },
    };
    saveProgress(newProgress);
  }, [config.id, isCompleted, isSkipped, progress, saveProgress]);

  // Next step
  const nextStep = useCallback(() => {
    if (currentStep < config.steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      
      const newProgress = {
        ...progress,
        [config.id]: {
          ...progress[config.id],
          currentStep: nextStepIndex,
        },
      };
      saveProgress(newProgress);
    } else {
      // Complete tutorial
      completeTutorial();
    }
  }, [config.id, config.steps.length, currentStep, progress, saveProgress]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      
      const newProgress = {
        ...progress,
        [config.id]: {
          ...progress[config.id],
          currentStep: prevStepIndex,
        },
      };
      saveProgress(newProgress);
    }
  }, [config.id, currentStep, progress, saveProgress]);

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    setIsActive(false);
    
    const newProgress = {
      ...progress,
      [config.id]: {
        completed: true,
        currentStep: config.steps.length - 1,
        skipped: false,
      },
    };
    saveProgress(newProgress);
  }, [config.id, config.steps.length, progress, saveProgress]);

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    if (!config.skippable) return;
    
    setIsActive(false);
    
    const newProgress = {
      ...progress,
      [config.id]: {
        completed: false,
        currentStep: 0,
        skipped: true,
      },
    };
    saveProgress(newProgress);
  }, [config.id, config.skippable, progress, saveProgress]);

  // Reset tutorial
  const resetTutorial = useCallback(() => {
    const newProgress = { ...progress };
    delete newProgress[config.id];
    saveProgress(newProgress);
    setIsActive(false);
    setCurrentStep(0);
  }, [config.id, progress, saveProgress]);

  // Restart tutorial (reset and start)
  const restartTutorial = useCallback(() => {
    const newProgress = { ...progress };
    delete newProgress[config.id];
    saveProgress(newProgress);
    setCurrentStep(0);
    setIsActive(true);
    
    const updatedProgress = {
      ...newProgress,
      [config.id]: {
        completed: false,
        currentStep: 0,
        skipped: false,
      },
    };
    saveProgress(updatedProgress);
  }, [config.id, progress, saveProgress]);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (options?.disabled || !isReady) return;
    
    if (!isCompleted && !isSkipped && !isActive) {
      // Auto-start after ensuring everything is ready
      const timer = setTimeout(() => {
        startTutorial();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isSkipped, isActive, isReady, startTutorial, options?.disabled]);

  return {
    isActive,
    currentStep,
    currentStepData: config.steps[currentStep],
    totalSteps: config.steps.length,
    isCompleted,
    isSkipped,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === config.steps.length - 1,
    startTutorial,
    nextStep,
    prevStep,
    completeTutorial,
    skipTutorial,
    resetTutorial,
    restartTutorial,
  };
};

// Predefined tutorial configurations
export const TUTORIAL_CONFIGS = {
  DASHBOARD_FIRST_TIME: {
    id: 'dashboard-first-time',
    name: 'ダッシュボード入門',
    skippable: true,
    steps: [
      {
        id: 'welcome',
        target: '[data-tutorial="dashboard-header"]',
        title: 'Database Canvasへようこそ！',
        content: 'ここではデータベースの設計を視覚的に行うことができます。まずは基本的な使い方を覚えましょう。',
        position: 'bottom' as const,
      },
      {
        id: 'plan-info',
        target: '[data-tutorial="plan-info"]',
        title: 'プラン情報',
        content: '現在のプラン状況とキャンバス作成数の制限がここに表示されます。',
        position: 'bottom' as const,
      },
      {
        id: 'create-canvas',
        target: '[data-tutorial="create-button"]',
        title: '新しいキャンバスを作成',
        content: 'このボタンをクリックして最初のキャンバスを作成しましょう。キャンバスはデータベース設計の作業スペースです。',
        position: 'left' as const,
        action: 'click' as const,
      },
      {
        id: 'canvas-list',
        target: '[data-tutorial="canvas-list"]',
        title: 'キャンバス一覧',
        content: '作成したキャンバスはここに表示されます。編集、複製、削除などの操作が可能です。',
        position: 'top' as const,
      },
    ],
  } as TutorialConfig,
  
  CANVAS_FIRST_TIME: {
    id: 'canvas-first-time',
    name: 'キャンバス編集入門',
    skippable: true,
    steps: [
      {
        id: 'canvas-welcome',
        target: '[data-tutorial="canvas-title"]',
        title: 'キャンバス編集画面へようこそ！',
        content: 'ここでデータベースの設計を行います。まずはデータベースを追加してみましょう。',
        position: 'bottom' as const,
      },
      {
        id: 'add-database',
        target: '[data-tutorial="add-database-button"]',
        title: 'データベースを追加',
        content: 'このボタンをクリックして最初のデータベーステーブルを作成します。',
        position: 'bottom' as const,
        action: 'click' as const,
      },
      {
        id: 'canvas-area',
        target: '[data-tutorial="canvas-area"]',
        title: 'キャンバスエリア',
        content: 'ここにデータベーステーブルが表示されます。ドラッグで移動、クリックで編集できます。',
        position: 'top' as const,
      },
      {
        id: 'toolbar',
        target: '[data-tutorial="toolbar"]',
        title: 'ツールバー',
        content: 'ズーム、グリッド表示、設定などの操作がここから行えます。',
        position: 'bottom' as const,
      },
      {
        id: 'save-button',
        target: '[data-tutorial="save-button"]',
        title: '保存機能',
        content: '変更は自動保存されますが、このボタンで手動保存も可能です。',
        position: 'bottom' as const,
      },
    ],
  } as TutorialConfig,
};