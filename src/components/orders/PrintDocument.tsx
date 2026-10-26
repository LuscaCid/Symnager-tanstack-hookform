import type { CustomFieldDef, Order, SegmentProfile, Settings } from "@/@types/api"
import {
  formatDate,
  formatDateTime,
  formatDocument,
  formatMoney,
  formatOrderNumber,
  formatPhone,
  PRIORITY_LABEL,
} from "@/lib/format"
import { customFieldLines } from "@/lib/orderFields"
import { FALLBACK_PROFILE, statusLabelOf } from "@/lib/segment"
import { balanceOf } from "./orderUtils"

export const DEFAULT_PRINT_SETTINGS: Settings = {
  company: { name: "", document: "", phone: "", email: "", address: "", city: "", state: "", zipcode: "", logo: "" },
  orders: { prefix: "OS", default_warranty_days: 90, terms: "", require_technician: false, public_url: "" },
  print: { layout: "A4", copies: 1, show_qrcode: true, show_prices: true },
}

interface DocProps {
  order: Order
  settings: Settings
  qrCode: string | null
  /** rótulo da via (A4 em duas vias) */
  via?: string
  /** perfil do ramo (rótulos e campos visíveis) */
  profile?: SegmentProfile
  /** campos adicionais em uso (do ramo e da empresa) */
  customFields?: CustomFieldDef[]
}

function companyAddress(c: Settings["company"]) {
  return [c.address, [c.city, c.state].filter(Boolean).join("/"), c.zipcode].filter(Boolean).join(" · ")
}

const capitalize = (t: string) => t.replace(/^./, (c) => c.toUpperCase())

function equipmentLines(o: Order, profile: SegmentProfile, customFields: CustomFieldDef[]) {
  const L = profile.labels
  const show = (f: keyof SegmentProfile["fields"]) => profile.fields[f] !== "hidden"
  return [
    [L.device, o.device],
    show("device_type") && [L.device_type, o.device_type],
    (show("brand") || show("model")) && [
      [show("brand") && L.brand, show("model") && L.model.toLowerCase()].filter(Boolean).join(" / "),
      [show("brand") && o.brand, show("model") && o.model].filter(Boolean).join(" "),
    ],
    show("serial") && [L.serial, o.serial],
    ...customFieldLines(o, customFields, true),
    show("accessories") && [L.accessories, o.accessories],
    show("condition") && [L.condition, o.condition],
    show("checklist") && [
      L.checklist,
      (o.checklist ?? [])
        .filter((e) => e.ok !== null)
        .map((e) => `${e.item}: ${e.ok ? "OK" : "PROBLEMA"}`)
        .join(" · "),
    ],
  ].filter((line): line is [string, string] => Array.isArray(line) && !!line[1])
}

/** Local e horário da visita, quando a OS tem atendimento no endereço do cliente. */
function visitLines(o: Order, profile: SegmentProfile) {
  return [
    o.service_address ? [profile.labels.service_address, o.service_address] : null,
    o.scheduled_at ? [profile.labels.scheduled_at, formatDateTime(o.scheduled_at)] : null,
  ].filter(Boolean) as [string, string][]
}

/** Comprovante em A4 (impressora comum). Nunca imprime a senha nem observações internas. */
export function A4Document({ order, settings, qrCode, via, profile = FALLBACK_PROFILE, customFields = [] }: DocProps) {
  const c = settings.company
  const L = profile.labels
  const visit = visitLines(order, profile)
  const showPrices = settings.print.show_prices
  const items = order.items ?? []
  const number = formatOrderNumber(order.number, settings.orders.prefix || "OS")

  return (
    <article className="print-area mx-auto w-full max-w-[190mm] p-6 text-[12px] leading-snug flex flex-col gap-3 shadow-xl border border-zinc-300 rounded-sm">
      <header className="flex items-start gap-3 pb-2 border-b-2 border-black">
        {c.logo && <img src={c.logo} alt="" className="h-14 w-auto max-w-32 object-contain" />}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold">{c.name || capitalize(L.business)}</h1>
          <p>
            {[c.document && formatDocument(c.document), c.phone && formatPhone(c.phone), c.email].filter(Boolean).join(" · ")}
          </p>
          {companyAddress(c) && <p>{companyAddress(c)}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide">Ordem de serviço</p>
          <p className="text-xl font-bold font-mono">{number}</p>
          <p className="text-xs">Entrada: {formatDateTime(order.arrived_at)}</p>
          {via && <p className="text-xs font-semibold mt-1 uppercase">{via}</p>}
        </div>
      </header>

      <section className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <p className="col-span-2 font-bold uppercase text-[11px]">Cliente</p>
          <p className="col-span-2 text-sm font-semibold">{order.owner?.name}</p>
          {order.owner?.document && <p>CPF/CNPJ: {formatDocument(order.owner.document)}</p>}
          {order.owner?.phone && <p>Telefone: {formatPhone(order.owner.phone)}</p>}
          {order.owner?.email && <p className="col-span-2">E-mail: {order.owner.email}</p>}
          <p>Status: {statusLabelOf(profile, order.status)}</p>
          <p>Prioridade: {PRIORITY_LABEL[order.priority]}</p>
          {order.due_date && <p>Previsão: {formatDate(order.due_date)}</p>}
          {order.technician && <p>Técnico: {order.technician.name}</p>}
        </div>
        {settings.print.show_qrcode && qrCode && (
          <div className="flex flex-col items-center text-center">
            <img src={qrCode} alt="QR code de acompanhamento" className="w-24 h-24" />
            <span className="font-mono font-bold tracking-widest">{order.tracking_code}</span>
            <span className="text-[10px]">Acompanhe seu serviço</span>
          </div>
        )}
      </section>

      {visit.length > 0 && (
        <section>
          <p className="font-bold uppercase text-[11px] mb-0.5">Atendimento no local</p>
          <table>
            <tbody>
              {visit.map(([label, value]) => (
                <tr key={label}>
                  <th className="w-40 font-semibold">{label}</th>
                  <td className="whitespace-pre-wrap">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <p className="font-bold uppercase text-[11px] mb-0.5">{L.device}</p>
        <table>
          <tbody>
            {equipmentLines(order, profile, customFields).map(([label, value]) => (
              <tr key={label}>
                <th className="w-40 font-semibold">{label}</th>
                <td className="whitespace-pre-wrap">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 gap-2">
        <div>
          <p className="font-bold uppercase text-[11px]">{L.description}</p>
          <p className="whitespace-pre-wrap border border-zinc-400 p-1.5 min-h-10">{order.description}</p>
        </div>
        {order.diagnosis && (
          <div>
            <p className="font-bold uppercase text-[11px]">{L.diagnosis}</p>
            <p className="whitespace-pre-wrap border border-zinc-400 p-1.5">{order.diagnosis}</p>
          </div>
        )}
        {order.solution && (
          <div>
            <p className="font-bold uppercase text-[11px]">{L.solution}</p>
            <p className="whitespace-pre-wrap border border-zinc-400 p-1.5">{order.solution}</p>
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section>
          <p className="font-bold uppercase text-[11px] mb-0.5">Serviços e peças</p>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="w-14 text-right">Qtd.</th>
                {showPrices && <th className="w-24 text-right">Unitário</th>}
                {showPrices && <th className="w-24 text-right">Total</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.item_id}>
                  <td>{i.description}</td>
                  <td className="text-right">{i.quantity}</td>
                  {showPrices && <td className="text-right">{formatMoney(i.unit_price)}</td>}
                  {showPrices && <td className="text-right">{formatMoney(i.total)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showPrices && (
        <section className="self-end w-64 text-[12px]">
          {order.discount > 0 && (
            <p className="flex justify-between">
              <span>Desconto</span> <span>- {formatMoney(order.discount)}</span>
            </p>
          )}
          <p className="flex justify-between font-bold text-sm border-t border-black">
            <span>Total</span> <span>{formatMoney(order.total)}</span>
          </p>
          <p className="flex justify-between">
            <span>Pago</span> <span>{formatMoney(order.paid)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Saldo</span> <span>{formatMoney(balanceOf(order))}</span>
          </p>
        </section>
      )}

      <section className="text-[11px] flex flex-col gap-1">
        {order.warranty_days > 0 && (
          <p>
            <strong>Garantia:</strong> {order.warranty_days} dias a partir da entrega
            {order.warranty_until && ` (até ${formatDate(order.warranty_until)})`}, cobrindo exclusivamente o serviço executado.
          </p>
        )}
        {settings.orders.terms && <p className="whitespace-pre-wrap">{settings.orders.terms}</p>}
      </section>

      <footer className="grid grid-cols-2 gap-10 pt-8 text-center text-[11px]">
        <div className="border-t border-black pt-1">
          Assinatura do cliente
          <br />
          {order.owner?.name}
        </div>
        <div className="border-t border-black pt-1">
          Responsável técnico
          <br />
          {order.technician?.name ?? c.name}
        </div>
      </footer>
    </article>
  )
}

/** Cupom compacto para impressora térmica 80 mm. */
export function ThermalDocument({ order, settings, qrCode, profile = FALLBACK_PROFILE, customFields = [] }: DocProps) {
  const c = settings.company
  const L = profile.labels
  const visit = visitLines(order, profile)
  const showPrices = settings.print.show_prices
  const items = order.items ?? []
  const number = formatOrderNumber(order.number, settings.orders.prefix || "OS")
  const sep = <div className="border-t border-dashed border-black my-1" />

  return (
    <article className="print-area print-thermal mx-auto p-2 shadow-xl border border-zinc-300 font-mono">
      <header className="text-center">
        <p className="font-bold text-[13px] uppercase">{c.name || L.business}</p>
        {c.document && <p>{formatDocument(c.document)}</p>}
        {c.phone && <p>{formatPhone(c.phone)}</p>}
        {companyAddress(c) && <p>{companyAddress(c)}</p>}
      </header>
      {sep}
      <p className="text-center font-bold text-[14px]">{number}</p>
      <p className="text-center">{formatDateTime(order.arrived_at)}</p>
      {sep}
      <p>
        <strong>Cliente:</strong> {order.owner?.name}
      </p>
      {order.owner?.phone && <p>Tel: {formatPhone(order.owner.phone)}</p>}
      {sep}
      {visit.map(([label, value]) => (
        <p key={label}>
          <strong>{label}:</strong> {value}
        </p>
      ))}
      {visit.length > 0 && sep}
      {equipmentLines(order, profile, customFields).map(([label, value]) => (
        <p key={label}>
          <strong>{label}:</strong> {value}
        </p>
      ))}
      <p className="mt-1">
        <strong>{L.description}:</strong> {order.description}
      </p>
      {order.diagnosis && (
        <p>
          <strong>{L.diagnosis}:</strong> {order.diagnosis}
        </p>
      )}
      {order.solution && (
        <p>
          <strong>{L.solution}:</strong> {order.solution}
        </p>
      )}
      {order.due_date && (
        <p>
          <strong>Previsão:</strong> {formatDate(order.due_date)}
        </p>
      )}
      {items.length > 0 && (
        <>
          {sep}
          {items.map((i) => (
            <div key={i.item_id} className="flex justify-between gap-2">
              <span className="min-w-0 break-words">
                {i.quantity}x {i.description}
              </span>
              {showPrices && <span className="shrink-0">{formatMoney(i.total)}</span>}
            </div>
          ))}
        </>
      )}
      {showPrices && (
        <>
          {sep}
          {order.discount > 0 && (
            <p className="flex justify-between">
              <span>Desconto</span>
              <span>-{formatMoney(order.discount)}</span>
            </p>
          )}
          <p className="flex justify-between font-bold text-[13px]">
            <span>TOTAL</span>
            <span>{formatMoney(order.total)}</span>
          </p>
          <p className="flex justify-between">
            <span>Pago</span>
            <span>{formatMoney(order.paid)}</span>
          </p>
          <p className="flex justify-between">
            <span>Saldo</span>
            <span>{formatMoney(balanceOf(order))}</span>
          </p>
        </>
      )}
      {settings.print.show_qrcode && qrCode && (
        <>
          {sep}
          <div className="flex flex-col items-center">
            <img src={qrCode} alt="QR code de acompanhamento" className="w-28 h-28" />
            <p>Acompanhe: {order.tracking_code}</p>
          </div>
        </>
      )}
      {(order.warranty_days > 0 || settings.orders.terms) && sep}
      {order.warranty_days > 0 && <p>Garantia de {order.warranty_days} dias a partir da entrega.</p>}
      {settings.orders.terms && <p className="whitespace-pre-wrap text-[10px]">{settings.orders.terms}</p>}
      <div className="mt-8 border-t border-black text-center pt-1">Assinatura do cliente</div>
    </article>
  )
}
