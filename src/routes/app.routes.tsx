import { lazy, ReactNode, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuth } from '@/contexts/Auth-context'
import { Spinner } from '@/components/ui'
import type { Role } from '@/@types/api'
import OfflineScreen from '@/pages/auth/Offline'
import { SlimTitleBar } from '@/components/Layout/WindowControls'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Home = lazy(() => import('../pages/HomePage'))
const Orders = lazy(() => import('../pages/Orders'))
const OrderDetails = lazy(() => import('../pages/OrderDetails'))
const OrderPrint = lazy(() => import('../pages/OrderPrint'))
const User = lazy(() => import('../pages/User'))
const ClientDetails = lazy(() => import('../pages/ClientDetails'))
const Failures = lazy(() => import('../pages/Failures'))
const Services = lazy(() => import('../pages/catalog/Services'))
const Products = lazy(() => import('../pages/catalog/Products'))
const Suppliers = lazy(() => import('../pages/catalog/Suppliers'))
const Users = lazy(() => import('../pages/catalog/Users'))
const Lookups = lazy(() => import('../pages/catalog/Lookups'))
const Settings = lazy(() => import('../pages/Settings'))
const Audit = lazy(() => import('../pages/Audit'))
const Login = lazy(() => import('../pages/auth/Login'))
const Setup = lazy(() => import('../pages/auth/Setup'))
const Connection = lazy(() => import('../pages/auth/Connection'))
const Track = lazy(() => import('../pages/Track'))
const NotFound = lazy(() => import('../pages/NotFound'))

function FullScreenLoading() {
  return (
    <div className="h-full flex flex-col">
      <SlimTitleBar title="" />
      <div className="flex-1 flex items-center justify-center">
        <Spinner label="Iniciando o Symnager..." />
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((c) => c.status)
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoading />
  if (status === 'offline') return <OfflineScreen />
  if (status === 'needs-setup') return <Navigate to='/setup' replace />
  if (status === 'unauthenticated') return <Navigate to='/login' replace state={{ from: location.pathname }} />
  return <>{children}</>
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const role = useAuth((c) => c.user?.role)
  if (!role || !roles.includes(role)) return <Navigate to='/' replace />
  return <>{children}</>
}

/** Compatibilidade com o link antigo /clientdetails?id=... */
function LegacyClientDetails() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return <Navigate to={id ? `/clientes/${id}` : '/clientes'} replace />
}

export default function AppRoutes(){
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/setup' element={<Setup />} />
        <Route path='/conexao' element={<Connection />} />
        <Route path='/rastreio' element={<Track />} />
        <Route path='/rastreio/:code' element={<Track />} />

        <Route path='/ordens/:id/imprimir' element={<RequireAuth><OrderPrint /></RequireAuth>} />

        <Route path='/' element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path='recepcao' element={<Home />} />
          <Route path='ordens' element={<Orders />} />
          <Route path='ordens/:id' element={<OrderDetails />} />
          <Route path='clientes' element={<User />} />
          <Route path='clientes/:id' element={<ClientDetails />} />
          <Route path='falhas' element={<Failures />} />
          <Route path='cadastros/servicos' element={<Services />} />
          <Route path='cadastros/produtos' element={<Products />} />
          <Route path='cadastros/fornecedores' element={<Suppliers />} />
          <Route path='cadastros/usuarios' element={<RequireRole roles={['ADMIN']}><Users /></RequireRole>} />
          <Route path='cadastros/auxiliares' element={<Lookups />} />
          <Route path='configuracoes' element={<Settings />} />
          <Route path='configuracoes/:tab' element={<Settings />} />
          <Route path='auditoria' element={<RequireRole roles={['ADMIN']}><Audit /></RequireRole>} />
          {/* rotas antigas */}
          <Route path='user' element={<Navigate to='/clientes' replace />} />
          <Route path='clientdetails' element={<LegacyClientDetails />} />
          <Route path='*' element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
