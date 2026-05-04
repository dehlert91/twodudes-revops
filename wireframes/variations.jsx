const { useState } = React;

/* ======================================================================
   Wireframe primitives — grayscale boxes, real type, real data.
   One accent orange used very sparingly for emphasis moments.
   ====================================================================== */
const WF = {
  ink: '#1A1A1A',
  text: '#434343',
  mute: '#8E8E8E',
  line: '#D4D4D4',
  lineSoft: '#E8E8E8',
  fill: '#F2F2F2',
  fillDeep: '#E4E4E4',
  paper: '#FFFFFF',
  orange: '#E57A3A',
  orangeTint: 'rgba(229,122,58,0.14)',
  orangeInk: '#B8561E',
  font: "'Barlow','din-2014','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',ui-monospace,monospace",
};

// Grayscale block (placeholder for imagery/avatars/etc.)
const Box = ({ w, h, c = WF.fill, br = 2, children, style }) => (
  <div style={{ width: w, height: h, background: c, borderRadius: br, ...style }}>{children}</div>
);

// Horizontal rule of grayscale bars representing text of a given width
const TxtBar = ({ w, h = 10, c = WF.fillDeep, style }) => (
  <div style={{ width: w, height: h, background: c, borderRadius: 2, ...style }} />
);

const Label = ({ children, style }) => (
  <div style={{
    fontFamily: WF.font, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: WF.mute, ...style,
  }}>{children}</div>
);

// Numbered callout pin
const Pin = ({ n, top, left, right, bottom, side = 'right' }) => (
  <div style={{
    position: 'absolute', top, left, right, bottom, zIndex: 20,
    width: 22, height: 22, borderRadius: 999,
    background: WF.orange, color: '#fff',
    fontFamily: WF.font, fontWeight: 700, fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  }}>{n}</div>
);

// Shared page chrome (sidebar + header) so all three variations feel like one app.
function Chrome({ children, activeCrumb = 'Projects' }) {
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: WF.font, color: WF.text, background: WF.paper }}>
      {/* Sidebar */}
      <aside style={{ width: 64, background: WF.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 4, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: WF.ink, fontWeight: 700, letterSpacing: '0.04em' }}>TD</div>
        {['REV', 'SCH', 'PRJ', 'FIN', 'BMK'].map((l, i) => (
          <div key={l} style={{
            width: 40, height: 40, borderRadius: 4,
            background: l === 'PRJ' ? WF.orangeTint : 'transparent',
            color: l === 'PRJ' ? WF.orange : 'rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            borderLeft: l === 'PRJ' ? `2px solid ${WF.orange}` : '2px solid transparent',
          }}>{l}</div>
        ))}
      </aside>

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 56, borderBottom: `1px solid ${WF.lineSoft}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: WF.mute }}>
            Ops <span style={{ margin: '0 6px', color: WF.line }}>/</span>
            <span style={{ color: WF.ink, fontWeight: 600 }}>{activeCrumb}</span>
          </div>
          <div style={{ flex: 1 }} />
          <Box w={180} h={30} c={WF.fill} br={4} />
          <Box w={30} h={30} c={WF.fill} br={999} />
          <Box w={30} h={30} c={WF.fillDeep} br={999} />
        </header>
        <div style={{ flex: 1, overflow: 'hidden', background: WF.paper }}>{children}</div>
      </div>
    </div>
  );
}

/* ======================================================================
   Variation A — Filter-Heavy List (power-user density)
   ====================================================================== */
function VariationA() {
  return (
    <Chrome>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Title + actions */}
        <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${WF.lineSoft}`, position: 'relative' }}>
          <Pin n={1} top={28} right={-12} />
          <Label>Projects</Label>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 6, gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: WF.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                Projects Dashboard
              </div>
              <div style={{ fontFamily: WF.mono, fontSize: 13, color: WF.mute, fontWeight: 400, marginTop: 4 }}>42 jobs · $1.84M in flight</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Box w={84} h={32} c={WF.fill} br={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: WF.text, fontWeight: 500 }}>Export</Box>
              <Box w={110} h={32} c={WF.ink} br={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600 }}>+ New Job</Box>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: WF.lineSoft, borderBottom: `1px solid ${WF.lineSoft}`, position: 'relative' }}>
          <Pin n={2} top={12} left={12} />
          {[
            ['MTD Revenue', '$284,150', '▲ 12.4%'],
            ['Jobs In Progress', '17', '4 need attention'],
            ['GP Margin', '28.4%', '▲ 1.8pp vs target'],
            ['Need to Invoice', '$62,800', '3 over 30 days'],
          ].map(([k, v, s], i) => (
            <div key={k} style={{ background: WF.paper, padding: '16px 20px' }}>
              <Label>{k}</Label>
              <div style={{ fontFamily: WF.mono, fontSize: 22, fontWeight: 500, color: WF.ink, marginTop: 6, letterSpacing: '-0.01em' }}>{v}</div>
              <div style={{ fontSize: 11, color: i === 3 ? WF.orangeInk : WF.mute, marginTop: 2, fontFamily: WF.mono }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Filter rail */}
        <div style={{ padding: '14px 28px', borderBottom: `1px solid ${WF.lineSoft}`, display: 'flex', gap: 8, alignItems: 'center', position: 'relative', background: WF.paper }}>
          <Pin n={3} top={10} right={-12} />
          <Box w={220} h={30} c={WF.fill} br={4} style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12, color: WF.mute, gap: 6 }}>
            <div style={{ width: 12, height: 12, border: `1.5px solid ${WF.mute}`, borderRadius: 999 }} />
            Search PO, job, customer…
          </Box>
          {['Stage: All', 'Segment: All', 'PM: All', 'Revenue: Any', 'Last updated'].map(f => (
            <div key={f} style={{ height: 30, padding: '0 12px', borderRadius: 4, border: `1px solid ${WF.line}`, display: 'flex', alignItems: 'center', fontSize: 12, color: WF.text, gap: 6 }}>
              {f}
              <span style={{ color: WF.mute, fontSize: 9 }}>▼</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: WF.orangeInk, fontWeight: 600 }}>Save view</div>
        </div>

        {/* Saved view tabs */}
        <div style={{ padding: '0 28px', borderBottom: `1px solid ${WF.lineSoft}`, display: 'flex', gap: 0, background: WF.paper }}>
          {[['All', false], ['My jobs', false], ['In Progress', true], ['Need to Invoice', false], ['Blocked', false]].map(([label, active]) => (
            <div key={label} style={{
              padding: '10px 16px',
              fontSize: 12, fontWeight: active ? 600 : 500,
              color: active ? WF.ink : WF.mute,
              borderBottom: active ? `2px solid ${WF.orange}` : '2px solid transparent',
              marginBottom: -1,
            }}>{label} <span style={{ fontFamily: WF.mono, color: WF.mute, marginLeft: 4, fontSize: 11 }}>{active ? '17' : ''}</span></div>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Pin n={4} top={16} left={12} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: WF.paper, borderBottom: `1px solid ${WF.line}` }}>
                {['PO', 'Job', 'Stage', 'Segment', 'PM', 'Revenue', 'GP %', '% Complete', ''].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: ['Revenue', 'GP %', '% Complete'].includes(h) ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: WF.mute,
                  }}>{h}{['PO', 'Revenue', 'GP %'].includes(h) && <span style={{ marginLeft: 4, fontSize: 8 }}>↕</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['PO-2024-0187', 'Lincoln Ave. Duplex — Full Exterior', 'In Progress', 'RDO', 'Pete Barber', '$48,250', '31.2%', 62],
                ['PO-2024-0222', 'Oak Ridge Estates — Exterior Paint', 'Not Scheduled', 'RDO', 'Jake Holt', '$36,400', '22.1%', 0],
                ['PO-2024-0234', 'Manheim Twp HS — Gymnasium', 'In Progress', 'CGC', 'Rita Chen', '$72,500', '29.6%', 78],
                ['PO-2024-0241', 'Dudes HQ — Office Refresh', 'Need to Invoice', 'CGC', 'Pete Barber', '$8,400', '41.0%', 100],
                ['PO-2024-0255', 'Walnut St. Victorian — Trim & Doors', 'Blocked', 'RGC', 'Jake Holt', '$14,200', '19.8%', 35],
                ['PO-2024-0262', 'Conestoga Library — Reading Room', 'Complete', 'CDO', 'Marcus Finn', '$22,800', '32.9%', 100],
                ['PO-2024-0271', 'Kreiders Farm Market — Siding', 'In Progress', 'RGC', 'Rita Chen', '$19,600', '24.5%', 45],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${WF.lineSoft}`, background: i % 2 ? WF.fill : WF.paper }}>
                  <td style={{ padding: '11px 14px', fontFamily: WF.mono, color: WF.text }}>{row[0]}</td>
                  <td style={{ padding: '11px 14px', color: WF.ink, fontWeight: 500 }}>{row[1]}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3, background: WF.fill, border: `1px solid ${WF.line}`, color: WF.text }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: row[2] === 'Complete' ? '#4A8C5C' : row[2] === 'In Progress' ? WF.orange : row[2] === 'Blocked' ? '#C0392B' : row[2] === 'Need to Invoice' ? '#2980B9' : WF.mute }} />
                      {row[2]}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontFamily: WF.mono, color: WF.mute, fontSize: 11 }}>{row[3]}</td>
                  <td style={{ padding: '11px 14px', color: WF.text }}>{row[4]}</td>
                  <td style={{ padding: '11px 14px', fontFamily: WF.mono, textAlign: 'right', color: WF.ink }}>{row[5]}</td>
                  <td style={{ padding: '11px 14px', fontFamily: WF.mono, textAlign: 'right', color: WF.text }}>{row[6]}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <div style={{ width: 60, height: 4, background: WF.fillDeep, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${row[7]}%`, height: '100%', background: row[7] === 100 ? '#4A8C5C' : WF.ink }} />
                      </div>
                      <span style={{ fontFamily: WF.mono, color: WF.mute, fontSize: 11, width: 30, textAlign: 'right' }}>{row[7]}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', color: WF.mute }}>⋯</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Chrome>
  );
}

/* ======================================================================
   Variation B — Pipeline Kanban
   ====================================================================== */
function VariationB() {
  const cols = [
    { name: 'Not Scheduled', count: 6, total: '$148K', jobs: [
      ['PO-0222', 'Oak Ridge Estates', 'Jake H.', '$36.4K', 'RDO'],
      ['PO-0289', 'Brookside Veterinary', 'Rita C.', '$41.2K', 'CGC'],
      ['PO-0294', 'Willow Creek Townhomes', 'Jake H.', '$28.8K', 'RDO'],
    ]},
    { name: 'Scheduled', count: 4, total: '$92K', jobs: [
      ['PO-0301', 'Maple Lane Colonial', 'Pete B.', '$18.5K', 'RDO'],
      ['PO-0308', 'Cedar Hill Church', 'Marcus F.', '$33.7K', 'CDO'],
    ]},
    { name: 'In Progress', count: 17, total: '$642K', hot: true, jobs: [
      ['PO-0187', 'Lincoln Ave. Duplex', 'Pete B.', '$48.3K', 'RDO', 62],
      ['PO-0234', 'Manheim Twp HS Gym', 'Rita C.', '$72.5K', 'CGC', 78],
      ['PO-0271', 'Kreiders Farm Market', 'Rita C.', '$19.6K', 'RGC', 45],
      ['PO-0278', 'Hershey Inn Lobby', 'Pete B.', '$54.1K', 'CDO', 30],
    ]},
    { name: 'Need to Invoice', count: 5, total: '$62.8K', warn: true, jobs: [
      ['PO-0241', 'Dudes HQ — Office Refresh', 'Pete B.', '$8.4K', 'CGC'],
      ['PO-0198', 'Elm St. Carriage House', 'Jake H.', '$12.2K', 'RGC'],
    ]},
    { name: 'Complete', count: 23, total: '$512K', jobs: [
      ['PO-0262', 'Conestoga Library', 'Marcus F.', '$22.8K', 'CDO'],
      ['PO-0259', 'Brightside Academy', 'Rita C.', '$38.9K', 'CDO'],
    ]},
  ];

  return (
    <Chrome>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px 14px', borderBottom: `1px solid ${WF.lineSoft}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <Label>Projects · Pipeline</Label>
            <div style={{ fontSize: 26, fontWeight: 700, color: WF.ink, letterSpacing: '-0.01em', marginTop: 6 }}>
              Projects Pipeline
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['List', false], ['Board', true], ['Calendar', false]].map(([l, a]) => (
              <div key={l} style={{ padding: '6px 14px', fontSize: 12, fontWeight: a ? 600 : 500, color: a ? WF.ink : WF.mute, background: a ? WF.fill : 'transparent', borderRadius: 4 }}>{l}</div>
            ))}
            <Box w={110} h={32} c={WF.ink} br={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, marginLeft: 8 }}>+ New Job</Box>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, position: 'relative' }}>
          <Pin n={1} top={8} left={8} />
          <div style={{ display: 'flex', gap: 14, height: '100%', minWidth: 'max-content' }}>
            {cols.map((col, i) => (
              <div key={col.name} style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: WF.fill, borderRadius: 6, padding: 12, position: 'relative' }}>
                {i === 3 && <Pin n={2} top={-8} right={-8} />}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${WF.line}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: col.warn ? WF.orange : col.hot ? WF.ink : WF.line }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: WF.ink, letterSpacing: '0.02em' }}>{col.name}</div>
                    <div style={{ fontFamily: WF.mono, fontSize: 11, color: WF.mute }}>{col.count}</div>
                  </div>
                  <div style={{ fontFamily: WF.mono, fontSize: 11, color: WF.text, fontWeight: 500 }}>{col.total}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {col.jobs.map((j, k) => (
                    <div key={k} style={{ background: WF.paper, borderRadius: 4, padding: 10, border: `1px solid ${WF.lineSoft}`, borderLeft: col.warn && k === 0 ? `3px solid ${WF.orange}` : `1px solid ${WF.lineSoft}` }}>
                      <div style={{ fontFamily: WF.mono, fontSize: 10, color: WF.mute, marginBottom: 4 }}>{j[0]} · {j[4]}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: WF.ink, lineHeight: 1.25, marginBottom: 8 }}>{j[1]}</div>
                      {j[5] !== undefined && (
                        <div style={{ height: 3, background: WF.fillDeep, borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${j[5]}%`, height: '100%', background: WF.ink }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 10, color: WF.mute, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 999, background: WF.fillDeep }} />
                          {j[2]}
                        </div>
                        <div style={{ fontFamily: WF.mono, fontSize: 11, color: WF.text, fontWeight: 500 }}>{j[3]}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '8px 10px', fontSize: 11, color: WF.mute, textAlign: 'center', border: `1px dashed ${WF.line}`, borderRadius: 4 }}>+ Add job</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
}

/* ======================================================================
   Variation C — Card Grid with Health Signals
   ====================================================================== */
function VariationC() {
  const cards = [
    { po: 'PO-2024-0187', job: 'Lincoln Ave. Duplex', customer: 'R. Delaney', pm: 'Pete B.', rev: '$48,250', gp: 31.2, pct: 62, stage: 'In Progress', health: 'ok', due: 'Dec 18' },
    { po: 'PO-2024-0234', job: 'Manheim Twp HS Gym', customer: 'Manheim Twp SD', pm: 'Rita C.', rev: '$72,500', gp: 29.6, pct: 78, stage: 'In Progress', health: 'ok', due: 'Dec 22' },
    { po: 'PO-2024-0255', job: 'Walnut St. Victorian', customer: 'J. McCarthy', pm: 'Jake H.', rev: '$14,200', gp: 19.8, pct: 35, stage: 'Blocked', health: 'risk', due: 'Overdue 4d', note: 'Materials backorder' },
    { po: 'PO-2024-0241', job: 'Dudes HQ Refresh', customer: 'Two Dudes', pm: 'Pete B.', rev: '$8,400', gp: 41.0, pct: 100, stage: 'Need to Invoice', health: 'action', due: 'Invoice today' },
    { po: 'PO-2024-0278', job: 'Hershey Inn Lobby', customer: 'Hershey Hospitality', pm: 'Pete B.', rev: '$54,100', gp: 26.4, pct: 30, stage: 'In Progress', health: 'ok', due: 'Jan 10' },
    { po: 'PO-2024-0271', job: 'Kreiders Farm Market', customer: 'Kreiders Inc.', pm: 'Rita C.', rev: '$19,600', gp: 24.5, pct: 45, stage: 'In Progress', health: 'watch', due: 'Dec 30', note: 'Margin trending low' },
  ];

  const dot = { ok: '#4A8C5C', watch: WF.orange, risk: '#C0392B', action: '#2980B9' };
  const healthLabel = { ok: 'On track', watch: 'Watch', risk: 'At risk', action: 'Action needed' };

  return (
    <Chrome>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px 14px', borderBottom: `1px solid ${WF.lineSoft}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <Label>Projects · My Queue</Label>
            <div style={{ fontSize: 26, fontWeight: 700, color: WF.ink, letterSpacing: '-0.01em', marginTop: 6 }}>
              Projects, at a glance
              <span style={{ fontSize: 14, color: WF.mute, fontWeight: 400, marginLeft: 12 }}>Tuesday, Dec 16</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['List', false], ['Board', false], ['Cards', true]].map(([l, a]) => (
              <div key={l} style={{ padding: '6px 14px', fontSize: 12, fontWeight: a ? 600 : 500, color: a ? WF.ink : WF.mute, background: a ? WF.fill : 'transparent', borderRadius: 4 }}>{l}</div>
            ))}
          </div>
        </div>

        {/* Health strip */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 28px', borderBottom: `1px solid ${WF.lineSoft}`, position: 'relative' }}>
          <Pin n={1} top={8} left={8} />
          {[['On track', 14, '#4A8C5C'], ['Watch', 3, WF.orange], ['At risk', 2, '#C0392B'], ['Action needed', 5, '#2980B9']].map(([l, n, c]) => (
            <div key={l} style={{ flex: 1, padding: '12px 14px', background: WF.fill, borderRadius: 4, borderLeft: `3px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: WF.mute, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontFamily: WF.mono, fontSize: 22, fontWeight: 500, color: WF.ink, marginTop: 2 }}>{n}</div>
              </div>
              <div style={{ fontSize: 11, color: WF.mute }}>jobs</div>
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: WF.fill, position: 'relative' }}>
          <Pin n={2} top={14} right={14} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {cards.map((c, i) => (
              <div key={c.po} style={{ background: WF.paper, border: `1px solid ${WF.lineSoft}`, borderRadius: 6, padding: 16, position: 'relative' }}>
                {c.health === 'action' && i === 3 && <Pin n={3} top={-8} right={-8} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: WF.mono, fontSize: 10, color: WF.mute }}>{c.po}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: WF.ink, marginTop: 4, lineHeight: 1.2 }}>{c.job}</div>
                    <div style={{ fontSize: 11, color: WF.mute, marginTop: 3 }}>{c.customer} · {c.pm}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3, background: WF.fill, color: WF.text }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: dot[c.health] }} />
                    {healthLabel[c.health]}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ marginTop: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: WF.mute, marginBottom: 4 }}>
                    <span>{c.stage}</span>
                    <span style={{ fontFamily: WF.mono }}>{c.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: WF.fillDeep, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', background: c.pct === 100 ? '#4A8C5C' : c.health === 'risk' ? '#C0392B' : WF.ink }} />
                  </div>
                </div>

                {/* Bottom row: rev / gp / due */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 10, borderTop: `1px solid ${WF.lineSoft}` }}>
                  <div>
                    <div style={{ fontSize: 9, color: WF.mute, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Revenue</div>
                    <div style={{ fontFamily: WF.mono, fontSize: 13, color: WF.ink, fontWeight: 500, marginTop: 2 }}>{c.rev}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: WF.mute, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>GP</div>
                    <div style={{ fontFamily: WF.mono, fontSize: 13, color: c.gp < 25 ? '#C0392B' : WF.ink, fontWeight: 500, marginTop: 2 }}>{c.gp}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: WF.mute, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Due</div>
                    <div style={{ fontFamily: WF.mono, fontSize: 13, color: c.due.includes('Overdue') || c.due.includes('today') ? WF.orangeInk : WF.ink, fontWeight: 500, marginTop: 2 }}>{c.due}</div>
                  </div>
                </div>

                {c.note && (
                  <div style={{ marginTop: 10, padding: '6px 10px', background: WF.orangeTint, borderRadius: 3, fontSize: 11, color: WF.orangeInk, fontWeight: 500 }}>
                    ⚑ {c.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
}

Object.assign(window, { VariationA, VariationB, VariationC, WF });
