import { Loader, LucideIcon, Inbox } from "lucide-react"
import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export function Spinner({ label = "Carregando...", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("flex items-center justify-center gap-2 p-6 text-sm text-muted", className)}>
      <Loader size={16} className="animate-spin text-accent" /> {label}
    </span>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="w-11 h-11 rounded-full bg-subtle text-faint flex items-center justify-center mb-1">
        <Icon size={20} />
      </div>
      <strong className="text-sm font-semibold text-fg">{title}</strong>
      {description && <p className="text-[13px] text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-4 flex flex-col items-center gap-3 rounded-xl bg-danger/5 border border-danger/20 p-5 text-sm">
      <span className="text-danger font-medium">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-8 px-3 rounded-lg bg-surface border border-line shadow-sm text-[13px] font-medium hover:bg-hover transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

/** Skeleton de carregamento das listas. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5 bg-surface border border-line w-full rounded-xl p-4 animate-pulse">
          <div className="h-3.5 w-36 bg-subtle rounded-full" />
          <div className="h-3 w-52 bg-subtle rounded-full" />
          <div className="h-3 w-full bg-subtle rounded-full" />
        </div>
      ))}
    </>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "danger" | "success" | "warning"
  onClick?: () => void
}) {
  const toneText = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-fg"
  const toneIcon =
    tone === "danger"
      ? "bg-danger/10 text-danger"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-subtle text-muted"
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "text-left flex flex-col gap-2 p-4 bg-surface border border-line rounded-xl min-w-0 shadow-sm",
        onClick && "hover:border-line-strong hover:shadow transition-[border-color,box-shadow] duration-150 cursor-pointer",
      )}
    >
      <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted">
        <span className="truncate">{label}</span>
        <span className={cn("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center", toneIcon)}>
          <Icon size={15} />
        </span>
      </span>
      <strong className={cn("text-2xl font-semibold tracking-tight truncate tabular-nums", toneText)}>{value}</strong>
      {hint && <span className="text-xs text-faint truncate">{hint}</span>}
    </Wrapper>
  )
}
