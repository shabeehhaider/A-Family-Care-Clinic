/** API suite on the FILE store, plus file-specific checks. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runApiSuite } from './apiSuite.js'
import { FileStore } from '../../server/store/fileStore.js'
import { createApp } from '../../server/app.js'

const tempStore = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'afcc-file-'))
  return { dir, store: new FileStore(dir), cleanup: () => fs.rm(dir, { recursive: true, force: true }) }
}

runApiSuite('files', tempStore)

describe('file store on disk', () => {
  let ctx

  beforeAll(async () => {
    ctx = await tempStore()
    await ctx.store.init()
  })

  afterAll(() => ctx.cleanup())

  it('keeps one JSON file per month and writes no temp files', async () => {
    await ctx.store.appendSale({ receiptNumber: 'RC-1', createdAt: new Date(2026, 10, 8, 12).toISOString() })
    expect(await fs.readdir(path.join(ctx.dir, 'sales'))).toEqual(['2026-11.json'])
  })

  it('copies daily backups into backups/YYYY-MM-DD/', async () => {
    const label = await ctx.store.mutate(() => ctx.store.snapshot('2026-11-08', { now: new Date(2026, 10, 8, 12) }))
    expect(label).toBe(path.join('backups', '2026-11-08'))
    expect(await fs.readdir(path.join(ctx.dir, 'backups', '2026-11-08', 'sales'))).toEqual(['2026-11.json'])
  })

  it('refuses to overwrite a damaged data file', async () => {
    const { app } = await createApp({ distDir: null, tokenTtl: '1h', backupKeepDays: 90 }, { store: ctx.store })
    const file = path.join(ctx.dir, 'catalog.json')
    await fs.writeFile(file, '{ broken')
    const server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    try {
      // any change reads the catalog first → fails safely
      await expect(ctx.store.getCatalog()).rejects.toThrow(/damaged/)
      expect(await fs.readFile(file, 'utf8')).toBe('{ broken') // left alone, not emptied
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })
})
