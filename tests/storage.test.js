import { describe, it, expect, beforeEach } from 'vitest'
import { installMemoryStorage } from './helpers/memoryStorage'
import { loadFromStorage, saveToStorage, removeFromStorage } from '../src/utils/storage'

describe('storage', () => {
  let storage

  beforeEach(() => {
    storage = installMemoryStorage()
  })

  it('round-trips JSON under the afcc. prefix', () => {
    expect(saveToStorage('draft', { cartItems: [1] })).toBe(true)
    expect(storage.localStorage.getItem('afcc.draft')).toBe('{"cartItems":[1]}')
    expect(loadFromStorage('draft', null)).toEqual({ cartItems: [1] })
    removeFromStorage('draft')
    expect(loadFromStorage('draft', 'fallback')).toBe('fallback')
  })

  it('returns the fallback for damaged data instead of throwing', () => {
    storage.localStorage.setItem('afcc.draft', '{not json')
    expect(loadFromStorage('draft', 'fallback')).toBe('fallback')
  })
})
