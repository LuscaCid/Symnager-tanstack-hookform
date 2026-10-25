import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { KeyRound, Save, User } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button, Panel, TextField } from "@/components/ui"
import { useAuth, useCurrentUser } from "@/contexts/Auth-context"
import { usersService } from "@/services/resources"
import { formatPhone, onlyDigits, ROLE_LABEL } from "@/lib/format"
import { passwordSchema, usernameSchema } from "@/lib/validation"

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  username: usernameSchema,
  email: z.string().trim().email("E-mail inválido"),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || (onlyDigits(v).length >= 10 && onlyDigits(v).length <= 13), "Telefone inválido (com DDD)"),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordForm = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual"),
    new_password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" })
  .refine((d) => d.new_password !== d.current_password, { path: ["new_password"], message: "A nova senha deve ser diferente da atual" })
type PasswordForm = z.infer<typeof passwordForm>

export function ProfileSettings() {
  const user = useCurrentUser()
  const setUser = useAuth((c) => c.setUser)

  const profile = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) })
  useEffect(() => {
    if (user) {
      profile.reset({ name: user.name, username: user.username, email: user.email, phone: user.phone ? formatPhone(user.phone) : "" })
    }
  }, [user, profile])

  const updateMe = useMutation({
    mutationFn: (data: ProfileForm) =>
      usersService.updateMe({ ...data, phone: data.phone ? onlyDigits(data.phone) : null }),
    onSuccess: (updated) => {
      setUser(updated)
      toast.success("Perfil atualizado.")
    },
  })

  const pwd = useForm<PasswordForm>({
    resolver: zodResolver(passwordForm),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  })
  const changePassword = useMutation({
    mutationFn: (data: PasswordForm) =>
      usersService.changePassword({ current_password: data.current_password, new_password: data.new_password }),
    onSuccess: () => {
      pwd.reset()
      toast.success("Senha alterada. As sessões em outros dispositivos foram encerradas.")
    },
  })

  const pe = profile.formState.errors
  const we = pwd.formState.errors

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Meus dados" icon={User}>
        <form noValidate onSubmit={profile.handleSubmit((d) => updateMe.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TextField label="Nome" autoComplete="name" error={pe.name?.message} {...profile.register("name")} />
          <TextField label="Usuário" autoComplete="username" error={pe.username?.message} {...profile.register("username")} />
          <TextField label="E-mail" type="email" autoComplete="email" error={pe.email?.message} {...profile.register("email")} />
          <TextField label="Telefone" inputMode="tel" autoComplete="tel" error={pe.phone?.message} {...profile.register("phone")} />
          <p className="sm:col-span-2 text-sm text-muted ">
            Papel: <strong>{user ? ROLE_LABEL[user.role] : "—"}</strong> (alterado apenas por um administrador)
          </p>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" icon={Save} loading={updateMe.isPending} disabled={!profile.formState.isDirty}>
              Salvar perfil
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Alterar senha" icon={KeyRound}>
        <form noValidate onSubmit={pwd.handleSubmit((d) => changePassword.mutate(d))} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <TextField
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            error={we.current_password?.message}
            {...pwd.register("current_password")}
          />
          <TextField
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="8+ caracteres com letras e números"
            error={we.new_password?.message}
            {...pwd.register("new_password")}
          />
          <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={we.confirm?.message} {...pwd.register("confirm")} />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" icon={KeyRound} loading={changePassword.isPending}>
              Alterar senha
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
