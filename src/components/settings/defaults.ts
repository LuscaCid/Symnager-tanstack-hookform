import type { Settings } from "@/@types/api"

/** Valores usados quando a API ainda não tem a chave salva. */
export const DEFAULT_SETTINGS: Settings = {
  company: { name: "", document: "", phone: "", email: "", address: "", city: "", state: "", zipcode: "", logo: "" },
  orders: { prefix: "OS", default_warranty_days: 90, terms: "", require_technician: false, public_url: "" },
  print: { layout: "A4", copies: 1, show_qrcode: true, show_prices: true },
}

export function withDefaults(settings?: Partial<Settings> | null): Settings {
  return {
    company: { ...DEFAULT_SETTINGS.company, ...(settings?.company ?? {}) },
    orders: { ...DEFAULT_SETTINGS.orders, ...(settings?.orders ?? {}) },
    print: { ...DEFAULT_SETTINGS.print, ...(settings?.print ?? {}) },
  }
}
