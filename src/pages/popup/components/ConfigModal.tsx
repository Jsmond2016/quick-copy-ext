import { useRef } from 'react';
import { useMount, useUpdateEffect } from 'ahooks';

interface ConfigModalProps {
  mode: 'import' | 'export';
  content: string;
  onContentChange: (value: string) => void;
  onConfirm: () => void;
  onCopyExport: () => void;
  onClose: () => void;
}

export function ConfigModal({
  mode,
  content,
  onContentChange,
  onConfirm,
  onCopyExport,
  onClose,
}: ConfigModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function focusImportTextarea() {
    if (mode === 'import' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  useMount(() => {
    focusImportTextarea();
  });

  useUpdateEffect(() => {
    focusImportTextarea();
  }, [mode]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'import' ? '导入配置' : '导出配置'}
      >
        <h3>{mode === 'import' ? '导入配置' : '导出配置'}</h3>
        <textarea
          ref={textareaRef}
          className="modal-textarea"
          readOnly={mode === 'export'}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
        />
        <div className="modal-actions">
          {mode === 'import' && (
            <button className="primary-button compact" onClick={onConfirm} type="button">
              确认导入
            </button>
          )}
          {mode === 'export' && (
            <button className="primary-button compact" onClick={onCopyExport} type="button">
              复制
            </button>
          )}
          <button className="ghost-button" onClick={onClose} type="button">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
