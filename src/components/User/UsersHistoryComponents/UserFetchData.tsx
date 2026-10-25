import { useInfiniteQuery } from "@tanstack/react-query"
import { Users } from "lucide-react"
import { UsersRendering } from "./UserRendering"
import { clientsService } from "@/services/resources"
import { Button, EmptyState, ErrorState, SkeletonList } from "@/components/ui"
import { useDebounce } from "@/lib/hooks"

interface Props {
  query : string
}

const PAGE_SIZE = 30

export function UserFetch({query} : Props) {
  const q = useDebounce(query.trim(), 300)

  const { isLoading, data, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey : ["UsersHistory", q],
    queryFn : ({ pageParam }) => clientsService.list({ q, page : pageParam, page_size : PAGE_SIZE, sort : 'created_at', order : 'desc' }),
    initialPageParam : 1,
    getNextPageParam : (last) => last.meta.page * last.meta.page_size < last.meta.total ? last.meta.page + 1 : undefined,
  })

  if(isLoading) {
    return <SkeletonList count={6} variant="person" />
  }
  if(isError) {
    return <ErrorState message="Erro ao carregar clientes." onRetry={() => refetch()} />
  }
  const clients = data?.pages.flatMap((p) => p.data) ?? []
  if (clients.length === 0) {
    return <EmptyState icon={Users} title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"} />
  }

  return (
    <>
      <UsersRendering UserHistory={clients} />
      {hasNextPage && (
        <Button size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </>
  )

}
