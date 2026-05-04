const KEY = 'twodudes_billing_drafts'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function save(drafts) {
  localStorage.setItem(KEY, JSON.stringify(drafts))
}

export function addBillingDraft({ po_number, job_name, amount, notes }) {
  const drafts = load().filter(d => d.po_number !== po_number) // replace any existing draft for same PO
  drafts.unshift({ po_number, job_name, amount, notes, drafted_at: new Date().toISOString() })
  save(drafts)
}

export function getBillingDrafts() {
  return load()
}

export function removeBillingDraft(po_number) {
  save(load().filter(d => d.po_number !== po_number))
}
