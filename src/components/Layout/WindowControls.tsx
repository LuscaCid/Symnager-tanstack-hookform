import { Copy, Minus, Square, X } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { useCallback, useEffect, useState } from "react"
import type { WindowState } from "@/@types/bridge"
import { bridge } from "@/lib/runtime"
import { useHotkey } from "@/lib/hooks"
import { cn } from "@/lib/cn"

/** Janela sem moldura no Windows/Linux: o app desenha os próprios controles. No macOS ficam os nativos. */
export const hasCustomTitleBar = !!bridge && bridge.platform !== "darwin"
/** Espaço para os botões nativos do macOS sobre o cabeçalho. */
export const needsMacInset = !!bridge && bridge.platform === "darwin"

export function useWindowState() {
  const [state, setState] = useState<WindowState>({ maximized: false, fullscreen: false, focused: true })
  useEffect(() => {
    if (!bridge) return
    bridge.windowControls.getState().then(setState)
    return bridge.windowControls.onState(setState)
  }, [])
  return state
}

const base =
  "app-no-drag h-full w-11 inline-flex items-center justify-center text-muted transition-colors duration-100 focus-visible:outline-none focus-visible:bg-hover"

/** Minimizar, maximizar/restaurar (toggle) e fechar. F11 alterna a tela cheia. */
export function WindowControls({ className }: { className?: string }) {
  const { maximized, fullscreen } = useWindowState()
  useHotkey("f11", useCallback(() => bridge?.windowControls.toggleFullScreen(), []))

  if (!hasCustomTitleBar) return null
  const controls = bridge!.windowControls
  const restore = maximized || fullscreen

  return (
    <div className={cn("flex items-stretch h-full self-stretch", className)}>
      <Tooltip content="Minimizar">
        <button type="button" aria-label="Minimizar" onClick={() => controls.minimize()} className={cn(base, "hover:bg-hover hover:text-fg")}>
          <Minus size={15} />
        </button>
      </Tooltip>
      <Tooltip content={restore ? "Restaurar" : "Maximizar"} shortcut="F11 tela cheia">
        <button
          type="button"
          aria-label={restore ? "Restaurar" : "Maximizar"}
          onClick={() => controls.toggleMaximize()}
          className={cn(base, "hover:bg-hover hover:text-fg")}
        >
          {restore ? <Copy size={13} className="-scale-x-100" /> : <Square size={12} />}
        </button>
      </Tooltip>
      <Tooltip content="Fechar" align="end">
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => controls.close()}
          className={cn(base, "hover:bg-[#c42b1c] hover:text-white")}
        >
          <X size={16} />
        </button>
      </Tooltip>
    </div>
  )
}

/** Barra fina arrastável para telas sem o cabeçalho principal (login, setup, impressão). */
export function SlimTitleBar({ title = "Symnager" }: { title?: string }) {
  if (!bridge) return null
  return (
    <div className="app-drag no-print shrink-0 h-9 flex items-center justify-between select-none">
      <span className={cn("text-xs font-medium text-faint px-3", needsMacInset && "pl-20")}>{title}</span>
      <WindowControls />
    </div>
  )
}
