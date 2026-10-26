import { useQuery } from "@tanstack/react-query"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { PrintSkeleton } from "@/components/skeletons/PageSkeletons"
import { ErrorState } from "@/components/ui"
import { CertificateDocument } from "@/components/certificates/CertificateDocument"
import { DEFAULT_PRINT_SETTINGS } from "@/components/orders/PrintDocument"
import { PrintShell } from "@/components/print/PrintShell"
import { useSettings } from "@/lib/hooks"
import { certificatesService } from "@/services/resources"

/** URL pública de verificação: endereço público configurado + /verificar/<código>. */
export function verifyUrl(code: string, publicUrl?: string) {
  const base = publicUrl?.trim().replace(/\/+$/, "")
  return base ? `${base}/verificar/${code}` : null
}

export default function CertificatePrint() {
  const { id } = useParams()
  const certId = Number(id)
  const settings = useSettings()
  const [qrCode, setQrCode] = useState<string | null>(null)

  const { data: cert, isLoading, isError, refetch } = useQuery({
    queryKey: ["certificates", certId],
    queryFn: () => certificatesService.get(certId),
    enabled: Number.isFinite(certId),
  })

  const url = cert ? verifyUrl(cert.verification_code, settings.data?.orders.public_url) : null

  useEffect(() => {
    if (!cert) return
    QRCode.toDataURL(url ?? cert.verification_code, { margin: 0, width: 240, errorCorrectionLevel: "M" })
      .then(setQrCode)
      .catch(() => setQrCode(null))
  }, [cert, url])

  if (isLoading || settings.isLoading) return <PrintSkeleton />
  if (isError || !cert) return <ErrorState message="Não foi possível carregar o certificado." onRetry={() => refetch()} />

  const company = { ...DEFAULT_PRINT_SETTINGS.company, ...(settings.data?.company ?? {}) }

  return (
    <PrintShell
      title={cert.code}
      subtitle={`${cert.title} · ${cert.client.name}`}
      layouts={["A4"]}
      layout="A4"
      pdfName={`${cert.code}.pdf`}
    >
      <CertificateDocument
        certificate={cert}
        settings={{ company, certificates: settings.data?.certificates }}
        qrCode={qrCode}
        verifyHint={url ? `Verifique em ${url}` : "Código de verificação"}
      />
    </PrintShell>
  )
}
