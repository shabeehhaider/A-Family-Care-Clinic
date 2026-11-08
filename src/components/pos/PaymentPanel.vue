<template>
  <section class="payment-section" aria-labelledby="payment-heading">
    <h3 id="payment-heading" class="payment-title">
      <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      Payment Method
    </h3>

    <div class="payment-methods" role="radiogroup" aria-labelledby="payment-heading">
      <button
        v-for="m in methods"
        :key="m.id"
        type="button"
        role="radio"
        :aria-checked="method === m.id"
        :class="['payment-btn', { active: method === m.id }]"
        @click="method = m.id"
      >
        <svg class="payment-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="m.icon" />
        </svg>
        <span>{{ m.name }}</span>
      </button>
    </div>

    <button
      type="button"
      class="confirm-btn"
      :disabled="!canConfirm || busy"
      @click="emit('confirm')"
    >
      <svg class="confirm-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ busy ? 'Printing…' : 'Confirm Sale & Print Receipt' }}
    </button>

    <div class="quick-actions">
      <button type="button" class="action-btn clear-btn" :disabled="!canConfirm" @click="emit('clear')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear Cart
      </button>
      <button type="button" class="action-btn reset-btn" @click="emit('reset')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        New Transaction
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  methods: { type: Array, required: true },
  /** cart has items */
  canConfirm: { type: Boolean, default: false },
  /** a print is in progress */
  busy: { type: Boolean, default: false }
})

const method = defineModel('method', { type: String, default: 'cash' })
const emit = defineEmits(['confirm', 'clear', 'reset'])
</script>

<style scoped>
.payment-section {
  margin-top: auto;
}

.payment-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.75rem;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #059669;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.payment-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.875rem 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-btn:hover {
  border-color: #10b981;
  color: #059669;
}

.payment-btn.active {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #10b981;
  color: #059669;
}

.payment-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.confirm-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  border: none;
  border-radius: 0.875rem;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirm-icon {
  width: 1.5rem;
  height: 1.5rem;
}

@media (hover: hover) and (pointer: fine) {
  .confirm-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #f9fafb;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
}

.reset-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
}

@media (max-width: 640px) {
  .confirm-btn {
    font-size: 0.9375rem;
  }
}

@media (max-width: 380px) {
  .payment-btn {
    padding: 0.625rem 0.25rem;
  }

  .confirm-btn {
    gap: 0.5rem;
  }
}
</style>
