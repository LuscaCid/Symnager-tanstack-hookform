import { Columns2, Moon, Palette, Sun } from "lucide-react"
import { toast } from "sonner"
import { useContextSelector } from "use-context-selector"
import { Button, Checkbox, Panel } from "@/components/ui"
import { ThemeContext } from "@/contexts/Theme-context"
import { SidebarContext } from "@/contexts/Sidebar-context"
import { cn } from "@/lib/cn"

const SPLIT_PREFIX = "@symnager-split:"

function resetPanelSizes() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(SPLIT_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
    toast.success("Tamanhos dos painéis restaurados. Eles voltam ao padrão ao abrir cada tela.")
  } catch {
    toast.error("Não foi possível acessar o armazenamento local.")
  }
}

export function AppearanceSettings() {
  const theme = useContextSelector(ThemeContext, (c) => c.theme)
  const toggleTheme = useContextSelector(ThemeContext, (c) => c.toggleTheme)
  const sidebarOpen = useContextSelector(SidebarContext, (c) => c.isOpen)
  const toggleSidebar = useContextSelector(SidebarContext, (c) => c.handleOpenOrClose)

  const option = (value: "light" | "dark", label: string, Icon: typeof Sun) => (
    <button
      type="button"
      onClick={() => toggleTheme(value)}
      aria-pressed={theme === value}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 p-3 rounded-md border transition duration-200",
        theme === value
          ? "border-accent bg-accent-soft text-accent font-medium"
          : "border-line  hover:bg-hover ",
      )}
    >
      <Icon size={20} /> {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Tema" icon={Palette}>
        <div className="flex gap-2">
          {option("light", "Claro", Sun)}
          {option("dark", "Escuro", Moon)}
        </div>
      </Panel>
      <Panel title="Layout" icon={Columns2}>
        <div className="flex flex-col gap-3">
          <Checkbox label="Menu lateral expandido" checked={sidebarOpen} onChange={() => toggleSidebar()} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted ">
              As telas divididas lembram a largura que você arrastou. Também é possível dar duplo clique na divisória.
            </p>
            <Button size="sm" onClick={resetPanelSizes}>
              Restaurar tamanhos dos painéis
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
