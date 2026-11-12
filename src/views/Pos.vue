<template>
  <!--
    POS screen: patient (optional) → catalog → cart → billing → payment → receipt.
    UI pieces live in components/pos/*; billing math in utils/billing.js;
    catalog & stock in composables/useCatalog.js.
  -->
  <PosLayout>
    <!-- Left: patient + catalog -->
    <template #products>
      <div class="products-container">
        <PatientInfo v-model:name="patientName" v-model:phone="patientPhone" />
        <div v-if="loadError" class="load-error" role="alert">
          <span>Couldn't load services and medicines: {{ loadError }}</span>
          <button type="button" class="retry-btn" @click="loadCatalog">Retry</button>
        </div>
        <CatalogPanel
          :services="services"
          :medicines="medicines"
          :can-edit="isAdmin"
          @add-to-cart="addToCart"
          @add="openItemForm('add', $event)"
          @edit="(item, type) => openItemForm('edit', type, item)"
          @delete="confirmDeleteItem"
        />
      </div>
    </template>

    <!-- Right: cart, billing, payment -->
    <template #checkout>
      <div ref="checkoutPanel" class="checkout-container">
        <div class="cart-section">
          <ItemList
            :items="cartView"
            title="Cart"
            @remove-item="removeFromCart"
            @update-quantity="updateQuantity"
          />
        </div>

        <BillingSummary
          v-model:discount-type="discountType"
          v-model:discount-value="discountValue"
          v-model:enable-tax="enableTax"
          v-model:tax-rate="taxRate"
          :totals="totals"
        />

        <PaymentPanel
          v-model:method="selectedPaymentMethod"
          :methods="PAYMENT_METHODS"
          :can-confirm="cartItems.length > 0"
          :busy="isPrinting || saving"
          @confirm="confirmSale"
          @clear="clearCart"
          @reset="resetAll"
        />
      </div>
    </template>

    <template #receipt>
      <Receipt :data="receiptData" />
    </template>
  </PosLayout>

  <!-- Mobile cart bar (stacked layout only) -->
  <div class="mobile-cart-bar no-print">
    <div class="mobile-cart-info">
      <span class="mobile-cart-count">{{ cartUnits }} {{ cartUnits === 1 ? 'item' : 'items' }}</span>
      <span class="mobile-cart-total">Rs. {{ formatAmount(totals.total) }}</span>
    </div>
    <button type="button" class="mobile-cart-btn" @click="scrollToCheckout">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Checkout
    </button>
  </div>

  <!-- Short messages (stock limits, etc.) -->
  <div class="pos-notice-region no-print" role="status" aria-live="polite">
    <Transition name="notice">
      <div v-if="notice" :key="notice.id" :class="['pos-notice', notice.tone]">{{ notice.text }}</div>
    </Transition>
  </div>

  <!-- Add / edit service or medicine (admin) -->
  <ItemFormModal
    :open="itemForm.open"
    :mode="itemForm.mode"
    :type="itemForm.type"
    :item="itemForm.item"
    :is-name-taken="(name, exceptId) => isNameTaken(itemForm.type, name, exceptId)"
    :server-error="itemForm.error"
    @save="saveItem"
    @close="itemForm.open = false"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import PosLayout from '@/components/pos/PosLayout.vue'
import PatientInfo from '@/components/pos/PatientInfo.vue'
import CatalogPanel from '@/components/pos/CatalogPanel.vue'
import ItemList from '@/components/pos/ItemList.vue'
import BillingSummary from '@/components/pos/BillingSummary.vue'
import PaymentPanel from '@/components/pos/PaymentPanel.vue'
import Receipt from '@/components/pos/Receipt.vue'
import ItemFormModal from '@/components/pos/ItemFormModal.vue'
import { useCatalog } from '@/composables/useCatalog'
import { useAuth } from '@/composables/useAuth'
import { usePrintReceipt } from '@/composables/usePrintReceipt'
import { PAYMENT_METHODS } from '@/data/defaultCatalog'
import { calcTotals, countUnits } from '@/utils/billing'
import { stockStatus, availableToAdd, isTracked } from '@/utils/inventory'
import { formatAmount } from '@/utils/format'
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '@/utils/storage'
import { api, apiError } from '@/api/client'

const {
  services, medicines, loadError, load: loadCatalog, ensureLoaded,
  findItem, isNameTaken, addItem, updateItem, deleteItem
} = useCatalog()
const { isAdmin } = useAuth()

ensureLoaded()
const { isPrinting, printReceipt, cancelPrintWait } = usePrintReceipt()

// ---------- Sale in progress (restored after an accidental refresh) ----------
const draft = loadFromStorage(STORAGE_KEYS.draft, {}) || {}

const patientName = ref(draft.patientName ?? '')
const patientPhone = ref(draft.patientPhone ?? '')
const cartItems = ref(Array.isArray(draft.cartItems) ? draft.cartItems : [])
const discountType = ref(draft.discountType ?? 'flat')
const discountValue = ref(draft.discountValue ?? 0)
const enableTax = ref(draft.enableTax ?? false)
const taxRate = ref(draft.taxRate ?? 0)
const selectedPaymentMethod = ref(draft.selectedPaymentMethod ?? 'cash')

watch(
  () => ({
    patientName: patientName.value,
    patientPhone: patientPhone.value,
    cartItems: cartItems.value,
    discountType: discountType.value,
    discountValue: discountValue.value,
    enableTax: enableTax.value,
    taxRate: taxRate.value,
    selectedPaymentMethod: selectedPaymentMethod.value
  }),
  value => saveToStorage(STORAGE_KEYS.draft, value),
  { deep: true }
)

const totals = computed(() => calcTotals({
  items: cartItems.value,
  discountType: discountType.value,
  discountValue: discountValue.value,
  enableTax: enableTax.value,
  taxRate: taxRate.value
}))

const cartUnits = computed(() => countUnits(cartItems.value))

/** Cart rows plus their stock limit (for the + button). */
const cartView = computed(() => cartItems.value.map(row => {
  if (row.type !== 'medicine') return row
  const medicine = findItem('medicine', row.id)
  return isTracked(medicine) ? { ...row, maxQuantity: medicine.stock } : row
}))

// ---------- Notices ----------
const notice = ref(null)
let noticeTimer = null

const notify = (text, tone = 'warn') => {
  clearTimeout(noticeTimer)
  notice.value = { id: Date.now(), text, tone }
  noticeTimer = setTimeout(() => { notice.value = null }, 3500)
}

// ---------- Cart ----------
const quantityInCart = (type, id) =>
  cartItems.value.find(i => i.id === id && i.type === type)?.quantity || 0

/** Why a medicine can't take `extra` more units, or '' if it can. */
function stockProblem(medicine, extra = 1) {
  if (!medicine) return ''
  const status = stockStatus(medicine)
  if (status.expired) return `${medicine.name} is expired and can't be sold.`
  const available = availableToAdd(medicine, quantityInCart('medicine', medicine.id))
  if (available < extra) {
    return medicine.stock <= 0
      ? `${medicine.name} is out of stock.`
      : `Only ${medicine.stock} ${medicine.name} in stock.`
  }
  return ''
}

const addToCart = (item, type) => {
  if (type === 'medicine') {
    const problem = stockProblem(item)
    if (problem) {
      notify(problem)
      return
    }
  }

  const existing = cartItems.value.find(i => i.id === item.id && i.type === type)
  if (existing) {
    existing.quantity++
  } else {
    cartItems.value.push({ id: item.id, name: item.name, price: item.price, type, quantity: 1 })
  }
}

const removeFromCart = (index) => {
  cartItems.value.splice(index, 1)
}

const updateQuantity = (index, newQuantity) => {
  const row = cartItems.value[index]
  if (!row) return
  if (newQuantity <= 0) {
    removeFromCart(index)
    return
  }
  if (newQuantity > row.quantity && row.type === 'medicine') {
    const problem = stockProblem(findItem('medicine', row.id), newQuantity - row.quantity)
    if (problem) {
      notify(problem)
      return
    }
  }
  row.quantity = newQuantity
}

const clearCart = () => {
  cartItems.value = []
}

const resetAll = () => {
  cartItems.value = []
  patientName.value = ''
  patientPhone.value = ''
  discountType.value = 'flat'
  discountValue.value = 0
  enableTax.value = false
  taxRate.value = 0
  selectedPaymentMethod.value = 'cash'
  cancelPrintWait()
}

// ---------- Confirm sale ----------
const receiptData = ref(emptyReceipt())

function emptyReceipt() {
  return {
    receiptNumber: '', date: '', time: '', patientName: '', patientPhone: '',
    items: [], subtotal: 0, discount: 0, discountType: 'flat', discountValue: 0,
    tax: 0, taxRate: 0, grandTotal: 0, paymentMethod: 'Cash', cashier: null
  }
}

const saving = ref(false)

const confirmSale = async () => {
  if (cartItems.value.length === 0 || isPrinting.value || saving.value) return

  // Quick check here; the server checks stock again before saving
  for (const row of cartItems.value) {
    if (row.type !== 'medicine') continue
    const medicine = findItem('medicine', row.id)
    if (!medicine) continue
    if (stockStatus(medicine).expired) {
      notify(`${medicine.name} is expired. Remove it from the cart.`)
      return
    }
    if (isTracked(medicine) && row.quantity > medicine.stock) {
      notify(`Only ${medicine.stock} ${medicine.name} in stock. Reduce the quantity.`)
      return
    }
  }

  // The server sets prices, receipt number and cashier, and updates stock
  saving.value = true
  let sale
  try {
    const { data } = await api.post('/sales', {
      items: cartItems.value.map(({ id, type, quantity }) => ({ id, type, quantity })),
      patientName: patientName.value,
      patientPhone: patientPhone.value,
      discountType: discountType.value,
      discountValue: Number(discountValue.value) || 0,
      enableTax: enableTax.value,
      taxRate: Number(taxRate.value) || 0,
      paymentMethod: selectedPaymentMethod.value
    })
    sale = data
  } catch (err) {
    notify(`Sale not saved: ${apiError(err)}`)
    loadCatalog() // stock may have changed
    return
  } finally {
    saving.value = false
  }

  receiptData.value = sale
  loadCatalog() // show the new stock numbers

  // Cart resets only once the browser reports printing finished
  await printReceipt(resetAll)
}

// ---------- Catalog editing (admin) ----------
const itemForm = reactive({ open: false, mode: 'add', type: 'medicine', item: null, error: '' })

const openItemForm = (mode, type, item = null) => {
  if (!isAdmin.value) return
  Object.assign(itemForm, { open: true, mode, type, item, error: '' })
}

const saveItem = async (data) => {
  const editing = itemForm.mode === 'edit' && itemForm.item
  const result = editing
    ? await updateItem(itemForm.type, itemForm.item.id, data)
    : await addItem(itemForm.type, data)
  if (!result.ok) {
    itemForm.error = result.error
    return
  }
  if (editing) {
    // Keep the open cart in step (saved sales keep what they were sold at)
    const row = cartItems.value.find(c => c.id === result.item.id && c.type === itemForm.type)
    if (row) {
      row.name = result.item.name
      row.price = result.item.price
    }
  }
  itemForm.open = false
}

const confirmDeleteItem = async (item, type) => {
  if (!isAdmin.value) return
  const inCart = quantityInCart(type, item.id) > 0
  const message = `Delete "${item.name}"?` +
    (inCart ? '\n\nIt will also be removed from the current cart.' : '') +
    '\n\nThis cannot be undone.'
  if (!window.confirm(message)) return

  const result = await deleteItem(type, item.id)
  if (!result.ok) {
    notify(result.error)
    return
  }
  cartItems.value = cartItems.value.filter(c => !(c.id === item.id && c.type === type))
}

// ---------- Mobile ----------
const checkoutPanel = ref(null)

const scrollToCheckout = () => {
  checkoutPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.products-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  overflow: hidden;
}

.checkout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  overflow-y: auto;
}

.checkout-container::-webkit-scrollbar {
  width: 6px;
}

.checkout-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.checkout-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.cart-section {
  flex-shrink: 0;
  margin-bottom: 1rem;
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.875rem;
}

.retry-btn {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  border: none;
  border-radius: 0.5rem;
  background: #dc2626;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

/* Notices */
.pos-notice-region {
  position: fixed;
  top: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  width: max-content;
  max-width: calc(100vw - 2rem);
  pointer-events: none;
}

.pos-notice {
  padding: 0.75rem 1.125rem;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.pos-notice.warn {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
}

.notice-enter-active,
.notice-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Mobile cart bar */
.mobile-cart-bar {
  display: none;
}

@media (max-width: 1023px) {
  .products-container,
  .checkout-container {
    height: auto;
    overflow: visible;
  }

  .checkout-container {
    scroll-margin-top: 0.75rem;
  }

  .mobile-cart-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
    background: white;
    border-top: 1px solid #d1fae5;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  }

  .mobile-cart-info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }

  .mobile-cart-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .mobile-cart-total {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
    white-space: nowrap;
  }

  .mobile-cart-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    border: none;
    border-radius: 0.75rem;
    color: white;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .pos-notice-region {
    top: auto;
    bottom: 5.5rem;
  }
}

@media (max-width: 640px) {
  .products-container,
  .checkout-container {
    padding: 0.875rem;
  }
}
</style>
