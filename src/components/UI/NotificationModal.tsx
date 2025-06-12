'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  type: NotificationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  confirm: AlertCircle
};

const colorMap = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    button: 'bg-orange-600 hover:bg-orange-700'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700'
  },
  confirm: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    button: 'bg-gray-900 hover:bg-gray-800'
  }
};

export default function NotificationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  type,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'キャンセル'
}: NotificationModalProps) {
  if (!isOpen) return null;

  const Icon = iconMap[type];
  const colors = colorMap[type];
  const isConfirm = type === 'confirm';

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (!isConfirm) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (!isConfirm) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isConfirm ? handleCancel : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`relative ${colors.bg} ${colors.border} border-b px-6 py-4`}>
          <button
            onClick={isConfirm ? handleCancel : onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3 pr-6">
            <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center`}>
              <Icon size={20} className={colors.icon} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto shadow-sm">
            <div className="text-gray-800 leading-relaxed whitespace-pre-line text-sm">
              {message}
            </div>
          </div>

          {/* Actions */}
          <div className={`flex gap-3 ${isConfirm ? 'flex-row-reverse' : ''}`}>
            {isConfirm && (
              <button
                onClick={handleCancel}
                className="flex-1 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:from-gray-100 hover:to-gray-150 transition-all duration-200 shadow-sm"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`${isConfirm ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}