sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "../model/formatter"], function (Controller, Filter, FilterOperator, formatter) {
  "use strict";
  return Controller.extend("sourcing.controller.Requests", {
    formatter: formatter,
    _searchValue: "",
    _statusKey: "all",
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("dashboard");
    },
    onSearch: function (oEvent) {
      this._searchValue = oEvent.getParameter("newValue");
      this._applyFilters();
    },
    onStatusChange: function (oEvent) {
      this._statusKey = oEvent.getParameter("selectedItem").getKey();
      this._applyFilters();
    },
    _applyFilters: function () {
      var aFilters = [];
      if (this._searchValue) {
        aFilters.push(new Filter({ filters: [
          new Filter("requestNumber", FilterOperator.Contains, this._searchValue),
          new Filter("productName", FilterOperator.Contains, this._searchValue),
          new Filter("recommendedSupplier", FilterOperator.Contains, this._searchValue)
        ], and: false }));
      }
      if (this._statusKey !== "all") {
        aFilters.push(new Filter("status", FilterOperator.EQ, this._statusKey));
      }
      this.byId("requestsTable").getBinding("items").filter(aFilters);
    },
    onRequestPress: function (oEvent) {
      var sId = oEvent.getSource().getBindingContext("view").getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("requestDetail", { requestId: encodeURIComponent(sId) });
    }
  });
});
