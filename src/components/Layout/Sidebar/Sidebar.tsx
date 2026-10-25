import { SidebarContext } from "../../../contexts/Sidebar-context";
import { Tooltip } from "@/components/ui/Tooltip"
import { ChevronsUpDown, LogOut, User } from "lucide-react";
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
          "shrink-0 flex flex-col gap-3 h-full overflow-y-auto overflow-x-hidden px-2.5 py-3 transition-[width,transform] duration-200 ease-out",
          "bg-surface border-r border-line",
          "max-md:fixed max-md:z-40 max-md:top-0 max-md:bottom-0 max-md:left-0 max-md:shadow-2xl",
          isOpen ? "w-60" : "w-[60px] max-md:-translate-x-full",
        )}
      >
        <nav className="flex flex-col gap-4 flex-1">
          {NAVIGATION.map((group) => {
            const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            if (items.length === 0) return null
            return (
              <div key={group.title} className="flex flex-col gap-0.5">
                {isOpen ? (
                  <span className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-faint">{group.title}</span>
                ) : (
                  <span className="mx-auto mb-1 w-5 h-px bg-line" />
                )}
                <ul className="list-none flex flex-col gap-0.5">
                  {items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <Tooltip content={label} side="right" disabled={isOpen}>
                      <NavLink
                        to={to}
                        end={to === "/"}
                        onClick={closeOnMobile}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 rounded-lg h-8 px-2.5 w-full text-nowrap text-[13px] transition-colors duration-100",
                            !isOpen && "justify-center px-0",
                            isActive
                              ? "bg-accent-soft text-accent font-medium"
                              : "text-muted hover:bg-hover hover:text-fg",
                          )
                        }
                      >
                        <Icon size={16} className="shrink-0" />
                        {isOpen && <span className="truncate">{label}</span>}
                      </NavLink>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>

        <ChangeTheme compact={!isOpen} />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                "rounded-lg flex gap-2.5 p-1.5 hover:bg-hover transition-colors cursor-pointer items-center text-nowrap overflow-hidden",
                !isOpen && "justify-center",
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
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="start"
              sideOffset={6}
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
      </aside>
    </>
  )
}
