import { describe, it, expect, beforeEach } from 'vitest'
import { installMemoryStorage } from './helpers/memoryStorage'
import { createBackup, validateBackup, restoreBackup, backupFilename, BACKUP_APP_ID } from '../src/utils/backup'
import { loadFromStorage, saveToStorage } from '../src/utils/storage'

const admin = { id: 'u1', name: 'Dr. A', role: 'admin', salt: 'aa', pinHash: 'hash' }

const validBackup = (data = {}) => ({
  app: BACKUP_APP_ID,
  version: 1,
  exportedAt: '2026-11-08T10:00:00.000Z',
  data: {
    services: [{ id: 's1' }],
    medicines: [{ id: 'm1' }, { id: 'm2' }],
    sales: [{ receiptNumber: 'A' }],
    receiptCounter: { date: '20261108', seq: 1 },
    users: [admin],
    ...data
  }
})

describe('validateBackup', () => {
  it('accepts a good backup and summarises it', () => {
    expect(validateBackup(validBackup())).toEqual({
      ok: true,
      summary: { exportedAt: '2026-11-08T10:00:00.000Z', sales: 1, services: 1, medicines: 2, users: 1 }
    })
  })

  it('rejects other files', () => {
    expect(validateBackup(null).ok).toBe(false)
    expect(validateBackup({ app: 'something-else', version: 1, data: {} }).ok).toBe(false)
  })

  it('rejects backups from a newer version', () => {
    expect(validateBackup({ ...validBackup(), version: 99 }).ok).toBe(false)
  })

  it('rejects damaged sections', () => {
    expect(validateBackup(validBackup({ sales: 'oops' })).ok).toBe(false)
  })

  it('rejects backups nobody could log in to', () => {
    const result = validateBackup(validBackup({ users: [{ ...admin, role: 'cashier' }] }))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/admin/)
  })
})

describe('createBackup / restoreBackup', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  it('round-trips all data and clears the in-progress cart', () => {
    saveToStorage('sales', [{ receiptNumber: 'OLD' }])
    saveToStorage('draft', { cartItems: [{ id: 'x' }] })

    restoreBackup(validBackup())

    expect(loadFromStorage('sales')).toEqual([{ receiptNumber: 'A' }])
    expect(loadFromStorage('users')).toEqual([admin])
    expect(loadFromStorage('draft', null)).toBe(null)

    const backup = createBackup(new Date('2026-11-09T00:00:00Z'))
    expect(backup.app).toBe(BACKUP_APP_ID)
    expect(backup.data.medicines).toHaveLength(2)
    expect(validateBackup(backup).ok).toBe(true)
  })

  it('names files with date and time', () => {
    expect(backupFilename(new Date(2026, 10, 8, 9, 5))).toBe('afcc-backup-2026-11-08_0905.json')
  })
})
