import { Rocket } from "lucide-react"
import { ReactNode } from "react"
import { ChangeTheme } from "@/components/Layout/Sidebar/Theme"
import { SlimTitleBar } from "@/components/Layout/WindowControls"

/** Moldura das telas sem login (login, setup, conexão, rastreio). */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-app">
      <SlimTitleBar title="" />
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-accent text-accent-fg flex items-center justify-center">
                <Rocket size={16} strokeWidth={2.2} />
              </span>
              Symnager
            </span>
            <div className="w-44">
              <ChangeTheme />
            </div>
          </div>
          <section className="bg-surface border border-line rounded-xl shadow-lg">
            <div className="px-6 pt-6 pb-2">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
            </div>
            <div className="px-6 pb-6 pt-3">{children}</div>
          </section>
          {footer && <div className="text-[13px] text-center text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
