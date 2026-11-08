<template>
  <div class="inventory-layout">
    <AppHeader />

    <main class="inventory-main no-print">
      <!-- Title + search -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Inventory</h1>
          <p class="page-subtitle">Medicine stock and expiry</p>
        </div>
        <div class="head-actions">
          <div class="search-box">
            <svg class="search-icon" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="search-input"
              placeholder="Search medicines"
              aria-label="Search medicines"
              @keydown.escape="searchQuery = ''"
            />
          </div>
          <button v-if="isAdmin" type="button" class="add-btn" @click="openAdd">
            <svg class="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Medicine
          </button>
        </div>
      </div>

      <!-- Summary (each card filters the table) -->
      <div class="summary" role="group" aria-label="Stock summary">
        <button
          v-for="card in summaryCards"
          :key="card.id"
          type="button"
          :class="['summary-card', card.tone, { active: filter === card.id }]"
          :aria-pressed="filter === card.id"
          @click="filter = card.id"
        >
          <span class="summary-value">{{ card.value }}</span>
          <span class="summary-label">{{ card.label }}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <label class="sort">
          <span>Sort by</span>
          <select v-model="sortBy" class="sort-select">
            <option value="status">Most urgent first</option>
            <option value="name">Name (A–Z)</option>
            <option value="stock">Stock (lowest first)</option>
            <option value="expiry">Expiry (soonest first)</option>
          </select>
        </label>
        <div class="toolbar-actions">
          <button type="button" class="tool-btn" :disabled="rows.length === 0 || isPrinting" @click="printList">
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ICONS.print" />
            </svg>
            Print List
          </button>
          <button type="button" class="tool-btn" :disabled="rows.length === 0" @click="exportCsv">
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Table -->
      <section class="stock-panel" aria-label="Medicines">
        <div v-if="rows.length === 0" class="empty-state">
          <template v-if="medicines.length === 0">No medicines yet.</template>
          <template v-else-if="searchQuery">No medicines match "{{ searchQuery }}".</template>
          <template v-else>Nothing here — all good.</template>
        </div>

        <template v-else>
          <div :class="['stock-head', { 'with-actions': isAdmin }]" aria-hidden="true">
            <span>Medicine</span>
            <span class="num">Price</span>
            <span class="num">Stock</span>
            <span class="num">Warn at</span>
            <span>Expiry</span>
            <span>Status</span>
            <span v-if="isAdmin"></span>
          </div>

          <ul class="stock-list">
            <li v-for="r in rows" :key="r.item.id" :class="['stock-row', `is-${r.key}`, { 'with-actions': isAdmin }]">
              <span class="col-name">{{ r.item.name }}</span>
              <span class="col-price num"><span class="mobile-label">Price</span>Rs. {{ formatAmount(r.item.price) }}</span>
              <span class="col-stock num">
                <span class="mobile-label">Stock</span>
                <strong v-if="r.status.tracked">{{ r.item.stock }}</strong>
                <span v-else class="muted">—</span>
              </span>
              <span class="col-warn num">
                <span class="mobile-label">Warn at</span>
                {{ r.status.tracked ? r.item.lowStockAt ?? 10 : '—' }}
              </span>
              <span class="col-expiry">
                <span class="mobile-label">Expiry</span>
                <template v-if="r.item.expiry">
                  {{ formatExpiry(r.item.expiry) }}
                  <small v-if="r.status.expired" class="expiry-note danger">expired</small>
                  <small v-else-if="r.status.expiringSoon" class="expiry-note warn">in {{ r.status.daysToExpiry }}d</small>
                </template>
                <span v-else class="muted">—</span>
              </span>
              <span class="col-status"><span :class="['status-badge', r.key]">{{ r.label }}</span></span>
              <span v-if="isAdmin" class="col-actions">
                <button type="button" class="row-btn primary" :aria-label="`Update stock of ${r.item.name}`" @click="openAdjust(r.item)">
                  Update Stock
                </button>
                <button type="button" class="row-btn" :aria-label="`Edit ${r.item.name}`" @click="openEdit(r.item)">
                  Edit
                </button>
              </span>
            </li>
          </ul>
        </template>
      </section>
    </main>

    <!-- Print-only stock list -->
    <StockReport
      :rows="printData.rows"
      :filter-label="printData.filterLabel"
      :printed-at="printData.printedAt"
      :printed-by="printData.printedBy"
    />

    <StockAdjustModal :open="adjustTarget !== null" :medicine="adjustTarget" @save="saveStock" @close="adjustTarget = null" />

    <ItemFormModal
      :open="itemForm.open"
      :mode="itemForm.mode"
      type="medicine"
      :item="itemForm.item"
      :is-name-taken="(name, exceptId) => isNameTaken('medicine', name, exceptId)"
      @save="saveItem"
      @close="itemForm.open = false"
    />
  </div>
</template>

<script setup>
/**
 * Inventory: all medicines with stock, warning level, expiry and status.
 * Everyone can view; admins can update stock, edit and add medicines.
 */
import { ref, reactive, computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StockAdjustModal from '@/components/inventory/StockAdjustModal.vue'
import StockReport from '@/components/inventory/StockReport.vue'
import ItemFormModal from '@/components/pos/ItemFormModal.vue'
import { useCatalog } from '@/composables/useCatalog'
import { useAuth } from '@/composables/useAuth'
import { usePrintReceipt } from '@/composables/usePrintReceipt'
import {
  stockStatus, statusKey, needsAttention, summarizeInventory, STATUS_LABELS, STATUS_ORDER
} from '@/utils/inventory'
import { buildInventoryCsv, downloadTextFile } from '@/utils/csv'
import { formatAmount, formatDateTime, toDateInputValue, parseDateInputValue } from '@/utils/format'

const ICONS = {
  print: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z'
}

const SHORT_LABELS = {
  expired: 'EXPIRED', out: 'OUT', low: 'LOW', expiring: 'EXP SOON', unset: '-', ok: 'OK'
}

const { medicines, isNameTaken, addItem, updateItem } = useCatalog()
const { currentUser, isAdmin } = useAuth()
const { isPrinting, printReceipt } = usePrintReceipt()

// ---------- Rows ----------
const searchQuery = ref('')
const filter = ref('all')
const sortBy = ref('status')

const allRows = computed(() => {
  const today = new Date()
  return medicines.value.map(item => {
    const status = stockStatus(item, today)
    const key = statusKey(status)
    return { item, status, key, label: STATUS_LABELS[key], shortLabel: SHORT_LABELS[key] }
  })
})

const summary = computed(() => summarizeInventory(medicines.value))

const summaryCards = computed(() => [
  { id: 'all', label: 'All medicines', value: summary.value.total, tone: 'neutral' },
  { id: 'attention', label: 'Need attention', value: summary.value.attention, tone: 'warn' },
  { id: 'out', label: 'Out of stock', value: summary.value.out, tone: 'danger' },
  { id: 'low', label: 'Low stock', value: summary.value.low, tone: 'warn' },
  { id: 'expiring', label: 'Expired / expiring', value: summary.value.expiring, tone: 'danger' },
  { id: 'unset', label: 'Stock not set', value: summary.value.unset, tone: 'muted' }
])

const FILTERS = {
  all: () => true,
  attention: r => needsAttention(r.status),
  out: r => r.status.out,
  low: r => r.status.low,
  expiring: r => r.status.expired || r.status.expiringSoon,
  unset: r => !r.status.tracked
}

const byName = (a, b) => a.item.name.localeCompare(b.item.name)
const SORTS = {
  name: byName,
  status: (a, b) => STATUS_ORDER.indexOf(a.key) - STATUS_ORDER.indexOf(b.key) || byName(a, b),
  // untracked medicines last
  stock: (a, b) => (a.status.tracked ? a.item.stock : Infinity) - (b.status.tracked ? b.item.stock : Infinity) || byName(a, b),
  // no expiry last
  expiry: (a, b) => (a.item.expiry || '9999').localeCompare(b.item.expiry || '9999') || byName(a, b)
}

const rows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return allRows.value
    .filter(FILTERS[filter.value])
    .filter(r => !q || r.item.name.toLowerCase().includes(q))
    .sort(SORTS[sortBy.value])
})

const formatExpiry = (value) =>
  parseDateInputValue(value)?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) || value

const filterLabel = computed(() => {
  const card = summaryCards.value.find(c => c.id === filter.value)
  const base = filter.value === 'all' ? 'All medicines' : card?.label || ''
  return searchQuery.value.trim() ? `${base} — "${searchQuery.value.trim()}"` : base
})

// ---------- Admin actions ----------
const adjustTarget = ref(null)

const openAdjust = (item) => {
  if (isAdmin.value) adjustTarget.value = item
}

const saveStock = (newStock) => {
  if (adjustTarget.value) updateItem('medicine', adjustTarget.value.id, { stock: newStock })
  adjustTarget.value = null
}

const itemForm = reactive({ open: false, mode: 'add', item: null })

const openAdd = () => {
  if (isAdmin.value) Object.assign(itemForm, { open: true, mode: 'add', item: null })
}

const openEdit = (item) => {
  if (isAdmin.value) Object.assign(itemForm, { open: true, mode: 'edit', item })
}

const saveItem = (data) => {
  if (itemForm.mode === 'edit' && itemForm.item) updateItem('medicine', itemForm.item.id, data)
  else addItem('medicine', data)
  itemForm.open = false
}

// ---------- Print / export ----------
const printData = ref({ rows: [], filterLabel: '', printedAt: '', printedBy: '' })

const printList = async () => {
  printData.value = {
    rows: rows.value,
    filterLabel: filterLabel.value,
    printedAt: formatDateTime(new Date()),
    printedBy: currentUser.value?.name || ''
  }
  await printReceipt()
}

const exportCsv = () => {
  downloadTextFile(
    `stock-${filter.value}-${toDateInputValue(new Date())}.csv`,
    buildInventoryCsv(rows.value),
    'text/csv;charset=utf-8'
  )
}
</script>

<style scoped>
.inventory-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
}

.inventory-main {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Head */
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

.head-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  width: 320px;
  max-width: 100%;
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
  padding: 0.6875rem 1rem 0.6875rem 2.625rem;
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

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.6875rem 1rem;
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

/* Summary cards (filters) */
.summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.875rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.875rem;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s;
}

.summary-card:hover {
  border-color: #a7f3d0;
}

.summary-card.active {
  border-color: #059669;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.summary-card.danger .summary-value { color: #dc2626; }
.summary-card.warn .summary-value { color: #d97706; }
.summary-card.muted .summary-value { color: #64748b; }

.summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #047857;
}

.sort-select {
  padding: 0.4375rem 0.625rem;
  border: 2px solid #d1fae5;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.tool-btn {
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
}

.tool-btn svg {
  width: 1rem;
  height: 1rem;
}

.tool-btn:hover:not(:disabled) {
  background: #059669;
  color: white;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Table */
.stock-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.stock-head,
.stock-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem 5rem 5rem 9rem 8.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
}

.stock-head.with-actions,
.stock-row.with-actions {
  grid-template-columns: minmax(0, 1fr) 6rem 5rem 5rem 9rem 8.5rem 11.5rem;
}

.stock-head {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.stock-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.stock-row {
  font-size: 0.875rem;
  color: #374151;
}

.stock-row + .stock-row {
  border-top: 1px solid #f1f5f9;
}

.stock-row.is-out,
.stock-row.is-expired {
  background: #fef2f2;
}

.stock-row.is-low,
.stock-row.is-expiring {
  background: #fffbeb;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-name {
  font-weight: 600;
  color: #111827;
}

.col-stock strong {
  font-size: 1rem;
}

.muted {
  color: #9ca3af;
}

.expiry-note {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
}

.expiry-note.danger { color: #dc2626; }
.expiry-note.warn { color: #b45309; }

.status-badge {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-badge.ok { background: #d1fae5; color: #047857; }
.status-badge.low,
.status-badge.expiring { background: #fef3c7; color: #92400e; }
.status-badge.out,
.status-badge.expired { background: #fee2e2; color: #b91c1c; }
.status-badge.unset { background: white; border: 1px dashed #cbd5e1; color: #64748b; }

.col-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
}

.row-btn {
  padding: 0.4375rem 0.625rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.row-btn:hover {
  border-color: #10b981;
  color: #047857;
}

.row-btn.primary {
  border-color: #059669;
  background: #059669;
  color: white;
}

.row-btn.primary:hover {
  background: #047857;
  color: white;
}

.mobile-label {
  display: none;
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 1100px) {
  .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .inventory-main {
    padding: 1rem;
  }

  /* Rows become cards */
  .stock-head {
    display: none;
  }

  .stock-row,
  .stock-row.with-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem 1rem;
    padding: 1rem;
  }

  .col-name {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
  }

  .col-status {
    grid-column: 1 / -1;
    order: -1;
  }

  .col-actions {
    grid-column: 1 / -1;
  }

  .col-actions .row-btn {
    flex: 1;
    padding: 0.625rem;
  }

  .num {
    text-align: left;
  }

  .mobile-label {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #9ca3af;
  }
}

@media (max-width: 640px) {
  .inventory-main {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .head-actions,
  .search-box {
    width: 100%;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }

  .search-input,
  .sort-select {
    font-size: 16px;
  }

  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-value {
    font-size: 1.25rem;
  }

  .toolbar,
  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions .tool-btn {
    flex: 1;
    justify-content: center;
  }
}

@media print {
  .inventory-layout {
    background: #fff;
    min-height: auto;
  }
}
</style>
