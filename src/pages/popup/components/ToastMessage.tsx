import { ToastState } from '@pages/popup/types';

interface ToastMessageProps {
  toast: ToastState | null;
}

export function ToastMessage({ toast }: ToastMessageProps) {
  if (!toast) {
    return null;
  }

  return <div className={`toast toast-${toast.type}`}>{toast.text}</div>;
}
