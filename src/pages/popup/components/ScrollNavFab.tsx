import { useScrollNav } from "@pages/popup/hooks/useScrollNav"

export function ScrollNavFab() {
  const { scrollDirections, scrollTo } = useScrollNav()

  if (scrollDirections.length === 0) return null

  return (
    <nav className="scroll-nav-fabs" aria-label="页面滚动导航">
      {scrollDirections.map((direction) => {
        const isDown = direction === "down"
        const label = isDown ? "跳到底部" : "跳到顶部"

        return (
          <button
            key={direction}
            className="scroll-nav-fab"
            type="button"
            onClick={() => scrollTo(direction)}
            title={label}
            aria-label={label}
          >
            {isDown ? "↓" : "↑"}
          </button>
        )
      })}
    </nav>
  )
}
