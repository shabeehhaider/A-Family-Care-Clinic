import { describe, it, expect, beforeEach } from 'vitest'
import { installMemoryStorage } from './helpers/memoryStorage'
import {
  readBrowserData, summarizeBrowserBackup, hasBrowserData, backupKind, summarizeServerBackup,
  BROWSER_BACKUP_APP, SERVER_BACKUP_APP
} from '../src/utils/backup'

describe('old browser data (for import into the server)', () => {
  let storage

  beforeEach(() => {
    storage = installMemoryStorage()
  })

  it('is absent on a fresh browser', () => {
    expect(hasBrowserData()).toBe(false)
    expect(summarizeBrowserBackup(readBrowserData())).toEqual({ sales: 0, services: 0, medicines: 0 })
  })

  it('reads what the old version saved', () => {
    storage.localStorage.setItem('afcc.sales', JSON.stringify([{ receiptNumber: 'A' }, { receiptNumber: 'B' }]))
    storage.localStorage.setItem('afcc.medicines', JSON.stringify([{ id: 'm1' }]))
    storage.localStorage.setItem('afcc.receiptCounter', JSON.stringify({ date: '20261108', seq: 2 }))

    const backup = readBrowserData()
    expect(backup.app).toBe(BROWSER_BACKUP_APP)
    expect(backup.data.receiptCounter).toEqual({ date: '20261108', seq: 2 })
    expect(summarizeBrowserBackup(backup)).toEqual({ sales: 2, services: 0, medicines: 1 })
    expect(hasBrowserData()).toBe(true)
  })

  it('ignores damaged sales data', () => {
    storage.localStorage.setItem('afcc.sales', '{"not":"a list"}')
    expect(readBrowserData().data.sales).toEqual([])
  })
})

describe('backup files', () => {
  it('tells server and old-browser backups apart', () => {
    expect(backupKind({ app: SERVER_BACKUP_APP })).toBe('server')
    expect(backupKind({ app: BROWSER_BACKUP_APP })).toBe('browser')
    expect(backupKind({ app: 'other' })).toBe(null)
    expect(backupKind(null)).toBe(null)
  })

  it('summarises a server backup', () => {
    const summary = summarizeServerBackup({
      exportedAt: '2026-11-09T10:00:00.000Z',
      data: {
        users: [{}, {}],
        catalog: { services: [{}], medicines: [{}, {}, {}] },
        sales: { '2026-10': [{}, {}], '2026-11': [{}] }
      }
    })
    expect(summary).toEqual({ exportedAt: '2026-11-09T10:00:00.000Z', months: 2, sales: 3, services: 1, medicines: 3, users: 2 })
  })
})
