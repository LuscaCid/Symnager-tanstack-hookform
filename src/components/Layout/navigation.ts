import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LucideIcon,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  Wrench,
  Inbox,
} from "lucide-react"
import type { Role } from "@/@types/api"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
  /** atalho exibido na paleta de comandos */
  keywords?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAVIGATION: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, keywords: "inicio painel indicadores" },
      { to: "/recepcao", label: "Recepção", icon: Inbox, keywords: "nova os entrada historico home" },
      { to: "/ordens", label: "Ordens de serviço", icon: ClipboardList, keywords: "os kanban quadro" },
      { to: "/clientes", label: "Clientes", icon: Users, keywords: "customers cadastro cliente" },
    ],
  },
  {
    title: "Qualidade",
    items: [{ to: "/falhas", label: "Falhas de entrega", icon: AlertTriangle, keywords: "garantia retorno retrabalho" }],
  },
  {
    title: "Cadastros",
    items: [
      { to: "/cadastros/servicos", label: "Serviços", icon: Wrench, keywords: "mao de obra preco" },
      { to: "/cadastros/produtos", label: "Produtos e estoque", icon: Boxes, keywords: "pecas estoque" },
      { to: "/cadastros/fornecedores", label: "Fornecedores", icon: Truck },
      { to: "/cadastros/usuarios", label: "Usuários", icon: UserCog, roles: ["ADMIN"], keywords: "tecnicos atendentes" },
      { to: "/cadastros/auxiliares", label: "Cadastros auxiliares", icon: ListChecks, keywords: "marcas tipos pagamento motivos" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings, keywords: "perfil empresa servidor backup impressora" },
      { to: "/auditoria", label: "Auditoria", icon: ShieldCheck, roles: ["ADMIN"], keywords: "logs seguranca" },
    ],
  },
]
