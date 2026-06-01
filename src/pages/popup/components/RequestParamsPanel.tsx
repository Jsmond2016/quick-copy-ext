import { TesterAioConfig } from '@src/lib/quick-copy';

interface RequestParamsPanelProps {
  includeRequestParams: boolean;
  testerAioConfigs: TesterAioConfig[];
  selectedTesterAioConfigId: string;
  onToggleRequestParams: () => void;
  onSelectedTesterAioConfigChange: (value: string) => void;
}

export function RequestParamsPanel({
  includeRequestParams,
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
      <p className="request-params-hint">开启后，复制内容会附带已捕获到的接口入参信息。</p>

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
