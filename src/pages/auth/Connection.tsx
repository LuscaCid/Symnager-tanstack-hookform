import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { ConnectionSettings } from "@/components/settings/ConnectionSettings"
import { AuthShell } from "./AuthShell"

export default function Connection() {
  return (
    <AuthShell
      title="Conexão com o servidor"
      subtitle="Escolha onde ficam os dados do Symnager"
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft size={14} /> Voltar
        </Link>
      }
    >
      <ConnectionSettings />
    </AuthShell>
  )
}
