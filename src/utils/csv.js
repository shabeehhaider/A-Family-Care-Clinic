/**
 * CSV export helpers — pure functions (unit tested in tests/csv.test.js).
 */
import { saleTime, itemCount } from './sales'
import { formatIso, pad2 } from './format'

/** Quote a CSV cell; neutralise values Excel would execute as formulas. */
export function csvCell(value) {
  let v = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Phone numbers as text so Excel keeps the leading 0 (03xx…). */
export function csvPhone(phone) {
  const p = (phone || '').trim()
  if (!p) return ''
  return /^[0-9+\s-]+$/.test(p) ? `="${p}"` : csvCell(p)
}

export const SALES_CSV_HEADER = [
  'Receipt No', 'Date', 'Time', 'Cashier', 'Patient Name', 'Patient Phone', 'Items',
  'Item Count', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Method',
  'Status', 'Void Reason', 'Voided By', 'Voided At'
]

/**
 * One row per sale, oldest first. Includes a UTF-8 BOM so Excel shows
 * non-Latin names (e.g. Urdu) correctly.
 */
export function buildSalesCsv(sales = []) {
  const rows = [...sales]
    .sort((a, b) => saleTime(a) - saleTime(b))
    .map(sale => {
      const d = new Date(saleTime(sale))
      const items = (sale.items || [])
        .map(i => `${i.name} x${i.quantity} @${i.price}`)
        .join('; ')
      return [
        csvCell(sale.receiptNumber),
        csvCell(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`),
        csvCell(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`),
        csvCell(sale.cashier?.name),
        csvCell(sale.patientName),
        csvPhone(sale.patientPhone),
        csvCell(items),
        itemCount(sale),
        Number(sale.subtotal) || 0,
        Number(sale.discount) || 0,
        Number(sale.tax) || 0,
        Number(sale.grandTotal) || 0,
        csvCell(sale.paymentMethod),
        sale.voided ? 'VOID' : 'Completed',
        csvCell(sale.voided?.reason),
        csvCell(sale.voided?.by?.name),
        csvCell(sale.voided ? formatIso(sale.voided.at) : '')
      ].join(',')
    })

  return '﻿' + [SALES_CSV_HEADER.join(','), ...rows].join('\r\n')
}

/** Triggers a browser download of text content. */
export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
