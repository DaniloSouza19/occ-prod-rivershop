define(

  ['knockout', 'CCi18n', "pubsub", "navigation", 'ccLogger', 'viewModels/shopperContext', 'spinner', 'notifier'],

  function (ko, CCi18n, pubsub, navigation, CCLogger, ShopperContext, spinner, notifier) {

    "use strict";

    return {

      resourcesLoaded: function (widget) {
      },

      onLoad: function (widget) {


        $.Topic(pubsub.topicNames.ORDER_SUBMISSION_FAIL).subscribe(function (data) {
          if (data && data.data && data.data.errors && data.data.errors.length > 0) {
            var errors = data.data.errors;
            var html = $(".cc-notification-message").html();
            errors.forEach(function (error) {
              if (error.hasOwnProperty('message')) {
                html += '<br/>' + error.message;
              }
            })
            $(".cc-notification-message").html(html);
          }
        })

        // REDIRECT TO LOGIN
        //Funcionando apenas em CCSTORE
        if (window.location.host.substr(0, 7) != "ccadmin") {

          $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(function (data) {
            // Se usuário não estiver logado, redireciona pro /login
            if (!widget.user().loggedIn()) {

              var url = '/login';
              navigation.goTo(url);
            }
            //Se usuário estiver logado, valida o campo perfilBloqueado_c
            else if (widget.user().loggedIn()) {

              var prop = widget.user().dynamicProperties();
              var str = window.location.href;
              $.each(prop, function (name, value) {
                if (value.id() == "perfilBloqueado_c") {

                  if (value.value() == true) {

                    var url = '/login-bloqueado';
                    navigation.goTo(url);

                  }
                }
              });
            }
          });

          // $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(function () {
          //   var url = '/login';
          //   navigation.goTo(url);
          // })
        }

        if (sessionStorage.getItem("formasPagamento_c") == null) {
          sessionStorage.setItem("formasPagamento_c", "331");
        }

        // Assign Catalogs and Price Groups to Shoppers

        widget.shopperContextViewModel = ko.observable();
        widget.shopperContextViewModel(ShopperContext.getInstance());
        widget.shopperContextViewModel().
          getOrderDynamicPropertiesWithDefaultValues();
        $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function () {
          widget.shopperContextViewModel().populatePLGandCatalogData();
        });


        var inLoop = true;
        // EXTERNAL PRICING
        var EXTERNAL_SYSTEM_SERVICE_URL = "/ccstorex/custom/v1/external_pricing_pre_pricing";
        // var EXTERNAL_SYSTEM_SERVICE_URL = "https://commerce.riovermelho.net/api/integra/v1/externalprice"

        // CCLogger.info("Loading external pricing widget");

        var callbackMap = new Object();
        var performPrepricing = function () {
          // console.log("prepricing", 0, spinner);
          // console.log("inLoop", inLoop);

          if (widget.cart().items().length > 0) {

            if (inLoop) {
              inLoop = false;
              var config = {
                parent: '.cart_items',
                posTop: '50%',
                posLeft: '50%'
              };

              spinner.create(config);

              if (sessionStorage.getItem("formasPagamento_c") != null) {

                // console.log("prepricing", 1);

                var dynPropd = widget.user().dynamicProperties();
                var CNPJ_c = "";
                // var formasPagamento_c = "";
                $.each(dynPropd, function (index, value) {
                  if (value.id() == "CNPJ_c") {

                    CNPJ_c = value.value();
                  }
                  // if (value.id() == "formasPagamento_c") {
                  //   formasPagamento_c = value.value();
                  // }
                });

                var request = {
                  "profile": {
                    "id": widget.user().id(),
                    "CNPJ_c": CNPJ_c
                  },
                  "shoppingCart": {
                    "items": JSON.parse(ko.toJSON(widget.cart().items()))
                  },
                  "order": {
                    "dynamicProperties": [
                      {
                        "id": "formasPagamento_c",
                        "label": "Metodo de pagamento",
                        "value": sessionStorage.getItem("formasPagamento_c")
                      }
                    ]
                  }
                };


                var xmlHttp = new XMLHttpRequest();
                xmlHttp.onreadystatechange = function () {
                  if (xmlHttp.readyState == 4) {
                    if (xmlHttp.status == 200) {
                      var data = JSON.parse(xmlHttp.response);
                      if (data.items && data.items.length > 0) {
                        for (var i = 0; i < widget.cart().items().length; i++) {
                          for (var j = 0; j < data.items.length; j++) {
                            if (widget.cart().items()[i].productId ==
                              data.items[j].productId &&
                              widget.cart().items()[i].catRefId ==
                              data.items[j].catRefId &&
                              data.items[i].externalPrice &&
                              data.items[j].externalPriceQuantity) {
                              widget.cart().items()[i].externalPrice
                                (data.items[j].externalPrice);
                              widget.cart().items()[i].externalPriceQuantity
                                (data.items[j].externalPriceQuantity);
                            }
                          }
                        }
                        // invoke pricing in this success callback
                        widget.cart().markDirty();
                      }
                      spinner.destroy(1);
                    } else if (xmlHttp.status == 500 || xmlHttp.status == 400 || xmlHttp.status == 0) {
                      spinner.destroy(1);
                      notifier.sendError(this.WIDGET_ID, "Forma de pagamento indisponível no momento. Pagamento somente no cartão de crédito.");
                      sessionStorage.setItem("formasPagamento_c", 331);
                      $("#paymentMethod").val(331)
                    }
                  }
                }
                var url = EXTERNAL_SYSTEM_SERVICE_URL;
                xmlHttp.open('POST', url, true); // true for asynchronous 
                // xmlHttp.setRequestHeader('Authorization', 'Basic ' + 'Y2hyaXN0aWFuLmNhc3RpbGxvQGlubG9kLmNvbTpGYXJtYWNvczIwMjA=');
                xmlHttp.setRequestHeader('Access-Control-Allow-Origin', url);
                xmlHttp.setRequestHeader("Content-Type", "application/json");
                xmlHttp.send(JSON.stringify(request));



              }



            } else {
              inLoop = true;
            }

          };

        };
        callbackMap['prepricing'] = performPrepricing;
        widget.cart().setCallbackFunctions(callbackMap);

      },

      beforeAppear: function (page) {
      }
    }
  }
);
