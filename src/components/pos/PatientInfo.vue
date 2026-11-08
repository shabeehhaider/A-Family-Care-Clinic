<template>
  <section class="patient-section" aria-labelledby="patient-heading">
    <div class="section-header">
      <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <h2 id="patient-heading" class="section-title">Patient Information (Optional)</h2>
    </div>
    <div class="patient-fields">
      <div class="input-group">
        <label for="patientName">Name</label>
        <input
          id="patientName"
          v-model="name"
          type="text"
          placeholder="Enter patient name"
          autocomplete="off"
          class="input-field"
          @keydown.enter.prevent="phoneInput?.focus()"
        />
      </div>
      <div class="input-group">
        <label for="patientPhone">Phone</label>
        <input
          id="patientPhone"
          ref="phoneInput"
          v-model="phone"
          type="tel"
          inputmode="tel"
          placeholder="Enter phone number"
          autocomplete="off"
          class="input-field"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const name = defineModel('name', { type: String, default: '' })
const phone = defineModel('phone', { type: String, default: '' })

const phoneInput = ref(null)
</script>

<style scoped>
.patient-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #d1fae5;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #059669;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #064e3b;
}

.patient-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #047857;
}

.input-field {
  padding: 0.625rem 0.875rem;
  border: 1px solid #a7f3d0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

@media (max-width: 640px) {
  .patient-fields {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  /* Prevent iOS zoom on focus */
  .input-field {
    font-size: 16px;
  }
}
</style>
