import { useQuery } from "@tanstack/react-query"
import { Info, Keyboard, ShieldCheck } from "lucide-react"
import { ReactNode } from "react"
import { Panel, BoneLines } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { healthService } from "@/services/resources"
import { bridge, isDesktop } from "@/lib/runtime"
import { formatDateTime } from "@/lib/format"

const SHORTCUTS: [string, string][] = [
  ["Ctrl + K", "Busca global (OS, clientes e telas)"],
  ["Ctrl + Shift + O", "Nova ordem de serviço"],
  ["Esc", "Fecha janelas e diálogos"],
  ["← / → na divisória", "Redimensiona painéis pelo teclado"],
]

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-faint">{label}</dt>
      <dd className="break-all">{children}</dd>
    </>
  )
}

export function AboutSettings() {
  const apiUrl = useAuth((c) => c.apiUrl)
  const runtime = useQuery({ queryKey: ["runtime"], queryFn: () => bridge!.getRuntime(), enabled: isDesktop })
  const health = useQuery({ queryKey: ["health"], queryFn: healthService.check, retry: 0 })

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Sobre o Symnager" icon={Info}>
        {runtime.isLoading || health.isLoading ? (
          <BoneLines lines={4} />
        ) : (
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1 text-sm">
            <Row label="Aplicativo">{isDesktop ? `Desktop ${runtime.data?.version ?? ""}` : "Web"}</Row>
            {runtime.data && (
              <>
                <Row label="Modo">{runtime.data.mode === "local" ? "Servidor local (SQLite)" : "Servidor externo"}</Row>
                <Row label="Plataforma">{runtime.data.platform}</Row>
                {runtime.data.mode === "local" && (
                  <Row label="Banco de dados">
                    <button className="underline text-left" onClick={() => bridge!.showItemInFolder(runtime.data!.dbPath)}>
                      {runtime.data.dbPath}
                    </button>
                  </Row>
                )}
                <Row label="Pasta de dados">{runtime.data.userData}</Row>
              </>
            )}
            <Row label="API">{apiUrl}</Row>
            <Row label="Versão da API">{health.data?.version ?? "—"}</Row>
            <Row label="Status">
              {health.data ? (
                <span className="text-green-600 dark:text-green-400">
                  online · banco {health.data.db} · {formatDateTime(health.data.time)}
                </span>
              ) : (
                <span className="text-red-500">indisponível</span>
              )}
            </Row>
          </dl>
        )}
      </Panel>

      <Panel title="Atalhos de teclado" icon={Keyboard}>
        <ul className="flex flex-col gap-1 text-sm">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-2">
              <span>{label}</span>
              <kbd className="text-xs border border-line rounded px-1.5 py-0.5 whitespace-nowrap">{keys}</kbd>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Segurança e privacidade" icon={ShieldCheck}>
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1 text-fg ">
          <li>As sessões expiram automaticamente; trocar a senha encerra as sessões em outros dispositivos.</li>
          <li>Após 5 tentativas de login erradas a conta é bloqueada por 15 minutos.</li>
          {isDesktop ? (
            <li>
              No modo local, os dados ficam somente neste computador e o servidor embutido só aceita conexões desta máquina
              (a menos que o acesso pela rede seja liberado em Conexão).
            </li>
          ) : (
            <li>Use sempre HTTPS ao acessar o Symnager pela internet.</li>
          )}
          <li>Ações sensíveis (exclusões, backups, alterações de usuários) ficam registradas na auditoria.</li>
          <li>Faça backups periódicos e guarde uma cópia fora deste equipamento.</li>
        </ul>
      </Panel>
    </div>
  )
}
