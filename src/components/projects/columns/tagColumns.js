/**
 * "Tag columns" — text fields whose values are semicolon-delimited tag lists,
 * e.g. specialty_payroll_billing = "Prevailing Wage;Subcontract Agreement".
 *
 * Filter dropdowns must split these into individual tags (so each tag is its own
 * option) and the row matcher must treat them as multi-valued.
 */
export const TAG_COLUMNS = new Set([
  'specialty_payroll_billing',
])

/** Split a tag-column value into a sorted, deduped array of tags. Empty input → []. */
export function splitTags(value) {
  if (value == null || value === '') return []
  return String(value)
    .split(';')
    .map(t => t.trim())
    .filter(Boolean)
}

/**
 * Build the dropdown option list for one column. For tag columns this expands
 * semicolon-delimited values into distinct tags; for everything else it falls
 * back to taking each row's value verbatim.
 */
export function buildFilterOptions(rows, key) {
  const set = new Set()
  if (TAG_COLUMNS.has(key)) {
    for (const r of rows ?? []) for (const t of splitTags(r[key])) set.add(t)
  } else {
    for (const r of rows ?? []) {
      const v = r[key]
      if (v != null && v !== '') set.add(String(v))
    }
  }
  return [...set].sort()
}

/**
 * Returns true if the row passes the filter for `key` given an array of selected
 * values. Tag columns match if ANY selected tag is present in the row's tags.
 * Non-tag columns require exact string match.
 *
 * If `selected` is empty, the filter is considered passing (no-op).
 */
export function rowMatchesFilter(row, key, selected) {
  if (!selected?.length) return true
  if (TAG_COLUMNS.has(key)) {
    const tags = splitTags(row[key])
    if (tags.length === 0) return false
    return tags.some(t => selected.includes(t))
  }
  return selected.includes(String(row[key] ?? ''))
}
