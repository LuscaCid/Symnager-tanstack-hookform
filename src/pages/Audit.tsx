import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react"
import { Fragment, useEffect, useState } from "react"
import type { AuditLog } from "@/@types/api"
import { EmptyState, ErrorState, Page, PageBody, PageHeader, Pagination, SearchInput, SkeletonTable } from "@/components/ui"
import { auditService } from "@/services/resources"
import { useDebounce } from "@/lib/hooks"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/cn"

const PAGE_SIZE = 30

/** A API devolve meta já como objeto (versões antigas mandavam o JSON em texto). */
function prettyMeta(meta: AuditLog["meta"]): string | null {
  if (meta == null || meta === "") return null
  if (typeof meta !== "string") return JSON.stringify(meta, null, 2)
  try {
    return JSON.stringify(JSON.parse(meta), null, 2)
  } catch {
    return meta
  }
}

/** Ações em vermelho quando envolvem segurança/remoção. */
function actionTone(action: string) {
  const a = action.toUpperCase()
  if (/(DELETE|REMOVE|RESTORE|LOCK|FAIL|REVOKE)/.test(a)) return "text-red-600 dark:text-red-400"
  if (/(LOGIN|LOGOUT|PASSWORD|SETUP)/.test(a)) return "text-amber-700 dark:text-amber-400"
  return ""
}

function AuditRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  const meta = prettyMeta(log.meta)
  return (
    <Fragment>
      <tr
        onClick={meta ? onToggle : undefined}
        className={cn(
          "border-t border-line ",
          meta && "cursor-pointer hover:bg-hover  transition duration-200",
        )}
      >
        <td className="px-2 py-1.5 w-6">
          {meta && (
            <button
              aria-label={expanded ? "Ocultar detalhes" : "Mostrar detalhes"}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              className="p-0.5 rounded hover:bg-hover "
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">{formatDateTime(log.created_at)}</td>
        <td className="px-2 py-1.5">{log.user?.name ?? <span className="text-faint">sistema</span>}</td>
        <td className={cn("px-2 py-1.5 font-mono text-xs font-semibold", actionTone(log.action))}>{log.action}</td>
        <td className="px-2 py-1.5 hidden md:table-cell">
          {log.entity}
          {log.entity_id && <span className="text-faint"> #{log.entity_id}</span>}
        </td>
        <td className="px-2 py-1.5 hidden md:table-cell font-mono text-xs text-faint">{log.ip ?? "—"}</td>
      </tr>
      {expanded && meta && (
        <tr className="bg-subtle/60 ">
          <td />
          <td colSpan={5} className="px-2 py-2">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">{meta}</pre>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export default function Audit() {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const q = useDebounce(query.trim(), 300)

  useEffect(() => setPage(1), [q])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit", q, page],
    queryFn: () => auditService.list({ q, page, page_size: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  return (
    <Page>
      <PageHeader icon={ShieldCheck} title="Auditoria" subtitle="Registro de acessos e ações sensíveis no sistema" />
      <PageBody className="flex flex-col gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar por ação, entidade, usuário ou IP" />
        {isLoading ? (
          <SkeletonTable rows={10} cols={[0.3, 1.5, 1.5, 2, 1.5, 1]} />
        ) : isError ? (
          <ErrorState message="Erro ao carregar a auditoria." onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nenhum registro encontrado" />
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-md border border-line ">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-subtle text-left">
                  <tr>
                    <th scope="col" className="px-2 py-1.5">
                      <span className="sr-only">Detalhes</span>
                    </th>
                    <th scope="col" className="px-2 py-1.5 font-semibold">Data</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold">Usuário</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold">Ação</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold hidden md:table-cell">Entidade</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold hidden md:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((log) => (
                    <AuditRow
                      key={log.audit_id}
                      log={log}
                      expanded={expanded === log.audit_id}
                      onToggle={() => setExpanded((cur) => (cur === log.audit_id ? null : log.audit_id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.meta.total} onChange={setPage} />
          </>
        )}
      </PageBody>
    </Page>
  )
}
