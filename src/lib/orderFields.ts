import type { CustomFieldsForm, OrderFieldsForm } from "@/@types/CreateJob"
import type { Client, CustomFieldDef, CustomFieldValues, Order, OrderInput } from "@/@types/api"
import type { SegmentApi } from "@/lib/segment"
import { formatZipcode } from "@/lib/format"

const orNull = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null)

export const EMPTY_ORDER_FIELDS: OrderFieldsForm = {
  device: "",
  device_type: "",
  brand: "",
  model: "",
  serial: "",
  accessories: "",
  condition: "",
  device_password: "",
  description: "",
  service_address: "",
  scheduled_at: "",
  custom_fields: {},
}

/** ISO → valor de <input type="datetime-local"> (hora local). */
export function isoToDateTimeLocal(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valor de datetime-local (hora local) → ISO com fuso; vazio → null. */
export function dateTimeLocalToIso(value: string | undefined | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Valores gravados → inputs do formulário. */
export function customFieldsToForm(values: CustomFieldValues | null | undefined): CustomFieldsForm {
  const out: CustomFieldsForm = {}
  for (const [k, v] of Object.entries(values ?? {})) {
    if (v === null || v === undefined) continue
    out[k] = typeof v === "boolean" ? v : String(v)
  }
  return out
}

/**
 * Inputs → valores para a API. Converte números, descarta vazios e preserva valores
 * de campos que não estão mais em uso (desativados), para nada se perder ao salvar.
 */
export function customFieldsToInput(form: CustomFieldsForm, defs: CustomFieldDef[], previous?: CustomFieldValues | null) {
  const out: CustomFieldValues = {}
  const known = new Set(defs.map((d) => d.key))
  for (const [k, v] of Object.entries(previous ?? {})) if (!known.has(k) && v !== null && v !== "") out[k] = v
  for (const def of defs) {
    const raw = form[def.key]
    if (raw === undefined || raw === "") continue
    if (def.type === "boolean") {
      out[def.key] = raw === true || raw === "true"
    } else if (def.type === "number") {
      const n = Number(String(raw).replace(",", "."))
      if (Number.isFinite(n)) out[def.key] = n
    } else {
      out[def.key] = String(raw).trim().slice(0, 200)
    }
  }
  return out
}

/** Texto do valor para leitura/impressão. */
export function formatCustomValue(value: CustomFieldValues[string], def?: CustomFieldDef) {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (def?.type === "date") {
    const d = new Date(`${value}T12:00:00`)
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR")
  }
  return def?.unit ? `${value} ${def.unit}` : String(value)
}

/** Linhas [rótulo, valor] dos campos adicionais preenchidos (opcionalmente só os marcados para impressão). */
export function customFieldLines(order: Pick<Order, "custom_fields">, defs: CustomFieldDef[], onlyPrint = false) {
  const values = order.custom_fields ?? {}
  const lines: [string, string][] = []
  for (const def of defs) {
    if (onlyPrint && def.show_on_print === false) continue
    const text = formatCustomValue(values[def.key], def)
    if (text) lines.push([def.label, text])
  }
  return lines
}

/** Endereço do cliente em uma linha (preenche o local do atendimento). */
export function clientAddress(c: Partial<Pick<Client, "street" | "number" | "complement" | "district" | "city" | "state" | "zipcode">> | null | undefined) {
  if (!c) return ""
  const street = [c.street, c.number].filter(Boolean).join(", ")
  const first = [street, c.complement].filter(Boolean).join(" – ")
  const city = [c.city, c.state].filter(Boolean).join("/")
  return [first, c.district, city, c.zipcode ? `CEP ${formatZipcode(c.zipcode)}` : ""].filter(Boolean).join(", ")
}

export function orderFieldsFromOrder(o: Order): OrderFieldsForm {
  return {
    device: o.device,
    device_type: o.device_type ?? "",
    brand: o.brand ?? "",
    model: o.model ?? "",
    serial: o.serial ?? "",
    accessories: o.accessories ?? "",
    condition: o.condition ?? "",
    device_password: o.device_password ?? "",
    description: o.description,
    service_address: o.service_address ?? "",
    scheduled_at: isoToDateTimeLocal(o.scheduled_at),
    custom_fields: customFieldsToForm(o.custom_fields),
  }
}

/**
 * Campos do formulário → corpo da API. Campos escondidos no ramo não são enviados,
 * para não apagar dados que já existam na OS.
 */
export function orderFieldsToInput(d: OrderFieldsForm, segment: SegmentApi, previous?: Order): Partial<OrderInput> {
  const out: Partial<OrderInput> = {
    device: d.device.trim(),
    description: d.description.trim(),
  }
  const optional = ["device_type", "brand", "model", "serial", "accessories", "condition", "device_password"] as const
  for (const key of optional) if (segment.show(key)) out[key] = orNull(d[key])
  if (segment.show("service_address")) out.service_address = orNull(d.service_address)
  if (segment.show("scheduled_at")) out.scheduled_at = dateTimeLocalToIso(d.scheduled_at)
  if (segment.customFields.length || Object.keys(previous?.custom_fields ?? {}).length) {
    out.custom_fields = customFieldsToInput(d.custom_fields, segment.customFields, previous?.custom_fields)
  }
  return out
}
