import { useQuery } from "@tanstack/react-query"
import { LucideIcon, MousePointerClick, Plus } from "lucide-react"
import { ReactNode, useEffect, useState } from "react"
import type { ListParams, Paginated } from "@/@types/api"
import {
  Button,
  Checkbox,
  Column,
  DataTable,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Page,
  PageHeader,
  Pagination,
  Panel,
  SearchInput,
  SplitPane,
} from "@/components/ui"
import { useDebounce } from "@/lib/hooks"
import { cn } from "@/lib/cn"

const PAGE_SIZE = 20

export interface CatalogFormContext<T> {
  /** item em edição (null = novo) */
  selected: T | null
  /** fecha o painel do formulário */
  close: () => void
  /** seleciona um item (ex.: após criar, abre o recém-criado) */
  select: (row: T) => void
}

interface CatalogPageProps<T> {
  storageKey: string
  icon: LucideIcon
  title: string
  subtitle?: ReactNode
  /** primeira parte da query key da lista (ex.: "services") */
  queryKey: string
  fetchList: (params: ListParams) => Promise<Paginated<T>>
  /** filtros extras enviados à API (ex.: { low_stock: true }) */
  extraParams?: ListParams
  columns: Column<T>[]
  rowKey: (row: T) => number
  searchPlaceholder?: string
  /** controles extras na barra de filtros */
  filters?: ReactNode
  /** exibe o filtro "mostrar inativos" (envia active=true quando desmarcado) */
  hasActiveFilter?: boolean
  canCreate: boolean
  newLabel?: string
  formTitle: (selected: T | null) => string
  formIcon?: LucideIcon
  formActions?: (selected: T | null) => ReactNode
  renderForm: (ctx: CatalogFormContext<T>) => ReactNode
  emptyIcon?: LucideIcon
  emptyTitle?: string
}

/**
 * Tela padrão de cadastro: lista pesquisável e paginada à esquerda, formulário do item à direita
 * (divisória arrastável). Usada em Serviços, Produtos, Fornecedores e Usuários.
 */
export function CatalogPage<T>({
  storageKey,
  icon,
  title,
  subtitle,
  queryKey,
  fetchList,
  extraParams,
  columns,
  rowKey,
  searchPlaceholder = "Pesquisar",
  filters,
  hasActiveFilter = true,
  canCreate,
  newLabel = "Novo",
  formTitle,
  formIcon,
  formActions,
  renderForm,
  emptyIcon,
  emptyTitle = "Nenhum registro encontrado",
}: CatalogPageProps<T>) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState<T | null>(null)
  const [creating, setCreating] = useState(false)
  const q = useDebounce(query.trim(), 300)
  const extraKey = JSON.stringify(extraParams ?? {})

  // volta para a primeira página quando o filtro muda
  useEffect(() => setPage(1), [q, showInactive, extraKey])

  const params: ListParams = {
    q,
    page,
    page_size: PAGE_SIZE,
    ...(hasActiveFilter && !showInactive ? { active: true } : {}),
    ...extraParams,
  }

  const list = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => fetchList(params),
    placeholderData: (prev) => prev,
  })

  const selectedId = selected ? rowKey(selected) : null
  const formOpen = creating || selected !== null

  // mantém o item selecionado sincronizado com a lista recarregada
  useEffect(() => {
    if (selectedId === null || !list.data) return
    const fresh = list.data.data.find((r) => rowKey(r) === selectedId)
    if (fresh) setSelected(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data])

  function openNew() {
    setSelected(null)
    setCreating(true)
  }

  function select(row: T) {
    setCreating(false)
    setSelected(row)
  }

  function close() {
    setCreating(false)
    setSelected(null)
  }

  const markedColumns: Column<T>[] = [
    {
      key: "__selected",
      header: <span className="sr-only">Selecionado</span>,
      className: "w-1 px-0",
      render: (row) => (
        <span
          aria-hidden
          className={cn("block w-1 h-6 rounded-full", rowKey(row) === selectedId ? "bg-accent " : "bg-transparent")}
        />
      ),
    },
    ...columns,
  ]

  const left = (
    <section className="w-full h-full min-h-0 flex flex-col">
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={
          canCreate && (
            <Button size="sm" variant="primary" icon={Plus} onClick={openNew}>
              {newLabel}
            </Button>
          )
        }
      />
      <div className="shrink-0 flex flex-wrap items-center gap-2 p-2 pb-0">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} className="flex-1 min-w-48" />
        {filters}
        {hasActiveFilter && (
          <Checkbox label="Mostrar inativos" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
        {list.isLoading ? (
          <ListSkeleton count={3} />
        ) : list.isError ? (
          <ErrorState message="Erro ao carregar a lista." onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              columns={markedColumns}
              rows={list.data?.data ?? []}
              rowKey={rowKey}
              onRowClick={select}
              empty={<EmptyState icon={emptyIcon ?? icon} title={q ? "Nada encontrado para a busca" : emptyTitle} />}
            />
            {list.data && <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.meta.total} onChange={setPage} />}
          </>
        )}
      </div>
    </section>
  )

  const right = (
    <section className="w-full h-full min-h-0 overflow-y-auto p-2">
      {formOpen ? (
        <Panel title={formTitle(selected)} icon={formIcon} actions={formActions?.(selected)} className="m-0">
          <div key={creating ? "new" : String(selectedId)}>{renderForm({ selected, close, select })}</div>
        </Panel>
      ) : (
        <EmptyState
          icon={MousePointerClick}
          title="Selecione um item da lista"
          description={canCreate ? "Ou cadastre um novo registro." : "Você tem acesso somente para consulta."}
          action={
            canCreate && (
              <Button size="sm" icon={Plus} onClick={openNew}>
                {newLabel}
              </Button>
            )
          }
        />
      )}
    </section>
  )

  return (
    <Page>
      <SplitPane storageKey={storageKey} defaultSize={58} minLeft={320} minRight={340} left={left} right={right} />
    </Page>
  )
}
