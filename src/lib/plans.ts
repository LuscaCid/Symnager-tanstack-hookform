import type { PlanLimits } from "@/@types/api"

export type PlanKey = "VITALICIO" | "BASICO" | "INTERMEDIARIO" | "PRO"

export interface PlanInfo {
  key: PlanKey
  name: string
  price: string
  period: string
  /** para quem o plano foi pensado */
  audience: string
  limits: PlanLimits
}

/** Catálogo exibido na tela de pedido de licença (mesmos valores do servidor de licenças). */
export const PLANS: PlanInfo[] = [
  {
    key: "VITALICIO",
    name: "Vitalício",
    price: "R$ 74,90",
    period: "pagamento único",
    audience: "Um balcão, dados só neste computador",
    limits: {
      cloud: false,
      max_users: null,
      max_orders_month: null,
      storage_mb: null,
      max_photos_per_order: 10,
      max_machines: 1,
      rate_per_minute: null,
    },
  },
  {
    key: "BASICO",
    name: "Básico",
    price: "R$ 18,90",
    period: "por mês",
    audience: "Dono e um ajudante, poucos atendimentos por mês",
    limits: {
      cloud: true,
      max_users: 2,
      max_orders_month: 80,
      storage_mb: 2048,
      max_photos_per_order: 4,
      max_machines: 2,
      rate_per_minute: 120,
    },
  },
  {
    key: "INTERMEDIARIO",
    name: "Intermediário",
    price: "R$ 34,90",
    period: "por mês",
    audience: "Loja com balcão e bancada separados",
    limits: {
      cloud: true,
      max_users: 5,
      max_orders_month: 300,
      storage_mb: 10240,
      max_photos_per_order: 8,
      max_machines: 5,
      rate_per_minute: 240,
    },
  },
  {
    key: "PRO",
    name: "Pro",
    price: "R$ 49,90",
    period: "por mês",
    audience: "Equipe maior ou mais de um ponto de atendimento",
    limits: {
      cloud: true,
      max_users: 12,
      max_orders_month: null,
      storage_mb: 30720,
      max_photos_per_order: 15,
      max_machines: 12,
      rate_per_minute: 480,
    },
  },
]

const storage = (mb: number | null) =>
  mb === null ? "espaço do computador" : mb >= 1024 ? `${(mb / 1024).toLocaleString("pt-BR")} GB` : `${mb} MB`

const count = (n: number | null, one: string, many: string) =>
  n === null ? `${many} ilimitados` : `${n} ${n === 1 ? one : many}`

/** Linhas de recursos/limites de um plano, em português, para listas e cartões. */
export function describeLimits(limits: PlanLimits): string[] {
  const lines = [
    limits.cloud ? "Banco em nuvem + banco local" : "Banco local (sem nuvem)",
    limits.cloud ? count(limits.max_users, "usuário", "usuários") : "Usuários ilimitados neste computador",
    limits.max_orders_month === null ? "OS ilimitadas" : `Até ${limits.max_orders_month} OS por mês`,
    limits.cloud ? `${storage(limits.storage_mb)} de armazenamento` : "Armazenamento no disco do computador",
    `Até ${limits.max_photos_per_order ?? "∞"} fotos por OS`,
    count(limits.max_machines, "computador", "computadores"),
  ]
  return lines
}

/** Nome amigável a partir da chave do plano (licenças antigas "PADRAO" = Vitalício). */
export function planName(key: string | null | undefined) {
  if (!key) return null
  const found = PLANS.find((p) => p.key === key)
  if (found) return found.name
  if (key === "PADRAO") return "Vitalício"
  if (key === "INTERNO") return "Interno"
  return key
}

/** Chave do catálogo para o plano da licença (licenças antigas "PADRAO" = Vitalício). */
export function planKey(key: string | null | undefined): PlanKey | string | null {
  if (!key) return null
  return key === "PADRAO" ? "VITALICIO" : key
}
