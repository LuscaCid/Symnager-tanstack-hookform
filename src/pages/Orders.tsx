import { useQuery } from "@tanstack/react-query"
import { OrdersTableSkeleton } from "@/components/skeletons/PageSkeletons"
import { AlertTriangle, ClipboardList, LayoutGrid, List, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ORDER_STATUSES, PRIORITIES, type Order, type OrderStatus } from "@/@types/api"
import {
  Button,
  Column,
  DataTable,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  Pagination,
  PriorityBadge,
  SearchInput,
  SelectField,
  StatusBadge,
  TextField,
  Tooltip,
} from "@/components/ui"
import { OrderBoard } from "@/components/orders/OrderBoard"
import { isOverdue } from "@/components/orders/orderUtils"
import { cn } from "@/lib/cn"
import { formatDate, formatMoney, formatOrderNumber, PRIORITY_LABEL, STATUS_HEX } from "@/lib/format"
import { type SegmentApi, useSegment } from "@/lib/segment"
import { VisitChip } from "@/components/orders/VisitChip"
import { useDebounce, useTechnicians } from "@/lib/hooks"
import { ordersService } from "@/services/resources"

const PAGE_SIZE = 25

type VisitFilter = "" | "today" | "week"

/** Intervalo das visitas: hoje ou os próximos 7 dias (horário local). */
function visitRange(filter: VisitFilter) {
  if (!filter) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + (filter === "today" ? 1 : 7))
  end.setMilliseconds(-1)
  return { from: start.toISOString(), to: end.toISOString() }
}

const buildColumns = (segment: SegmentApi): Column<Order>[] => [
  {
    key: "number",
    header: "OS",
    className: "font-mono text-xs whitespace-nowrap",
    render: (o) => formatOrderNumber(o.number),
  },
  {
    key: "client",
    header: "Cliente",
    render: (o) => <span className="font-semibold">{o.owner?.name ?? "—"}</span>,
  },
  {
    key: "device",
    header: segment.label("device"),
    render: (o) => (
      <Tooltip content={o.description} side="top" align="start">
        <span className="block max-w-64 truncate">{o.device}</span>
      </Tooltip>
    ),
  },
  { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ...(segment.onSite
    ? [
        {
          key: "visit",
          header: "Visita",
          hideOnMobile: true,
          className: "whitespace-nowrap",
          render: (o: Order) =>
            o.scheduled_at ? <VisitChip iso={o.scheduled_at} address={o.service_address} /> : <span className="text-faint">—</span>,
        } satisfies Column<Order>,
      ]
    : []),
  { key: "priority", header: "Prioridade", hideOnMobile: true, render: (o) => <PriorityBadge priority={o.priority} /> },
  {
    key: "technician",
    header: "Técnico",
    hideOnMobile: true,
    render: (o) => o.technician?.name ?? <span className="text-faint">—</span>,
  },
  { key: "arrived", header: "Entrada", hideOnMobile: true, className: "whitespace-nowrap", render: (o) => formatDate(o.arrived_at) },
  {
    key: "due",
    header: "Previsão",
    hideOnMobile: true,
    className: "whitespace-nowrap",
    render: (o) =>
      o.due_date ? (
        <span className={cn(isOverdue(o) && "text-red-500 font-semibold inline-flex items-center gap-1")}>
          {isOverdue(o) && <AlertTriangle size={14} />}
          {formatDate(o.due_date)}
        </span>
      ) : (
        "—"
      ),
  },
  { key: "total", header: "Total", className: "text-right tabular-nums whitespace-nowrap", render: (o) => formatMoney(o.total) },
]

function OrdersList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const technicians = useTechnicians()
  const segment = useSegment()
  const columns = useMemo(() => buildColumns(segment), [segment.profile, segment.onSite]) // eslint-disable-line react-hooks/exhaustive-deps
  const [query, setQuery] = useState(params.get("q") ?? "")
  const q = useDebounce(query.trim(), 300)

  const statuses = (params.get("status") ?? "").split(",").filter(Boolean) as OrderStatus[]
  const priority = params.get("priority") ?? ""
  const technician = params.get("technician_id") ?? ""
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  const overdue = params.get("overdue") === "true"
  const visits = (segment.onSite ? params.get("visits") ?? "" : "") as VisitFilter
  const range = visitRange(visits)
  const page = Number(params.get("page") ?? 1) || 1

  function setParam(key: string, value: string | null, resetPage = true) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (resetPage && key !== "page") next.delete("page")
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if ((params.get("q") ?? "") !== q) setParam("q", q || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function toggleStatus(status: OrderStatus) {
    const next = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
    setParam("status", next.join(",") || null)
  }

  const hasFilters = !!(q || statuses.length || priority || technician || from || to || overdue || visits)

  function clearFilters() {
    setQuery("")
    setParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get("view")) next.set("view", prev.get("view")!)
      return next
    })
  }

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["orders", { q, statuses, priority, technician, from, to, overdue, visits, page }],
    queryFn: () =>
      ordersService.list({
        q,
        status: statuses.join(",") || undefined,
        priority: priority || undefined,
        technician_id: technician || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        overdue: overdue || undefined,
        scheduled_from: range?.from,
        scheduled_to: range?.to,
        page,
        page_size: PAGE_SIZE,
        // com filtro de visitas, a ordem é a da agenda
        sort: range ? "scheduled_at" : "arrived_at",
        order: range ? "asc" : "desc",
      }),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex flex-col gap-3 px-4 pb-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Buscar por nº, cliente, ${segment.label("device").toLowerCase()}${segment.show("serial") ? ", série" : ""}${segment.onSite ? ", endereço" : ""} ou código de rastreio`}
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por status">
          {ORDER_STATUSES.map((status) => {
            const active = statuses.includes(status)
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition duration-200",
                  active
                    ? "border-accent bg-accent-soft text-accent font-medium"
                    : "border-line  text-muted  hover:bg-hover ",
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_HEX[status] }} />
                {segment.statusLabel(status)}
              </button>
            )
          })}
        </div>
        <div className={cn("grid grid-cols-2 gap-2 items-end", segment.onSite ? "md:grid-cols-6" : "md:grid-cols-5")}>
          <SelectField label="Prioridade" value={priority} onChange={(e) => setParam("priority", e.target.value || null)}>
            <option value="">Todas</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Técnico" value={technician} onChange={(e) => setParam("technician_id", e.target.value || null)}>
            <option value="">Todos</option>
            {technicians.data?.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.name}
              </option>
            ))}
          </SelectField>
          {segment.onSite && (
            <SelectField label="Visitas" value={visits} onChange={(e) => setParam("visits", e.target.value || null)}>
              <option value="">Todas</option>
              <option value="today">Hoje</option>
              <option value="week">Próximos 7 dias</option>
            </SelectField>
          )}
          <TextField label="Entrada de" type="date" value={from} onChange={(e) => setParam("from", e.target.value || null)} />
          <TextField label="até" type="date" value={to} onChange={(e) => setParam("to", e.target.value || null)} />
          <div className="flex gap-2 col-span-2 md:col-span-1">
            <Button
              size="sm"
              icon={AlertTriangle}
              variant={overdue ? "primary" : "default"}
              aria-pressed={overdue}
              onClick={() => setParam("overdue", overdue ? null : "true")}
              className="flex-1"
            >
              Atrasadas
            </Button>
            {hasFilters && (
              <Button size="sm" icon={X} variant="ghost" onClick={clearFilters} tooltip="Limpar filtros">
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <OrdersTableSkeleton />
        ) : isError || !data ? (
          <ErrorState message="Não foi possível carregar as ordens de serviço." onRetry={() => refetch()} />
        ) : (
          <div className={cn("transition-opacity duration-200", isFetching && "opacity-60")}>
            <DataTable
              columns={columns}
              rows={data.data}
              rowKey={(o) => o.order_id}
              onRowClick={(o) => navigate(`/ordens/${o.order_id}`)}
              empty={
                <EmptyState
                  icon={ClipboardList}
                  title={hasFilters ? "Nenhuma OS com esses filtros" : "Nenhuma ordem de serviço ainda"}
                  action={
                    hasFilters ? (
                      <Button size="sm" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    ) : (
                      <Button size="sm" icon={Plus} onClick={() => navigate("/recepcao")}>
                        Nova OS
                      </Button>
                    )
                  }
                />
              }
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.meta.total} onChange={(p) => setParam("page", String(p), false)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Orders() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get("view") === "board" ? "board" : "list"

  function setView(next: "list" | "board") {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === "list") p.delete("view")
        else p.set("view", next)
        return p
      },
      { replace: true },
    )
  }

  return (
    <Page>
      <PageHeader
        icon={ClipboardList}
        title="Ordens de serviço"
        subtitle={view === "board" ? "Arraste os cartões entre as colunas para mudar o status" : undefined}
        actions={
          <>
            <div role="group" aria-label="Modo de visualização" className="flex gap-0.5 p-0.5 rounded-lg bg-subtle">
              <button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] transition-colors duration-100",
                  view === "list" ? "bg-surface shadow-sm text-fg font-medium" : "text-muted hover:text-fg",
                )}
              >
                <List size={14} /> Lista
              </button>
              <button
                onClick={() => setView("board")}
                aria-pressed={view === "board"}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] transition-colors duration-100",
                  view === "board" ? "bg-surface shadow-sm text-fg font-medium" : "text-muted hover:text-fg",
                )}
              >
                <LayoutGrid size={14} /> Quadro
              </button>
            </div>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => navigate("/recepcao")}>
              Nova OS
            </Button>
          </>
        }
      />
      {view === "board" ? (
        <div className="flex-1 min-h-0">
          <OrderBoard />
        </div>
      ) : (
        <OrdersList />
      )}
    </Page>
  )
}
