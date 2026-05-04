import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/projects" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-xl bg-white border border-line p-8"
        style={{ boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.08))' }}
      >
        <div className="flex justify-center mb-6">
          <img
            src="/assets/logo-circle.png"
            alt="Two Dudes"
            className="rounded-full"
            style={{ width: 64, height: 64 }}
          />
        </div>

        <h1 className="text-center text-lg font-semibold text-charcoal mb-6">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-charcoal outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange"
              placeholder="you@twodudes.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-charcoal outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange text-white font-semibold py-2.5 text-sm hover:bg-orange-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={async () => {
            if (!email) { setError('Enter your email first, then click Forgot Password.'); return }
            setError(null)
            const { error } = await supabase.auth.resetPasswordForEmail(email)
            if (error) setError(error.message)
            else setError('Check your email for a password reset link.')
          }}
          className="block mx-auto mt-4 text-xs font-medium text-muted hover:text-charcoal transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Forgot password?
        </button>
      </div>
    </div>
  )
}
