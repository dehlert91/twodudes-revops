import { useState, useEffect, useCallback } from 'react'
import { MonthClosePanel } from '../../components/finance/MonthClosePanel'
import { getMonthlyCloseStatus, getMonthlyCloseEvents } from '../../lib/finance/queries'
import { closeMonth, reopenMonth } from '../../lib/finance/actions'
import { useAuth } from '../../contexts/AuthContext'

export function MonthClosePage() {
  const { user } = useAuth()
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState([])

  const [busyMonth, setBusyMonth] = useState(null)
  const [toast, setToast] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMonthlyCloseStatus({ monthsBack: 18, monthsForward: 0 })
      // Newest first feels right for a PM
      data.reverse()
      setMonths(data)
      if (!selectedMonth && data.length) setSelectedMonth(data[0].period_month)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { refetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When selected month changes, load its event log
  useEffect(() => {
    if (!selectedMonth) return
    let cancelled = false
    getMonthlyCloseEvents(selectedMonth)
      .then(rows => { if (!cancelled) setSelectedEvents(rows) })
      .catch(e => { if (!cancelled) console.error('[close events]', e?.message) })
    return () => { cancelled = true }
  }, [selectedMonth])

  function showToast(msg, kind = 'ok') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleClose({ period_month, reason, recompute_first }) {
    setBusyMonth(period_month)
    try {
      const r = await closeMonth({ period_month, reason, recompute_first, acting_user: user?.id ?? null })
      showToast(`Closed ${period_month} — locked ${r?.allocations_locked ?? 0}, snapshots ${r?.snapshots_created ?? 0}, recomputed ${r?.projects_recomputed ?? 0}`)
      await refetch()
      // refresh events for the same month
      const events = await getMonthlyCloseEvents(period_month)
      setSelectedEvents(events)
      setSelectedMonth(period_month)
    } catch (e) {
      showToast(e?.message || String(e), 'error')
    } finally {
      setBusyMonth(null)
    }
  }

  async function handleReopen({ period_month, reason }) {
    setBusyMonth(period_month)
    try {
      const r = await reopenMonth({ period_month, reason, acting_user: user?.id ?? null })
      showToast(`Reopened ${period_month} — unlocked ${r?.allocations_unlocked ?? 0}`)
      await refetch()
      const events = await getMonthlyCloseEvents(period_month)
      setSelectedEvents(events)
      setSelectedMonth(period_month)
    } catch (e) {
      showToast(e?.message || String(e), 'error')
    } finally {
      setBusyMonth(null)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="font-display text-2xl font-bold text-charcoal mb-4">Month Close</h1>

      {error && <p className="text-sm text-error mb-3">Failed to load: {error}</p>}

      <MonthClosePanel
        months={months}
        loading={loading}
        onClose={handleClose}
        onReopen={handleReopen}
        busyMonth={busyMonth}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        selectedEvents={selectedEvents}
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
