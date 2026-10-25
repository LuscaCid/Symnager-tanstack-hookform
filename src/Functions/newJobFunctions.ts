import { NewJobFormSchemaType, UsersProperties } from "@/@types/CreateJob"
import type { OrderInput } from "@/@types/api"

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

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

export function generateObjectToSend(data : NewJobFormSchemaType, userSelected : UsersProperties): OrderInput {
  const price = parseMoney(data.price)
  const tags = (data.tag ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  return {
    owner_id : userSelected.id,
    device : data.device.trim(),
    description : data.description.trim(),
    device_type : orNull(data.device_type),
    brand : orNull(data.brand),
    model : orNull(data.model),
    serial : orNull(data.serial),
    accessories : orNull(data.accessories),
    condition : orNull(data.condition),
    device_password : orNull(data.device_password),
    priority : data.priority,
    technician_id : data.technician_id ? Number(data.technician_id) : null,
    due_date : data.due_date ? new Date(`${data.due_date}T18:00:00`).toISOString() : null,
    tags,
    // o "valor do conserto" informado na entrada vira um item de serviço (orçamento inicial)
    items : price > 0 ? [{ kind: "SERVICE", description: "Orçamento inicial", quantity: 1, unit_price: price }] : [],
  }
}
