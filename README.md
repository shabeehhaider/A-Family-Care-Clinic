# A Family Care Clinic — POS

Point-of-sale web app for A Family Care Clinic: bill services and medicines, take payment, and print an 80mm thermal receipt.

Built with Vue 3, Vite, Vue Router and Tailwind CSS. Runs entirely in the browser — no backend.

## Features

- **POS** (`/`)
  - Services and medicines catalog with search; add, reprice and delete items
  - Cart with quantities, flat or % discount, optional tax, Cash / Card / Online payment
  - Optional patient name and phone
  - Prints an 80mm thermal receipt with a sequential number per day (`RC-YYYYMMDD-001`)
  - Responsive: desktop, tablet and phone (sticky cart bar on small screens)
- **Sales History** (`/sales`)
  - Filter by date range or day, search by receipt #, patient name or phone
  - Totals: revenue, discounts, split by payment method
  - Reprint a receipt (marked `** DUPLICATE COPY **`)
  - Void a sale with a reason — it stays on record but is excluded from totals
  - Export the shown sales to CSV (opens in Excel)

## Data storage — important

All data (catalog, sales history, receipt counter, in-progress sale) is stored in the browser's **localStorage** on the device running the POS:

- It is **not shared** between computers or browsers.
- **Clearing browsing / site data deletes it**, including all sales history.
- Use **Sales History → All → Export CSV** regularly as a backup.

Keys are prefixed with `afcc.` (see `src/utils/storage.js`).

## Receipt printer setup (80mm thermal)

1. Install the printer's own driver and set its paper to 80mm roll (enable auto-cut if available).
2. In Chrome's print dialog choose the thermal printer, then under **More settings** set **Margins: None**, **Scale: Default** and turn **Headers and footers off**. Chrome remembers these.
3. Optional: start Chrome with `--kiosk-printing` to print receipts without the dialog.

To save a receipt as PDF, use Chrome's **Save as PDF** destination — "Microsoft Print to PDF" forces A4/Letter paper.

## Development

Requires Node `^20.19.0 || >=22.12.0`.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Project structure

```
src/
  views/Pos.vue                 POS screen (catalog, cart, billing, payment)
  views/SalesHistory.vue        Sales history, reprint, void, CSV export
  components/AppHeader.vue      Shared header and navigation
  components/pos/               POS layout, cart list, thermal receipt
  composables/usePrintReceipt.js  Receipt printing (80mm page sizing, afterprint)
  utils/storage.js              localStorage helpers, receipt numbering
```
