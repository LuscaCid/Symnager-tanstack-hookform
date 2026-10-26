import { HardDrive } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { bridge } from "@/lib/runtime"

/**
 * Nas telas de entrada da nuvem (login, configuração inicial, servidor indisponível):
 * desiste da nuvem e volta para o banco SQLite deste computador, com os dados de antes.
 */
export function BackToLocal() {
  const reload = useAuth((c) => c.reload)
  const [remote, setRemote] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!bridge) return
    bridge.getRuntime().then((r) => setRemote(r.mode === "remote"))
    return bridge.onApiStatus((r) => setRemote(r.mode === "remote"))
  }, [])

  if (!bridge || !remote) return null

  async function back() {
    setBusy(true)
    try {
      await bridge!.setConfig({ mode: "local" })
      toast.success("Usando o banco deste computador.")
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível voltar para o banco local.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="ghost" icon={HardDrive} loading={busy} onClick={back} className="w-full">
      Voltar para o banco deste computador
    </Button>
  )
}
