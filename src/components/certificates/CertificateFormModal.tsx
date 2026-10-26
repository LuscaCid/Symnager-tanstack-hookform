import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Award, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type {
  CertificateEquipment,
  CertificateMeasurements,
  CertificateProduct,
  CertificateType,
  ChecklistEntry,
  Order,
} from "@/@types/api"
import { Button, IconButton, Modal, SelectField, TextAreaField, TextField } from "@/components/ui"
import { answeredOnly, ChecklistEditor } from "@/components/orders/ChecklistEditor"
import { DEFAULT_CERTIFICATE_SETTINGS } from "@/components/settings/CertificateSettings"
import { isoToDateInput } from "@/components/orders/orderUtils"
import { dateTimeLocalToIso, isoToDateTimeLocal } from "@/lib/orderFields"
import { useSegment } from "@/lib/segment"
import { certificatesService } from "@/services/resources"

const str = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v))

/** Primeira unidade preenchida com os dados da OS (inclusive BTUs, gás e ambiente). */
function equipmentFromOrder(order: Order): CertificateEquipment {
  const cf = order.custom_fields ?? {}
  return {
    device: order.device,
    device_type: order.device_type ?? "",
    brand: order.brand ?? "",
    model: order.model ?? "",
    serial: order.serial ?? "",
    btu: str(cf.btu),
    gas: str(cf.gas),
    tensao: str(cf.tensao),
    ambiente: str(cf.ambiente),
  }
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

const MEASUREMENTS: { key: keyof CertificateMeasurements; label: string }[] = [
  { key: "pressure_psi", label: "Pressão (psi)" },
  { key: "current_a", label: "Corrente (A)" },
  { key: "voltage_v", label: "Tensão (V)" },
  { key: "supply_c", label: "Insuflamento (°C)" },
  { key: "return_c", label: "Retorno (°C)" },
]

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null && v !== undefined)) as T

/** Emissão de certificado de higienização / relatório de manutenção preventiva. */
export function CertificateFormModal({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const segment = useSegment()
  const certSettings = { ...DEFAULT_CERTIFICATE_SETTINGS, ...(segment.settings?.certificates ?? {}) }
  const types = segment.certificateTypes
  const templates = segment.profile.certificate_templates
  const fieldDefs = segment.profile.equipment_fields

  const [type, setType] = useState<CertificateType>(types[0] ?? "HIGIENIZACAO")
  const [performedAt, setPerformedAt] = useState(isoToDateTimeLocal(new Date().toISOString()))
  const [nextAt, setNextAt] = useState("")
  const [nextTouched, setNextTouched] = useState(false)
  const [technician, setTechnician] = useState("")
  const [registry, setRegistry] = useState("")
  const [equipment, setEquipment] = useState<CertificateEquipment[]>([])
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([])
  const [products, setProducts] = useState<CertificateProduct[]>([])
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState("")

  const template = templates[type]

  // ao abrir: dados da OS e do responsável padrão
  useEffect(() => {
    if (!open) return
    setType(types[0] ?? "HIGIENIZACAO")
    setPerformedAt(isoToDateTimeLocal(new Date().toISOString()))
    setNextTouched(false)
    setTechnician(order.technician?.name ?? certSettings.responsible_name ?? "")
    setRegistry(certSettings.responsible_registry ?? "")
    setEquipment([equipmentFromOrder(order)])
    setChecklist([])
    setProducts([{ name: "" }])
    setMeasurements({})
    setNotes("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // itens do modelo já marcados como executados: o técnico desmarca o que não fez
  useEffect(() => {
    if (open) setChecklist((template?.checklist ?? []).map((item) => ({ item, ok: true })))
  }, [open, template])

  // próxima data sugerida pelos meses configurados, até o usuário mexer nela
  const months = template ? Number(certSettings[template.months_setting]) || 6 : 6
  useEffect(() => {
    if (nextTouched || !performedAt) return
    setNextAt(isoToDateInput(addMonths(new Date(performedAt), months).toISOString()))
  }, [performedAt, months, nextTouched])

  const issue = useMutation({
    mutationFn: () =>
      certificatesService.issue(order.order_id, {
        type,
        performed_at: dateTimeLocalToIso(performedAt) ?? undefined,
        next_service_at: nextAt ? new Date(`${nextAt}T12:00:00`).toISOString() : null,
        technician_name: technician.trim() || undefined,
        technician_registry: registry.trim() || undefined,
        equipment: equipment.filter((e) => e.device.trim()).map((e) => clean({ ...e, device: e.device.trim() })),
        checklist: answeredOnly(checklist),
        products: products.filter((p) => p.name.trim()).map((p) => clean({ ...p, name: p.name.trim() })),
        ...(template?.measurements
          ? {
              measurements: Object.fromEntries(
                Object.entries(measurements)
                  .map(([k, v]) => [k, Number(String(v).replace(",", "."))])
                  .filter(([, v]) => Number.isFinite(v as number) && String(v) !== ""),
              ),
            }
          : {}),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (cert) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] })
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
      toast.success(`${cert.code} emitido`, {
        description: cert.title,
        action: { label: "Imprimir", onClick: () => navigate(`/certificados/${cert.id}/imprimir`) },
        duration: 8000,
      })
      onOpenChange(false)
    },
  })

  const btuOptions = useMemo(() => fieldDefs.find((f) => f.key === "btu")?.options ?? [], [fieldDefs])
  const gasOptions = useMemo(() => fieldDefs.find((f) => f.key === "gas")?.options ?? [], [fieldDefs])

  function setUnit(i: number, patch: Partial<CertificateEquipment>) {
    setEquipment((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }
  function setProduct(i: number, patch: Partial<CertificateProduct>) {
    setProducts((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  const validUnits = equipment.filter((e) => e.device.trim()).length
  const sectionTitle = "text-xs font-medium uppercase tracking-wider text-faint"

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="Emitir certificado"
      description="O certificado fica registrado na OS e não pode ser editado depois: para corrigir, cancele e emita outro."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="primary" icon={Award} loading={issue.isPending} disabled={!validUnits} onClick={() => issue.mutate()}>
            Emitir certificado
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField label="Tipo" value={type} onChange={(e) => setType(e.target.value as CertificateType)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {templates[t]?.title ?? t}
              </option>
            ))}
          </SelectField>
          <TextField label="Data do serviço" type="datetime-local" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
          <TextField
            label="Próximo serviço"
            type="date"
            value={nextAt}
            hint={`Sugestão: ${months} ${months === 1 ? "mês" : "meses"} depois`}
            onChange={(e) => {
              setNextTouched(true)
              setNextAt(e.target.value)
            }}
          />
          <TextField label="Técnico responsável" value={technician} maxLength={120} onChange={(e) => setTechnician(e.target.value)} />
          <TextField label="Registro profissional" placeholder="CREA, CFT..." value={registry} maxLength={60} onChange={(e) => setRegistry(e.target.value)} />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className={sectionTitle}>Equipamentos atendidos</h3>
            <Button
              size="sm"
              icon={Plus}
              disabled={equipment.length >= 30}
              onClick={() => setEquipment((list) => [...list, { ...(list[0] ?? { device: "" }), serial: "", ambiente: "" }])}
            >
              Adicionar unidade
            </Button>
          </div>
          {equipment.map((e, i) => (
            <div key={i} className="rounded-lg border border-line p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <TextField
                label={segment.label("device")}
                wrapperClassName="col-span-2"
                value={e.device}
                onChange={(ev) => setUnit(i, { device: ev.target.value })}
              />
              <TextField label="Ambiente" value={e.ambiente ?? ""} onChange={(ev) => setUnit(i, { ambiente: ev.target.value })} />
              <div className="flex items-end justify-end">
                {equipment.length > 1 && <IconButton icon={Trash2} label="Remover unidade" tone="danger" onClick={() => setEquipment((l) => l.filter((_, idx) => idx !== i))} />}
              </div>
              <TextField label={segment.label("device_type")} value={e.device_type ?? ""} onChange={(ev) => setUnit(i, { device_type: ev.target.value })} />
              <TextField label={segment.label("brand")} value={e.brand ?? ""} onChange={(ev) => setUnit(i, { brand: ev.target.value })} />
              <TextField label={segment.label("model")} value={e.model ?? ""} onChange={(ev) => setUnit(i, { model: ev.target.value })} />
              <TextField label={segment.label("serial")} value={e.serial ?? ""} onChange={(ev) => setUnit(i, { serial: ev.target.value })} />
              {btuOptions.length > 0 ? (
                <SelectField label="Capacidade (BTUs)" value={e.btu ?? ""} onChange={(ev) => setUnit(i, { btu: ev.target.value })}>
                  <option value="">Não informado</option>
                  {btuOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <TextField label="Capacidade (BTUs)" value={e.btu ?? ""} onChange={(ev) => setUnit(i, { btu: ev.target.value })} />
              )}
              {gasOptions.length > 0 ? (
                <SelectField label="Gás refrigerante" value={e.gas ?? ""} onChange={(ev) => setUnit(i, { gas: ev.target.value })}>
                  <option value="">Não informado</option>
                  {gasOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <TextField label="Gás refrigerante" value={e.gas ?? ""} onChange={(ev) => setUnit(i, { gas: ev.target.value })} />
              )}
            </div>
          ))}
        </section>

        {template && (
          <section className="flex flex-col gap-2">
            <h3 className={sectionTitle}>Itens executados</h3>
            <div className="rounded-lg border border-line p-3">
              <ChecklistEditor value={checklist} onChange={setChecklist} items={template.checklist} />
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className={sectionTitle}>Produtos utilizados</h3>
            <Button size="sm" icon={Plus} disabled={products.length >= 30} onClick={() => setProducts((l) => [...l, { name: "" }])}>
              Adicionar produto
            </Button>
          </div>
          {products.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_9rem_8rem_auto] gap-2 items-end">
              <TextField
                label="Produto"
                placeholder={i === 0 ? template?.products_hint : undefined}
                value={p.name}
                onChange={(e) => setProduct(i, { name: e.target.value })}
              />
              <TextField label="Registro" placeholder="Anvisa/MS" value={p.registry ?? ""} onChange={(e) => setProduct(i, { registry: e.target.value })} />
              <TextField label="Lote" value={p.batch ?? ""} onChange={(e) => setProduct(i, { batch: e.target.value })} />
              <IconButton icon={Trash2} label="Remover produto" onClick={() => setProducts((l) => l.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </section>

        {template?.measurements && (
          <section className="flex flex-col gap-2">
            <h3 className={sectionTitle}>Medições</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MEASUREMENTS.map((m) => (
                <TextField
                  key={m.key}
                  label={m.label}
                  inputMode="decimal"
                  value={measurements[m.key] ?? ""}
                  onChange={(e) => setMeasurements((v) => ({ ...v, [m.key]: e.target.value }))}
                />
              ))}
            </div>
          </section>
        )}

        <TextAreaField label="Observações" className="min-h-16" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}
