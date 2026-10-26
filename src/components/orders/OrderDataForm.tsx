import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Save, Undo2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { PRIORITIES, type Order, type OrderInput } from "@/@types/api"
import { buildOrderFieldsSchema } from "@/@types/CreateJob"
import { Button, ComboboxField, Panel, SelectField, TextAreaField, TextField } from "@/components/ui"
import { useLookups, useTechnicians } from "@/lib/hooks"
import { PRIORITY_LABEL } from "@/lib/format"
import { clientAddress, orderFieldsFromOrder, orderFieldsToInput } from "@/lib/orderFields"
import { type SegmentApi, useSegment } from "@/lib/segment"
import { clientsService, ordersService } from "@/services/resources"
import { useCurrentUser } from "@/contexts/Auth-context"
import { dateInputToIso, isoToDateInput, parseDecimal } from "./orderUtils"
import { answeredOnly, ChecklistEditor } from "./ChecklistEditor"
import { CustomFieldsEditor } from "./CustomFieldsEditor"
import { ServiceLocationFields } from "./ServiceLocationFields"

function buildSchema(segment: SegmentApi) {
  return buildOrderFieldsSchema(segment).extend({
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
}
type FormType = z.infer<ReturnType<typeof buildSchema>>

function toForm(o: Order): FormType {
  return {
    ...orderFieldsFromOrder(o),
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

function toInput(d: FormType, segment: SegmentApi, order: Order): Partial<OrderInput> {
  return {
    ...orderFieldsToInput(d, segment, order),
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
const TECH_FIELDS = ["diagnosis", "solution", "internal_notes", "serial", "condition", "checklist", "custom_fields"] as const

function technicianInput(input: Partial<OrderInput>): Partial<OrderInput> {
  return Object.fromEntries(TECH_FIELDS.filter((k) => input[k] !== undefined).map((k) => [k, input[k]])) as Partial<OrderInput>
}

/** Painel esquerdo da OS: dados do equipamento/serviço, laudo e planejamento. */
export function OrderDataForm({ order, readOnly }: { order: Order; readOnly?: boolean }) {
  const queryClient = useQueryClient()
  const isTechnician = useCurrentUser()?.role === "TECNICO"
  const segment = useSegment()
  const L = segment.profile.labels
  const technicians = useTechnicians()
  const deviceTypes = useLookups("DEVICE_TYPE")
  const brands = useLookups("BRAND")
  const accessories = useLookups("ACCESSORY")
  const schema = useMemo(() => buildSchema(segment), [segment.profile, segment.onSite]) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormType>({ resolver: zodResolver(schema), defaultValues: toForm(order) })
  const address = useWatch({ control, name: "service_address" }) ?? ""

  const client = useQuery({
    queryKey: ["client", order.owner_id],
    queryFn: () => clientsService.get(order.owner_id),
    enabled: segment.onSite && !readOnly,
    staleTime: 60_000,
  })
  const ownerAddress = clientAddress(client.data)

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

  const techSaved = [L.diagnosis, L.solution, "observações internas", segment.show("serial") && L.serial, segment.show("condition") && L.condition]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())

  return (
    <form
      noValidate
      onSubmit={handleSubmit((d) => {
        const input = toInput(d, segment, order)
        mutation.mutate(isTechnician ? technicianInput(input) : input)
      })}
      className="flex flex-col gap-2 p-2"
    >
      {isTechnician && !readOnly && (
        <p className="text-xs text-muted border border-line  rounded-md p-2">
          Como técnico, suas alterações salvas são: {techSaved.join(", ")}, checklist e campos adicionais.
        </p>
      )}
      <fieldset disabled={readOnly} className="flex flex-col gap-2 min-w-0">
        <Panel title={L.device}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <TextField label={L.device} wrapperClassName="sm:col-span-2" error={errors.device?.message} {...register("device")} />
              {segment.show("device_type") && (
                <SelectField label={L.device_type} error={errors.device_type?.message} {...register("device_type")}>
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
              )}
              {segment.show("brand") && (
                <ComboboxField
                  label={L.brand}
                  options={(brands.data ?? []).map((b) => b.name)}
                  disabled={readOnly}
                  error={errors.brand?.message}
                  {...register("brand")}
                />
              )}
              {segment.show("model") && <TextField label={L.model} error={errors.model?.message} {...register("model")} />}
              {segment.show("serial") && <TextField label={L.serial} error={errors.serial?.message} {...register("serial")} />}
              {segment.show("accessories") && (
                <ComboboxField
                  label={L.accessories}
                  placeholder="Nenhum"
                  multiple
                  options={(accessories.data ?? []).map((a) => a.name)}
                  disabled={readOnly}
                  {...register("accessories")}
                />
              )}
              {segment.show("device_password") && (
                <TextField
                  label={L.device_password}
                  autoComplete="off"
                  hint={
                    <span className="inline-flex items-center gap-1">
                      <KeyRound size={12} /> visível só para a equipe
                    </span>
                  }
                  {...register("device_password")}
                />
              )}
              {segment.show("condition") && (
                <TextAreaField
                  label={L.condition}
                  placeholder={L.condition_placeholder}
                  wrapperClassName="sm:col-span-2"
                  className="min-h-14"
                  {...register("condition")}
                />
              )}
            </div>
            <CustomFieldsEditor
              fields={segment.customFields}
              register={register}
              saved={order.custom_fields}
              allDefs={segment.allFieldDefs}
              disabled={readOnly}
            />
          </div>
        </Panel>

        {segment.onSite && (
          <Panel title={L.service_address}>
            <ServiceLocationFields
              register={register}
              labels={L}
              address={address}
              clientAddress={ownerAddress}
              onUseClientAddress={() => setValue("service_address", ownerAddress, { shouldDirty: true })}
              disabled={readOnly}
            />
          </Panel>
        )}

        {segment.show("checklist") && (
          <Panel title={L.checklist}>
            <Controller
              control={control}
              name="checklist"
              render={({ field }) => <ChecklistEditor value={field.value} onChange={field.onChange} disabled={readOnly} />}
            />
          </Panel>
        )}

        <Panel title="Laudo">
          <div className="flex flex-col gap-2">
            <TextAreaField label={L.description} error={errors.description?.message} {...register("description")} />
            <TextAreaField label={L.diagnosis} placeholder="O que foi constatado" {...register("diagnosis")} />
            <TextAreaField label={L.solution} placeholder="O que foi feito" {...register("solution")} />
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
