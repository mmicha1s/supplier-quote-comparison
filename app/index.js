sap.ui.define(["sap/ui/core/Component", "sap/ui/core/ComponentContainer"], async function (Component, ComponentContainer) {
  "use strict";

  var oComponent = await Component.create({
    name: "sourcing",
    id: "sourcing"
  });

  new ComponentContainer({
    component: oComponent
  }).placeAt("content");
});
