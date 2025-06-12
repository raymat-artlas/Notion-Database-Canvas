'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { TutorialStep } from '@/hooks/useTutorial';

interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: TutorialStep | undefined;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  skippable: boolean;
}

interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  skippable,
}: TutorialOverlayProps) {
  const [targetPosition, setTargetPosition] = useState<ElementPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep) return;

    let retryCount = 0;
    const maxRetries = 30; // 3秒間リトライ

    const findAndHighlightTarget = () => {
      const targetElement = document.querySelector(currentStep.target);
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        const position = {
          top: rect.top + scrollTop,
          left: rect.left + scrollLeft,
          width: rect.width,
          height: rect.height,
        };
        
        setTargetPosition(position);
        
        // Scroll target into view if needed
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
        
        // Add highlight class to target element
        targetElement.classList.add('tutorial-highlight');
        
        return () => {
          targetElement.classList.remove('tutorial-highlight');
        };
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay if element not found
          const timeout = setTimeout(findAndHighlightTarget, 100);
          return () => clearTimeout(timeout);
        } else {
          console.warn(`Tutorial target not found after ${maxRetries} retries:`, currentStep.target);
          return () => {};
        }
      }
    };

    const cleanup = findAndHighlightTarget();
    
    return cleanup;
  }, [isActive, currentStep]);

  // Calculate tooltip position
  useEffect(() => {
    if (!targetPosition || !tooltipRef.current || !currentStep) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;
    
    let top = 0;
    let left = 0;
    
    switch (currentStep.position) {
      case 'top':
        top = targetPosition.top - tooltipRect.height - padding;
        left = targetPosition.left + (targetPosition.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = targetPosition.top + targetPosition.height + padding;
        left = targetPosition.left + (targetPosition.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = targetPosition.top + (targetPosition.height / 2) - (tooltipRect.height / 2);
        left = targetPosition.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = targetPosition.top + (targetPosition.height / 2) - (tooltipRect.height / 2);
        left = targetPosition.left + targetPosition.width + padding;
        break;
    }
    
    // Ensure tooltip stays within viewport
    const maxLeft = window.innerWidth - tooltipRect.width - 20;
    const maxTop = window.innerHeight - tooltipRect.height - 20;
    
    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));
    
    setTooltipPosition({ top, left });
  }, [targetPosition, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          if (isLastStep) {
            onComplete();
          } else {
            onNext();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!isFirstStep) {
            onPrev();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (skippable) {
            onSkip();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isFirstStep, isLastStep, onNext, onPrev, onSkip, onComplete, skippable]);

  if (!isActive || !currentStep || !targetPosition) {
    return null;
  }

  return (
    <>
      {/* Subtle backdrop - reduced opacity and z-index */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none">
        {/* Subtle highlight around target */}
        <div
          className="absolute border-2 border-blue-300 rounded-md shadow-sm pointer-events-none"
          style={{
            top: targetPosition.top - 2,
            left: targetPosition.left - 2,
            width: targetPosition.width + 4,
            height: targetPosition.height + 4,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1), 0 0 0 9999px rgba(0, 0, 0, 0.2)',
          }}
        />
      </div>

      {/* Compact tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-2">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {currentStep.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{currentStepIndex + 1} / {totalSteps}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-gray-400 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {skippable && (
            <button
              onClick={onSkip}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              title="チュートリアルをスキップ"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {currentStep.content}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-xs"
              >
                <ChevronLeft size={12} />
                戻る
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {skippable && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs"
              >
                スキップ
              </button>
            )}
            
            <button
              onClick={isLastStep ? onComplete : onNext}
              className="flex items-center gap-1 px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-xs"
            >
              {isLastStep ? '完了' : '次へ'}
              {!isLastStep && <ChevronRight size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for highlighting */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 41 !important;
        }
      `}</style>
    </>
  );
}