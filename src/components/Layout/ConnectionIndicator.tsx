import { useQuery } from "@tanstack/react-query"
import { Tooltip } from "@/components/ui/Tooltip"
import { Server, ServerOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { healthService } from "@/services/resources"
import { useAuth } from "@/contexts/Auth-context"
import { isDesktop } from "@/lib/runtime"
import { cn } from "@/lib/cn"

/** Ponto verde/vermelho com o estado do servidor (verifica a cada 30 s). */
export function ConnectionIndicator() {
  const navigate = useNavigate()
  const apiUrl = useAuth((c) => c.apiUrl)
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: healthService.check,
    refetchInterval: 30_000,
    retry: 0,
  })
  const online = !!data && !isError
  const where = data?.mode === "local" && isDesktop ? "Banco local" : apiUrl
  return (
    <Tooltip content={online ? `Conectado: ${where}` : "Servidor indisponível — clique para configurar"}>
    <button
      onClick={() => navigate("/configuracoes/conexao")}
      aria-label={online ? "Servidor conectado" : "Servidor indisponível"}
      className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[13px] text-muted hover:bg-hover hover:text-fg transition-colors"
    >
      {online ? <Server size={14} /> : <ServerOff size={14} className="text-danger" />}
      <span className="hidden md:inline">{online ? (data?.mode === "local" && isDesktop ? "Local" : "Online") : "Offline"}</span>
      <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-success" : "bg-danger animate-pulse")} />
    </button>
    </Tooltip>
  )
}
