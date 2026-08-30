const toDate = value => {
  if (!value) return null
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

const toIsoDate = value => {
  const date = toDate(value)
  return date ? date.toISOString().slice(0, 10) : null
}

const addDays = (value, days) => {
  const date = toDate(value)
  if (!date || !Number.isFinite(Number(days))) return null
  date.setUTCDate(date.getUTCDate() + Number(days))
  return toIsoDate(date)
}

const decimal = value => Number(value || 0)

const calculateQuote = (quote, request, options = {}) => {
  const today = toIsoDate(options.today || new Date())
  const supplier = quote.supplier || options.supplier || {}
  const reasons = []
  const requestedQuantity = decimal(request?.requestedQuantity)
  const minimumOrderQuantity = decimal(quote.minimumOrderQuantity)
  const expectedDeliveryDate = addDays(today, quote.leadTimeDays)
  const materialCost = Number((decimal(quote.unitPrice) * requestedQuantity).toFixed(2))
  const shippingCost = Number(decimal(quote.shippingCost).toFixed(2))
  const validUntil = toIsoDate(quote.validUntil)
  const requiredDeliveryDate = toIsoDate(request?.requiredDeliveryDate)

  if (!validUntil || validUntil < today) reasons.push('Quote expired')
  if (supplier.active === false) reasons.push('Supplier inactive')
  if (minimumOrderQuantity > requestedQuantity) reasons.push('MOQ exceeds requested quantity')
  if (!expectedDeliveryDate || !requiredDeliveryDate) {
    reasons.push('Missing delivery date')
  } else if (expectedDeliveryDate > requiredDeliveryDate) {
    reasons.push('Delivery after required date')
  }

  return {
    ...quote,
    materialCost,
    landedCost: Number((materialCost + shippingCost).toFixed(2)),
    expectedDeliveryDate,
    eligible: reasons.length === 0,
    eligibilityReason: reasons.length ? reasons.join('; ') : 'Eligible',
    recommended: false
  }
}

const compareQuotes = (left, right) => {
  if (left.landedCost !== right.landedCost) return left.landedCost - right.landedCost
  if (decimal(left.leadTimeDays) !== decimal(right.leadTimeDays)) {
    return decimal(left.leadTimeDays) - decimal(right.leadTimeDays)
  }
  const leftOnTimeDelivery = decimal(left.supplier?.onTimeDeliveryRate ?? left.supplierOnTimeDeliveryRate)
  const rightOnTimeDelivery = decimal(right.supplier?.onTimeDeliveryRate ?? right.supplierOnTimeDeliveryRate)
  if (leftOnTimeDelivery !== rightOnTimeDelivery) return rightOnTimeDelivery - leftOnTimeDelivery
  const leftQuality = decimal(left.supplier?.qualityScore ?? left.supplierQualityScore)
  const rightQuality = decimal(right.supplier?.qualityScore ?? right.supplierQualityScore)
  if (leftQuality !== rightQuality) return rightQuality - leftQuality
  return String(left.ID).localeCompare(String(right.ID))
}

const calculateQuotes = (quotes, request, options = {}) => {
  const calculated = quotes.map(quote => calculateQuote(quote, request, options))
  const eligibleQuotes = calculated.filter(quote => quote.eligible).sort(compareQuotes)

  if (eligibleQuotes[0]) {
    const recommendedId = eligibleQuotes[0].ID
    calculated.forEach(quote => { quote.recommended = quote.ID === recommendedId })
  }

  return calculated
}

const getRecommendedQuote = (quotes, request, options = {}) =>
  calculateQuotes(quotes, request, options).find(quote => quote.recommended)

module.exports = {
  addDays,
  calculateQuote,
  calculateQuotes,
  compareQuotes,
  getRecommendedQuote,
  toIsoDate
}
