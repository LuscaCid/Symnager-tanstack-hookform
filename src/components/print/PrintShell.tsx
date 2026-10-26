import { ArrowLeft, FileDown, Printer } from "lucide-react"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { PrinterInfo } from "@/@types/bridge"
import { Button, Checkbox, IconButton, inputClass, SelectField } from "@/components/ui"
import { hasCustomTitleBar, needsMacInset, WindowControls } from "@/components/Layout/WindowControls"
import { cn } from "@/lib/cn"
import { getPrintPrefs, setPrintPrefs } from "@/lib/printPrefs"
import { bridge } from "@/lib/runtime"

export type PrintLayout = "A4" | "THERMAL"

const PAGE_STYLE: Record<PrintLayout, string> = {
  A4: "@page { size: A4; margin: 10mm; }",
  THERMAL: "@page { size: 80mm auto; margin: 3mm; }",
}

interface PrintShellProps {
  title: string
  subtitle?: ReactNode
  /** folhas disponíveis (o certificado só sai em A4) */
  layouts?: PrintLayout[]
  layout: PrintLayout
  onLayoutChange?: (layout: PrintLayout) => void
  /** cópias iniciais (padrão da empresa) */
  defaultCopies?: number
  /** nome sugerido do PDF */
  pdfName: string
  /** opções extras na faixa (ex.: "Duas vias") */
  options?: ReactNode
  /** chamado depois de imprimir ou salvar o PDF (registro no histórico) */
  onPrinted?: (layout: PrintLayout) => void
  children: ReactNode
}

/**
 * Tela de impressão: barra de título (arrastável no desktop), escolha de folha, impressora,
 * cópias, impressão silenciosa e PDF. O conteúdo impresso vem em `children`.
 */
export function PrintShell({
  title,
  subtitle,
  layouts = ["A4", "THERMAL"],
  layout,
  onLayoutChange,
  defaultCopies = 1,
  pdfName,
  options,
  onPrinted,
  children,
}: PrintShellProps) {
  const navigate = useNavigate()
  const prefs = useMemo(getPrintPrefs, [])
  const [copies, setCopies] = useState(defaultCopies)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [deviceName, setDeviceName] = useState(prefs.deviceName)
  const [silent, setSilent] = useState(prefs.silent)
  const [busy, setBusy] = useState(false)

  useEffect(() => setCopies(defaultCopies), [defaultCopies])

  useEffect(() => {
    bridge?.listPrinters().then(setPrinters).catch(() => setPrinters([]))
  }, [])

  // tamanho de papel da regra @page acompanha o layout escolhido
  useEffect(() => {
    const style = document.createElement("style")
    style.dataset.symnagerPrint = layout
    style.textContent = PAGE_STYLE[layout]
    document.head.appendChild(style)
    return () => style.remove()
  }, [layout])

  useEffect(() => {
    document.title = `${title} — impressão`
    return () => {
      document.title = "Symnager"
    }
  }, [title])

  async function handlePrint() {
    setBusy(true)
    try {
      if (bridge) {
        setPrintPrefs({ deviceName, silent })
        const result = await bridge.print({ deviceName: deviceName || undefined, silent, copies, layout })
        if (!result.ok) {
          if (result.error) toast.error(`Falha ao imprimir: ${result.error}`)
          return
        }
      } else {
        window.print()
      }
      onPrinted?.(layout)
      if (bridge) toast.success("Enviado para a impressora.")
    } finally {
      setBusy(false)
    }
  }

  async function handlePdf() {
    if (!bridge) return
    setBusy(true)
    try {
      const path = await bridge.printToPDF({ defaultPath: pdfName, layout })
      if (path) {
        toast.success("PDF salvo.", { action: { label: "Abrir pasta", onClick: () => bridge!.showItemInFolder(path) } })
        onPrinted?.(layout)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex flex-col print:block print:h-auto">
      {/* barra de título: arrastável (desktop), ações principais e controles da janela sempre na mesma linha */}
      <header
        className={cn(
          "no-print shrink-0 h-12 flex items-center gap-3 bg-surface border-b border-line select-none",
          bridge && "app-drag",
          needsMacInset ? "pl-20" : "pl-2",
        )}
        onDoubleClick={(e) => {
          if (bridge && e.target === e.currentTarget) bridge.windowControls.toggleMaximize()
        }}
      >
        <IconButton icon={ArrowLeft} label="Voltar" onClick={() => navigate(-1)} />
        <div className="min-w-0 flex-1 pointer-events-none">
          <h1 className="text-sm font-semibold truncate">Imprimir {title}</h1>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 pr-2">
          {bridge && (
            <Button size="sm" icon={FileDown} onClick={handlePdf} disabled={busy}>
              Salvar PDF
            </Button>
          )}
          <Button size="sm" variant="primary" icon={Printer} onClick={handlePrint} loading={busy}>
            Imprimir
          </Button>
        </div>
        {hasCustomTitleBar && (
          <>
            <span className="w-px h-5 bg-line" />
            <WindowControls />
          </>
        )}
      </header>

      {/* opções de impressão: rótulos na linha, tudo alinhado ao centro */}
      <div className="no-print shrink-0 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 bg-surface border-b border-line text-[13px]">
        {layouts.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-muted">Folha</span>
            <div role="group" aria-label="Tipo de folha" className="flex gap-0.5 p-0.5 rounded-lg bg-subtle">
              {layouts.map((l) => (
                <button
                  key={l}
                  onClick={() => onLayoutChange?.(l)}
                  aria-pressed={layout === l}
                  className={cn(
                    "h-8 px-3 rounded-md font-medium transition-colors duration-100",
                    layout === l ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {l === "A4" ? "A4" : "Térmica 80 mm"}
                </button>
              ))}
            </div>
          </div>
        )}
        {options}
        {bridge && (
          <>
            <label className="flex items-center gap-2">
              <span className="text-muted">Cópias</span>
              <input
                type="number"
                min={1}
                max={10}
                value={copies}
                onChange={(e) => setCopies(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                className={cn(inputClass, "w-16 px-2 text-center")}
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted">Impressora</span>
              <SelectField label="Impressora" hideLabel value={deviceName} onChange={(e) => setDeviceName(e.target.value)} wrapperClassName="w-60">
                <option value="">Padrão do sistema</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.displayName || p.name}
                    {p.isDefault ? " (padrão)" : ""}
                  </option>
                ))}
              </SelectField>
            </div>
            <Checkbox label="Imprimir sem abrir o diálogo" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
          </>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-subtle p-4 print:p-0 print:bg-white print:overflow-visible">
        <div className="flex flex-col gap-4 print:gap-0">{children}</div>
      </div>
    </div>
  )
}
