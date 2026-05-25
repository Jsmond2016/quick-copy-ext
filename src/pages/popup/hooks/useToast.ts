import { useState } from 'react';
import { useTimeout } from 'ahooks';
import { ToastState } from '@pages/popup/types';

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useTimeout(
    () => {
      setToast(null);
    },
    toast ? 2400 : undefined,
  );

  return {
    toast,
    setToast,
  };
}
