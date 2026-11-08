import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { sha256Hex, hashPin, randomSalt, isValidPin } from '../src/utils/crypto'

describe('sha256Hex', () => {
  it('matches the standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')
  })

  it('matches Node crypto for multi-block and non-ASCII input', () => {
    for (const input of ['x'.repeat(55), 'y'.repeat(64), 'z'.repeat(1000), 'عائشہ کلینک 1234']) {
      expect(sha256Hex(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'))
    }
  })
})

describe('hashPin / randomSalt', () => {
  it('depends on the salt', () => {
    expect(hashPin('1234', 'aa')).not.toBe(hashPin('1234', 'bb'))
    expect(hashPin('1234', 'aa')).toBe(hashPin('1234', 'aa'))
  })

  it('makes 32-char hex salts that differ', () => {
    const a = randomSalt()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(randomSalt()).not.toBe(a)
  })
})

describe('isValidPin', () => {
  it('accepts 4–6 digits only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })
})
