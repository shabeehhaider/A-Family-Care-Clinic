<template>
  <!-- 
    Receipt Component - Enhanced Design
    
    Professional 80mm thermal receipt with clinic branding.
    Features:
    - Clinic logo image
    - Clean typography with proper spacing
    - Visual hierarchy for easy reading
    - Optimized for thermal printing
  -->
  <div class="receipt-container" id="receipt">
    <div class="receipt">
      <!-- Clinic Header with Logo -->
      <div class="receipt-header">
        <img 
          :src="logoUrl" 
          alt="A Family Care Clinic" 
          class="clinic-logo"
        />
        <div class="clinic-tagline">"Where Families Heal Together"</div>
        <div class="doctor-info">
          <span class="doctor-name">Dr. Syeda Ayesha Arsalan</span>
          <span class="doctor-title">General Physician & Child Specialist</span>
          <span class="doctor-qual">MBBS (J.S.M.U) FCPS PEADS (N.I.C.H)</span>
        </div>
        <div class="clinic-contacts">
          <span>📞 0333-2976328 & 0333-2215535</span>
        </div>
      </div>

      <div class="divider double"></div>

      <!-- Receipt Info -->
      <div class="receipt-info">
        <div class="receipt-number">
          <span class="receipt-label">RECEIPT</span>
          <span class="receipt-id">#{{ data.receiptNumber }}</span>
        </div>
        <div class="datetime-row">
          <span>📅 {{ data.date }}</span>
          <span>🕐 {{ data.time }}</span>
        </div>
        <div v-if="data.patientName || data.patientPhone" class="patient-info">
          <div v-if="data.patientName" class="patient-row">
            <span class="icon">👤</span>
            <span>{{ data.patientName }}</span>
          </div>
          <div v-if="data.patientPhone" class="patient-row">
            <span class="icon">📱</span>
            <span>{{ data.patientPhone }}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Items Section -->
      <div class="items-section">
        <div class="section-title">BILLING DETAILS</div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th class="col-item">Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-price">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.items" :key="item.id" class="item-row">
              <td class="col-item">{{ item.name }}</td>
              <td class="col-qty">{{ item.quantity }}</td>
              <td class="col-price">{{ (item.price * item.quantity).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="divider"></div>

      <!-- Billing Summary -->
      <div class="billing-section">
        <div class="billing-row">
          <span>Subtotal</span>
          <span>Rs. {{ data.subtotal.toLocaleString() }}</span>
        </div>
        <div v-if="data.discount > 0" class="billing-row discount">
          <span>Discount{{ data.discountType === 'percentage' ? ` (${data.discountValue}%)` : '' }}</span>
          <span>- Rs. {{ data.discount.toLocaleString() }}</span>
        </div>
        <div v-if="data.tax > 0" class="billing-row tax">
          <span>Tax ({{ data.taxRate }}%)</span>
          <span>Rs. {{ data.tax.toLocaleString() }}</span>
        </div>
        
        <div class="total-section">
          <div class="total-row">
            <span class="total-label">GRAND TOTAL</span>
            <span class="total-amount">Rs. {{ data.grandTotal.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Payment Info -->
      <div class="payment-section">
        <div class="payment-badge">
          <span class="payment-icon">{{ getPaymentIcon(data.paymentMethod) }}</span>
          <span class="payment-text">Paid via {{ data.paymentMethod }}</span>
        </div>
      </div>

      <div class="divider double"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <div class="footer-message">
          <span class="heart">💚</span>
          <span>Get well soon!</span>
          <span class="heart">💚</span>
        </div>
        <p class="footer-thanks">Thank you for trusting A Family Care Clinic</p>
        <div class="services-list">
          General OPD | Children's OPD | Gynae OPD | Physiotherapy | Pharmacy
        </div>
        <div class="barcode">
          ||||| |||| ||| |||| ||||| || ||| |||| |||||
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Receipt Component - A Family Care Clinic
 * 
 * Professional thermal receipt (80mm) with clinic branding.
 * Optimized for thermal printer output.
 */

import logoImage from '@/assets/logo.jpeg'

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

// Logo URL for template
const logoUrl = logoImage

/**
 * Get payment method icon
 */
const getPaymentIcon = (method) => {
  const icons = {
    'Cash': '💵',
    'Card': '💳',
    'Online': '📱'
  }
  return icons[method] || '💰'
}
</script>

<style scoped>
/* Receipt Container - Hidden on screen, visible on print */
.receipt-container {
  display: none;
}

/* Receipt Base */
.receipt {
  width: 80mm;
  padding: 4mm;
  font-family: 'Segoe UI', 'Arial', sans-serif;
  font-size: 11px;
  line-height: 1.5;
  color: #000;
  background: #fff;
}

/* Header */
.receipt-header {
  text-align: center;
  padding-bottom: 3mm;
}

.clinic-logo {
  width: 70mm;
  height: auto;
  margin: 0 auto 2mm;
  display: block;
}

.clinic-tagline {
  font-style: italic;
  font-size: 9px;
  color: #666;
  margin-bottom: 2mm;
}

.doctor-info {
  display: flex;
  flex-direction: column;
  gap: 1mm;
  margin-bottom: 2mm;
}

.doctor-name {
  font-size: 12px;
  font-weight: 700;
  color: #1e40af;
}

.doctor-title {
  font-size: 10px;
  font-weight: 600;
}

.doctor-qual {
  font-size: 8px;
  color: #666;
}

.clinic-contacts {
  font-size: 10px;
  font-weight: 500;
}

/* Dividers */
.divider {
  border: none;
  border-top: 1px dashed #999;
  margin: 3mm 0;
}

.divider.double {
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  height: 2px;
}

/* Receipt Info */
.receipt-info {
  text-align: center;
}

.receipt-number {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2mm;
  margin-bottom: 2mm;
}

.receipt-label {
  background: #000;
  color: #fff;
  padding: 1mm 3mm;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}

.receipt-id {
  font-size: 11px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.datetime-row {
  display: flex;
  justify-content: center;
  gap: 4mm;
  font-size: 10px;
  margin-bottom: 2mm;
}

.patient-info {
  background: #f5f5f5;
  padding: 2mm;
  border-radius: 1mm;
  margin-top: 2mm;
}

.patient-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2mm;
  font-size: 10px;
}

.patient-row .icon {
  font-size: 10px;
}

/* Items Section */
.items-section {
  margin: 2mm 0;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  background: #f0f0f0;
  padding: 1.5mm;
  margin-bottom: 2mm;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.items-table th {
  font-weight: 700;
  padding: 1.5mm 1mm;
  border-bottom: 1px solid #333;
  text-align: left;
}

.items-table th.col-qty,
.items-table th.col-price {
  text-align: right;
}

.items-table td {
  padding: 1.5mm 1mm;
  vertical-align: top;
}

.items-table .col-item {
  width: 55%;
}

.items-table .col-qty {
  width: 15%;
  text-align: center;
}

.items-table .col-price {
  width: 30%;
  text-align: right;
  font-family: 'Courier New', monospace;
}

.item-row {
  border-bottom: 1px dotted #ccc;
}

.item-row:last-child {
  border-bottom: none;
}

/* Billing Section */
.billing-section {
  font-size: 10px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  padding: 1mm 0;
}

.billing-row.discount {
  color: #059669;
}

.billing-row.tax {
  color: #666;
}

.total-section {
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 2px solid #000;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.total-amount {
  font-size: 14px;
  font-weight: 800;
  font-family: 'Courier New', monospace;
}

/* Payment Section */
.payment-section {
  text-align: center;
  padding: 2mm 0;
}

.payment-badge {
  display: inline-flex;
  align-items: center;
  gap: 2mm;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  padding: 2mm 4mm;
  border-radius: 2mm;
  font-size: 11px;
  font-weight: 600;
}

.payment-icon {
  font-size: 14px;
}

/* Footer */
.receipt-footer {
  text-align: center;
  padding-top: 2mm;
}

.footer-message {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2mm;
  font-size: 14px;
  font-weight: 700;
  color: #059669;
  padding: 2mm 0;
}

.heart {
  font-size: 12px;
}

.footer-thanks {
  font-size: 9px;
  color: #666;
  margin: 1mm 0 2mm;
}

.services-list {
  font-size: 7px;
  color: #888;
  letter-spacing: 0.3px;
  padding: 1mm 0;
  border-top: 1px dotted #ccc;
  border-bottom: 1px dotted #ccc;
}

.barcode {
  font-family: 'Courier New', monospace;
  font-size: 20px;
  letter-spacing: -1px;
  margin-top: 3mm;
  color: #333;
}

/* Print Styles */
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
    padding: 3mm;
  }

  /* Ensure colors print correctly */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Remove emoji colors for thermal */
  .footer-message,
  .payment-badge,
  .datetime-row,
  .patient-row {
    color: #000 !important;
  }
}
</style>
