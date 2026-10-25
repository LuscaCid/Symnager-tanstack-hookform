// Ponte exposta pelo preload do Electron (electron/preload.ts). Ausente na versão web.

export type ApiStatus = 'starting' | 'running' | 'error' | 'stopped' | 'remote'

export interface DesktopConfig {
  /** remote = servidor em nuvem Symnager (endereço fixo, planos mensais) */
  mode: 'local' | 'remote'
  /** legado (versões com endereço manual); ignorado */
  remoteUrl: string
  localPort: number
  /** permite que outros computadores da rede acessem a API local (bind 0.0.0.0) */
  lanAccess: boolean
  autoBackup: { enabled: boolean; intervalHours: number; keep: number; dir: string }
}

export interface DesktopRuntime {
  apiUrl: string
  /** API embutida neste computador (licença, cópia dos dados da nuvem); vazia enquanto não sobe */
  localApiUrl: string
  cloudUrl: string
  mode: 'local' | 'remote'
  apiStatus: ApiStatus
  apiError?: string
  version: string
  userData: string
  dbPath: string
  platform: string
}

export interface CloudCheckResult {
  ok: boolean
  code?: string
  message?: string
  tenant?: { id: number; name: string }
  plan?: string
  plan_name?: string
  limits?: import('./api').PlanLimits
}

export interface CloudPullResult {
  ok: boolean
  message?: string
  code?: string
  safety_copy?: string
  orders?: number
  clients?: number
  photos?: number
}

export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
}

export interface PrintOptions {
  deviceName?: string
  silent?: boolean
  copies?: number
  layout?: 'A4' | 'THERMAL'
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface WindowState {
  maximized: boolean
  fullscreen: boolean
  focused: boolean
}

export interface WindowControls {
  minimize(): Promise<void>
  toggleMaximize(): Promise<boolean>
  toggleFullScreen(): Promise<boolean>
  close(): Promise<void>
  getState(): Promise<WindowState>
  onState(cb: (state: WindowState) => void): () => void
}

export interface SymnagerBridge {
  isElectron: true
  getRuntime(): Promise<DesktopRuntime>
  getConfig(): Promise<DesktopConfig>
  setConfig(partial: Partial<DesktopConfig>): Promise<DesktopRuntime>
  restartApi(): Promise<DesktopRuntime>
  /** confere se a licença deste computador dá acesso ao servidor em nuvem */
  cloudCheck(): Promise<CloudCheckResult>
  /** substitui o banco local pelos dados do tenant na nuvem (com cópia de segurança) */
  cloudPull(accessToken: string): Promise<CloudPullResult>
  secureGet(key: string): Promise<string | null>
  secureSet(key: string, value: string | null): Promise<void>
  saveFile(opts: { defaultPath: string; data: ArrayBuffer; filters?: FileFilter[] }): Promise<string | null>
  openFile(opts: { filters?: FileFilter[] }): Promise<{ name: string; data: ArrayBuffer } | null>
  chooseDirectory(): Promise<string | null>
  listPrinters(): Promise<PrinterInfo[]>
  print(opts: PrintOptions): Promise<{ ok: boolean; error?: string }>
  printToPDF(opts: { defaultPath: string; layout?: 'A4' | 'THERMAL' }): Promise<string | null>
  openExternal(url: string): Promise<void>
  showItemInFolder(path: string): Promise<void>
  backupNow(): Promise<{ ok: boolean; path?: string; error?: string }>
  platform: string
  windowControls: WindowControls
  onApiStatus(cb: (runtime: DesktopRuntime) => void): () => void
}

declare global {
  interface Window {
    symnager?: SymnagerBridge
  }
}
