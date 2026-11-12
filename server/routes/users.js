import { Router } from 'express'
import { HttpError, hashPin, isValidPin, publicUser } from '../auth.js'

/** /api/users — admin only */
export default function userRoutes({ store, auth }) {
  const r = Router()
  r.use(auth.requireAuth, auth.requireAdmin)

  r.get('/', async (_req, res) => {
    const users = await store.getUsers()
    res.json(users.map(u => ({ ...publicUser(u), createdAt: u.createdAt })))
  })

  r.post('/', async (req, res) => {
    const name = String(req.body?.name || '').trim()
    const role = req.body?.role === 'admin' ? 'admin' : 'cashier'
    const pin = req.body?.pin
    if (!name) throw new HttpError(400, 'Name is required.')
    if (!isValidPin(pin)) throw new HttpError(400, 'PIN must be 4–6 numbers.')

    const user = await store.mutate(async () => {
      const users = await store.getUsers()
      if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
        throw new HttpError(409, 'A user with this name already exists.')
      }
      const created = { id: `u${Date.now()}`, name, role, ...(await hashPin(pin)), createdAt: new Date().toISOString() }
      users.push(created)
      await store.saveUsers(users)
      return created
    })
    res.status(201).json(publicUser(user))
  })

  r.post('/:id/pin', async (req, res) => {
    if (!isValidPin(req.body?.pin)) throw new HttpError(400, 'PIN must be 4–6 numbers.')
    await store.mutate(async () => {
      const users = await store.getUsers()
      const user = users.find(u => u.id === req.params.id)
      if (!user) throw new HttpError(404, 'User not found.')
      Object.assign(user, await hashPin(req.body.pin))
      await store.saveUsers(users)
    })
    res.json({ ok: true })
  })

  r.delete('/:id', async (req, res) => {
    await store.mutate(async () => {
      const users = await store.getUsers()
      const user = users.find(u => u.id === req.params.id)
      if (!user) throw new HttpError(404, 'User not found.')
      if (user.id === req.user.id) throw new HttpError(400, "You can't delete yourself.")
      if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
        throw new HttpError(400, "You can't delete the last admin.")
      }
      await store.saveUsers(users.filter(u => u.id !== user.id))
    })
    res.json({ ok: true })
  })

  return r
}
