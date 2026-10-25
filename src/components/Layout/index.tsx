import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { setNotifyNavigator } from "@/lib/notify";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar/Sidebar";

/**
 * Casca fixa do app: Header e Sidebar ficam montados entre navegações; só o slot (<Outlet/>) troca.
 * Cada rota já tem o próprio Suspense com o skeleton da tela; este é só a rede de segurança do slot.
 * Nunca colocar Suspense ACIMA do Layout: carregar uma página nova substituiria header/sidebar (o "flick").
 */
export function Layout() {
  const navigate = useNavigate()
  // toasts de limite do plano ("Ver planos") navegam por aqui
  useEffect(() => {
    setNotifyNavigator(navigate)
    return () => setNotifyNavigator(null)
  }, [navigate])

  return (
    <div className="h-full flex flex-col bg-app print:bg-white">
      <Header />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 flex">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
