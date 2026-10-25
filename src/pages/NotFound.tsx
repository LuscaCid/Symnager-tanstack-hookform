import { Compass } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button, EmptyState } from "@/components/ui"

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="w-full flex items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={<Button onClick={() => navigate("/")}>Ir para o início</Button>}
      />
    </div>
  )
}
