using SourcingService from '../../srv/sourcing-service';

annotate SourcingService.Quotes with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Supplier quote',
      TypeNamePlural: 'Supplier quotes',
      Title: { Value: supplier.name },
      Description: { Value: request.number }
    },
    SelectionFields: [
      validUntil,
      leadTimeDays,
      paymentTerms
    ],
    LineItem: [
      { Value: request.number, Label: 'Request' },
      { Value: supplier.name, Label: 'Supplier' },
      { Value: landedCost, Label: 'Landed cost (PLN)' },
      { Value: leadTimeDays, Label: 'Lead time (days)' },
      { Value: expectedDeliveryDate, Label: 'Expected delivery' },
      { Value: eligible, Label: 'Eligibility', Criticality: eligibilityCriticality },
      { Value: recommended, Label: 'Recommended' },
      { $Type: 'UI.DataFieldForAction', Action: 'SourcingService.choose', Label: 'Select quote' }
    ],
    Identification: [
      { $Type: 'UI.DataFieldForAction', Action: 'SourcingService.choose', Label: 'Select quote' }
    ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Quote details', Target: '@UI.FieldGroup#QuoteDetails' },
      { $Type: 'UI.ReferenceFacet', Label: 'Supplier performance', Target: '@UI.FieldGroup#SupplierPerformance' }
    ],
    FieldGroup #QuoteDetails: {
      Data: [
        { Value: request.number, Label: 'Request' },
        { Value: supplier.name, Label: 'Supplier' },
        { Value: unitPrice, Label: 'Unit price (PLN)' },
        { Value: shippingCost, Label: 'Shipping (PLN)' },
        { Value: landedCost, Label: 'Landed cost (PLN)' },
        { Value: paymentTerms, Label: 'Payment terms' },
        { Value: minimumOrderQuantity, Label: 'MOQ' },
        { Value: leadTimeDays, Label: 'Lead time (days)' },
        { Value: validUntil, Label: 'Valid until' },
        { Value: expectedDeliveryDate, Label: 'Expected delivery' },
        { Value: eligibilityReason, Label: 'Eligibility reason' }
      ]
    },
    FieldGroup #SupplierPerformance: {
      Data: [
        { Value: supplier.country, Label: 'Country' },
        { Value: supplier.onTimeDeliveryRate, Label: 'On-time delivery rate (%)' },
        { Value: supplier.qualityScore, Label: 'Quality score' }
      ]
    }
  }
);
