import { useQuery } from "@tanstack/react-query"
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
    <button
      onClick={() => navigate("/configuracoes/conexao")}
      title={online ? `Conectado: ${where}` : "Servidor indisponível — clique para configurar"}
      aria-label={online ? "Servidor conectado" : "Servidor indisponível"}
      className="relative p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200"
    >
      {online ? <Server size={20} /> : <ServerOff size={20} className="text-red-500" />}
      <span
        className={cn(
          "absolute top-0.5 right-0.5 w-2 h-2 rounded-full",
          online ? "bg-green-500" : "bg-red-500 animate-pulse",
        )}
      />
    </button>
  )
}
