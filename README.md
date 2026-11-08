# A Family Care Clinic — POS

Point-of-sale web app for A Family Care Clinic: bill services and medicines, take payment, and print an 80mm thermal receipt.

Built with Vue 3, Vite, Vue Router and Tailwind CSS. Runs entirely in the browser — no backend.

## Features

- **Login with PIN** (`/login`)
  - First run creates the admin account; admins add more users in Settings
  - **Admin**: everything below, including catalog/stock editing, voids, users, backup/restore
  - **Cashier**: sell, view sales history, reprint receipts
  - Every sale records its cashier; **Lock** in the header logs out
- **POS** (`/`)
  - Services and medicines catalog with search; admins add, edit (name, price) and delete items
  - Medicine **stock**: quantity, low-stock warning level and expiry date. Sales deduct stock,
    voids restore it, out-of-stock and expired medicines can't be sold, and a
    "Needs attention" filter lists low / out / expiring items
  - Cart with quantities, flat or % discount, optional tax, Cash / Card / Online payment
  - Optional patient name and phone
  - Prints an 80mm thermal receipt with a sequential number per day (`RC-YYYYMMDD-001`)
  - Responsive: desktop, tablet and phone (sticky cart bar on small screens)
- **Sales History** (`/sales`)
  - Filter by date range or day, search by receipt #, patient, phone or cashier
  - Totals: revenue, discounts, split by payment method
  - **Print Report**: 80mm sales report for the selected period (totals, payment methods,
    cashiers, items sold, voids)
  - Reprint a receipt (marked `** DUPLICATE COPY **`)
  - Void a sale with a reason (cashiers need an admin PIN) — it stays on record, excluded from totals
  - Export the shown sales to CSV (opens in Excel)
- **Settings** (`/settings`, admin)
  - Add users, reset PINs, delete users
  - **Backup**: download all data as JSON; **Restore** from a backup file

## Data storage — important

All data (catalog, sales history, receipt counter, in-progress sale) is stored in the browser's **localStorage** on the device running the POS:

- It is **not shared** between computers or browsers.
- **Clearing browsing / site data deletes it**, including all sales history.
- Use **Settings → Download Backup** regularly (a reminder appears after 7 days) and keep the
  file somewhere safe. **Restore** loads it back on this or another computer.

PINs are stored salted and hashed. On a shared PC they provide accountability (who sold or voided
what), not strong security against someone with access to the browser's developer tools.

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
npm run lint     # ESLint (eslint-plugin-vue)
npm test         # Vitest unit tests + page smoke test
```

## Project structure

```
src/
  views/                Pos, SalesHistory, Settings, Login
  components/
    AppHeader.vue       Header, navigation, current user, lock
    BaseModal.vue       Accessible dialog (focus trap, Escape, focus restore)
    pos/                Layout, patient, catalog, cart, billing, payment,
                        item form, receipt, sales report
    sales/              Void dialog
  composables/
    useAuth.js          Users, PIN login, roles
    useCatalog.js       Services & medicines (shared, persisted), stock changes
    usePrintReceipt.js  80mm printing (page sizing, afterprint)
  utils/                Pure, unit-tested logic: billing, sales summary, CSV,
                        inventory, backup, PIN hashing, storage
  data/defaultCatalog.js  Starting services, medicines, payment methods
tests/                  Vitest tests
```
