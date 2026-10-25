import { api } from "@/service/api"
import type {
  AuditLog,
  AuthResponse,
  Client,
  ClientInput,
  Dashboard,
  DeliveryFailure,
  FailureCategory,
  FailureStats,
  Health,
  ItemInput,
  ListParams,
  Lookup,
  LookupKind,
  Order,
  OrderHistory,
  OrderInput,
  OrderItem,
  OrderStatus,
  Paginated,
  Payment,
  Product,
  Role,
  Service,
  Settings,
  StockMovement,
  Supplier,
  TrackInfo,
  User,
} from "@/@types/api"

/** Remove chaves vazias para não poluir a query string. */
function clean(params?: ListParams) {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null))
}

/** CRUD padrão para recursos REST do contrato. */
function crud<T, TInput = Partial<T>>(path: string) {
  return {
    list: (params?: ListParams) => api.get<Paginated<T>>(path, { params: clean(params) }).then((r) => r.data),
    get: (id: number) => api.get<T>(`${path}/${id}`).then((r) => r.data),
    create: (data: TInput) => api.post<T>(path, data).then((r) => r.data),
    update: (id: number, data: Partial<TInput>) => api.put<T>(`${path}/${id}`, data).then((r) => r.data),
    remove: (id: number) => api.delete(`${path}/${id}`).then((r) => r.data),
  }
}

export const healthService = {
  check: () => api.get<Health>("/health", { timeout: 5000 }).then((r) => r.data),
}

export const authService = {
  status: () => api.get<{ needs_setup: boolean }>("/auth/status").then((r) => r.data),
  setup: (data: { name: string; username: string; email: string; password: string; company_name?: string }) =>
    api.post<AuthResponse>("/auth/setup", data).then((r) => r.data),
  login: (data: { login: string; password: string }) => api.post<AuthResponse>("/auth/login", data).then((r) => r.data),
  logout: (refresh_token?: string | null) => api.post("/auth/logout", refresh_token ? { refresh_token } : {}),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
}

export type UserInput = { name: string; username: string; email: string; password?: string; role: Role; phone?: string | null; active?: boolean }

export const usersService = {
  ...crud<User, UserInput>("/users"),
  updateMe: (data: Partial<Pick<User, "name" | "email" | "phone" | "username">>) =>
    api.patch<User>("/users/me", data).then((r) => r.data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch("/users/me/password", data).then((r) => r.data),
}

export const clientsService = {
  ...crud<Client, ClientInput>("/clients"),
  create: (data: ClientInput, force = false) =>
    api.post<Client>("/clients", data, { params: force ? { force: true } : undefined }).then((r) => r.data),
  update: (id: number, data: Partial<ClientInput>, force = false) =>
    api.put<Client>(`/clients/${id}`, data, { params: force ? { force: true } : undefined }).then((r) => r.data),
  orders: (id: number, params?: ListParams) =>
    api.get<Paginated<Order>>(`/clients/${id}/orders`, { params: clean(params) }).then((r) => r.data),
}

export const ordersService = {
  ...crud<Order, OrderInput>("/orders"),
  board: () => api.get<Partial<Record<OrderStatus, Order[]>>>("/orders/board").then((r) => r.data),
  setStatus: (id: number, status: OrderStatus, message?: string) =>
    api.patch<Order>(`/orders/${id}/status`, { status, message }).then((r) => r.data),
  addItem: (id: number, item: ItemInput) => api.post<OrderItem>(`/orders/${id}/items`, item).then((r) => r.data),
  updateItem: (id: number, itemId: number, item: Partial<ItemInput>) =>
    api.put<OrderItem>(`/orders/${id}/items/${itemId}`, item).then((r) => r.data),
  removeItem: (id: number, itemId: number) => api.delete(`/orders/${id}/items/${itemId}`),
  addPayment: (id: number, data: { method: string; amount: number; paid_at?: string; notes?: string }) =>
    api.post<Payment>(`/orders/${id}/payments`, data).then((r) => r.data),
  removePayment: (id: number, paymentId: number) => api.delete(`/orders/${id}/payments/${paymentId}`),
  comment: (id: number, message: string) => api.post<OrderHistory>(`/orders/${id}/comments`, { message }).then((r) => r.data),
  registerPrint: (id: number, layout: "A4" | "THERMAL") => api.post(`/orders/${id}/print`, { layout }),
  addFailure: (
    id: number,
    data: { category: FailureCategory; reason: string; description?: string; occurred_at?: string },
  ) => api.post<DeliveryFailure>(`/orders/${id}/failures`, data).then((r) => r.data),
}

export const failuresService = {
  list: (params?: ListParams) => api.get<Paginated<DeliveryFailure>>("/failures", { params: clean(params) }).then((r) => r.data),
  update: (id: number, data: Partial<DeliveryFailure>) => api.put<DeliveryFailure>(`/failures/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/failures/${id}`),
  stats: (params: { from?: string; to?: string }) => api.get<FailureStats>("/failures/stats", { params: clean(params) }).then((r) => r.data),
}

export const servicesService = crud<Service>("/services")

export const productsService = {
  ...crud<Product>("/products"),
  moveStock: (id: number, data: { type: "IN" | "OUT" | "ADJUST"; quantity: number; reason?: string }) =>
    api.post<Product>(`/products/${id}/stock`, data).then((r) => r.data),
  movements: (id: number, params?: ListParams) =>
    api.get<Paginated<StockMovement>>(`/products/${id}/movements`, { params: clean(params) }).then((r) => r.data),
}

export const suppliersService = crud<Supplier>("/suppliers")

export const lookupsService = {
  list: (kind: LookupKind) => api.get<Lookup[]>("/lookups", { params: { kind } }).then((r) => r.data),
  create: (data: { kind: LookupKind; name: string; sort?: number }) => api.post<Lookup>("/lookups", data).then((r) => r.data),
  update: (id: number, data: Partial<Lookup>) => api.put<Lookup>(`/lookups/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/lookups/${id}`),
}

export const dashboardService = {
  get: (params: { from?: string; to?: string }) => api.get<Dashboard>("/dashboard", { params: clean(params) }).then((r) => r.data),
}

export const settingsService = {
  get: () => api.get<Settings>("/settings").then((r) => r.data),
  update: (data: Partial<Settings>) => api.put<Settings>("/settings", data).then((r) => r.data),
}

export const trackService = {
  get: (code: string) => api.get<TrackInfo>(`/public/track/${encodeURIComponent(code)}`).then((r) => r.data),
}

export const auditService = {
  list: (params?: ListParams) => api.get<Paginated<AuditLog>>("/audit", { params: clean(params) }).then((r) => r.data),
}

export type CsvEntity = "clients" | "orders" | "products" | "services" | "suppliers" | "payments" | "failures"

export const backupService = {
  database: () => api.get<ArrayBuffer>("/backup/database", { responseType: "arraybuffer", timeout: 0 }),
  json: () => api.get<ArrayBuffer>("/backup/json", { responseType: "arraybuffer", timeout: 0 }),
  csv: (entity: CsvEntity) => api.get<ArrayBuffer>(`/backup/csv/${entity}`, { responseType: "arraybuffer", timeout: 0 }),
  restore: (file: Blob, filename: string, password: string) => {
    const form = new FormData()
    form.append("file", file, filename)
    form.append("password", password)
    return api.post("/backup/restore", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 0 })
  },
}
