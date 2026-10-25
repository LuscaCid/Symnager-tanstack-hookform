import { Building2, ClipboardList, Database, Info, Palette, Printer, Server, Settings as SettingsIcon, User } from "lucide-react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { Page, PageBody, PageHeader, Panel, Tabs, TabItem } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { isDesktop } from "@/lib/runtime"
import { ConnectionSettings } from "@/components/settings/ConnectionSettings"
import { ProfileSettings } from "@/components/settings/ProfileSettings"
import { CompanySettings } from "@/components/settings/CompanySettings"
import { OrdersSettings } from "@/components/settings/OrdersSettings"
import { PrintSettings } from "@/components/settings/PrintSettings"
import { BackupSettings } from "@/components/settings/BackupSettings"
import { AppearanceSettings } from "@/components/settings/AppearanceSettings"
import { AboutSettings } from "@/components/settings/AboutSettings"

type TabKey = "perfil" | "empresa" | "ordens" | "impressao" | "conexao" | "backup" | "aparencia" | "sobre"

function ConnectionTab() {
  return (
    <Panel title="Conexão com o servidor" icon={Server}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted ">
          {isDesktop
            ? "No modo local, o Symnager roda o servidor e o banco SQLite dentro deste computador — ideal para um único balcão e funciona sem internet. Use um servidor externo para compartilhar os mesmos dados entre vários computadores ou acessar pela web."
            : "Por padrão a versão web usa a API do mesmo endereço deste site. Informe outro endereço apenas se a API estiver hospedada separadamente."}
        </p>
        <ConnectionSettings />
      </div>
    </Panel>
  )
}

export default function Settings() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const isAdmin = useHasRole()

  const tabs: TabItem<TabKey>[] = [
    { key: "perfil", label: "Perfil", icon: User },
    { key: "empresa", label: "Empresa", icon: Building2 },
    { key: "ordens", label: "Ordens de serviço", icon: ClipboardList, hidden: !isAdmin },
    { key: "impressao", label: "Impressão", icon: Printer },
    { key: "conexao", label: "Conexão", icon: Server },
    { key: "backup", label: "Backup", icon: Database, hidden: !isAdmin },
    { key: "aparencia", label: "Aparência", icon: Palette },
    { key: "sobre", label: "Sobre", icon: Info },
  ]

  const visible = tabs.filter((t) => !t.hidden)
  const current = (visible.find((t) => t.key === tab)?.key ?? null) as TabKey | null
  if (!current) return <Navigate to="/configuracoes/perfil" replace />

  return (
    <Page>
      <PageHeader icon={SettingsIcon} title="Configurações" subtitle="Perfil, empresa, impressão, conexão e backup" />
      <Tabs tabs={tabs} value={current} onChange={(key) => navigate(`/configuracoes/${key}`)} />
      <PageBody>
        <div className="max-w-3xl mx-auto w-full">
          {current === "perfil" && <ProfileSettings />}
          {current === "empresa" && <CompanySettings />}
          {current === "ordens" && <OrdersSettings />}
          {current === "impressao" && <PrintSettings />}
          {current === "conexao" && <ConnectionTab />}
          {current === "backup" && <BackupSettings />}
          {current === "aparencia" && <AppearanceSettings />}
          {current === "sobre" && <AboutSettings />}
        </div>
      </PageBody>
    </Page>
  )
}
