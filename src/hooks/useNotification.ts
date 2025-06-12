import { useState, useCallback } from 'react';
import { NotificationType } from '@/components/UI/NotificationModal';

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotification = useCallback((options: Omit<NotificationState, 'isOpen'>) => {
    setNotification({
      ...options,
      isOpen: true
    });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  // alert() の代替
  const showAlert = useCallback((message: string, title: string = '通知', type: NotificationType = 'info') => {
    showNotification({
      type,
      title,
      message,
      confirmText: 'OK'
    });
  }, [showNotification]);

  // confirm() の代替 - Promiseベース
  const showConfirm = useCallback((
    title: string,
    message: string,
    confirmText: string = 'OK',
    cancelText: string = 'キャンセル'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      showNotification({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          resolve(true);
          closeNotification();
        },
        onCancel: () => {
          resolve(false);
          closeNotification();
        }
      });
    });
  }, [showNotification, closeNotification]);
  
  // 旧いコールバックベースのショーコンファーム（互換性のため）
  const showConfirmCallback = useCallback((
    message: string, 
    onConfirm: () => void,
    title: string = '確認',
    confirmText: string = 'OK',
    cancelText: string = 'キャンセル'
  ) => {
    showNotification({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
      onConfirm
    });
  }, [showNotification]);

  // 成功通知
  const showSuccess = useCallback((message: string, title: string = '成功') => {
    showAlert(message, title, 'success');
  }, [showAlert]);

  // エラー通知
  const showError = useCallback((message: string, title: string = 'エラー') => {
    showAlert(message, title, 'error');
  }, [showAlert]);

  // 警告通知
  const showWarning = useCallback((message: string, title: string = '警告') => {
    showAlert(message, title, 'warning');
  }, [showAlert]);

  // 情報通知
  const showInfo = useCallback((message: string, title: string = '情報') => {
    showAlert(message, title, 'info');
  }, [showAlert]);

  return {
    notification,
    showNotification,
    closeNotification,
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};