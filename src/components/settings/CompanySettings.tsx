import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, ImagePlus, Save, Trash2 } from "lucide-react"
import { ChangeEvent, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button, Panel, TextField, SkeletonForm } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { useSettings } from "@/lib/hooks"
import { formatDocument, formatPhone, formatZipcode, onlyDigits } from "@/lib/format"
import { optionalDocument, optionalEmail } from "@/lib/validation"
import { withDefaults } from "./defaults"
import { useSaveSettings } from "./useSaveSettings"

const schema = z.object({
  name: z.string().trim().max(120),
  document: optionalDocument,
  phone: z.string().trim().max(30),
  email: optionalEmail,
  address: z.string().trim().max(200),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2, "Use a sigla (UF)"),
  zipcode: z.string().trim().max(10),
})
type FormType = z.input<typeof schema>

const MAX_LOGO_BYTES = 300 * 1024
const MAX_LOGO_WIDTH = 400

/** Redimensiona a imagem no navegador e devolve um data URL (PNG mantém transparência, demais viram JPEG). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_LOGO_WIDTH / img.width)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("Canvas indisponível"))
        return
      }
      const asPng = file.type === "image/png"
      if (!asPng) {
        ctx.fillStyle = "#fff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL(asPng ? "image/png" : "image/jpeg", 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Imagem inválida"))
    }
    img.src = url
  })
}

/** Tamanho aproximado em bytes de um data URL base64. */
const dataUrlBytes = (dataUrl: string) => Math.ceil(((dataUrl.split(",")[1] ?? "").length * 3) / 4)

export function CompanySettings() {
  const isAdmin = useHasRole()
  const { data, isLoading } = useSettings()
  const save = useSaveSettings("Dados da empresa salvos.")
  const [logo, setLogo] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormType>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!data) return
    const c = withDefaults(data).company
    reset({
      name: c.name,
      document: c.document ? formatDocument(c.document) : "",
      phone: c.phone ? formatPhone(c.phone) : "",
      email: c.email,
      address: c.address,
      city: c.city,
      state: c.state,
      zipcode: formatZipcode(c.zipcode),
    })
    setLogo(c.logo)
  }, [data, reset])

  async function handleLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem (PNG ou JPG).")
      return
    }
    try {
      const dataUrl = await resizeImage(file)
      if (dataUrlBytes(dataUrl) > MAX_LOGO_BYTES) {
        toast.error("A logo ficou maior que 300 KB mesmo reduzida. Use uma imagem mais simples.")
        return
      }
      setLogo(dataUrl)
    } catch {
      toast.error("Não foi possível ler a imagem.")
    }
  }

  if (isLoading) return <SkeletonForm fields={6} columns={2} />

  const savedLogo = withDefaults(data).company.logo
  const logoChanged = logo !== savedLogo

  function onSubmit(form: FormType) {
    const parsed = schema.parse(form)
    save.mutate({
      company: {
        ...parsed,
        state: parsed.state.toUpperCase(),
        phone: onlyDigits(parsed.phone),
        zipcode: onlyDigits(parsed.zipcode),
        logo,
      },
    })
  }

  return (
    <Panel title="Dados da empresa" icon={Building2}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        {!isAdmin && (
          <p className="text-sm text-muted ">Somente administradores podem alterar estes dados.</p>
        )}
        <fieldset disabled={!isAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TextField label="Nome / razão social" wrapperClassName="sm:col-span-2" error={errors.name?.message} {...register("name")} />
          <TextField label="CPF / CNPJ" inputMode="numeric" error={errors.document?.message} {...register("document")} />
          <TextField label="Telefone" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
          <TextField label="E-mail" type="email" wrapperClassName="sm:col-span-2" error={errors.email?.message} {...register("email")} />
          <TextField label="Endereço" wrapperClassName="sm:col-span-2" error={errors.address?.message} {...register("address")} />
          <TextField label="CEP" inputMode="numeric" error={errors.zipcode?.message} {...register("zipcode")} />
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <TextField label="Cidade" error={errors.city?.message} {...register("city")} />
            <TextField label="UF" maxLength={2} error={errors.state?.message} {...register("state")} />
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted ">Logo (aparece no comprovante impresso)</span>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-40 h-20 flex items-center justify-center rounded-md border border-dashed border-line bg-white overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo da empresa" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-faint">sem logo</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleLogo} aria-label="Enviar logo" />
                <Button size="sm" icon={ImagePlus} onClick={() => fileRef.current?.click()}>
                  {logo ? "Trocar" : "Enviar logo"}
                </Button>
                {logo && (
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setLogo("")}>
                    Remover
                  </Button>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-faint">PNG ou JPG; reduzida automaticamente para até 400 px de largura (máx. 300 KB).</span>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <Button type="submit" icon={Save} loading={save.isPending} disabled={!isDirty && !logoChanged}>
              Salvar
            </Button>
          </div>
        )}
      </form>
    </Panel>
  )
}
