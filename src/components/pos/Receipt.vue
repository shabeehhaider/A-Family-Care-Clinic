<template>
  <!--
    Receipt Component — 80mm thermal receipt

    Designed for monochrome thermal printers (203 dpi, ~72mm printable width):
    - pure black text, no colours / gradients / emojis
    - minimum ~9px font so text stays legible on a thermal head
    - page height is set dynamically by Pos.vue so paper is cut right after content
  -->
  <div class="receipt-container" id="receipt">
    <div class="receipt">
      <!-- Clinic Header (logo already contains name, tagline, doctor & qualifications) -->
      <div class="receipt-header">
        <img
          :src="logoUrl"
          alt="A Family Care Clinic"
          class="clinic-logo"
        />
        <div class="clinic-contacts">Ph: 0333-2976328 | 0333-2215535</div>
      </div>

      <div class="divider solid"></div>

      <!-- Receipt Info -->
      <div class="receipt-info">
        <div class="receipt-number">
          <span class="receipt-label">RECEIPT</span>
          <span class="receipt-id">#{{ data.receiptNumber }}</span>
        </div>
        <div class="info-row">
          <span>Date: {{ data.date }}</span>
          <span>Time: {{ data.time }}</span>
        </div>
        <div v-if="data.patientName" class="info-row">
          <span>Patient: {{ data.patientName }}</span>
        </div>
        <div v-if="data.patientPhone" class="info-row">
          <span>Phone: {{ data.patientPhone }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Items -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-item">Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-price">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data.items" :key="`${item.type}-${item.id}`">
            <td class="col-item">
              {{ item.name }}
              <div v-if="item.quantity > 1" class="unit-price">@ {{ item.price.toLocaleString() }}</div>
            </td>
            <td class="col-qty">{{ item.quantity }}</td>
            <td class="col-price">{{ (item.price * item.quantity).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <div class="divider"></div>

      <!-- Billing Summary -->
      <div class="billing-section">
        <div class="billing-row">
          <span>Subtotal</span>
          <span>Rs. {{ data.subtotal.toLocaleString() }}</span>
        </div>
        <div v-if="data.discount > 0" class="billing-row">
          <span>Discount{{ data.discountType === 'percentage' ? ` (${data.discountValue}%)` : '' }}</span>
          <span>- Rs. {{ data.discount.toLocaleString() }}</span>
        </div>
        <div v-if="data.tax > 0" class="billing-row">
          <span>Tax ({{ data.taxRate }}%)</span>
          <span>+ Rs. {{ data.tax.toLocaleString() }}</span>
        </div>

        <div class="total-row">
          <span>TOTAL</span>
          <span>Rs. {{ data.grandTotal.toLocaleString() }}</span>
        </div>

        <div class="billing-row payment-row">
          <span>Paid via</span>
          <span>{{ data.paymentMethod }}</span>
        </div>
      </div>

      <div class="divider solid"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <div class="footer-message">Get well soon!</div>
        <div>Thank you for trusting A Family Care Clinic</div>
        <div class="services-list">
          General OPD | Children's OPD | Gynae OPD | Physiotherapy | Pharmacy
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Receipt Component - A Family Care Clinic
 *
 * 80mm thermal receipt. Hidden on screen; shown only when printing.
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

const logoUrl = logoImage
</script>

<style scoped>
/* Hidden on screen, visible on print */
.receipt-container {
  display: none;
}

/*
 * 80mm paper, but thermal heads print only ~72mm (576 dots @ 203dpi),
 * so 4mm side padding keeps everything inside the printable area.
 */
.receipt {
  width: 80mm;
  padding: 2mm 4mm 4mm;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  line-height: 1.35;
  color: #000;
  background: #fff;
}

/* Header */
.receipt-header {
  text-align: center;
}

.clinic-logo {
  width: 100%;
  max-width: 72mm;
  height: auto;
  margin: 0 auto 1.5mm;
  display: block;
}

.clinic-contacts {
  font-size: 11px;
  font-weight: 700;
}

/* Dividers */
.divider {
  border-top: 1px dashed #000;
  margin: 2.5mm 0;
}

.divider.solid {
  border-top: 2px solid #000;
}

/* Receipt Info */
.receipt-number {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5mm;
}

.receipt-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
}

.receipt-id {
  font-size: 12px;
  font-weight: 700;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

/* Items */
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.items-table th {
  font-weight: 700;
  padding: 0 0 1mm;
  border-bottom: 1px solid #000;
}

.items-table td {
  padding: 1mm 0;
  vertical-align: top;
}

.col-item {
  text-align: left;
  width: 60%;
  word-break: break-word;
}

.col-qty {
  text-align: center;
  width: 12%;
}

.col-price {
  text-align: right;
  width: 28%;
  font-weight: 700;
  white-space: nowrap;
}

.unit-price {
  font-size: 10px;
}

/* Billing */
.billing-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 0.5mm 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  margin-top: 1.5mm;
  padding-top: 1.5mm;
  border-top: 2px solid #000;
}

.payment-row {
  margin-top: 1.5mm;
  font-weight: 700;
}

/* Footer */
.receipt-footer {
  text-align: center;
  font-size: 10px;
}

.footer-message {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 1mm;
}

.services-list {
  font-size: 9px;
  margin-top: 1.5mm;
  padding-top: 1.5mm;
  border-top: 1px dashed #000;
}

/* Print */
@media print {
  .receipt-container {
    display: block !important;
    position: static;
    width: 80mm;
    background: #fff;
  }

  .receipt {
    margin: 0;
  }
}
</style>
