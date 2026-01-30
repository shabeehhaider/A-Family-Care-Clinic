<template>
  <!-- 
    Receipt Component
    
    Generates an 80mm thermal receipt layout.
    This component is hidden during normal use and only shown when printing.
    Uses @media print styles to ensure proper formatting on thermal printers.
  -->
  <div class="receipt-container" id="receipt">
    <div class="receipt">
      <!-- Clinic Header -->
      <div class="receipt-header">
        <!-- Clinic Logo (text-based for thermal compatibility) -->
        <div class="clinic-logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="clinic-name">HEALTH CLINIC</h1>
        <p class="clinic-address">123 Medical Street, City</p>
        <p class="clinic-phone">Tel: +92 300 1234567</p>
      </div>

      <div class="divider"></div>

      <!-- Receipt Info -->
      <div class="receipt-info">
        <div class="info-row">
          <span class="label">Receipt #:</span>
          <span class="value">{{ data.receiptNumber }}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span class="value">{{ data.date }}</span>
        </div>
        <div class="info-row">
          <span class="label">Time:</span>
          <span class="value">{{ data.time }}</span>
        </div>
        <div v-if="data.patientName" class="info-row">
          <span class="label">Patient:</span>
          <span class="value">{{ data.patientName }}</span>
        </div>
        <div v-if="data.patientPhone" class="info-row">
          <span class="label">Phone:</span>
          <span class="value">{{ data.patientPhone }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Items List -->
      <div class="items-section">
        <div class="items-header">
          <span class="item-name-header">Item</span>
          <span class="item-qty-header">Qty</span>
          <span class="item-price-header">Price</span>
        </div>
        
        <div class="items-list">
          <div v-for="item in data.items" :key="item.id" class="item-row">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">{{ item.quantity }}</span>
            <span class="item-price">{{ (item.price * item.quantity).toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Billing Summary -->
      <div class="billing-section">
        <div class="billing-row">
          <span>Subtotal:</span>
          <span>Rs. {{ data.subtotal.toLocaleString() }}</span>
        </div>
        <div v-if="data.discount > 0" class="billing-row discount">
          <span>Discount{{ data.discountType === 'percentage' ? ` (${data.discountValue}%)` : '' }}:</span>
          <span>- Rs. {{ data.discount.toLocaleString() }}</span>
        </div>
        <div v-if="data.tax > 0" class="billing-row">
          <span>Tax ({{ data.taxRate }}%):</span>
          <span>Rs. {{ data.tax.toLocaleString() }}</span>
        </div>
        <div class="billing-row total">
          <span>GRAND TOTAL:</span>
          <span>Rs. {{ data.grandTotal.toLocaleString() }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Payment Info -->
      <div class="payment-section">
        <div class="payment-row">
          <span>Payment Method:</span>
          <span class="payment-method">{{ data.paymentMethod }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <p class="footer-message">✦ Get well soon! ✦</p>
        <p class="footer-thanks">Thank you for visiting Health Clinic</p>
        <div class="barcode">
          ||| |||| || ||| |||| || |||
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Receipt Component
 * 
 * Renders a printable 80mm thermal receipt.
 * Designed for thermal printers commonly used in POS systems.
 * 
 * Props:
 * - data: Object containing all receipt information
 *   - receiptNumber: Unique receipt identifier
 *   - date: Transaction date
 *   - time: Transaction time
 *   - patientName: Optional patient name
 *   - patientPhone: Optional patient phone
 *   - items: Array of purchased items
 *   - subtotal: Sum before discounts/tax
 *   - discount: Discount amount applied
 *   - discountType: 'flat' or 'percentage'
 *   - discountValue: Original discount input value
 *   - tax: Tax amount
 *   - taxRate: Tax percentage
 *   - grandTotal: Final amount to pay
 *   - paymentMethod: Cash/Card/Online
 */

defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
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
    })
  }
})
</script>

<style scoped>
/* Receipt Container - Hidden on screen, visible on print */
.receipt-container {
  display: none;
}

/* Receipt Base Styles */
.receipt {
  width: 80mm;
  padding: 3mm;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #000;
  background: #fff;
}

/* Header Styles */
.receipt-header {
  text-align: center;
  margin-bottom: 2mm;
}

.clinic-logo {
  margin-bottom: 2mm;
}

.logo-icon {
  width: 30px;
  height: 30px;
  margin: 0 auto;
}

.clinic-name {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  letter-spacing: 1px;
}

.clinic-address,
.clinic-phone {
  font-size: 10px;
  margin: 1mm 0;
}

/* Divider */
.divider {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}

/* Receipt Info */
.receipt-info {
  font-size: 11px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin: 1mm 0;
}

.label {
  font-weight: bold;
}

/* Items Section */
.items-section {
  margin: 2mm 0;
}

.items-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 10px;
  border-bottom: 1px solid #000;
  padding-bottom: 1mm;
  margin-bottom: 1mm;
}

.item-name-header {
  flex: 2;
}

.item-qty-header,
.item-price-header {
  flex: 1;
  text-align: right;
}

.item-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin: 1mm 0;
}

.item-name {
  flex: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-qty {
  flex: 1;
  text-align: center;
}

.item-price {
  flex: 1;
  text-align: right;
}

/* Billing Section */
.billing-section {
  font-size: 11px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  margin: 1mm 0;
}

.billing-row.discount {
  color: #059669;
}

.billing-row.total {
  font-size: 14px;
  font-weight: bold;
  margin-top: 2mm;
  padding-top: 1mm;
  border-top: 1px solid #000;
}

/* Payment Section */
.payment-section {
  font-size: 11px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
}

.payment-method {
  font-weight: bold;
  text-transform: uppercase;
}

/* Footer */
.receipt-footer {
  text-align: center;
  margin-top: 2mm;
}

.footer-message {
  font-size: 14px;
  font-weight: bold;
  margin: 2mm 0;
}

.footer-thanks {
  font-size: 9px;
  color: #666;
}

.barcode {
  font-family: 'Libre Barcode 39', monospace;
  font-size: 24px;
  letter-spacing: -2px;
  margin-top: 2mm;
}

/* Print Styles - These override screen styles when printing */
@media print {
  .receipt-container {
    display: block !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 80mm;
    background: white;
    z-index: 99999;
  }

  .receipt {
    width: 80mm;
    margin: 0;
    padding: 2mm;
  }
}
</style>
