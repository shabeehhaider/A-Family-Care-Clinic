<template>
  <div class="history-layout">
    <AppHeader />

    <main class="history-main no-print">
      <!-- Title + search -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Sales History</h1>
          <p class="page-subtitle">{{ rangeLabel }}</p>
        </div>
        <div class="search-box">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="Receipt #, patient name or phone"
            @keydown.escape="searchQuery = ''"
          />
        </div>
      </div>

      <!-- Date range filter -->
      <div class="filters">
        <div class="range-chips" role="group" aria-label="Date range">
          <button
            v-for="r in ranges"
            :key="r.id"
            :class="['chip', { active: range === r.id }]"
            @click="setRange(r.id)"
          >
            {{ r.label }}
          </button>
        </div>
        <div class="filters-right">
          <label class="date-picker">
            <span>Date</span>
            <input
              type="date"
              :value="customDate"
              :max="todayInputValue"
              @change="onCustomDate($event.target.value)"
            />
          </label>
          <button
            class="export-btn"
            :disabled="filteredSales.length === 0"
            title="Download the sales shown below as a CSV file (opens in Excel)"
            @click="exportCsv"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary">
        <div class="summary-card">
          <span class="summary-label">Sales</span>
          <span class="summary-value">{{ totals.count }}</span>
          <span v-if="totals.voidCount" class="summary-note">
            + {{ totals.voidCount }} voided (Rs. {{ formatAmount(totals.voidAmount) }})
          </span>
        </div>
        <div class="summary-card highlight">
          <span class="summary-label">Revenue</span>
          <span class="summary-value">Rs. {{ formatAmount(totals.revenue) }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Discounts</span>
          <span class="summary-value">Rs. {{ formatAmount(totals.discount) }}</span>
        </div>
        <div class="summary-card payments">
          <span class="summary-label">By payment</span>
          <div v-if="totals.byPayment.length" class="payment-split">
            <div v-for="p in totals.byPayment" :key="p.method" class="payment-split-row">
              <span>{{ p.method }} ({{ p.count }})</span>
              <span>Rs. {{ formatAmount(p.amount) }}</span>
            </div>
          </div>
          <span v-else class="summary-empty">—</span>
        </div>
      </div>

      <!-- Sales list -->
      <section class="sales-panel">
        <div v-if="filteredSales.length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p v-if="allSales.length === 0">No sales recorded yet. Confirmed sales from the POS will appear here.</p>
          <p v-else>No sales match this filter.</p>
        </div>

        <template v-else>
          <div class="sales-head" aria-hidden="true">
            <span>Receipt #</span>
            <span>Date &amp; Time</span>
            <span>Patient</span>
            <span class="num">Items</span>
            <span>Payment</span>
            <span class="num">Total</span>
            <span></span>
          </div>

          <ul class="sales-list">
            <li
              v-for="sale in visibleSales"
              :key="sale.receiptNumber"
              :class="['sale', { open: expandedId === sale.receiptNumber, voided: sale.voided }]"
            >
              <div class="sale-row">
                <span class="sale-receipt">
                  {{ sale.receiptNumber }}
                  <span v-if="sale.voided" class="void-badge">VOID</span>
                </span>
                <span class="sale-date">{{ formatDateTime(sale) }}</span>
                <span class="sale-patient">
                  <template v-if="sale.patientName || sale.patientPhone">
                    {{ sale.patientName || 'Walk-in' }}
                    <small v-if="sale.patientPhone">{{ sale.patientPhone }}</small>
                  </template>
                  <span v-else class="muted">Walk-in</span>
                </span>
                <span class="sale-items num">{{ itemCount(sale) }} <span class="mobile-only">items</span></span>
                <span class="sale-payment"><span class="badge">{{ sale.paymentMethod }}</span></span>
                <span class="sale-total num">Rs. {{ formatAmount(sale.grandTotal) }}</span>
                <span class="sale-actions">
                  <button
                    class="icon-btn"
                    :aria-expanded="expandedId === sale.receiptNumber"
                    :title="expandedId === sale.receiptNumber ? 'Hide details' : 'View details'"
                    @click="toggle(sale.receiptNumber)"
                  >
                    <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span class="btn-text">Details</span>
                  </button>
                  <button
                    v-if="!sale.voided"
                    class="void-btn"
                    title="Void this sale (it stays on record, excluded from totals)"
                    @click="voidSale(sale)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span class="btn-text">Void</span>
                  </button>
                  <button
                    class="reprint-btn"
                    :disabled="isPrinting || !!sale.voided"
                    :title="sale.voided ? 'Voided sales cannot be reprinted' : 'Reprint receipt'"
                    @click="reprint(sale)"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span class="btn-text">Reprint</span>
                  </button>
                </span>
              </div>

              <!-- Details -->
              <div v-if="expandedId === sale.receiptNumber" class="sale-details">
                <div v-if="sale.voided" class="void-info">
                  <strong>Voided</strong> on {{ formatIso(sale.voided.at) }}
                  <span v-if="sale.voided.reason"> — Reason: {{ sale.voided.reason }}</span>
                </div>
                <table class="details-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th class="num">Price</th>
                      <th class="num">Qty</th>
                      <th class="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in sale.items" :key="`${item.type}-${item.id}`">
                      <td>
                        {{ item.name }}
                        <span class="type-tag">{{ item.type }}</span>
                      </td>
                      <td class="num">{{ formatAmount(item.price) }}</td>
                      <td class="num">{{ item.quantity }}</td>
                      <td class="num">{{ formatAmount(item.price * item.quantity) }}</td>
                    </tr>
                  </tbody>
                </table>
                <dl class="details-totals">
                  <div><dt>Subtotal</dt><dd>Rs. {{ formatAmount(sale.subtotal) }}</dd></div>
                  <div v-if="sale.discount > 0">
                    <dt>Discount{{ sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : '' }}</dt>
                    <dd>- Rs. {{ formatAmount(sale.discount) }}</dd>
                  </div>
                  <div v-if="sale.tax > 0">
                    <dt>Tax ({{ sale.taxRate }}%)</dt>
                    <dd>+ Rs. {{ formatAmount(sale.tax) }}</dd>
                  </div>
                  <div class="grand"><dt>Total</dt><dd>Rs. {{ formatAmount(sale.grandTotal) }}</dd></div>
                </dl>
              </div>
            </li>
          </ul>

          <button
            v-if="visibleSales.length < filteredSales.length"
            class="show-more"
            @click="visibleCount += PAGE_SIZE"
          >
            Show more ({{ filteredSales.length - visibleSales.length }} remaining)
          </button>
        </template>
      </section>
    </main>

    <!-- Print-only receipt used for reprints -->
    <Receipt :data="reprintData" reprint />
  </div>
</template>

<script setup>
/**
 * Sales History
 *
 * Lists completed sales saved by the POS in localStorage, with date-range
 * filtering, search, daily summary and receipt reprinting (marked as a
 * duplicate copy).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import Receipt from '@/components/pos/Receipt.vue'
import { usePrintReceipt } from '@/composables/usePrintReceipt'
import { STORAGE_KEYS, loadSales, saveSales } from '@/utils/storage'

const PAGE_SIZE = 50

// ---------- Data ----------
const allSales = ref([])

const refreshSales = () => {
  allSales.value = loadSales()
    .filter(s => s && s.receiptNumber)
    .sort((a, b) => saleTime(b) - saleTime(a)) // newest first
}

// Keep in sync if a sale is made in another tab
const onStorage = (e) => {
  if (e.key === null || e.key?.endsWith(STORAGE_KEYS.sales)) refreshSales()
}

onMounted(() => {
  refreshSales()
  window.addEventListener('storage', onStorage)
})
onUnmounted(() => window.removeEventListener('storage', onStorage))

// ---------- Filters ----------
const ranges = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All' }
]

const range = ref('today')
const customDate = ref('') // YYYY-MM-DD when range === 'custom'
const searchQuery = ref('')
const expandedId = ref(null)
const visibleCount = ref(PAGE_SIZE)

const toInputValue = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const todayInputValue = toInputValue(new Date())

const setRange = (id) => {
  range.value = id
  customDate.value = ''
}

const onCustomDate = (value) => {
  if (!value) {
    setRange('today')
    return
  }
  customDate.value = value
  range.value = 'custom'
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** [from, to) in ms for the selected range; null = no limit */
const rangeBounds = computed(() => {
  const today = startOfDay(new Date())
  switch (range.value) {
    case 'today': return [today, addDays(today, 1)]
    case 'yesterday': return [addDays(today, -1), today]
    case 'week': return [addDays(today, -6), addDays(today, 1)]
    case 'month': return [new Date(today.getFullYear(), today.getMonth(), 1), addDays(today, 1)]
    case 'custom': {
      const [y, m, d] = customDate.value.split('-').map(Number)
      const day = new Date(y, m - 1, d)
      return [day, addDays(day, 1)]
    }
    default: return null
  }
})

const rangeLabel = computed(() => {
  if (range.value === 'custom' && customDate.value) {
    const [y, m, d] = customDate.value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  return ranges.find(r => r.id === range.value)?.label ?? ''
})

const filteredSales = computed(() => {
  const bounds = rangeBounds.value
  const q = searchQuery.value.trim().toLowerCase()

  return allSales.value.filter(sale => {
    if (bounds) {
      const t = saleTime(sale)
      if (t < bounds[0].getTime() || t >= bounds[1].getTime()) return false
    }
    if (q) {
      const haystack = [sale.receiptNumber, sale.patientName, sale.patientPhone]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
})

const visibleSales = computed(() => filteredSales.value.slice(0, visibleCount.value))

// Reset paging/expansion when the filter changes
watch([range, customDate, searchQuery], () => {
  visibleCount.value = PAGE_SIZE
  expandedId.value = null
})

// Voided sales stay listed but are excluded from every total
const totals = computed(() => {
  const byPayment = {}
  let count = 0
  let revenue = 0
  let discount = 0
  let voidCount = 0
  let voidAmount = 0
  for (const sale of filteredSales.value) {
    if (sale.voided) {
      voidCount++
      voidAmount += sale.grandTotal || 0
      continue
    }
    count++
    revenue += sale.grandTotal || 0
    discount += sale.discount || 0
    const method = sale.paymentMethod || 'Other'
    byPayment[method] ??= { method, count: 0, amount: 0 }
    byPayment[method].count++
    byPayment[method].amount += sale.grandTotal || 0
  }
  return {
    count,
    revenue,
    discount,
    voidCount,
    voidAmount,
    byPayment: Object.values(byPayment).sort((a, b) => b.amount - a.amount)
  }
})

// ---------- Helpers ----------
function saleTime(sale) {
  const t = Date.parse(sale.createdAt)
  if (!Number.isNaN(t)) return t
  // Fallback for records without createdAt
  const fallback = Date.parse(`${sale.date} ${sale.time}`)
  return Number.isNaN(fallback) ? 0 : fallback
}

const formatAmount = (n) => (Number(n) || 0).toLocaleString()

const formatDateTime = (sale) => {
  const t = saleTime(sale)
  if (!t) return [sale.date, sale.time].filter(Boolean).join(' ')
  return new Date(t).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const itemCount = (sale) =>
  (sale.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

const toggle = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

// ---------- Reprint ----------
const { isPrinting, printReceipt } = usePrintReceipt()

const reprintData = ref({
  receiptNumber: '', date: '', time: '', patientName: '', patientPhone: '',
  items: [], subtotal: 0, discount: 0, discountType: 'flat', discountValue: 0,
  tax: 0, taxRate: 0, grandTotal: 0, paymentMethod: 'Cash'
})

const reprint = async (sale) => {
  if (sale.voided) return
  // Reprint exactly what was sold — the saved snapshot, never current prices
  reprintData.value = sale
  await printReceipt()
}

// ---------- Void ----------
/**
 * Marks a sale as void. The record is kept (with time and reason) for the
 * audit trail; it is only excluded from totals. Voiding cannot be undone.
 */
const voidSale = (sale) => {
  const reason = window.prompt(
    `Void receipt ${sale.receiptNumber} (Rs. ${formatAmount(sale.grandTotal)})?\n\n` +
    'The sale stays in history marked VOID and is removed from totals. This cannot be undone.\n\n' +
    'Reason (required):'
  )
  if (reason === null) return // cancelled
  if (!reason.trim()) {
    alert('A reason is required to void a sale.')
    return
  }

  // Re-read storage so a sale made in another tab isn't overwritten
  const sales = loadSales()
  const target = sales.find(s => s.receiptNumber === sale.receiptNumber)
  if (!target) {
    alert('This sale could not be found in storage.')
    return
  }
  if (target.voided) {
    refreshSales()
    return
  }

  target.voided = { at: new Date().toISOString(), reason: reason.trim() }
  if (!saveSales(sales)) {
    alert('Could not save the void (browser storage is unavailable or full).')
    return
  }
  refreshSales()
}

const formatIso = (iso) => {
  const t = Date.parse(iso)
  return Number.isNaN(t)
    ? ''
    : new Date(t).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

// ---------- CSV export ----------
const pad2 = (n) => String(n).padStart(2, '0')

/** Quote a CSV cell; neutralise values Excel would run as formulas. */
const csvCell = (value) => {
  let v = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Phone numbers as text so Excel keeps the leading 0 (03xx…) */
const csvPhone = (phone) => {
  const p = (phone || '').trim()
  if (!p) return ''
  return /^[0-9+\s-]+$/.test(p) ? `="${p}"` : csvCell(p)
}

/**
 * Downloads the sales currently shown (respects date filter + search),
 * oldest first, one row per sale. Opens directly in Excel.
 */
const exportCsv = () => {
  const header = [
    'Receipt No', 'Date', 'Time', 'Patient Name', 'Patient Phone', 'Items',
    'Item Count', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Method',
    'Status', 'Void Reason', 'Voided At'
  ]

  const rows = [...filteredSales.value]
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
        csvCell(sale.patientName),
        csvPhone(sale.patientPhone),
        csvCell(items),
        itemCount(sale),
        sale.subtotal || 0,
        sale.discount || 0,
        sale.tax || 0,
        sale.grandTotal || 0,
        csvCell(sale.paymentMethod),
        sale.voided ? 'VOID' : 'Completed',
        csvCell(sale.voided?.reason),
        csvCell(sale.voided ? formatIso(sale.voided.at) : '')
      ].join(',')
    })

  // BOM so Excel reads UTF-8 (e.g. Urdu names) correctly
  const csv = '﻿' + [header.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })

  const rangePart = range.value === 'custom' ? customDate.value : range.value
  const filename = `sales-${rangePart}-${todayInputValue}.csv`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<style scoped>
.history-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
}

.history-main {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ---------- Header row ---------- */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #064e3b;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #047857;
}

.search-box {
  position: relative;
  width: min(100%, 360px);
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.125rem;
  height: 1.125rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.625rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

/* ---------- Filters ---------- */
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.range-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  padding: 0.5rem 0.875rem;
  border: 2px solid #d1fae5;
  border-radius: 9999px;
  background: white;
  color: #047857;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: #10b981;
}

.chip.active {
  background: #059669;
  border-color: #059669;
  color: white;
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #047857;
}

.date-picker input {
  padding: 0.4375rem 0.625rem;
  border: 2px solid #d1fae5;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
}

.date-picker input:focus {
  outline: none;
  border-color: #10b981;
}

.filters-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border: 2px solid #059669;
  border-radius: 0.5rem;
  background: white;
  color: #047857;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn svg {
  width: 1rem;
  height: 1rem;
}

.export-btn:hover:not(:disabled) {
  background: #059669;
  color: white;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summary-note {
  font-size: 0.75rem;
  color: #b91c1c;
}

/* ---------- Summary ---------- */
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.4fr);
  gap: 0.75rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.125rem;
  background: white;
  border-radius: 0.875rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  min-width: 0;
}

.summary-card.highlight {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.highlight .summary-label {
  color: rgba(255, 255, 255, 0.85);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.highlight .summary-value {
  color: white;
}

.payment-split {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.875rem;
  color: #374151;
}

.payment-split-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.payment-split-row span:last-child {
  font-weight: 600;
}

.summary-empty {
  color: #9ca3af;
}

/* ---------- Sales list ---------- */
.sales-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.sales-head,
.sale-row {
  display: grid;
  grid-template-columns: 11.5rem 10.5rem minmax(0, 1fr) 3.5rem 5.5rem 7rem 17.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
}

.sales-head {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sales-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sale + .sale {
  border-top: 1px solid #f1f5f9;
}

.sale.open {
  background: #f0fdf4;
}

.sale-row {
  font-size: 0.875rem;
  color: #374151;
}

.sale-receipt {
  font-family: ui-monospace, 'Courier New', monospace;
  font-weight: 600;
  color: #111827;
}

.sale-date {
  color: #6b7280;
}

.sale-patient {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sale-patient small {
  color: #6b7280;
  font-size: 0.75rem;
}

.muted {
  color: #9ca3af;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  background: #d1fae5;
  color: #047857;
  font-size: 0.75rem;
  font-weight: 600;
}

.sale-total {
  font-weight: 700;
  color: #059669;
}

.mobile-only {
  display: none;
}

.sale-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.icon-btn,
.reprint-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn {
  border: 1px solid #e5e7eb;
  background: white;
  color: #4b5563;
}

.icon-btn:hover {
  border-color: #10b981;
  color: #059669;
}

.chevron {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s;
}

.sale.open .chevron {
  transform: rotate(180deg);
}

.reprint-btn {
  border: none;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
}

.reprint-btn svg {
  width: 1rem;
  height: 1rem;
}

.reprint-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}

.reprint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.void-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  background: white;
  color: #dc2626;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.void-btn svg {
  width: 1rem;
  height: 1rem;
}

.void-btn:hover {
  background: #fef2f2;
  border-color: #dc2626;
}

/* Voided sales: kept for the record, visibly struck out */
.void-badge {
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  background: #dc2626;
  color: white;
  font-family: Arial, sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  vertical-align: middle;
}

.sale.voided .sale-date,
.sale.voided .sale-patient,
.sale.voided .sale-items,
.sale.voided .sale-payment {
  opacity: 0.55;
}

.sale.voided .sale-total {
  color: #9ca3af;
  text-decoration: line-through;
}

.void-info {
  grid-column: 1 / -1;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.8125rem;
}

/* Details */
.sale-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16rem;
  gap: 1.5rem;
  padding: 0.25rem 1.25rem 1.25rem;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
}

.details-table th,
.details-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.details-table th.num,
.details-table td.num {
  text-align: right;
}

.details-table thead {
  background: #ecfdf5;
  color: #047857;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.details-table tbody tr + tr {
  border-top: 1px solid #f1f5f9;
}

.type-tag {
  margin-left: 0.375rem;
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.6875rem;
  text-transform: capitalize;
}

.details-totals {
  margin: 0;
  align-self: start;
  background: white;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}

.details-totals div {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  color: #4b5563;
}

.details-totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.details-totals .grand {
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 2px solid #10b981;
  font-weight: 700;
  color: #059669;
}

.show-more {
  display: block;
  width: 100%;
  padding: 0.875rem;
  border: none;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #047857;
  font-weight: 600;
  cursor: pointer;
}

.show-more:hover {
  background: #ecfdf5;
}

/* Empty */
.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 0.75rem;
  opacity: 0.6;
}

/* ---------- Responsive ---------- */
@media (max-width: 1279px) {
  .sales-head,
  .sale-row {
    grid-template-columns: 11rem 9.5rem minmax(0, 1fr) 3rem 5rem 6.5rem auto;
  }

  .icon-btn .btn-text,
  .void-btn .btn-text {
    display: none;
  }
}

@media (max-width: 1023px) {
  .history-main {
    padding: 1rem;
  }

  .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .summary-card.payments {
    grid-column: 1 / -1;
  }

  /* Rows become cards */
  .sales-head {
    display: none;
  }

  .sale-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "receipt total"
      "date    payment"
      "patient items"
      "actions actions";
    gap: 0.375rem 0.75rem;
    padding: 1rem;
  }

  .sale-receipt { grid-area: receipt; }
  .sale-total { grid-area: total; font-size: 1rem; }
  .sale-date { grid-area: date; font-size: 0.8125rem; }
  .sale-payment { grid-area: payment; text-align: right; }
  .sale-patient { grid-area: patient; }
  .sale-items { grid-area: items; color: #6b7280; }

  .sale-actions {
    grid-area: actions;
    margin-top: 0.375rem;
  }

  .sale-actions button {
    flex: 1;
    justify-content: center;
    padding: 0.625rem;
  }

  .icon-btn .btn-text,
  .void-btn .btn-text,
  .mobile-only {
    display: inline;
  }

  .sale-details {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 0 1rem 1rem;
  }
}

@media (max-width: 640px) {
  .history-main {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .page-head {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  /* avoid iOS zoom on focus */
  .search-input,
  .date-picker input {
    font-size: 16px;
  }

  .range-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    margin: 0 -0.75rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    scrollbar-width: none;
  }

  .range-chips::-webkit-scrollbar {
    display: none;
  }

  .chip {
    flex-shrink: 0;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-right {
    flex-wrap: nowrap;
  }

  .date-picker {
    flex: 1;
    min-width: 0;
  }

  .date-picker input {
    flex: 1;
    min-width: 0;
  }

  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-card.highlight {
    grid-column: 1 / -1;
    order: -1;
  }

  .summary-value {
    font-size: 1.25rem;
  }

  .sales-panel {
    border-radius: 0.75rem;
  }

  .details-table th,
  .details-table td {
    padding: 0.5rem;
  }
}

/* ---------- Print: only the receipt ---------- */
@media print {
  .history-layout {
    background: #fff;
    min-height: auto;
  }
}
</style>
