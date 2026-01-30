<template>
  <!-- 
    Main POS View with Medicine Form Feature
    
    Complete Point of Sale interface for clinic operations.
    Features:
    - Patient information (optional)
    - Service & medicine selection with search
    - **NEW: Add custom medicines through a form**
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

        <!-- Services Grid -->
        <div v-if="activeTab === 'services'" class="products-grid">
          <button 
            v-for="service in filteredServices" 
            :key="service.id"
            @click="addToCart(service, 'service')"
            class="product-card service-card"
          >
            <div class="product-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="service.icon" />
              </svg>
            </div>
            <div class="product-info">
              <span class="product-name">{{ service.name }}</span>
              <span class="product-price">Rs. {{ service.price.toLocaleString() }}</span>
            </div>
          </button>
        </div>

        <!-- Medicines Grid with Add Button -->
        <div v-if="activeTab === 'medicines'" class="medicines-section">
          <!-- Add Medicine Button -->
          <button 
            @click="showMedicineForm = true"
            class="add-medicine-btn"
          >
            <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 4v16m8-8H4" />
            </svg>
            Add New Medicine
          </button>

          <!-- Medicines Grid -->
          <div class="products-grid medicines-grid">
            <div 
              v-for="medicine in filteredMedicines" 
              :key="medicine.id"
              class="product-card medicine-card"
            >
              <!-- Edit & Delete Actions -->
              <div class="medicine-actions">
                <button 
                  @click.stop="openEditMedicine(medicine)"
                  class="action-icon edit-icon"
                  title="Edit Price"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  @click.stop="deleteMedicine(medicine.id)"
                  class="action-icon delete-icon"
                  title="Delete Medicine"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Clickable Area for Add to Cart -->
              <button 
                @click="addToCart(medicine, 'medicine')"
                class="medicine-content"
              >
                <div class="product-icon medicine-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div class="product-info">
                  <span class="product-name">{{ medicine.name }}</span>
                  <span class="product-price">Rs. {{ medicine.price.toLocaleString() }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Right Panel: Checkout -->
    <template #checkout>
      <div class="checkout-container">
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
            :disabled="cartItems.length === 0"
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

  <!-- Medicine Form Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showMedicineForm" class="modal-overlay" @click.self="closeMedicineForm">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">
              <svg class="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 4v16m8-8H4" />
              </svg>
              Add New Medicine
            </h3>
            <button @click="closeMedicineForm" class="modal-close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="addMedicine" class="modal-body">
            <div class="form-group">
              <label for="medicineName" class="form-label">
                Medicine Name <span class="required">*</span>
              </label>
              <input 
                id="medicineName"
                v-model="newMedicine.name"
                type="text"
                required
                placeholder="e.g., Paracetamol 500mg"
                class="form-input"
                ref="medicineNameInput"
              />
            </div>

            <div class="form-group">
              <label for="medicinePrice" class="form-label">
                Price (Rs.) <span class="required">*</span>
              </label>
              <input 
                id="medicinePrice"
                v-model.number="newMedicine.price"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="e.g., 50"
                class="form-input"
              />
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                @click="closeMedicineForm"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="btn btn-primary"
                :disabled="!newMedicine.name || !newMedicine.price"
              >
                <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 4v16m8-8H4" />
                </svg>
                Add Medicine
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Edit Medicine Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showEditMedicineForm" class="modal-overlay" @click.self="closeEditMedicineForm">
        <div class="modal-container">
          <div class="modal-header edit-header">
            <h3 class="modal-title">
              <svg class="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Medicine Price
            </h3>
            <button @click="closeEditMedicineForm" class="modal-close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateMedicinePrice" class="modal-body">
            <div class="form-group">
              <label class="form-label">Medicine Name</label>
              <div class="medicine-name-display">{{ editingMedicine.name }}</div>
            </div>

            <div class="form-group">
              <label for="editMedicinePrice" class="form-label">
                New Price (Rs.) <span class="required">*</span>
              </label>
              <input 
                id="editMedicinePrice"
                v-model.number="editingMedicine.newPrice"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Enter new price"
                class="form-input"
                ref="editPriceInput"
              />
            </div>

            <div class="price-change-info" v-if="editingMedicine.oldPrice">
              <span class="old-price">Old: Rs. {{ editingMedicine.oldPrice.toLocaleString() }}</span>
              <span class="arrow">→</span>
              <span class="new-price" :class="{ 'higher': editingMedicine.newPrice > editingMedicine.oldPrice, 'lower': editingMedicine.newPrice < editingMedicine.oldPrice }">
                New: Rs. {{ (editingMedicine.newPrice || 0).toLocaleString() }}
              </span>
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                @click="closeEditMedicineForm"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="btn btn-edit"
                :disabled="!editingMedicine.newPrice || editingMedicine.newPrice <= 0"
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
 * POS View - Main Point of Sale Interface with Medicine Form
 * 
 * NEW FEATURE: Add Custom Medicines
 * - Click "Add New Medicine" button in medicines tab
 * - Modal form opens with name and price fields
 * - New medicine is added to medicines array with unique ID
 * - Form validation ensures all fields are filled
 * - Auto-focuses on name field when modal opens
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

import { ref, computed, nextTick } from 'vue'
import PosLayout from '@/components/pos/PosLayout.vue'
import ItemList from '@/components/pos/ItemList.vue'
import Receipt from '@/components/pos/Receipt.vue'

// ============================================
// DUMMY DATA - Static services and medicines
// ============================================

const services = ref([
  { id: 's1', name: 'Consultation', price: 500, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 's2', name: 'Lab Test', price: 300, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { id: 's3', name: 'Injection', price: 150, icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 's4', name: 'X-Ray', price: 800, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 's5', name: 'ECG', price: 400, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 's6', name: 'Ultrasound', price: 1200, icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 's7', name: 'Dressing', price: 200, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 's8', name: 'Blood Pressure', price: 100, icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
])

const medicines = ref([
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
])

const paymentMethods = ref([
  { id: 'cash', name: 'Cash', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'card', name: 'Card', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'online', name: 'Online', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' }
])

// ============================================
// STATE
// ============================================

// Patient Information
const patientName = ref('')
const patientPhone = ref('')

// Tab & Search
const activeTab = ref('services')
const searchQuery = ref('')

// Cart Items
const cartItems = ref([])

// Billing
const discountType = ref('flat')
const discountValue = ref(0)
const enableTax = ref(false)
const taxRate = ref(0)

// Payment
const selectedPaymentMethod = ref('cash')

// Medicine Form
const showMedicineForm = ref(false)
const newMedicine = ref({
  name: '',
  price: null
})
const medicineNameInput = ref(null)

// Edit Medicine Form
const showEditMedicineForm = ref(false)
const editingMedicine = ref({
  id: null,
  name: '',
  oldPrice: null,
  newPrice: null
})
const editPriceInput = ref(null)

// ============================================
// COMPUTED
// ============================================

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

const receiptData = computed(() => {
  const now = new Date()
  return {
    receiptNumber: generateReceiptNumber(),
    date: now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    time: now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    patientName: patientName.value,
    patientPhone: patientPhone.value,
    items: cartItems.value,
    subtotal: subtotal.value,
    discount: discountAmount.value,
    discountType: discountType.value,
    discountValue: discountValue.value,
    tax: taxAmount.value,
    taxRate: taxRate.value,
    grandTotal: grandTotal.value,
    paymentMethod: paymentMethods.value.find(m => m.id === selectedPaymentMethod.value)?.name || 'Cash'
  }
})

// ============================================
// METHODS
// ============================================

const generateReceiptNumber = () => {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.floor(Math.random() * 900 + 100)
  return `RC-${datePart}-${randomPart}`
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
}

const confirmSale = () => {
  if (cartItems.value.length === 0) {
    alert('Please add items to cart before confirming sale.')
    return
  }
  
  setTimeout(() => {
    window.print()
    setTimeout(() => {
      resetAll()
    }, 500)
  }, 100)
}

const focusNextInput = (event) => {
  const inputs = document.querySelectorAll('.input-field')
  const currentIndex = Array.from(inputs).indexOf(event.target)
  if (currentIndex < inputs.length - 1) {
    inputs[currentIndex + 1].focus()
  }
}

/**
 * NEW: Open medicine form modal
 * Auto-focuses on name input field
 */
const openMedicineForm = () => {
  showMedicineForm.value = true
  nextTick(() => {
    medicineNameInput.value?.focus()
  })
}

/**
 * NEW: Close medicine form modal
 * Resets form fields
 */
const closeMedicineForm = () => {
  showMedicineForm.value = false
  newMedicine.value = {
    name: '',
    price: null
  }
}

/**
 * NEW: Add medicine to medicines array
 * Generates unique ID and adds to medicines list
 */
const addMedicine = () => {
  if (!newMedicine.value.name || !newMedicine.value.price) {
    return
  }

  // Generate unique ID
  const newId = `m${Date.now()}`
  
  // Add to medicines array
  medicines.value.push({
    id: newId,
    name: newMedicine.value.name,
    price: Number(newMedicine.value.price)
  })

  // Close form and reset
  closeMedicineForm()
}

/**
 * Delete medicine from medicines array
 */
const deleteMedicine = (medicineId) => {
  const index = medicines.value.findIndex(m => m.id === medicineId)
  if (index !== -1) {
    // Also remove from cart if present
    cartItems.value = cartItems.value.filter(
      item => !(item.id === medicineId && item.type === 'medicine')
    )
    // Remove from medicines list
    medicines.value.splice(index, 1)
  }
}

/**
 * Open edit medicine modal
 */
const openEditMedicine = (medicine) => {
  editingMedicine.value = {
    id: medicine.id,
    name: medicine.name,
    oldPrice: medicine.price,
    newPrice: medicine.price
  }
  showEditMedicineForm.value = true
  nextTick(() => {
    editPriceInput.value?.focus()
    editPriceInput.value?.select()
  })
}

/**
 * Close edit medicine modal
 */
const closeEditMedicineForm = () => {
  showEditMedicineForm.value = false
  editingMedicine.value = {
    id: null,
    name: '',
    oldPrice: null,
    newPrice: null
  }
}

/**
 * Update medicine price
 */
const updateMedicinePrice = () => {
  if (!editingMedicine.value.id || !editingMedicine.value.newPrice) return
  
  const medicine = medicines.value.find(m => m.id === editingMedicine.value.id)
  if (medicine) {
    medicine.price = Number(editingMedicine.value.newPrice)
    
    // Also update in cart if present
    const cartItem = cartItems.value.find(
      item => item.id === editingMedicine.value.id && item.type === 'medicine'
    )
    if (cartItem) {
      cartItem.price = Number(editingMedicine.value.newPrice)
    }
  }
  
  closeEditMedicineForm()
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
   NEW: Medicines Section with Add Button
   ============================================ */

.medicines-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-medicine-btn {
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

.add-medicine-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

.add-medicine-btn:active {
  transform: translateY(0);
}

.add-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.products-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.875rem;
  overflow-y: auto;
  padding-right: 0.5rem;
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
  flex: 1;
  min-height: 150px;
  max-height: 250px;
  overflow: hidden;
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
   NEW: MODAL STYLES
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
  overflow: hidden;
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
   MEDICINE CARD ACTIONS (Edit/Delete)
   ============================================ */

.medicine-card {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.medicine-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.medicine-card:hover .medicine-actions {
  opacity: 1;
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

.medicine-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
}

.medicine-content:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
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
</style>