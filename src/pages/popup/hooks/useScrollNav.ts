import { useEffect, useState } from "react"

const SCROLL_EDGE_THRESHOLD = 64
type ScrollDirection = "up" | "down"

export function useScrollNav() {
  const [scrollDirections, setScrollDirections] = useState<ScrollDirection[]>([])

  useEffect(() => {
    const check = () => {
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      if (scrollable <= 0) {
        setScrollDirections([])
        return
      }

      const scrollTop = Math.max(0, window.scrollY)
      const isNearTop = scrollTop <= SCROLL_EDGE_THRESHOLD
      const isNearBottom = scrollable - scrollTop <= SCROLL_EDGE_THRESHOLD

      if (isNearTop) {
        setScrollDirections(["down"])
      } else if (isNearBottom) {
        setScrollDirections(["up"])
      } else {
        setScrollDirections(["up", "down"])
      }
    }
    check()
    window.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(document.documentElement)
    return () => {
      window.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [])

  const scrollTo = (direction: ScrollDirection) => {
    if (direction === "down") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return { scrollDirections, scrollTo }
}
