<template>
  <!--
    80mm sales report (end-of-day / Z-report style).
    Same root structure as Receipt.vue (#receipt > .receipt) so
    usePrintReceipt sizes the printed page to fit it.
  -->
  <div id="receipt" class="receipt-container">
    <div class="receipt">
      <div class="header">
        <div class="clinic">A FAMILY CARE CLINIC</div>
        <div class="title">SALES REPORT</div>
        <div class="range">{{ rangeLabel }}</div>
      </div>

      <div class="meta">
        <div class="row"><span>Printed</span><span>{{ printedAt }}</span></div>
        <div v-if="printedBy" class="row"><span>By</span><span>{{ printedBy }}</span></div>
      </div>

      <div class="divider solid"></div>

      <!-- Totals -->
      <div class="section">
        <div class="row"><span>Sales</span><span>{{ summary.count }}</span></div>
        <div class="row"><span>Gross (before discount)</span><span>{{ amt(summary.subtotal) }}</span></div>
        <div class="row"><span>Discounts</span><span>- {{ amt(summary.discount) }}</span></div>
        <div v-if="summary.tax" class="row"><span>Tax</span><span>+ {{ amt(summary.tax) }}</span></div>
        <div class="row total"><span>NET REVENUE</span><span>Rs. {{ amt(summary.revenue) }}</span></div>
      </div>

      <div class="divider"></div>

      <!-- Payment methods -->
      <div class="section">
        <div class="section-title">BY PAYMENT METHOD</div>
        <div v-for="p in summary.byPayment" :key="p.method" class="row">
          <span>{{ p.method }} ({{ p.count }})</span><span>{{ amt(p.amount) }}</span>
        </div>
        <div v-if="!summary.byPayment.length" class="row muted"><span>No sales</span></div>
      </div>

      <template v-if="summary.byCashier.length > 1 || (summary.byCashier[0] && summary.byCashier[0].name !== 'Unknown')">
        <div class="divider"></div>
        <div class="section">
          <div class="section-title">BY CASHIER</div>
          <div v-for="c in summary.byCashier" :key="c.name" class="row">
            <span>{{ c.name }} ({{ c.count }})</span><span>{{ amt(c.amount) }}</span>
          </div>
        </div>
      </template>

      <!-- Items -->
      <template v-if="summary.items.length">
        <div class="divider"></div>
        <div class="section">
          <div class="section-title">ITEMS SOLD</div>
          <table class="items">
            <thead>
              <tr><th class="name">Item</th><th class="qty">Qty</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in summary.items" :key="`${item.type}:${item.name}`">
                <td class="name">{{ item.name }}</td>
                <td class="qty">{{ item.quantity }}</td>
                <td class="amount">{{ amt(item.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Voids -->
      <template v-if="summary.voidCount">
        <div class="divider"></div>
        <div class="section">
          <div class="section-title">VOIDED ({{ summary.voidCount }}) — Rs. {{ amt(summary.voidAmount) }}</div>
          <div v-for="v in summary.voided" :key="v.receiptNumber" class="void-row">
            <div class="row"><span>{{ v.receiptNumber }}</span><span>{{ amt(v.grandTotal) }}</span></div>
            <div v-if="v.voided?.reason" class="void-reason">{{ v.voided.reason }}</div>
          </div>
        </div>
      </template>

      <div class="divider solid"></div>
      <div class="footer">*** END OF REPORT ***</div>
    </div>
  </div>
</template>

<script setup>
import { formatAmount } from '@/utils/format'

defineProps({
  /** result of utils/sales summarizeSales() */
  summary: { type: Object, required: true },
  rangeLabel: { type: String, default: '' },
  printedAt: { type: String, default: '' },
  printedBy: { type: String, default: '' }
})

const amt = formatAmount
</script>

<style scoped>
.receipt-container {
  display: none;
}

.receipt {
  width: 80mm;
  padding: 2mm 4mm 4mm;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  color: #000;
  background: #fff;
}

.header {
  text-align: center;
  margin-bottom: 2mm;
}

.clinic {
  font-size: 13px;
  font-weight: 700;
}

.title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-top: 1mm;
}

.range {
  font-size: 12px;
  font-weight: 700;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 2mm;
  padding: 0.4mm 0;
}

.row span:last-child {
  text-align: right;
  white-space: nowrap;
}

.row.total {
  font-size: 14px;
  font-weight: 700;
  margin-top: 1.5mm;
  padding-top: 1.5mm;
  border-top: 2px solid #000;
}

.muted {
  font-style: italic;
}

.section-title {
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 1mm;
}

.divider {
  border-top: 1px dashed #000;
  margin: 2.5mm 0;
}

.divider.solid {
  border-top: 2px solid #000;
}

.items {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}

.items th {
  border-bottom: 1px solid #000;
  padding-bottom: 0.5mm;
}

.items td {
  padding: 0.5mm 0;
  vertical-align: top;
}

.items .name {
  text-align: left;
  word-break: break-word;
}

.items .qty {
  text-align: center;
  width: 12%;
}

.items .amount {
  text-align: right;
  width: 26%;
  white-space: nowrap;
}

.void-row + .void-row {
  margin-top: 1mm;
}

.void-reason {
  font-size: 10px;
  padding-left: 2mm;
}

.footer {
  text-align: center;
  font-weight: 700;
  font-size: 10px;
}

@media print {
  .receipt-container {
    display: block !important;
    position: static;
    width: 80mm;
    background: #fff;
  }
}
</style>
