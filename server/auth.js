/**
 * Authentication: PIN hashing (scrypt), login tokens (JWT), lockout and
 * role checks. Roles are enforced here on the server, not just in the UI.
 */
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import jwt from 'jsonwebtoken'

const scrypt = promisify(crypto.scrypt)

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const isValidPin = (pin) => /^\d{4,6}$/.test(String(pin ?? ''))

export async function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = (await scrypt(String(pin), salt, 64)).toString('hex')
  return { salt, pinHash: hash }
}

export async function checkPin(user, pin) {
  if (!user?.salt || !user?.pinHash) return false
  const expected = Buffer.from(user.pinHash, 'hex')
  const actual = await scrypt(String(pin ?? ''), user.salt, expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

/** Safe-to-share view of a user (no PIN data). */
export const publicUser = (u) => (u ? { id: u.id, name: u.name, role: u.role } : null)

export function createAuth({ store, secret, tokenTtl }) {
  const failures = new Map() // userId -> { count, lockedUntil }

  function lockoutSeconds(userId) {
    const f = failures.get(userId)
    if (!f?.lockedUntil) return 0
    const ms = f.lockedUntil - Date.now()
    if (ms <= 0) {
      failures.delete(userId)
      return 0
    }
    return Math.ceil(ms / 1000)
  }

  function recordFailure(userId) {
    const f = failures.get(userId) || { count: 0, lockedUntil: 0 }
    f.count++
    if (f.count >= MAX_ATTEMPTS) {
      f.count = 0
      f.lockedUntil = Date.now() + LOCKOUT_MS
    }
    failures.set(userId, f)
  }

  /**
   * Checks a PIN with lockout. Throws HttpError on failure.
   * (400/429, never 401 — 401 means "your login token is no longer valid".)
   */
  async function verify(userId, pin, { adminOnly = false } = {}) {
    const wait = lockoutSeconds(userId)
    if (wait) throw new HttpError(429, `Too many wrong PINs. Try again in ${wait}s.`)

    const users = await store.getUsers()
    const user = users.find(u => u.id === userId && (!adminOnly || u.role === 'admin'))
    if (!user || !(await checkPin(user, pin))) {
      recordFailure(userId)
      const lock = lockoutSeconds(userId)
      throw new HttpError(lock ? 429 : 400, lock
        ? `Too many wrong PINs. Try again in ${lock}s.`
        : adminOnly ? 'Wrong admin PIN.' : 'Wrong PIN.')
    }
    failures.delete(userId)
    return user
  }

  const issueToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: tokenTtl })

  /** Express middleware: requires a valid token; sets req.user (fresh from storage). */
  async function requireAuth(req, _res, next) {
    const header = req.get('authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return next(new HttpError(401, 'Please log in.'))
    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch {
      return next(new HttpError(401, 'Your login has expired. Please log in again.'))
    }
    // Re-read the user so deleted users / role changes take effect immediately
    const user = (await store.getUsers()).find(u => u.id === payload.sub)
    if (!user) return next(new HttpError(401, 'This user no longer exists.'))
    req.user = user
    next()
  }

  function requireAdmin(req, _res, next) {
    if (req.user?.role !== 'admin') return next(new HttpError(403, 'Only an admin can do this.'))
    next()
  }

  return { verify, issueToken, requireAuth, requireAdmin }
}
