import { Rocket } from "lucide-react"
import { ReactNode } from "react"
import { ChangeTheme } from "@/components/Layout/Sidebar/Theme"

/** Moldura das telas sem login (login, setup, conexão, rastreio). */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xl font-bold">
            <span className="rounded-md border border-zinc-300 dark:border-zinc-800 p-1">
              <Rocket size={22} />
            </span>
            Symnager
          </span>
          <ChangeTheme compact />
        </div>
        <section className="border border-zinc-300 dark:border-zinc-800/80 rounded-md shadow-2xl">
          <div className="bg-zinc-200 dark:bg-zinc-800/80 rounded-t-sm border-b border-zinc-300 dark:border-zinc-800 p-2">
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
          </div>
          <div className="p-3">{children}</div>
        </section>
        {footer && <div className="text-sm text-center text-zinc-600 dark:text-zinc-400">{footer}</div>}
      </div>
    </div>
  )
}
