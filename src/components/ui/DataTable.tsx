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
    <div className="w-full overflow-x-auto rounded-md border border-zinc-300 dark:border-zinc-800">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-zinc-200 dark:bg-zinc-800/80 text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("px-2 py-1.5 font-semibold whitespace-nowrap", c.hideOnMobile && "hidden md:table-cell", c.className)}
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
                "border-t border-zinc-300 dark:border-zinc-800",
                onRowClick &&
                  "cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 focus:outline-none focus:bg-zinc-200 dark:focus:bg-zinc-800/80",
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-1.5 align-middle", c.hideOnMobile && "hidden md:table-cell", c.className)}>
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
  "p-1 rounded-md border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">
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
