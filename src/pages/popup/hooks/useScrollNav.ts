import { useEffect, useState } from "react"

export function useScrollNav() {
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    const check = () => {
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      if (scrollable <= 0) {
        setScrollDir(null)
        return
      }
      setScrollDir(window.scrollY < scrollable / 2 ? "down" : "up")
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

  const scrollTo = () => {
    if (scrollDir === "down") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return { scrollDir, scrollTo }
}
