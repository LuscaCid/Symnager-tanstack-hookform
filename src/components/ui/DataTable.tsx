import { ChevronLeft, ChevronRight } from "lucide-react"
import { ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  /** esconde a coluna em telas pequenas */
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  empty?: ReactNode
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead className="text-left text-xs text-muted border-b border-line">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("px-3 py-2.5 font-medium whitespace-nowrap", c.hideOnMobile && "hidden md:table-cell", c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
              className={cn(
                "border-t border-line first:border-t-0",
                onRowClick &&
                  "cursor-pointer hover:bg-hover/60 transition-colors duration-100 focus:outline-none focus:bg-hover/60",
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

const pagerButton =
  "h-8 w-8 inline-flex items-center justify-center rounded-lg border border-line bg-surface shadow-sm hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 py-3 text-[13px] text-muted">
      <span>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)} className={pagerButton}>
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <button aria-label="Próxima página" disabled={page >= pages} onClick={() => onChange(page + 1)} className={pagerButton}>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
