import type { FailureCategory, FailureStats } from "@/@types/api"
import { FAILURE_CATEGORY_LABEL, formatHours } from "@/lib/format"

export interface Insight {
  tone: "danger" | "warning" | "info" | "success"
  text: string
}

const ADVICE: Partial<Record<FailureCategory, string>> = {
  ENTREGA: "confirme endereço e disponibilidade do cliente antes de sair para entrega",
  GARANTIA: "reforce o teste final antes de liberar o aparelho",
  RETRABALHO: "revise o diagnóstico e use o checklist de saída",
  PECA: "avalie a qualidade do fornecedor das peças",
  ATRASO: "ajuste as previsões de entrega ou a fila de técnicos",
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/** Observações em linguagem simples a partir das estatísticas (máx. 4). */
export function buildInsights(stats: FailureStats): Insight[] {
  const out: Insight[] = []
  if (stats.total === 0) {
    return [{ tone: "success", text: "Nenhuma falha registrada no período. Continue registrando retornos e problemas na entrega para manter este mapa confiável." }]
  }

  const topReason = [...stats.by_reason].sort((a, b) => b.count - a.count)[0]
  if (topReason && topReason.count / stats.total >= 0.25) {
    out.push({
      tone: "warning",
      text: `${pct(topReason.count / stats.total)} das falhas vêm de "${topReason.key}" — atacar este motivo traz o maior ganho.`,
    })
  }

  const topCategory = [...stats.by_category].sort((a, b) => b.count - a.count)[0]
  if (topCategory) {
    const cat = topCategory.key as FailureCategory
    const advice = ADVICE[cat]
    out.push({
      tone: "info",
      text: `Categoria mais frequente: ${FAILURE_CATEGORY_LABEL[cat] ?? cat} (${topCategory.count}).${advice ? ` Sugestão: ${advice}.` : ""}`,
    })
  }

  // técnico com taxa bem acima da média (mínimo de 5 entregas para não ser ruído)
  const avgRate = stats.rate
  const outlier = stats.by_technician
    .filter((t) => t.delivered >= 5)
    .map((t) => ({ ...t, rate: t.count / t.delivered }))
    .sort((a, b) => b.rate - a.rate)[0]
  if (outlier && avgRate > 0 && outlier.rate >= avgRate * 1.5) {
    out.push({
      tone: "danger",
      text: `${outlier.name} tem taxa de falha de ${pct(outlier.rate)}, acima da média geral (${pct(avgRate)}). Vale acompanhar as OS dele(a).`,
    })
  }

  if (stats.open > 0 && stats.open / stats.total >= 0.3) {
    out.push({
      tone: "warning",
      text: `${stats.open} ${stats.open === 1 ? "falha ainda" : "falhas ainda"} sem resolução (${pct(stats.open / stats.total)}). Tempo médio para resolver: ${formatHours(stats.avg_resolution_hours)}.`,
    })
  } else if (stats.rate > 0 && stats.rate <= 0.03) {
    out.push({ tone: "success", text: `Taxa de falha em ${pct(stats.rate)} das entregas — dentro de um patamar saudável.` })
  }

  const topBrand = [...stats.by_brand].sort((a, b) => b.count - a.count)[0]
  if (out.length < 4 && topBrand && topBrand.key && topBrand.count / stats.total >= 0.4) {
    out.push({ tone: "info", text: `A marca ${topBrand.key} concentra ${pct(topBrand.count / stats.total)} das falhas.` })
  }

  return out.slice(0, 4)
}
