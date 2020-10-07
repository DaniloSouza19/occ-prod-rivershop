/**
 * @fileoverview Order Confirmation Widget. 
 * Displays a confirmation of the order placed by the user.
 * @author 
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'CCi18n', 'pubsub', 'notifier', 'ccConstants', 'spinner', 'ccRestClient', 'pageLayout/site'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, CCi18n, PubSub, notifier, CCConstants, spinner, ccRestClient, SiteViewModel) {

    "use strict";

    return {
      WIDGET_ID: "nsh_order_confirmation",
      isPending: ko.observable(false),
      isPendingApproval: ko.observable(false),
      needsPayment: ko.observable(true),
      boletoUrl: ko.observable(),
      paymentForm: ko.observable(),
      boletoNumber: ko.observable(),
      formaPagamento: ko.observable(),
      pendingApprovalStates: [CCConstants.PENDING_APPROVAL, CCConstants.PENDING_APPROVAL_TEMPLATE],

      addContainer: function (elemento) {
        $(elemento).parent().parent().parent().addClass("container");
        $('#page').addClass("bgIntern");
      },


      getBoletoInfos: function (widget) {
        var boletoInfos = {};
        Object.keys(widget.confirmation().payments[0].customPaymentProperties).forEach(function (item) {
          var splitted = item.split(/=(.+)/);
          boletoInfos[splitted[0]] = splitted[1];
        });

        return boletoInfos;
      },



      resourcesLoaded: function (widget) {
        // Create observable to mark the resources loaded, if it's not already there
        if (typeof widget.checkoutResourcesLoaded == 'undefined') {
          widget.checkoutResourcesLoaded = ko.observable(false);
        }
        // Notify the computeds relying on resources
        widget.checkoutResourcesLoaded(true);
      },

      /**
       * Function to toggle the expanded flag for a configurable child item.
       */
      toggleExpandedFlag: function (element, data) {
        if (data.expanded()) {
          data.expanded(false);
        } else {
          data.expanded(true);
        }
      },

      onLoad: function (widget) {
        if (widget.confirmation()) {
          var items = [];
          if (widget.confirmation().shoppingCart) {
            items.push.apply(items, widget.confirmation().shoppingCart.items);
          }
          if (widget.confirmation().shippingGroups && widget.confirmation().shippingGroups.length > 0) {
            for (var i = 0; i < widget.confirmation().shippingGroups.length; i++) {
              items.push.apply(items, widget.confirmation().shippingGroups[i].items);
            }
          }
          var createExpandFlag = function (item) {
            for (var j = 0; j < item.childItems.length; j++) {
              if (item.childItems[j].expanded == undefined) {
                item.childItems[j].expanded = ko.observable(false);
              }
              if (item.childItems[j].childItems && item.childItems[j].childItems.length > 0) {
                createExpandFlag(item.childItems[j]);
              }
            }
          };
          for (var i = 0; items && i < items.length; i++) {
            var item = items[i];
            if (item.childItems && item.childItems.length > 0) {
              createExpandFlag(item);
            }
          }

          // Create observable to mark the resources loaded, if it's not already there
          if (typeof widget.checkoutResourcesLoaded == 'undefined') {
            widget.checkoutResourcesLoaded = ko.observable(false);
          }

          // i18n strings required for table summary attributes
          widget.yourOrderText = ko.computed(function () {
            if (widget.checkoutResourcesLoaded()) {
              var messageText = CCi18n.t(
                'ns.nsh_order_confirmation:resources.yourOrderText', {}
              );
              return messageText;
            }
            else {
              return '';
            }

          }, widget);

          widget.shipToText = ko.computed(function () {
            if (widget.checkoutResourcesLoaded()) {
              var messageText = CCi18n.t(
                'ns.nsh_order_confirmation:resources.shipToText', {}
              );
              return messageText;
            }
            else {
              return '';
            }

          }, widget);

          widget.shippingMethodText = ko.computed(function () {
            if (widget.checkoutResourcesLoaded()) {
              var messageText = CCi18n.t(
                'ns.nsh_order_confirmation:resources.shippingMethodText', {}
              );
              return messageText;
            }
            else {
              return '';
            }

          }, widget);

          widget.secondaryCurrency = ko.observable(null);

          widget.showSecondaryShippingData = ko.pureComputed(function () {
            return widget.confirmation().payShippingInSecondaryCurrency &&
              (null != widget.secondaryCurrency());
          });

          // Parameterized i18n strings
          widget.orderDate = ko.computed(function () {
            var submissionDate = widget.confirmation().submittedDate ? widget.confirmation().submittedDate : widget.confirmation().creationDate;
            var orderDateString = widget.ccDate(submissionDate, null, null, CCConstants.MEDIUM);
            return orderDateString;

          }, widget);

          widget.orderTime = ko.computed(function () {
            var submissionDate = widget.confirmation().submittedDate ? widget.confirmation().submittedDate : widget.confirmation().creationDate;
            var orderTimeString = widget.ccDate(submissionDate, null, null, CCConstants.TIME);
            return orderTimeString;

          }, widget);

          widget.thankyouMsg = ko.computed(function () {
            if (widget.checkoutResourcesLoaded()) {
              var linkText = CCi18n.t(
                'ns.nsh_order_confirmation:resources.thankyouMsg',
                {
                  orderDate: widget.orderDate(),
                  orderTime: widget.orderTime()
                }
              );
              return linkText;
            }
            else {
              return '';
            }

          }, widget);


          widget.orderNumberMsg = ko.computed(function () {
            if (widget.checkoutResourcesLoaded()) {
              var linkText = CCi18n.t(
                'ns.nsh_order_confirmation:resources.orderNumberMsg',
                {
                  orderNumber: widget.confirmation().id
                }
              );
              return linkText;
            }
            else {
              return '';
            }

          }, widget);
        }
        spinner.destroy(0);



      },

      beforeAppear: function (page) {
        var widget = this

        if (sessionStorage.getItem("formasPagamento_c") == "331") {
          widget.formaPagamento("credit_card");
        }
        else if (sessionStorage.getItem("formasPagamento_c") == "500") {
          widget.formaPagamento("boleto");
        }
        else {
          widget.formaPagamento("outro");
        }

        if (widget.formaPagamento() == "boleto") {
          var boletoInfos = widget.getBoletoInfos(widget);
          widget.boletoUrl(boletoInfos.boleto_url);
          widget.boletoNumber(boletoInfos.boleto_line);
        }

        spinner.destroy();

        //Vai pegar a informação referente a forma de pagamento se não for a vista
        var userDynamic = widget.user().dynamicProperties();
        $.each(userDynamic, function (index, value) {
          if (value.id() == "formasPagamento_c") {
            var user = JSON.parse(value.value());
            if (user && user.length > 0) {
              $.each(user, function (index, value) {
                if (value.nome == sessionStorage.getItem("formasPagamento_c")) {
                  widget.paymentForm(value.descricao);
                }
              });
            }
          }
        });

        var items = [];
        if (widget.confirmation && widget.confirmation() && widget.confirmation().shoppingCart) {
          items = widget.confirmation().shoppingCart.items;
        }
        $.when(widget.site().siteLoadedDeferred).done(function () {
          if (widget.confirmation()) {
            var secondaryCurrency = widget.site().getCurrency(widget.confirmation().secondaryCurrencyCode);
            if (widget.secondaryCurrency() || secondaryCurrency) {
              if (widget.secondaryCurrency() && secondaryCurrency && (widget.secondaryCurrency().currencyCode == secondaryCurrency.currencyCode)) {
                return;
              }
              widget.secondaryCurrency(secondaryCurrency);
            }
          }
        });
        var createExpandFlag = function (item) {
          for (var j = 0; j < item.childItems.length; j++) {
            if (item.childItems[j].expanded == undefined) {
              item.childItems[j].expanded = ko.observable(false);
            }
            if (item.childItems[j].childItems && item.childItems[j].childItems.length > 0) {
              createExpandFlag(item.childItems[j]);
            }
          }
        };
        for (var i = 0; items && i < items.length; i++) {
          var item = items[i];
          if (item.childItems && item.childItems.length > 0) {
            createExpandFlag(item);
          }
        }
        if (widget.confirmation().state === CCConstants.PENDING_PAYMENT) {
          widget.isPending(true);
        }
        else if (widget.pendingApprovalStates.indexOf(widget.confirmation().state) != -1) {
          widget.isPendingApproval(true);
          if (this.confirmation().payments.length == 1 && (this.confirmation().payments[0].paymentMethod == CCConstants.INVOICE_PAYMENT_METHOD ||
            this.confirmation().payments[0].paymentMethod == CCConstants.CASH_PAYMENT_TYPE)) {
            widget.needsPayment(false);
          }
          else { widget.needsPayment(true); }
        }
        else {
          widget.isPending(false);
          widget.isPendingApproval(false);
        }

        //remove the spinner
        $('#loadingModal').hide();
        spinner.destroy(0);
        if (widget.user().errorMessageKey() != '') {
          notifier.sendError(widget.WIDGET_ID, widget.translate(widget.user().errorMessageKey()), true);
        } else if (widget.user().successMessageKey() != '') {
          notifier.sendSuccess(widget.WIDGET_ID, widget.translate(widget.user().successMessageKey()));
        } else if (ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION) != null) {
          var regStatus = ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
          if (regStatus == CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_SUCCESS) {
            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('loginSuccessText'));
          }
          else if (regStatus == CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_FAILURE) {
            notifier.sendError(widget.WIDGET_ID, widget.translate('loginFailureText'), true);
          }
          ccRestClient.clearStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
        }
        widget.user().errorMessageKey('');
        widget.user().successMessageKey('');
      },

      getCountryDisplayName: function (countryCd) {
        if (this.shippingCountries()) {
          for (var i in this.shippingCountries()) {
            var countryObj = this.shippingCountries()[i];
            if (countryObj.countryCode === countryCd) {
              return countryObj.displayName;
            }
          }
        }
        return "";
      },

      getStateDisplayName: function (countryCd, stateCd) {
        if (this.shippingCountries()) {
          for (var i in this.shippingCountries()) {
            var countryObj = this.shippingCountries()[i];
            if (countryObj.countryCode === countryCd) {
              for (var j in countryObj.regions) {
                var stateObj = countryObj.regions[j];
                if (stateObj.abbreviation === stateCd) {
                  return stateObj.displayName;
                }
              }
            }
          }
        }
        return "";
      },
      /*
       * Method to get price for each item, added from
       * Bopis feature -multiple shipping groups
       */
      getDetailedPriceInfo: function (detailedItemPriceInfo) {
        var finalAmount = 0;
        for (var i in detailedItemPriceInfo) {
          finalAmount = finalAmount + detailedItemPriceInfo[i].amount;
        }
        return finalAmount;
      }
    };
  });
