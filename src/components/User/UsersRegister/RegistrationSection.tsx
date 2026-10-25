import { User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/ui"
import { ClientForm } from "../ClientForm"

export default function RegistrationSection(){
  const location = useLocation()
  const navigate = useNavigate()
  // vindo da busca de cliente da Recepção: volta com o cliente já selecionado
  const state = location.state as { returnTo?: string; name?: string } | null

  return (
    <section className="w-full h-full min-h-0 flex flex-col">
      <PageHeader icon={User} title="Registro" subtitle={state?.returnTo ? "Após salvar você volta para a OS" : undefined} />
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <h2 className="text-xl font-bold mb-2 bg-zinc-200 dark:bg-zinc-800/80 rounded-sm p-1">
          Preencha os campos
        </h2>
        <ClientForm
          initialName={state?.name}
          onSaved={(client) => {
            if (state?.returnTo) {
              navigate(state.returnTo, {
                state: { client: { id: client.client_id, name: client.name, phone: client.phone, document: client.document } },
              })
            }
          }}
        />
      </div>
    </section>
  )
}
