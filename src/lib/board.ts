import { ORDER_STATUSES, type BoardColumn, type Order, type OrderStatus } from "@/@types/api"
import { STATUS_HEX } from "@/lib/format"
import { useSettings } from "@/lib/hooks"
import { useSegment } from "@/lib/segment"

/** Uma coluna por status, na ordem do fluxo (o quadro de antes e o padrão da API). */
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = ORDER_STATUSES.map((status) => ({
  key: status.toLowerCase(),
  label: "",
  color: "",
  status,
}))

/** Colunas do quadro (Configurações → Quadro) com nome e cor já resolvidos. */
export function useBoardColumns() {
  const { data } = useSettings()
  const { statusLabel } = useSegment()
  const columns = data?.board?.columns?.length ? data.board.columns : DEFAULT_BOARD_COLUMNS

  const labelOf = (col: BoardColumn) => col.label.trim() || statusLabel(col.status)
  const colorOf = (col: BoardColumn) => col.color || STATUS_HEX[col.status]

  /** Coluna onde a OS aparece: a escolhida no quadro ou a primeira do status. */
  function columnOf(order: Pick<Order, "status" | "board_column">) {
    return (
      columns.find((c) => c.key === order.board_column && c.status === order.status) ??
      columns.find((c) => c.status === order.status) ??
      null
    )
  }

  /** Status que não têm coluna: essas OS não aparecem no quadro. */
  const missing: OrderStatus[] = ORDER_STATUSES.filter((s) => !columns.some((c) => c.status === s))

  return { columns, labelOf, colorOf, columnOf, missing }
}
