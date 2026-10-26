// Tipos espelhando docs/API_CONTRACT.md

export type Role = 'ADMIN' | 'TECNICO' | 'ATENDENTE'

export const ORDER_STATUSES = [
  'ABERTA',
  'EM_ANALISE',
  'AGUARDANDO_APROVACAO',
  'APROVADA',
  'AGUARDANDO_PECA',
  'EM_REPARO',
  'PRONTA',
  'ENTREGUE',
  'CANCELADA',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PRIORITIES = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'] as const
export type Priority = (typeof PRIORITIES)[number]

export const FAILURE_CATEGORIES = ['ENTREGA', 'GARANTIA', 'RETRABALHO', 'PECA', 'ATRASO', 'OUTRO'] as const
export type FailureCategory = (typeof FAILURE_CATEGORIES)[number]

export const LOOKUP_KINDS = ['DEVICE_TYPE', 'BRAND', 'PAYMENT_METHOD', 'FAILURE_REASON', 'ACCESSORY', 'CHECKLIST'] as const
export type LookupKind = (typeof LOOKUP_KINDS)[number]

export interface Paginated<T> {
  data: T[]
  meta: { page: number; page_size: number; total: number }
}

export interface ListParams {
  q?: string
  page?: number
  page_size?: number
  sort?: string
  order?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

export interface User {
  user_id: number
  name: string
  username: string
  email: string
  role: Role
  active: boolean
  phone: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

export interface Client {
  client_id: number
  type: 'PF' | 'PJ'
  name: string
  document: string | null
  email: string | null
  phone: string
  phone2: string | null
  zipcode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  _count?: { orders: number }
  stats?: { orders_total: number; orders_open: number; total_spent: number; last_order_at: string | null }
}

export type ClientInput = Partial<Omit<Client, 'client_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at' | '_count' | 'stats'>> & {
  name: string
  phone: string
}

export interface Tag {
  tag_id: number
  slug: string
}

export interface OrderItem {
  item_id: number
  order_id: number
  kind: 'SERVICE' | 'PRODUCT'
  service_id: number | null
  product_id: number | null
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface ItemInput {
  kind: 'SERVICE' | 'PRODUCT'
  service_id?: number
  product_id?: number
  description?: string
  quantity: number
  unit_price?: number
}

export interface Payment {
  payment_id: number
  order_id: number
  method: string
  amount: number
  paid_at: string
  notes: string | null
  user?: { user_id: number; name: string }
}

export interface OrderHistory {
  history_id: number
  order_id: number
  type: 'CREATED' | 'STATUS' | 'COMMENT' | 'ITEM' | 'PAYMENT' | 'FAILURE' | 'UPDATE' | 'PRINT' | 'SCHEDULE' | 'CERTIFICATE'
  from_status: string | null
  to_status: string | null
  message: string | null
  created_at: string
  user?: { user_id: number; name: string }
}

export interface DeliveryFailure {
  failure_id: number
  order_id: number
  order?: { order_id: number; number: number; device: string; owner: { name: string } }
  category: FailureCategory
  reason: string
  description: string | null
  occurred_at: string
  resolved: boolean
  resolved_at: string | null
  resolution: string | null
  technician_id: number | null
  user?: { user_id: number; name: string }
  created_at: string
}

/** Item do checklist de entrada (ok: true = conforme, false = problema, null = não verificado). */
export interface ChecklistEntry {
  item: string
  ok: boolean | null
  note?: string
}

export interface Order {
  order_id: number
  number: number
  tracking_code: string
  status: OrderStatus
  priority: Priority
  owner_id: number
  owner?: Pick<Client, 'client_id' | 'name' | 'phone' | 'email' | 'document'>
  technician_id: number | null
  technician?: { user_id: number; name: string } | null
  created_by_id: number
  created_by?: { user_id: number; name: string }
  device: string
  device_type: string | null
  brand: string | null
  model: string | null
  serial: string | null
  accessories: string | null
  condition: string | null
  device_password: string | null
  description: string
  diagnosis: string | null
  solution: string | null
  internal_notes: string | null
  checklist?: ChecklistEntry[] | null
  /** atendimento no local (ramos com visita) */
  service_address?: string | null
  scheduled_at?: string | null
  /** campos do ramo (btu, gas...) e da empresa (cf_...) */
  custom_fields?: CustomFieldValues
  arrived_at: string
  due_date: string | null
  finished_at: string | null
  delivered_at: string | null
  warranty_days: number
  warranty_until: string | null
  discount: number
  total_services: number
  total_products: number
  total: number
  paid: number
  tags: Tag[]
  created_at: string
  updated_at: string
  items?: OrderItem[]
  payments?: Payment[]
  history?: OrderHistory[]
  failures?: DeliveryFailure[]
}

export interface OrderInput {
  owner_id: number
  device: string
  description: string
  device_type?: string | null
  brand?: string | null
  model?: string | null
  serial?: string | null
  accessories?: string | null
  condition?: string | null
  device_password?: string | null
  priority?: Priority
  technician_id?: number | null
  due_date?: string | null
  warranty_days?: number
  tags?: string[]
  items?: ItemInput[]
  diagnosis?: string | null
  solution?: string | null
  internal_notes?: string | null
  discount?: number
  checklist?: ChecklistEntry[]
  service_address?: string | null
  scheduled_at?: string | null
  custom_fields?: CustomFieldValues | null
}

export type CustomFieldValues = Record<string, string | number | boolean | null>

export interface Service {
  service_id: number
  name: string
  description: string | null
  price: number
  estimated_minutes: number | null
  warranty_days: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  product_id: number
  sku: string | null
  name: string
  description: string | null
  unit: string
  cost_price: number
  sale_price: number
  stock: number
  min_stock: number
  supplier_id: number | null
  supplier?: { supplier_id: number; name: string } | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface StockMovement {
  movement_id: number
  product_id: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  reason: string | null
  order_id: number | null
  user?: { user_id: number; name: string }
  created_at: string
}

export interface Supplier {
  supplier_id: number
  name: string
  document: string | null
  email: string | null
  phone: string | null
  contact: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Lookup {
  lookup_id: number
  kind: LookupKind
  name: string
  active: boolean
  sort: number
}

export interface KeyCount {
  key: string
  count: number
}

export interface Dashboard {
  period: { from: string; to: string }
  kpis: {
    open: number
    overdue: number
    ready_waiting_pickup: number
    created: number
    delivered: number
    canceled: number
    revenue: number
    receivable: number
    avg_ticket: number
    avg_turnaround_hours: number
    failure_rate: number
    new_clients: number
  }
  by_status: { status: OrderStatus; count: number }[]
  orders_per_day: { date: string; created: number; delivered: number }[]
  revenue_per_day: { date: string; amount: number }[]
  top_devices: KeyCount[]
  top_brands: KeyCount[]
  top_services: { service_id: number; name: string; count: number; amount: number }[]
  technicians: { user_id: number; name: string; open: number; finished: number; revenue: number }[]
  low_stock: Product[]
  recent_orders: Order[]
}

export interface FailureStats {
  total: number
  open: number
  resolved: number
  rate: number
  by_category: KeyCount[]
  by_reason: KeyCount[]
  by_technician: { user_id: number; name: string; count: number; delivered: number }[]
  by_device_type: KeyCount[]
  by_brand: KeyCount[]
  timeline: { date: string; count: number }[]
  avg_resolution_hours: number
}

export interface CompanySettings {
  name: string
  document: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  zipcode: string
  logo: string
}

export interface Settings {
  company: CompanySettings
  /** public_url: endereço web onde /rastreio fica acessível aos clientes (vazio = QR mostra só o código) */
  orders: { prefix: string; default_warranty_days: number; terms: string; require_technician: boolean; public_url?: string }
  print: { layout: 'A4' | 'THERMAL'; copies: number; show_qrcode: boolean; show_prices: boolean }
  segment?: SegmentSettings
  certificates?: CertificateSettings
  /** somente leitura: perfil completo do ramo ativo */
  segment_profile?: SegmentProfile
  /** somente leitura: assinatura do produto enviada pela API (PUT recusa) */
  app?: { name: string; developer: string; version: string }
  /** somente leitura: situação da licença desta instalação */
  license?: LicenseStatus
}

/** Corpo do PUT /settings: merge parcial por seção (ramo: só campos adicionais e atendimento no local). */
export interface SettingsUpdate {
  company?: Partial<CompanySettings>
  orders?: Partial<Settings['orders']>
  print?: Partial<Settings['print']>
  segment?: Partial<Pick<SegmentSettings, 'custom_fields' | 'on_site'>>
  certificates?: Partial<CertificateSettings>
}

/** Situação da licença (GET /license, público). */
export type LicenseState =
  | 'ACTIVE' | 'OFFLINE' | 'UNLICENSED' | 'EXPIRED' | 'CLOCK_TAMPERED' | 'INVALID_TOKEN'
  | 'LICENSE_NOT_FOUND' | 'TENANT_PENDING' | 'TENANT_BLOCKED' | 'LICENSE_BLOCKED' | 'LICENSE_EXPIRED'
  | 'ACTIVATION_REVOKED' | 'ACTIVATION_LIMIT' | 'LICENSE_SERVER_UNREACHABLE'

/** Limites do plano contratado (null = ilimitado). */
export interface PlanLimits {
  cloud: boolean
  max_users: number | null
  max_orders_month: number | null
  storage_mb: number | null
  max_photos_per_order: number | null
  max_machines: number | null
  rate_per_minute: number | null
}

export interface LicenseStatus {
  valid: boolean
  status: LicenseState | string
  message: string | null
  key_masked: string | null
  tenant: { id: number; name: string; document: string | null } | null
  plan: string | null
  plan_name?: string | null
  limits?: PlanLimits | null
  license_expires_at: string | null
  offline_until: string | null
  activated_at: string | null
  last_check_at: string | null
  machine_name: string | null
  machine_id: string | null
  server_url: string | null
}

/** Corpo do 402 que a API devolve quando a licença não é válida. */
export interface LicenseRequiredError {
  code: 'LICENSE_REQUIRED'
  license_status: string
  message: string
}

/** Pedido de licença (POST /license/request; a API repassa ao servidor de licenças). */
export interface LicenseRequestInput {
  plan?: string
  company_name: string
  contact_name: string
  document?: string
  email: string
  phone: string
  message?: string
}

/** Pedido de troca de plano (POST /license/plan-request). */
export interface PlanChangeRequest {
  id: number
  status: string
  from_plan: string | null
  to_plan: string
  created_at: string
}

/** GET /cloud/usage (servidor em nuvem). */
export interface CloudUsage {
  plan: string
  plan_name: string
  limits: PlanLimits
  usage: { users: number; orders_month: number; storage_bytes: number }
}

/** Foto anexada à OS. */
export interface OrderPhoto {
  id: number
  order_id: number
  original_name: string
  mime: string
  size: number
  caption: string | null
  created_at: string
  user: { id: number; name: string } | null
}

export interface AuditLog {
  audit_id: number
  user?: { user_id: number; name: string } | null
  action: string
  entity: string
  entity_id: string | null
  ip: string | null
  meta: string | null
  created_at: string
}

export interface TrackInfo {
  number: number
  status: OrderStatus
  device: string
  arrived_at: string
  finished_at: string | null
  delivered_at: string | null
  scheduled_at?: string | null
  /** rótulo do campo "equipamento" no ramo da empresa */
  equipment_label?: string
  /** rótulo do status no ramo (null = padrão) */
  status_label?: string | null
  company: { name: string; phone: string }
}

export interface Health {
  status: string
  version: string
  db: string
  mode: string
  time: string
}

// ---------------------------------------------------------------- ramos de atuação

export const SEGMENT_IDS = ['CELULAR_INFORMATICA', 'AR_CONDICIONADO', 'ELETRODOMESTICOS', 'SERVICOS_GERAIS'] as const
export type SegmentId = (typeof SEGMENT_IDS)[number]

export type CertificateType = 'HIGIENIZACAO' | 'MANUTENCAO_PREVENTIVA'
export type FieldMode = 'required' | 'optional' | 'hidden'
export type OrderFieldKey =
  | 'device_type'
  | 'brand'
  | 'model'
  | 'serial'
  | 'accessories'
  | 'condition'
  | 'device_password'
  | 'checklist'
  | 'service_address'
  | 'scheduled_at'
export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'boolean'

/** Campo adicional da OS (do ramo ou da empresa). Valor em order.custom_fields[key]. */
export interface CustomFieldDef {
  key: string
  label: string
  type: CustomFieldType
  options?: string[]
  unit?: string
  show_on_reception?: boolean
  show_on_print?: boolean
  active?: boolean
}

export interface SegmentLabels {
  equipment: string
  equipment_plural: string
  device: string
  device_placeholder: string
  device_type: string
  brand: string
  model: string
  model_placeholder: string
  serial: string
  accessories: string
  condition: string
  condition_placeholder: string
  device_password: string
  description: string
  description_placeholder: string
  diagnosis: string
  solution: string
  checklist: string
  service_address: string
  scheduled_at: string
  business: string
  top_types: string
  turnaround: string
}

export interface CertificateTemplate {
  title: string
  checklist: string[]
  products_hint?: string
  measurements?: boolean
  months_setting: 'hygiene_months' | 'preventive_months'
  disclaimer?: boolean
}

export interface SegmentProfile {
  id: SegmentId
  name: string
  short_name: string
  description: string
  labels: SegmentLabels
  fields: Record<OrderFieldKey, FieldMode>
  status_labels: Partial<Record<OrderStatus, string>>
  lookup_labels: Partial<Record<LookupKind, string>>
  messages: { subject: string; status: Partial<Record<OrderStatus, string>>; scheduled: string }
  equipment_fields: CustomFieldDef[]
  features: { on_site: boolean; certificates: CertificateType[] }
  certificate_templates: Partial<Record<CertificateType, CertificateTemplate>>
  defaults: { warranty_days: number }
  seeds?: Record<string, string[]>
}

/** GET /segments (público). */
export interface SegmentSummary {
  id: SegmentId
  name: string
  short_name: string
  description: string
  features: SegmentProfile['features']
}

export interface SegmentPreview {
  from: SegmentId
  to: SegmentId
  add: Partial<Record<LookupKind, string[]>>
}

export interface SegmentSettings {
  id: SegmentId
  applied: SegmentId[]
  custom_fields: CustomFieldDef[]
  /** null = padrão do ramo */
  on_site: boolean | null
}

export interface CertificateSettings {
  prefix: string
  responsible_name: string
  responsible_registry: string
  hygiene_months: number
  preventive_months: number
  notes: string
  show_qrcode: boolean
}

// ---------------------------------------------------------------- certificados

export interface CertificateEquipment {
  device: string
  device_type?: string | null
  brand?: string | null
  model?: string | null
  serial?: string | null
  btu?: string | null
  gas?: string | null
  tensao?: string | null
  ambiente?: string | null
}

export interface CertificateProduct {
  name: string
  registry?: string | null
  batch?: string | null
}

export interface CertificateMeasurements {
  pressure_psi?: number | null
  current_a?: number | null
  voltage_v?: number | null
  supply_c?: number | null
  return_c?: number | null
}

export interface Certificate {
  id: number
  number: number
  code: string
  type: CertificateType
  title: string
  verification_code: string
  status: 'VALIDO' | 'CANCELADO'
  order_id: number
  order_number: number
  performed_at: string
  next_service_at: string | null
  technician_name: string
  technician_registry: string | null
  equipment: CertificateEquipment[]
  checklist: ChecklistEntry[]
  products: CertificateProduct[]
  measurements: CertificateMeasurements | null
  notes: string | null
  client: { name: string; document: string | null; phone: string | null; address: string | null }
  company: { name: string; document: string | null; phone: string | null; email: string | null; address: string | null }
  issued_by: { id: number; name: string } | null
  disclaimer: string | null
  canceled_at: string | null
  cancel_reason: string | null
  created_at: string
}

export interface CertificateInput {
  type: CertificateType
  performed_at?: string
  next_service_at?: string | null
  technician_name?: string
  technician_registry?: string
  equipment: CertificateEquipment[]
  checklist: ChecklistEntry[]
  products?: CertificateProduct[]
  measurements?: CertificateMeasurements
  notes?: string
}

/** GET /public/certificates/:code */
export interface PublicCertificate {
  number: number
  code: string
  type: CertificateType
  title: string
  status: 'VALIDO' | 'CANCELADO'
  performed_at: string
  next_service_at: string | null
  company: { name: string; phone: string }
  client_name: string
  equipment: { device: string; device_type?: string | null; btu?: string | null; ambiente?: string | null }[]
}
