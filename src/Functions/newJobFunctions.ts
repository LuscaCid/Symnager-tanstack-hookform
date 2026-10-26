import { NewJobFormSchemaType, UsersProperties } from "@/@types/CreateJob"
import type { ChecklistEntry, OrderInput } from "@/@types/api"
import { orderFieldsToInput } from "@/lib/orderFields"
import type { SegmentApi } from "@/lib/segment"

/**
 * funcoes abaixo para geracao de objetos a partir de dados fornecidos atraves dos parametros
 */

/** "1.234,50" | "1234.5" -> 1234.5 */
export function parseMoney(value: string | undefined) {
  if (!value) return 0
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export function generateObjectToSend(
  data : NewJobFormSchemaType,
  userSelected : UsersProperties,
  segment : SegmentApi,
  checklist : ChecklistEntry[] = [],
): OrderInput {
  const price = parseMoney(data.price)
  const tags = (data.tag ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const fields = orderFieldsToInput(data, segment)
  if (fields.custom_fields && !Object.keys(fields.custom_fields).length) delete fields.custom_fields
  return {
    ...fields,
    owner_id : userSelected.id,
    device : data.device.trim(),
    description : data.description.trim(),
    priority : data.priority,
    technician_id : data.technician_id ? Number(data.technician_id) : null,
    due_date : data.due_date ? new Date(`${data.due_date}T18:00:00`).toISOString() : null,
    tags,
    // só envia quando algo foi verificado (campo opcional na API)
    ...(checklist.length > 0 && segment.show("checklist") ? { checklist } : {}),
    // o valor informado na entrada vira um item de serviço (orçamento inicial)
    items : price > 0 ? [{ kind: "SERVICE", description: "Orçamento inicial", quantity: 1, unit_price: price }] : [],
  }
}
