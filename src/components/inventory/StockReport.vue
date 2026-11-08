<template>
  <!-- 80mm stock list (same #receipt > .receipt structure so usePrintReceipt sizes the page) -->
  <div id="receipt" class="receipt-container">
    <div class="receipt">
      <div class="header">
        <div class="clinic">A FAMILY CARE CLINIC</div>
        <div class="title">STOCK LIST</div>
        <div class="sub">{{ filterLabel }}</div>
      </div>

      <div class="row meta"><span>Printed</span><span>{{ printedAt }}</span></div>
      <div v-if="printedBy" class="row meta"><span>By</span><span>{{ printedBy }}</span></div>

      <div class="divider solid"></div>

      <table class="items">
        <thead>
          <tr><th class="name">Medicine</th><th class="qty">Qty</th><th class="status">Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.item.id">
            <td class="name">
              {{ r.item.name }}
              <div v-if="r.item.expiry" class="expiry">Exp: {{ r.item.expiry }}</div>
            </td>
            <td class="qty">{{ r.status.tracked ? r.item.stock : '-' }}</td>
            <td class="status">{{ r.shortLabel }}</td>
          </tr>
        </tbody>
      </table>

      <div class="divider solid"></div>
      <div class="footer">{{ rows.length }} medicine{{ rows.length === 1 ? '' : 's' }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  /** [{ item, status, shortLabel }] */
  rows: { type: Array, required: true },
  filterLabel: { type: String, default: '' },
  printedAt: { type: String, default: '' },
  printedBy: { type: String, default: '' }
})
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
}

.sub {
  font-size: 12px;
  font-weight: 700;
}

.row {
  display: flex;
  justify-content: space-between;
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
  padding: 0.8mm 0;
  vertical-align: top;
  border-bottom: 1px dotted #999;
}

.name {
  text-align: left;
  word-break: break-word;
}

.expiry {
  font-size: 9.5px;
}

.qty {
  text-align: center;
  width: 14%;
  font-weight: 700;
}

.status {
  text-align: right;
  width: 24%;
  font-weight: 700;
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
