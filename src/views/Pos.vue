<template>
  <!-- 
    Main POS View
    
    Complete Point of Sale interface for clinic operations.
    Features:
    - Patient information (optional)
    - Service & medicine selection with search
    - Add / edit price / delete services and medicines (saved in localStorage)
    - Cart management with quantity controls
    - Billing with discount (flat/percentage) and tax
    - Multiple payment methods
    - Thermal receipt generation (80mm)
    - Keyboard navigation support
  -->
  <PosLayout>
    <!-- Left Panel: Product Selection -->
    <template #products>
      <div class="products-container">
        <!-- Patient Information Section (Optional) -->
        <div class="patient-section">
          <div class="section-header">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 class="section-title">Patient Information (Optional)</h2>
          </div>
          <div class="patient-fields">
            <div class="input-group">
              <label for="patientName">Name</label>
              <input 
                id="patientName"
                v-model="patientName" 
                type="text" 
                placeholder="Enter patient name"
                class="input-field"
                @keydown.enter="focusNextInput"
              />
            </div>
            <div class="input-group">
              <label for="patientPhone">Phone</label>
              <input 
                id="patientPhone"
                v-model="patientPhone" 
                type="tel" 
                placeholder="Enter phone number"
                class="input-field"
              />
            </div>
          </div>
        </div>

        <!-- Tabs for Services & Medicines -->
        <div class="product-tabs">
          <button 
            @click="activeTab = 'services'"
            :class="['tab-btn', { active: activeTab === 'services' }]"
          >
            <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Services
          </button>
          <button 
            @click="activeTab = 'medicines'"
            :class="['tab-btn', { active: activeTab === 'medicines' }]"
          >
            <svg class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Medicines
          </button>
        </div>

        <!-- Search Box -->
        <div class="search-box">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="`Search ${activeTab}...`"
            class="search-input"
            @keydown.escape="searchQuery = ''"
          />
          <button 
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="clear-search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Catalog: services or medicines (add / edit / delete / add to cart) -->
        <div class="catalog-section">
          <button
            @click="openAddForm"
            :class="['add-item-btn', activeTab]"
          >
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v16m8-8H4" />
            </svg>
            Add New {{ itemLabel }}
          </button>

          <div :class="['products-grid', { 'medicines-grid': activeTab === 'medicines' }]">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              :class="['product-card', 'editable-card', activeTab === 'services' ? 'service-card' : 'medicine-card']"
            >
              <!-- Edit & Delete Actions -->
              <div class="card-actions">
                <button
                  @click.stop="openEditForm(item, currentType)"
                  class="action-icon edit-icon"
                  title="Edit Price"
                  :aria-label="`Edit price of ${item.name}`"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click.stop="deleteItem(item, currentType)"
                  class="action-icon delete-icon"
                  :title="`Delete ${itemLabel}`"
                  :aria-label="`Delete ${item.name}`"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Clickable Area for Add to Cart -->
              <button
                @click="addToCart(item, currentType)"
                class="card-content"
              >
                <div :class="['product-icon', { 'medicine-icon': activeTab === 'medicines' }]">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconFor(item, currentType)" />
                  </svg>
                </div>
                <div class="product-info">
                  <span class="product-name">{{ item.name }}</span>
                  <span class="product-price">Rs. {{ item.price.toLocaleString() }}</span>
                </div>
              </button>
            </div>

            <p v-if="filteredItems.length === 0" class="catalog-empty">
              <template v-if="searchQuery">No {{ activeTab }} match "{{ searchQuery }}".</template>
              <template v-else>No {{ activeTab }} yet. Use "Add New {{ itemLabel }}" above.</template>
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Right Panel: Checkout -->
    <template #checkout>
      <div class="checkout-container" ref="checkoutPanel">
        <!-- Cart Section -->
        <div class="cart-section">
          <ItemList 
            :items="cartItems"
            title="Cart"
            @remove-item="removeFromCart"
            @update-quantity="updateQuantity"
          />
        </div>

        <!-- Billing Section -->
        <div class="billing-section">
          <h3 class="billing-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Billing Summary
          </h3>

          <!-- Subtotal -->
          <div class="billing-row">
            <span>Subtotal</span>
            <span class="amount">Rs. {{ subtotal.toLocaleString() }}</span>
          </div>

          <!-- Discount -->
          <div class="discount-section">
            <div class="discount-header">
              <span>Discount</span>
              <div class="discount-type-toggle">
                <button 
                  @click="discountType = 'flat'"
                  :class="['toggle-btn', { active: discountType === 'flat' }]"
                >
                  Flat
                </button>
                <button 
                  @click="discountType = 'percentage'"
                  :class="['toggle-btn', { active: discountType === 'percentage' }]"
                >
                  %
                </button>
              </div>
            </div>
            <div class="discount-input-wrapper">
              <span class="discount-prefix">{{ discountType === 'flat' ? 'Rs.' : '' }}</span>
              <input 
                v-model.number="discountValue"
                type="number"
                min="0"
                :max="discountType === 'percentage' ? 100 : subtotal"
                class="discount-input"
                placeholder="0"
              />
              <span class="discount-suffix">{{ discountType === 'percentage' ? '%' : '' }}</span>
            </div>
            <div class="discount-amount">
              - Rs. {{ discountAmount.toLocaleString() }}
            </div>
          </div>

          <!-- Tax (Optional) -->
          <div class="tax-section">
            <div class="tax-header">
              <label class="tax-toggle">
                <input type="checkbox" v-model="enableTax" class="tax-checkbox" />
                <span>Include Tax</span>
              </label>
              <input 
                v-if="enableTax"
                v-model.number="taxRate"
                type="number"
                min="0"
                max="50"
                class="tax-rate-input"
                placeholder="0"
              />
              <span v-if="enableTax" class="tax-percent">%</span>
            </div>
            <div v-if="enableTax" class="tax-amount">
              + Rs. {{ taxAmount.toLocaleString() }}
            </div>
          </div>

          <!-- Grand Total -->
          <div class="grand-total">
            <span>Grand Total</span>
            <span class="total-amount">Rs. {{ grandTotal.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Payment Section -->
        <div class="payment-section">
          <h3 class="payment-title">
            <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment Method
          </h3>
          
          <div class="payment-methods">
            <button 
              v-for="method in paymentMethods"
              :key="method.id"
              @click="selectedPaymentMethod = method.id"
              :class="['payment-btn', { active: selectedPaymentMethod === method.id }]"
            >
              <svg class="payment-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="method.icon" />
              </svg>
              <span>{{ method.name }}</span>
            </button>
          </div>

          <!-- Confirm Sale Button -->
          <button 
            @click="confirmSale"
            :disabled="cartItems.length === 0 || isPrinting"
            class="confirm-btn"
          >
            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Confirm Sale & Print Receipt
          </button>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <button @click="clearCart" class="action-btn clear-btn" :disabled="cartItems.length === 0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Cart
            </button>
            <button @click="resetAll" class="action-btn reset-btn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New Transaction
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Receipt (Print Only) -->
    <template #receipt>
      <Receipt :data="receiptData" />
    </template>
  </PosLayout>

  <!-- Mobile Cart Bar (shown only on stacked/mobile layout) -->
  <div class="mobile-cart-bar no-print">
    <div class="mobile-cart-info">
      <span class="mobile-cart-count">{{ cartCount }} {{ cartCount === 1 ? 'item' : 'items' }}</span>
      <span class="mobile-cart-total">Rs. {{ grandTotal.toLocaleString() }}</span>
    </div>
    <button class="mobile-cart-btn" @click="scrollToCheckout">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Checkout
    </button>
  </div>

  <!-- Add Item Modal (service or medicine) -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showAddForm" class="modal-overlay" @click.self="closeAddForm">
        <div class="modal-container" role="dialog" aria-modal="true" @keydown.escape="closeAddForm">
          <div :class="['modal-header', { 'service-header': addForm.type === 'service' }]">
            <h3 class="modal-title">
              <svg class="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 4v16m8-8H4" />
              </svg>
              Add New {{ typeLabel(addForm.type) }}
            </h3>
            <button @click="closeAddForm" class="modal-close" aria-label="Close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="addItem" class="modal-body">
            <div class="form-group">
              <label for="itemName" class="form-label">
                {{ typeLabel(addForm.type) }} Name <span class="required">*</span>
              </label>
              <input
                id="itemName"
                v-model="addForm.name"
                type="text"
                required
                :placeholder="addForm.type === 'service' ? 'e.g., Nebulization' : 'e.g., Paracetamol 500mg'"
                class="form-input"
                ref="addNameInput"
              />
              <p v-if="duplicateName" class="form-hint">
                A {{ typeLabel(addForm.type).toLowerCase() }} with this name already exists.
              </p>
            </div>

            <div class="form-group">
              <label for="itemPrice" class="form-label">
                Price (Rs.) <span class="required">*</span>
              </label>
              <input
                id="itemPrice"
                v-model.number="addForm.price"
                type="number"
                min="0"
                step="0.01"
                required
                :placeholder="addForm.type === 'service' ? 'e.g., 250' : 'e.g., 50'"
                class="form-input"
              />
            </div>

            <div class="form-actions">
              <button
                type="button"
                @click="closeAddForm"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                :class="['btn', addForm.type === 'service' ? 'btn-service' : 'btn-primary']"
                :disabled="!addForm.name.trim() || !addForm.price || addForm.price <= 0 || duplicateName"
              >
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 4v16m8-8H4" />
                </svg>
                Add {{ typeLabel(addForm.type) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Edit Price Modal (service or medicine) -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showEditForm" class="modal-overlay" @click.self="closeEditForm">
        <div class="modal-container" role="dialog" aria-modal="true" @keydown.escape="closeEditForm">
          <div class="modal-header edit-header">
            <h3 class="modal-title">
              <svg class="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit {{ typeLabel(editForm.type) }} Price
            </h3>
            <button @click="closeEditForm" class="modal-close" aria-label="Close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateItemPrice" class="modal-body">
            <div class="form-group">
              <label class="form-label">{{ typeLabel(editForm.type) }} Name</label>
              <div class="medicine-name-display">{{ editForm.name }}</div>
            </div>

            <div class="form-group">
              <label for="editItemPrice" class="form-label">
                New Price (Rs.) <span class="required">*</span>
              </label>
              <input
                id="editItemPrice"
                v-model.number="editForm.newPrice"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Enter new price"
                class="form-input"
                ref="editPriceInput"
              />
            </div>

            <div class="price-change-info" v-if="editForm.oldPrice">
              <span class="old-price">Old: Rs. {{ editForm.oldPrice.toLocaleString() }}</span>
              <span class="arrow">→</span>
              <span class="new-price" :class="{ 'higher': editForm.newPrice > editForm.oldPrice, 'lower': editForm.newPrice < editForm.oldPrice }">
                New: Rs. {{ (editForm.newPrice || 0).toLocaleString() }}
              </span>
            </div>

            <div class="form-actions">
              <button
                type="button"
                @click="closeEditForm"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-edit"
                :disabled="!editForm.newPrice || editForm.newPrice <= 0"
              >
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7" />
                </svg>
                Update Price
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * POS View - Main Point of Sale Interface
 * 
 * CATALOG:
 * - Services and medicines can be added, repriced and deleted from their tab
 * - Catalog, in-progress sale, sales history and receipt counter are saved
 *   to localStorage (see utils/storage.js)
 * 
 * STATE MANAGEMENT:
 * - Uses Vue 3 Composition API with ref() and computed()
 * - No external state management library needed
 * 
 * BILLING LOGIC:
 * - Subtotal: Sum of (item.price × item.quantity) for all cart items
 * - Discount: Either flat amount or percentage of subtotal
 * - Tax: Optional percentage applied after discount
 * - Grand Total: Subtotal - Discount + Tax
 */

import { ref, computed, nextTick, watch } from 'vue'
import { usePrintReceipt } from '@/composables/usePrintReceipt'
import PosLayout from '@/components/pos/PosLayout.vue'
import ItemList from '@/components/pos/ItemList.vue'
import Receipt from '@/components/pos/Receipt.vue'
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  loadSales,
  saveSales,
  nextReceiptNumber
} from '@/utils/storage'

// ============================================
// CATALOG - default services & medicines (user changes are saved)
// ============================================

const DEFAULT_SERVICES = [
  { id: 's1', name: 'Consultation', price: 500, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 's2', name: 'Lab Test', price: 300, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { id: 's3', name: 'Injection', price: 150, icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 's4', name: 'X-Ray', price: 800, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 's5', name: 'ECG', price: 400, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 's6', name: 'Ultrasound', price: 1200, icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 's7', name: 'Dressing', price: 200, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 's8', name: 'Blood Pressure', price: 100, icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
]

// Services persist across refreshes (added / edited / deleted ones are kept)
const services = ref(loadFromStorage(STORAGE_KEYS.services, DEFAULT_SERVICES))

// Icons for items that don't carry their own (new services, all medicines)
const DEFAULT_SERVICE_ICON = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
const MEDICINE_ICON = 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'

const DEFAULT_MEDICINES = [
  { id: 'm1', name: 'Paracetamol 500mg', price: 50 },
  { id: 'm2', name: 'Amoxicillin 250mg', price: 120 },
  { id: 'm3', name: 'Omeprazole 20mg', price: 80 },
  { id: 'm4', name: 'Vitamin C 1000mg', price: 60 },
  { id: 'm5', name: 'Ibuprofen 400mg', price: 70 },
  { id: 'm6', name: 'Cetirizine 10mg', price: 40 },
  { id: 'm7', name: 'Metformin 500mg', price: 90 },
  { id: 'm8', name: 'Azithromycin 500mg', price: 150 },
  { id: 'm9', name: 'Pantoprazole 40mg', price: 100 },
  { id: 'm10', name: 'Diclofenac 50mg', price: 55 },
  { id: 'm11', name: 'Montelukast 10mg', price: 85 },
  { id: 'm12', name: 'Losartan 50mg', price: 110 }
]

// Medicines persist across refreshes (added / edited / deleted ones are kept)
const medicines = ref(loadFromStorage(STORAGE_KEYS.medicines, DEFAULT_MEDICINES))

const paymentMethods = ref([
  { id: 'cash', name: 'Cash', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'card', name: 'Card', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'online', name: 'Online', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' }
])

// ============================================
// STATE
// ============================================

// In-progress sale is restored after an accidental refresh
const draft = loadFromStorage(STORAGE_KEYS.draft, {})

// Patient Information
const patientName = ref(draft.patientName ?? '')
const patientPhone = ref(draft.patientPhone ?? '')

// Tab & Search
const activeTab = ref('services')
const searchQuery = ref('')

// Cart Items
const cartItems = ref(Array.isArray(draft.cartItems) ? draft.cartItems : [])

// Billing
const discountType = ref(draft.discountType ?? 'flat')
const discountValue = ref(draft.discountValue ?? 0)
const enableTax = ref(draft.enableTax ?? false)
const taxRate = ref(draft.taxRate ?? 0)

// Payment
const selectedPaymentMethod = ref(draft.selectedPaymentMethod ?? 'cash')

// Receipt: a frozen snapshot taken when the sale is confirmed (not live-computed),
// so the number and time printed are those of the actual sale
const receiptData = ref(createEmptyReceipt())
const { isPrinting, printReceipt, cancelPrintWait } = usePrintReceipt()

// Add item form (service or medicine)
const showAddForm = ref(false)
const addForm = ref({ type: 'medicine', name: '', price: null })
const addNameInput = ref(null)

// Edit price form (service or medicine)
const showEditForm = ref(false)
const editForm = ref({ type: 'medicine', id: null, name: '', oldPrice: null, newPrice: null })
const editPriceInput = ref(null)

// Checkout panel (used by mobile cart bar to scroll into view)
const checkoutPanel = ref(null)

// ============================================
// COMPUTED
// ============================================

const cartCount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

const filteredServices = computed(() => {
  if (!searchQuery.value) return services.value
  const query = searchQuery.value.toLowerCase()
  return services.value.filter(s => s.name.toLowerCase().includes(query))
})

const filteredMedicines = computed(() => {
  if (!searchQuery.value) return medicines.value
  const query = searchQuery.value.toLowerCase()
  return medicines.value.filter(m => m.name.toLowerCase().includes(query))
})

// Current tab helpers
const currentType = computed(() => activeTab.value === 'services' ? 'service' : 'medicine')
const itemLabel = computed(() => typeLabel(currentType.value))
const filteredItems = computed(() =>
  activeTab.value === 'services' ? filteredServices.value : filteredMedicines.value
)

// Warn when adding a name that already exists in that list
const duplicateName = computed(() => {
  const name = addForm.value.name.trim().toLowerCase()
  if (!name) return false
  return listFor(addForm.value.type).value.some(i => i.name.trim().toLowerCase() === name)
})

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0)
})

const discountAmount = computed(() => {
  if (!discountValue.value || discountValue.value <= 0) return 0
  
  if (discountType.value === 'flat') {
    return Math.min(discountValue.value, subtotal.value)
  } else {
    const percentage = Math.min(discountValue.value, 100)
    return Math.round((subtotal.value * percentage) / 100)
  }
})

const taxAmount = computed(() => {
  if (!enableTax.value || taxRate.value <= 0) return 0
  const taxableAmount = subtotal.value - discountAmount.value
  return Math.round((taxableAmount * taxRate.value) / 100)
})

const grandTotal = computed(() => {
  return subtotal.value - discountAmount.value + taxAmount.value
})

// ============================================
// PERSISTENCE (localStorage)
// ============================================

watch(services, (value) => {
  saveToStorage(STORAGE_KEYS.services, value)
}, { deep: true })

watch(medicines, (value) => {
  saveToStorage(STORAGE_KEYS.medicines, value)
}, { deep: true })

watch(
  () => ({
    patientName: patientName.value,
    patientPhone: patientPhone.value,
    cartItems: cartItems.value,
    discountType: discountType.value,
    discountValue: discountValue.value,
    enableTax: enableTax.value,
    taxRate: taxRate.value,
    selectedPaymentMethod: selectedPaymentMethod.value
  }),
  (value) => saveToStorage(STORAGE_KEYS.draft, value),
  { deep: true }
)

// ============================================
// METHODS
// ============================================

function createEmptyReceipt() {
  return {
    receiptNumber: '',
    date: '',
    time: '',
    patientName: '',
    patientPhone: '',
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: 'flat',
    discountValue: 0,
    tax: 0,
    taxRate: 0,
    grandTotal: 0,
    paymentMethod: 'Cash'
  }
}

/**
 * Builds an immutable snapshot of the current sale.
 * Called once, at the moment the sale is confirmed.
 */
const buildReceiptSnapshot = () => {
  const now = new Date()
  return {
    receiptNumber: nextReceiptNumber(),
    createdAt: now.toISOString(),
    date: now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    patientName: patientName.value.trim(),
    patientPhone: patientPhone.value.trim(),
    // deep copy so later cart edits can't change a printed/saved receipt
    items: cartItems.value.map(({ id, name, price, quantity, type }) => ({ id, name, price, quantity, type })),
    subtotal: subtotal.value,
    discount: discountAmount.value,
    discountType: discountType.value,
    discountValue: discountValue.value,
    tax: taxAmount.value,
    taxRate: enableTax.value ? taxRate.value : 0,
    grandTotal: grandTotal.value,
    paymentMethod: paymentMethods.value.find(m => m.id === selectedPaymentMethod.value)?.name || 'Cash'
  }
}

/**
 * Appends a completed sale to the history in localStorage.
 * Returns false if storage is unavailable or full.
 */
const saveSale = (sale) => {
  const sales = loadSales()
  sales.push(sale)
  return saveSales(sales)
}

const addToCart = (item, type) => {
  const existingIndex = cartItems.value.findIndex(
    i => i.id === item.id && i.type === type
  )
  
  if (existingIndex !== -1) {
    cartItems.value[existingIndex].quantity++
  } else {
    cartItems.value.push({
      ...item,
      type,
      quantity: 1
    })
  }
}

const removeFromCart = (index) => {
  cartItems.value.splice(index, 1)
}

const updateQuantity = (index, newQuantity) => {
  if (newQuantity <= 0) {
    removeFromCart(index)
  } else {
    cartItems.value[index].quantity = newQuantity
  }
}

const clearCart = () => {
  cartItems.value = []
}

const resetAll = () => {
  cartItems.value = []
  patientName.value = ''
  patientPhone.value = ''
  discountType.value = 'flat'
  discountValue.value = 0
  enableTax.value = false
  taxRate.value = 0
  selectedPaymentMethod.value = 'cash'
  searchQuery.value = ''
  cancelPrintWait()
}

const confirmSale = async () => {
  if (cartItems.value.length === 0) {
    alert('Please add items to cart before confirming sale.')
    return
  }
  if (isPrinting.value) return

  // Freeze the receipt for this sale (fixed number + time)
  const sale = buildReceiptSnapshot()
  receiptData.value = sale

  if (!saveSale(sale)) {
    alert('Warning: this sale could not be saved to sales history (browser storage is unavailable or full). The receipt will still print.')
  }

  // Cart is reset only once the browser reports printing finished
  await printReceipt(resetAll)
}

const scrollToCheckout = () => {
  checkoutPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const focusNextInput = (event) => {
  const inputs = document.querySelectorAll('.input-field')
  const currentIndex = Array.from(inputs).indexOf(event.target)
  if (currentIndex < inputs.length - 1) {
    inputs[currentIndex + 1].focus()
  }
}

// ---------- Catalog management (services & medicines) ----------

function typeLabel(type) {
  return type === 'service' ? 'Service' : 'Medicine'
}

function listFor(type) {
  return type === 'service' ? services : medicines
}

const iconFor = (item, type) =>
  type === 'service' ? (item.icon || DEFAULT_SERVICE_ICON) : MEDICINE_ICON

/** Open the add form for the current tab and focus the name field */
const openAddForm = () => {
  addForm.value = { type: currentType.value, name: '', price: null }
  showAddForm.value = true
  nextTick(() => {
    addNameInput.value?.focus()
  })
}

const closeAddForm = () => {
  showAddForm.value = false
  addForm.value = { type: currentType.value, name: '', price: null }
}

/** Add a new service/medicine with a unique ID */
const addItem = () => {
  const { type, name, price } = addForm.value
  if (!name.trim() || !price || price <= 0 || duplicateName.value) return

  const prefix = type === 'service' ? 's' : 'm'
  listFor(type).value.push({
    id: `${prefix}${Date.now()}`,
    name: name.trim(),
    price: Number(price)
  })

  closeAddForm()
}

/** Delete a service/medicine (with confirmation); also removes it from the cart */
const deleteItem = (itemToDelete, type) => {
  const list = listFor(type)
  const index = list.value.findIndex(i => i.id === itemToDelete.id)
  if (index === -1) return

  const inCart = cartItems.value.some(
    item => item.id === itemToDelete.id && item.type === type
  )
  const message = `Delete "${itemToDelete.name}"?` +
    (inCart ? '\n\nIt will also be removed from the current cart.' : '') +
    '\n\nThis cannot be undone.'
  if (!window.confirm(message)) return

  cartItems.value = cartItems.value.filter(
    item => !(item.id === itemToDelete.id && item.type === type)
  )
  list.value.splice(index, 1)
}

const openEditForm = (item, type) => {
  editForm.value = {
    type,
    id: item.id,
    name: item.name,
    oldPrice: item.price,
    newPrice: item.price
  }
  showEditForm.value = true
  nextTick(() => {
    editPriceInput.value?.focus()
    editPriceInput.value?.select()
  })
}

const closeEditForm = () => {
  showEditForm.value = false
  editForm.value = { type: 'medicine', id: null, name: '', oldPrice: null, newPrice: null }
}

/** Update price in the catalog and the current cart (saved sales keep the price they were sold at) */
const updateItemPrice = () => {
  const { type, id, newPrice } = editForm.value
  if (!id || !newPrice || newPrice <= 0) return

  const item = listFor(type).value.find(i => i.id === id)
  if (item) {
    item.price = Number(newPrice)

    const cartItem = cartItems.value.find(c => c.id === id && c.type === type)
    if (cartItem) {
      cartItem.price = Number(newPrice)
    }
  }

  closeEditForm()
}
</script>

<style scoped>
/* ============================================
   EXISTING STYLES (Same as original)
   ============================================ */

.products-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  overflow: hidden;
}

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

.product-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #10b981;
  color: #059669;
}

.tab-btn.active {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.tab-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.search-box {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 3rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search:hover {
  background: #e5e7eb;
  color: #374151;
}

/* ============================================
   CATALOG SECTION (services & medicines) with Add Button
   ============================================ */

.catalog-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border: none;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  margin-bottom: 1rem;
}

.add-item-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.add-item-btn:active {
  transform: translateY(0);
}

.add-item-btn.services {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.add-item-btn.services:hover {
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.add-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.catalog-empty {
  grid-column: 1 / -1;
  padding: 2rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.products-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  /* rows must fit their content; without this, cards with overflow:hidden
     get squashed to fit the panel height instead of the grid scrolling */
  grid-auto-rows: max-content;
  gap: 0.875rem;
  overflow-y: auto;
  /* breathing room so the hover lift (-2px) and shadow aren't clipped by the
     scroll container; negative margin keeps cards aligned with content above */
  padding: 0.5rem 0.75rem 1rem 0.5rem;
  margin: -0.5rem -0.5rem 0;
  align-content: start;
}

.medicines-grid {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.product-card:hover {
  border-color: #10b981;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15);
}

.product-card:active {
  transform: translateY(0);
}

.service-card:hover {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.medicine-card:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.product-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  color: #059669;
}

.product-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.medicine-icon {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.product-info {
  text-align: center;
}

.product-name {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.product-price {
  font-size: 0.875rem;
  font-weight: 700;
  color: #059669;
}

.products-grid::-webkit-scrollbar {
  width: 6px;
}

.products-grid::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.products-grid::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 3px;
}

/* ============================================
   CHECKOUT STYLES (Same as original)
   ============================================ */

.checkout-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  overflow-y: auto;
}

.cart-section {
  flex-shrink: 0;
  margin-bottom: 1rem;
}

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
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  text-align: right;
}

.discount-input:focus {
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

.tax-rate-input:focus {
  outline: none;
  border-color: #10b981;
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

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.confirm-btn:active:not(:disabled) {
  transform: translateY(0);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  width: 1.5rem;
  height: 1.5rem;
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

.checkout-container::-webkit-scrollbar {
  width: 6px;
}

.checkout-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.checkout-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.checkout-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ============================================
   MODAL STYLES
   ============================================ */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  max-width: 500px;
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e40af;
}

.modal-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #2563eb;
}

.modal-close {
  width: 2rem;
  height: 2rem;
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

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-secondary:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* ============================================
   CARD ACTIONS (Edit/Delete) - services & medicines
   ============================================ */

.editable-card {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.card-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  transition: opacity 0.2s;
  z-index: 10;
}

/* Hide actions until hover only on devices with a real mouse; touch users always see them */
@media (hover: hover) and (pointer: fine) {
  .card-actions {
    opacity: 0;
  }

  .editable-card:hover .card-actions,
  .card-actions:focus-within {
    opacity: 1;
  }
}

.action-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon svg {
  width: 1rem;
  height: 1rem;
}

.edit-icon {
  background: #fef3c7;
  color: #d97706;
}

.edit-icon:hover {
  background: #fcd34d;
  color: #92400e;
  transform: scale(1.1);
}

.delete-icon {
  background: #fee2e2;
  color: #dc2626;
}

.delete-icon:hover {
  background: #fca5a5;
  color: #991b1b;
  transform: scale(1.1);
}

.card-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
}

.medicine-card .card-content:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.service-card .card-content:hover {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

/* Add-service modal (green variant of the add modal) */
.service-header {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.service-header .modal-title {
  color: #065f46;
}

.service-header .modal-icon {
  color: #059669;
}

.btn-service {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-service:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.btn-service:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.form-hint {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: #b45309;
}

/* Edit Modal Specific Styles */
.edit-header {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.edit-header .modal-title {
  color: #92400e;
}

.edit-header .modal-icon {
  color: #d97706;
}

.medicine-name-display {
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.price-change-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

.old-price {
  color: #6b7280;
  text-decoration: line-through;
}

.arrow {
  color: #9ca3af;
  font-size: 1.25rem;
}

.new-price {
  font-weight: 600;
  color: #374151;
}

.new-price.higher {
  color: #dc2626;
}

.new-price.lower {
  color: #059669;
}

.btn-edit {
  background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
}

.btn-edit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.4);
}

.btn-edit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ============================================
   MOBILE CART BAR
   ============================================ */

.mobile-cart-bar {
  display: none;
}

/* ============================================
   RESPONSIVE
   ============================================ */

/* Touch devices: always-visible card actions need room so they don't cover the icon,
   and disable "sticky" hover lift effects */
@media (hover: none), (pointer: coarse) {
  .card-content {
    padding-top: 2.5rem;
  }

  .action-icon {
    width: 2rem;
    height: 2rem;
  }

  .product-card:hover,
  .add-item-btn:hover,
  .confirm-btn:hover:not(:disabled),
  .btn-primary:hover:not(:disabled),
  .btn-service:hover:not(:disabled),
  .btn-edit:hover:not(:disabled) {
    transform: none;
  }
}

/* Stacked layout (portrait tablet & phone) */
@media (max-width: 1023px) {
  .products-container,
  .checkout-container {
    height: auto;
    overflow: visible;
  }

  .catalog-section {
    overflow: visible;
  }

  .products-grid {
    overflow: visible;
    padding: 0;
    margin: 0;
  }

  .checkout-container {
    scroll-margin-top: 0.75rem;
  }

  .mobile-cart-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
    background: white;
    border-top: 1px solid #d1fae5;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  }

  .mobile-cart-info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }

  .mobile-cart-count {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .mobile-cart-total {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
    white-space: nowrap;
  }

  .mobile-cart-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    border: none;
    border-radius: 0.75rem;
    color: white;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }
}

/* Phones */
@media (max-width: 640px) {
  .products-container,
  .checkout-container {
    padding: 0.875rem;
  }

  .patient-fields {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  /* Prevent iOS from zooming into inputs (needs >= 16px) */
  .input-field,
  .search-input,
  .discount-input,
  .tax-rate-input,
  .form-input {
    font-size: 16px;
  }

  .tab-btn {
    padding: 0.625rem 0.75rem;
  }

  .products-grid,
  .medicines-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem;
  }

  .product-card,
  .card-content {
    padding: 0.75rem;
  }

  .editable-card {
    padding: 0;
  }

  .product-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .product-name {
    word-break: break-word;
  }

  .total-amount {
    font-size: 1.25rem;
  }

  .confirm-btn {
    font-size: 0.9375rem;
  }

  /* Modals */
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

  .price-change-info {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

/* Touch + phone: keep icon clear of always-visible actions (overrides the 0.75rem padding above) */
@media (max-width: 640px) and (hover: none), (max-width: 640px) and (pointer: coarse) {
  .card-content {
    padding-top: 2.5rem;
  }
}

/* Very small phones */
@media (max-width: 380px) {
  .tab-icon {
    display: none;
  }

  .payment-btn {
    padding: 0.625rem 0.25rem;
  }

  .confirm-btn {
    gap: 0.5rem;
  }

  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>