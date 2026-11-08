<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay no-print" @mousedown.self="onOverlay">
        <div
          ref="dialogEl"
          class="modal-container"
          :style="{ maxWidth: width }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <div :class="['modal-header', `variant-${variant}`]">
            <h3 :id="titleId" class="modal-title">
              <svg v-if="icon" class="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
              </svg>
              {{ title }}
            </h3>
            <button type="button" class="modal-close" aria-label="Close" @click="emit('close')">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * Accessible modal dialog.
 *
 * - role="dialog", aria-modal, labelled by its title
 * - Escape closes; Tab / Shift+Tab stay inside the dialog (focus trap)
 * - Focuses the element marked `data-autofocus` (else the first field) on open,
 *   and returns focus to whatever opened it on close
 * - Locks page scroll while open
 */
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  /** header colour: blue | green | amber | red */
  variant: { type: String, default: 'blue' },
  /** optional SVG path for the header icon */
  icon: { type: String, default: '' },
  width: { type: String, default: '500px' },
  closeOnOverlay: { type: Boolean, default: true }
})

const emit = defineEmits(['close'])

const titleId = `modal-title-${useId()}`

const dialogEl = ref(null)
let previouslyFocused = null

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',')

const focusables = () =>
  Array.from(dialogEl.value?.querySelectorAll(FOCUSABLE) || [])
    .filter(el => el.offsetParent !== null || el === document.activeElement)

const onOverlay = () => {
  if (props.closeOnOverlay) emit('close')
}

const onKeydown = (e) => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  const els = focusables()
  if (els.length === 0) {
    e.preventDefault()
    dialogEl.value?.focus()
    return
  }
  const first = els[0]
  const last = els[els.length - 1]
  if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogEl.value)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

const lockScroll = (lock) => {
  if (typeof document === 'undefined') return // server render / tests
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement
    lockScroll(true)
    await nextTick()
    const target =
      dialogEl.value?.querySelector('[data-autofocus]') ||
      dialogEl.value?.querySelector('input:not([disabled]), select, textarea') ||
      focusables()[0] ||
      dialogEl.value
    target?.focus()
    if (target?.select && target.dataset?.selectOnFocus !== undefined) target.select()
  } else {
    lockScroll(false)
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (props.open) lockScroll(false)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  outline: none;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.variant-blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
.variant-blue .modal-title { color: #1e40af; }
.variant-blue .modal-icon { color: #2563eb; }

.variant-green { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
.variant-green .modal-title { color: #065f46; }
.variant-green .modal-icon { color: #059669; }

.variant-amber { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
.variant-amber .modal-title { color: #92400e; }
.variant-amber .modal-icon { color: #d97706; }

.variant-red { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); }
.variant-red .modal-title { color: #991b1b; }
.variant-red .modal-icon { color: #dc2626; }

.modal-close {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.25s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.75rem;
  }

  .modal-header,
  .modal-body {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.0625rem;
  }
}
</style>
