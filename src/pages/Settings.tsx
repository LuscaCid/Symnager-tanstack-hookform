import { Award, Briefcase, Building2, ClipboardList, Database, Gauge, Info, KeyRound, Palette, Printer, Server, Settings as SettingsIcon, User } from "lucide-react"
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
import { LicenseSettings } from "@/components/settings/LicenseSettings"
import { PlanSettings } from "@/components/settings/PlanSettings"
import { SegmentSettings } from "@/components/settings/SegmentSettings"
import { CertificateSettings } from "@/components/settings/CertificateSettings"
import { useSegment } from "@/lib/segment"

type TabKey =
  | "perfil"
  | "empresa"
  | "ramo"
  | "ordens"
  | "certificados"
  | "impressao"
  | "conexao"
  | "backup"
  | "aparencia"
  | "plano"
  | "licenca"
  | "sobre"

function ConnectionTab() {
  return (
    <Panel title="Conexão com o servidor" icon={Server}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted ">
          {isDesktop
            ? "No modo local, o Symnager roda o servidor e o banco SQLite dentro deste computador — ideal para um único balcão e funciona sem internet. Nos planos mensais, o servidor em nuvem Symnager compartilha os mesmos dados entre os computadores da empresa."
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
  const { certificateTypes } = useSegment()

  const tabs: TabItem<TabKey>[] = [
    { key: "perfil", label: "Perfil", icon: User },
    { key: "empresa", label: "Empresa", icon: Building2 },
    { key: "ramo", label: "Ramo", icon: Briefcase, hidden: !isAdmin },
    { key: "ordens", label: "Ordens de serviço", icon: ClipboardList, hidden: !isAdmin },
    { key: "certificados", label: "Certificados", icon: Award, hidden: !isAdmin || certificateTypes.length === 0 },
    { key: "impressao", label: "Impressão", icon: Printer },
    { key: "conexao", label: "Conexão", icon: Server },
    { key: "backup", label: "Backup", icon: Database, hidden: !isAdmin },
    { key: "aparencia", label: "Aparência", icon: Palette },
    { key: "plano", label: "Plano", icon: Gauge },
    { key: "licenca", label: "Licença", icon: KeyRound },
    { key: "sobre", label: "Sobre", icon: Info },
  ]

  const visible = tabs.filter((t) => !t.hidden)
  const current = (visible.find((t) => t.key === tab)?.key ?? null) as TabKey | null
  if (!current) return <Navigate to="/configuracoes/perfil" replace />

  return (
    <Page>
      <PageHeader icon={SettingsIcon} title="Configurações" subtitle="Perfil, empresa, ramo, impressão, conexão, backup, plano e licença" />
      <Tabs tabs={tabs} value={current} onChange={(key) => navigate(`/configuracoes/${key}`)} />
      <PageBody>
        <div className="max-w-3xl mx-auto w-full">
          {current === "perfil" && <ProfileSettings />}
          {current === "empresa" && <CompanySettings />}
          {current === "ramo" && <SegmentSettings />}
          {current === "ordens" && <OrdersSettings />}
          {current === "certificados" && <CertificateSettings />}
          {current === "impressao" && <PrintSettings />}
          {current === "conexao" && <ConnectionTab />}
          {current === "backup" && <BackupSettings />}
          {current === "aparencia" && <AppearanceSettings />}
          {current === "plano" && <PlanSettings />}
          {current === "licenca" && <LicenseSettings />}
          {current === "sobre" && <AboutSettings />}
        </div>
      </PageBody>
    </Page>
  )
}
