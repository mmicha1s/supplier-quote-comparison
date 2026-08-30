namespace sourcing;

using { cuid, managed } from '@sap/cds/common';

entity Suppliers : cuid, managed {
  name               : String(100) not null;
  country            : String(2);
  onTimeDeliveryRate : Decimal(5,2);
  qualityScore       : Decimal(2,1);
  active             : Boolean default true;
}

entity SourcingRequests : cuid, managed {
  number               : String(20) not null;
  product              : String(100) not null;
  requestedQuantity    : Integer not null;
  requiredDeliveryDate : Date not null;
  status               : String(20) default 'Open';
  quotes               : Association to many Quotes on quotes.request = $self;
  selectedQuote        : Association to Quotes;
}

entity Quotes : cuid, managed {
  request              : Association to SourcingRequests not null;
  supplier             : Association to Suppliers not null;
  unitPrice            : Decimal(15,2) not null;
  shippingCost         : Decimal(15,2) default 0;
  paymentTerms         : String(40);
  minimumOrderQuantity : Integer not null;
  leadTimeDays         : Integer not null;
  validUntil           : Date not null;
}
