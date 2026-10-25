import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Clock, Gauge, Info, Lightbulb, ListChecks, Map as MapIcon, RefreshCw, Smartphone, TrendingUp, Users } from "lucide-react"
import { useState } from "react"
import { failuresService } from "@/services/resources"
import { Button, DataTable, EmptyState, ErrorState, Page, PageBody, PageHeader, Panel, StatCard } from "@/components/ui"
import { PeriodSelector, usePeriod } from "@/components/dashboard/PeriodSelector"
import { ChartCard, ChartSkeleton, HBarChart, MiniTable, NoData, TimeSeriesChart, shortDay } from "@/components/dashboard/charts"
import { useChartTheme } from "@/components/dashboard/chartTheme"
import { Pareto } from "@/components/failures/Pareto"
import { FailureList } from "@/components/failures/FailureList"
import { buildInsights, Insight } from "@/components/failures/insights"
import { FAILURE_CATEGORY_LABEL, formatHours, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/cn"
import type { FailureCategory, FailureStats } from "@/@types/api"

const INSIGHT_STYLE: Record<Insight["tone"], { icon: typeof Info; className: string }> = {
  danger: { icon: AlertTriangle, className: "text-red-500" },
  warning: { icon: AlertTriangle, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-500" },
  success: { icon: CheckCircle2, className: "text-green-500" },
}

function Insights({ stats }: { stats: FailureStats }) {
  const insights = buildInsights(stats)
  return (
    <Panel title="Insights" icon={Lightbulb} bodyClassName="p-2">
      <ul className="flex flex-col gap-2">
        {insights.map((i) => {
          const { icon: Icon, className } = INSIGHT_STYLE[i.tone]
          return (
            <li key={i.text} className="flex items-start gap-2 text-sm">
              <Icon size={18} className={cn("shrink-0 mt-0.5", className)} aria-hidden />
              <span>{i.text}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function StatsCharts({ stats, onCategory, onReason }: { stats: FailureStats; onCategory: (c: FailureCategory) => void; onReason: (r: string) => void }) {
  const t = useChartTheme()
  const categories = [...stats.by_category]
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ key: c.key, label: FAILURE_CATEGORY_LABEL[c.key as FailureCategory] ?? c.key, value: c.count }))
  const devices = [...stats.by_device_type].sort((a, b) => b.count - a.count).slice(0, 8).map((d) => ({ key: d.key, label: d.key || "Não informado", value: d.count }))
  const brands = [...stats.by_brand]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((d) => ({ key: d.key, label: d.key || "Não informada", value: d.count, color: t.series[1] }))
  const technicians = stats.by_technician
    .map((u) => ({ ...u, rate: u.delivered ? u.count / u.delivered : 0 }))
    .sort((a, b) => b.rate - a.rate)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
      <ChartCard
        title="Mapa de motivos (Pareto)"
        icon={MapIcon}
        className="xl:row-span-2"
        table={<MiniTable head={["Motivo", "Ocorrências"]} rows={stats.by_reason.map((r) => [r.key, r.count])} />}
      >
        {stats.by_reason.length ? <Pareto items={stats.by_reason} onSelect={onReason} /> : <NoData />}
      </ChartCard>
      <ChartCard title="Por categoria" icon={ListChecks} table={<MiniTable head={["Categoria", "Falhas"]} rows={categories.map((c) => [c.label, c.value])} />}>
        {categories.length ? <HBarChart items={categories} onSelect={(item) => onCategory(item.key as FailureCategory)} /> : <NoData />}
      </ChartCard>
      <ChartCard title="Linha do tempo" icon={TrendingUp} table={<MiniTable head={["Semana", "Falhas"]} rows={stats.timeline.map((d) => [shortDay(d.date), d.count])} />}>
        {stats.timeline.some((d) => d.count) ? <TimeSeriesChart data={stats.timeline} series={[{ key: "count", label: "Falhas" }]} height={200} /> : <NoData />}
      </ChartCard>
      <Panel title="Por técnico" icon={Users} bodyClassName="p-2">
        <DataTable
          rows={technicians}
          rowKey={(u) => u.user_id ?? u.name}
          empty={<EmptyState icon={Users} title="Sem dados por técnico" />}
          columns={[
            { key: "name", header: "Técnico", render: (u) => <span className="font-semibold">{u.name || "Sem técnico"}</span> },
            { key: "count", header: "Falhas", className: "text-right tabular-nums", render: (u) => formatNumber(u.count) },
            { key: "delivered", header: "Entregues", className: "text-right tabular-nums", render: (u) => formatNumber(u.delivered) },
            {
              key: "rate",
              header: "Taxa",
              className: "text-right tabular-nums",
              render: (u) => <span className={cn(u.rate > stats.rate * 1.5 && u.delivered >= 5 && "text-red-500 font-bold")}>{u.delivered ? formatPercent(u.rate) : "—"}</span>,
            },
          ]}
        />
      </Panel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ChartCard title="Por tipo de equipamento" icon={Smartphone} table={<MiniTable head={["Tipo", "Falhas"]} rows={devices.map((d) => [d.label, d.value])} />}>
          {devices.length ? <HBarChart items={devices} /> : <NoData />}
        </ChartCard>
        <ChartCard title="Por marca" icon={Smartphone} table={<MiniTable head={["Marca", "Falhas"]} rows={brands.map((d) => [d.label, d.value])} />}>
          {brands.length ? <HBarChart items={brands} /> : <NoData />}
        </ChartCard>
      </div>
    </div>
  )
}

/** Mapeamento de falhas de entrega: onde, por que e com quem as entregas dão errado. */
export default function Failures() {
  const period = usePeriod("falhas", "30d")
  const [category, setCategory] = useState<FailureCategory | "">("")
  const [q, setQ] = useState("")
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["failures", "stats", period.params],
    queryFn: () => failuresService.stats(period.params),
    placeholderData: (prev) => prev,
  })

  function scrollToList() {
    document.getElementById("lista-falhas")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <Page>
      <PageHeader
        icon={AlertTriangle}
        title="Falhas de entrega"
        subtitle="Mapeamento de retornos, garantias, retrabalhos e problemas na entrega"
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
          <ErrorState message="Não foi possível carregar as estatísticas de falhas." onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[84px] rounded-md bg-zinc-200 dark:bg-zinc-800/80 animate-pulse" />
              ))}
            </div>
            <ChartSkeleton height={260} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              <StatCard icon={AlertTriangle} label="Falhas no período" value={formatNumber(data.total)} />
              <StatCard icon={Clock} label="Em aberto" value={formatNumber(data.open)} tone={data.open > 0 ? "warning" : undefined} />
              <StatCard icon={CheckCircle2} label="Resolvidas" value={formatNumber(data.resolved)} tone={data.resolved > 0 ? "success" : undefined} />
              <StatCard icon={Gauge} label="Taxa de falha" value={formatPercent(data.rate)} tone={data.rate > 0.05 ? "danger" : undefined} hint="Falhas ÷ OS entregues" />
              <StatCard icon={Clock} label="Tempo médio p/ resolver" value={data.resolved ? formatHours(data.avg_resolution_hours) : "—"} />
            </div>
            <Insights stats={data} />
            <StatsCharts
              stats={data}
              onCategory={(c) => {
                setCategory(c)
                scrollToList()
              }}
              onReason={(r) => {
                setQ(r)
                scrollToList()
              }}
            />
          </>
        )}
        <div id="lista-falhas" className="scroll-mt-2">
          <Panel title="Registros" icon={ListChecks} bodyClassName="p-2">
            <FailureList params={period.params} category={category} onCategoryChange={setCategory} q={q} onQChange={setQ} />
          </Panel>
        </div>
      </PageBody>
    </Page>
  )
}
