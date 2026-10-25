import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./app.routes";

export default function AllRoutes() {
  return (
    // v7_startTransition: a navegação roda dentro de startTransition — enquanto a próxima página carrega,
    // o React mantém a atual na tela em vez de mostrar o fallback do Suspense
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  )
}
