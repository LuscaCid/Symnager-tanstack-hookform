import { Plus } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { NewJobForm } from "./NewJobForm";
import { PageHeader } from "@/components/ui";
import type { UsersProperties } from "@/@types/CreateJob";

export function CreateJobSection () {
    const [params] = useSearchParams()
    const location = useLocation()
    // cliente pré-selecionado: ?client=ID&name=... (detalhes do cliente) ou state após cadastro
    const fromState = (location.state as { client?: UsersProperties } | null)?.client
    const clientId = Number(params.get('client'))
    const initialClient: UsersProperties | null = fromState
      ?? (clientId ? { id: clientId, name: params.get('name') ?? `Cliente #${clientId}` } : null)

    return (
        <section className="w-full h-full min-h-0 flex flex-col">
            <PageHeader icon={Plus} title="Nova OS" />
            <div className="flex-1 min-h-0 overflow-y-auto">
                <NewJobForm key={initialClient?.id ?? 'new'} initialClient={initialClient} />
            </div>
        </section>
    )
}
