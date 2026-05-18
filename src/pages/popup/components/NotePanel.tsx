import { useEffect, useMemo, useState } from 'react';

interface NotePanelProps {
  note: string;
  copying: boolean;
  selectedCount: number;
  includeRequestParams: boolean;
  includeResponseBody: boolean;
  quickFillOptions: string[];
  useQuickFill: boolean;
  selectedQuickFillValues: string[];
  onNoteChange: (value: string) => void;
  onCopy: () => void;
  onToggleRequestParams: () => void;
  onToggleResponseBody: () => void;
  onToggleQuickFill: () => void;
  onQuickFillSelectionChange: (values: string[]) => void;
}

export function NotePanel({
  note,
  copying,
  selectedCount,
  includeRequestParams,
  includeResponseBody,
  quickFillOptions,
  useQuickFill,
  selectedQuickFillValues,
  onNoteChange,
  onCopy,
  onToggleRequestParams,
  onToggleResponseBody,
  onToggleQuickFill,
  onQuickFillSelectionChange,
}: NotePanelProps) {
  const [showQuickFillOptions, setShowQuickFillOptions] = useState(false);
  const selectedQuickFillSet = useMemo(
    () => new Set(selectedQuickFillValues),
    [selectedQuickFillValues],
  );

  useEffect(() => {
    if (!useQuickFill) {
      setShowQuickFillOptions(false);
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
            onClick={() => setShowQuickFillOptions((current) => !current)}
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

      <div className="checkbox-row-group">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeRequestParams}
            onChange={onToggleRequestParams}
          />
          包含接口入参
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeResponseBody}
            onChange={onToggleResponseBody}
          />
          包含接口出参
        </label>
      </div>

      <button
        className="primary-button"
        disabled={copying || selectedCount === 0}
        onClick={onCopy}
        type="button"
      >
        {copying ? '复制中...' : '复制页面接口信息'}
      </button>
    </section>
  );
}
