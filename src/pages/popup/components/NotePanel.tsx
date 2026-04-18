interface NotePanelProps {
  note: string;
  copying: boolean;
  selectedCount: number;
  onNoteChange: (value: string) => void;
  onCopy: () => void;
}

export function NotePanel({
  note,
  copying,
  selectedCount,
  onNoteChange,
  onCopy,
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
        rows={4}
        value={note}
      />

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
