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

/** Cabeçalho de página/seção: ícone em fundo suave do destaque + título. */
export function PageHeader({ icon: Icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("shrink-0 px-4 pt-4 pb-3 flex flex-wrap items-center gap-3 justify-between w-full", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-muted truncate">{subtitle}</p>}
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

/** Cartão com título opcional. */
export function Panel({ title, icon: Icon, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn("bg-surface border border-line rounded-xl shadow-sm flex flex-col min-w-0", className)}>
      {title && (
        <div className="px-4 pt-3 pb-2 flex justify-between items-center gap-2">
          <h2 className="text-sm font-semibold text-fg flex items-center gap-2 min-w-0 truncate">
            {Icon && <Icon size={15} className="text-faint" />} {title}
          </h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={cn("px-4 pb-4", !title && "pt-4", bodyClassName)}>{children}</div>
    </section>
  )
}

/** Corpo rolável de página: preenche o espaço restante sem vazar do layout. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-h-0 overflow-y-auto px-4 pb-4", className)}>{children}</div>
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col w-full h-full min-h-0 min-w-0", className)}>{children}</div>
}
