import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProjectsPage } from './pages/ProjectsPage'
import { BenchmarksPage } from './pages/BenchmarksPage'
import { StubPage } from './pages/StubPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="revenue"    element={<StubPage title="Revenue" />} />
          <Route path="schedule"   element={<StubPage title="Schedule" />} />
          <Route path="projects"   element={<ProjectsPage />} />
          <Route path="finance"    element={<StubPage title="Finance" />} />
          <Route path="benchmarks" element={<BenchmarksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
