import { useQuery } from "@tanstack/react-query"
import { CalendarClock, MessageCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Bone, EmptyState, IconButton, Panel } from "@/components/ui"
import { openExternal, whatsappLink } from "@/components/orders/orderUtils"
import { cn } from "@/lib/cn"
import { formatDate, toDateInput } from "@/lib/format"
import { useSegment } from "@/lib/segment"
import { certificatesService, type CertificateListItem } from "@/services/resources"

const DAY = 86_400_000

/** Lembrete pelo WhatsApp: a próxima limpeza/manutenção está chegando. */
function reminder(c: CertificateListItem, company?: string) {
  const first = (c.client_name ?? c.client.name).split(" ")[0]
  const what = c.type === "HIGIENIZACAO" ? "higienização" : "manutenção preventiva"
  const units = c.equipment.map((e) => e.ambiente || e.device).join(", ")
  return [
    `Olá, ${first}! A próxima ${what} do seu ar-condicionado (${units}) está prevista para ${formatDate(c.next_service_at)}.`,
    "Quer agendar a visita?",
    company ?? "",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Próximas manutenções (certificados com próximo serviço nos próximos 30 dias ou atrasados há até 60). */
export function UpcomingMaintenance() {
  const navigate = useNavigate()
  const { settings } = useSegment()
  const today = new Date()
  const { data, isLoading } = useQuery({
    queryKey: ["certificates", "upcoming", toDateInput(today)],
    queryFn: () =>
      certificatesService.list({
        due_from: new Date(today.getTime() - 60 * DAY).toISOString(),
        due_to: new Date(today.getTime() + 30 * DAY).toISOString(),
        status: "VALIDO",
        page_size: 10,
      }),
    staleTime: 5 * 60_000,
  })

  const rows = data?.data ?? []

  return (
    <Panel title="Próximas manutenções" icon={CalendarClock} bodyClassName="p-2">
      {isLoading ? (
        <div className="flex flex-col gap-2 p-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nada previsto nos próximos 30 dias" description="As datas vêm dos certificados emitidos." />
      ) : (
        <ul className="flex flex-col">
          {rows.map((c) => {
            const late = c.next_service_at && new Date(c.next_service_at).getTime() < today.getTime()
            const phone = c.client_phone ?? c.client.phone
            return (
              <li key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover">
                <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/ordens/${c.order_id}`)}>
                  <p className="text-sm font-medium truncate">{c.client_name ?? c.client.name}</p>
                  <p className="text-[13px] text-muted truncate">
                    {c.title} · {c.equipment.map((e) => e.ambiente || e.device).join(", ")}
                  </p>
                </button>
                <span className={cn("text-[13px] tabular-nums whitespace-nowrap", late ? "text-danger font-medium" : "text-muted")}>
                  {formatDate(c.next_service_at)}
                </span>
                {phone && (
                  <IconButton
                    icon={MessageCircle}
                    label="Lembrar o cliente pelo WhatsApp"
                    onClick={() => openExternal(whatsappLink(phone, reminder(c, settings?.company.name)))}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
