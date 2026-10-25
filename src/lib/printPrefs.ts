/** Preferências de impressão desta máquina (impressora é algo local, não vai para o servidor). */
export interface LocalPrintPrefs {
  /** nome da impressora no sistema (Electron). Vazio = perguntar / padrão do sistema */
  deviceName: string
  /** imprimir sem abrir o diálogo do sistema (Electron) */
  silent: boolean
  /** layout preferido nesta máquina; vazio = usar o padrão da empresa (settings.print.layout) */
  layout: "" | "A4" | "THERMAL"
}

const KEY = "@symnager-print"
const DEFAULTS: LocalPrintPrefs = { deviceName: "", silent: false, layout: "" }

export function getPrintPrefs(): LocalPrintPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }
  } catch {
    return DEFAULTS
  }
}

export function setPrintPrefs(prefs: Partial<LocalPrintPrefs>) {
  const next = { ...getPrintPrefs(), ...prefs }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // sem persistência
  }
  return next
}

/** URL pública de rastreio usada no QR code do comprovante. */
export function trackingUrl(code: string, baseUrl?: string) {
  const base = (baseUrl || window.location.origin).replace(/\/+$/, "")
  return `${base}/rastreio/${code}`
}
