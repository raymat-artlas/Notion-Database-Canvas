'use client';

import { useState } from 'react';
import { X, Crown, Zap, Check } from 'lucide-react';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onUpgrade: () => void;
}

export default function PlanLimitModal({
  isOpen,
  onClose,
  title,
  message,
  onUpgrade
}: PlanLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gray-50 px-8 py-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Crown size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
              <p className="text-gray-600 text-sm">アップグレードが必要です</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed mb-4">
              {message}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                💡 この制限はローカルストレージをクリアしてもリセットされません
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-orange-600" />
              プレミアムプランの特典
            </h3>
            <div className="space-y-2">
              {[
                'キャンバス作成数：無制限',
                'ダウンロード機能：無制限',
                'エクスポート回数：無制限',
                'クラウドバックアップ：対応'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-green-600" />
                  </div>
                  <span className="text-gray-600 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              アップグレード
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}