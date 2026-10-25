import { useQuery } from "@tanstack/react-query"
import { PrintSkeleton } from "@/components/skeletons/PageSkeletons"
import { ArrowLeft, FileDown, Printer } from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import type { PrinterInfo } from "@/@types/bridge"
import type { Settings } from "@/@types/api"
import { Button, Checkbox, ErrorState, SelectField, TextField } from "@/components/ui"
import { A4Document, DEFAULT_PRINT_SETTINGS, ThermalDocument } from "@/components/orders/PrintDocument"
import { cn } from "@/lib/cn"
import { formatOrderNumber } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { getPrintPrefs, setPrintPrefs, trackingUrl } from "@/lib/printPrefs"
import { bridge } from "@/lib/runtime"
import { ordersService } from "@/services/resources"
import { WindowControls } from "@/components/Layout/WindowControls"

type Layout = "A4" | "THERMAL"

/** Mescla configurações do servidor com padrões (servidor pode não ter todas as chaves). */
function mergeSettings(s?: Partial<Settings>): Settings {
  return {
    company: { ...DEFAULT_PRINT_SETTINGS.company, ...(s?.company ?? {}) },
    orders: { ...DEFAULT_PRINT_SETTINGS.orders, ...(s?.orders ?? {}) },
    print: { ...DEFAULT_PRINT_SETTINGS.print, ...(s?.print ?? {}) },
  }
}

const PAGE_STYLE: Record<Layout, string> = {
  A4: "@page { size: A4; margin: 10mm; }",
  THERMAL: "@page { size: 80mm auto; margin: 3mm; }",
}

export default function OrderPrint() {
  const { id } = useParams()
  const orderId = Number(id)
  const navigate = useNavigate()
  const settingsQuery = useSettings()
  const settings = useMemo(() => mergeSettings(settingsQuery.data), [settingsQuery.data])
  const prefs = useMemo(getPrintPrefs, [])

  const [layout, setLayout] = useState<Layout>(prefs.layout || "A4")
  const [layoutTouched, setLayoutTouched] = useState(!!prefs.layout)
  const [copies, setCopies] = useState(1)
  const [twoVias, setTwoVias] = useState(true)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [deviceName, setDeviceName] = useState(prefs.deviceName)
  const [silent, setSilent] = useState(prefs.silent)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId),
    enabled: Number.isFinite(orderId),
  })

  // padrão da empresa quando esta máquina não tem preferência salva
  useEffect(() => {
    if (!layoutTouched && settingsQuery.data) {
      setLayout(settings.print.layout || "A4")
      setCopies(settings.print.copies || 1)
    }
  }, [settingsQuery.data, settings.print.layout, settings.print.copies, layoutTouched])

  useEffect(() => {
    bridge?.listPrinters().then(setPrinters).catch(() => setPrinters([]))
  }, [])

  useEffect(() => {
    if (!order) return
    const publicUrl = settings.orders.public_url?.trim()
    const content = publicUrl ? trackingUrl(order.tracking_code, publicUrl) : order.tracking_code
    QRCode.toDataURL(content, { margin: 0, width: 240, errorCorrectionLevel: "M" })
      .then(setQrCode)
      .catch(() => setQrCode(null))
  }, [order, settings.orders.public_url])

  // tamanho de papel da regra @page acompanha o layout escolhido
  useEffect(() => {
    const style = document.createElement("style")
    style.dataset.symnagerPrint = layout
    style.textContent = PAGE_STYLE[layout]
    document.head.appendChild(style)
    return () => style.remove()
  }, [layout])

  useEffect(() => {
    if (order) document.title = `${formatOrderNumber(order.number, settings.orders.prefix)} — impressão`
    return () => {
      document.title = "Symnager"
    }
  }, [order, settings.orders.prefix])

  function changeLayout(next: Layout) {
    setLayout(next)
    setLayoutTouched(true)
    setPrintPrefs({ layout: next })
  }

  async function handlePrint() {
    if (!order) return
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
      ordersService.registerPrint(order.order_id, layout).catch(() => undefined)
      if (bridge) toast.success("Enviado para a impressora.")
    } finally {
      setBusy(false)
    }
  }

  async function handlePdf() {
    if (!order || !bridge) return
    setBusy(true)
    try {
      const path = await bridge.printToPDF({
        defaultPath: `${formatOrderNumber(order.number, settings.orders.prefix)}.pdf`,
        layout,
      })
      if (path) {
        toast.success("PDF salvo.", { action: { label: "Abrir pasta", onClick: () => bridge!.showItemInFolder(path) } })
        ordersService.registerPrint(order.order_id, layout).catch(() => undefined)
      }
    } finally {
      setBusy(false)
    }
  }

  if (isLoading || settingsQuery.isLoading) return <PrintSkeleton />
  if (isError || !order) return <ErrorState message="Não foi possível carregar a OS para impressão." onRetry={() => refetch()} />

  const docProps = { order, settings, qrCode }
  // na web as cópias são escolhidas no diálogo do navegador; aqui repetimos só as vias
  const vias = layout === "A4" && twoVias ? ["Via do cliente", "Via da loja"] : [undefined]

  return (
    <div className="h-full flex flex-col print:block print:h-auto">
      <div className="no-print app-drag shrink-0 flex flex-wrap items-end gap-2 p-2 pr-0 bg-surface border-b border-line">
        <Button size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <div role="group" aria-label="Layout" className="flex rounded-md border border-line overflow-hidden">
          {(["A4", "THERMAL"] as Layout[]).map((l) => (
            <button
              key={l}
              onClick={() => changeLayout(l)}
              aria-pressed={layout === l}
              className={cn(
                "px-2 py-1 text-sm transition duration-200 first:border-r border-line ",
                layout === l ? "bg-accent-soft text-accent font-medium" : "text-muted hover:bg-hover",
              )}
            >
              {l === "A4" ? "A4" : "Térmica 80 mm"}
            </button>
          ))}
        </div>
        {layout === "A4" && <Checkbox label="Duas vias" checked={twoVias} onChange={(e) => setTwoVias(e.target.checked)} />}
        {bridge && (
          <>
            <TextField
              label="Cópias"
              type="number"
              min={1}
              max={10}
              value={copies}
              onChange={(e) => setCopies(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              wrapperClassName="w-20"
            />
            <SelectField label="Impressora" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} wrapperClassName="w-56">
              <option value="">Padrão do sistema</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name}
                  {p.isDefault ? " (padrão)" : ""}
                </option>
              ))}
            </SelectField>
            <Checkbox label="Sem diálogo" checked={silent} onChange={(e) => setSilent(e.target.checked)} />
          </>
        )}
        <div className="ml-auto flex gap-2">
          {bridge && (
            <Button size="sm" icon={FileDown} onClick={handlePdf} disabled={busy}>
              Salvar PDF
            </Button>
          )}
          <Button size="sm" variant="primary" icon={Printer} onClick={handlePrint} loading={busy}>
            Imprimir
          </Button>
          <div className="h-9 -my-2 flex">
            <WindowControls />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-subtle p-4 print:p-0 print:bg-white print:overflow-visible">
        <div className="flex flex-col gap-4 print:gap-0">
          {layout === "THERMAL" ? (
            <ThermalDocument {...docProps} />
          ) : (
            vias.map((via, i) => (
              <div key={via ?? "unica"} className={cn(i > 0 && "print-break")}>
                <A4Document {...docProps} via={via} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
