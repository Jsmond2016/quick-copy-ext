import { useScrollNav } from "@pages/popup/hooks/useScrollNav"

export function ScrollNavFab() {
  const { scrollDir, scrollTo } = useScrollNav()

  if (!scrollDir) return null

  return (
    <button
      className="scroll-nav-fab"
      type="button"
      onClick={scrollTo}
      title={scrollDir === "down" ? "跳到底部" : "跳到顶部"}
      aria-label={scrollDir === "down" ? "跳到底部" : "跳到顶部"}
    >
      {scrollDir === "down" ? "↓" : "↑"}
    </button>
  )
}
