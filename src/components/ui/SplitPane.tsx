import { KeyboardEvent, PointerEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/cn"

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  /** chave para lembrar o tamanho escolhido pelo usuário */
  storageKey: string
  /** largura inicial do painel esquerdo em % */
  defaultSize?: number
  /** larguras mínimas em px de cada lado */
  minLeft?: number
  minRight?: number
  className?: string
}

const STORAGE_PREFIX = "@symnager-split:"
const NARROW_QUERY = "(max-width: 767px)"

function readSize(key: string, fallback: number) {
  try {
    const value = Number(localStorage.getItem(STORAGE_PREFIX + key))
    return value > 0 && value < 100 ? value : fallback
  } catch {
    return fallback
  }
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY)
    const listener = () => setNarrow(media.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])
  return narrow
}

/**
 * Duas colunas com divisória arrastável (mouse, toque ou teclado).
 * Duplo clique na divisória restaura o tamanho padrão. Em telas estreitas empilha os painéis.
 */
export function SplitPane({ left, right, storageKey, defaultSize = 50, minLeft = 280, minRight = 320, className }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(() => readSize(storageKey, defaultSize))
  const [dragging, setDragging] = useState(false)
  const narrow = useIsNarrow()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, String(size))
    } catch {
      // sem persistência, apenas segue
    }
  }, [size, storageKey])

  const clamp = useCallback(
    (percent: number) => {
      const width = containerRef.current?.getBoundingClientRect().width ?? 0
      if (!width) return percent
      const min = (minLeft / width) * 100
      const max = 100 - (minRight / width) * 100
      if (min >= max) return 50
      return Math.min(Math.max(percent, min), max)
    },
    [minLeft, minRight],
  )

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setSize(clamp(((e.clientX - rect.left) / rect.width) * 100))
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 2
    if (e.key === "ArrowLeft") setSize((s) => clamp(s - step))
    else if (e.key === "ArrowRight") setSize((s) => clamp(s + step))
    else if (e.key === "Home") setSize(clamp(0))
    else if (e.key === "End") setSize(clamp(100))
    else return
    e.preventDefault()
  }

  // reajusta quando a janela muda de tamanho e o mínimo deixa de caber
  useEffect(() => {
    const listener = () => setSize((s) => clamp(s))
    window.addEventListener("resize", listener)
    return () => window.removeEventListener("resize", listener)
  }, [clamp])

  if (narrow) {
    return (
      <div className={cn("flex flex-col w-full h-full min-h-0 overflow-y-auto", className)}>
        <div className="min-h-[60vh] flex flex-col border-b border-line">{left}</div>
        <div className="flex flex-col">{right}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full h-full min-h-0 min-w-0", dragging && "select-none cursor-col-resize", className)}
    >
      <div className="h-full min-w-0 flex flex-col overflow-hidden" style={{ width: `${size}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar painéis"
        aria-valuenow={Math.round(size)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        title="Arraste para redimensionar (duplo clique para restaurar)"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setSize(clamp(defaultSize))}
        onKeyDown={handleKeyDown}
        className="group relative w-2 -mx-[3px] z-10 shrink-0 cursor-col-resize touch-none flex items-stretch justify-center focus:outline-none"
      >
        <span
          className={cn(
            "w-px h-full bg-line transition-colors duration-150",
            "group-hover:bg-accent/50 group-focus-visible:bg-accent",
            dragging && "bg-accent",
          )}
        />
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-10 w-[5px] rounded-full bg-line-strong opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:bg-accent/70",
            dragging && "opacity-100 bg-accent",
          )}
        />
      </div>
      <div className="h-full min-w-0 flex-1 flex flex-col overflow-hidden">{right}</div>
    </div>
  )
}
