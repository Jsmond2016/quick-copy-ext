interface NotePanelProps {
  note: string;
  copying: boolean;
  selectedCount: number;
  includeRequestParams: boolean;
  onNoteChange: (value: string) => void;
  onCopy: () => void;
  onToggleRequestParams: () => void;
}

export function NotePanel({
  note,
  copying,
  selectedCount,
  includeRequestParams,
  onNoteChange,
  onCopy,
  onToggleRequestParams,
}: NotePanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">补充说明</span>
          <h2>备注内容</h2>
        </div>
        <span className="counter">{selectedCount} 项已选</span>
      </div>

      <textarea
        className="note-input"
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="可补充复现步骤、期望结果、异常表现等说明。"
        rows={2}
        value={note}
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={includeRequestParams}
          onChange={onToggleRequestParams}
        />
        包含接口入参
      </label>

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
