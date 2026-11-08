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
    <AppHeader />

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
 * Two-panel POS layout (product selection | checkout) under the shared app header.
 *
 * Slots:
 * - products: Left panel content (services & medicines)
 * - checkout: Right panel content (cart, billing, payment)
 * - receipt: Print-only receipt content
 */
import AppHeader from '@/components/AppHeader.vue'
</script>

<style scoped>
/* Layout Container */
.pos-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
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

/* ============================================
   RESPONSIVE ADJUSTMENTS
   ============================================ */

/* Desktop / landscape tablet: lock layout to viewport so each panel scrolls on its own */
@media (min-width: 1024px) {
  .pos-layout {
    height: 100vh;
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }

  .pos-main {
    min-height: 0;
  }

  .left-panel,
  .right-panel {
    min-height: 0;
  }
}

@media (max-width: 1279px) {
  .pos-main {
    grid-template-columns: 1fr 360px;
    gap: 1rem;
    padding: 1rem;
  }
}

/* Portrait tablet & phone: stack panels, page scrolls naturally */
@media (max-width: 1023px) {
  .pos-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    overflow: visible;
    /* room for the fixed mobile cart bar */
    padding-bottom: 5.5rem;
  }

  .left-panel,
  .right-panel {
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .pos-main {
    gap: 0.75rem;
    padding: 0.75rem 0.75rem 5.5rem;
  }

  .left-panel,
  .right-panel {
    border-radius: 0.75rem;
  }
}
</style>
