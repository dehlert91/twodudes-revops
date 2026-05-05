import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { ProjectsPage } from './pages/ProjectsPage'
import { BenchmarksPage } from './pages/BenchmarksPage'
import { StubPage } from './pages/StubPage'
import { LoginPage } from './pages/LoginPage'
import { FinanceDashboardPage } from './pages/finance/FinanceDashboardPage'
import { WipPage } from './pages/finance/WipPage'
import { MonthClosePage } from './pages/finance/MonthClosePage'
import { WipSchedulePage } from './pages/finance/WipSchedulePage'
import { BillingPage } from './pages/finance/BillingPage'
import { InvoiceHistoryPage } from './pages/finance/InvoiceHistoryPage'
import { AllocationPage } from './pages/revenue/AllocationPage'
import { AllocationDetailPage } from './pages/revenue/AllocationDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<Navigate to="/projects" replace />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/projects" replace />} />

            {/* Revenue */}
            <Route path="revenue"               element={<StubPage title="Revenue" />} />
            <Route path="revenue/allocation"    element={<AllocationPage />} />
            <Route path="revenue/allocation/:po" element={<AllocationDetailPage />} />
            {/* Legacy: old /finance/allocation links redirect to the new home */}
            <Route path="finance/allocation"     element={<Navigate to="/revenue/allocation" replace />} />
            <Route path="finance/allocation/:po" element={<NavigateAllocationDetail />} />

            <Route path="schedule"   element={<StubPage title="Schedule" />} />
            <Route path="projects"   element={<ProjectsPage />} />

            {/* Finance — flat, one module at a time, no tab layout */}
            <Route path="finance"                element={<FinanceDashboardPage />} />
            <Route path="finance/wip"            element={<WipPage />} />
            <Route path="finance/billing"        element={<BillingPage />} />
            <Route path="finance/close"          element={<MonthClosePage />} />
            <Route path="finance/wip-schedule"   element={<WipSchedulePage />} />
            <Route path="finance/invoices/:po"   element={<InvoiceHistoryPage />} />
            {/* Legacy aliases */}
            <Route path="finance/progress-billing" element={<Navigate to="/finance/billing" replace />} />
            <Route path="finance/end-of-month"     element={<Navigate to="/finance/close" replace />} />

            <Route path="benchmarks" element={<BenchmarksPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Forward /finance/allocation/:po → /revenue/allocation/:po preserving the param
function NavigateAllocationDetail() {
  const { po } = useParams()
  return <Navigate to={`/revenue/allocation/${encodeURIComponent(po ?? '')}`} replace />
}
