import { RefreshCw, Server, ServerOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { isDesktop } from "@/lib/runtime"
import { AuthShell } from "./AuthShell"

export default function OfflineScreen() {
  const error = useAuth((c) => c.error)
  const apiUrl = useAuth((c) => c.apiUrl)
  const reload = useAuth((c) => c.reload)
  const navigate = useNavigate()
  return (
    <AuthShell title="Servidor indisponível" subtitle={apiUrl ? `Tentando conectar em ${apiUrl}` : undefined}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2 text-sm">
          <ServerOff className="text-red-500 shrink-0" size={20} />
          <p>
            {error ?? "Não foi possível falar com o servidor."}
            <br />
            <span className="text-muted ">
              {isDesktop
                ? "Se estiver usando um servidor externo, verifique o endereço e a rede. No modo local, reinicie o servidor embutido."
                : "Verifique se a API está em execução e se o endereço está correto."}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" icon={RefreshCw} onClick={() => reload()}>
            Tentar novamente
          </Button>
          <Button className="flex-1" icon={Server} onClick={() => navigate("/conexao")}>
            Configurar conexão
          </Button>
        </div>
      </div>
    </AuthShell>
  )
}
