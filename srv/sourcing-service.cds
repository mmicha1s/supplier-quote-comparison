using { sourcing as db } from '../db/schema';

@path: '/sourcing'
service SourcingService {
  @readonly
  entity Suppliers as projection on db.Suppliers;

  @readonly
  entity SourcingRequests as projection on db.SourcingRequests;

  @readonly
  entity Quotes as projection on db.Quotes {
    *,
    virtual materialCost       : Decimal(15, 2),
    virtual landedCost         : Decimal(15, 2),
    virtual expectedDeliveryDate : Date,
    virtual eligible           : Boolean,
    virtual eligibilityReason  : String,
    virtual recommended        : Boolean
  };

  function getDashboard() returns DashboardSummary;
  action selectQuote(requestId : UUID, quoteId : UUID) returns Quotes;
}

type DashboardSummary {
  openRequestsWithRecommendation : Integer;
  requestsWithoutEligibleQuote : Integer;
  selectedRequests          : Integer;
  recommendedPipelineSpend  : Decimal(15, 2);
  potentialSavings          : Decimal(15, 2);
}
