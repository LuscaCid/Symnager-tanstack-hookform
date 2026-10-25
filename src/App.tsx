import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster, toast } from "sonner"
import { useContextSelector } from "use-context-selector"

import { SidebarContextProvider } from "./contexts/Sidebar-context"
import { ThemeContext, ThemeProvider } from "./contexts/Theme-context"
import { AuthProvider } from "./contexts/Auth-context"
import AllRoutes from "./routes/index.routes"
import { getErrorMessage } from "./service/api"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  // toda mutation sem onError próprio mostra a mensagem da API
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return
      toast.error(getErrorMessage(error))
    },
  }),
})

function ThemedToaster() {
  const theme = useContextSelector(ThemeContext, (c) => c.theme)
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />
}

function App() {

  return (
    <div className="absolute inset-0 overflow-hidden p-1 text-zinc-950 bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-200 print:static print:p-0 print:bg-white print:text-black print:overflow-visible">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SidebarContextProvider>
              <AllRoutes />
            </SidebarContextProvider>
          </AuthProvider>
          <ThemedToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </div>

  )
}

export default App
