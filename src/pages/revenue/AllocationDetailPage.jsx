import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectAllocationDetail } from '../../components/finance/ProjectAllocationDetail'
import { getProjectAllocation } from '../../lib/finance/queries'
import { recomputeAllocation, setManualAllocation } from '../../lib/finance/actions'
import { useAuth } from '../../contexts/AuthContext'

export function AllocationDetailPage() {
  const { po } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recomputing, setRecomputing] = useState(false)
  const [toast, setToast] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { project, months } = await getProjectAllocation(po)
      setProject(project)
      setMonths(months)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [po])

  useEffect(() => { refetch() }, [refetch])

  function showToast(msg, kind = 'ok') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleRecompute() {
    setRecomputing(true)
    try {
      const result = await recomputeAllocation(po, user?.id ?? null)
      showToast(`Recomputed (${result?.mode_used || 'auto'}): +${result?.rows_inserted ?? 0} / ~${result?.rows_updated ?? 0} / -${result?.rows_deleted ?? 0}`)
      await refetch()
    } catch (e) {
      showToast(e?.message || String(e), 'error')
    } finally {
      setRecomputing(false)
    }
  }

  async function handleEditCell(period_month, pctNumber0to100) {
    try {
      await setManualAllocation({
        po_number: po,
        period_month,
        allocated_pct: pctNumber0to100,
        total_revenue: project?.total_revenue ?? 0,
        acting_user: user?.id ?? null,
      })
      showToast('Manual override saved.')
      await refetch()
    } catch (e) {
      const msg = e?.message || String(e)
      // The DB trigger throws when a locked row is touched
      const friendly = msg.includes('lock') ? 'That month is locked — reopen the month before editing.' : msg
      showToast(friendly, 'error')
    }
  }

  if (loading && !project) {
    return <p className="py-12 text-center text-sm text-muted">Loading allocation…</p>
  }
  if (error && !project) {
    return <p className="py-12 text-center text-sm text-error">Failed to load: {error}</p>
  }
  if (!project) {
    return <p className="py-12 text-center text-sm text-muted">Project not found.</p>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="text-xs mb-3">
        <Link to="/revenue/allocation" className="text-muted hover:text-orange">← Back to Allocation</Link>
      </div>

      <ProjectAllocationDetail
        project={project}
        months={months}
        onEditCell={handleEditCell}
        onRecompute={handleRecompute}
        recomputing={recomputing}
      />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-elevated text-sm z-50 ${
            toast.kind === 'error' ? 'bg-error text-white' : 'bg-charcoal text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
