import { SidebarContext } from "../../contexts/Sidebar-context"
import { PanelLeft, Plus, Rocket, Search } from "lucide-react"
import { useContextSelector } from "use-context-selector"
import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CommandPalette } from "./CommandPalette"
import { ConnectionIndicator } from "./ConnectionIndicator"
import { needsMacInset, WindowControls } from "./WindowControls"
import { useHotkey } from "@/lib/hooks"
import { bridge } from "@/lib/runtime"
import { cn } from "@/lib/cn"

/**
 * Cabeçalho do app. No desktop ele também é a barra de título: a área vazia arrasta a janela,
 * duplo clique maximiza/restaura e os controles de janela ficam à direita.
 */
export function Header() {

  const handleOpenOrClose = useContextSelector(
    SidebarContext,
    (context) => {
    return  context.handleOpenOrClose
  })
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useHotkey("ctrl+k", useCallback(() => setPaletteOpen(true), []))
  useHotkey("ctrl+shift+o", useCallback(() => navigate("/recepcao"), [navigate]))

  return (
    <header
      className={cn(
        "shrink-0 h-12 flex items-center gap-3 w-full bg-surface border-b border-line print:hidden select-none",
        bridge && "app-drag",
        needsMacInset ? "pl-20" : "pl-2",
      )}
      onDoubleClick={(e) => {
        // duplo clique na área livre (não em botões) alterna maximizar no desktop
        if (bridge && e.target === e.currentTarget) bridge.windowControls.toggleMaximize()
      }}
    >
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Abrir ou fechar menu"
          title="Menu"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg transition-colors"
          onClick={handleOpenOrClose}>
          <PanelLeft size={18}/>
        </button>
        <span className="flex items-center gap-2 pl-1 pr-2 pointer-events-none">
          <span className="w-6 h-6 rounded-md bg-accent text-accent-fg flex items-center justify-center">
            <Rocket size={13} strokeWidth={2.2} />
          </span>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight">Symnager</span>
        </span>
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <button
          onClick={() => setPaletteOpen(true)}
          className="w-full max-w-md h-8 flex items-center gap-2 px-3 rounded-lg bg-subtle text-[13px] text-faint hover:bg-hover hover:text-muted transition-colors"
        >
          <Search size={14} />
          <span className="flex-1 text-left truncate">Buscar OS, cliente ou tela...</span>
          <kbd className="hidden sm:inline text-[11px] font-sans text-faint bg-surface border border-line rounded px-1.5 py-px">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5 h-full">
        <ConnectionIndicator />
        <button
          onClick={() => navigate("/recepcao")}
          title="Nova OS (Ctrl+Shift+O)"
          className="h-8 flex items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium bg-accent text-accent-fg hover:bg-accent-strong shadow-sm transition-colors"
        >
          <Plus size={15} /> <span className="hidden sm:inline">Nova OS</span>
        </button>
        {bridge && <span className="w-px h-5 bg-line mx-1.5" />}
        <WindowControls />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}
