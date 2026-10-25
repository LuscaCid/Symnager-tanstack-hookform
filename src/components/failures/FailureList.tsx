import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Clock, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { FAILURE_CATEGORIES, type DeliveryFailure, type FailureCategory } from "@/@types/api"
import { failuresService } from "@/services/resources"
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  IconButton,
  ListSkeleton,
  Modal,
  Pagination,
  SearchInput,
  SelectField,
  TextAreaField,
} from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { useDebounce } from "@/lib/hooks"
import { FAILURE_CATEGORY_LABEL, formatDateTime, formatOrderNumber, formatRelative } from "@/lib/format"

const PAGE_SIZE = 15

interface Props {
  params: { from: string; to: string }
  /** filtro de categoria controlado externamente (clique no gráfico) */
  category: FailureCategory | ""
  onCategoryChange: (c: FailureCategory | "") => void
  q: string
  onQChange: (q: string) => void
}

export function FailureList({ params, category, onCategoryChange, q, onQChange }: Props) {
  const queryClient = useQueryClient()
  const isAdmin = useHasRole()
  const [resolved, setResolved] = useState<"" | "true" | "false">("")
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState<DeliveryFailure | null>(null)
  const [resolution, setResolution] = useState("")
  const [deleting, setDeleting] = useState<DeliveryFailure | null>(null)
  const search = useDebounce(q.trim(), 300)

  const listParams = { ...params, category, resolved, q: search, page, page_size: PAGE_SIZE }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["failures", "list", listParams],
    queryFn: () => failuresService.list(listParams),
    placeholderData: (prev) => prev,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["failures"] })

  const resolve = useMutation({
    mutationFn: () => failuresService.update(resolving!.failure_id, { resolved: true, resolution: resolution.trim() }),
    onSuccess: () => {
      toast.success("Falha marcada como resolvida.")
      setResolving(null)
      setResolution("")
      invalidate()
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })

  const reopen = useMutation({
    mutationFn: (f: DeliveryFailure) => failuresService.update(f.failure_id, { resolved: false }),
    onSuccess: () => {
      toast.success("Falha reaberta.")
      invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: () => failuresService.remove(deleting!.failure_id),
    onSuccess: () => {
      toast.success("Registro excluído.")
      setDeleting(null)
      invalidate()
    },
  })

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    setPage(1)
    fn(v)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_12rem_10rem] gap-2 items-end">
        <SearchInput value={q} onChange={resetPage(onQChange)} placeholder="Buscar por nº da OS, cliente, motivo..." />
        <SelectField
          label="Categoria"
          hideLabel
          value={category}
          onChange={(e) => resetPage(onCategoryChange)(e.target.value as FailureCategory | "")}
        >
          <option value="">Todas as categorias</option>
          {FAILURE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FAILURE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Situação" hideLabel value={resolved} onChange={(e) => resetPage(setResolved)(e.target.value as typeof resolved)}>
          <option value="">Todas</option>
          <option value="false">Em aberto</option>
          <option value="true">Resolvidas</option>
        </SelectField>
      </div>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : isError ? (
        <ErrorState message="Erro ao carregar as falhas." onRetry={() => refetch()} />
      ) : (
        <>
          <DataTable
            rows={data?.data ?? []}
            rowKey={(f) => f.failure_id}
            empty={<EmptyState icon={AlertTriangle} title="Nenhuma falha encontrada" description="Registre falhas pela tela da ordem de serviço." />}
            columns={[
              {
                key: "os",
                header: "OS",
                render: (f) => (
                  <Link to={`/ordens/${f.order_id}`} className="font-mono font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                    {f.order ? formatOrderNumber(f.order.number) : `#${f.order_id}`}
                  </Link>
                ),
              },
              {
                key: "client",
                header: "Cliente / equipamento",
                render: (f) => (
                  <span className="block min-w-0">
                    <strong className="block truncate">{f.order?.owner.name ?? "—"}</strong>
                    <span className="text-xs text-zinc-500 truncate block">{f.order?.device}</span>
                  </span>
                ),
              },
              { key: "category", header: "Categoria", hideOnMobile: true, render: (f) => <Badge>{FAILURE_CATEGORY_LABEL[f.category] ?? f.category}</Badge> },
              {
                key: "reason",
                header: "Motivo",
                render: (f) => (
                  <span className="block" title={f.description ?? undefined}>
                    {f.reason}
                    {f.resolution && <span className="block text-xs text-zinc-500 truncate max-w-xs">↳ {f.resolution}</span>}
                  </span>
                ),
              },
              {
                key: "date",
                header: "Ocorrência",
                hideOnMobile: true,
                render: (f) => <span title={formatDateTime(f.occurred_at)}>{formatRelative(f.occurred_at)}</span>,
              },
              {
                key: "status",
                header: "Situação",
                render: (f) =>
                  f.resolved ? (
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                      <CheckCircle2 size={12} /> Resolvida
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      <Clock size={12} /> Em aberto
                    </Badge>
                  ),
              },
              {
                key: "actions",
                header: <span className="sr-only">Ações</span>,
                className: "text-right whitespace-nowrap",
                render: (f) => (
                  <span className="inline-flex items-center gap-1">
                    {f.resolved ? (
                      <Button size="sm" variant="ghost" loading={reopen.isPending && reopen.variables?.failure_id === f.failure_id} onClick={() => reopen.mutate(f)}>
                        Reabrir
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        icon={CheckCircle2}
                        onClick={() => {
                          setResolution("")
                          setResolving(f)
                        }}
                      >
                        Resolver
                      </Button>
                    )}
                    {isAdmin && <IconButton icon={Trash2} label="Excluir registro" tone="danger" onClick={() => setDeleting(f)} />}
                  </span>
                ),
              },
            ]}
          />
          {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.meta.total} onChange={setPage} />}
        </>
      )}

      <Modal
        open={!!resolving}
        onOpenChange={(o) => !o && setResolving(null)}
        title="Resolver falha"
        description={resolving ? `${resolving.order ? formatOrderNumber(resolving.order.number) : ""} · ${resolving.reason}` : undefined}
        footer={
          <>
            <Button onClick={() => setResolving(null)}>Cancelar</Button>
            <Button variant="primary" icon={CheckCircle2} loading={resolve.isPending} disabled={resolution.trim().length < 3} onClick={() => resolve.mutate()}>
              Marcar como resolvida
            </Button>
          </>
        }
      >
        {resolving?.description && <p className="text-sm mb-2 text-zinc-600 dark:text-zinc-400">{resolving.description}</p>}
        <TextAreaField
          label="O que foi feito para resolver?"
          placeholder="Ex.: aparelho refeito em garantia, peça trocada, nova entrega agendada..."
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          autoFocus
          maxLength={2000}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir registro de falha?"
        description="O registro sai das estatísticas. Prefira marcar como resolvida para manter o histórico."
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
