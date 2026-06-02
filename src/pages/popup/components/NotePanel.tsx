import { useMemo } from 'react';
import { useBoolean, useUpdateEffect } from 'ahooks';
import { QuickCopyMode, TesterAioConfig } from '@src/lib/quick-copy';

interface NotePanelProps {
  note: string;
  copying: boolean;
  quickMocking: boolean;
  selectedCount: number;
  quickFillOptions: string[];
  useQuickFill: boolean;
  selectedQuickFillValues: string[];
  mode: QuickCopyMode;
  testerAioConfigs: TesterAioConfig[];
  onNoteChange: (value: string) => void;
  onCopy: () => void;
  onQuickMock: () => void;
  onCopyToAio: () => void;
  onToggleQuickFill: () => void;
  onQuickFillSelectionChange: (values: string[]) => void;
}

export function NotePanel({
  note,
  copying,
  quickMocking,
  selectedCount,
  quickFillOptions,
  useQuickFill,
  selectedQuickFillValues,
  mode,
  testerAioConfigs,
  onNoteChange,
  onCopy,
  onQuickMock,
  onCopyToAio,
  onToggleQuickFill,
  onQuickFillSelectionChange,
}: NotePanelProps) {
  const [showQuickFillOptions, { toggle: toggleQuickFillOptions, setFalse: hideQuickFillOptions }] = useBoolean(false);
  const selectedQuickFillSet = useMemo(
    () => new Set(selectedQuickFillValues),
    [selectedQuickFillValues],
  );

  useUpdateEffect(() => {
    if (!useQuickFill) {
      hideQuickFillOptions();
    }
  }, [useQuickFill]);

  function handleQuickFillOptionToggle(option: string) {
    const nextValues = selectedQuickFillSet.has(option)
      ? selectedQuickFillValues.filter((item) => item !== option)
      : [...selectedQuickFillValues, option];

    onQuickFillSelectionChange(nextValues);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">补充说明</span>
          <h2>备注内容</h2>
        </div>
        <div className="note-panel-head-actions">
          {quickFillOptions.length > 0 ? (
            <label className="switch-row">
              <span>快速填写</span>
              <button
                aria-pressed={useQuickFill}
                className={`switch-button${useQuickFill ? ' active' : ''}`}
                onClick={onToggleQuickFill}
                type="button"
              >
                <span className="switch-thumb" />
              </button>
            </label>
          ) : null}
          <span className="counter">{selectedCount} 项已选</span>
        </div>
      </div>

      {useQuickFill ? (
        <div className="quick-fill-box">
          <button
            className="ghost-button quick-fill-trigger"
            onClick={toggleQuickFillOptions}
            type="button"
          >
            {selectedQuickFillValues.length > 0
              ? `已选 ${selectedQuickFillValues.length} 条常用语`
              : '选择快速填写内容'}
          </button>

          {showQuickFillOptions ? (
            <div className="quick-fill-dropdown">
              {quickFillOptions.map((option) => (
                <label className="quick-fill-option" key={option}>
                  <input
                    checked={selectedQuickFillSet.has(option)}
                    onChange={() => handleQuickFillOptionToggle(option)}
                    type="checkbox"
                  />
                  <span className="quick-fill-option-text">{option}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <textarea
        className="note-input"
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="可补充复现步骤、期望结果、异常表现等说明。"
        rows={2}
        value={note}
      />

      {mode === 'developer' ? (
        <div className="action-row">
          <button
            className="ghost-button action-button"
            disabled={quickMocking || selectedCount === 0}
            onClick={onQuickMock}
            type="button"
          >
            {quickMocking ? '发送中...' : '快速 mock'}
          </button>
          <button
            className="primary-button action-button inline-button"
            disabled={copying || selectedCount === 0}
            onClick={onCopy}
            type="button"
          >
            {copying ? '复制中...' : '复制接口信息'}
          </button>
        </div>
      ) : mode === 'tester' && testerAioConfigs.length > 0 ? (
        <div className="action-row">
          <button
            className="ghost-button action-button"
            disabled={copying || selectedCount === 0}
            onClick={onCopyToAio}
            type="button"
          >
            {copying ? '复制中...' : '复制并跳转至 AIO'}
          </button>
          <button
            className="primary-button action-button inline-button"
            disabled={copying || selectedCount === 0}
            onClick={onCopy}
            type="button"
          >
            {copying ? '复制中...' : '复制接口信息'}
          </button>
        </div>
      ) : (
        <button
          className="primary-button"
          disabled={copying || selectedCount === 0}
          onClick={onCopy}
          type="button"
        >
          {copying ? '复制中...' : '复制页面接口信息'}
        </button>
      )}
    </section>
  );
}
