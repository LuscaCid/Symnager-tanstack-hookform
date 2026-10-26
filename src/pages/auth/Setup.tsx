import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { AuthSkeleton } from "@/components/skeletons/PageSkeletons"
import { Check, Rocket } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { z } from "zod"
import { toast } from "sonner"
import { SEGMENT_IDS, type SegmentId } from "@/@types/api"
import { Button, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { bridge } from "@/lib/runtime"
import { getErrorMessage } from "@/service/api"
import { segmentsService } from "@/services/resources"
import { passwordSchema, usernameSchema } from "@/lib/validation"
import OfflineScreen from "./Offline"
import { AuthShell } from "./AuthShell"

const schema = z
  .object({
    company_name: z.string().trim().max(120).optional(),
    name: z.string().trim().min(2, "Informe seu nome"),
    username: usernameSchema,
    email: z.string().trim().email("E-mail inválido"),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" })
type FormType = z.infer<typeof schema>

const asSegment = (v: unknown): SegmentId | null =>
  typeof v === "string" && (SEGMENT_IDS as readonly string[]).includes(v) ? (v as SegmentId) : null

/** Ramo padrão desta instalação: o do instalador (Electron) ou o da versão web. */
async function buildSegment(): Promise<SegmentId> {
  const runtime = bridge ? await bridge.getRuntime().catch(() => null) : null
  return asSegment(runtime?.segment) ?? asSegment(import.meta.env.VITE_SYMNAGER_SEGMENT) ?? "CELULAR_INFORMATICA"
}

/** Primeira execução: cria o administrador, escolhe o ramo e os dados da empresa. */
export default function Setup() {
  const status = useAuth((c) => c.status)
  const setup = useAuth((c) => c.setup)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [segment, setSegment] = useState<SegmentId | null>(null)
  const segments = useQuery({
    queryKey: ["segments"],
    queryFn: segmentsService.list,
    enabled: status === "needs-setup",
    staleTime: Infinity,
    retry: 1,
  })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({ resolver: zodResolver(schema) })

  useEffect(() => {
    buildSegment().then((s) => setSegment((current) => current ?? s))
  }, [])

  if (status === "loading") return <AuthSkeleton fields={6} />
  if (status === "offline") return <OfflineScreen />
  if (status !== "needs-setup") return <Navigate to="/" replace />

  async function onSubmit(data: FormType) {
    setError(null)
    try {
      await setup({
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        company_name: data.company_name || undefined,
        // API antiga (sem ramos) não lista os ramos: não envia o campo
        ...(segments.data?.length && segment ? { segment } : {}),
      })
      toast.success("Tudo pronto! Bem-vindo ao Symnager.")
      navigate("/", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <AuthShell title="Configuração inicial" subtitle="Crie a conta de administrador. Ela terá acesso total ao sistema.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
        {!!segments.data?.length && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] text-muted mb-1.5">Ramo de atuação</legend>
            <div role="radiogroup" aria-label="Ramo de atuação" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {segments.data.map((s) => {
                const active = segment === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSegment(s.id)}
                    className={cn(
                      "text-left rounded-lg border p-2.5 transition-colors duration-150",
                      active ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {s.name}
                      {active && <Check size={14} className="text-accent ml-auto shrink-0" />}
                    </span>
                    <span className="block text-xs text-faint mt-0.5 line-clamp-2">{s.description}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-faint">Define os campos da OS e as listas iniciais. Dá para trocar depois em Configurações.</p>
          </fieldset>
        )}
        <TextField label="Nome da empresa" placeholder="Opcional" {...register("company_name")} />
        <TextField label="Seu nome" autoComplete="name" autoFocus error={errors.name?.message} {...register("name")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Usuário" autoComplete="username" error={errors.username?.message} {...register("username")} />
          <TextField label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="8+ caracteres com letras e números"
            error={errors.password?.message}
            {...register("password")}
          />
          <TextField label="Confirmar senha" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500 border border-red-500/40 rounded-md p-2">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" icon={Rocket} loading={isSubmitting}>
          Criar e começar
        </Button>
      </form>
    </AuthShell>
  )
}
