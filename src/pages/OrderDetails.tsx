import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { OrderDetailsSkeleton } from "@/components/skeletons/PageSkeletons"
import axios from "axios"
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Copy,
  History,
  MessageCircle,
  Printer,
  ShieldCheck,
  ShieldX,
  Trash2,
  User,
  Wallet,
  Wrench,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Page,
  PageHeader,
  PriorityBadge,
  SplitPane,
  StatusBadge,
  Tabs,
  Tooltip,
} from "@/components/ui"
import { OrderDataForm } from "@/components/orders/OrderDataForm"
import { OrderItemsTab } from "@/components/orders/OrderItemsTab"
import { OrderPaymentsTab } from "@/components/orders/OrderPaymentsTab"
import { OrderHistoryTab } from "@/components/orders/OrderHistoryTab"
import { OrderFailuresTab } from "@/components/orders/OrderFailuresTab"
import { StatusMenu } from "@/components/orders/StatusMenu"
import { useStatusChange } from "@/components/orders/useStatusChange"
import { balanceOf, isFinal, isOverdue, openExternal, warrantyInfo, whatsappLink, whatsappMessage } from "@/components/orders/orderUtils"
import { useHasRole } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { formatDate, formatDateTime, formatDocument, formatMoney, formatOrderNumber, formatPhone } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { ordersService } from "@/services/resources"

type TabKey = "itens" | "pagamentos" | "historico" | "falhas"

export default function OrderDetails() {
  const { id } = useParams()
  const orderId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const settings = useSettings()
  const isAdmin = useHasRole()
  const [tab, setTab] = useState<TabKey>("itens")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { request, dialog, isPending: changingStatus } = useStatusChange()

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId),
    enabled: Number.isFinite(orderId),
  })

  const deletion = useMutation({
    mutationFn: () => ordersService.remove(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["history"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.removeQueries({ queryKey: ["order", orderId] })
      toast.success("OS excluída.")
      navigate("/ordens", { replace: true })
    },
  })

  if (isLoading) return <OrderDetailsSkeleton />
  if (isError || !order) {
    const notFound = axios.isAxiosError(error) && error.response?.status === 404
    return (
      <div className="w-full">
        {notFound ? (
          <EmptyState
            icon={ClipboardList}
            title="OS não encontrada"
            action={<Button onClick={() => navigate("/ordens")}>Ver ordens de serviço</Button>}
          />
        ) : (
          <ErrorState message="Não foi possível carregar a OS." onRetry={() => refetch()} />
        )}
      </div>
    )
  }

  const prefix = settings.data?.orders.prefix || "OS"
  const number = formatOrderNumber(order.number, prefix)
  const final = isFinal(order.status)
  const readOnly = final && !isAdmin
  const balance = balanceOf(order)
  const warranty = warrantyInfo(order)
  const overdue = isOverdue(order)
  const failuresOpen = (order.failures ?? []).filter((f) => !f.resolved).length

  function notifyClient() {
    if (!order!.owner?.phone) {
      toast.error("O cliente não tem telefone cadastrado.")
      return
    }
    openExternal(whatsappLink(order!.owner.phone, whatsappMessage(order!, settings.data?.company.name)))
  }

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(order!.tracking_code)
      toast.success("Código de rastreio copiado.")
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  return (
    <Page>
      <PageHeader
        icon={ClipboardList}
        title={`${number} · ${order.device}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            Entrada {formatDateTime(order.arrived_at)}
            {order.created_by && <span>por {order.created_by.name}</span>}
          </span>
        }
        actions={
          <>
            <IconButton icon={ArrowLeft} label="Voltar" onClick={() => navigate(-1)} />
            <StatusMenu order={order} onSelect={(s) => request(order, s)} disabled={changingStatus} />
            <Button size="sm" icon={MessageCircle} onClick={notifyClient} tooltip="Enviar mensagem pelo WhatsApp">
              Avisar cliente
            </Button>
            <Button size="sm" variant="primary" icon={Printer} onClick={() => navigate(`/ordens/${order.order_id}/imprimir`)}>
              Imprimir
            </Button>
            {isAdmin && <IconButton icon={Trash2} label="Excluir OS" tone="danger" onClick={() => setConfirmDelete(true)} />}
          </>
        }
      />

      {/* faixa de resumo */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 pb-3 border-b border-line text-sm">
        <StatusBadge status={order.status} />
        <PriorityBadge priority={order.priority} />
        <Tooltip content={[order.owner?.phone && formatPhone(order.owner.phone), order.owner?.document && formatDocument(order.owner.document)].filter(Boolean).join(" · ")}>
          <Link to={`/clientes/${order.owner_id}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
            <User size={14} /> {order.owner?.name ?? "Cliente"}
          </Link>
        </Tooltip>
        {order.owner?.phone && <span className="text-muted ">{formatPhone(order.owner.phone)}</span>}
        <Tooltip content="Copiar código de rastreio">
          <button
            onClick={copyTracking}
            className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded-md border border-line hover:bg-hover transition-colors"
          >
            {order.tracking_code} <Copy size={12} />
          </button>
        </Tooltip>
        {order.due_date && !final && (
          <span className={cn("inline-flex items-center gap-1", overdue ? "text-red-500 font-semibold" : "text-muted ")}>
            {overdue && <AlertTriangle size={14} />} Previsão {formatDate(order.due_date)}
          </span>
        )}
        {warranty &&
          (warranty.active ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
              <ShieldCheck size={12} /> Em garantia até {formatDate(warranty.until)}
            </Badge>
          ) : (
            <Badge>
              <ShieldX size={12} /> Garantia expirou em {formatDate(warranty.until)}
            </Badge>
          ))}
        {failuresOpen > 0 && (
          <button onClick={() => setTab("falhas")}>
            <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
              <AlertTriangle size={12} /> {failuresOpen} falha(s) em aberto
            </Badge>
          </button>
        )}
        <span className="ml-auto flex items-center gap-3 tabular-nums">
          <span>
            Total <strong>{formatMoney(order.total)}</strong>
          </span>
          <span className={cn(balance > 0 ? "text-red-500" : "text-green-600 dark:text-green-400")}>
            Saldo <strong>{formatMoney(balance)}</strong>
          </span>
        </span>
      </div>

      {readOnly && (
        <p className="shrink-0 px-4 py-2 text-xs bg-subtle text-muted">
          Esta OS está {order.status === "ENTREGUE" ? "entregue" : "cancelada"} e só pode ser alterada por um administrador. Comentários e
          falhas continuam liberados.
        </p>
      )}

      <div className="flex-1 min-h-0">
        <SplitPane
          storageKey="os-detalhes"
          defaultSize={50}
          minLeft={320}
          minRight={360}
          left={
            <div className="h-full overflow-y-auto">
              <OrderDataForm order={order} readOnly={readOnly} />
            </div>
          }
          right={
            <div className="h-full flex flex-col min-h-0">
              <Tabs<TabKey>
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "itens", label: `Itens (${order.items?.length ?? 0})`, icon: Wrench },
                  { key: "pagamentos", label: "Pagamentos", icon: Wallet },
                  { key: "historico", label: "Histórico", icon: History },
                  { key: "falhas", label: `Falhas${order.failures?.length ? ` (${order.failures.length})` : ""}`, icon: AlertTriangle },
                ]}
              />
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                {tab === "itens" && <OrderItemsTab order={order} readOnly={readOnly} />}
                {tab === "pagamentos" && <OrderPaymentsTab order={order} readOnly={readOnly} />}
                {tab === "historico" && <OrderHistoryTab order={order} />}
                {tab === "falhas" && <OrderFailuresTab order={order} />}
              </div>
            </div>
          }
        />
      </div>

      {dialog}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir ${number}?`}
        description="A OS, seus itens, pagamentos e histórico serão apagados definitivamente e as peças voltam ao estoque. Prefira cancelar a OS se quiser manter o registro."
        confirmLabel="Excluir definitivamente"
        loading={deletion.isPending}
        onConfirm={() => deletion.mutate()}
      />
    </Page>
  )
}
