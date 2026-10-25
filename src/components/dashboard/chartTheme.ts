import { useContextSelector } from "use-context-selector"
import { ThemeContext } from "@/contexts/Theme-context"

/**
 * Cores dos gráficos derivadas do tema atual. A 1ª série usa o destaque do app (verde-petróleo);
 * as demais seguem a paleta categórica com passos próprios para o tema escuro.
 * Eixos, grade e textos usam os mesmos neutros dos tokens (globals.css) para ficarem recessivos.
 */
const LIGHT = {
  series: ["#0f766e", "#eb6834", "#2a78d6", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  surface: "#ffffff", // --c-surface
  grid: "#ecebe7", // entre --c-line e --c-subtle
  axis: "#d4d3ce", // --c-line-strong
  textPrimary: "#1c1b19", // --c-fg
  textSecondary: "#5f5e5a", // --c-muted
  textMuted: "#8d8c87", // --c-faint
  cursor: "rgba(15,118,110,0.06)",
}

const DARK = {
  series: ["#36b5a5", "#d95926", "#3987e5", "#c98500", "#d55181", "#2f9e44", "#9085e9", "#e66767"],
  surface: "#1c1c1f", // --c-surface
  grid: "#2c2c31", // --c-line
  axis: "#3c3c42", // --c-line-strong
  textPrimary: "#ececee", // --c-fg
  textSecondary: "#a5a5ac", // --c-muted
  textMuted: "#76767d", // --c-faint
  cursor: "rgba(54,181,165,0.08)",
}

export type ChartTheme = typeof LIGHT

export function useChartTheme(): ChartTheme {
  const theme = useContextSelector(ThemeContext, (c) => c.theme)
  return theme === "dark" ? DARK : LIGHT
}

/** Props comuns de eixo para manter tudo recessivo. */
export function axisProps(t: ChartTheme) {
  return {
    stroke: t.axis,
    tick: { fill: t.textMuted, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: t.grid },
  }
}
