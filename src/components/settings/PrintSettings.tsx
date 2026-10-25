import { useQuery } from "@tanstack/react-query"
import { Monitor, Printer, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Settings } from "@/@types/api"
import { Button, Checkbox, Panel, SelectField, Spinner, TextField } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { useSettings } from "@/lib/hooks"
import { bridge, isDesktop } from "@/lib/runtime"
import { getPrintPrefs, LocalPrintPrefs, setPrintPrefs } from "@/lib/printPrefs"
import { withDefaults } from "./defaults"
import { useSaveSettings } from "./useSaveSettings"

const LAYOUT_LABEL = { A4: "Folha A4", THERMAL: "Térmica 80 mm" } as const

function CompanyPrintDefaults() {
  const isAdmin = useHasRole()
  const { data, isLoading } = useSettings()
  const save = useSaveSettings("Padrões de impressão salvos.")
  const [form, setForm] = useState<Settings["print"]>(withDefaults(null).print)

  useEffect(() => {
    if (data) setForm(withDefaults(data).print)
  }, [data])

  if (isLoading) return <Spinner />

  const update = (partial: Partial<Settings["print"]>) => setForm((f) => ({ ...f, ...partial }))

  return (
    <Panel title="Padrões da empresa" icon={Printer}>
      <div className="flex flex-col gap-2">
        {!isAdmin && <p className="text-sm text-zinc-600 dark:text-zinc-400">Somente administradores alteram estes padrões.</p>}
        <fieldset disabled={!isAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SelectField label="Layout padrão" value={form.layout} onChange={(e) => update({ layout: e.target.value as "A4" | "THERMAL" })}>
            <option value="A4">{LAYOUT_LABEL.A4}</option>
            <option value="THERMAL">{LAYOUT_LABEL.THERMAL}</option>
          </SelectField>
          <TextField
            label="Cópias"
            type="number"
            min={1}
            max={5}
            value={form.copies}
            onChange={(e) => update({ copies: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })}
            hint="Ex.: 2 = via do cliente + via da loja"
          />
          <Checkbox label="Mostrar QR code de rastreio" checked={form.show_qrcode} onChange={(e) => update({ show_qrcode: e.target.checked })} />
          <Checkbox label="Mostrar valores e itens" checked={form.show_prices} onChange={(e) => update({ show_prices: e.target.checked })} />
        </fieldset>
        {isAdmin && (
          <div className="flex justify-end">
            <Button icon={Save} loading={save.isPending} onClick={() => save.mutate({ print: form })}>
              Salvar
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

function LocalPrintPreferences() {
  const [prefs, setPrefs] = useState<LocalPrintPrefs>(getPrintPrefs)
  const [testing, setTesting] = useState(false)
  const printers = useQuery({
    queryKey: ["printers"],
    queryFn: () => bridge!.listPrinters(),
    enabled: isDesktop,
    staleTime: 60_000,
  })

  function update(partial: Partial<LocalPrintPrefs>) {
    setPrefs(setPrintPrefs(partial))
  }

  async function handleTest() {
    if (!bridge) {
      window.print()
      return
    }
    setTesting(true)
    try {
      const result = await bridge.print({
        deviceName: prefs.deviceName || undefined,
        silent: prefs.silent,
        copies: 1,
        layout: prefs.layout || "A4",
      })
      if (result.ok) toast.success("Página de teste enviada para a impressora.")
      else toast.error(result.error || "A impressão não foi concluída.")
    } finally {
      setTesting(false)
    }
  }

  return (
    <Panel title="Nesta máquina" icon={Monitor}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Preferências guardadas só neste computador (cada balcão pode ter sua impressora).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SelectField
            label="Layout nesta máquina"
            value={prefs.layout}
            onChange={(e) => update({ layout: e.target.value as LocalPrintPrefs["layout"] })}
          >
            <option value="">Usar o padrão da empresa</option>
            <option value="A4">{LAYOUT_LABEL.A4}</option>
            <option value="THERMAL">{LAYOUT_LABEL.THERMAL}</option>
          </SelectField>
          {isDesktop ? (
            <SelectField
              label="Impressora"
              value={prefs.deviceName}
              onChange={(e) => update({ deviceName: e.target.value })}
              hint={printers.isError ? "Não foi possível listar as impressoras." : undefined}
            >
              <option value="">Padrão do sistema</option>
              {printers.data?.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name}
                  {p.isDefault ? " (padrão)" : ""}
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="text-xs text-zinc-500 self-end">
              No navegador a impressora é escolhida na janela de impressão do sistema.
            </p>
          )}
          {isDesktop && (
            <Checkbox
              className="sm:col-span-2"
              label="Imprimir direto, sem abrir a janela de impressão"
              checked={prefs.silent}
              onChange={(e) => update({ silent: e.target.checked })}
            />
          )}
        </div>
        <div className="flex justify-end">
          <Button icon={Printer} loading={testing} onClick={handleTest}>
            Imprimir página de teste
          </Button>
        </div>
      </div>
    </Panel>
  )
}

export function PrintSettings() {
  return (
    <div className="flex flex-col gap-3">
      <CompanyPrintDefaults />
      <LocalPrintPreferences />
    </div>
  )
}
