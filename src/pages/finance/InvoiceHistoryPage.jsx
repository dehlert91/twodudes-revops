import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { InvoiceHistory } from '../../components/finance/InvoiceHistory'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { getProjectInvoices, getProjectAllocation } from '../../lib/finance/queries'

export function InvoiceHistoryPage() {
  const { po } = useParams()
  const [invoices, setInvoices] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getProjectInvoices(po),
      getProjectAllocation(po),
    ])
      .then(([invs, alloc]) => {
        if (cancelled) return
        setInvoices(invs)
        setProject(alloc.project)
      })
      .catch(e => { if (!cancelled) setError(e?.message || String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [po])

  // Client-side filter by invoice_date when a date range is active
  const filteredInvoices = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return invoices
    return invoices.filter(inv => {
      if (!inv.invoice_date) return false
      if (dateRange.start && inv.invoice_date < dateRange.start) return false
      if (dateRange.end   && inv.invoice_date > dateRange.end)   return false
      return true
    })
  }, [invoices, dateRange])

  if (loading && !project) {
    return <p className="py-12 text-center text-sm text-muted">Loading invoices…</p>
  }
  if (error && !project) {
    return <p className="py-12 text-center text-sm text-error">Failed to load: {error}</p>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="text-xs mb-3">
        <Link to="/finance/billing" className="text-muted hover:text-orange">← Back</Link>
      </div>

      {project && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xl font-bold text-charcoal">{project.po_number}</h2>
            <span className="text-charcoal text-base font-medium">{project.job_name}</span>
          </div>
          <div className="text-xs text-muted mt-1">
            {project.division_code || '—'} · {project.segment || '—'} · {project.project_manager || 'No PM'} · {project.stage || '—'}
          </div>
        </div>
      )}

      <div className="mb-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} label="Filter by invoice date" />
      </div>

      <InvoiceHistory invoices={filteredInvoices} project={project} loading={loading} />
    </div>
  )
}
