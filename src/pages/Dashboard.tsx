import { useQuery } from "@tanstack/react-query"
import {
  AlarmClock,
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  LayoutDashboard,
  PackageCheck,
  Receipt,
  RefreshCw,
  Smartphone,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { dashboardService } from "@/services/resources"
import { Button, DataTable, EmptyState, ErrorState, ListSkeleton, Page, PageBody, PageHeader, Panel, StatCard } from "@/components/ui"
import { HistoryBox } from "@/components/Home/HistoryComponents/HistoryBox"
import { PeriodSelector, usePeriod } from "@/components/dashboard/PeriodSelector"
import { ChartCard, ChartSkeleton, HBarChart, MiniTable, NoData, TimeSeriesChart, shortDay } from "@/components/dashboard/charts"
import { useChartTheme } from "@/components/dashboard/chartTheme"
import { formatHours, formatMoney, formatNumber, formatPercent, STATUS_HEX, STATUS_LABEL } from "@/lib/format"
import { useCurrentUser } from "@/contexts/Auth-context"
import type { Dashboard as DashboardData } from "@/@types/api"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-[84px] rounded-xl bg-subtle animate-pulse" />
      ))}
    </div>
  )
}

function Kpis({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const k = data.kpis
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      <StatCard icon={ClipboardList} label="Em aberto" value={formatNumber(k.open)} hint="OS não finalizadas" onClick={() => navigate("/ordens")} />
      <StatCard
        icon={AlarmClock}
        label="Atrasadas"
        value={formatNumber(k.overdue)}
        tone={k.overdue > 0 ? "danger" : undefined}
        hint="Passaram da previsão"
        onClick={() => navigate("/ordens?overdue=true")}
      />
      <StatCard
        icon={PackageCheck}
        label="Prontas p/ retirada"
        value={formatNumber(k.ready_waiting_pickup)}
        tone={k.ready_waiting_pickup > 0 ? "warning" : undefined}
        hint="Avise o cliente"
        onClick={() => navigate("/ordens?status=PRONTA")}
      />
      <StatCard icon={ClipboardList} label="Criadas" value={formatNumber(k.created)} hint="No período" />
      <StatCard icon={ClipboardCheck} label="Entregues" value={formatNumber(k.delivered)} hint={k.canceled ? `${k.canceled} canceladas` : "No período"} />
      <StatCard icon={UserPlus} label="Novos clientes" value={formatNumber(k.new_clients)} hint="No período" />
      <StatCard icon={DollarSign} label="Faturamento" value={formatMoney(k.revenue)} tone="success" hint="Pagamentos recebidos" />
      <StatCard icon={Wallet} label="A receber" value={formatMoney(k.receivable)} tone={k.receivable > 0 ? "warning" : undefined} hint="Prontas e entregues" />
      <StatCard icon={Receipt} label="Ticket médio" value={formatMoney(k.avg_ticket)} />
      <StatCard icon={Clock} label="Tempo médio de reparo" value={formatHours(k.avg_turnaround_hours)} hint="Entrada → pronta" />
      <StatCard
        icon={AlertTriangle}
        label="Taxa de falhas"
        value={formatPercent(k.failure_rate)}
        tone={k.failure_rate > 0.05 ? "danger" : undefined}
        hint="Falhas ÷ entregues"
        onClick={() => navigate("/falhas")}
      />
      <StatCard icon={TrendingUp} label="OS / dia" value={formatNumber(Math.round((k.created / Math.max(1, data.orders_per_day.length)) * 10) / 10)} hint="Média de entrada" />
    </div>
  )
}

function Charts({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const t = useChartTheme()
  const hasDaily = data.orders_per_day.some((d) => d.created || d.delivered)
  const hasRevenue = data.revenue_per_day.some((d) => d.amount)
  const statusItems = data.by_status
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((s) => ({ key: s.status, label: STATUS_LABEL[s.status] ?? s.status, value: s.count, color: STATUS_HEX[s.status] }))
  const devices = data.top_devices.slice(0, 8).map((d) => ({ key: d.key, label: d.key || "Não informado", value: d.count }))
  const brands = data.top_brands.slice(0, 8).map((d) => ({ key: d.key, label: d.key || "Não informada", value: d.count, color: t.series[1] }))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
      <ChartCard
        title="OS por dia"
        icon={ClipboardList}
        table={<MiniTable head={["Dia", "Criadas", "Entregues"]} rows={data.orders_per_day.map((d) => [shortDay(d.date), d.created, d.delivered])} />}
      >
        {hasDaily ? (
          <TimeSeriesChart
            data={data.orders_per_day}
            series={[
              { key: "created", label: "Criadas" },
              { key: "delivered", label: "Entregues" },
            ]}
          />
        ) : (
          <NoData />
        )}
      </ChartCard>
      <ChartCard
        title="Faturamento por dia"
        icon={DollarSign}
        table={<MiniTable head={["Dia", "Valor"]} rows={data.revenue_per_day.map((d) => [shortDay(d.date), formatMoney(d.amount)])} />}
      >
        {hasRevenue ? (
          <TimeSeriesChart data={data.revenue_per_day} series={[{ key: "amount", label: "Faturamento" }]} format={(v) => formatMoney(v).replace(",00", "")} />
        ) : (
          <NoData text="Nenhum pagamento no período" />
        )}
      </ChartCard>
      <ChartCard
        title="OS por status"
        icon={LayoutDashboard}
        table={<MiniTable head={["Status", "OS"]} rows={statusItems.map((s) => [s.label, s.value])} />}
      >
        {statusItems.length ? (
          <HBarChart items={statusItems} onSelect={(item) => navigate(`/ordens?status=${item.key}`)} />
        ) : (
          <NoData text="Nenhuma OS" />
        )}
      </ChartCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Top equipamentos" icon={Smartphone} table={<MiniTable head={["Tipo", "OS"]} rows={devices.map((d) => [d.label, d.value])} />}>
          {devices.length ? <HBarChart items={devices} /> : <NoData />}
        </ChartCard>
        <ChartCard title="Top marcas" icon={Smartphone} table={<MiniTable head={["Marca", "OS"]} rows={brands.map((d) => [d.label, d.value])} />}>
          {brands.length ? <HBarChart items={brands} /> : <NoData />}
        </ChartCard>
      </div>
    </div>
  )
}

function Rankings({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
      <Panel title="Serviços mais realizados" icon={Wrench} bodyClassName="p-2">
        <DataTable
          rows={data.top_services.slice(0, 8)}
          rowKey={(s) => s.service_id ?? s.name}
          empty={<EmptyState icon={Wrench} title="Nenhum serviço no período" />}
          columns={[
            { key: "name", header: "Serviço", render: (s) => <span className="font-semibold">{s.name}</span> },
            { key: "count", header: "Qtd.", className: "text-right tabular-nums", render: (s) => formatNumber(s.count) },
            { key: "amount", header: "Valor", className: "text-right tabular-nums", render: (s) => formatMoney(s.amount) },
          ]}
        />
      </Panel>
      <Panel title="Técnicos" icon={Users} bodyClassName="p-2">
        <DataTable
          rows={[...data.technicians].sort((a, b) => b.finished - a.finished)}
          rowKey={(u) => u.user_id}
          empty={<EmptyState icon={Users} title="Nenhum técnico com OS" />}
          columns={[
            { key: "name", header: "Técnico", render: (u) => <span className="font-semibold">{u.name}</span> },
            { key: "open", header: "Abertas", className: "text-right tabular-nums", render: (u) => formatNumber(u.open) },
            { key: "finished", header: "Concluídas", className: "text-right tabular-nums", render: (u) => formatNumber(u.finished) },
            { key: "revenue", header: "Faturado", className: "text-right tabular-nums", hideOnMobile: true, render: (u) => formatMoney(u.revenue) },
          ]}
        />
      </Panel>
      <Panel
        title="Estoque baixo"
        icon={Boxes}
        bodyClassName="p-2"
        actions={
          <Button size="sm" variant="ghost" onClick={() => navigate("/cadastros/produtos?low_stock=true")}>
            Ver todos
          </Button>
        }
      >
        <DataTable
          rows={data.low_stock.slice(0, 8)}
          rowKey={(p) => p.product_id}
          onRowClick={() => navigate("/cadastros/produtos?low_stock=true")}
          empty={<EmptyState icon={Boxes} title="Estoque em dia" description="Nenhum produto abaixo do mínimo." />}
          columns={[
            { key: "name", header: "Produto", render: (p) => <span className="font-semibold">{p.name}</span> },
            {
              key: "stock",
              header: "Estoque",
              className: "text-right tabular-nums",
              render: (p) => <span className={p.stock <= 0 ? "text-red-500 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>{formatNumber(p.stock)}</span>,
            },
            { key: "min", header: "Mín.", className: "text-right tabular-nums", render: (p) => formatNumber(p.min_stock) },
          ]}
        />
      </Panel>
    </div>
  )
}

export default function Dashboard() {
  const user = useCurrentUser()
  const period = usePeriod("dashboard", "30d")
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard", period.params],
    queryFn: () => dashboardService.get(period.params),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  })

  return (
    <Page>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={user ? `${greeting()}, ${user.name.split(" ")[0]}` : undefined}
        actions={
          <Button size="sm" icon={RefreshCw} loading={isFetching && !isLoading} onClick={() => refetch()}>
            Atualizar
          </Button>
        }
      />
      <div className="shrink-0 px-2 pt-2">
        <PeriodSelector value={period} />
      </div>
      <PageBody className="flex flex-col gap-2">
        {isError && !data ? (
          <ErrorState message="Não foi possível carregar o dashboard." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <>
            <KpiSkeleton />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            <ListSkeleton count={2} />
          </>
        ) : (
          <>
            <Kpis data={data} />
            <Charts data={data} />
            <Rankings data={data} />
            <Panel title="OS recentes" icon={ClipboardList} bodyClassName="p-2">
              {data.recent_orders.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
                  {data.recent_orders.slice(0, 9).map((order) => (
                    <HistoryBox key={order.order_id} order={order} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={ClipboardList} title="Nenhuma OS ainda" description="Comece pela Recepção." />
              )}
            </Panel>
          </>
        )}
      </PageBody>
    </Page>
  )
}
