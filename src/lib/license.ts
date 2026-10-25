import type { LicenseRequestInput, LicenseStatus } from "@/@types/api"

/** Servidor de licenças padrão (a API informa outro em `server_url` quando configurada). */
export const DEFAULT_LICENSE_SERVER = "https://symnager.plune.app.br"

const CACHE_KEY = "@symnager-license"

/** Último status conhecido: evita mostrar a tela de ativação por um instante no boot. */
export function getCachedLicense(): LicenseStatus | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as LicenseStatus) : null
  } catch {
    return null
  }
}

export function setCachedLicense(status: LicenseStatus | null) {
  try {
    if (status) localStorage.setItem(CACHE_KEY, JSON.stringify(status))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // armazenamento indisponível: só perde o cache
  }
}

/** Formata enquanto digita: SYMN-XXXXX-XXXXX-XXXXX-XXXXX (letras maiúsculas e números). */
export function formatLicenseKey(input: string) {
  let raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (raw.length < 4 && "SYMN".startsWith(raw)) return raw // ainda digitando o prefixo
  if (raw.startsWith("SYMN")) raw = raw.slice(4)
  const groups = raw.slice(0, 20).match(/.{1,5}/g) ?? []
  return ["SYMN", ...groups].join("-")
}

export const LICENSE_KEY_PATTERN = /^SYMN(-[A-Z0-9]{5}){4}$/

/** Textos curtos para cada situação da licença. */
export const LICENSE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  OFFLINE: "Ativa (sem conexão)",
  UNLICENSED: "Não ativada",
  EXPIRED: "Validação expirada",
  CLOCK_TAMPERED: "Relógio alterado",
  INVALID_TOKEN: "Licença inválida",
  LICENSE_NOT_FOUND: "Chave não encontrada",
  TENANT_PENDING: "Cadastro em análise",
  TENANT_BLOCKED: "Empresa bloqueada",
  LICENSE_BLOCKED: "Licença bloqueada",
  LICENSE_EXPIRED: "Licença vencida",
  ACTIVATION_REVOKED: "Ativação revogada",
  ACTIVATION_LIMIT: "Limite de computadores atingido",
  LICENSE_SERVER_UNREACHABLE: "Servidor de licenças indisponível",
}

export function licenseServerUrl(status?: LicenseStatus | null) {
  return (status?.server_url || DEFAULT_LICENSE_SERVER).replace(/\/+$/, "")
}

/** Envia o pedido de licença direto ao servidor de licenças (não passa pela API local). */
export async function requestLicense(server: string, body: LicenseRequestInput) {
  const res = await fetch(`${server}/api/v1/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join("\n") : data?.message
    if (res.status === 429) throw new Error("Muitos pedidos em pouco tempo. Tente novamente em uma hora.")
    throw new Error(message || "Não foi possível enviar o pedido agora.")
  }
  return data as { id: number; status: "PENDING" }
}
