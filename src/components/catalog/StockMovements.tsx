import { useQuery } from "@tanstack/react-query"
import { History } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Badge, DataTable, EmptyState, Pagination, Spinner } from "@/components/ui"
import { productsService } from "@/services/resources"
import { formatDateTime, formatNumber } from "@/lib/format"
import { MOVEMENT_LABEL } from "./labels"

const PAGE_SIZE = 10

const tone = {
  IN: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  OUT: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  ADJUST: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
}

/** Histórico de entradas/saídas/ajustes de um produto. */
export function StockMovements({ productId, unit }: { productId: number; unit: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["product-movements", productId, page],
    queryFn: () => productsService.movements(productId, { page, page_size: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  return (
    <section className="flex flex-col gap-2 mt-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History size={16} /> Movimentações
      </h3>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="text-sm text-red-500">Não foi possível carregar as movimentações.</p>
      ) : (
        <>
          <DataTable
            rows={data?.data ?? []}
            rowKey={(m) => m.movement_id}
            empty={<EmptyState icon={History} title="Nenhuma movimentação" />}
            columns={[
              { key: "date", header: "Data", render: (m) => <span className="whitespace-nowrap">{formatDateTime(m.created_at)}</span> },
              { key: "type", header: "Tipo", render: (m) => <Badge className={tone[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge> },
              {
                key: "qty",
                header: "Qtd.",
                className: "text-right tabular-nums",
                render: (m) => `${m.type === "OUT" ? "−" : m.type === "IN" ? "+" : "="}${formatNumber(m.quantity)} ${unit}`,
              },
              {
                key: "reason",
                header: "Motivo",
                render: (m) =>
                  m.order_id ? (
                    <Link to={`/ordens/${m.order_id}`} className="underline">
                      {m.reason ?? `OS #${m.order_id}`}
                    </Link>
                  ) : (
                    m.reason ?? "—"
                  ),
              },
              { key: "user", header: "Usuário", hideOnMobile: true, render: (m) => m.user?.name ?? "—" },
            ]}
          />
          {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.meta.total} onChange={setPage} />}
        </>
      )}
    </section>
  )
}
