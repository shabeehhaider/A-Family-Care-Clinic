<template>
  <div class="password-field">
    <input
      ref="inputEl"
      v-bind="$attrs"
      v-model="model"
      :type="visible ? 'text' : 'password'"
    />
    <button
      type="button"
      class="toggle-btn"
      :aria-label="visible ? `Hide ${label}` : `Show ${label}`"
      :aria-pressed="visible"
      :title="visible ? `Hide ${label}` : `Show ${label}`"
      @click="toggle"
    >
      <!-- eye-off -->
      <svg v-if="visible" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
      <!-- eye -->
      <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
  </div>
</template>

<script setup>
/**
 * Password / PIN input with a show-hide (eye) button.
 * All attributes (id, class, inputmode, maxlength, autocomplete, required,
 * data-autofocus…) go to the <input>.
 */
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps({
  /** what is hidden, for the button's label: "PIN", "password"… */
  label: { type: String, default: 'PIN' }
})

const model = defineModel({ type: String, default: '' })

const visible = ref(false)
const inputEl = ref(null)

const toggle = () => {
  visible.value = !visible.value
  // keep typing where you were
  inputEl.value?.focus()
}

defineExpose({
  focus: () => inputEl.value?.focus()
})
</script>

<style scoped>
.password-field {
  position: relative;
}

.password-field input {
  padding-right: 2.75rem;
}

.toggle-btn {
  position: absolute;
  top: 50%;
  right: 0.375rem;
  transform: translateY(-50%);
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.toggle-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.toggle-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
