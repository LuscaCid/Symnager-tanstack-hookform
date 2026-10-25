import { SidebarContext } from "../../../contexts/Sidebar-context";
import { Tooltip } from "@/components/ui/Tooltip"
import { ChevronsUpDown, LogOut, LucideIcon, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useContextSelector } from "use-context-selector";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChangeTheme } from "./Theme";
import { NAVIGATION } from "../navigation";
import { useAuth, useCurrentUser } from "@/contexts/Auth-context";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/format";

/** Iniciais para o avatar ("Maria da Silva" -> "MS"). */
function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter((p) => p.length > 2 || p === p.toUpperCase())
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

const menuItem =
  "flex items-center gap-2 rounded-md px-2 h-8 text-[13px] cursor-pointer outline-none data-[highlighted]:bg-hover"

interface NavItemProps {
  to: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  onNavigate: () => void
}

/**
 * Item do menu. Recolhido: quadrado 40x36 centralizado, com tooltip.
 * O tooltip envolve um <span> e não o NavLink: o NavLink recebe className como FUNÇÃO e o
 * Slot do Radix (asChild) a converteria em texto ao mesclar classes — era a causa do visual quebrado.
 */
function NavItem({ to, label, icon: Icon, collapsed, onNavigate }: NavItemProps) {
  const link = (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg text-nowrap text-[13px] transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          collapsed ? "h-9 w-10 mx-auto justify-center" : "h-8 w-full gap-2.5 px-2.5",
          isActive ? "bg-accent-soft text-accent font-medium" : "text-muted hover:bg-hover hover:text-fg",
        )
      }
    >
      <Icon size={collapsed ? 18 : 16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip content={label} side="right">
      <span className="block">{link}</span>
    </Tooltip>
  )
}

export function Sidebar () {

  const isOpen = useContextSelector(SidebarContext, (context) => context.isOpen)
  const toggle = useContextSelector(SidebarContext, (context) => context.handleOpenOrClose)
  const user = useCurrentUser()
  const logout = useAuth((c) => c.logout)
  const navigate = useNavigate()

  function closeOnMobile() {
    if (window.innerWidth < 768 && isOpen) toggle()
  }

  return (
    <>
      {/* fundo escuro ao abrir no celular */}
      {isOpen && (
        <div onClick={toggle} className="md:hidden fixed inset-0 z-30 bg-black/40" aria-hidden />
      )}
      <aside
        aria-label="Menu principal"
        className={cn(
          "print:hidden shrink-0 h-full min-h-0 flex flex-col overflow-hidden transition-[width,transform] duration-200 ease-out",
          "bg-surface border-r border-line",
          "max-md:fixed max-md:z-40 max-md:top-0 max-md:bottom-0 max-md:left-0 max-md:shadow-2xl",
          isOpen ? "w-60" : "w-16 max-md:-translate-x-full",
        )}
      >
        {/* área de navegação rola sozinha; rodapé (tema + usuário) fica sempre visível */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-4 px-3 py-3">
          {NAVIGATION.map((group) => {
            const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            if (items.length === 0) return null
            return (
              <div key={group.title} className="flex flex-col gap-0.5">
                {isOpen ? (
                  <span className="h-5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-faint truncate">{group.title}</span>
                ) : (
                  <span aria-hidden className="h-5 flex items-center justify-center">
                    <span className="w-5 h-px bg-line" />
                  </span>
                )}
                <ul className="list-none flex flex-col gap-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavItem {...item} collapsed={!isOpen} onNavigate={closeOnMobile} />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className={cn("shrink-0 flex flex-col gap-2 border-t border-line px-3 py-3", !isOpen && "items-center")}>
          <ChangeTheme compact={!isOpen} />

          <DropdownMenu.Root>
            <Tooltip content={user?.name} side="right" disabled={isOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label={isOpen ? undefined : `Conta: ${user?.name ?? ""}`}
                  className={cn(
                    "flex items-center rounded-lg hover:bg-hover transition-colors cursor-pointer text-nowrap overflow-hidden",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    isOpen ? "w-full gap-2.5 p-1.5" : "w-10 h-10 justify-center",
                  )}
                >
                  <span className="shrink-0 w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-semibold flex items-center justify-center">
                    {initials(user?.name)}
                  </span>
                  {isOpen && (
                    <>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block truncate font-medium text-[13px]">{user?.name}</span>
                        <span className="block truncate text-xs text-faint">{user ? ROLE_LABEL[user.role] : ""}</span>
                      </span>
                      <ChevronsUpDown size={14} className="shrink-0 text-faint" />
                    </>
                  )}
                </button>
              </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side={isOpen ? "top" : "right"}
                align={isOpen ? "start" : "end"}
                sideOffset={8}
                className="z-50 min-w-52 rounded-xl border border-line bg-surface p-1 shadow-lg text-fg"
              >
                <div className="px-2 py-1.5 text-xs text-faint truncate">{user?.email}</div>
                <DropdownMenu.Item onSelect={() => navigate("/configuracoes/perfil")} className={menuItem}>
                  <User size={15} /> Meu perfil
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item onSelect={() => logout()} className={cn(menuItem, "text-danger")}>
                  <LogOut size={15} /> Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
    </>
  )
}
