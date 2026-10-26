import { z } from "zod"
import type { SegmentApi } from "@/lib/segment"
import { PRIORITIES, type OrderFieldKey } from "./api"

/** Cliente selecionado no formulário de nova OS. */
export interface UsersProperties {
  id : number
  name : string
  phone? : string
  document? : string | null
  /** endereço já formatado (preenche o local do atendimento) */
  address? : string | null
}

const moneyString = z
  .string()
  .trim()
  .refine((v) => !v || !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), "Valor inválido")

/** Valores dos campos adicionais no formulário (texto dos inputs ou sim/não). */
export const customFieldsFormSchema = z.record(z.string(), z.union([z.string(), z.boolean()]))
export type CustomFieldsForm = z.infer<typeof customFieldsFormSchema>

/**
 * Campos do equipamento/serviço comuns à recepção e aos detalhes da OS, com as
 * mensagens e obrigatoriedades do ramo da empresa.
 */
export function buildOrderFieldsSchema(segment : SegmentApi) {
  const L = segment.profile.labels
  const field = (key : OrderFieldKey) =>
    segment.show(key) && segment.required(key)
      ? z.string().trim().min(1, `Informe: ${(L[key as keyof typeof L] ?? key).toLowerCase()}`)
      : z.string()
  return z.object({
    device : z.string().trim().min(2, `Informe: ${L.device.toLowerCase()}`),
    device_type : field("device_type"),
    brand : field("brand"),
    model : field("model"),
    serial : field("serial"),
    accessories : field("accessories"),
    condition : field("condition"),
    device_password : field("device_password"),
    description : z.string().trim().min(3, `Descreva: ${L.description.toLowerCase()}`),
    service_address : field("service_address"),
    /** valor do input datetime-local (hora local) */
    scheduled_at : field("scheduled_at"),
    custom_fields : customFieldsFormSchema,
  })
}

export function buildNewJobSchema(segment : SegmentApi) {
  return buildOrderFieldsSchema(segment).extend({
    priority : z.enum(PRIORITIES),
    technician_id : z.string(),
    due_date : z.string(),
    price : moneyString,
    tag : z.string(),
  })
}

export type OrderFieldsForm = z.infer<ReturnType<typeof buildOrderFieldsSchema>>
export type NewJobFormSchemaType = z.infer<ReturnType<typeof buildNewJobSchema>>
