const cds = require('@sap/cds')
const { calculateQuotes } = require('./sourcing-calculations')

// UI.CriticalityType codes used by the Fiori Elements colour coding
const CRITICALITY_NEGATIVE = 1
const CRITICALITY_POSITIVE = 3

const copyCalculation = (quote, calculation, request) => {
  quote.materialCost = calculation.materialCost
  quote.landedCost = calculation.landedCost
  quote.expectedDeliveryDate = calculation.expectedDeliveryDate
  quote.eligible = calculation.eligible
  quote.eligibilityReason = calculation.eligibilityReason
  quote.recommended = calculation.recommended
  quote.selectable = calculation.eligible && request.status !== 'Selected'
  quote.eligibilityCriticality = calculation.eligible ? CRITICALITY_POSITIVE : CRITICALITY_NEGATIVE
}

module.exports = cds.service.impl(async function () {
  const { Suppliers, SourcingRequests, Quotes } = cds.entities('sourcing')

  const getQuotesWithSuppliers = async requestIds => {
    const [quotes, suppliers] = await Promise.all([
      SELECT.from(Quotes).where({ request_ID: { in: requestIds } }),
      SELECT.from(Suppliers)
    ])

    return quotes.map(quote => ({
      ...quote,
      supplier: suppliers.find(supplier => supplier.ID === quote.supplier_ID)
    }))
  }

  const calculateRequestQuotes = (request, quotes) => {
    if (!request) return []
    const requestQuotes = quotes.filter(quote => quote.request_ID === request.ID)
    return calculateQuotes(requestQuotes, request)
  }

  // Virtual fields are computed from these columns, so they must be read even when
  // a $select (Fiori Elements always sends one) does not ask for them.
  const sourceColumns = ['ID', 'request_ID', 'supplier_ID', 'unitPrice', 'shippingCost',
    'minimumOrderQuantity', 'leadTimeDays', 'validUntil']

  this.before('READ', 'Quotes', req => {
    const columns = req.query.SELECT?.columns
    if (!columns) return

    sourceColumns.forEach(name => {
      const alreadySelected = columns.some(column => column.ref?.[0] === name)
      if (!alreadySelected) columns.push({ ref: [name] })
    })
  })

  this.after('READ', 'Quotes', async data => {
    const responseQuotes = Array.isArray(data) ? data : [data]
    const requestIds = [...new Set(responseQuotes.map(quote => quote?.request_ID).filter(Boolean))]
    if (!requestIds.length) return

    const [requests, quotes] = await Promise.all([
      SELECT.from(SourcingRequests).where({ ID: { in: requestIds } }),
      getQuotesWithSuppliers(requestIds)
    ])

    responseQuotes.forEach(quote => {
      const request = requests.find(item => item.ID === quote.request_ID)
      const calculation = calculateRequestQuotes(request, quotes).find(item => item.ID === quote.ID)
      if (calculation) copyCalculation(quote, calculation, request)
    })
  })

  this.after('READ', 'SourcingRequests', async data => {
    const requests = (Array.isArray(data) ? data : [data])
      .filter(request => request && Array.isArray(request.quotes))
    if (!requests.length) return

    const quotes = await getQuotesWithSuppliers(requests.map(request => request.ID))

    requests.forEach(request => {
      const calculations = calculateRequestQuotes(request, quotes)

      request.quotes.forEach(quote => {
        const calculation = calculations.find(item => item.ID === quote.ID)
        if (calculation) copyCalculation(quote, calculation, request)
      })
    })
  })

  this.on('getDashboard', async () => {
    const requests = await SELECT.from(SourcingRequests)
    const quotes = await getQuotesWithSuppliers(requests.map(request => request.ID))
    let openRequestsWithRecommendation = 0
    let requestsWithoutEligibleQuote = 0
    let selectedRequests = 0
    let recommendedPipelineSpend = 0
    let potentialSavings = 0

    requests.forEach(request => {
      const calculations = calculateRequestQuotes(request, quotes)
      const recommendation = calculations.find(quote => quote.recommended)
      const isSelected = request.status === 'Selected' || Boolean(request.selectedQuote_ID)

      if (isSelected) {
        selectedRequests += 1
      } else if (!recommendation) {
        requestsWithoutEligibleQuote += 1
      } else {
        openRequestsWithRecommendation += 1
        recommendedPipelineSpend += recommendation.landedCost

        const eligibleCosts = calculations
          .filter(quote => quote.eligible)
          .map(quote => quote.landedCost)
        potentialSavings += Math.max(...eligibleCosts) - recommendation.landedCost
      }
    })

    return {
      openRequestsWithRecommendation,
      requestsWithoutEligibleQuote,
      selectedRequests,
      recommendedPipelineSpend: Number(recommendedPipelineSpend.toFixed(2)),
      potentialSavings: Number(potentialSavings.toFixed(2))
    }
  })

  const selectQuote = async (req, requestId, quoteId) => {
    if (!requestId || !quoteId) return req.reject(400, 'Request and quote are required')

    const request = await SELECT.one.from(SourcingRequests).where({ ID: requestId })
    if (!request) return req.reject(404, 'Sourcing request not found')
    if (request.status === 'Selected' || request.selectedQuote_ID) {
      return req.reject(409, 'A quote has already been selected for this sourcing request')
    }

    const quotes = await getQuotesWithSuppliers([request.ID])
    const calculation = calculateRequestQuotes(request, quotes).find(quote => quote.ID === quoteId)

    if (!calculation) return req.reject(404, 'Quote not found for this sourcing request')
    if (!calculation.eligible) {
      return req.reject(400, `Quote cannot be selected: ${calculation.eligibilityReason}`)
    }

    await UPDATE(SourcingRequests)
      .set({ selectedQuote_ID: calculation.ID, status: 'Selected' })
      .where({ ID: request.ID })

    return calculation
  }

  this.on('selectQuote', req => {
    const { requestId, quoteId } = req.data
    return selectQuote(req, requestId, quoteId)
  })

  this.on('choose', 'Quotes', async req => {
    const quoteId = req.params[0]?.ID
    const quote = await SELECT.one.from(Quotes).where({ ID: quoteId })
    if (!quote) return req.reject(404, 'Quote not found')

    return selectQuote(req, quote.request_ID, quote.ID)
  })
})
