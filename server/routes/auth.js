import { Router } from 'express'
import { HttpError, hashPin, isValidPin, publicUser } from '../auth.js'

/** /api/auth — status, first-run setup, login, current user */
export default function authRoutes({ store, auth }) {
  const r = Router()

  // Login screen: is the POS set up, and who can log in?
  r.get('/status', async (_req, res) => {
    const users = await store.getUsers()
    res.json({ hasUsers: users.length > 0, users: users.map(publicUser) })
  })

  // First run only: create the first admin
  r.post('/setup', async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const pin = req.body?.pin
    if (!name) throw new HttpError(400, 'Name is required.')
    if (!isValidPin(pin)) throw new HttpError(400, 'PIN must be 4–6 numbers.')

    const user = await store.mutate(async () => {
      const users = await store.getUsers()
      if (users.length > 0) throw new HttpError(409, 'The POS is already set up. Please log in.')
      const created = { id: `u${Date.now()}`, name, role: 'admin', ...(await hashPin(pin)), createdAt: new Date().toISOString() }
      await store.saveUsers([created])
      return created
    })
    res.status(201).json({ token: auth.issueToken(user), user: publicUser(user) })
  })

  r.post('/login', async (req, res) => {
    const user = await auth.verify(String(req.body?.userId || ''), req.body?.pin)
    res.json({ token: auth.issueToken(user), user: publicUser(user) })
  })

  r.get('/me', auth.requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) })
  })

  return r
}
