import { ComponentType, ReactNode, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuth } from '@/contexts/Auth-context'
import type { Role } from '@/@types/api'
import OfflineScreen from '@/pages/auth/Offline'
import { pages, preloadAppPages } from './pages'
import {
  AppShellSkeleton, AuditSkeleton, AuthSkeleton, CatalogSkeleton, ClientDetailsSkeleton, ClientsSkeleton,
  DashboardSkeleton, FailuresSkeleton, LookupsSkeleton, OrderDetailsSkeleton, OrdersSkeleton, PrintSkeleton,
  ReceptionSkeleton, SettingsSkeleton,
} from '@/components/skeletons/PageSkeletons'

const {
  Dashboard, Home, Orders, OrderDetails, OrderPrint, User, ClientDetails, Failures, Services, Products,
  Suppliers, Users, Lookups, Settings, Audit, Login, Setup, Connection, Track, NotFound, License,
} = pages

/** Inicialização (verificando servidor/sessão): casca do app em skeleton. */
function FullScreenLoading() {
  return <AppShellSkeleton />
}

/** Cada rota tem o próprio Suspense com o skeleton da tela, em vez de um "Carregando..." genérico. */
function withSkeleton(Page: ComponentType, Skeleton: ComponentType) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Page />
    </Suspense>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuth((c) => c.status)
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoading />
  if (status === 'offline') return <OfflineScreen />
  if (status === 'needs-setup') return <Navigate to='/setup' replace />
  if (status === 'unauthenticated') return <Navigate to='/login' replace state={{ from: location.pathname }} />
  return <Authenticated>{children}</Authenticated>
}

/** Após autenticar, baixa o código das demais páginas em segundo plano. */
function Authenticated({ children }: { children: ReactNode }) {
  useEffect(() => {
    preloadAppPages()
  }, [])
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
  const status = useAuth((c) => c.status)
  const location = useLocation()
  // sem licença válida, tudo (menos conexão e rastreio público) cai na tela de ativação
  if (status === 'unlicensed' && !/^\/(conexao|rastreio)/.test(location.pathname)) {
    return withSkeleton(License, AuthSkeleton)
  }
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <Routes>
        <Route path='/login' element={withSkeleton(Login, AuthSkeleton)} />
        <Route path='/setup' element={withSkeleton(Setup, AuthSkeleton)} />
        <Route path='/conexao' element={withSkeleton(Connection, AuthSkeleton)} />
        <Route path='/rastreio' element={withSkeleton(Track, AuthSkeleton)} />
        <Route path='/rastreio/:code' element={withSkeleton(Track, AuthSkeleton)} />

        <Route path='/ordens/:id/imprimir' element={<RequireAuth>{withSkeleton(OrderPrint, PrintSkeleton)}</RequireAuth>} />

        <Route path='/' element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={withSkeleton(Dashboard, DashboardSkeleton)} />
          <Route path='recepcao' element={withSkeleton(Home, ReceptionSkeleton)} />
          <Route path='ordens' element={withSkeleton(Orders, OrdersSkeleton)} />
          <Route path='ordens/:id' element={withSkeleton(OrderDetails, OrderDetailsSkeleton)} />
          <Route path='clientes' element={withSkeleton(User, ClientsSkeleton)} />
          <Route path='clientes/:id' element={withSkeleton(ClientDetails, ClientDetailsSkeleton)} />
          <Route path='falhas' element={withSkeleton(Failures, FailuresSkeleton)} />
          <Route path='cadastros/servicos' element={withSkeleton(Services, CatalogSkeleton)} />
          <Route path='cadastros/produtos' element={withSkeleton(Products, CatalogSkeleton)} />
          <Route path='cadastros/fornecedores' element={withSkeleton(Suppliers, CatalogSkeleton)} />
          <Route path='cadastros/usuarios' element={<RequireRole roles={['ADMIN']}>{withSkeleton(Users, CatalogSkeleton)}</RequireRole>} />
          <Route path='cadastros/auxiliares' element={withSkeleton(Lookups, LookupsSkeleton)} />
          <Route path='configuracoes' element={withSkeleton(Settings, SettingsSkeleton)} />
          <Route path='configuracoes/:tab' element={withSkeleton(Settings, SettingsSkeleton)} />
          <Route path='auditoria' element={<RequireRole roles={['ADMIN']}>{withSkeleton(Audit, AuditSkeleton)}</RequireRole>} />
          {/* rotas antigas */}
          <Route path='user' element={<Navigate to='/clientes' replace />} />
          <Route path='clientdetails' element={<LegacyClientDetails />} />
          <Route path='*' element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
