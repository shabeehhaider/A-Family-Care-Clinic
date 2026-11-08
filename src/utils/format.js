/** Display helpers shared across views. */

export const formatAmount = (n) => (Number(n) || 0).toLocaleString()

export const pad2 = (n) => String(n).padStart(2, '0')

/** YYYY-MM-DD in local time (value format of <input type="date">) */
export const toDateInputValue = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** Parse YYYY-MM-DD as a LOCAL date (new Date('YYYY-MM-DD') would be UTC) */
export const parseDateInputValue = (value) => {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export const formatDateTime = (dateOrMs) => {
  const d = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export const formatIso = (iso) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '' : formatDateTime(t)
}
