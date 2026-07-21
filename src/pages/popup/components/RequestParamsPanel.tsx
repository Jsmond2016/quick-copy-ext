import { QuickCopyMode, TesterAioConfig } from '@src/lib/quick-copy';

interface RequestParamsPanelProps {
  includeRequestParams: boolean;
  mode: QuickCopyMode;
  testerAioConfigs: TesterAioConfig[];
  selectedTesterAioConfigId: string;
  onToggleRequestParams: () => void;
  onSelectedTesterAioConfigChange: (value: string) => void;
}

export function RequestParamsPanel({
  includeRequestParams,
  mode,
  testerAioConfigs,
  selectedTesterAioConfigId,
  onToggleRequestParams,
  onSelectedTesterAioConfigChange,
}: RequestParamsPanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">复制选项</span>
        </div>
      </div>

      <label className="checkbox-row request-params-row">
        <input
          type="checkbox"
          checked={includeRequestParams}
          onChange={onToggleRequestParams}
        />
        包含接口入参
      </label>

      {testerAioConfigs.length > 0 ? (
        <label className="field-block request-params-select">
          <span>迭代名称</span>
          <select
            className="note-select"
            onChange={(event) => onSelectedTesterAioConfigChange(event.target.value)}
            value={selectedTesterAioConfigId}
          >
            {testerAioConfigs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.iterationName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}
