import React from 'react';
import { createRoot } from 'react-dom/client';
import '@pages/options/options.css';
import { RecordingOptions } from '@pages/options/RecordingOptions';

const rootContainer = document.querySelector('#__root');
if (!rootContainer) {
  throw new Error('找不到录屏预览挂载节点。');
}

createRoot(rootContainer).render(<RecordingOptions />);
