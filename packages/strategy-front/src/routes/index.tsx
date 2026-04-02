import { Suspense, lazy } from "react"
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from "react-router-dom"

const StartupPage = lazy(() => import("@/pages/startup"))
const AppShellPage = lazy(() => import("@/pages/app-shell"))
const IndexPage = lazy(() => import("@/pages/index"))
const StrategiesPage = lazy(() => import("@/pages/strategies"))
const StrategyDetailPage = lazy(() => import("@/pages/strategy-detail"))
const StrategyMultiPage = lazy(() => import("@/pages/strategy-multi"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const SettingsAppearancePage = lazy(() => import("@/pages/settings-appearance"))
const SettingsRuntimePage = lazy(() => import("@/pages/settings-runtime"))
const SettingsLogsPage = lazy(() => import("@/pages/settings-logs"))
const AgentPage = lazy(() => import("@/pages/agents"))
const McpPage = lazy(() => import("@/pages/mcp"))
const ProviderPage = lazy(() => import("@/pages/providers"))
const ProviderOverviewPage = lazy(() => import("@/pages/providers-overview"))
const ProviderModelsPage = lazy(() => import("@/pages/providers-models"))
const SkillPage = lazy(() => import("@/pages/skills"))

function LegacyPage() {
  const route = useLocation()

  return <Navigate to={`/app${route.pathname}${route.search}${route.hash}`} replace />
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <StartupPage />,
  },
  {
    path: "/app",
    element: <AppShellPage />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: "strategies",
        children: [
          {
            index: true,
            element: <StrategiesPage />,
          },
          {
            path: "multi",
            element: <StrategyMultiPage />,
          },
          {
            path: ":strategyID",
            element: <StrategyDetailPage />,
          },
        ],
      },
      {
        path: "providers",
        element: <ProviderPage />,
        children: [
          {
            index: true,
            element: <Navigate to="overview" replace />,
          },
          {
            path: "overview",
            element: <ProviderOverviewPage />,
          },
          {
            path: "models",
            element: <ProviderModelsPage />,
          },
        ],
      },
      {
        path: "installer",
        element: <Navigate to="/app/settings/runtime" replace />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
        children: [
          {
            index: true,
            element: <Navigate to="appearance" replace />,
          },
          {
            path: "appearance",
            element: <SettingsAppearancePage />,
          },
          {
            path: "runtime",
            element: <SettingsRuntimePage />,
          },
          {
            path: "logs",
            element: <SettingsLogsPage />,
          },
        ],
      },
      {
        path: "mcp",
        element: <McpPage />,
      },
      {
        path: "agents",
        element: <AgentPage />,
      },
      {
        path: "skills",
        element: <SkillPage />,
      },
    ],
  },
  {
    path: "/providers/*",
    element: <LegacyPage />,
  },
  {
    path: "/settings/*",
    element: <LegacyPage />,
  },
  {
    path: "/mcp/*",
    element: <LegacyPage />,
  },
  {
    path: "/agents/*",
    element: <LegacyPage />,
  },
  {
    path: "/skills/*",
    element: <LegacyPage />,
  },
  {
    path: "/installer/*",
    element: <LegacyPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])

export function AppRouter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
