import {
  getDisplayPath,
  NetworkRequestRecord,
  QuickCopySettings,
} from "@src/lib/quick-copy"
import { ScrollNavFab } from "@pages/popup/components/ScrollNavFab"

interface RequestHistoryPanelProps {
  requests: NetworkRequestRecord[]
  filteredRequests: NetworkRequestRecord[]
  selectedIds: string[]
  settings: QuickCopySettings
  onSelectAll: () => void
  onClearSelection: () => void
  onClearRequests: () => void
  onCopyRequest: (request: NetworkRequestRecord) => void
  onToggleRequest: (id: string, index: number, shiftKey: boolean) => void
}

function splitRequestPath(rawUrl: string) {
  const fallbackDisplay = getDisplayPath(rawUrl)

  try {
    const url = new URL(rawUrl)
    const pathname = url.pathname || "/"
    const segments = pathname.split("/").filter(Boolean)
    const leaf = segments.at(-1) || pathname
    const parentSegments = segments.slice(0, -1)
    const parentPath =
      parentSegments.length > 0 ? `/${parentSegments.join("/")}` : "/"
    const suffix = `${url.search}${url.hash}`

    return {
      leaf: `${leaf}${suffix}`,
      parentPath,
      title: `${pathname}${suffix}`,
    }
  } catch {
    const [path = rawUrl, suffix = ""] = rawUrl.split(/(?=[?#])/)
    const segments = path.split("/").filter(Boolean)

    if (segments.length === 0) {
      return {
        leaf: fallbackDisplay,
        parentPath: "",
        title: rawUrl,
      }
    }

    const leaf = segments.at(-1) || path
    const parentSegments = segments.slice(0, -1)

    return {
      leaf: `${leaf}${suffix}`,
      parentPath:
        parentSegments.length > 0 ? `/${parentSegments.join("/")}` : "/",
      title: `${path}${suffix}`,
    }
  }
}

function getAbnormalBadgeText(request: NetworkRequestRecord): string {
  const abnormalReasons = request.abnormalReasons ?? []
  const matchedRuleReason = abnormalReasons.find((reason) =>
    reason.startsWith("命中响应规则："),
  )

  if (matchedRuleReason) {
    const matchedLabel = matchedRuleReason.match(/^命中响应规则：(.+?)（/)
    if (matchedLabel?.[1]) {
      return matchedLabel[1]
    }
  }

  if (request.error) {
    return "请求失败"
  }

  if (typeof request.statusCode === "number" && request.statusCode !== 200) {
    return `HTTP ${request.statusCode}`
  }

  return "异常"
}

export function RequestHistoryPanel({
  requests,
  filteredRequests,
  selectedIds,
  settings,
  onSelectAll,
  onClearSelection,
  onClearRequests,
  onCopyRequest,
  onToggleRequest,
}: RequestHistoryPanelProps) {
  const abnormalCount = filteredRequests.filter(
    (request) => (request.abnormalReasons?.length ?? 0) > 0,
  ).length
  const apiPrefixSummary =
    settings.apiPrefixes.length > 0 ? settings.apiPrefixes.join("，") : "不过滤"

  return (
    <>
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">捕获接口历史</span>
        </div>
        <div className="inline-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={onSelectAll}
            disabled={requests.length === 0}
          >
            全选
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={onClearSelection}
            disabled={selectedIds.length === 0}
          >
            清空选择
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={onClearRequests}
            disabled={requests.length === 0}
          >
            清空记录
          </button>
        </div>
      </div>

      <div className="filter-summary">
        <div className="filter-summary-item" title={apiPrefixSummary}>
          <span className="filter-summary-label">接口筛选前缀</span>
          <strong className="filter-summary-value">{apiPrefixSummary}</strong>
        </div>
        <div className="filter-summary-item">
          <span className="filter-summary-label">命中 / 异常 / 总数</span>
          <strong className="filter-summary-value">
            {filteredRequests.length} / <span className="filter-summary-value-danger">{abnormalCount}</span> / {requests.length}
          </strong>
        </div>
        <div className="filter-summary-item">
          <span className="filter-summary-label">已选接口</span>
          <strong className="filter-summary-value">
            {selectedIds.length} 条
          </strong>
        </div>
      </div>

      <div className="request-list">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <strong>当前筛选下没有接口记录</strong>
            <span>先在页面触发请求，或调整接口前缀后再点击“刷新”。</span>
          </div>
        ) : (
          filteredRequests.map((request, index) => {
            const checked = selectedIds.includes(request.id)
            const { leaf, parentPath, title } = splitRequestPath(request.url)
            const isAbnormal = (request.abnormalReasons?.length ?? 0) > 0
            const abnormalBadgeText = isAbnormal
              ? getAbnormalBadgeText(request)
              : ""

            return (
              <article
                className={`request-card ${checked ? "active" : ""} ${isAbnormal ? "abnormal" : ""}`}
                key={request.id}
                onClick={(event) =>
                  onToggleRequest(request.id, index, event.shiftKey)
                }
              >
                <input
                  checked={checked}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleRequest(request.id, index, event.shiftKey)
                  }}
                  type="checkbox"
                />
                <div className="request-main">
                  <div className="request-line">
                    <span className="method-pill">
                      {request.method.toUpperCase()}
                    </span>
                    {isAbnormal ? (
                      <span className="request-badge request-badge-danger">
                        {abnormalBadgeText}
                      </span>
                    ) : null}
                    <div className="request-url-group">
                      {request.apifoxUrl ? (
                        <a
                          className="request-path request-link"
                          href={request.apifoxUrl}
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                          onMouseDown={(event) => {
                            event.stopPropagation()
                          }}
                          rel="noreferrer"
                          target="_blank"
                          title={`${title}\n点击跳转到 Apifox`}
                        >
                          <span className="request-path-leaf">{leaf}</span>
                          <span className="request-path-parent">
                            {parentPath}
                          </span>
                        </a>
                      ) : (
                        <span
                          className="request-path"
                          title={title}
                        >
                          <span className="request-path-leaf">{leaf}</span>
                          <span className="request-path-parent">
                            {parentPath}
                          </span>
                        </span>
                      )}
                      {request.apiName ? (
                        <div className="request-api-name">
                          {request.apiName}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  aria-label="复制接口信息"
                  className="request-copy-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCopyRequest(request)
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                  }}
                  title="复制接口信息"
                  type="button"
                >
                  <span aria-hidden="true" className="copy-icon" />
                </button>
              </article>
            )
          })
        )}
      </div>
    </section>
    <ScrollNavFab />
  </>
)
}
