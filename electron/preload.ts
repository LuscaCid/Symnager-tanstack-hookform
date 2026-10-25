import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

/**
 * API mínima exposta ao renderer como window.symnager (tipada em src/@types/bridge.d.ts).
 * Nenhum objeto do Node/Electron é repassado diretamente.
 */
const bridge = {
  isElectron: true as const,
  getRuntime: () => ipcRenderer.invoke("runtime:get"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (partial: unknown) => ipcRenderer.invoke("config:set", partial),
  restartApi: () => ipcRenderer.invoke("api:restart"),
  testRemote: (url: string) => ipcRenderer.invoke("remote:test", url),
  secureGet: (key: string) => ipcRenderer.invoke("secure:get", key),
  secureSet: (key: string, value: string | null) => ipcRenderer.invoke("secure:set", key, value),
  saveFile: (opts: unknown) => ipcRenderer.invoke("file:save", opts),
  openFile: (opts: unknown) => ipcRenderer.invoke("file:open", opts),
  chooseDirectory: () => ipcRenderer.invoke("dir:choose"),
  listPrinters: () => ipcRenderer.invoke("print:list"),
  print: (opts: unknown) => ipcRenderer.invoke("print:run", opts),
  printToPDF: (opts: unknown) => ipcRenderer.invoke("print:pdf", opts),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  showItemInFolder: (target: string) => ipcRenderer.invoke("shell:showItem", target),
  backupNow: () => ipcRenderer.invoke("backup:now"),
  onApiStatus: (cb: (runtime: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, runtime: unknown) => cb(runtime)
    ipcRenderer.on("api:status", listener)
    return () => {
      ipcRenderer.removeListener("api:status", listener)
    }
  },
}

contextBridge.exposeInMainWorld("symnager", bridge)
