import { useContextSelector } from "use-context-selector"
import { ThemeContext } from "@/contexts/Theme-context"

/**
 * Cores dos gráficos derivadas do tema atual. A paleta categórica segue a ordem fixa
 * validada (azul, laranja, água...) — passos próprios para o tema escuro, não uma inversão.
 * Eixos, grade e textos usam a escala zinc do app para ficarem recessivos.
 */
const LIGHT = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  surface: "#f4f4f5", // zinc-100
  grid: "#e4e4e7", // zinc-200
  axis: "#a1a1aa", // zinc-400
  textPrimary: "#09090b", // zinc-950
  textSecondary: "#52525b", // zinc-600
  textMuted: "#71717a", // zinc-500
  cursor: "rgba(113,113,122,0.12)",
}

const DARK = {
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  surface: "#09090b", // zinc-950
  grid: "#27272a", // zinc-800
  axis: "#52525b", // zinc-600
  textPrimary: "#e4e4e7", // zinc-200
  textSecondary: "#a1a1aa", // zinc-400
  textMuted: "#71717a", // zinc-500
  cursor: "rgba(161,161,170,0.12)",
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
