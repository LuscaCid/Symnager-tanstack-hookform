import { useQuery } from "@tanstack/react-query"
import { OrderBoardSkeleton } from "@/components/skeletons/PageSkeletons"
import { CalendarClock, GripVertical, User } from "lucide-react"
import { DragEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/@types/api"
import { ErrorState, PriorityBadge, Tooltip } from "@/components/ui"
import { cn } from "@/lib/cn"
import { formatDate, formatMoney, formatOrderNumber, STATUS_HEX } from "@/lib/format"
import { useSegment } from "@/lib/segment"
import { ordersService } from "@/services/resources"
import { isOverdue } from "./orderUtils"
import { useStatusChange } from "./useStatusChange"
import { VisitChip } from "./VisitChip"

const DRAG_TYPE = "application/x-symnager-order"

function BoardCard({ order, onDragStart, onDragEnd }: { order: Order; onDragStart: (o: Order) => void; onDragEnd: () => void }) {
  const navigate = useNavigate()
  const overdue = isOverdue(order)

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(DRAG_TYPE, String(order.order_id))
    e.dataTransfer.effectAllowed = "move"
    onDragStart(order)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/ordens/${order.order_id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/ordens/${order.order_id}`)}
      tabIndex={0}
      role="button"
      aria-label={`${formatOrderNumber(order.number)} ${order.device}`}
      className={cn(
        "group flex flex-col gap-1 p-2 rounded-md border bg-app  shadow-sm cursor-grab active:cursor-grabbing",
        "hover:bg-hover  transition duration-200 focus:outline-none focus-visible:border-line-strong",
        overdue ? "border-red-500/60" : "border-line ",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-xs text-faint">{formatOrderNumber(order.number)}</span>
        <GripVertical size={14} className="text-faint opacity-0 group-hover:opacity-100 transition duration-200" />
      </div>
      <strong className="text-sm leading-tight line-clamp-2">{order.device}</strong>
      <span className="flex items-center gap-1 text-xs text-muted truncate">
        <User size={12} className="shrink-0" /> {order.owner?.name ?? "—"}
      </span>
      {order.service_address && <span className="text-xs text-faint truncate">{order.service_address}</span>}
      <div className="flex flex-wrap items-center gap-1">
        {order.priority !== "NORMAL" && <PriorityBadge priority={order.priority} />}
        {order.scheduled_at && <VisitChip iso={order.scheduled_at} address={order.service_address} />}
        {order.due_date && (
          <Tooltip content={overdue ? "Prazo vencido" : "Previsão de entrega"}>
            <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "text-danger font-semibold" : "text-muted")}>
              <CalendarClock size={12} /> {formatDate(order.due_date, "dd/MM")}
            </span>
          </Tooltip>
        )}
        {order.total > 0 && <span className="ml-auto text-xs font-semibold tabular-nums">{formatMoney(order.total)}</span>}
      </div>
      {order.technician && <span className="text-xs text-faint truncate">Téc.: {order.technician.name}</span>}
    </div>
  )
}

/** Quadro kanban: arraste os cartões entre colunas para mudar o status. */
export function OrderBoard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "board"],
    queryFn: ordersService.board,
    refetchInterval: 60_000,
  })
  const { request, dialog } = useStatusChange()
  const { statusLabel } = useSegment()
  const [dragging, setDragging] = useState<Order | null>(null)
  const [over, setOver] = useState<OrderStatus | null>(null)

  if (isLoading) return <OrderBoardSkeleton />
  if (isError || !data) return <ErrorState message="Não foi possível carregar o quadro." onRetry={() => refetch()} />

  function handleDrop(e: DragEvent<HTMLElement>, status: OrderStatus) {
    e.preventDefault()
    setOver(null)
    // o id vem no dataTransfer: não depende do estado React já ter sido atualizado
    const id = Number(e.dataTransfer.getData(DRAG_TYPE))
    const order = dragging ?? Object.values(data!).flat().find((o) => o?.order_id === id) ?? null
    setDragging(null)
    if (order && order.status !== status) request(order, status)
  }

  return (
    <div className="h-full flex gap-2 overflow-x-auto overflow-y-hidden p-2">
      {ORDER_STATUSES.map((status) => {
        const orders = data[status] ?? []
        const isTarget = over === status && dragging && dragging.status !== status
        return (
          <section
            key={status}
            aria-label={statusLabel(status)}
            onDragOver={(e) => {
              if (!dragging && !e.dataTransfer.types.includes(DRAG_TYPE)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              if (over !== status) setOver(status)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((s) => (s === status ? null : s))
            }}
            onDrop={(e) => handleDrop(e, status)}
            className={cn(
              "w-72 shrink-0 h-full flex flex-col rounded-xl border transition duration-200",
              isTarget
                ? "border-accent/50 bg-accent-soft/60"
                : "border-transparent bg-subtle/70",
            )}
          >
            <header className="shrink-0 flex items-center gap-2 p-2 border-b border-line ">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_HEX[status] }} />
              <h2 className="font-semibold text-sm flex-1 truncate">{statusLabel(status)}</h2>
              <span className="text-xs font-semibold tabular-nums text-faint">{orders.length}</span>
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
              {orders.map((order) => (
                <BoardCard
                  key={order.order_id}
                  order={order}
                  onDragStart={setDragging}
                  onDragEnd={() => {
                    setDragging(null)
                    setOver(null)
                  }}
                />
              ))}
              {orders.length === 0 && (
                <span className="text-xs text-faint text-center py-4 border border-dashed border-line rounded-md">
                  {status === "ENTREGUE" || status === "CANCELADA" ? "Últimos 7 dias" : "Solte aqui"}
                </span>
              )}
            </div>
          </section>
        )
      })}
      {dialog}
    </div>
  )
}
