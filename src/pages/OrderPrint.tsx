import { useQuery } from "@tanstack/react-query"
import { PrintSkeleton } from "@/components/skeletons/PageSkeletons"
import QRCode from "qrcode"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import type { Settings } from "@/@types/api"
import { Checkbox, ErrorState } from "@/components/ui"
import { A4Document, DEFAULT_PRINT_SETTINGS, ThermalDocument } from "@/components/orders/PrintDocument"
import { PrintShell, type PrintLayout } from "@/components/print/PrintShell"
import { cn } from "@/lib/cn"
import { formatOrderNumber } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { useSegment } from "@/lib/segment"
import { getPrintPrefs, setPrintPrefs, trackingUrl } from "@/lib/printPrefs"
import { ordersService } from "@/services/resources"

/** Mescla configurações do servidor com padrões (servidor pode não ter todas as chaves). */
function mergeSettings(s?: Partial<Settings>): Settings {
  return {
    company: { ...DEFAULT_PRINT_SETTINGS.company, ...(s?.company ?? {}) },
    orders: { ...DEFAULT_PRINT_SETTINGS.orders, ...(s?.orders ?? {}) },
    print: { ...DEFAULT_PRINT_SETTINGS.print, ...(s?.print ?? {}) },
  }
}

export default function OrderPrint() {
  const { id } = useParams()
  const orderId = Number(id)
  const settingsQuery = useSettings()
  const settings = useMemo(() => mergeSettings(settingsQuery.data), [settingsQuery.data])
  const segment = useSegment()
  const prefs = useMemo(getPrintPrefs, [])

  const [layout, setLayout] = useState<PrintLayout>(prefs.layout || "A4")
  const [layoutTouched, setLayoutTouched] = useState(!!prefs.layout)
  const [twoVias, setTwoVias] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId),
    enabled: Number.isFinite(orderId),
  })

  // padrão da empresa quando esta máquina não tem preferência salva
  useEffect(() => {
    if (!layoutTouched && settingsQuery.data) setLayout(settings.print.layout || "A4")
  }, [settingsQuery.data, settings.print.layout, layoutTouched])

  useEffect(() => {
    if (!order) return
    const publicUrl = settings.orders.public_url?.trim()
    const content = publicUrl ? trackingUrl(order.tracking_code, publicUrl) : order.tracking_code
    QRCode.toDataURL(content, { margin: 0, width: 240, errorCorrectionLevel: "M" })
      .then(setQrCode)
      .catch(() => setQrCode(null))
  }, [order, settings.orders.public_url])

  function changeLayout(next: PrintLayout) {
    setLayout(next)
    setLayoutTouched(true)
    setPrintPrefs({ layout: next })
  }

  if (isLoading || settingsQuery.isLoading) return <PrintSkeleton />
  if (isError || !order) return <ErrorState message="Não foi possível carregar a OS para impressão." onRetry={() => refetch()} />

  const number = formatOrderNumber(order.number, settings.orders.prefix)
  const docProps = { order, settings, qrCode, profile: segment.profile, customFields: segment.allFieldDefs }
  // na web as cópias são escolhidas no diálogo do navegador; aqui repetimos só as vias
  const vias = layout === "A4" && twoVias ? ["Via do cliente", "Via da loja"] : [undefined]

  return (
    <PrintShell
      title={number}
      subtitle={`${order.device}${order.owner?.name ? ` · ${order.owner.name}` : ""}`}
      layout={layout}
      onLayoutChange={changeLayout}
      defaultCopies={layoutTouched ? 1 : settings.print.copies || 1}
      pdfName={`${number}.pdf`}
      options={layout === "A4" && <Checkbox label="Duas vias" checked={twoVias} onChange={(e) => setTwoVias(e.target.checked)} />}
      onPrinted={(l) => ordersService.registerPrint(order.order_id, l).catch(() => undefined)}
    >
      {layout === "THERMAL" ? (
        <ThermalDocument {...docProps} />
      ) : (
        vias.map((via, i) => (
          <div key={via ?? "unica"} className={cn(i > 0 && "print-break")}>
            <A4Document {...docProps} via={via} />
          </div>
        ))
      )}
    </PrintShell>
  )
}
