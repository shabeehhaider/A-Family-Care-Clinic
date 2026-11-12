/**
 * Safe JSON file helpers.
 *
 * - Writes are atomic: data goes to a temp file which then replaces the real
 *   file, so a crash or power cut mid-write never leaves a half-written file.
 * - A file that exists but can't be parsed is an ERROR, never treated as
 *   empty — otherwise the next save would overwrite real data with nothing.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

export async function readJson(file, fallback) {
  let text
  try {
    text = await fs.readFile(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return fallback
    throw err
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Data file is damaged and was NOT overwritten: ${file}. Restore it from server-data/backups.`)
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function writeJsonAtomic(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')

  // Windows: antivirus / cloud-sync can briefly lock the target file
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file)
      return
    } catch (err) {
      if (attempt >= 8 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        await fs.rm(tmp, { force: true })
        throw err
      }
      await sleep(50 * (attempt + 1))
    }
  }
}

export async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/** Runs async functions one at a time (prevents two saves interleaving). */
export function createQueue() {
  let tail = Promise.resolve()
  return (fn) => {
    const run = tail.then(fn)
    tail = run.catch(() => {})
    return run
  }
}
