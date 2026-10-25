import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ClientDetailsSkeleton } from "@/components/skeletons/PageSkeletons"
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2, Wallet, CalendarClock, Wrench } from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { clientsService } from "@/services/resources"
import { ClientForm } from "@/components/User/ClientForm"
import { HistoryBox } from "@/components/Home/HistoryComponents/HistoryBox"
import { Button, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, PageHeader, Pagination, SplitPane, StatCard, SkeletonList } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { formatDocument, formatMoney, formatPhone, formatRelative } from "@/lib/format"

export default function ClientDetails () {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { id } = useParams()
    const clientId = Number(id)
    const [page, setPage] = useState(1)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const canDelete = useHasRole('ATENDENTE')

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey : ["client", clientId],
        queryFn : () => clientsService.get(clientId),
        enabled : Number.isFinite(clientId),
    })

    const orders = useQuery({
        queryKey : ["client", clientId, "orders", page],
        queryFn : () => clientsService.orders(clientId, { page, page_size : 10 }),
        enabled : Number.isFinite(clientId),
        placeholderData : (prev) => prev,
    })

    const deletion = useMutation({
        mutationFn : () => clientsService.remove(clientId),
        onSuccess : () => {
            queryClient.invalidateQueries({ queryKey : ["UsersHistory"] })
            toast.success("Cliente removido.")
            navigate('/clientes')
        },
    })

    if(isLoading) {
        return <ClientDetailsSkeleton />
    }
    if(isError || !data) {
        return (
            <div className="w-full">
                <ErrorState message="Não foi possível carregar o cliente." onRetry={() => refetch()} />
            </div>
        )
    }

    const newOrderLink = `/recepcao?client=${data.client_id}&name=${encodeURIComponent(data.name)}`

    return (
        <Page>
            <PageHeader
                icon={Pencil}
                title={data.name}
                subtitle={[formatPhone(data.phone), data.document && formatDocument(data.document), data.email].filter(Boolean).join(' · ')}
                actions={
                    <>
                        <IconButton icon={ArrowLeft} label="Voltar" onClick={() => navigate(-1)} />
                        <Button size="sm" variant="primary" icon={Plus} onClick={() => navigate(newOrderLink)}>Nova OS</Button>
                        {canDelete && (
                            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Deletar</Button>
                        )}
                    </>
                }
            />
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-4">
                <StatCard icon={ClipboardList} label="Ordens de serviço" value={data.stats?.orders_total ?? data._count?.orders ?? 0} />
                <StatCard icon={Wrench} label="Em aberto" value={data.stats?.orders_open ?? 0} tone={data.stats?.orders_open ? 'warning' : undefined} />
                <StatCard icon={Wallet} label="Total gasto" value={formatMoney(data.stats?.total_spent)} />
                <StatCard icon={CalendarClock} label="Última OS" value={data.stats?.last_order_at ? formatRelative(data.stats.last_order_at) : '—'} />
            </div>
            <div className="flex-1 min-h-0 border-t border-line ">
                <SplitPane
                    storageKey="cliente-detalhes"
                    defaultSize={55}
                    left={
                        <div className="h-full overflow-y-auto p-4">
                            <h2 className="text-sm font-semibold mb-3">Editar dados</h2>
                            <ClientForm client={data} submitLabel="Salvar alterações" />
                        </div>
                    }
                    right={
                        <div className="h-full flex flex-col min-h-0">
                            <h2 className="shrink-0 px-4 pt-4 text-sm font-semibold">Histórico de OS</h2>
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-2">
                                {orders.isLoading ? <SkeletonList count={3} /> :
                                 orders.data && orders.data.data.length > 0 ? (
                                    orders.data.data.map((order) => <HistoryBox key={order.order_id} order={order} />)
                                 ) : (
                                    <EmptyState
                                        icon={ClipboardList}
                                        title="Nenhuma OS para este cliente"
                                        action={<Button size="sm" icon={Plus} onClick={() => navigate(newOrderLink)}>Abrir a primeira</Button>}
                                    />
                                 )}
                                {orders.data && (
                                    <Pagination page={page} pageSize={10} total={orders.data.meta.total} onChange={setPage} />
                                )}
                            </div>
                        </div>
                    }
                />
            </div>
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Remover cliente?"
                description="O cliente deixa de aparecer nas buscas, mas as ordens de serviço antigas continuam guardadas."
                confirmLabel="Remover"
                loading={deletion.isPending}
                onConfirm={() => deletion.mutate()}
            />
        </Page>
    )
}
