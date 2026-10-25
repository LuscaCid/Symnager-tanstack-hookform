import { SidebarContext } from "../../contexts/Sidebar-context"
import { MenuIcon, Plus, Rocket, Search } from "lucide-react"
import { useContextSelector } from "use-context-selector"
import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CommandPalette } from "./CommandPalette"
import { ConnectionIndicator } from "./ConnectionIndicator"
import { useHotkey } from "@/lib/hooks"

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
    <header className="shrink-0 flex justify-between items-center gap-2 p-1 w-full bg-transparent shadow-md border-b border-zinc-300 dark:border-zinc-800 print:hidden">
      <div className="flex items-center gap-2">
        <button
          aria-label="Abrir ou fechar menu"
          className="bg-transparent border-b border-zinc-300 dark:border-zinc-800 p-1 rounded-md dark:hover:bg-zinc-800/80 hover:bg-zinc-200 duration-200"
          onClick={handleOpenOrClose}>
          <MenuIcon size={24}/>
        </button>
        <span className="flex items-center gap-1 font-bold">
          <Rocket size={20}/> <span className="hidden sm:inline">Symnager</span>
        </span>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex-1 max-w-md flex items-center gap-2 px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200"
      >
        <Search size={16} />
        <span className="flex-1 text-left truncate">Buscar OS, cliente ou tela...</span>
        <kbd className="hidden sm:inline text-xs border border-zinc-300 dark:border-zinc-700 rounded px-1">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <ConnectionIndicator />
        <button
          onClick={() => navigate("/recepcao")}
          title="Nova OS (Ctrl+Shift+O)"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold bg-zinc-950 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-950 dark:hover:bg-zinc-300 transition duration-200"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Nova OS</span>
        </button>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}
