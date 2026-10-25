import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { Loader, Save } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import type { Client, ClientInput } from "@/@types/api"
import { Button, ConfirmDialog, SelectField, TextAreaField } from "@/components/ui"
import InputSection from "./UsersRegister/InputSection"
import { clientsService } from "@/services/resources"
import { getErrorMessage } from "@/service/api"
import { formatDocument, formatPhone, formatZipcode, onlyDigits } from "@/lib/format"
import { optionalDocument, optionalEmail, phoneSchema } from "@/lib/validation"

export const clientFormSchema = z.object({
  type: z.enum(["PF", "PJ"]),
  name: z.string().trim().min(2, "Informe o nome"),
  email: optionalEmail,
  document: optionalDocument,
  phone: phoneSchema,
  phone2: z.string().trim().optional(),
  zipcode: z.string().trim().optional(),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().max(2, "Use a sigla (UF)").optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type ClientFormType = z.input<typeof clientFormSchema>

type ApiCepResponse = {
  uf : string
  bairro : string
  localidade : string
  logradouro : string
  erro? : boolean
}

const empty: ClientFormType = {
  type: "PF",
  name: "",
  email: "",
  document: "",
  phone: "",
  phone2: "",
  zipcode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
}

function toForm(client?: Client | null, name?: string): ClientFormType {
  if (!client) return { ...empty, name: name ?? "" }
  return {
    type: client.type,
    name: client.name,
    email: client.email ?? "",
    document: formatDocument(client.document) === "—" ? "" : formatDocument(client.document),
    phone: formatPhone(client.phone),
    phone2: client.phone2 ? formatPhone(client.phone2) : "",
    zipcode: formatZipcode(client.zipcode),
    street: client.street ?? "",
    number: client.number ?? "",
    complement: client.complement ?? "",
    district: client.district ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    notes: client.notes ?? "",
  }
}

function toInput(data: z.output<typeof clientFormSchema>): ClientInput {
  const orNull = (v?: string) => (v && v.trim() ? v.trim() : null)
  return {
    type: data.type,
    name: data.name,
    email: orNull(data.email),
    document: orNull(data.document),
    phone: onlyDigits(data.phone),
    phone2: orNull(onlyDigits(data.phone2)),
    zipcode: orNull(onlyDigits(data.zipcode)),
    street: orNull(data.street),
    number: orNull(data.number),
    complement: orNull(data.complement),
    district: orNull(data.district),
    city: orNull(data.city),
    state: orNull(data.state?.toUpperCase()),
    notes: orNull(data.notes),
  }
}

async function fetchCep(cep: string): Promise<ApiCepResponse | null> {
  const { data } = await axios.get<ApiCepResponse>(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 6000 })
  return data.erro ? null : data
}

interface ClientFormProps {
  client?: Client | null
  initialName?: string
  submitLabel?: string
  onSaved?: (client: Client) => void
}

/** Formulário de cliente usado no cadastro (tela Clientes) e na edição (detalhes do cliente). */
export function ClientForm({ client, initialName, submitLabel = "Registrar", onSaved }: ClientFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!client
  const [conflict, setConflict] = useState<{ message: string; input: ClientInput } | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const lastCep = useRef("")

  const useFormProperties = useForm<ClientFormType>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toForm(client, initialName),
  })
  const { handleSubmit, reset, watch, setValue, register, formState: { errors } } = useFormProperties

  useEffect(() => {
    reset(toForm(client, initialName))
  }, [client, initialName, reset])

  // preenche o endereço automaticamente quando o CEP fica completo
  const zipCodeValue = watch("zipcode")
  useEffect(() => {
    const cep = onlyDigits(zipCodeValue)
    if (cep.length !== 8 || cep === lastCep.current) return
    lastCep.current = cep
    setCepLoading(true)
    fetchCep(cep)
      .then((data) => {
        if (!data) {
          toast.warning("CEP não encontrado.")
          return
        }
        const opts = { shouldDirty: true, shouldValidate: true }
        setValue("street", data.logradouro, opts)
        setValue("district", data.bairro, opts)
        setValue("city", data.localidade, opts)
        setValue("state", data.uf, opts)
      })
      .catch(() => toast.warning("Não foi possível consultar o CEP (sem internet?). Preencha o endereço manualmente."))
      .finally(() => setCepLoading(false))
  }, [zipCodeValue, setValue])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ input, force }: { input: ClientInput; force: boolean }) =>
      isEdit ? clientsService.update(client!.client_id, input, force) : clientsService.create(input, force),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["UsersHistory"] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      queryClient.setQueryData(["client", saved.client_id], (old: Client | undefined) => (old ? { ...old, ...saved } : saved))
      toast.success(isEdit ? "Alterações salvas com sucesso!" : "Cliente cadastrado com sucesso!")
      if (!isEdit) {
        lastCep.current = ""
        reset(empty)
      }
      onSaved?.(saved)
    },
    onError: () => undefined, // tratado em save()
  })

  async function save(input: ClientInput, force: boolean) {
    try {
      await mutateAsync({ input, force })
      setConflict(null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflict({ message: getErrorMessage(err), input })
        return
      }
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <FormProvider {...useFormProperties}>
      <form noValidate onSubmit={handleSubmit((data) => save(toInput(data as z.output<typeof clientFormSchema>), false))} className="flex flex-col gap-2">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2">
          <SelectField label="Tipo" {...register("type")}>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </SelectField>
          <InputSection input_label="CPF / CNPJ" input_name="document" input_placeholder="CPF ou CNPJ (opcional)" inputMode="numeric" />
          <InputSection input_label="Nome" input_name="name" input_placeholder="Nome do cliente" className="md:col-span-2" autoComplete="off" />
          <InputSection input_label="Celular" input_name="phone" input_placeholder="Celular com DDD" inputMode="tel" />
          <InputSection input_label="Telefone 2" input_name="phone2" input_placeholder="Outro telefone (opcional)" inputMode="tel" />
          <InputSection input_label="E-mail" input_name="email" input_placeholder="E-mail do cliente" type="email" className="md:col-span-2" />
          <div className="relative">
            <InputSection input_label="CEP" input_name="zipcode" input_placeholder="CEP" inputMode="numeric" />
            {cepLoading && <Loader size={16} className="absolute right-2 bottom-2 animate-spin" />}
          </div>
          <InputSection input_label="Rua" input_name="street" input_placeholder="Nome da rua" />
          <InputSection input_label="Número" input_name="number" input_placeholder="Número" />
          <InputSection input_label="Complemento" input_name="complement" input_placeholder="Complemento" />
          <InputSection input_label="Bairro" input_name="district" input_placeholder="Bairro" />
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <InputSection input_label="Cidade" input_name="city" input_placeholder="Cidade" />
            <InputSection input_label="UF" input_name="state" input_placeholder="UF" maxLength={2} />
          </div>
          <TextAreaField
            wrapperClassName="md:col-span-2"
            label="Observações"
            className="min-h-16"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </div>
        <Button type="submit" loading={isPending} icon={Save} className="w-full">
          {submitLabel}
        </Button>
      </form>
      <ConfirmDialog
        open={!!conflict}
        onOpenChange={(o) => !o && setConflict(null)}
        title="Possível cadastro duplicado"
        description={`${conflict?.message ?? ""} Deseja salvar mesmo assim?`}
        confirmLabel="Salvar mesmo assim"
        tone="default"
        loading={isPending}
        onConfirm={() => {
          if (conflict) return save(conflict.input, true)
        }}
      />
    </FormProvider>
  )
}
