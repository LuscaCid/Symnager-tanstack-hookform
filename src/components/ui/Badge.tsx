import { ReactNode } from "react"
import type { OrderStatus, Priority } from "@/@types/api"
import { cn } from "@/lib/cn"
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_HEX } from "@/lib/format"
import { useSegment } from "@/lib/segment"

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        "bg-subtle text-muted",
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Status da OS: ponto com a cor do status + rótulo. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const { statusLabel } = useSegment()
  return (
    <Badge className={STATUS_COLOR[status]}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_HEX[status] }} />
      {statusLabel(status)}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_COLOR[priority]}>{PRIORITY_LABEL[priority] ?? priority}</Badge>
}

/** Tag livre da OS. */
export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit px-2 py-0.5 text-xs font-medium rounded-md bg-accent-soft text-accent">
      #{children}
    </span>
  )
}
