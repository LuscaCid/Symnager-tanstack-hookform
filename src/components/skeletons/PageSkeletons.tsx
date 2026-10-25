import {
  Bone,
  BoneLines,
  SkeletonField,
  SkeletonForm,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonPanel,
  SkeletonSegmented,
  SkeletonStat,
  SkeletonTable,
  SkeletonTabs,
} from "@/components/ui/Skeleton"
import { WindowControls } from "@/components/Layout/WindowControls"

/**
 * Skeleton de cada tela. Cada uma tem duas versões:
 *  - `XxxSkeleton`: tela inteira (fallback do Suspense da rota, enquanto o código da página carrega);
 *  - `XxxContentSkeleton`: só a área de dados (a página já mostra cabeçalho/filtros e espera a API).
 * Os grids e espaçamentos são os mesmos das telas reais.
 */

const Screen = ({ children }: { children: React.ReactNode }) => (
  <div role="status" aria-label="Carregando" className="flex flex-col w-full h-full min-h-0 overflow-hidden">
    {children}
  </div>
)

/* ---------------- Dashboard ---------------- */

export function DashboardContentSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SkeletonPanel height={200} />
        <SkeletonPanel height={200} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SkeletonPanel height={140} />
        <SkeletonPanel height={140} />
        <SkeletonPanel height={140} />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={1} />
      <div className="shrink-0 px-4 pb-4 flex items-center gap-3">
        <SkeletonSegmented items={6} />
        <Bone className="h-3 w-40 rounded-full" />
      </div>
      <div className="px-4 pb-4">
        <DashboardContentSkeleton />
      </div>
    </Screen>
  )
}

/* ---------------- Falhas de entrega ---------------- */

export function FailuresContentSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <SkeletonPanel height={56} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SkeletonPanel height={220} />
        <div className="grid grid-cols-1 gap-4">
          <SkeletonPanel height={86} />
          <SkeletonPanel height={86} />
        </div>
      </div>
      <SkeletonTable rows={4} cols={[1, 2, 2, 2, 1, 1]} />
    </div>
  )
}

export function FailuresSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={1} />
      <div className="shrink-0 px-4 pb-4 flex items-center gap-3">
        <SkeletonSegmented items={6} />
        <Bone className="h-3 w-40 rounded-full" />
      </div>
      <div className="px-4 pb-4">
        <FailuresContentSkeleton />
      </div>
    </Screen>
  )
}

/* ---------------- Recepção (histórico | nova OS) ---------------- */

export function NewOrderFormSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm mx-4 mb-4 p-5 flex flex-col gap-6">
      <Bone className="h-4 w-48 rounded-full" />
      <div className="flex flex-col gap-3">
        <Bone className="h-2.5 w-14 rounded-full" />
        <Bone className="h-11 w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        <Bone className="h-2.5 w-24 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonField className="sm:col-span-2" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Bone className="h-2.5 w-32 rounded-full" />
        <Bone className="h-24 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </div>
      <div className="flex justify-end">
        <Bone className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  )
}

function SplitSkeleton({ left, right, leftSize = 45 }: { left: React.ReactNode; right: React.ReactNode; leftSize?: number }) {
  return (
    <div className="flex w-full h-full min-h-0">
      <div className="h-full min-w-0 flex flex-col overflow-hidden" style={{ width: `${leftSize}%` }}>
        {left}
      </div>
      <div className="w-px bg-line shrink-0" />
      <div className="h-full flex-1 min-w-0 flex flex-col overflow-hidden">{right}</div>
    </div>
  )
}

function ListColumnSkeleton({ variant = "order", actions = 1 }: { variant?: "order" | "person"; actions?: number }) {
  return (
    <>
      <SkeletonPageHeader actions={actions} subtitle={false} />
      <div className="px-4 flex flex-col gap-3">
        <Bone className="h-9 w-full rounded-lg" />
        <SkeletonList count={6} variant={variant} />
      </div>
    </>
  )
}

export function ReceptionSkeleton() {
  return (
    <Screen>
      <SplitSkeleton
        left={<ListColumnSkeleton variant="order" />}
        right={
          <>
            <SkeletonPageHeader actions={0} subtitle={false} />
            <NewOrderFormSkeleton />
          </>
        }
      />
    </Screen>
  )
}

/* ---------------- Ordens de serviço ---------------- */

export function OrdersTableSkeleton() {
  return <SkeletonTable rows={10} cols={[1, 3, 2.5, 1.5, 1.5, 1.5, 1]} />
}

export function OrderBoardSkeleton() {
  return (
    <div className="h-full flex gap-2 overflow-hidden p-2">
      {Array.from({ length: 6 }).map((_, col) => (
        <div key={col} className="w-72 shrink-0 h-full flex flex-col rounded-xl bg-subtle/70">
          <div className="flex items-center gap-2 p-3">
            <Bone className="w-2.5 h-2.5 rounded-full" />
            <Bone className="h-3 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: (col % 3) + 1 }).map((_, i) => (
              <div key={i} className="bg-surface border border-line rounded-lg p-3 flex flex-col gap-2">
                <Bone className="h-2.5 w-16 rounded-full" />
                <Bone className="h-3.5 w-40 rounded-full" />
                <Bone className="h-3 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrdersSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={2} />
      <div className="shrink-0 flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Bone key={i} className="h-7 rounded-full" style={{ width: 70 + ((i * 29) % 60) }} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <OrdersTableSkeleton />
      </div>
    </Screen>
  )
}

/* ---------------- Detalhes da OS ---------------- */

export function OrderDetailsSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={4} />
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 pb-3 border-b border-line">
        <Bone className="h-5 w-20 rounded-md" />
        <Bone className="h-5 w-16 rounded-md" />
        <Bone className="h-3.5 w-40 rounded-full" />
        <Bone className="h-5 w-24 rounded-md" />
        <div className="ml-auto flex gap-3">
          <Bone className="h-3.5 w-24 rounded-full" />
          <Bone className="h-3.5 w-24 rounded-full" />
        </div>
      </div>
      <SplitSkeleton
        leftSize={50}
        left={
          <div className="p-4 flex flex-col gap-4">
            <SkeletonForm fields={7} columns={2} />
            <SkeletonPanel height={110} />
          </div>
        }
        right={
          <div className="pt-3">
            <SkeletonTabs count={4} />
            <div className="px-4 flex flex-col gap-4">
              <Bone className="h-8 w-48 rounded-lg" />
              <SkeletonTable rows={3} cols={[4, 1, 1.5, 1.5]} />
              <div className="flex flex-col gap-2 ml-auto w-64">
                <BoneLines lines={4} />
              </div>
            </div>
          </div>
        }
      />
    </Screen>
  )
}

/* ---------------- Clientes ---------------- */

export function ClientRegistrationSkeleton() {
  return <SkeletonForm fields={12} columns={2} title={false} className="mx-4" />
}

export function ClientsSkeleton() {
  return (
    <Screen>
      <SplitSkeleton
        leftSize={40}
        left={<ListColumnSkeleton variant="person" actions={0} />}
        right={
          <>
            <SkeletonPageHeader actions={0} subtitle={false} />
            <ClientRegistrationSkeleton />
          </>
        }
      />
    </Screen>
  )
}

export function ClientDetailsSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={3} />
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <div className="flex-1 min-h-0 border-t border-line">
        <SplitSkeleton
          leftSize={55}
          left={
            <div className="p-4">
              <SkeletonForm fields={10} columns={2} />
            </div>
          }
          right={
            <div className="p-4 flex flex-col gap-3">
              <Bone className="h-3.5 w-32 rounded-full" />
              <SkeletonList count={4} />
            </div>
          }
        />
      </div>
    </Screen>
  )
}

/* ---------------- Cadastros (lista | formulário) ---------------- */

export function CatalogListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3.5 bg-surface border border-line rounded-xl shadow-sm">
          <div className="flex flex-col gap-1.5 flex-1">
            <Bone className="h-3.5 rounded-full" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
            <Bone className="h-3 w-1/3 rounded-full" />
          </div>
          <Bone className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function CatalogSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={1} />
      <SplitSkeleton
        leftSize={50}
        left={
          <div className="px-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Bone className="h-9 flex-1 rounded-lg" />
              <Bone className="h-4 w-28 rounded-full" />
            </div>
            <CatalogListSkeleton />
          </div>
        }
        right={
          <div className="p-4 flex flex-col items-center justify-center gap-3 h-2/3">
            <Bone className="w-11 h-11 rounded-full" />
            <Bone className="h-3.5 w-44 rounded-full" />
            <Bone className="h-3 w-56 rounded-full" />
          </div>
        }
      />
    </Screen>
  )
}

export function LookupsSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={0} />
      <SkeletonTabs count={6} />
      <div className="px-4 flex flex-col gap-3 max-w-3xl">
        <Bone className="h-9 w-full rounded-lg" />
        <div className="flex gap-2">
          <Bone className="h-9 flex-1 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
        </div>
        <CatalogListSkeleton rows={6} />
      </div>
    </Screen>
  )
}

/* ---------------- Configurações / Auditoria ---------------- */

export function SettingsSectionSkeleton() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <SkeletonForm fields={6} columns={2} />
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={0} />
      <SkeletonTabs count={9} />
      <div className="px-4">
        <SettingsSectionSkeleton />
      </div>
    </Screen>
  )
}

export function AuditSkeleton() {
  return (
    <Screen>
      <SkeletonPageHeader actions={0} />
      <div className="px-4 flex flex-col gap-3">
        <Bone className="h-9 w-full max-w-md rounded-lg" />
        <SkeletonTable rows={10} cols={[0.3, 1.5, 1.5, 2, 1.5, 1]} />
      </div>
    </Screen>
  )
}

/* ---------------- Impressão ---------------- */

export function PrintSkeleton() {
  return (
    <Screen>
      <div className="app-drag shrink-0 h-12 flex items-center gap-3 pl-2 bg-surface border-b border-line">
        <Bone className="h-8 w-8 rounded-lg" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Bone className="h-3.5 w-36 rounded-full" />
          <Bone className="h-2.5 w-52 rounded-full" />
        </div>
        <Bone className="h-8 w-24 rounded-lg" />
        <Bone className="h-8 w-24 rounded-lg mr-2" />
        <WindowControls />
      </div>
      <div className="shrink-0 flex items-center gap-5 px-4 py-2.5 bg-surface border-b border-line">
        <SkeletonSegmented items={2} />
        <Bone className="h-4 w-24 rounded-full" />
        <Bone className="h-8 w-28 rounded-lg" />
        <Bone className="h-8 w-60 rounded-lg" />
      </div>
      <div className="flex-1 bg-subtle p-4 overflow-hidden">
        <div className="mx-auto max-w-[190mm] bg-surface rounded-sm shadow p-6 flex flex-col gap-4">
          <div className="flex justify-between">
            <Bone className="h-5 w-40" />
            <Bone className="h-10 w-28" />
          </div>
          <BoneLines lines={3} />
          <Bone className="h-24 w-full" />
          <BoneLines lines={4} />
          <Bone className="h-32 w-full" />
        </div>
      </div>
    </Screen>
  )
}

/* ---------------- Telas de acesso e inicialização ---------------- */

export function AuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <Screen>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bone className="w-8 h-8 rounded-lg" />
              <Bone className="h-4 w-24 rounded-full" />
            </div>
            <Bone className="h-8 w-44 rounded-lg" />
          </div>
          <div className="bg-surface border border-line rounded-xl shadow-lg p-6 flex flex-col gap-4">
            <Bone className="h-5 w-32 rounded-full" />
            <Bone className="h-3 w-56 rounded-full" />
            {Array.from({ length: fields }).map((_, i) => (
              <SkeletonField key={i} />
            ))}
            <Bone className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </Screen>
  )
}

/** Inicialização: casca do app (header + menu) com o conteúdo do Dashboard. */
export function AppShellSkeleton() {
  return (
    <div role="status" aria-label="Iniciando o Symnager" className="h-full flex flex-col bg-app">
      <div className="app-drag shrink-0 h-12 flex items-center gap-3 px-3 bg-surface border-b border-line">
        <Bone className="h-6 w-6 rounded-md" />
        <Bone className="h-3.5 w-24 rounded-full" />
        <div className="flex-1 flex justify-center">
          <Bone className="h-8 w-full max-w-md rounded-lg" />
        </div>
        <Bone className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-60 shrink-0 bg-surface border-r border-line px-2.5 py-3 flex flex-col gap-1.5 max-md:hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <Bone key={i} className={i % 5 === 0 ? "h-2.5 w-16 rounded-full mt-3 mb-1 mx-2.5" : "h-8 w-full rounded-lg"} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  )
}

export function TrackResultSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex justify-between">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-28 rounded-full" />
          <Bone className="h-3 w-36 rounded-full" />
        </div>
        <Bone className="h-5 w-20 rounded-md" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Bone className="w-4 h-4 rounded-full" />
          <Bone className="h-3 w-32 rounded-full" />
        </div>
      ))}
    </div>
  )
}
