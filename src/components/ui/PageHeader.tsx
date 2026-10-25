import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"
import { cn } from "@/lib/cn"

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Cabeçalho de seção: ícone em caixinha com borda + título em negrito (padrão original do app). */
export function PageHeader({ icon: Icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 p-2 flex flex-wrap items-center gap-2 justify-between border-b border-zinc-300 dark:border-zinc-800 w-full",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-800/80">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface PanelProps {
  title?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Caixa com borda e barra de título destacada (padrão do formulário "Create a new Job"). */
export function Panel({ title, icon: Icon, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn("border border-zinc-300 dark:border-zinc-800/80 rounded-md flex flex-col min-w-0", className)}>
      {title && (
        <div className="bg-zinc-200 dark:bg-zinc-800/80 rounded-t-sm border-b border-zinc-300 dark:border-zinc-800 p-1 px-2 flex justify-between items-center gap-2">
          <h2 className="font-bold text-zinc-800 dark:text-zinc-300 flex items-center gap-2 min-w-0 truncate">
            {Icon && <Icon size={18} />} {title}
          </h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={cn("p-2", bodyClassName)}>{children}</div>
    </section>
  )
}

/** Corpo rolável de página: preenche o espaço restante sem vazar do layout. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-h-0 overflow-y-auto p-2", className)}>{children}</div>
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col w-full h-full min-h-0 min-w-0", className)}>{children}</div>
}
