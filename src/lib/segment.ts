import { useQuery } from "@tanstack/react-query"
import type {
  CustomFieldDef,
  LookupKind,
  OrderFieldKey,
  OrderStatus,
  SegmentLabels,
  SegmentProfile,
  Settings,
} from "@/@types/api"
import { useAuth } from "@/contexts/Auth-context"
import { LOOKUP_LABEL, STATUS_LABEL } from "@/lib/format"
import { settingsService } from "@/services/resources"

/**
 * Perfil do ramo "Celulares e informática" com os textos de sempre. Vale enquanto
 * as configurações carregam ou quando a API é anterior aos ramos (sem segment_profile).
 * O catálogo completo fica na API (src/segments/segment-catalog.ts).
 */
export const FALLBACK_PROFILE: SegmentProfile = {
  id: "CELULAR_INFORMATICA",
  name: "Celulares e informática",
  short_name: "Celulares",
  description: "Assistência técnica de celulares, notebooks, computadores, tablets e consoles.",
  labels: {
    equipment: "aparelho",
    equipment_plural: "aparelhos",
    device: "Equipamento",
    device_placeholder: "ex.: Samsung Galaxy S20",
    device_type: "Tipo de equipamento",
    brand: "Marca",
    model: "Modelo",
    model_placeholder: "ex.: SM-G980F",
    serial: "Nº de série / IMEI",
    accessories: "Acessórios entregues",
    condition: "Estado físico na entrada",
    condition_placeholder: "riscos, trincas, amassados...",
    device_password: "Senha / padrão de desbloqueio",
    description: "Defeito relatado",
    description_placeholder: "Defeito relatado pelo cliente",
    diagnosis: "Diagnóstico técnico",
    solution: "Solução aplicada",
    checklist: "Checklist de entrada",
    service_address: "Local do atendimento",
    scheduled_at: "Visita agendada",
    business: "assistência técnica",
    top_types: "Top equipamentos",
    turnaround: "Tempo médio de reparo",
  },
  fields: {
    device_type: "optional",
    brand: "optional",
    model: "optional",
    serial: "optional",
    accessories: "optional",
    condition: "optional",
    device_password: "optional",
    checklist: "optional",
    service_address: "hidden",
    scheduled_at: "hidden",
  },
  status_labels: {},
  lookup_labels: { ...LOOKUP_LABEL },
  messages: {
    subject: "Seu {equipamento}",
    status: {
      ABERTA: "foi recebido e está na fila de atendimento",
      EM_ANALISE: "está em análise pela nossa equipe técnica",
      AGUARDANDO_APROVACAO: "já foi avaliado e o orçamento aguarda sua aprovação",
      APROVADA: "teve o orçamento aprovado e logo entra em reparo",
      AGUARDANDO_PECA: "está aguardando a chegada de uma peça",
      EM_REPARO: "está em reparo",
      PRONTA: "está pronto para retirada",
      ENTREGUE: "foi entregue. Obrigado pela confiança!",
      CANCELADA: "teve a ordem de serviço cancelada",
    },
    scheduled: "tem visita agendada para {data}",
  },
  equipment_fields: [],
  features: { on_site: false, certificates: [] },
  certificate_templates: {},
  defaults: { warranty_days: 90 },
}

/** Perfil ativo a partir das configurações (com reserva para APIs antigas). */
export function profileOf(settings?: Partial<Settings> | null): SegmentProfile {
  const p = settings?.segment_profile
  if (!p?.labels) return FALLBACK_PROFILE
  return {
    ...FALLBACK_PROFILE,
    ...p,
    labels: { ...FALLBACK_PROFILE.labels, ...p.labels },
    fields: { ...FALLBACK_PROFILE.fields, ...p.fields },
    messages: { ...FALLBACK_PROFILE.messages, ...p.messages },
  }
}

/** Troca {chave} pelos valores (chaves ausentes ficam vazias). */
export function fillTemplate(template: string, vars: Record<string, string | undefined | null>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "")
}

export const statusLabelOf = (profile: SegmentProfile, status: OrderStatus) =>
  profile.status_labels[status] ?? STATUS_LABEL[status] ?? status

/** Campos adicionais em uso: os do ramo + os ativos da empresa. */
export function customFieldsOf(profile: SegmentProfile, settings?: Partial<Settings> | null): CustomFieldDef[] {
  const company = (settings?.segment?.custom_fields ?? []).filter((f) => f.active !== false)
  return [...profile.equipment_fields, ...company]
}

/** Todas as definições conhecidas (inclui campos desativados, para rotular valores antigos). */
export function allFieldDefsOf(profile: SegmentProfile, settings?: Partial<Settings> | null): CustomFieldDef[] {
  return [...profile.equipment_fields, ...(settings?.segment?.custom_fields ?? [])]
}

/** Atendimento no local: escolha da empresa ou o padrão do ramo. */
export const onSiteOf = (profile: SegmentProfile, settings?: Partial<Settings> | null) =>
  settings?.segment?.on_site ?? profile.features.on_site

export interface SegmentApi {
  profile: SegmentProfile
  settings: Settings | undefined
  label: (key: keyof SegmentLabels) => string
  /** campo do formulário visível no ramo */
  show: (field: OrderFieldKey) => boolean
  required: (field: OrderFieldKey) => boolean
  statusLabel: (status: OrderStatus) => string
  lookupLabel: (kind: LookupKind) => string
  customFields: CustomFieldDef[]
  allFieldDefs: CustomFieldDef[]
  onSite: boolean
  certificateTypes: SegmentProfile["features"]["certificates"]
}

export function segmentApi(settings?: Settings): SegmentApi {
  const profile = profileOf(settings)
  const onSite = onSiteOf(profile, settings)
  return {
    profile,
    settings,
    label: (key) => profile.labels[key],
    show: (field) => {
      // local e agenda seguem a chave "atendimento no local" (padrão do ramo ou escolha da empresa)
      if (field === "service_address" || field === "scheduled_at") return onSite
      return profile.fields[field] !== "hidden"
    },
    required: (field) => profile.fields[field] === "required",
    statusLabel: (status) => statusLabelOf(profile, status),
    lookupLabel: (kind) => profile.lookup_labels[kind] ?? LOOKUP_LABEL[kind],
    customFields: customFieldsOf(profile, settings),
    allFieldDefs: allFieldDefsOf(profile, settings),
    onSite,
    certificateTypes: profile.features.certificates ?? [],
  }
}

/**
 * Rótulos, campos e recursos do ramo da empresa. Só consulta as configurações com
 * sessão aberta (telas públicas, como o rastreio, usam o perfil de reserva).
 */
export function useSegment(): SegmentApi {
  const authenticated = useAuth((c) => c.status === "authenticated")
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.get,
    staleTime: 5 * 60_000,
    enabled: authenticated,
  })
  return segmentApi(data)
}
