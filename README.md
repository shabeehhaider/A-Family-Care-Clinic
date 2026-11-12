# A Family Care Clinic — POS

Point-of-sale web app for A Family Care Clinic: bill services and medicines, take payment, and print an 80mm thermal receipt.

Frontend: Vue 3, Vite, Vue Router, Tailwind CSS, axios.
Backend: Node.js + Express — PIN login (JWT). Data is saved in a Postgres database (Neon, when deployed on
Vercel) or, when run on a local PC, as files with one file per month for sales.

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
- **Inventory** (`/inventory`)
  - All medicines with stock, warning level, expiry and status; filter, search, sort
  - Admins: update stock (received / exact count), edit, add; print stock list; export CSV
- **Settings** (`/settings`, admin)
  - Add users, reset PINs, delete users
  - **Monthly sales files**: download any month as Excel (CSV) or as the data file
  - Full backup download, restore, and one-time import of data from the old browser-only version

## Where the data is kept

**Clearing the browser does not affect the data** — it is saved by the server, in one of two ways:

- **Database** (on Vercel): when `DATABASE_URL` is set, everything is stored in Postgres (Neon).
  Each sale is saved in a single transaction (sale + stock + receipt number together, or nothing).
  A daily backup copy is stored in the database's `backups` table (last 30 days), and the
  database provider keeps its own redundant copies.
- **Files** (on a local PC): otherwise, in the data folder (default `server-data/`, or `DATA_DIR`):

```
server-data/
  sales/2026-11.json     one file per month — never deleted
  sales/2026-12.json
  catalog.json           services, medicines, stock
  users.json             staff (PINs hashed with scrypt, never stored as typed)
  counter.json           receipt numbers
  backups/2026-11-09/    automatic daily copy (last 90 days kept)
  backups/pre-restore-…  full copy made before any restore / import
  secret.key             signs login tokens — keep private
```

- Files are written safely (temp file + rename), so a power cut mid-save can't corrupt them.
  A damaged file is never overwritten; restore it from `backups/`.
- **Off-site copy:** the server's own backups are on the same disk. Also either set `DATA_DIR`
  to a folder synced by OneDrive / Google Drive, or download **Settings → Download Backup**
  regularly to a USB drive.
- `server-data/` is in `.gitignore` — it holds patient and sales data, never commit it.
- The browser keeps only the cart in progress (so a refresh doesn't lose it).

## Running the POS

Requires Node `^20.19.0 || >=22.12.0`.

**At the clinic (production)** — one program serves both the POS and the data:

```sh
npm install
npm run build
npm start            # open http://localhost:3001
```

Settings (environment variables, all optional) — full list in `server/config.js`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port to listen on |
| `HOST` | `localhost` | Set `0.0.0.0` so tablets / other PCs on the clinic network can use it (`http://<this-PC-IP>:3001`) |
| `DATABASE_URL` | — | Postgres connection; when set, data goes to the database instead of files |
| `DATA_DIR` | `./server-data` | Where data is saved (file mode) |
| `APP_TIMEZONE` | `Asia/Karachi` | Time zone for dates, receipt numbers and months |
| `TOKEN_TTL` | `12h` | How long a login lasts |
| `BACKUP_KEEP_DAYS` | `90` (files) / `30` (database) | Daily backups to keep |
| `CRON_SECRET` | — | Protects the daily-backup URL on Vercel |

To start it automatically with Windows, use Task Scheduler ("At log on" → `npm start` in the
project folder) or a process manager such as `pm2`.

## Deploying to Vercel (free: Vercel Hobby + Neon Free)

The frontend is served by Vercel and the API runs as a Vercel function (`api/index.js`,
routes in `vercel.json`). Vercel's disk is temporary, so **a database is required** —
without `DATABASE_URL` the API refuses to start rather than lose data.

1. **Create the database.** In the Vercel dashboard open the project → **Storage** →
   **Create Database** → **Neon** (Serverless Postgres) → **Free** plan → connect it to this
   project for all environments. This adds `DATABASE_URL` automatically. Tables are created on
   first use.
2. **Add `CRON_SECRET`.** Project → **Settings** → **Environment Variables** → add `CRON_SECRET`
   with a long random value (all environments). Vercel uses it to call the daily backup
   (`vercel.json` → `crons`, 01:00 Pakistan time; on Hobby the exact time can vary by up to an hour).
3. **Deploy:** push to the branch Vercel deploys (usually `main`), or click **Redeploy** after
   adding the variables. Check `https://<your-site>/api/health` shows `"storage":"database"`.
4. **First use:** open the site → create the admin → add cashiers in **Settings**.
5. **Bring over old data:** on the same browser that used the old version of this site, open
   **Settings → Import into Server**.

Free-tier notes: Neon Free includes 0.5 GB (years of clinic sales); the database sleeps when idle,
so the first request after a quiet period takes a second or two. The PIN-lockout counter is kept
per server instance, so it is a little weaker on Vercel than on a single PC.

To run locally against the same database, put `DATABASE_URL=…` in front of `npm run server`.

**Moving from the old browser-only version:** after the first login, open **Settings** on the
same PC and browser that were used before and click **Import into Server**. Old downloaded
backup files can also be loaded with **Restore from backup** (they are merged, not replaced).

## Receipt printer setup (80mm thermal)

1. Install the printer's own driver and set its paper to 80mm roll (enable auto-cut if available).
2. In Chrome's print dialog choose the thermal printer, then under **More settings** set **Margins: None**, **Scale: Default** and turn **Headers and footers off**. Chrome remembers these.
3. Optional: start Chrome with `--kiosk-printing` to print receipts without the dialog.

To save a receipt as PDF, use Chrome's **Save as PDF** destination — "Microsoft Print to PDF" forces A4/Letter paper.

## Development

Run the server and the Vite dev server in two terminals (Vite forwards `/api` to port 3001):

```sh
npm run server   # API on http://localhost:3001 (restarts on changes)
npm run dev      # POS on http://localhost:5173
npm run lint     # ESLint
npm test         # Vitest: logic, server API, page smoke test
```

## Project structure

```
server/
  index.js              start-up (config, daily backups, listen)
  app.js                Express app: routes, static POS, errors
  auth.js               PIN hashing, JWT, lockout, admin/cashier checks
  backup.js             daily copies, full export/restore, browser import
  store/                data stores: fileStore (monthly JSON files), pgStore
                        (Postgres), clock (Pakistan-time dates)
api/index.js            Vercel function wrapping the Express app
  routes/               auth, users, catalog, sales, data
src/
  api/client.js         axios client (token, errors)
  views/                Pos, SalesHistory, Inventory, Settings, Login
  components/
    AppHeader.vue       Header, navigation, current user, lock
    BaseModal.vue       Accessible dialog (focus trap, Escape, focus restore)
    pos/                Layout, patient, catalog, cart, billing, payment,
                        item form, receipt, sales report
    sales/              Void dialog
  composables/
    useAuth.js          Login state and staff, via the server
    useCatalog.js       Services & medicines, via the server
    usePrintReceipt.js  80mm printing (page sizing, afterprint)
  utils/                Pure, unit-tested logic shared with the server:
                        billing, inventory, catalog, sales summary, CSV
  data/defaultCatalog.js  Starting services, medicines, payment methods
tests/                  Vitest tests
```
