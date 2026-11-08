<template>
  <section class="billing-section" aria-labelledby="billing-heading">
    <h3 id="billing-heading" class="billing-title">
      <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      Billing Summary
    </h3>

    <div class="billing-row">
      <span>Subtotal</span>
      <span class="amount">Rs. {{ formatAmount(totals.subtotal) }}</span>
    </div>

    <!-- Discount -->
    <div class="discount-section">
      <div class="discount-header">
        <span id="discount-label">Discount</span>
        <div class="discount-type-toggle" role="group" aria-label="Discount type">
          <button
            type="button"
            :class="['toggle-btn', { active: discountType === 'flat' }]"
            :aria-pressed="discountType === 'flat'"
            @click="discountType = 'flat'"
          >
            Flat
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: discountType === 'percentage' }]"
            :aria-pressed="discountType === 'percentage'"
            aria-label="Percentage"
            @click="discountType = 'percentage'"
          >
            %
          </button>
        </div>
      </div>
      <div class="discount-input-wrapper">
        <span class="discount-prefix" aria-hidden="true">{{ discountType === 'flat' ? 'Rs.' : '' }}</span>
        <input
          v-model.number="discountValue"
          type="number"
          inputmode="decimal"
          min="0"
          :max="discountType === 'percentage' ? 100 : totals.subtotal"
          class="discount-input"
          placeholder="0"
          aria-labelledby="discount-label"
        />
        <span class="discount-suffix" aria-hidden="true">{{ discountType === 'percentage' ? '%' : '' }}</span>
      </div>
      <div class="discount-amount">
        - Rs. {{ formatAmount(totals.discount) }}
      </div>
    </div>

    <!-- Tax (Optional) -->
    <div class="tax-section">
      <div class="tax-header">
        <label class="tax-toggle">
          <input v-model="enableTax" type="checkbox" class="tax-checkbox" />
          <span>Include Tax</span>
        </label>
        <template v-if="enableTax">
          <input
            v-model.number="taxRate"
            type="number"
            inputmode="decimal"
            min="0"
            max="50"
            class="tax-rate-input"
            placeholder="0"
            aria-label="Tax rate in percent"
          />
          <span class="tax-percent" aria-hidden="true">%</span>
        </template>
      </div>
      <div v-if="enableTax" class="tax-amount">
        + Rs. {{ formatAmount(totals.tax) }}
      </div>
    </div>

    <div class="grand-total">
      <span>Grand Total</span>
      <span class="total-amount" aria-live="polite">Rs. {{ formatAmount(totals.total) }}</span>
    </div>
  </section>
</template>

<script setup>
import { formatAmount } from '@/utils/format'

defineProps({
  /** { subtotal, discount, tax, total } from utils/billing calcTotals */
  totals: { type: Object, required: true }
})

const discountType = defineModel('discountType', { type: String, default: 'flat' })
// Number inputs are '' while being cleared, so accept strings too (billing.js copes)
const discountValue = defineModel('discountValue', { type: [Number, String], default: 0 })
const enableTax = defineModel('enableTax', { type: Boolean, default: false })
const taxRate = defineModel('taxRate', { type: [Number, String], default: 0 })
</script>

<style scoped>
.billing-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 0.875rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
}

.billing-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 1rem;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #059669;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
  color: #64748b;
}

.billing-row .amount {
  font-weight: 600;
  color: #334155;
}

.discount-section {
  padding: 0.75rem 0;
  border-top: 1px dashed #cbd5e1;
  border-bottom: 1px dashed #cbd5e1;
  margin: 0.5rem 0;
}

.discount-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.discount-type-toggle {
  display: flex;
  background: #e2e8f0;
  border-radius: 0.375rem;
  padding: 2px;
}

.toggle-btn {
  padding: 0.25rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: white;
  color: #059669;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.discount-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.discount-prefix,
.discount-suffix {
  font-size: 0.875rem;
  color: #64748b;
  min-width: 1.5rem;
}

.discount-input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  text-align: right;
}

.discount-input:focus,
.tax-rate-input:focus {
  outline: none;
  border-color: #10b981;
}

.discount-amount {
  text-align: right;
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
}

.tax-section {
  padding: 0.5rem 0;
}

.tax-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tax-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
}

.tax-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: #10b981;
}

.tax-rate-input {
  width: 3.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-align: right;
}

.tax-percent {
  font-size: 0.875rem;
  color: #64748b;
}

.tax-amount {
  text-align: right;
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.375rem;
}

.grand-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 2px solid #10b981;
}

.grand-total span:first-child {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #059669;
}

@media (max-width: 640px) {
  .discount-input,
  .tax-rate-input {
    font-size: 16px;
  }

  .total-amount {
    font-size: 1.25rem;
  }
}
</style>
