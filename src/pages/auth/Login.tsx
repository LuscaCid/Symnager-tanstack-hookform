import { zodResolver } from "@hookform/resolvers/zod"
import { LogIn, Server } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"
import { Button, Spinner, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { getErrorMessage } from "@/service/api"
import OfflineScreen from "./Offline"
import { AuthShell } from "./AuthShell"

const schema = z.object({
  login: z.string().trim().min(1, "Informe o e-mail ou usuário"),
  password: z.string().min(1, "Informe a senha"),
})
type FormType = z.infer<typeof schema>

export default function Login() {
  const status = useAuth((c) => c.status)
  const login = useAuth((c) => c.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormType>({ resolver: zodResolver(schema), defaultValues: { login: "", password: "" } })

  if (status === "loading") return <Spinner className="h-full" />
  if (status === "offline") return <OfflineScreen />
  if (status === "needs-setup") return <Navigate to="/setup" replace />
  if (status === "authenticated") return <Navigate to="/" replace />

  async function onSubmit(data: FormType) {
    setError(null)
    try {
      await login(data.login, data.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== "/login" ? from : "/", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o gerenciador de ordens de serviço"
      footer={
        <Link to="/conexao" className="inline-flex items-center gap-1 hover:underline">
          <Server size={14} /> Configurar servidor
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
        <TextField label="E-mail ou usuário" autoComplete="username" autoFocus error={errors.login?.message} {...register("login")} />
        <TextField label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        {error && (
          <p role="alert" className="text-sm text-red-500 border border-red-500/40 rounded-md p-2">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" icon={LogIn} loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
