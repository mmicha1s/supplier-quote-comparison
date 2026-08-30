sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageBox", "sap/m/MessageToast", "../model/formatter"], function (Controller, MessageBox, MessageToast, formatter) {
  "use strict";
  return Controller.extend("sourcing.controller.RequestDetail", {
    formatter: formatter,
    onInit: function () {
      this.getOwnerComponent().getRouter().getRoute("requestDetail").attachPatternMatched(this._onMatched, this);
    },
    _onMatched: async function (oEvent) {
      var sId = decodeURIComponent(oEvent.getParameter("arguments").requestId);
      await this.getOwnerComponent().getRequestsReady();
      var oModel = this.getOwnerComponent().getModel("view");
      var aRequests = oModel.getProperty("/requests") || [];
      var iIndex = aRequests.findIndex(function (oRequest) { return oRequest.ID === sId; });
      this.getView().setBindingContext(iIndex > -1 ? oModel.createBindingContext("/requests/" + iIndex) : null, "view");
    },
    onBack: function () {
      this.getOwnerComponent().getRouter().navTo("requests");
    },
    onSelectQuote: function (oEvent) {
      var oQuote = oEvent.getSource().getBindingContext("view").getObject();
      var oRequest = this.getView().getBindingContext("view").getObject();
      var oComponent = this.getOwnerComponent();

      MessageBox.confirm(
        "Select " + oQuote.supplierName + " for " + oQuote.landedCost.toLocaleString("pl-PL") + " zł?",
        {
          title: "Confirm quote selection",
          actions: [MessageBox.Action.CANCEL, MessageBox.Action.OK],
          onClose: async function (sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            try {
              var oResponse = await fetch("/sourcing/selectQuote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: oRequest.ID, quoteId: oQuote.ID })
              });
              if (!oResponse.ok) {
                var oPayload = await oResponse.json();
                throw new Error(oPayload?.error?.message || "The quote could not be selected");
              }
              MessageToast.show("Quote selected");
              await oComponent.refreshRequests();
              oComponent.getRouter().navTo("requests");
            } catch (oError) {
              MessageBox.error(oError.message);
            }
          }
        }
      );
    }
  });
});
