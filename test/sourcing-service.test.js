const assert = require('node:assert/strict')
const cds = require('@sap/cds')
const { GET, POST } = cds.test('serve', '--project', __dirname + '/..', '--in-memory')

const getRequest = async number => {
  const { data } = await GET(`/sourcing/SourcingRequests?$filter=number eq '${number}'`)
  return data.value[0]
}

const getQuote = async (request, supplierName) => {
  const { data } = await GET(`/sourcing/Quotes?$filter=request_ID eq ${request.ID}&$expand=supplier`)
  return data.value.find(quote => quote.supplier.name === supplierName)
}

describe('Sourcing service', () => {
  it('keeps the recommendation correct when one quote is requested directly', async () => {
    const request = await getRequest('RFQ-1001')
    const gammaQuote = await getQuote(request, 'Gamma Trading')
    const { data } = await GET(`/sourcing/Quotes(${gammaQuote.ID})`)

    assert.equal(data.recommended, false)
    assert.equal(data.eligibilityReason, 'MOQ exceeds requested quantity')
  })

  it('calculates the same recommendation for a filtered quote list without returning supplier data', async () => {
    const request = await getRequest('RFQ-1001')
    const alphaQuote = await getQuote(request, 'Alpha Supplies')
    const { data } = await GET(`/sourcing/Quotes?$filter=request_ID eq ${request.ID}`)
    const recommended = data.value.find(quote => quote.recommended)

    assert.equal(recommended.ID, alphaQuote.ID)
    assert.equal(data.value.some(quote => quote.supplier), false)
  })

  it('adds calculated values to quotes expanded from a sourcing request', async () => {
    const request = await getRequest('RFQ-1001')
    const alphaQuote = await getQuote(request, 'Alpha Supplies')
    const { data } = await GET(`/sourcing/SourcingRequests(${request.ID})?$expand=quotes($expand=supplier)`)
    const recommended = data.quotes.find(quote => quote.recommended)

    assert.equal(recommended.ID, alphaQuote.ID)
    assert.equal(recommended.eligible, true)
    assert.equal(recommended.landedCost, 140950)
  })

  it('returns disjoint dashboard counts and a meaningful savings metric', async () => {
    const { data } = await GET('/sourcing/getDashboard()')

    const summary = { ...data }
    delete summary['@odata.context']
    assert.deepEqual(summary, {
      openRequestsWithRecommendation: 4,
      requestsWithoutEligibleQuote: 1,
      selectedRequests: 1,
      recommendedPipelineSpend: 199900,
      potentialSavings: 2050
    })
  })

  it('selects an eligible quote once and rejects a second selection', async () => {
    const request = await getRequest('RFQ-1005')
    const gammaQuote = await getQuote(request, 'Gamma Trading')
    const { data } = await POST('/sourcing/selectQuote', {
      requestId: request.ID,
      quoteId: gammaQuote.ID
    })
    assert.equal(data.recommended, true)

    await assert.rejects(
      POST('/sourcing/selectQuote', { requestId: request.ID, quoteId: gammaQuote.ID }),
      error => error.response?.status === 409
    )
  })

  it('selects a quote through the action bound to a quote row', async () => {
    const request = await getRequest('RFQ-1002')
    const quote = await getQuote(request, 'Alpha Supplies')
    const { data } = await POST(`/sourcing/Quotes(${quote.ID})/SourcingService.choose`, {})

    assert.equal(data.ID, quote.ID)
    assert.equal(data.eligible, true)
  })
})
