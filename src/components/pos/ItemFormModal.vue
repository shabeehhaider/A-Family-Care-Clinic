<template>
  <BaseModal
    :open="open"
    :title="title"
    :variant="mode === 'edit' ? 'amber' : type === 'service' ? 'green' : 'blue'"
    :icon="mode === 'edit' ? ICONS.edit : ICONS.plus"
    @close="emit('close')"
  >
    <form novalidate @submit.prevent="submit">
      <div class="form-group">
        <label :for="ids.name" class="form-label">
          {{ label }} Name <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          :id="ids.name"
          v-model="form.name"
          type="text"
          required
          data-autofocus
          autocomplete="off"
          :placeholder="type === 'service' ? 'e.g., Nebulization' : 'e.g., Paracetamol 500mg'"
          class="form-input"
          :aria-describedby="nameTaken ? ids.nameHint : undefined"
          :aria-invalid="nameTaken"
        />
        <p v-if="nameTaken" :id="ids.nameHint" class="form-hint warning">
          A {{ label.toLowerCase() }} with this name already exists.
        </p>
      </div>

      <div class="form-group">
        <label :for="ids.price" class="form-label">
          Price (Rs.) <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          :id="ids.price"
          v-model.number="form.price"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          required
          :placeholder="type === 'service' ? 'e.g., 250' : 'e.g., 50'"
          class="form-input"
        />
        <p v-if="mode === 'edit' && priceChanged" class="price-change" aria-live="polite">
          <span class="old-price">Rs. {{ formatAmount(item.price) }}</span>
          <span aria-hidden="true">→</span>
          <span :class="['new-price', form.price > item.price ? 'higher' : 'lower']">
            Rs. {{ formatAmount(form.price) }}
          </span>
        </p>
      </div>

      <!-- Medicine stock -->
      <fieldset v-if="type === 'medicine'" class="stock-fieldset">
        <legend class="form-label">Stock <span class="optional">(optional)</span></legend>
        <div class="form-row">
          <div class="form-group">
            <label :for="ids.stock" class="form-label small">Quantity in stock</label>
            <input
              :id="ids.stock"
              v-model="form.stock"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              placeholder="Not tracked"
              class="form-input"
              :aria-describedby="ids.stockHint"
            />
          </div>
          <div class="form-group">
            <label :for="ids.low" class="form-label small">Warn when at or below</label>
            <input
              :id="ids.low"
              v-model="form.lowStockAt"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="form-input"
              :disabled="form.stock === '' || form.stock === null"
            />
          </div>
        </div>
        <p :id="ids.stockHint" class="form-hint stock-hint">
          Leave empty if you don't want to count stock.
        </p>
        <div class="form-group">
          <label :for="ids.expiry" class="form-label small">Expiry date</label>
          <input :id="ids.expiry" v-model="form.expiry" type="date" class="form-input" />
        </div>
      </fieldset>

      <p v-if="error || serverError" class="form-error" role="alert">{{ error || serverError }}</p>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close')">Cancel</button>
        <button
          type="submit"
          :class="['btn', mode === 'edit' ? 'btn-warning' : type === 'service' ? 'btn-success' : 'btn-primary']"
          :disabled="!canSave"
        >
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="mode === 'edit' ? ICONS.check : ICONS.plus" />
          </svg>
          {{ mode === 'edit' ? 'Save Changes' : `Add ${label}` }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
/**
 * Add / edit a service or medicine (name, price; medicines also stock,
 * low-stock threshold and expiry). Emits `save` with the cleaned values.
 */
import { reactive, ref, computed, watch, useId } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { typeLabel } from '@/composables/useCatalog'
import { DEFAULT_LOW_STOCK } from '@/utils/inventory'
import { formatAmount } from '@/utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  type: { type: String, default: 'medicine' }, // 'service' | 'medicine'
  /** item being edited (edit mode) */
  item: { type: Object, default: null },
  /** (name, exceptId) => boolean */
  isNameTaken: { type: Function, required: true },
  /** error returned by the server when saving */
  serverError: { type: String, default: '' }
})

const emit = defineEmits(['save', 'close'])

const ICONS = {
  plus: 'M12 4v16m8-8H4',
  check: 'M5 13l4 4L19 7',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
}

const uid = useId()
const ids = {
  name: `${uid}-name`,
  nameHint: `${uid}-name-hint`,
  price: `${uid}-price`,
  stock: `${uid}-stock`,
  stockHint: `${uid}-stock-hint`,
  low: `${uid}-low`,
  expiry: `${uid}-expiry`
}

const form = reactive({ name: '', price: null, stock: '', lowStockAt: DEFAULT_LOW_STOCK, expiry: '' })
const error = ref('')

const label = computed(() => typeLabel(props.type))
const title = computed(() => (props.mode === 'edit' ? `Edit ${label.value}` : `Add New ${label.value}`))

// Reset the form each time the dialog opens
watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  error.value = ''
  const src = props.mode === 'edit' && props.item ? props.item : {}
  form.name = src.name ?? ''
  form.price = src.price ?? null
  form.stock = typeof src.stock === 'number' ? src.stock : ''
  form.lowStockAt = typeof src.lowStockAt === 'number' ? src.lowStockAt : DEFAULT_LOW_STOCK
  form.expiry = src.expiry ?? ''
}, { immediate: true })

const nameTaken = computed(() =>
  props.isNameTaken(form.name, props.mode === 'edit' ? props.item?.id : null)
)

const priceChanged = computed(() =>
  props.item && Number(form.price) > 0 && Number(form.price) !== props.item.price
)

const canSave = computed(() =>
  form.name.trim() !== '' && Number(form.price) > 0 && !nameTaken.value
)

const submit = () => {
  if (!canSave.value) {
    error.value = nameTaken.value
      ? 'Choose a different name.'
      : 'Enter a name and a price greater than 0.'
    return
  }
  if (form.stock !== '' && form.stock !== null && Number(form.stock) < 0) {
    error.value = 'Stock cannot be negative.'
    return
  }
  emit('save', {
    name: form.name.trim(),
    price: Number(form.price),
    ...(props.type === 'medicine'
      ? { stock: form.stock, lowStockAt: form.lowStockAt, expiry: form.expiry }
      : {})
  })
}
</script>

<style scoped>
.stock-fieldset {
  margin: 0 0 0.5rem;
  padding: 0.875rem 1rem 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
}

.stock-fieldset legend {
  padding: 0 0.375rem;
  margin-bottom: 0;
}

.form-label.small {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #4b5563;
}

.stock-hint {
  margin: -0.5rem 0 1rem;
}

.price-change {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.old-price {
  text-decoration: line-through;
}

.new-price {
  font-weight: 700;
}

.new-price.higher {
  color: #dc2626;
}

.new-price.lower {
  color: #059669;
}

.form-input:disabled {
  background: #f9fafb;
  color: #9ca3af;
}
</style>
