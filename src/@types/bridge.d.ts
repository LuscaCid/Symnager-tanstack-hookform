// Ponte exposta pelo preload do Electron (electron/preload.ts). Ausente na versão web.

export type ApiStatus = 'starting' | 'running' | 'error' | 'stopped' | 'remote'

export interface DesktopConfig {
  mode: 'local' | 'remote'
  remoteUrl: string
  localPort: number
  /** permite que outros computadores da rede acessem a API local (bind 0.0.0.0) */
  lanAccess: boolean
  autoBackup: { enabled: boolean; intervalHours: number; keep: number; dir: string }
}

export interface DesktopRuntime {
  apiUrl: string
  mode: 'local' | 'remote'
  apiStatus: ApiStatus
  apiError?: string
  version: string
  userData: string
  dbPath: string
  platform: string
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

export interface SymnagerBridge {
  isElectron: true
  getRuntime(): Promise<DesktopRuntime>
  getConfig(): Promise<DesktopConfig>
  setConfig(partial: Partial<DesktopConfig>): Promise<DesktopRuntime>
  restartApi(): Promise<DesktopRuntime>
  testRemote(url: string): Promise<{ ok: boolean; message: string }>
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
  onApiStatus(cb: (runtime: DesktopRuntime) => void): () => void
}

declare global {
  interface Window {
    symnager?: SymnagerBridge
  }
}
