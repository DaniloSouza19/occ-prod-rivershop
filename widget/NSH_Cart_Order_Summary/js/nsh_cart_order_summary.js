/**
 * @fileoverview Order Summary Widget. 
 * Calculates Shipping Cost and Order Total, given selected Shipping 
 * Option.
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'notifier', 'CCi18n', 'ccConstants', 'ccLogger', 'spinner', 'ccRestClient', 'viewModels/paymentsViewModel'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, notifier, CCi18n, CCConstants, logger, spinner, CCRestClient, paymentsViewModel) {

    "use strict";

    return {

      paymentMethodList: ko.observableArray([{nome: "331", descricao: "CARTÃO DE CRÉDITO"}]),


      paymentsContainer: ko.observable(paymentsViewModel.getInstance()),
      includeShipping: ko.observable(false),
      includeTax: ko.observable(false),
      hasShippingInfo: ko.observable(false),
      hasTaxInfo: ko.observable(false),
      shippingOptions: ko.observableArray(),
      selectedShippingOption: ko.observable(),
      pricingAvailable: ko.observable(false),
      persistedLocaleName: ko.observable(),
      paypalImageSrc: ko.observable("https://fpdbs.paypal.com/dynamicimageweb?cmd=_dynamic-image"),
      desconconto: ko.observable(false),

      // Stuff used by the spinner
      pricingIndicator: '#CC-orderSummaryLoadingModal',
      DEFAULT_LOADING_TEXT: "Loading...'",
      pricingIndicatorOptions: {
        parent: '#CC-orderSummaryLoadingModal',
        posTop: '10%',
        posLeft: '30%'
      },

      /**
       * Called when resources have been loaded
       */
      resourcesLoaded: function (widget) {

        // Create observable to mark the resources loaded, if it's not already there
        if (typeof widget.orderSummaryResourcesLoaded == 'undefined') {
          widget.orderSummaryResourcesLoaded = ko.observable(false);
        }

        // Notify the computeds relying on resources
        widget.orderSummaryResourcesLoaded(true);
      },

      /**
       * validate the cart items stock status as per the quantity. base on the 
       * stock status of cart items redirect to checkout or cart
       */
      handleValidateCart: function (data, event) {
        var widget = this;
        if (data.cart().items().length > 0) {
          data.cart().validatePrice = true;
          data.cart().skipPriceChange(true);
          $.Topic(pubsub.topicNames.LOAD_CHECKOUT).publishWith(data.cart(), [{ message: "success" }]);
          return false;
        }
        return true;
      },

      changedPaymentMethodList: function () {
        var widget = this;
        var formasPagamento_c = $("#paymentMethod").val();
        // var EXTERNAL_SYSTEM_SERVICE_URL = "/ccstorex/custom/v1/external_pricing_pre_pricing";

        //Cria session
        sessionStorage.setItem("formasPagamento_c", formasPagamento_c);
        
        widget.cart().markDirty();

        // console.log(1);
        
        

        // var dynPropd = widget.user().dynamicProperties();
        // var CNPJ_c = "";
        // // var formasPagamento_c = "";
        // $.each(dynPropd, function (index, value) {
        //   if (value.id() == "CNPJ_c") {

        //     CNPJ_c = value.value();
        //   }
        //   // if (value.id() == "formasPagamento_c") {
        //   //   formasPagamento_c = value.value();
        //   // }
        // });

        // var request = {
        //   "profile": {
        //     "id": widget.user().id(),
        //     "CNPJ_c": CNPJ_c
        //   },
        //   "shoppingCart": {
        //     "items": JSON.parse(ko.toJSON(widget.cart().items()))
        //   },
        //   "order": {
        //     "dynamicProperties": [
        //       {
        //         "id": "formasPagamento_c",
        //         "label": "Metodo de pagamento",
        //         "value": formasPagamento_c
        //       }
        //     ]
        //   }
        // };

        // console.log(request);
        // console.log(1,sessionStorage.getItem("formasPagamento_c"));

        // $.ajax({
        //   type: 'POST',
        //   url: EXTERNAL_SYSTEM_SERVICE_URL,
        //   data: { "request": request },
        //   success: function (data) {
        //     console.log(1, data)
        //     widget.destroySpinner();
        //     // update the cart items with external price details,
        //     // assuming data has item details with external prices
        //     if (data.items && data.items.length > 0) {
        //       // console.log(2, data.items)
        //       for (var i = 0; i < widget.cart().items().length; i++) {
        //         for (var j = 0; j < data.items.length; j++) {
        //           // console.log(3, widget.cart().items()[i].productId)
        //           if (widget.cart().items()[i].productId ==
        //             data.items[j].productId &&
        //             widget.cart().items()[i].catRefId ==
        //             data.items[j].catRefId &&
        //             data.items[i].externalPrice &&
        //             data.items[j].externalPriceQuantity) {
        //             widget.cart().items()[i].externalPrice
        //               (data.items[j].externalPrice);
        //             widget.cart().items()[i].externalPriceQuantity
        //               (data.items[j].externalPriceQuantity);
        //           }
        //         }
        //       }
        //       // invoke pricing in this success callback
        //       widget.cart().markDirty();
        //     }
        //   },

        //   error: function (err) {
        //     // console.log("ERROR AJAX", err);
        //     //Setar forma_pagamento A Vista
        //     widget.destroySpinner();
        //     notifier.sendError(this.WIDGET_ID, "Forma de pagamento indisponível no momento. Pagamento somente a vista.");
        //     sessionStorage.setItem("formasPagamento_c", 1);
        //     $("#paymentMethod").val(1)
        //     //Criar códogo: alterar valor do select

        //   }
        // });
      },


              /**
         * Sets up shipping and sales tax observable fields.
         */
        setupShippingAndTax : function (isPricingComplete) {
          var widget = this;
          // If no items in cart, don's show shipping and sales tax costs
          if (widget.cart().items().length <= 0) {
            widget.includeShipping(false);
            widget.hasShippingInfo(false);
            widget.includeTax(false);
            widget.hasTaxInfo(false);
          }
          // No shipping and tax amount available if shipping method has not been selected
          else if (widget.selectedShippingOption() == undefined) {
            widget.includeShipping(true);
            widget.hasShippingInfo(false);
            widget.includeTax(true);
            widget.hasTaxInfo(false);
            //In case of split shipping where tax and shipping are calculated even though shipping option is not selected
            if (widget.cart().tax() > 0 || (widget.cart().showSecondaryTaxData() && widget.cart().secondaryCurrencyTaxAmount() && widget.cart().secondaryCurrencyTaxAmount() > 0)) {
              widget.hasTaxInfo(true);
            }
            if (widget.cart().shipping() > 0) {
              widget.hasShippingInfo(true);
            }
          }
          // Work out shipping and tax amounts
          else {
            widget.includeShipping(true);
            widget.hasShippingInfo(isPricingComplete);
            widget.includeTax(true);
            widget.hasTaxInfo(isPricingComplete);

          }
        },
      /**
       * Called when widget first loaded
       */
      onLoad: function (widget) {
       
          $("#paymentMethod").val(sessionStorage.getItem("formasPagamento_c"));
        
        
        widget.desconconto(true);

        // var formasPagamento_c = {
        //   formasPagamento_c: {
        //     itens: [
        //       {
        //         nome: "a_vista",
        //         descricao: "A vista"
        //       },
        //       {
        //         nome: "boleto",
        //         descricao: "Boleto Bancário"
        //       }
        //     ]
        //   }
        // }

        // console.log(widget.user())

        var dynPropd = widget.user().dynamicProperties();
        var formasPagamento_c = "";
        $.each(dynPropd, function (index, value) {
          if (value.id() == "formasPagamento_c") {
            formasPagamento_c = JSON.parse(value.value());
          }
        });

        //Seta forma de pagamento cartão como primeira opção sempre
        if (formasPagamento_c) {
          widget.paymentMethodList(formasPagamento_c);

            for (var i = 0; i < widget.paymentMethodList().length; i++)
            {
              if (widget.paymentMethodList()[i].nome == "331"){
               widget.paymentMethodList().unshift(widget.paymentMethodList()[i]);
               widget.paymentMethodList().splice(i+1,1); 
               return;
              }
            
            }
        }

        // Create observable to mark the resources loaded, if it's not already there
        if (typeof widget.orderSummaryResourcesLoaded == 'undefined') {
          widget.orderSummaryResourcesLoaded = ko.observable(false);
        }

        // Generate the shipping label so that includes the name of the selected shipping option
        widget.shippingLabel = ko.computed(function () {
          if (widget.orderSummaryResourcesLoaded()) {
            if (widget.hasShippingInfo() &&
              widget.selectedShippingOption() != undefined &&
              widget.selectedShippingOption().name != undefined) {
              return widget.translate('shippingText', {
                displayName: widget.selectedShippingOption().displayName
              });
            }
            else {
              return widget.translate('shippingText', {
                displayName: ''
              });
            }
          }
          else {
            return '';
          }
        }, widget);

        // These are not configuration options
        widget.selectedShippingOption.isData = true;

        // Initialise options for showing shipping and tax information
        widget.includeShipping(false);
        widget.hasShippingInfo(false);
        widget.includeTax(false);
        widget.hasTaxInfo(false);



        /**
         * Resets the shipping and sales tax observable fields.
         */
        widget.resetShippingAndTax = function (obj) {
          widget.selectedShippingOption(null);
          if (widget.cart().items().length > 0) {
            widget.includeShipping(true);
            widget.includeTax(true);
          }
          else {
            widget.includeShipping(false);
            widget.includeTax(false);
          }
          widget.hasShippingInfo(false);
          widget.hasTaxInfo(false);
        };

        /**
         * Handles paypal checkout
         */
        widget.handlePaypalWebCheckout = function () {
          if (widget.order().isSplitPayment()) {
            widget.paymentsContainer().pendingPayments().unshift(widget.paymentsContainer().createPaymentGroup(CCConstants.PAYPAL_PAYMENT_TYPE));
          }
          widget.order().handleCheckoutWithPaypal();
        }

        /**
         * Handle  cart pricing success/failure events
         */
        $.Topic(pubsub.topicNames.ORDER_PRICING_SUCCESS).subscribe(function (obj) {
          widget.pricingAvailable(true);
          widget.destroySpinner();
          widget.setupShippingAndTax(true);
        });

        $.Topic(pubsub.topicNames.CART_PRICE_SUCCESS).subscribe(function (obj) {
          widget.pricingAvailable(true);
          widget.setupShippingAndTax(true);
        });

        $.Topic(pubsub.topicNames.ORDER_PRICING_FAILED).subscribe(function (obj) {
          widget.pricingAvailable(false);
          widget.destroySpinner();
          if (this && this.errorCode == CCConstants.INVALID_SHIPPING_METHOD) {
            widget.hasShippingInfo(false);
            widget.hasTaxInfo(false);
          }
          else if (this && this.errorCode == CCConstants.PRICING_TAX_REQUEST_ERROR) {
            widget.hasShippingInfo(false);
            widget.hasTaxInfo(false);
          }
          else {
            widget.resetShippingAndTax();
          }
        });

        // Handle shipping method load success/failure events
        $.Topic(pubsub.topicNames.SHIPPING_METHODS_LOADED).subscribe(function (obj) {
          // Handle case where no shipping methods have been loaded
          if (widget.shippingmethods().shippingOptions().length === 0) {
            widget.resetShippingAndTax();
          }
          else {
            // TODO - According to Nev this will cause issues with the observable model 
            // as we're assigning a new array to the observable array.
            // May have to iterate through widget.shippingmethods().shippingOptions() 
            // and push these onto widget.shippingOptions.
            // However if we make our own copies then this complicates pricing updates
            // as our copy won't have the updated pricing
            widget.shippingOptions(widget.shippingmethods().shippingOptions());

            // Make sure that if we have a currently selected option then re-price using that option
            if (widget.selectedShippingOption() != undefined &&
              widget.selectedShippingOption() != '') {
              var foundShippingOption = false;
              for (var i = 0; i < widget.shippingOptions().length; i++) {
                if (widget.selectedShippingOption().repositoryId === widget.shippingOptions()[i].repositoryId) {
                  widget.selectedShippingOption(widget.shippingOptions()[i]);
                  foundShippingOption = true;
                  break;
                }
              }
              if (!foundShippingOption && widget.cart().shippingMethod()) {
                widget.selectedShippingOption(null);
              }
            }

            // Refresh shipping and tax observables
            widget.setupShippingAndTax(widget.pricingAvailable());
          }
        });

        $.Topic(pubsub.topicNames.LOAD_SHIPPING_METHODS_FAILED).subscribe(function (obj) {
          widget.shippingOptions.removeAll();
          widget.resetShippingAndTax();
        });

        $.Topic(pubsub.topicNames.NO_SHIPPING_METHODS).subscribe(function (obj) {
          widget.shippingOptions.removeAll();
          widget.resetShippingAndTax();
        });


        // Handle case of re-pricing for a selected shipping option.
        $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_METHOD).subscribe(function (obj) {
          // Create spinner for re-pricing
          if (widget.cart() != undefined
            && widget.cart().items() != undefined
            && widget.cart().items().length > 0) {

            if (this && this.repositoryId && widget.cart().shippingMethod()) {
              widget.createSpinner();
            }

            // The selected shipping option must be in our list of shipping options
            if (this && this.repositoryId && widget.shippingOptions() != undefined) {
              var foundOption = false;
              for (var i = 0; i < widget.shippingOptions().length; i++) {
                if (this.repositoryId === widget.shippingOptions()[i].repositoryId) {
                  widget.selectedShippingOption(widget.shippingOptions()[i]);
                  foundOption = true;
                  break;
                }
              }

              if (!foundOption || !widget.cart().shippingMethod()) {
                widget.destroySpinner();
                widget.selectedShippingOption(null);
              }
            }
            // Refresh display options
            widget.setupShippingAndTax(widget.pricingAvailable());
          }
        });

        // Handle case when shipping method is reset
        $.Topic(pubsub.topicNames.CHECKOUT_RESET_SHIPPING_METHOD).subscribe(function (obj) {
          widget.selectedShippingOption(null);
          widget.setupShippingAndTax(false);
        });

        // Reset shipping and tax if shipping address is invalid
        $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_INVALID).subscribe(function (obj) {
          widget.shippingOptions.removeAll();
          widget.resetShippingAndTax();
        });

        $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY).subscribe(function (obj) {
          if (widget.selectedShippingOption()) {
            widget.createSpinner();
          }
        });

        // Subscribe to changes in the total cost
        widget.cart().amount.subscribe(function (newValue) {
          // Refresh shipping, tax and total costs
          widget.setupShippingAndTax(false);
        });

        // Functions to create and destroy the spinner
        widget.destroySpinner = function () {
          $(widget.pricingIndicator).removeClass('loadingIndicator');
          spinner.destroyWithoutDelay($(widget.pricingIndicator));
        };
        widget.createSpinner = function () {
          $(widget.pricingIndicator).css('position', 'relative');
          widget.pricingIndicatorOptions.loadingText = widget.translate('rePricingText', { defaultValue: this.DEFAULT_LOADING_TEXT });
          spinner.create(widget.pricingIndicatorOptions);
        };

        // Set up initial shipping and tax observables
        widget.setupShippingAndTax(false);
        widget.destroySpinner();

        widget.persistedLocaleName(JSON.parse(CCRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE)));
        // If locale name is present in local storage, append it to the paypal image url
        if (widget.persistedLocaleName() && widget.persistedLocaleName()[0]) {
          widget.paypalImageSrc(widget.paypalImageSrc() + "&locale=" + widget.persistedLocaleName()[0].name);
        }
      }, // end of onLoad

      /**
       * Called each time the page appears
       */
      beforeAppear: function (page) {
        var widget = this;
        // console.log( 1, sessionStorage.getItem("formasPagamento_c"));
     
        setTimeout(function () {
          $("#paymentMethod").val(sessionStorage.getItem("formasPagamento_c"));
          if (sessionStorage.getItem("formasPagamento_c") == "null" || !sessionStorage.getItem("formasPagamento_c")){
            // console.log("forma pagamento fora do cache ou não existe");
            sessionStorage.setItem("formasPagamento_c", "331")
            $("#paymentMethod").val(sessionStorage.getItem("formasPagamento_c"));
          }
        }, 500);
        
        // Work out available and selected shipping options
        widget.shippingOptions(widget.shippingmethods().shippingOptions());
        var pricingAvailable = false;
        if (widget.cart().shippingMethod() != undefined && widget.cart().shippingMethod() != '') {
          for (var i = 0; i < widget.shippingOptions().length; i++) {
            if (widget.cart().shippingMethod() === widget.shippingOptions()[i].repositoryId) {
              widget.selectedShippingOption(widget.shippingOptions()[i]);
              // Ensure we have  pricing
              if (widget.cart().shipping() > 0)
                pricingAvailable = true;

              break;
            }
          }
        }


        // Set up observables for this widget
        widget.setupShippingAndTax(pricingAvailable);
      }
    }
  }
);
