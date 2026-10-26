import type { Certificate, Settings } from "@/@types/api"
import { formatDate, formatDateTime, formatDocument, formatPhone } from "@/lib/format"

const MEASUREMENT_LABEL: Record<string, string> = {
  pressure_psi: "Pressão (psi)",
  current_a: "Corrente (A)",
  voltage_v: "Tensão (V)",
  supply_c: "Insuflamento (°C)",
  return_c: "Retorno (°C)",
}

interface Props {
  certificate: Certificate
  settings: Pick<Settings, "company"> & { certificates?: Settings["certificates"] }
  qrCode: string | null
  /** endereço impresso abaixo do QR (verificação) */
  verifyHint: string
}

/** Certificado de higienização / relatório de manutenção preventiva em A4 (preto no branco). */
export function CertificateDocument({ certificate: c, settings, qrCode, verifyHint }: Props) {
  const company = settings.company
  const logo = company.logo
  const companyName = c.company.name || company.name
  const showQr = settings.certificates?.show_qrcode !== false && !!qrCode
  const measurements = Object.entries(c.measurements ?? {}).filter(([, v]) => v !== null && v !== undefined)
  const checklist = c.checklist.filter((e) => e.ok !== null)
  const canceled = c.status === "CANCELADO"

  return (
    <article className="print-area relative mx-auto w-full max-w-[190mm] p-7 text-[12px] leading-snug flex flex-col gap-4 shadow-xl border border-zinc-300 rounded-sm">
      {canceled && (
        <div className="absolute inset-x-0 top-1/3 text-center pointer-events-none">
          <span className="inline-block border-4 border-black px-6 py-2 text-3xl font-bold tracking-widest rotate-[-12deg] opacity-40">CANCELADO</span>
        </div>
      )}
      <header className="flex items-start gap-3 pb-2 border-b-2 border-black">
        {logo && <img src={logo} alt="" className="h-14 w-auto max-w-32 object-contain" />}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold">{companyName}</p>
          <p>{[c.company.document && formatDocument(c.company.document), c.company.phone && formatPhone(c.company.phone), c.company.email].filter(Boolean).join(" · ")}</p>
          {c.company.address && <p>{c.company.address}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide">Nº</p>
          <p className="text-xl font-bold font-mono">{c.code}</p>
          <p className="text-xs">OS {String(c.order_number).padStart(6, "0")}</p>
        </div>
      </header>

      <h1 className="text-center text-xl font-bold uppercase tracking-wide">{c.title}</h1>

      <section className="grid grid-cols-[1fr_auto] gap-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <p className="col-span-2 font-bold uppercase text-[11px]">Cliente</p>
          <p className="col-span-2 text-sm font-semibold">{c.client.name}</p>
          {c.client.document && <p>CPF/CNPJ: {formatDocument(c.client.document)}</p>}
          {c.client.phone && <p>Telefone: {formatPhone(c.client.phone)}</p>}
          {c.client.address && <p className="col-span-2">Local: {c.client.address}</p>}
          <p>Data do serviço: {formatDateTime(c.performed_at)}</p>
          {c.next_service_at && (
            <p>
              <strong>Próximo serviço: {formatDate(c.next_service_at)}</strong>
            </p>
          )}
        </div>
        {showQr && (
          <div className="flex flex-col items-center text-center max-w-32">
            <img src={qrCode!} alt="QR code de verificação" className="w-24 h-24" />
            <span className="font-mono font-bold tracking-widest">{c.verification_code}</span>
            <span className="text-[10px] break-all">{verifyHint}</span>
          </div>
        )}
      </section>

      <section>
        <p className="font-bold uppercase text-[11px] mb-0.5">Equipamentos atendidos</p>
        <table>
          <thead>
            <tr>
              <th className="w-6">#</th>
              <th>Equipamento</th>
              <th>Marca / modelo</th>
              <th>Capacidade</th>
              <th>Gás</th>
              <th>Ambiente</th>
            </tr>
          </thead>
          <tbody>
            {c.equipment.map((e, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  {e.device}
                  {e.device_type ? ` (${e.device_type})` : ""}
                  {e.serial ? <span className="block text-[10px]">Série: {e.serial}</span> : null}
                </td>
                <td>{[e.brand, e.model].filter(Boolean).join(" ") || "—"}</td>
                <td>{e.btu ? `${e.btu} BTUs` : "—"}</td>
                <td>{e.gas || "—"}</td>
                <td>{e.ambiente || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {checklist.length > 0 && (
        <section>
          <p className="font-bold uppercase text-[11px] mb-0.5">Itens executados / verificados</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {checklist.map((e) => (
              <li key={e.item} className="flex gap-1.5">
                <span className="font-mono">{e.ok ? "[X]" : "[!]"}</span>
                <span>
                  {e.item}
                  {e.ok === false && " — com pendência"}
                  {e.note ? ` (${e.note})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.products.length > 0 && (
        <section>
          <p className="font-bold uppercase text-[11px] mb-0.5">Produtos utilizados</p>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th className="w-40">Registro</th>
                <th className="w-32">Lote</th>
              </tr>
            </thead>
            <tbody>
              {c.products.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.registry || "—"}</td>
                  <td>{p.batch || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {measurements.length > 0 && (
        <section>
          <p className="font-bold uppercase text-[11px] mb-0.5">Medições</p>
          <p>
            {measurements.map(([k, v]) => `${MEASUREMENT_LABEL[k] ?? k}: ${String(v).replace(".", ",")}`).join(" · ")}
          </p>
        </section>
      )}

      {c.notes && (
        <section>
          <p className="font-bold uppercase text-[11px]">Observações</p>
          <p className="whitespace-pre-wrap">{c.notes}</p>
        </section>
      )}

      {(c.disclaimer || settings.certificates?.notes) && (
        <section className="text-[10.5px] flex flex-col gap-1 border-t border-black pt-2">
          {settings.certificates?.notes && <p className="whitespace-pre-wrap">{settings.certificates.notes}</p>}
          {c.disclaimer && <p className="italic">{c.disclaimer}</p>}
        </section>
      )}

      {canceled && (
        <p className="text-center font-semibold">
          Certificado cancelado em {formatDateTime(c.canceled_at)}
          {c.cancel_reason ? ` — ${c.cancel_reason}` : ""}
        </p>
      )}

      <footer className="grid grid-cols-2 gap-10 pt-10 text-center text-[11px]">
        <div className="border-t border-black pt-1">
          {c.technician_name}
          <br />
          {c.technician_registry ? `Registro: ${c.technician_registry}` : "Responsável técnico"}
        </div>
        <div className="border-t border-black pt-1">
          Cliente
          <br />
          {c.client.name}
        </div>
      </footer>
    </article>
  )
}
