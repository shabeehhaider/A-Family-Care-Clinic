<template>
  <div class="catalog">
    <!-- Tabs -->
    <div class="product-tabs" role="tablist" aria-label="Catalog">
      <button
        v-for="tab in tabs"
        :id="`tab-${tab.id}`"
        :key="tab.id"
        :ref="el => (tabEls[tab.id] = el)"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        aria-controls="catalog-tabpanel"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="selectTab(tab.id)"
        @keydown.right.prevent="moveTab(1)"
        @keydown.left.prevent="moveTab(-1)"
      >
        <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
        </svg>
        {{ tab.label }}
        <span v-if="tab.id === 'medicines' && alertCount" class="tab-alert" :title="`${alertCount} stock / expiry alerts`">
          {{ alertCount }}
          <span class="sr-only">stock or expiry alerts</span>
        </span>
      </button>
    </div>

    <!-- Search -->
    <div class="search-box">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="`Search ${activeTab}...`"
        :aria-label="`Search ${activeTab}`"
        class="search-input"
        @keydown.escape="searchQuery = ''"
      />
      <button v-if="searchQuery" type="button" class="clear-search" aria-label="Clear search" @click="searchQuery = ''">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div id="catalog-tabpanel" class="catalog-section" role="tabpanel" :aria-labelledby="`tab-${activeTab}`">
      <div class="catalog-toolbar">
        <button
          v-if="canEdit"
          type="button"
          :class="['add-item-btn', activeTab]"
          @click="emit('add', currentType)"
        >
          <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New {{ typeLabel(currentType) }}
        </button>

        <div v-if="activeTab === 'medicines' && alertCount" class="stock-filter" role="group" aria-label="Medicine filter">
          <button
            type="button"
            :class="['filter-chip', { active: medicineFilter === 'all' }]"
            :aria-pressed="medicineFilter === 'all'"
            @click="medicineFilter = 'all'"
          >
            All
          </button>
          <button
            type="button"
            :class="['filter-chip', 'warn', { active: medicineFilter === 'alerts' }]"
            :aria-pressed="medicineFilter === 'alerts'"
            @click="medicineFilter = 'alerts'"
          >
            Needs attention ({{ alertCount }})
          </button>
        </div>
      </div>

      <div :class="['products-grid', { 'medicines-grid': activeTab === 'medicines' }]">
        <div
          v-for="entry in visibleItems"
          :key="entry.item.id"
          :class="[
            'product-card',
            activeTab === 'services' ? 'service-card' : 'medicine-card',
            { 'with-actions': canEdit, unavailable: entry.status && (entry.status.out || entry.status.expired) }
          ]"
        >
          <div v-if="canEdit" class="card-actions">
            <button
              type="button"
              class="action-icon edit-icon"
              :title="`Edit ${entry.item.name}`"
              :aria-label="`Edit ${entry.item.name}`"
              @click.stop="emit('edit', entry.item, currentType)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ICONS.edit" />
              </svg>
            </button>
            <button
              type="button"
              class="action-icon delete-icon"
              :title="`Delete ${entry.item.name}`"
              :aria-label="`Delete ${entry.item.name}`"
              @click.stop="emit('delete', entry.item, currentType)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ICONS.trash" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            class="card-content"
            :aria-label="cardLabel(entry)"
            @click="emit('add-to-cart', entry.item, currentType)"
          >
            <div :class="['product-icon', { 'medicine-icon': activeTab === 'medicines' }]" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconFor(entry.item, currentType)" />
              </svg>
            </div>
            <div class="product-info">
              <span class="product-name">{{ entry.item.name }}</span>
              <span class="product-price">Rs. {{ formatAmount(entry.item.price) }}</span>
            </div>
            <div v-if="entry.badges.length" class="badges" aria-hidden="true">
              <span v-for="b in entry.badges" :key="b.text" :class="['stock-badge', b.tone]">{{ b.text }}</span>
            </div>
          </button>
        </div>

        <p v-if="visibleItems.length === 0" class="catalog-empty">
          <template v-if="searchQuery">No {{ activeTab }} match "{{ searchQuery }}".</template>
          <template v-else-if="medicineFilter === 'alerts' && activeTab === 'medicines'">No medicines need attention.</template>
          <template v-else-if="canEdit">No {{ activeTab }} yet. Use "Add New {{ typeLabel(currentType) }}" above.</template>
          <template v-else>No {{ activeTab }} yet. Ask an admin to add them.</template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Services / medicines catalog: tabs, search, stock & expiry badges, and
 * (for admins) add / edit / delete actions. Emits intent; Pos.vue acts on it.
 */
import { ref, computed, watch } from 'vue'
import { typeLabel, iconFor } from '@/composables/useCatalog'
import { stockStatus } from '@/utils/inventory'
import { formatAmount } from '@/utils/format'

const props = defineProps({
  services: { type: Array, required: true },
  medicines: { type: Array, required: true },
  canEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['add-to-cart', 'add', 'edit', 'delete'])

const ICONS = {
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
}

const tabs = [
  { id: 'services', label: 'Services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'medicines', label: 'Medicines', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' }
]

const activeTab = ref('services')
const searchQuery = ref('')
const medicineFilter = ref('all')
const tabEls = {}

const currentType = computed(() => (activeTab.value === 'services' ? 'service' : 'medicine'))

const selectTab = (id) => {
  activeTab.value = id
}

const moveTab = (step) => {
  const i = tabs.findIndex(t => t.id === activeTab.value)
  const next = tabs[(i + step + tabs.length) % tabs.length]
  selectTab(next.id)
  tabEls[next.id]?.focus()
}

/** Badges shown on a medicine card */
function badgesFor(status, medicine) {
  if (!status) return []
  const badges = []
  if (status.expired) badges.push({ text: 'Expired', tone: 'danger' })
  else if (status.expiringSoon) badges.push({ text: `Expires in ${status.daysToExpiry}d`, tone: 'warn' })

  if (status.out) badges.push({ text: 'Out of stock', tone: 'danger' })
  else if (status.low) badges.push({ text: `Low: ${medicine.stock} left`, tone: 'warn' })
  else if (status.tracked) badges.push({ text: `${medicine.stock} in stock`, tone: 'muted' })
  return badges
}

const needsAttention = (s) => s.out || s.low || s.expired || s.expiringSoon

const medicineEntries = computed(() => {
  const today = new Date()
  return props.medicines.map(item => {
    const status = stockStatus(item, today)
    return { item, status, badges: badgesFor(status, item) }
  })
})

const alertCount = computed(() => medicineEntries.value.filter(e => needsAttention(e.status)).length)

// Leave the "needs attention" filter once nothing needs attention
watch(alertCount, (n) => {
  if (n === 0) medicineFilter.value = 'all'
})

const visibleItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let entries = activeTab.value === 'services'
    ? props.services.map(item => ({ item, status: null, badges: [] }))
    : medicineEntries.value

  if (activeTab.value === 'medicines' && medicineFilter.value === 'alerts') {
    entries = entries.filter(e => needsAttention(e.status))
  }
  if (q) entries = entries.filter(e => e.item.name.toLowerCase().includes(q))
  return entries
})

const cardLabel = (entry) => {
  const parts = [`Add ${entry.item.name}, Rs. ${formatAmount(entry.item.price)}`]
  for (const b of entry.badges) parts.push(b.text)
  return parts.join(', ')
}
</script>

<style scoped>
.catalog {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Tabs */
.product-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #10b981;
  color: #059669;
}

.tab-btn.active {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.tab-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.tab-alert {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  background: #f59e0b;
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.25rem;
}

/* Search */
.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

/* hide native clear button; we provide our own */
.search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
}

.clear-search:hover {
  background: #e5e7eb;
  color: #374151;
}

/* Catalog */
/* No overflow:hidden here: the grid's negative top margin (room for the hover
   lift) would be clipped when it is the first child, i.e. for cashiers, who
   have no "Add New" button above it. min-height:0 is enough for the scrolling. */
.catalog-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.catalog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.catalog-toolbar:empty {
  display: none;
}

.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border: none;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.add-item-btn.services {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.add-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.stock-filter {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 0.375rem 0.875rem;
  border: 2px solid #e5e7eb;
  border-radius: 9999px;
  background: white;
  color: #4b5563;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-chip.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.filter-chip.warn.active {
  border-color: #d97706;
  background: #fffbeb;
  color: #b45309;
}

.products-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  /* rows must fit their content; otherwise cards with overflow:hidden get
     squashed to the panel height instead of the grid scrolling */
  grid-auto-rows: max-content;
  gap: 0.875rem;
  overflow-y: auto;
  /* room for the hover lift and shadow inside the scroll container */
  padding: 0.5rem 0.75rem 1rem 0.5rem;
  margin: -0.5rem -0.5rem 0;
  align-content: start;
}

.medicines-grid {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.products-grid::-webkit-scrollbar {
  width: 6px;
}

.products-grid::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.products-grid::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 3px;
}

.catalog-empty {
  grid-column: 1 / -1;
  padding: 2rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Cards */
.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.875rem;
  overflow: hidden;
  transition: all 0.2s;
}

.product-card:hover {
  border-color: #10b981;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15);
}

@media (hover: hover) and (pointer: fine) {
  .product-card:hover {
    transform: translateY(-2px);
  }
}

.product-card.unavailable {
  opacity: 0.6;
}

.card-content {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
}

.medicine-card .card-content:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.service-card .card-content:hover {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.product-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  color: #059669;
}

.product-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.medicine-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.product-info {
  text-align: center;
}

.product-name {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.product-price {
  font-size: 0.875rem;
  font-weight: 700;
  color: #059669;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.stock-badge {
  padding: 0.0625rem 0.4375rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

.stock-badge.muted {
  background: #f1f5f9;
  color: #475569;
}

.stock-badge.warn {
  background: #fef3c7;
  color: #92400e;
}

.stock-badge.danger {
  background: #fee2e2;
  color: #b91c1c;
}

/* Edit / delete (admin) */
.card-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  transition: opacity 0.2s;
  z-index: 10;
}

/* Hide until hover only with a real mouse; touch users always see them */
@media (hover: hover) and (pointer: fine) {
  .card-actions {
    opacity: 0;
  }

  .product-card:hover .card-actions,
  .card-actions:focus-within {
    opacity: 1;
  }
}

.action-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon svg {
  width: 1rem;
  height: 1rem;
}

.edit-icon {
  background: #fef3c7;
  color: #d97706;
}

.edit-icon:hover {
  background: #fcd34d;
  color: #92400e;
}

.delete-icon {
  background: #fee2e2;
  color: #dc2626;
}

.delete-icon:hover {
  background: #fca5a5;
  color: #991b1b;
}

/* Touch devices: always-visible actions need room above the icon */
@media (hover: none), (pointer: coarse) {
  .with-actions .card-content {
    padding-top: 2.75rem;
  }

  .action-icon {
    width: 2rem;
    height: 2rem;
  }
}

/* Stacked layout (portrait tablet & phone): page scrolls, not the grid */
@media (max-width: 1023px) {
  .products-grid {
    overflow: visible;
    padding: 0;
    margin: 0;
  }
}

@media (max-width: 640px) {
  .search-input {
    font-size: 16px;
  }

  .tab-btn {
    padding: 0.625rem 0.75rem;
  }

  .products-grid,
  .medicines-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem;
  }

  .card-content {
    padding: 0.75rem;
  }

  .product-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .product-name {
    word-break: break-word;
  }
}

@media (max-width: 640px) and (hover: none), (max-width: 640px) and (pointer: coarse) {
  .with-actions .card-content {
    padding-top: 2.75rem;
  }
}

@media (max-width: 380px) {
  .tab-icon {
    display: none;
  }
}
</style>
