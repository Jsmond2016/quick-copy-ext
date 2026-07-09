import { EnvironmentConfig, QuickCopyMode, TesterAioConfig } from '@src/lib/quick-copy';

interface RequestParamsPanelProps {
  includeRequestParams: boolean;
  mode: QuickCopyMode;
  testerAioConfigs: TesterAioConfig[];
  selectedTesterAioConfigId: string;
  environments: EnvironmentConfig[];
  includeEnvironment: boolean;
  selectedEnvironment?: { name: string; url: string } | null;
  onToggleRequestParams: () => void;
  onSelectedTesterAioConfigChange: (value: string) => void;
  onToggleEnvironment: () => void;
}

export function RequestParamsPanel({
  includeRequestParams,
  mode,
  testerAioConfigs,
  selectedTesterAioConfigId,
  environments,
  includeEnvironment,
  selectedEnvironment,
  onToggleRequestParams,
  onSelectedTesterAioConfigChange,
  onToggleEnvironment,
}: RequestParamsPanelProps) {
  const envLabel = selectedEnvironment?.name ?? environments[0]?.name ?? '';

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

      {mode === 'developer' && environments.length > 0 ? (
        <label className="checkbox-row request-params-row">
          <input
            type="checkbox"
            checked={includeEnvironment}
            onChange={onToggleEnvironment}
          />
          环境 {envLabel}
        </label>
      ) : null}

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
