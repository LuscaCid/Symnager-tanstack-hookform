import { useQuery } from "@tanstack/react-query"
import { OrderBoardSkeleton } from "@/components/skeletons/PageSkeletons"
import { CalendarClock, Columns3, GripVertical, User } from "lucide-react"
import { DragEvent, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { BoardColumn, Order } from "@/@types/api"
import { ErrorState, PriorityBadge, Tooltip } from "@/components/ui"
import { cn } from "@/lib/cn"
import { useHasRole } from "@/contexts/Auth-context"
import { useBoardColumns } from "@/lib/board"
import { formatDate, formatMoney, formatOrderNumber } from "@/lib/format"
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

/** Quadro kanban: arraste os cartões entre colunas para mudar o status (colunas em Configurações → Quadro). */
export function OrderBoard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "board"],
    queryFn: ordersService.board,
    refetchInterval: 60_000,
  })
  const { request, dialog } = useStatusChange()
  const { columns, labelOf, colorOf, columnOf, missing } = useBoardColumns()
  const { statusLabel } = useSegment()
  const isAdmin = useHasRole()
  const [dragging, setDragging] = useState<Order | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const byColumn = useMemo(() => {
    const map = new Map<string, Order[]>(columns.map((c) => [c.key, []]))
    for (const order of Object.values(data ?? {}).flat()) {
      if (!order) continue
      const col = columnOf(order)
      if (col) map.get(col.key)?.push(order)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columns])

  if (isLoading) return <OrderBoardSkeleton />
  if (isError || !data) return <ErrorState message="Não foi possível carregar o quadro." onRetry={() => refetch()} />

  const hidden = missing.reduce((n, s) => n + (data[s]?.length ?? 0), 0)

  function handleDrop(e: DragEvent<HTMLElement>, col: BoardColumn) {
    e.preventDefault()
    setOver(null)
    // o id vem no dataTransfer: não depende do estado React já ter sido atualizado
    const id = Number(e.dataTransfer.getData(DRAG_TYPE))
    const order = dragging ?? Object.values(data!).flat().find((o) => o?.order_id === id) ?? null
    setDragging(null)
    if (order && columnOf(order)?.key !== col.key) request(order, col.status, col.key, labelOf(col))
  }

  return (
    <div className="h-full flex flex-col">
      {(hidden > 0 || isAdmin) && (
        <div className="shrink-0 flex items-center gap-2 px-3 pt-2 text-xs text-faint">
          {hidden > 0 && (
            <span>
              {hidden} OS em status sem coluna no quadro ({missing.map((s) => statusLabel(s)).join(", ")}).
            </span>
          )}
          {isAdmin && (
            <Link to="/configuracoes/quadro" className="ml-auto inline-flex items-center gap-1 hover:text-fg transition-colors duration-100">
              <Columns3 size={13} /> Editar colunas
            </Link>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 flex gap-2 overflow-x-auto overflow-y-hidden p-2">
        {columns.map((col) => {
          const orders = byColumn.get(col.key) ?? []
          const isTarget = over === col.key && dragging && columnOf(dragging)?.key !== col.key
          const final = col.status === "ENTREGUE" || col.status === "CANCELADA"
          return (
            <section
              key={col.key}
              aria-label={labelOf(col)}
              onDragOver={(e) => {
                if (!dragging && !e.dataTransfer.types.includes(DRAG_TYPE)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (over !== col.key) setOver(col.key)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((k) => (k === col.key ? null : k))
              }}
              onDrop={(e) => handleDrop(e, col)}
              className={cn(
                "w-72 shrink-0 h-full flex flex-col rounded-xl border transition duration-200",
                isTarget ? "border-accent/50 bg-accent-soft/60" : "border-transparent bg-subtle/70",
              )}
            >
              <header className="shrink-0 flex items-center gap-2 p-2 border-b border-line ">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf(col) }} />
                <h2 className="font-semibold text-sm flex-1 truncate">{labelOf(col)}</h2>
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
                    {final ? "Últimos 7 dias" : "Solte aqui"}
                  </span>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {dialog}
    </div>
  )
}
