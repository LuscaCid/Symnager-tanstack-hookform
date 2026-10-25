import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Save, Undo2 } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { PRIORITIES, type Order, type OrderInput } from "@/@types/api"
import { Button, Panel, SelectField, TextAreaField, TextField } from "@/components/ui"
import { useLookups, useTechnicians } from "@/lib/hooks"
import { PRIORITY_LABEL } from "@/lib/format"
import { ordersService } from "@/services/resources"
import { useCurrentUser } from "@/contexts/Auth-context"
import { dateInputToIso, isoToDateInput, parseDecimal } from "./orderUtils"
import { answeredOnly, ChecklistEditor } from "./ChecklistEditor"

const schema = z.object({
  device: z.string().trim().min(2, "Informe o equipamento"),
  device_type: z.string(),
  brand: z.string(),
  model: z.string(),
  serial: z.string(),
  accessories: z.string(),
  condition: z.string(),
  device_password: z.string(),
  description: z.string().trim().min(3, "Descreva o defeito relatado"),
  diagnosis: z.string(),
  solution: z.string(),
  internal_notes: z.string(),
  priority: z.enum(PRIORITIES),
  technician_id: z.string(),
  due_date: z.string(),
  warranty_days: z.string().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 3650), "Dias inválidos"),
  discount: z.string().refine((v) => parseDecimal(v) >= 0, "Desconto inválido"),
  tags: z.string(),
  checklist: z.array(z.object({ item: z.string(), ok: z.boolean().nullable(), note: z.string().optional() })),
})
type FormType = z.infer<typeof schema>

function toForm(o: Order): FormType {
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
    diagnosis: o.diagnosis ?? "",
    solution: o.solution ?? "",
    internal_notes: o.internal_notes ?? "",
    priority: o.priority,
    technician_id: o.technician_id ? String(o.technician_id) : "",
    due_date: isoToDateInput(o.due_date),
    warranty_days: String(o.warranty_days ?? 0),
    discount: o.discount ? String(o.discount).replace(".", ",") : "",
    tags: (o.tags ?? []).map((t) => t.slug).join(", "),
    checklist: o.checklist ?? [],
  }
}

const orNull = (v: string) => (v.trim() ? v.trim() : null)

function toInput(d: FormType): Partial<OrderInput> {
  return {
    device: d.device.trim(),
    device_type: orNull(d.device_type),
    brand: orNull(d.brand),
    model: orNull(d.model),
    serial: orNull(d.serial),
    accessories: orNull(d.accessories),
    condition: orNull(d.condition),
    device_password: orNull(d.device_password),
    description: d.description.trim(),
    diagnosis: orNull(d.diagnosis),
    solution: orNull(d.solution),
    internal_notes: orNull(d.internal_notes),
    priority: d.priority,
    technician_id: d.technician_id ? Number(d.technician_id) : null,
    due_date: dateInputToIso(d.due_date),
    warranty_days: Number(d.warranty_days || 0),
    discount: parseDecimal(d.discount),
    tags: d.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    // campo opcional: só enviado quando há itens verificados
    ...(answeredOnly(d.checklist).length > 0 ? { checklist: answeredOnly(d.checklist) } : {}),
  }
}

/** Campos que o técnico pode alterar (a API responde 403 para os demais). */
const TECH_FIELDS = ["diagnosis", "solution", "internal_notes", "serial", "condition"] as const

function technicianInput(input: Partial<OrderInput>): Partial<OrderInput> {
  return Object.fromEntries(TECH_FIELDS.map((k) => [k, input[k]])) as Partial<OrderInput>
}

/** Painel esquerdo da OS: dados do equipamento, laudo e planejamento. */
export function OrderDataForm({ order, readOnly }: { order: Order; readOnly?: boolean }) {
  const queryClient = useQueryClient()
  const isTechnician = useCurrentUser()?.role === "TECNICO"
  const technicians = useTechnicians()
  const deviceTypes = useLookups("DEVICE_TYPE")
  const brands = useLookups("BRAND")
  const accessories = useLookups("ACCESSORY")

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormType>({ resolver: zodResolver(schema), defaultValues: toForm(order) })

  // recarrega quando a OS muda no servidor (ex.: após adicionar item ou trocar status),
  // preservando o que o usuário está editando no momento
  useEffect(() => {
    reset(toForm(order), { keepDirtyValues: true })
  }, [order, reset])

  const mutation = useMutation({
    mutationFn: (data: Partial<OrderInput>) => ordersService.update(order.order_id, data),
    onSuccess: (saved) => {
      reset(toForm({ ...order, ...saved }))
      queryClient.setQueryData(["order", order.order_id], (old: Order | undefined) => (old ? { ...old, ...saved } : saved))
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["history"] })
      toast.success("OS atualizada.")
    },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((d) => mutation.mutate(isTechnician ? technicianInput(toInput(d)) : toInput(d)))}
      className="flex flex-col gap-2 p-2"
    >
      {isTechnician && !readOnly && (
        <p className="text-xs text-muted border border-line  rounded-md p-2">
          Como técnico, suas alterações salvas são: diagnóstico, solução, observações internas, nº de série e estado físico.
        </p>
      )}
      <fieldset disabled={readOnly} className="flex flex-col gap-2 min-w-0">
        <Panel title="Equipamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TextField label="Equipamento" wrapperClassName="sm:col-span-2" error={errors.device?.message} {...register("device")} />
            <SelectField label="Tipo" {...register("device_type")}>
              <option value="">—</option>
              {order.device_type && !deviceTypes.data?.some((d) => d.name === order.device_type) && (
                <option value={order.device_type}>{order.device_type}</option>
              )}
              {deviceTypes.data?.map((d) => (
                <option key={d.lookup_id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Marca" list="os-brands" {...register("brand")} />
            <datalist id="os-brands">
              {brands.data?.map((b) => <option key={b.lookup_id} value={b.name} />)}
            </datalist>
            <TextField label="Modelo" {...register("model")} />
            <TextField label="Nº de série / IMEI" {...register("serial")} />
            <TextField label="Acessórios" list="os-accessories" {...register("accessories")} />
            <datalist id="os-accessories">
              {accessories.data?.map((a) => <option key={a.lookup_id} value={a.name} />)}
            </datalist>
            <TextField
              label="Senha / padrão"
              autoComplete="off"
              hint={
                <span className="inline-flex items-center gap-1">
                  <KeyRound size={12} /> visível só para a equipe
                </span>
              }
              {...register("device_password")}
            />
            <TextAreaField label="Estado físico na entrada" wrapperClassName="sm:col-span-2" className="min-h-14" {...register("condition")} />
          </div>
        </Panel>

        <Panel title="Checklist de entrada">
          <Controller
            control={control}
            name="checklist"
            render={({ field }) => <ChecklistEditor value={field.value} onChange={field.onChange} disabled={readOnly} />}
          />
        </Panel>

        <Panel title="Laudo">
          <div className="flex flex-col gap-2">
            <TextAreaField label="Defeito relatado" error={errors.description?.message} {...register("description")} />
            <TextAreaField label="Diagnóstico técnico" placeholder="O que foi constatado" {...register("diagnosis")} />
            <TextAreaField label="Solução aplicada" placeholder="O que foi feito" {...register("solution")} />
            <TextAreaField
              label="Observações internas"
              hint="Não aparecem na impressão nem para o cliente"
              className="min-h-14"
              {...register("internal_notes")}
            />
          </div>
        </Panel>

        <Panel title="Planejamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SelectField label="Prioridade" {...register("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Técnico responsável" {...register("technician_id")}>
              <option value="">Sem técnico</option>
              {order.technician && !technicians.data?.some((t) => t.user_id === order.technician_id) && (
                <option value={order.technician.user_id}>{order.technician.name}</option>
              )}
              {technicians.data?.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Previsão de entrega" type="date" {...register("due_date")} />
            <TextField
              label="Garantia (dias)"
              type="number"
              min={0}
              inputMode="numeric"
              error={errors.warranty_days?.message}
              {...register("warranty_days")}
            />
            <TextField label="Desconto (R$)" inputMode="decimal" placeholder="0,00" error={errors.discount?.message} {...register("discount")} />
            <TextField label="Tags" placeholder="separe por vírgula" {...register("tags")} />
          </div>
        </Panel>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 flex gap-2 justify-end bg-app/90 backdrop-blur py-2 border-t border-line ">
          <Button icon={Undo2} disabled={!isDirty || mutation.isPending} onClick={() => reset(toForm(order))}>
            Descartar
          </Button>
          <Button type="submit" variant="success" icon={Save} loading={mutation.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      )}
    </form>
  )
}
