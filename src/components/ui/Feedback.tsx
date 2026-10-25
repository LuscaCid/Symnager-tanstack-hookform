import { Loader, LucideIcon, Inbox } from "lucide-react"
import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export function Spinner({ label = "Carregando...", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("flex items-center justify-center gap-2 p-4 text-zinc-600 dark:text-zinc-400", className)}>
      <Loader size={20} className="animate-spin" /> {label}
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
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-zinc-600 dark:text-zinc-400">
      <div className="rounded-md border border-zinc-300 dark:border-zinc-800 p-2">
        <Icon size={24} />
      </div>
      <strong className="text-zinc-800 dark:text-zinc-300">{title}</strong>
      {description && <p className="text-sm max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-2 flex flex-col items-center gap-2 border border-red-500/40 rounded-md p-4 text-sm">
      <span className="text-red-500 font-semibold">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

/** Skeleton no padrão das listas originais (cards com barras pulsando). */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 bg-zinc-200 w-full h-28 rounded-md p-2 animate-pulse dark:bg-zinc-800/80">
          <div className="p-3 w-32 bg-zinc-300 rounded-md dark:bg-zinc-500" />
          <div className="p-2 w-44 bg-zinc-300 rounded-md dark:bg-zinc-500" />
          <div className="p-2 w-full bg-zinc-300 rounded-md dark:bg-zinc-500" />
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
  const toneClass =
    tone === "danger" ? "text-red-500" : tone === "success" ? "text-green-500" : tone === "warning" ? "text-amber-500" : ""
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "text-left flex flex-col gap-1 p-3 border border-zinc-300 dark:border-zinc-800 rounded-md min-w-0 shadow-sm",
        onClick && "hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 cursor-pointer",
      )}
    >
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        <span className="truncate">{label}</span>
        <Icon size={18} className={toneClass} />
      </span>
      <strong className={cn("text-2xl font-bold truncate tabular-nums", toneClass)}>{value}</strong>
      {hint && <span className="text-xs text-zinc-500 truncate">{hint}</span>}
    </Wrapper>
  )
}
