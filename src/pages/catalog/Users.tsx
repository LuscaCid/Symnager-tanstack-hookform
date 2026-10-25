import { zodResolver } from "@hookform/resolvers/zod"
import { UserCog } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Role, User } from "@/@types/api"
import { Badge, Checkbox, SelectField, TextField } from "@/components/ui"
import { CatalogFormContext, CatalogPage } from "@/components/catalog/CatalogPage"
import { ActiveBadge, FormActions } from "@/components/catalog/FormActions"
import { useCatalogMutations } from "@/components/catalog/useCatalogMutations"
import { orNull } from "@/components/catalog/money"
import { usersService, UserInput } from "@/services/resources"
import { useAuth, useCurrentUser } from "@/contexts/Auth-context"
import { formatPhone, formatRelative, onlyDigits, ROLE_LABEL } from "@/lib/format"
import { passwordSchema, usernameSchema } from "@/lib/validation"

const ROLES: Role[] = ["ADMIN", "TECNICO", "ATENDENTE"]

const ROLE_HINT: Record<Role, string> = {
  ADMIN: "Acesso total, inclusive usuários, configurações e backup.",
  TECNICO: "Diagnóstico, itens e status das OS; consulta clientes e catálogos.",
  ATENDENTE: "Clientes, abertura e entrega de OS, pagamentos e cadastros.",
}

const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-zinc-950 text-zinc-100 border-zinc-950 dark:bg-zinc-200 dark:text-zinc-950 dark:border-zinc-200",
  TECNICO: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  ATENDENTE: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
}

function makeSchema(isEdit: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, "Informe o nome").max(120),
      username: usernameSchema,
      email: z.string().trim().email("E-mail inválido"),
      role: z.enum(["ADMIN", "TECNICO", "ATENDENTE"]),
      phone: z
        .string()
        .trim()
        .refine((v) => !v || (onlyDigits(v).length >= 10 && onlyDigits(v).length <= 13), "Telefone inválido (com DDD)"),
      active: z.boolean(),
      // na edição a senha é opcional (em branco = manter)
      password: isEdit ? z.union([z.literal(""), passwordSchema]) : passwordSchema,
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" })
}
type FormType = z.infer<ReturnType<typeof makeSchema>>

function UserForm({ selected, close, select, me }: CatalogFormContext<User> & { me: User | null }) {
  const isEdit = !!selected
  const isSelf = !!selected && selected.user_id === me?.user_id
  const setUser = useAuth((c) => c.setUser)
  const { save, deactivate } = useCatalogMutations<User, UserInput>({
    queryKey: "users",
    label: "Usuário",
    create: usersService.create,
    update: usersService.update,
    remove: usersService.remove,
  })
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: {
      name: selected?.name ?? "",
      username: selected?.username ?? "",
      email: selected?.email ?? "",
      role: selected?.role ?? "TECNICO",
      phone: selected?.phone ? formatPhone(selected.phone) : "",
      active: selected?.active ?? true,
      password: "",
      confirm: "",
    },
  })
  const role = watch("role")

  const onSubmit = handleSubmit(async (data) => {
    const payload: UserInput = {
      name: data.name,
      username: data.username,
      email: data.email,
      role: data.role,
      phone: orNull(onlyDigits(data.phone)),
      active: data.active,
    }
    if (data.password) payload.password = data.password
    // não deixa o usuário tirar o próprio acesso de administrador ou se desativar
    if (isSelf) {
      payload.role = selected!.role
      payload.active = true
    }
    try {
      const saved = await save.mutateAsync({ id: selected?.user_id ?? null, data: payload })
      if (isSelf) setUser(saved)
      select(saved)
    } catch {
      // toast exibido pelo MutationCache
    }
  })

  return (
    <form noValidate onSubmit={onSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TextField wrapperClassName="sm:col-span-2" label="Nome" autoFocus autoComplete="off" error={errors.name?.message} {...register("name")} />
        <TextField label="Usuário (login)" autoComplete="off" error={errors.username?.message} {...register("username")} />
        <TextField label="E-mail" type="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
        {isSelf ? (
          // campo não registrado: o valor padrão (perfil atual) permanece no formulário
          <TextField label="Perfil de acesso" readOnly value={ROLE_LABEL[selected!.role]} hint="Você não pode alterar o seu próprio perfil." />
        ) : (
          <SelectField label="Perfil de acesso" hint={ROLE_HINT[role]} {...register("role")}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label="Telefone" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
        <TextField
          label={isEdit ? "Nova senha" : "Senha"}
          type="password"
          autoComplete="new-password"
          placeholder={isEdit ? "deixe em branco para manter" : undefined}
          hint="8+ caracteres com letras e números"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        {isSelf ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 self-center">Esta é a sua conta.</p>
        ) : (
          <Checkbox label="Ativo (pode entrar no sistema)" {...register("active")} />
        )}
        {selected && (
          <p className="text-xs text-zinc-500 self-center">
            Último acesso: {selected.last_login_at ? formatRelative(selected.last_login_at) : "nunca"}
          </p>
        )}
      </div>
      <FormActions
        canWrite
        isEdit={isEdit}
        saving={save.isPending}
        onCancel={close}
        inactive={selected?.active === false}
        deactivating={deactivate.isPending}
        deactivateBlockedReason={isSelf ? "Você não pode desativar a própria conta." : undefined}
        deactivateDescription="O usuário perde o acesso imediatamente (sessões encerradas). As OS e registros feitos por ele continuam no histórico."
        onDeactivate={async () => {
          await deactivate.mutateAsync(selected!.user_id)
          close()
        }}
      />
    </form>
  )
}

export default function Users() {
  const me = useCurrentUser()
  return (
    <CatalogPage<User>
      storageKey="cadastro-usuarios"
      icon={UserCog}
      title="Usuários"
      subtitle="Técnicos, atendentes e administradores com acesso ao sistema"
      queryKey="users"
      fetchList={usersService.list}
      rowKey={(u) => u.user_id}
      searchPlaceholder="Pesquisar por nome, usuário ou e-mail"
      canCreate
      newLabel="Novo usuário"
      formIcon={UserCog}
      formTitle={(u) => (u ? u.name : "Novo usuário")}
      emptyTitle="Nenhum usuário"
      columns={[
        {
          key: "name",
          header: "Usuário",
          render: (u) => (
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-semibold">
                {u.name}
                {u.user_id === me?.user_id && <Badge>você</Badge>}
                <ActiveBadge active={u.active} />
              </span>
              <span className="text-xs text-zinc-500">@{u.username}</span>
            </span>
          ),
        },
        { key: "role", header: "Perfil", render: (u) => <Badge className={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
        { key: "email", header: "E-mail", hideOnMobile: true, render: (u) => u.email },
        {
          key: "last",
          header: "Último acesso",
          hideOnMobile: true,
          render: (u) => <span className="whitespace-nowrap">{u.last_login_at ? formatRelative(u.last_login_at) : "nunca"}</span>,
        },
      ]}
      renderForm={(ctx) => <UserForm {...ctx} me={me} />}
    />
  )
}
