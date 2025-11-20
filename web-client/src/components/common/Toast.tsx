import { useEffect } from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number | null;
  onClose: () => void;
}

export function Toast({
  message,
  variant = 'success',
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration === null) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  const toastClasses = [styles.toast, styles[variant]].filter(Boolean).join(' ');

  return (
    <div
      className={toastClasses}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
