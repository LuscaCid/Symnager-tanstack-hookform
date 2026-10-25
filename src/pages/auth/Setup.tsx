import { zodResolver } from "@hookform/resolvers/zod"
import { Rocket } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { z } from "zod"
import { toast } from "sonner"
import { Button, Spinner, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { getErrorMessage } from "@/service/api"
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

/** Primeira execução: cria o administrador e os dados da empresa. */
export default function Setup() {
  const status = useAuth((c) => c.status)
  const setup = useAuth((c) => c.setup)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({ resolver: zodResolver(schema) })

  if (status === "loading") return <Spinner className="h-full" />
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
        <TextField label="Nome da empresa / assistência" placeholder="Opcional" {...register("company_name")} />
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
