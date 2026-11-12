<template>
  <BaseModal :open="open" :title="`Update Stock — ${medicine?.name || ''}`" variant="green" :icon="ICON" @close="emit('close')">
    <form v-if="medicine" novalidate @submit.prevent="submit">
      <div class="current">
        <span>Current stock</span>
        <strong>{{ tracked ? medicine.stock : 'Not set' }}</strong>
      </div>

      <div class="mode-toggle" role="radiogroup" aria-label="How to update">
        <button
          type="button"
          role="radio"
          :aria-checked="mode === 'add'"
          :class="['mode-btn', { active: mode === 'add' }]"
          @click="mode = 'add'"
        >
          Add received stock
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="mode === 'set'"
          :class="['mode-btn', { active: mode === 'set' }]"
          @click="mode = 'set'"
        >
          Set exact count
        </button>
      </div>

      <div class="form-group">
        <label :for="ids.qty" class="form-label">
          {{ mode === 'add' ? 'How many did you receive?' : 'How many are on the shelf?' }}
        </label>
        <input
          :id="ids.qty"
          v-model="quantity"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          class="form-input"
          data-autofocus
          required
        />
      </div>

      <p v-if="newStock !== null" class="preview" aria-live="polite">
        New stock: <strong>{{ newStock }}</strong>
      </p>

      <p v-if="error || serverError" class="form-error" role="alert">{{ error || serverError }}</p>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-success" :disabled="newStock === null">Save</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
/** Add received units, or set the exact count after a stock take. Emits save({ mode, quantity }). */
import { ref, computed, watch, useId } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { isTracked } from '@/utils/inventory'

const props = defineProps({
  open: { type: Boolean, default: false },
  medicine: { type: Object, default: null },
  /** error returned by the server when saving */
  serverError: { type: String, default: '' }
})

const emit = defineEmits(['save', 'close'])

const ICON = 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'

const uid = useId()
const ids = { qty: `${uid}-qty` }

const mode = ref('add')
const quantity = ref('')
const error = ref('')

const tracked = computed(() => isTracked(props.medicine))

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  // Nothing to add to yet → start with a stock count
  mode.value = tracked.value ? 'add' : 'set'
  quantity.value = ''
  error.value = ''
})

const parsed = computed(() => {
  if (quantity.value === '' || quantity.value === null) return null
  const n = Number(quantity.value)
  return Number.isInteger(n) && n >= 0 ? n : NaN
})

const newStock = computed(() => {
  if (parsed.value === null || Number.isNaN(parsed.value)) return null
  if (mode.value === 'set') return parsed.value
  return (tracked.value ? props.medicine.stock : 0) + parsed.value
})

const submit = () => {
  if (Number.isNaN(parsed.value)) {
    error.value = 'Enter a whole number, 0 or more.'
    return
  }
  if (newStock.value === null) return
  emit('save', { mode: mode.value, quantity: parsed.value })
}
</script>

<style scoped>
.current {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  font-size: 0.9375rem;
}

.current span {
  color: #6b7280;
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 1rem;
  border-radius: 0.625rem;
  background: #f1f5f9;
}

.mode-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.mode-btn.active {
  background: white;
  color: #047857;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview {
  margin: -0.25rem 0 0.5rem;
  font-size: 0.9375rem;
  color: #374151;
}

.preview strong {
  color: #047857;
  font-size: 1.125rem;
}
</style>
