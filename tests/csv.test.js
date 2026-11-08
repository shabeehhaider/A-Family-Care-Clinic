import { describe, it, expect } from 'vitest'
import { csvCell, csvPhone, buildSalesCsv, SALES_CSV_HEADER } from '../src/utils/csv'

describe('csvCell', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('Paracetamol')).toBe('Paracetamol')
    expect(csvCell(42)).toBe('42')
  })

  it('renders null/undefined as empty', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('neutralises formula injection', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+123')).toBe("'+123")
    expect(csvCell('-1')).toBe("'-1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
})

describe('csvPhone', () => {
  it('keeps leading zeros by emitting a text formula', () => {
    expect(csvPhone('03331234567')).toBe('="03331234567"')
    expect(csvPhone(' +92 333-1234567 ')).toBe('="+92 333-1234567"')
  })

  it('is empty for no phone', () => {
    expect(csvPhone('')).toBe('')
    expect(csvPhone(undefined)).toBe('')
  })

  it('escapes non-phone text like any other cell', () => {
    expect(csvPhone('=evil()')).toBe("'=evil()")
  })
})

describe('buildSalesCsv', () => {
  const sale = (overrides = {}) => ({
    receiptNumber: 'RC-20261108-001',
    createdAt: new Date(2026, 10, 8, 18, 5).toISOString(),
    cashier: { id: 'u1', name: 'Ayesha' },
    patientName: 'Ali, Khan',
    patientPhone: '03001234567',
    items: [
      { id: 's1', name: 'Consultation', price: 500, quantity: 1, type: 'service' },
      { id: 'm1', name: 'Paracetamol 500mg', price: 50, quantity: 2, type: 'medicine' }
    ],
    subtotal: 600,
    discount: 0,
    tax: 0,
    grandTotal: 600,
    paymentMethod: 'Cash',
    ...overrides
  })

  it('starts with a UTF-8 BOM and the header', () => {
    const csv = buildSalesCsv([])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1)).toBe(SALES_CSV_HEADER.join(','))
  })

  it('writes one row per sale with local date/time and items', () => {
    const [, row] = buildSalesCsv([sale()]).slice(1).split('\r\n')
    expect(row).toContain('RC-20261108-001,2026-11-08,18:05,Ayesha,"Ali, Khan",="03001234567"')
    expect(row).toContain('Consultation x1 @500; Paracetamol 500mg x2 @50')
    expect(row).toContain(',3,600,0,0,600,Cash,Completed')
  })

  it('marks voided sales with reason and approver', () => {
    const voided = sale({ voided: { at: new Date().toISOString(), reason: 'Wrong item', by: { name: 'Dr. A' } } })
    const [, row] = buildSalesCsv([voided]).slice(1).split('\r\n')
    expect(row).toContain(',VOID,Wrong item,Dr. A,')
  })

  it('sorts oldest first', () => {
    const later = sale({ receiptNumber: 'B', createdAt: new Date(2026, 10, 9).toISOString() })
    const earlier = sale({ receiptNumber: 'A', createdAt: new Date(2026, 10, 7).toISOString() })
    const rows = buildSalesCsv([later, earlier]).slice(1).split('\r\n').slice(1)
    expect(rows[0].startsWith('A,')).toBe(true)
    expect(rows[1].startsWith('B,')).toBe(true)
  })
})
