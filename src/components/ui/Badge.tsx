import { ReactNode } from "react"
import type { OrderStatus, Priority } from "@/@types/api"
import { cn } from "@/lib/cn"
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/format"

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold",
        "border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_COLOR[status]}>{STATUS_LABEL[status] ?? status}</Badge>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_COLOR[priority]}>{PRIORITY_LABEL[priority] ?? priority}</Badge>
}

/** Chip invertido usado nas tags (igual ao footer do HistoryBox original). */
export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit px-2 py-0.5 text-xs bg-zinc-950 dark:bg-zinc-200 dark:text-zinc-950 font-bold text-zinc-100 rounded-md">
      {children}
    </span>
  )
}
