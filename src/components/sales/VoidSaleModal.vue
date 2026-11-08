<template>
  <BaseModal :open="open" title="Void Sale" variant="red" :icon="ICON" @close="emit('close')">
    <form v-if="sale" novalidate @submit.prevent="submit">
      <div class="sale-summary">
        <div><span>Receipt</span><strong>{{ sale.receiptNumber }}</strong></div>
        <div><span>Total</span><strong>Rs. {{ formatAmount(sale.grandTotal) }}</strong></div>
        <div v-if="sale.cashier?.name"><span>Cashier</span><strong>{{ sale.cashier.name }}</strong></div>
      </div>

      <p class="explain">
        This sale will be marked <strong>VOID</strong> and not counted in totals. You can't undo this.
      </p>

      <div class="form-group">
        <label :for="ids.reason" class="form-label">
          Reason <span class="required" aria-hidden="true">*</span>
        </label>
        <textarea
          :id="ids.reason"
          v-model="reason"
          class="form-input"
          rows="2"
          maxlength="200"
          required
          data-autofocus
          placeholder="e.g., Wrong item billed, patient cancelled"
        ></textarea>
      </div>

      <!-- Cashiers need an admin to approve -->
      <fieldset v-if="!isAdmin" class="approval">
        <legend class="form-label">Admin approval</legend>
        <div class="form-row">
          <div class="form-group">
            <label :for="ids.admin" class="form-label small">Admin</label>
            <select :id="ids.admin" v-model="adminId" class="form-input" required>
              <option v-for="a in admins" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label :for="ids.pin" class="form-label small">Admin PIN</label>
            <PasswordInput
              :id="ids.pin"
              v-model="pin"
              inputmode="numeric"
              autocomplete="off"
              maxlength="6"
              class="form-input"
              required
            />
          </div>
        </div>
      </fieldset>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-danger" :disabled="!reason.trim()">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="ICON" />
          </svg>
          Void Sale
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, useId } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { useAuth, userRef } from '@/composables/useAuth'
import { formatAmount } from '@/utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  sale: { type: Object, default: null }
})

/** confirm({ reason, by, requestedBy }) */
const emit = defineEmits(['confirm', 'close'])

const ICON = 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'

const { users, currentUser, isAdmin, verifyAdmin } = useAuth()

const uid = useId()
const ids = { reason: `${uid}-reason`, admin: `${uid}-admin`, pin: `${uid}-pin` }

const reason = ref('')
const adminId = ref('')
const pin = ref('')
const error = ref('')

const admins = computed(() => users.value.filter(u => u.role === 'admin'))

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  reason.value = ''
  pin.value = ''
  error.value = ''
  adminId.value = admins.value[0]?.id || ''
})

const submit = () => {
  error.value = ''
  if (!reason.value.trim()) {
    error.value = 'A reason is required.'
    return
  }

  let approver = currentUser.value
  if (!isAdmin.value) {
    const result = verifyAdmin(adminId.value, pin.value)
    if (!result.ok) {
      error.value = result.error
      pin.value = ''
      return
    }
    approver = result.user
  }

  emit('confirm', {
    reason: reason.value.trim(),
    by: userRef(approver),
    requestedBy: isAdmin.value ? null : userRef(currentUser.value)
  })
}
</script>

<style scoped>
.sale-summary {
  display: grid;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.sale-summary div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.sale-summary span {
  color: #6b7280;
}

.explain {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 1rem;
}

.approval {
  margin: 0 0 0.5rem;
  padding: 0.75rem 1rem 0;
  border: 1px solid #fecaca;
  border-radius: 0.625rem;
  background: #fffafa;
}

.approval legend {
  padding: 0 0.375rem;
  margin-bottom: 0;
}

.form-label.small {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #4b5563;
}
</style>
