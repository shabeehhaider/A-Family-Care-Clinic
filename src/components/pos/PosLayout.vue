<template>
  <!-- 
    PosLayout Component
    
    Main layout wrapper for the POS interface.
    Provides a responsive two-panel layout optimized for desktop clinic use.
    Left panel: Product selection
    Right panel: Cart and checkout
  -->
  <div class="pos-layout">
    <!-- Header -->
    <header class="pos-header no-print">
      <div class="header-left">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"/>
          </svg>
          <span class="logo-text">Health Clinic POS</span>
        </div>
      </div>
      <div class="header-right">
        <div class="datetime">
          <span class="date">{{ currentDate }}</span>
          <span class="time">{{ currentTime }}</span>
        </div>
        <div class="user-info">
          <div class="user-avatar">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span class="user-name">Cashier</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="pos-main no-print">
      <!-- Left Panel: Product Selection -->
      <section class="left-panel">
        <slot name="products"></slot>
      </section>

      <!-- Right Panel: Cart & Checkout -->
      <section class="right-panel">
        <slot name="checkout"></slot>
      </section>
    </main>

    <!-- Print Area (only visible during print) -->
    <div class="print-area">
      <slot name="receipt"></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * PosLayout Component
 * 
 * Provides the main layout structure for the POS interface.
 * Features:
 * - Responsive header with clinic branding and datetime
 * - Two-panel layout for product selection and checkout
 * - Print area for receipt (hidden on screen)
 * 
 * Slots:
 * - products: Left panel content (services & medicines)
 * - checkout: Right panel content (cart, billing, payment)
 * - receipt: Print-only receipt content
 */

import { ref, onMounted, onUnmounted } from 'vue'

// Current date and time display
const currentDate = ref('')
const currentTime = ref('')
let timeInterval = null

/**
 * Updates the current date and time display
 * Called every second to keep time accurate
 */
const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
/* Layout Container */
.pos-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
}

/* Header Styles */
.pos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.datetime {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: white;
}

.date {
  font-size: 0.875rem;
  opacity: 0.9;
}

.time {
  font-size: 1.125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
}

.user-name {
  color: white;
  font-weight: 500;
}

/* Main Content */
.pos-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
}

/* Left Panel */
.left-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Right Panel */
.right-panel {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Print Area - Hidden on screen */
.print-area {
  display: none;
}

/* Print Styles */
@media print {
  .no-print {
    display: none !important;
  }

  .pos-layout {
    background: white;
    min-height: auto;
  }

  .print-area {
    display: block !important;
  }
}

/* Responsive Adjustments */
@media (max-width: 1200px) {
  .pos-main {
    grid-template-columns: 1fr 380px;
  }
}

@media (max-width: 1024px) {
  .pos-main {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
}
</style>
