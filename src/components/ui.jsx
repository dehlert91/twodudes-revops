/**
 * Two Dudes reusable UI primitives.
 *
 * Import:
 *   import { Button, Badge, KpiCard, SectionLabel, StatusDot } from '@/components/ui';
 *
 * These use Tailwind tokens from the design system. Keep them thin —
 * if a component needs lots of variants, split it into its own file.
 */

// ─── Button ────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-sm tracking-[0.02em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-5 py-2.5 text-[15px]',
  };
  const variants = {
    primary: 'bg-orange text-white hover:bg-orange-dark',
    secondary: 'bg-transparent text-orange border-[1.5px] border-orange hover:bg-orange hover:text-white',
    ghost: 'bg-transparent text-charcoal/70 border border-line-strong hover:bg-surface-muted font-medium',
    destructive: 'bg-error text-white hover:brightness-90',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────
export function Badge({ tone = 'default', dot, children, className = '' }) {
  const tones = {
    default: 'bg-[#F4F4F4] text-charcoal border-line',
    primary: 'bg-[rgba(229,122,58,0.12)] text-[#B8561E] border-[rgba(229,122,58,0.3)]',
    success: 'bg-[rgba(74,140,92,0.12)] text-[#2E6B3F] border-[rgba(74,140,92,0.3)]',
    warning: 'bg-[rgba(229,122,58,0.12)] text-[#B8561E] border-[rgba(229,122,58,0.3)]',
    error:   'bg-[rgba(192,57,43,0.12)] text-[#8B2519] border-[rgba(192,57,43,0.3)]',
    info:    'bg-[rgba(41,128,185,0.12)] text-[#1F5E87] border-[rgba(41,128,185,0.3)]',
  };
  return (
    <span className={`inline-flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-[0.04em] px-2 py-1 rounded-[3px] border ${tones[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

// ─── StatusDot (for use inside Badges) ─────────────────────────────────
export function StatusDot({ status }) {
  const colors = {
    notScheduled: 'bg-muted',
    scheduled:    'bg-info',
    inProgress:   'bg-orange',
    needInvoice:  'bg-info',
    complete:     'bg-success',
    blocked:      'bg-error',
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-muted'}`} />;
}

// ─── SectionLabel ──────────────────────────────────────────────────────
export function SectionLabel({ children, className = '' }) {
  return (
    <div className={`text-[10px] font-bold uppercase tracking-[0.08em] text-muted ${className}`}>
      {children}
    </div>
  );
}

// ─── KpiCard ───────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, subTone = 'muted', trend, sparkData }) {
  const subColors = {
    muted:   'text-muted',
    warning: 'text-[#B8561E]',
    success: 'text-success',
    error:   'text-error',
  };
  return (
    <div className="bg-surface border border-line rounded-md p-[18px] shadow-card">
      <SectionLabel>{label}</SectionLabel>
      <div className="font-mono text-[28px] font-medium text-charcoal mt-2 tracking-[-0.01em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {(sub || trend) && (
        <div className="text-[12px] mt-1 flex items-center gap-[6px] text-muted">
          {trend && <span className={`font-mono font-medium ${subColors[subTone]}`}>{trend}</span>}
          {sub && <span>{sub}</span>}
        </div>
      )}
      {sparkData && (
        <div className="mt-[10px] h-8 flex items-end gap-[2px]">
          {sparkData.map((pct, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-[1px] ${i === sparkData.length - 1 ? 'bg-orange' : 'bg-orange-light'}`}
              style={{ height: `${pct}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────────────
export function ProgressBar({ pct = 0, tone = 'ink' }) {
  const tones = { ink: 'bg-ink', success: 'bg-success', error: 'bg-error', warning: 'bg-orange' };
  return (
    <div className="h-1 bg-surface-muted rounded-sm overflow-hidden">
      <div className={`h-full ${pct === 100 ? tones.success : tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
