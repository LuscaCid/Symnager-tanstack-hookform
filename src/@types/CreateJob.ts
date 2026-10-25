import { z } from "zod"
import { PRIORITIES } from "./api"

/** Cliente selecionado no formulário de nova OS. */
export interface UsersProperties {
  id : number
  name : string
  phone? : string
  document? : string | null
}

const moneyString = z
  .string()
  .trim()
  .refine((v) => !v || !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), "Valor inválido")

export const NewJobFormSchema = z.object({
  device : z.string().trim().min(2, "Informe o equipamento"),
  device_type : z.string().optional(),
  brand : z.string().optional(),
  model : z.string().optional(),
  serial : z.string().optional(),
  accessories : z.string().optional(),
  condition : z.string().optional(),
  device_password : z.string().optional(),
  description : z.string().trim().min(3, "Descreva o defeito relatado"),
  priority : z.enum(PRIORITIES),
  technician_id : z.string().optional(),
  due_date : z.string().optional(),
  price : moneyString,
  tag : z.string().optional(),
})

export type NewJobFormSchemaType = z.infer<typeof NewJobFormSchema>
