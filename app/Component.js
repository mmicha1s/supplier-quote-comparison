sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  function prepareQuote(quote, isSelected) {
    return {
      ...quote,
      supplierName: quote.supplier?.name || "Supplier unavailable",
      minimumOrderQuantity: Number(quote.minimumOrderQuantity || 0),
      leadTimeDays: Number(quote.leadTimeDays || 0),
      estimatedDeliveryDate: quote.expectedDeliveryDate,
      shippingCost: Number(quote.shippingCost || 0),
      paymentTerms: quote.paymentTerms || "-",
      landedCost: Number(quote.landedCost || 0),
      supplierOnTimeDeliveryRate: Number(quote.supplier?.onTimeDeliveryRate || 0),
      supplierQualityScore: Number(quote.supplier?.qualityScore || 0),
      selectable: quote.eligible && !isSelected
    };
  }

  function getStatus(isSelected, hasEligibleQuote) {
    if (isSelected) return "Selected";
    if (hasEligibleQuote) return "Open";
    return "No eligible quote";
  }

  function prepareRequest(request) {
    var isSelected = request.status === "Selected" || Boolean(request.selectedQuote_ID);
    var quotes = (request.quotes || []).map(function (quote) {
      return prepareQuote(quote, isSelected);
    });
    var recommendedQuote = quotes.find(function (quote) {
      return quote.recommended;
    });
    var hasEligibleQuote = quotes.some(function (quote) {
      return quote.eligible;
    });

    return {
      ...request,
      requestNumber: request.number || request.ID,
      productName: request.product || "Product not specified",
      requestedQuantity: Number(request.requestedQuantity || 0),
      requiredDate: request.requiredDeliveryDate,
      status: getStatus(isSelected, hasEligibleQuote),
      quotes: quotes,
      quoteCount: quotes.length,
      recommendedSupplier: recommendedQuote?.supplierName || "No recommendation",
      recommendedLandedCost: Number(recommendedQuote?.landedCost || 0)
    };
  }

  function prepareSummary(summary) {
    return {
      openRequestsWithRecommendation: Number(summary.openRequestsWithRecommendation || 0),
      noEligibleQuotes: Number(summary.requestsWithoutEligibleQuote || 0),
      selectedRequests: Number(summary.selectedRequests || 0),
      recommendedPipelineSpend: Number(summary.recommendedPipelineSpend || 0),
      potentialSavings: Number(summary.potentialSavings || 0)
    };
  }

  return UIComponent.extend("sourcing.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      this.setModel(new JSONModel({
        requests: [],
        summary: prepareSummary({}),
        loading: true,
        error: ""
      }), "view");

      this.getRouter().initialize();
      this.refreshRequests();
    },

    getRequestsReady: function () {
      return this._requestsPromise || Promise.resolve();
    },

    refreshRequests: function () {
      this._requestsPromise = this.loadRequests();
      return this._requestsPromise;
    },

    loadRequests: async function () {
      var model = this.getModel("view");
      model.setProperty("/loading", true);
      model.setProperty("/error", "");

      try {
        var responses = await Promise.all([
          fetch("/sourcing/SourcingRequests?$expand=quotes($expand=supplier)"),
          fetch("/sourcing/getDashboard()")
        ]);
        var requestsResponse = responses[0];
        var dashboardResponse = responses[1];

        if (!requestsResponse.ok || !dashboardResponse.ok) {
          throw new Error("The sourcing service is not available yet");
        }

        var requestsData = await requestsResponse.json();
        var dashboardData = await dashboardResponse.json();
        var requests = (requestsData.value || []).map(prepareRequest);

        model.setProperty("/requests", requests);
        model.setProperty("/summary", prepareSummary(dashboardData.value || dashboardData));
        return requests;
      } catch {
        model.setProperty("/error", "No demo data could be loaded - start the CAP server and refresh the page");
      } finally {
        model.setProperty("/loading", false);
      }
    }
  });
});
