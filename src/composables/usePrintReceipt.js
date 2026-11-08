import { ref, nextTick, onUnmounted } from 'vue'

/**
 * Shared thermal-receipt printing logic (used by POS and Sales History).
 *
 * Requires a <Receipt> component to be rendered on the page (it is hidden on
 * screen and shown only in print).
 *
 * - Sizes the printed page to exactly 80mm × receipt height, so PDFs are one
 *   strip and thermal printers cut right after the content (browsers fall
 *   back to A4 otherwise).
 * - Mobile/tablet browsers return from window.print() immediately (the print
 *   UI is async), so completion is detected via `afterprint`, with the print
 *   media query switching off as a fallback — never a timer.
 */
export function usePrintReceipt() {
  const isPrinting = ref(false)
  let printMediaQuery = null
  let onDone = null

  const onPrintMediaChange = (e) => {
    if (!e.matches) finishPrint()
  }

  function stopWaitingForPrint() {
    window.removeEventListener('afterprint', finishPrint)
    printMediaQuery?.removeEventListener?.('change', onPrintMediaChange)
    printMediaQuery = null
    onDone = null
    isPrinting.value = false
  }

  function finishPrint() {
    if (!isPrinting.value) return
    const callback = onDone
    stopWaitingForPrint()
    callback?.()
  }

  /**
   * Prints the receipt currently rendered on the page.
   * @param {Function} [callback] called once printing has finished
   * @returns {Promise<boolean>} false if a print is already in progress
   */
  async function printReceipt(callback) {
    if (isPrinting.value) return false
    isPrinting.value = true
    onDone = callback || null

    // Let Vue render the latest receipt data before measuring / printing
    await nextTick()
    await setReceiptPageSize()

    window.addEventListener('afterprint', finishPrint)
    if (window.matchMedia) {
      printMediaQuery = window.matchMedia('print')
      printMediaQuery.addEventListener?.('change', onPrintMediaChange)
    }

    window.print()
    return true
  }

  onUnmounted(stopWaitingForPrint)

  return { isPrinting, printReceipt, cancelPrintWait: stopWaitingForPrint }
}

const waitForImages = (root) => Promise.all(
  Array.from(root.querySelectorAll('img'))
    .filter(img => !img.complete)
    .map(img => new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
    }))
)

/**
 * Measures the receipt and injects `@page { size: 80mm <height>mm }`.
 *
 * The receipt is display:none on screen. The `measuring-receipt` class on
 * <html> (see style.css) briefly renders the REAL receipt off-screen so it can
 * be measured. (Measuring a clone was unreliable: the cloned logo <img> could
 * report 0 height before decoding, making the page too short so the receipt
 * spilled onto a second page.)
 */
async function setReceiptPageSize() {
  const receipt = document.querySelector('#receipt .receipt')
  if (!receipt) return

  const root = document.documentElement
  root.classList.add('measuring-receipt')

  let heightPx
  try {
    await waitForImages(receipt)
    // make sure the logo has real dimensions before measuring
    await Promise.all(
      Array.from(receipt.querySelectorAll('img')).map(img => img.decode?.().catch(() => {}))
    )
    heightPx = receipt.getBoundingClientRect().height
  } finally {
    root.classList.remove('measuring-receipt')
  }

  if (!heightPx) return

  const PX_PER_MM = 96 / 25.4
  const FEED_MM = 8 // blank paper so the cutter doesn't clip the last line (also absorbs rounding)
  const heightMm = Math.ceil(heightPx / PX_PER_MM) + FEED_MM

  let styleEl = document.getElementById('receipt-page-size')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'receipt-page-size'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = `@media print { @page { size: 80mm ${heightMm}mm; margin: 0; } }`
}
