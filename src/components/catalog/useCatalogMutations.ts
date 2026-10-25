import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface Options<T, I> {
  /** primeira parte da query key da lista (ex.: "services") — invalidada após salvar/remover */
  queryKey: string
  /** rótulo no singular para as mensagens ("Serviço") */
  label: string
  create: (data: I) => Promise<T>
  update: (id: number, data: Partial<I>) => Promise<T>
  remove?: (id: number) => Promise<unknown>
  /** query keys extras a invalidar (ex.: ["lookups"]) */
  alsoInvalidate?: string[]
}

/** Salvar (criar/atualizar) e desativar itens de cadastro com toasts e invalidação padronizados. */
export function useCatalogMutations<T, I>({ queryKey, label, create, update, remove, alsoInvalidate = [] }: Options<T, I>) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    for (const key of [queryKey, ...alsoInvalidate]) queryClient.invalidateQueries({ queryKey: [key] })
  }

  const save = useMutation({
    mutationFn: ({ id, data }: { id: number | null; data: I }) => (id ? update(id, data) : create(data)),
    onSuccess: (_saved, vars) => {
      invalidate()
      toast.success(vars.id ? `${label} atualizado.` : `${label} cadastrado.`)
    },
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => {
      if (!remove) throw new Error("Remoção indisponível")
      return remove(id)
    },
    onSuccess: () => {
      invalidate()
      toast.success(`${label} desativado.`)
    },
  })

  return { save, deactivate }
}
