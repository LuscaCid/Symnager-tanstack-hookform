import { SidebarContext } from "../../../contexts/Sidebar-context";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useContextSelector } from "use-context-selector";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChangeTheme } from "./Theme";
import { NAVIGATION } from "../navigation";
import { useAuth, useCurrentUser } from "@/contexts/Auth-context";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/format";

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
        <div onClick={toggle} className="md:hidden fixed inset-0 z-30 bg-zinc-800/50" aria-hidden />
      )}
      <aside
        aria-label="Menu principal"
        className={cn(
          "shrink-0 flex flex-col gap-2 h-full overflow-y-auto overflow-x-hidden p-2 transition-all duration-200 ease-in-out",
          "bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-300 dark:border-zinc-800",
          "max-md:fixed max-md:z-40 max-md:top-0 max-md:bottom-0 max-md:left-0 max-md:shadow-2xl",
          isOpen ? "w-56" : "w-14 max-md:-translate-x-full",
        )}
      >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className={cn(
                "rounded-md border border-zinc-300 dark:border-zinc-800 flex gap-1 p-1 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition duration-200 cursor-pointer items-center text-nowrap overflow-hidden",
                !isOpen && "justify-center",
              )}
              title={user?.name}
            >
              <User size={18} className="shrink-0" />
              {isOpen && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate font-semibold text-sm">{user?.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{user ? ROLE_LABEL[user.role] : ""}</span>
                  </span>
                  <ChevronsUpDown size={15} className="shrink-0" />
                </>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className="z-50 min-w-48 rounded-md border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 p-1 shadow-xl text-zinc-950 dark:text-zinc-200"
            >
              <DropdownMenu.Item
                onSelect={() => navigate("/configuracoes/perfil")}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm cursor-pointer outline-none data-[highlighted]:bg-zinc-200 dark:data-[highlighted]:bg-zinc-800"
              >
                <User size={16} /> Meu perfil
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-zinc-300 dark:bg-zinc-800" />
              <DropdownMenu.Item
                onSelect={() => logout()}
                className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm cursor-pointer outline-none text-red-500 data-[highlighted]:bg-zinc-200 dark:data-[highlighted]:bg-zinc-800"
              >
                <LogOut size={16} /> Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <nav className="flex flex-col gap-3 flex-1">
          {NAVIGATION.map((group) => {
            const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
            if (items.length === 0) return null
            return (
              <div key={group.title} className="flex flex-col gap-1">
                {isOpen ? (
                  <span className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{group.title}</span>
                ) : (
                  <span className="mx-auto w-6 h-px bg-zinc-300 dark:bg-zinc-800" />
                )}
                <ul className="list-none flex flex-col gap-1">
                  {items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === "/"}
                        title={label}
                        onClick={closeOnMobile}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 rounded-md p-1 w-full text-nowrap transition duration-200",
                            "hover:bg-zinc-200 dark:hover:bg-zinc-800",
                            !isOpen && "justify-center",
                            isActive && "bg-zinc-200 dark:bg-zinc-800/80 font-semibold",
                          )
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        {isOpen && <span className="truncate">{label}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
        <ChangeTheme compact={!isOpen} />
      </aside>
    </>
  )
}
