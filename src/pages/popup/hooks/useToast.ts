import { useEffect, useState } from 'react';
import { ToastState } from '@pages/popup/types';

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  return {
    toast,
    setToast,
  };
}
