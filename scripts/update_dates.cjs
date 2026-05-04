const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://viqaqyjkmwocwqrujdln.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_KEY env var')
  process.exit(1)
}

const CSV_PATH = String.raw`C:\Users\DylanEhlert\OneDrive - Two Dudes\Downloads\benchmarked_clean_final_2.csv`

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Simple CSV parser (handles quoted fields)
function parseCSV(text) {
  const lines = text.split('\n')
  const headers = parseLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = parseLine(line)
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
    rows.push(obj)
  }
  return rows
}

function parseLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(current.trim()); current = '' }
      else current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function cleanPO(val) {
  if (!val || val === 'nan' || val === '') return null
  const s = val.trim()
  return /^\d+-20/.test(s) ? s.split('-').slice(0, -1).join('-') : s
}

function cleanDate(val) {
  if (!val || val === 'nan' || val === '' || val === '#DIVIDE BY ZERO') return null
  // Strip time portions like " 00:00:00"
  const cleaned = val.replace(/\s+\d{2}:\d{2}:\d{2}.*$/, '').trim()
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (yyyy < 1900 || yyyy > 2100) return null
  return `${yyyy}-${mm}-${dd}`
}

async function main() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(raw)
  console.log(`Total CSV rows: ${rows.length}`)

  // Deduplicate by cleaned PO
  const seen = new Set()
  const valid = []
  for (const row of rows) {
    const po = cleanPO(row['po_number'])
    if (!po || seen.has(po)) continue
    seen.add(po)
    const completion = cleanDate(row['estimated_completion_date'])
    const sold = cleanDate(row['date_job_sold'])
    if (completion || sold) {
      valid.push({ po, completion, sold })
    }
  }

  console.log(`Unique POs with date updates: ${valid.length}`)

  let updated = 0
  let errors = 0

  for (let i = 0; i < valid.length; i++) {
    const { po, completion, sold } = valid[i]
    const update = {}
    if (completion) update.estimated_completion_date = completion
    if (sold) update.date_job_sold = sold

    try {
      await supabase
        .from('projects')
        .update(update)
        .eq('po_number', po)
        .eq('stage', 'Benchmark Completed')
      updated++
    } catch (err) {
      errors++
      if (errors <= 5) console.error(`Error on ${po}:`, err.message)
    }

    if ((i + 1) % 500 === 0) console.log(`Processed ${i + 1} of ${valid.length}`)
  }

  console.log(`Done — ${updated} updated, ${errors} errors`)
}

main()
