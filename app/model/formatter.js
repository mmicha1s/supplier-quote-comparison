sap.ui.define([], function () {
  "use strict";

  return {
    money: function (vValue) {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
        minimumFractionDigits: 2
      }).format(Number(vValue || 0));
    },
    date: function (sDate) {
      return sDate || "-";
    },
    percentage: function (vValue) {
      return Number(vValue || 0).toFixed(1) + "%";
    },
    quality: function (vValue) {
      return Number(vValue || 0).toFixed(1) + " / 5";
    },
    statusState: function (sStatus) {
      if (sStatus === "Selected") return "Success";
      if (sStatus === "No eligible quote") return "Error";
      return "Information";
    },
    eligibleState: function (bEligible) {
      return bEligible ? "Success" : "Error";
    },
    eligibilityText: function (bEligible, sReason) {
      if (bEligible) return "Eligible";
      return sReason || "Not eligible";
    }
  };
});
