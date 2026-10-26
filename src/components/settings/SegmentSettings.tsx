import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftRight, Briefcase, Eye, EyeOff, ListPlus, ListRestart, Plus, Printer, Save, Store } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { CustomFieldDef, CustomFieldType, LookupKind, SegmentId, SegmentPreview } from "@/@types/api"
import { Button, Checkbox, ConfirmDialog, EmptyState, IconButton, Panel, SelectField, SkeletonForm, TextField } from "@/components/ui"
import { cn } from "@/lib/cn"
import { LOOKUP_LABEL } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { useSegment } from "@/lib/segment"
import { getErrorMessage } from "@/service/api"
import { segmentsService } from "@/services/resources"
import { useSaveSettings } from "./useSaveSettings"

const MAX_FIELDS = 6

const TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Lista de opções",
  date: "Data",
  boolean: "Sim / não",
}

/** "Voltagem do quadro" → "cf_voltagem_do_quadro" (único entre os existentes). */
function fieldKey(label: string, taken: Set<string>) {
  const base =
    "cf_" +
    (label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "campo")
  let key = base
  for (let i = 2; taken.has(key); i++) key = `${base.slice(0, 26)}_${i}`
  return key
}

type Draft = CustomFieldDef & { optionsText: string; isNew?: boolean }

const toDraft = (f: CustomFieldDef): Draft => ({ ...f, active: f.active !== false, optionsText: (f.options ?? []).join(", ") })

/** Troca de ramo: prévia do que entra nas listas, opção de apagar os itens atuais e confirmação. */
function SegmentPicker() {
  const queryClient = useQueryClient()
  const segment = useSegment()
  const current = segment.profile.id
  const list = useQuery({ queryKey: ["segments"], queryFn: segmentsService.list, staleTime: Infinity })
  const [target, setTarget] = useState<SegmentId | null>(null)
  const [preview, setPreview] = useState<SegmentPreview | null>(null)
  const [replace, setReplace] = useState(false)

  const loadPreview = useMutation({
    mutationFn: (id: SegmentId) => segmentsService.preview(id),
    onSuccess: setPreview,
    onError: (err) => {
      setTarget(null)
      toast.error(getErrorMessage(err))
    },
  })

  const apply = useMutation({
    mutationFn: (id: SegmentId) => segmentsService.apply(id, replace),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      queryClient.invalidateQueries({ queryKey: ["lookups"] })
      const name = list.data?.find((s) => s.id === res.to)?.name ?? res.to
      toast.success(res.from === res.to ? "Listas do ramo atualizadas." : `Ramo alterado para ${name}.`, {
        description: res.removed
          ? `${res.removed} item(ns) antigo(s) apagado(s) e ${res.added} do novo ramo adicionado(s).`
          : res.added
            ? `${res.added} item(ns) adicionado(s) aos cadastros auxiliares.`
            : "As listas já tinham tudo o que o ramo precisa.",
      })
      setTarget(null)
      setPreview(null)
    },
  })

  function choose(id: SegmentId, clean = false) {
    setTarget(id)
    setPreview(null)
    setReplace(clean)
    loadPreview.mutate(id)
  }

  const additions = Object.entries(preview?.add ?? {}) as [LookupKind, string[]][]
  const replacements = Object.entries(preview?.replace_with ?? {}) as [LookupKind, string[]][]
  const removals = Object.entries(preview?.remove ?? {}) as [LookupKind, number][]
  const removeTotal = removals.reduce((n, [, count]) => n + count, 0)
  // API anterior a esta opção: não manda o que seria apagado
  const canReplace = !!preview?.replace_with
  const targetName = list.data?.find((s) => s.id === target)?.name

  return (
    <Panel title="Ramo de atuação" icon={Briefcase}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-accent-soft px-3 py-2.5">
          <p className="text-sm font-semibold text-accent">{segment.profile.name}</p>
          <p className="text-[13px] text-muted">{segment.profile.description}</p>
          <Button
            size="sm"
            variant="ghost"
            icon={ListRestart}
            className="mt-1.5 -ml-2"
            loading={loadPreview.isPending && target === current}
            onClick={() => choose(current, true)}
          >
            Deixar só as listas deste ramo
          </Button>
        </div>
        <p className="text-[13px] text-muted">
          O ramo define os nomes e os campos da OS, as mensagens ao cliente e as listas iniciais (tipos, marcas, checklist). Ao trocar,
          você escolhe se mantém os itens atuais das listas junto com os do novo ramo ou se apaga os atuais e fica só com os novos.
        </p>
        {list.isLoading ? (
          <SkeletonForm fields={2} columns={2} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(list.data ?? [])
              .filter((s) => s.id !== current)
              .map((s) => (
                <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-faint mt-0.5">{s.description}</p>
                  </div>
                  <Button
                    size="sm"
                    icon={ArrowLeftRight}
                    className="self-start"
                    loading={loadPreview.isPending && target === s.id}
                    onClick={() => choose(s.id)}
                  >
                    Trocar para este ramo
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!target && !!preview}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null)
            setPreview(null)
          }
        }}
        tone={replace ? "danger" : "default"}
        title={target === current ? "Recarregar as listas deste ramo?" : `Trocar para ${targetName ?? "o novo ramo"}?`}
        confirmLabel={target === current ? (replace ? "Apagar e recarregar" : "Completar listas") : replace ? "Apagar e trocar ramo" : "Trocar ramo"}
        loading={apply.isPending}
        onConfirm={() => {
          if (target) apply.mutate(target)
        }}
        description={
          <span className="flex flex-col gap-2 mt-1">
            {canReplace && (
              <span className="block rounded-lg border border-line p-2.5">
                <Checkbox
                  label="Apagar os itens atuais das listas e ficar só com os do novo ramo"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                />
                <span className="block text-xs text-faint mt-1 pl-6">
                  Tipos de equipamento, marcas, acessórios, checklist e motivos de falha
                  {removeTotal > 0 ? ` (${removeTotal} item(ns) hoje)` : ""}. Formas de pagamento são mantidas. As OS já criadas não mudam.
                </span>
              </span>
            )}
            {replace ? (
              <>
                <span>Os itens atuais serão apagados e as listas ficarão assim:</span>
                {replacements.map(([kind, names]) => (
                  <span key={kind} className="block text-[13px]">
                    <strong className="font-medium text-fg">{LOOKUP_LABEL[kind] ?? kind}:</strong> {names.length ? names.join(", ") : "nenhum item"}
                  </span>
                ))}
                <span className="text-danger text-[13px]">Os itens apagados não podem ser recuperados (exceto por um backup).</span>
              </>
            ) : additions.length ? (
              <>
                <span>Estes itens serão adicionados aos cadastros auxiliares:</span>
                {additions.map(([kind, names]) => (
                  <span key={kind} className="block text-[13px]">
                    <strong className="font-medium text-fg">{LOOKUP_LABEL[kind] ?? kind}:</strong> {names.length ? names.join(", ") : "nenhum item"}
                  </span>
                ))}
                <span className="text-faint">Nada será removido. Itens que você não usar podem ser desativados em Cadastros auxiliares.</span>
              </>
            ) : (
              <span>As listas já têm todos os itens deste ramo.</span>
            )}
          </span>
        }
      />
    </Panel>
  )
}

/** Atendimento no endereço do cliente: padrão do ramo ou escolha da empresa. */
function OnSiteSetting() {
  const { data } = useSettings()
  const segment = useSegment()
  const save = useSaveSettings("Atendimento no local atualizado.")
  const value = data?.segment?.on_site ?? null
  const options: { key: "default" | "on" | "off"; label: string; v: boolean | null }[] = [
    { key: "default", label: `Padrão do ramo (${segment.profile.features.on_site ? "ligado" : "desligado"})`, v: null },
    { key: "on", label: "Ligado", v: true },
    { key: "off", label: "Desligado", v: false },
  ]
  return (
    <Panel title="Atendimento no local" icon={Store}>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">
          Mostra na OS o local do atendimento (preenchido com o endereço do cliente) e a data/hora da visita, no quadro, na impressão e na
          mensagem ao cliente.
        </p>
        <div role="group" aria-label="Atendimento no local" className="flex flex-wrap gap-0.5 p-0.5 rounded-lg bg-subtle w-fit">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={value === o.v}
              disabled={save.isPending}
              onClick={() => value !== o.v && save.mutate({ segment: { on_site: o.v } })}
              className={cn(
                "h-8 px-3 rounded-md text-[13px] transition-colors duration-100",
                value === o.v ? "bg-surface text-fg shadow-sm font-medium" : "text-muted hover:text-fg",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}

/** Até 6 campos adicionais da empresa; a chave nunca muda e campos usados são desativados, não excluídos. */
function CustomFieldsSettings() {
  const { data, isLoading } = useSettings()
  const segment = useSegment()
  const save = useSaveSettings("Campos adicionais salvos.")
  const saved = data?.segment?.custom_fields ?? []
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDrafts(saved.map(toDraft))
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.segment?.custom_fields])

  function update(i: number, patch: Partial<Draft>) {
    setDrafts((list) => list.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
    setDirty(true)
  }

  function add() {
    setDrafts((list) => [
      ...list,
      { key: "", label: "", type: "text", optionsText: "", show_on_reception: true, show_on_print: true, active: true, isNew: true },
    ])
    setDirty(true)
  }

  function submit() {
    const taken = new Set(drafts.filter((d) => !d.isNew).map((d) => d.key))
    const fields: CustomFieldDef[] = []
    for (const d of drafts) {
      const label = d.label.trim()
      if (!label) {
        if (d.isNew) continue
        toast.error("Todo campo precisa de um nome.")
        return
      }
      const options = d.optionsText
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
      if (d.type === "select" && !options.length) {
        toast.error(`Informe as opções do campo "${label}", separadas por vírgula.`)
        return
      }
      const key = d.isNew ? fieldKey(label, taken) : d.key
      taken.add(key)
      fields.push({
        key,
        label,
        type: d.type,
        ...(d.type === "select" ? { options } : {}),
        ...(d.unit?.trim() ? { unit: d.unit.trim() } : {}),
        show_on_reception: d.show_on_reception !== false,
        show_on_print: d.show_on_print !== false,
        active: d.active !== false,
      })
    }
    save.mutate({ segment: { custom_fields: fields } })
  }

  if (isLoading) return <SkeletonForm fields={3} columns={2} />
  const used = drafts.length

  return (
    <Panel
      title="Campos adicionais da OS"
      icon={ListPlus}
      actions={
        <Button size="sm" icon={Plus} onClick={add} disabled={used >= MAX_FIELDS} tooltip={used >= MAX_FIELDS ? "Limite de 6 campos" : undefined}>
          Novo campo
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {segment.profile.equipment_fields.length > 0 && (
          <p className="text-[13px] text-muted">
            O ramo já inclui: {segment.profile.equipment_fields.map((f) => f.label).join(", ")}.
          </p>
        )}
        {drafts.length === 0 ? (
          <EmptyState icon={ListPlus} title="Nenhum campo adicional" description="Crie até 6 campos próprios, como voltagem, andar ou nº do contrato." />
        ) : (
          drafts.map((d, i) => (
            <div key={d.key || `novo-${i}`} className={cn("rounded-lg border border-line p-3 flex flex-col gap-2", d.active === false && "opacity-60")}>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem_7rem] gap-2">
                <TextField label="Nome do campo" value={d.label} maxLength={40} onChange={(e) => update(i, { label: e.target.value })} />
                <SelectField
                  label="Tipo"
                  value={d.type}
                  disabled={!d.isNew}
                  hint={!d.isNew ? "não muda depois de salvo" : undefined}
                  onChange={(e) => update(i, { type: e.target.value as CustomFieldType })}
                >
                  {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Unidade" placeholder="ex.: V, m²" value={d.unit ?? ""} maxLength={15} onChange={(e) => update(i, { unit: e.target.value })} />
              </div>
              {d.type === "select" && (
                <TextField
                  label="Opções"
                  placeholder="separe por vírgula"
                  value={d.optionsText}
                  onChange={(e) => update(i, { optionsText: e.target.value })}
                />
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Checkbox
                  label="Mostrar na recepção"
                  checked={d.show_on_reception !== false}
                  onChange={(e) => update(i, { show_on_reception: e.target.checked })}
                />
                <Checkbox
                  label="Imprimir no comprovante"
                  checked={d.show_on_print !== false}
                  onChange={(e) => update(i, { show_on_print: e.target.checked })}
                />
                <span className="ml-auto flex items-center gap-1">
                  {d.isNew ? (
                    <Button size="sm" variant="ghost" onClick={() => setDrafts((list) => list.filter((_, idx) => idx !== i))}>
                      Descartar
                    </Button>
                  ) : (
                    <IconButton
                      icon={d.active === false ? Eye : EyeOff}
                      label={d.active === false ? "Reativar campo" : "Desativar campo (os valores já preenchidos são mantidos)"}
                      onClick={() => update(i, { active: d.active === false })}
                    />
                  )}
                </span>
              </div>
              {d.active === false && <p className="text-xs text-faint">Desativado: não aparece nas novas OS; valores antigos continuam visíveis.</p>}
            </div>
          ))
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-faint inline-flex items-center gap-1">
            <Printer size={12} /> {used} de {MAX_FIELDS} campos
          </span>
          <Button icon={Save} onClick={submit} loading={save.isPending} disabled={!dirty}>
            Salvar campos
          </Button>
        </div>
      </div>
    </Panel>
  )
}

export function SegmentSettings() {
  return (
    <div className="flex flex-col gap-4">
      <SegmentPicker />
      <OnSiteSetting />
      <CustomFieldsSettings />
    </div>
  )
}
