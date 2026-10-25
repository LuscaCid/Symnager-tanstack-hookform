import { ComponentType, lazy, LazyExoticComponent } from "react"

type Loader = () => Promise<{ default: ComponentType }>
type PreloadableComponent = LazyExoticComponent<ComponentType> & { preload: Loader }

/** React.lazy + preload(): permite baixar o código da página antes do usuário navegar até ela. */
function lazyPage(loader: Loader): PreloadableComponent {
  let promise: ReturnType<Loader> | null = null
  const load = () => (promise ??= loader())
  const Component = lazy(load) as PreloadableComponent
  Component.preload = load
  return Component
}

export const pages = {
  Dashboard: lazyPage(() => import("../pages/Dashboard")),
  Home: lazyPage(() => import("../pages/HomePage")),
  Orders: lazyPage(() => import("../pages/Orders")),
  OrderDetails: lazyPage(() => import("../pages/OrderDetails")),
  OrderPrint: lazyPage(() => import("../pages/OrderPrint")),
  User: lazyPage(() => import("../pages/User")),
  ClientDetails: lazyPage(() => import("../pages/ClientDetails")),
  Failures: lazyPage(() => import("../pages/Failures")),
  Services: lazyPage(() => import("../pages/catalog/Services")),
  Products: lazyPage(() => import("../pages/catalog/Products")),
  Suppliers: lazyPage(() => import("../pages/catalog/Suppliers")),
  Users: lazyPage(() => import("../pages/catalog/Users")),
  Lookups: lazyPage(() => import("../pages/catalog/Lookups")),
  Settings: lazyPage(() => import("../pages/Settings")),
  Audit: lazyPage(() => import("../pages/Audit")),
  Login: lazyPage(() => import("../pages/auth/Login")),
  Setup: lazyPage(() => import("../pages/auth/Setup")),
  Connection: lazyPage(() => import("../pages/auth/Connection")),
  Track: lazyPage(() => import("../pages/Track")),
  NotFound: lazyPage(() => import("../pages/NotFound")),
}

/**
 * Baixa em segundo plano o código de todas as páginas internas (após o login),
 * para que a troca de rota seja instantânea e nunca mostre carregamento.
 */
export function preloadAppPages() {
  const run = () => {
    for (const page of Object.values(pages)) page.preload().catch(() => undefined)
  }
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
