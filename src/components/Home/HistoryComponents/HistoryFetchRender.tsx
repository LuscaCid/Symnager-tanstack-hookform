import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"
import { HistoryRender } from "./HistoryRendering"
import { ordersService } from "@/services/resources"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui"
import { useDebounce } from "@/lib/hooks"

interface Props {
  query : string
}

export function HistoryFetchAndRendering({query} : Props) {
  const q = useDebounce(query.trim(), 300)

  // a busca é feita no servidor (descrição, equipamento, cliente, número, código de rastreio)
  const {isLoading, data, isError, refetch } = useQuery({
    queryFn : () => ordersService.list({ q, page_size : 40, sort : 'arrived_at', order : 'desc' }),
    queryKey : ["history", q],
    placeholderData : (previous) => previous,
  })

  if(isLoading) {
    return <ListSkeleton />
  }
  if(isError) {
    return <ErrorState message="Erro ao carregar o histórico." onRetry={() => refetch()} />
  }
  if(!data || data.data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={q ? "Nenhuma OS encontrada" : "Nenhuma OS cadastrada"}
        description={q ? "Tente outro termo de busca." : "Crie a primeira ordem de serviço no formulário ao lado."}
      />
    )
  }

  return (
    <HistoryRender JobsHistory={data.data} />
  )

}
