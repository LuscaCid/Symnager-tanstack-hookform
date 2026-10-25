import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar/Sidebar";

export function Layout() {
  return (
    <div className="h-full flex flex-col border border-zinc-300 dark:border-zinc-800 rounded-md shadow-2xl overflow-hidden print:border-0 print:shadow-none print:overflow-visible">
      <Header />
      <div className="flex flex-1 min-h-0 relative">
        <div className="print:hidden flex">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 min-h-0 flex">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
