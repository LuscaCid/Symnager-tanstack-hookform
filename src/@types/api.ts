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
  type: 'CREATED' | 'STATUS' | 'COMMENT' | 'ITEM' | 'PAYMENT' | 'FAILURE' | 'UPDATE' | 'PRINT'
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
}

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
  company: { name: string; phone: string }
}

export interface Health {
  status: string
  version: string
  db: string
  mode: string
  time: string
}
