const test = require('node:test')
const assert = require('node:assert/strict')
const {
  calculateQuote,
  calculateQuotes,
  getRecommendedQuote
} = require('../srv/sourcing-calculations')

const request = {
  ID: 'request-1',
  requestedQuantity: 100,
  requiredDeliveryDate: '2026-09-15'
}

const supplier = {
  ID: 'supplier-1',
  active: true,
  onTimeDeliveryRate: 96,
  qualityScore: 4.5
}

test('calculates PLN material cost, shipping and landed cost for an eligible quote', () => {
  const quote = calculateQuote({
    ID: 'quote-1',
    unitPrice: 125,
    shippingCost: 75,
    paymentTerms: 'Net 30',
    minimumOrderQuantity: 100,
    leadTimeDays: 7,
    validUntil: '2026-09-10',
    supplier
  }, request, { today: '2026-09-01' })

  assert.equal(quote.materialCost, 12500)
  assert.equal(quote.shippingCost, 75)
  assert.equal(quote.landedCost, 12575)
  assert.equal(quote.expectedDeliveryDate, '2026-09-08')
  assert.equal(quote.eligible, true)
  assert.equal(quote.eligibilityReason, 'Eligible')
})

test('rejects a quote that is expired, inactive and above the requested MOQ', () => {
  const quote = calculateQuote({
    ID: 'quote-2',
    unitPrice: 10,
    minimumOrderQuantity: 250,
    leadTimeDays: 20,
    validUntil: '2026-08-30',
    supplier: { active: false }
  }, request, { today: '2026-09-01' })

  assert.equal(quote.eligible, false)
  assert.match(quote.eligibilityReason, /Quote expired/)
  assert.match(quote.eligibilityReason, /Supplier inactive/)
  assert.match(quote.eligibilityReason, /MOQ exceeds requested quantity/)
  assert.match(quote.eligibilityReason, /Delivery after required date/)
})

test('recommends the lowest-landed-cost quote that meets every requirement', () => {
  const quotes = calculateQuotes([
    {
      ID: 'lower-unit-price', unitPrice: 100, shippingCost: 1000, minimumOrderQuantity: 100,
      leadTimeDays: 7, validUntil: '2026-09-10', supplier
    },
    {
      ID: 'lower-landed-cost', unitPrice: 105, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 7, validUntil: '2026-09-10', supplier
    },
    {
      ID: 'high-moq', unitPrice: 100, shippingCost: 60, minimumOrderQuantity: 200,
      leadTimeDays: 4, validUntil: '2026-09-10', supplier
    }
  ], request, { today: '2026-09-01' })

  assert.equal(quotes.find(quote => quote.recommended).ID, 'lower-landed-cost')
})

test('uses lead time, delivery performance and quality to resolve equal landed costs', () => {
  const quotes = [
    {
      ID: 'slower', unitPrice: 100, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 8, validUntil: '2026-09-10', supplier: { active: true, onTimeDeliveryRate: 99, qualityScore: 5 }
    },
    {
      ID: 'faster-lower-performance', unitPrice: 100, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 5, validUntil: '2026-09-10', supplier: { active: true, onTimeDeliveryRate: 97, qualityScore: 4.1 }
    },
    {
      ID: 'faster-higher-performance', unitPrice: 100, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 5, validUntil: '2026-09-10', supplier: { active: true, onTimeDeliveryRate: 97, qualityScore: 4.8 }
    }
  ]

  const recommended = getRecommendedQuote(quotes, request, { today: '2026-09-01' })
  assert.equal(recommended.ID, 'faster-higher-performance')
})

test('uses on-time delivery when landed cost and lead time are equal', () => {
  const recommended = getRecommendedQuote([
    {
      ID: 'lower-on-time', unitPrice: 100, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 5, validUntil: '2026-09-10', supplier: { active: true, onTimeDeliveryRate: 92, qualityScore: 4.9 }
    },
    {
      ID: 'higher-on-time', unitPrice: 100, shippingCost: 100, minimumOrderQuantity: 100,
      leadTimeDays: 5, validUntil: '2026-09-10', supplier: { active: true, onTimeDeliveryRate: 97, qualityScore: 4.1 }
    }
  ], request, { today: '2026-09-01' })

  assert.equal(recommended.ID, 'higher-on-time')
})
