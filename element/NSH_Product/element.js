define(["jquery", "knockout", "pubsub", "notifier", "ccRestClient", "ccConstants"], function ($, ko, pubsub, notifier, ccRestClient, CCConstants) {
  "use strict";

  return {
    elementName: "nsh_product",
    embalagensType: ko.observable({ UN: "unidade", CX: "colecao", PT: "colecao", GF: "unidade", DP: "unidade", FD: "colecao", LT: "unidade", CT: "unidade", CJ: "unidade", JG: "unidade", BD: "unidade", KG: "unidade", PC: "unidade", BA: "unidade", BL: "unidade", LA: "unidade", RZ: "unidade", SC: "unidade", PO: "unidade", CP: "unidade", BN: "unidade", DZ: "unidade", RL: "unidade", BB: "unidade", VD: "unidade", MI: "unidade" }),
    onLoad: function (widget) {
    },
    moreQuantity: function (instanceId, id) {
      if ($("#qtd_itens-" + instanceId + "-" + id).val() == "") {
        $("#qtd_itens-" + instanceId + "-" + id).val(0);
      }
      $("#qtd_itens-" + instanceId + "-" + id).val(parseInt($("#qtd_itens-" + instanceId + "-" + id).val()) + 1);
    },

    removeQuantity: function (instanceId, id) {
      if ($("#qtd_itens-" + instanceId + "-" + id).val() == "") {
        $("#qtd_itens-" + instanceId + "-" + id).val(1);
      }
      if ($("#qtd_itens-" + instanceId + "-" + id).val() > 1) {
        $("#qtd_itens-" + instanceId + "-" + id).val(parseInt($("#qtd_itens-" + instanceId + "-" + id).val()) - 1);
      }
    },

    // Sends a message to the cart to add this product
    handleAddToCart: function (instanceId, product) {




      var id = typeof product.id == "function" ? product.id() : product.id;


      var productIdContainer = { "products": id, "catalogId": "river_shop" };

      ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_AVAILABILITY, productIdContainer,
        function (data) {
         
          var stock = data[0].stockStatus;

          if ((data[0].productSkuInventoryStatus[id] > 0) && (stock == "IN_STOCK" || ((stock == "BACKORDERABLE" || stock == "PREORDERABLE") && widget.cart().isPreOrderBackOrderEnabled))) {

            var qtd = parseInt($("#qtd_itens-" + instanceId + "-" + id).val(), 10);

            if (!qtd || qtd <= 0) {
              notifier.sendError(this.WIDGET_ID, "Quantidade inválida.");
              $("#qtd_itens-" + instanceId + "-" + id).focus();
              return false;
            }

            var prd = product.hasOwnProperty('product') ? product.product : product;

            if (Array.isArray(prd["id"])) {
              $.each(prd, function (index, value) {
                if (Array.isArray(value) && index != "childSKUs") {
                  // console.log(1, value);
                  prd[index] = value[0];
                }
              })
              if (Array.isArray(prd["childSKUs"])) {
                prd["childSKUs"][0].repositoryId = prd["childSKUs"][0].repositoryId[0];
              }
            }



            var newProduct = $.extend(true, {}, prd);

            newProduct.orderQuantity = qtd;
            // console.log(5, newProduct);
            $.Topic(pubsub.topicNames.CART_ADD).publishWith(
              newProduct, [{ message: "success" }]);


          } else {
            notifier.sendError(null, "Produto fora de estoque.");
          }

        },
        function (error) { 
          // console.log(3, error) 
        }
      );
      return false;


    },

    showAddCart: function (id) {
      $("#bt_add-" + id).hide();
      $("#add_cart-" + id).fadeIn();
      $("#qtd_itens-" + id).val(1).focus();
    }
  };
});
