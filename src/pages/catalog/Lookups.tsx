import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Check, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react"
import { FormEvent, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { LOOKUP_KINDS, Lookup, LookupKind } from "@/@types/api"
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  inputClass,
  ListSkeleton,
  Page,
  PageBody,
  PageHeader,
  Tabs,
} from "@/components/ui"
import { lookupsService } from "@/services/resources"
import { useHasRole } from "@/contexts/Auth-context"
import { LOOKUP_LABEL } from "@/lib/format"
import { cn } from "@/lib/cn"

const HINTS: Record<LookupKind, string> = {
  DEVICE_TYPE: "Aparecem no campo “Tipo de equipamento” da nova OS e agrupam os gráficos do dashboard e das falhas.",
  BRAND: "Sugestões do campo “Marca” na abertura da OS; usadas no ranking de marcas e no mapeamento de falhas.",
  PAYMENT_METHOD: "Opções ao registrar um pagamento na OS e no relatório de faturamento.",
  FAILURE_REASON: "Motivos ao registrar uma falha de entrega ou retorno — alimentam o mapeamento de falhas.",
  ACCESSORY: "Sugestões do campo “Acessórios entregues” (carregador, capa, cabo...).",
  CHECKLIST: "Itens conferidos na entrada do equipamento (liga, tela, botões, câmera...).",
}

function LookupRow({
  item,
  canWrite,
  isFirst,
  isLast,
  onMove,
  onDelete,
}: {
  item: Lookup
  canWrite: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)

  const update = useMutation({
    mutationFn: (data: Partial<Lookup>) => lookupsService.update(item.lookup_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups", item.kind] })
      setEditing(false)
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed === item.name) return setEditing(false)
    update.mutate({ name: trimmed })
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2 p-1 px-2 border border-line  rounded-md transition duration-200",
        !item.active && "opacity-60",
      )}
    >
      {editing ? (
        <form onSubmit={submit} className="flex-1 flex items-center gap-1">
          <input
            autoFocus
            aria-label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setName(item.name)
                setEditing(false)
              }
            }}
            maxLength={80}
            className={inputClass}
          />
          <IconButton icon={Check} label="Salvar" type="submit" disabled={update.isPending} />
          <IconButton
            icon={X}
            label="Cancelar"
            onClick={() => {
              setName(item.name)
              setEditing(false)
            }}
          />
        </form>
      ) : (
        <span className={cn("flex-1 truncate", !item.active && "line-through")}>{item.name}</span>
      )}
      {canWrite && !editing && (
        <>
          <label className="flex items-center gap-1 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-accent "
              checked={item.active}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ active: e.target.checked })}
            />
            ativo
          </label>
          <IconButton icon={ArrowUp} label="Mover para cima" disabled={isFirst} onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} label="Mover para baixo" disabled={isLast} onClick={() => onMove(1)} />
          <IconButton icon={Pencil} label="Renomear" onClick={() => setEditing(true)} />
          <IconButton icon={Trash2} label="Excluir" tone="danger" onClick={onDelete} />
        </>
      )}
    </li>
  )
}

function LookupList({ kind, canWrite }: { kind: LookupKind; canWrite: boolean }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [toDelete, setToDelete] = useState<Lookup | null>(null)

  // lista completa (inclusive inativos); useLookups() nos formulários filtra só os ativos
  const list = useQuery({ queryKey: ["lookups", kind, "all"], queryFn: () => lookupsService.list(kind) })
  const items = [...(list.data ?? [])].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "pt-BR"))
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["lookups", kind] })

  const create = useMutation({
    mutationFn: (value: string) =>
      lookupsService.create({ kind, name: value, sort: items.length ? Math.max(...items.map((i) => i.sort)) + 10 : 10 }),
    onSuccess: () => {
      invalidate()
      setName("")
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => lookupsService.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success("Item excluído.")
      setToDelete(null)
    },
  })

  // reordenar: renumera 10, 20, 30... e envia apenas o que mudou
  const reorder = useMutation({
    mutationFn: async (ordered: Lookup[]) => {
      const changes = ordered
        .map((item, index) => ({ item, sort: (index + 1) * 10 }))
        .filter(({ item, sort }) => item.sort !== sort)
      await Promise.all(changes.map(({ item, sort }) => lookupsService.update(item.lookup_id, { sort })))
    },
    onSettled: invalidate,
  })

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const ordered = [...items]
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    // otimista: reflete na tela antes da resposta
    queryClient.setQueryData<Lookup[]>(["lookups", kind, "all"], ordered.map((item, i) => ({ ...item, sort: (i + 1) * 10 })))
    reorder.mutate(ordered)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning("Já existe um item com esse nome.")
      return
    }
    create.mutate(trimmed)
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <p className="text-sm text-muted border border-line  rounded-md p-2">{HINTS[kind]}</p>
      {canWrite && (
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor={`new-${kind}`} className="sr-only">
            Novo item
          </label>
          <input
            id={`new-${kind}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adicionar item..."
            maxLength={80}
            className={inputClass}
          />
          <Button type="submit" icon={Plus} loading={create.isPending} disabled={!name.trim()}>
            Adicionar
          </Button>
        </form>
      )}
      {list.isLoading ? (
        <ListSkeleton count={2} />
      ) : list.isError ? (
        <ErrorState message="Erro ao carregar os itens." onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhum item cadastrado" />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <LookupRow
              key={item.lookup_id}
              item={item}
              canWrite={canWrite}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onMove={(dir) => move(index, dir)}
              onDelete={() => setToDelete(item)}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir “${toDelete?.name ?? ""}”?`}
        description="Registros antigos que usam este nome continuam com o texto salvo. Para apenas esconder das seleções, desmarque “ativo”."
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.lookup_id)
        }}
      />
    </div>
  )
}

export default function Lookups() {
  const canWrite = useHasRole("ATENDENTE")
  const [params, setParams] = useSearchParams()
  const kindParam = params.get("tipo") as LookupKind | null
  const kind: LookupKind = kindParam && LOOKUP_KINDS.includes(kindParam) ? kindParam : "DEVICE_TYPE"

  return (
    <Page>
      <PageHeader icon={ListChecks} title="Cadastros auxiliares" subtitle="Listas usadas nos formulários e relatórios" />
      <Tabs
        tabs={LOOKUP_KINDS.map((k) => ({ key: k, label: LOOKUP_LABEL[k] }))}
        value={kind}
        onChange={(k) => setParams({ tipo: k }, { replace: true })}
      />
      <PageBody>
        <LookupList key={kind} kind={kind} canWrite={canWrite} />
      </PageBody>
    </Page>
  )
}
