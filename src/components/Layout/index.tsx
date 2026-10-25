import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar/Sidebar";

/**
 * Casca fixa do app: Header e Sidebar ficam montados entre navegações; só o slot (<Outlet/>) troca.
 * Cada rota já tem o próprio Suspense com o skeleton da tela; este é só a rede de segurança do slot.
 * Nunca colocar Suspense ACIMA do Layout: carregar uma página nova substituiria header/sidebar (o "flick").
 */
export function Layout() {
  return (
    <div className="h-full flex flex-col bg-app print:bg-white">
      <Header />
      <div className="flex flex-1 min-h-0 relative">
        <div className="print:hidden flex">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 min-h-0 flex">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
