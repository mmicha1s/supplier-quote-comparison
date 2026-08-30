sap.ui.define(["sap/ui/core/mvc/Controller", "../model/formatter"], function (Controller, formatter) {
  "use strict";
  return Controller.extend("sourcing.controller.Dashboard", {
    formatter: formatter,
    onShowRequests: function () {
      this.getOwnerComponent().getRouter().navTo("requests");
    },
    onRefresh: function () {
      this.getOwnerComponent().refreshRequests();
    },
    onRequestPress: function (oEvent) {
      var sId = oEvent.getSource().getBindingContext("view").getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("requestDetail", { requestId: encodeURIComponent(sId) });
    }
  });
});
