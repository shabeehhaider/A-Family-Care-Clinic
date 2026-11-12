<template>
  <div class="settings-layout">
    <AppHeader />

    <main class="settings-main no-print">
      <h1 class="page-title">Settings</h1>

      <!-- ================= Users ================= -->
      <section class="card" aria-labelledby="users-heading">
        <div class="card-head">
          <div>
            <h2 id="users-heading" class="card-title">Users</h2>
            <p class="card-subtitle">
              <strong>Admin</strong>: full access. <strong>Cashier</strong>: sales and receipts only.
            </p>
          </div>
          <button type="button" class="head-btn" @click="openAddUser">
            <svg class="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        <ul class="user-list">
          <li v-for="u in users" :key="u.id" class="user-row">
            <span class="avatar" aria-hidden="true">{{ initials(u.name) }}</span>
            <span class="user-meta">
              <span class="name">
                {{ u.name }}
                <span v-if="u.id === currentUser?.id" class="you">(you)</span>
              </span>
              <span :class="['role-badge', u.role]">{{ u.role === 'admin' ? 'Admin' : 'Cashier' }}</span>
            </span>
            <span class="row-actions">
              <button type="button" class="row-btn" :aria-label="`Reset PIN for ${u.name}`" @click="openResetPin(u)">
                Reset PIN
              </button>
              <button
                type="button"
                class="row-btn danger"
                :disabled="!canDelete(u)"
                :title="deleteBlockReason(u) || `Delete ${u.name}`"
                :aria-label="`Delete ${u.name}`"
                @click="removeUser(u)"
              >
                Delete
              </button>
            </span>
          </li>
        </ul>
      </section>

      <!-- ================= Data ================= -->
      <section class="card" aria-labelledby="data-heading">
        <div class="card-head">
          <div>
            <h2 id="data-heading" class="card-title">Data &amp; Backups</h2>
            <p class="card-subtitle">
              All sales are saved on the POS server, organised by month. The server also makes a backup copy every day.
            </p>
          </div>
        </div>

        <p v-if="dataError" class="form-error" role="alert">{{ dataError }}</p>

        <div class="backup-status ok" role="status">
          <div>Saved in: <code class="path">{{ info.location || '…' }}</code></div>
          <div>
            Last automatic backup:
            <strong>{{ info.lastAutoBackup ? formatDay(info.lastAutoBackup) : 'not yet' }}</strong>
            <span v-if="info.backupKeepDays"> (daily copies kept for {{ info.backupKeepDays }} days)</span>
          </div>
        </div>

        <!-- Monthly files -->
        <h3 class="sub-title">Monthly sales files</h3>
        <div v-if="months.length === 0" class="empty-months">No sales yet.</div>
        <table v-else class="months-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" class="num">Sales</th>
              <th scope="col" class="num">Voided</th>
              <th scope="col" class="num">Revenue</th>
              <th scope="col"><span class="sr-only">Download</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in months" :key="m.month">
              <td>{{ monthLabel(m.month) }}</td>
              <td class="num">{{ m.sales }}</td>
              <td class="num">{{ m.voided }}</td>
              <td class="num">Rs. {{ formatAmount(m.revenue) }}</td>
              <td class="month-actions">
                <button type="button" class="row-btn" :aria-label="`Download ${monthLabel(m.month)} as Excel CSV`" @click="downloadMonthCsv(m.month)">Excel (CSV)</button>
                <button type="button" class="row-btn" :aria-label="`Download ${monthLabel(m.month)} data file`" @click="downloadMonthJson(m.month)">Data file</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Backup / restore -->
        <div class="backup-actions">
          <div class="backup-box">
            <h3>Download full backup</h3>
            <p>One file with all months, items and staff. Keep a copy on a USB drive or in email.</p>
            <button type="button" class="btn btn-success" :disabled="busy" @click="downloadBackup">
              <svg class="btn-icon" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Backup
            </button>
          </div>

          <div class="backup-box">
            <h3>Restore from backup</h3>
            <p>Brings back data from a backup file. The server keeps a copy of the current data first.</p>
            <label class="btn btn-secondary file-btn">
              <svg class="btn-icon" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose Backup File…
              <input type="file" accept=".json,application/json" class="sr-only" @change="onFileChosen" />
            </label>
            <p v-if="restoreError" class="form-error" role="alert">{{ restoreError }}</p>
          </div>
        </div>

        <!-- One-time import from the old browser-only version -->
        <div v-if="browserData" class="import-box">
          <h3>Data from the old version on this computer</h3>
          <p>
            This browser still has <strong>{{ browserData.sales }}</strong> sales,
            <strong>{{ browserData.services }}</strong> services and <strong>{{ browserData.medicines }}</strong> medicines
            from before the server.
            <template v-if="imported"> Imported on {{ formatIso(imported) }}.</template>
          </p>
          <label class="checkbox-row">
            <input v-model="importReplaceCatalog" type="checkbox" />
            Also replace the server's services and medicines with these
          </label>
          <button type="button" class="btn btn-primary import-btn" :disabled="busy" @click="importFromBrowser(null)">
            {{ imported ? 'Import Again' : 'Import into Server' }}
          </button>
          <p class="form-hint">Sales already on the server are skipped, so nothing is counted twice.</p>
          <p v-if="importResult" class="import-result" role="status">{{ importResult }}</p>
        </div>
      </section>
    </main>

    <!-- Add user -->
    <BaseModal :open="userForm.open" title="Add User" variant="green" :icon="ICONS.user" @close="userForm.open = false">
      <form novalidate @submit.prevent="saveUser">
        <div class="form-group">
          <label for="user-name" class="form-label">Name</label>
          <input id="user-name" v-model="userForm.name" type="text" class="form-input" autocomplete="off" data-autofocus required />
        </div>
        <div class="form-group">
          <label for="user-role" class="form-label">Role</label>
          <select id="user-role" v-model="userForm.role" class="form-input">
            <option value="cashier">Cashier (sales only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="user-pin" class="form-label">PIN (4–6 digits)</label>
            <PasswordInput id="user-pin" v-model="userForm.pin" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" required />
          </div>
          <div class="form-group">
            <label for="user-pin2" class="form-label">Confirm PIN</label>
            <PasswordInput id="user-pin2" v-model="userForm.pin2" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" required />
          </div>
        </div>
        <p v-if="userForm.error" class="form-error" role="alert">{{ userForm.error }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="userForm.open = false">Cancel</button>
          <button type="submit" class="btn btn-success">Add User</button>
        </div>
      </form>
    </BaseModal>

    <!-- Reset PIN -->
    <BaseModal :open="pinForm.open" :title="`Reset PIN — ${pinForm.user?.name || ''}`" variant="amber" :icon="ICONS.key" @close="pinForm.open = false">
      <form novalidate @submit.prevent="savePin">
        <div class="form-row">
          <div class="form-group">
            <label for="reset-pin" class="form-label">New PIN (4–6 digits)</label>
            <PasswordInput id="reset-pin" v-model="pinForm.pin" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" data-autofocus required />
          </div>
          <div class="form-group">
            <label for="reset-pin2" class="form-label">Confirm PIN</label>
            <PasswordInput id="reset-pin2" v-model="pinForm.pin2" inputmode="numeric" maxlength="6" autocomplete="new-password" class="form-input" required />
          </div>
        </div>
        <p v-if="pinForm.error" class="form-error" role="alert">{{ pinForm.error }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="pinForm.open = false">Cancel</button>
          <button type="submit" class="btn btn-warning">Save PIN</button>
        </div>
      </form>
    </BaseModal>

    <!-- Confirm restore -->
    <BaseModal :open="restore.open" title="Restore Backup?" variant="red" :icon="ICONS.warning" @close="cancelRestore">
      <div v-if="restore.summary" class="restore-summary">
        <p>Backup from <strong>{{ formatIso(restore.summary.exportedAt) || 'unknown date' }}</strong> contains:</p>
        <ul>
          <li><strong>{{ restore.summary.sales }}</strong> sales in <strong>{{ restore.summary.months }}</strong> months</li>
          <li><strong>{{ restore.summary.services }}</strong> services, <strong>{{ restore.summary.medicines }}</strong> medicines</li>
          <li><strong>{{ restore.summary.users }}</strong> users</li>
        </ul>
        <p class="restore-warning">
          Staff, items and the months in this backup will replace what is on the server now.
          The server saves a copy of the current data first. Everyone will need to log in again.
        </p>
      </div>
      <p v-if="restoreError" class="form-error" role="alert">{{ restoreError }}</p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="cancelRestore">Cancel</button>
        <button type="button" class="btn btn-danger" :disabled="busy" @click="doRestore">Restore</button>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import BaseModal from '@/components/BaseModal.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { useAuth } from '@/composables/useAuth'
import { useCatalog } from '@/composables/useCatalog'
import { api, apiError } from '@/api/client'
import {
  readBrowserData, summarizeBrowserBackup, hasBrowserData, markImported, importedAt,
  backupKind, summarizeServerBackup
} from '@/utils/backup'
import { buildSalesCsv, downloadTextFile } from '@/utils/csv'
import { formatAmount, formatIso, parseDateInputValue } from '@/utils/format'

const ICONS = {
  user: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
}

const router = useRouter()
const auth = useAuth()
const { users, currentUser, adminCount } = auth
const catalog = useCatalog()

const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

// ---------- Users ----------
const deleteBlockReason = (u) => {
  if (u.id === currentUser.value?.id) return "You can't delete yourself"
  if (u.role === 'admin' && adminCount.value <= 1) return "Can't delete the last admin"
  return ''
}
const canDelete = (u) => !deleteBlockReason(u)

const userForm = reactive({ open: false, name: '', role: 'cashier', pin: '', pin2: '', error: '' })

const openAddUser = () => {
  Object.assign(userForm, { open: true, name: '', role: 'cashier', pin: '', pin2: '', error: '' })
}

const saveUser = async () => {
  userForm.error = ''
  if (userForm.pin !== userForm.pin2) {
    userForm.error = "PINs don't match. Please try again."
    return
  }
  const result = await auth.createUser({ name: userForm.name, role: userForm.role, pin: userForm.pin })
  if (!result.ok) {
    userForm.error = result.error
    return
  }
  userForm.open = false
}

const pinForm = reactive({ open: false, user: null, pin: '', pin2: '', error: '' })

const openResetPin = (user) => {
  Object.assign(pinForm, { open: true, user, pin: '', pin2: '', error: '' })
}

const savePin = async () => {
  pinForm.error = ''
  if (pinForm.pin !== pinForm.pin2) {
    pinForm.error = "PINs don't match. Please try again."
    return
  }
  const result = await auth.resetPin(pinForm.user.id, pinForm.pin)
  if (!result.ok) {
    pinForm.error = result.error
    return
  }
  pinForm.open = false
}

const removeUser = async (u) => {
  if (!canDelete(u)) return
  if (!window.confirm(`Delete user "${u.name}"?\n\nTheir past sales keep their name.`)) return
  const result = await auth.deleteUser(u.id)
  if (!result.ok) alert(result.error)
}

// ---------- Data: server info & monthly files ----------
const info = ref({})
const months = ref([])
const dataError = ref('')
const busy = ref(false)

async function loadData() {
  try {
    const [infoRes, monthsRes] = await Promise.all([api.get('/data/info'), api.get('/data/months')])
    info.value = infoRes.data
    months.value = monthsRes.data
    dataError.value = ''
  } catch (err) {
    dataError.value = apiError(err)
  }
}

onMounted(loadData)

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const formatDay = (value) =>
  parseDateInputValue(value)?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) || value

const downloadMonthJson = async (month) => {
  try {
    const { data } = await api.get(`/data/months/${month}`)
    downloadTextFile(`sales-${month}.json`, JSON.stringify(data, null, 2), 'application/json')
  } catch (err) {
    dataError.value = apiError(err)
  }
}

const downloadMonthCsv = async (month) => {
  try {
    const { data } = await api.get(`/data/months/${month}`)
    downloadTextFile(`sales-${month}.csv`, buildSalesCsv(data), 'text/csv;charset=utf-8')
  } catch (err) {
    dataError.value = apiError(err)
  }
}

// ---------- Full backup ----------
const downloadBackup = async () => {
  busy.value = true
  try {
    const { data } = await api.get('/data/backup')
    downloadTextFile(`afcc-server-backup-${data.exportedAt.slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
  } catch (err) {
    dataError.value = apiError(err)
  } finally {
    busy.value = false
  }
}

// ---------- Restore ----------
const restoreError = ref('')
const restore = reactive({ open: false, backup: null, summary: null })

const onFileChosen = async (event) => {
  restoreError.value = ''
  const file = event.target.files?.[0]
  event.target.value = '' // allow choosing the same file again
  if (!file) return

  let parsed
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    restoreError.value = 'This file could not be read as a backup.'
    return
  }

  const kind = backupKind(parsed)
  if (kind === 'browser') {
    // Backup made by the old browser-only version: import (merge) instead
    const s = summarizeBrowserBackup(parsed)
    if (!window.confirm(`This backup is from the old version (${s.sales} sales).\n\nImport it into the server? Sales already there are skipped.`)) return
    await importFromBrowser(parsed)
    return
  }
  if (kind !== 'server') {
    restoreError.value = 'This file is not a POS backup.'
    return
  }
  Object.assign(restore, { open: true, backup: parsed, summary: summarizeServerBackup(parsed) })
}

const cancelRestore = () => {
  Object.assign(restore, { open: false, backup: null, summary: null })
}

const doRestore = async () => {
  busy.value = true
  restoreError.value = ''
  try {
    await api.post('/data/restore', restore.backup)
  } catch (err) {
    restoreError.value = apiError(err)
    return
  } finally {
    busy.value = false
  }
  cancelRestore()
  alert('Backup restored. Please log in again.')
  await auth.reload() // staff may have changed
  router.replace({ name: 'Login' })
  catalog.load()
}

// ---------- Import from the old browser-only version ----------
const browserData = ref(hasBrowserData() ? summarizeBrowserBackup(readBrowserData()) : null)
const imported = ref(importedAt())
const importReplaceCatalog = ref(true)
const importResult = ref('')

/** `file` = parsed old-format backup file, or null to use this browser's data */
const importFromBrowser = async (file) => {
  busy.value = true
  importResult.value = ''
  try {
    const { data } = await api.post('/data/import-browser', {
      backup: file || readBrowserData(),
      replaceCatalog: importReplaceCatalog.value
    })
    if (!file) {
      markImported()
      imported.value = importedAt()
    }
    importResult.value = `Imported ${data.imported} sales` +
      (data.skipped ? ` (${data.skipped} already on the server were skipped)` : '') +
      (data.catalogReplaced ? '; services and medicines updated.' : '.')
    if (file) alert(importResult.value)
    await Promise.all([loadData(), catalog.load()])
  } catch (err) {
    const message = apiError(err)
    if (file) restoreError.value = message
    else importResult.value = `Import failed: ${message}`
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.settings-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
}

.settings-main {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #064e3b;
}

.card {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 1.25rem 1.5rem 1.5rem;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.card-subtitle {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #4b5563;
  max-width: 44rem;
}

.head-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.5625rem 0.875rem;
  border: none;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

/* Users */
.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #f1f5f9;
  border-radius: 0.75rem;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.user-row + .user-row {
  border-top: 1px solid #f1f5f9;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  font-size: 0.8125rem;
  font-weight: 700;
}

.user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
}

.name {
  font-weight: 600;
  color: #111827;
}

.you {
  font-weight: 400;
  color: #6b7280;
  font-size: 0.8125rem;
}

.role-badge {
  padding: 0 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.role-badge.admin {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-badge.cashier {
  background: #d1fae5;
  color: #047857;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.row-btn {
  padding: 0.4375rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.row-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #047857;
}

.row-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.row-btn.danger:hover:not(:disabled) {
  border-color: #dc2626;
  color: #b91c1c;
}

.row-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Backup */
.backup-status {
  padding: 0.75rem 1rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.backup-status.ok {
  background: #ecfdf5;
  color: #065f46;
}

.backup-status.stale {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.backup-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.backup-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

.backup-box h3 {
  font-weight: 700;
  color: #111827;
}

.backup-box p {
  flex: 1;
  font-size: 0.8125rem;
  color: #4b5563;
}

.backup-box .btn {
  flex: 0 0 auto;
}

.file-btn {
  position: relative;
}

.file-btn:focus-within {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

code {
  font-size: 0.8em;
  background: #f3f4f6;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

.backup-status {
  display: grid;
  gap: 0.25rem;
}

.path {
  word-break: break-all;
}

.sub-title {
  margin: 0.5rem 0 0.5rem;
  font-weight: 700;
  color: #111827;
}

.empty-months {
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #9ca3af;
}

.months-table {
  width: 100%;
  margin-bottom: 1.25rem;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.months-table th {
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
}

.months-table td {
  padding: 0.625rem 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.months-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.month-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.import-box {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px dashed #93c5fd;
  border-radius: 0.75rem;
  background: #eff6ff;
}

.import-box h3 {
  font-weight: 700;
  color: #1e3a8a;
}

.import-box p {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #1f2937;
}

.import-btn {
  flex: 0 0 auto;
  margin-top: 0.75rem;
}

.import-result {
  margin-top: 0.5rem;
  font-weight: 600;
  color: #065f46;
}

.restore-summary ul {
  margin: 0.5rem 0 0.75rem 1.25rem;
  list-style: disc;
  font-size: 0.9375rem;
}

.restore-warning {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.875rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.875rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.checkbox-row input {
  width: 1rem;
  height: 1rem;
  accent-color: #059669;
}

@media (max-width: 640px) {
  .settings-main {
    padding: 0.75rem;
  }

  .card {
    padding: 1rem;
  }

  .card-head {
    flex-direction: column;
  }

  .backup-actions {
    grid-template-columns: 1fr;
  }

  .months-table th:nth-child(3),
  .months-table td:nth-child(3) {
    display: none;
  }

  .months-table td,
  .months-table th {
    padding: 0.5rem;
  }

  .user-row {
    flex-wrap: wrap;
  }

  .row-actions {
    width: 100%;
    padding-left: 3rem;
  }

  .row-btn {
    flex: 1;
  }
}
</style>
