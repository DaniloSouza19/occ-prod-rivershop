/**
 * @fileoverview Order History Details.
 * 
 * @author shsatpat
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'notifier', 'CCi18n', 'ccConstants', 'navigation', 'ccRestClient', 'spinner',
    'viewModels/paymentsViewModel'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, notifier, CCi18n, CCConstants, navigation, ccRestClient, spinner, paymentsContainer) {

    "use strict";

    return {
      /** Widget root element id */
      WIDGET_ID: 'NSH_Profile_Order_Details',
      /** Default options for creating a spinner on price*/
      orderDetailsBodyIndicator: '#CC-orderDetails-body',
      selectedOrder: ko.observable(),
      orderDetailsBodyIndicatorOptions: {
        parent: '#CC-orderDetails-body',
        posTop: '50%',
        posLeft: '50%'
      },
      displayOrder: ko.observable(true),
      subStatus: ko.observable(),
      removeURL: ko.observable(),
      observacao: ko.observable(),
      //The array to store all the checked product
      selectedProduct: ko.observableArray([]),
      formaPagamentoSelecionada: ko.observable(),

      onLoad: function (widget) {
        
        widget.subStatus_c();
       
        widget.removeURL(true)
        widget.secondaryCurrency = ko.observable(null);
        widget.showSecondaryShippingData = ko.pureComputed(function () {
          return widget.orderDetails().payShippingInSecondaryCurrency &&
            (null != widget.secondaryCurrency());
        });

        widget.showSecondaryTaxData = ko.pureComputed(function () {
          return widget.cart().payTaxInSecondaryCurrency &&
            (null != widget.secondaryCurrency());
        });


        var isModalVisible = ko.observable(false);
        var isModalNoClicked = ko.observable(false);
        var isModalYesClicked = ko.observable(false);

        widget.cancelReasons = ko.observable();
        widget.selectedCancelReason = ko.observable();
        widget.isCancelAllowed = ko.observable(false);
        widget.isReturnAllowed = ko.observable(false);

        widget.displayOrder(false);
        widget.hideModal = function () {
          if (isModalVisible()) {
            $("#CC-orderDetails-modal").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        };

        widget.showModal = function () {
          if ($("#CC-orderDetails-modal").length) {
            $("#CC-orderDetails-modal").modal('show');
            $('#CC-orderDetails-modal').on('hidden.bs.modal', function () {
              if ((!isModalYesClicked() && !isModalNoClicked() && isModalVisible())) {
                $("#CC-orderDetailsContextChangeMsg").show();
              }
            });
            isModalVisible(true);
          }
          else {
            setTimeout(widget.showModal, 50);
          }
        };

        widget.handleModalYes = function () {
          isModalYesClicked(true);
          widget.cart().clearCartForProfile();
          ccRestClient.setStoredValue(
            CCConstants.LOCAL_STORAGE_ORGANIZATION_ID, ko
              .toJSON(this.orderDetails().organizationId));
          widget.hideModal();
          window.location.assign(window.location.href);
          widget.cart().loadCartForProfile();
        };

        widget.handleModalNo = function () {
          isModalNoClicked(true);
          $("#CC-orderDetailsContextChangeMsg").show();
          widget.hideModal();
        };

        // Define a create spinner function with spinner options
        widget.createSpinner = function (pSpinner, pSpinnerOptions) {
          $(pSpinner).css('position', 'fixed');
          $(pSpinner).addClass('loadingIndicator');
          spinner.create(pSpinnerOptions);
        };

        // Define a destroy spinner function with spinner id
        widget.destroySpinner = function (pSpinnerId) {
          $(widget.orderDetailsBodyIndicator).css('position', 'relative');
          $(pSpinnerId).removeClass('loadingIndicator');
          spinner.destroyWithoutDelay(pSpinnerId);
        };
        widget.isGiftCardUsed = ko.computed(
          function () {
            if (widget.orderDetails()) {
              var payments = widget.orderDetails().payments;
              for (var i = 0; i < payments.length; i++) {
                if (payments[i].paymentMethod == CCConstants.GIFT_CARD_PAYMENT_TYPE && payments[i].paymentState == CCConstants.PAYMENT_GROUP_STATE_AUTHORIZED) {
                  return true;
                }
              }
            }
          }, widget);
        widget.isScheduledOrder = ko.computed(
          function () {
            if (widget.orderDetails()) {
              if (widget.orderDetails().scheduledOrderName) {
                return true;
              }
            }
          }, widget);

        widget.totalAmount = ko.computed(
          function () {
            if (widget.orderDetails()) {
              var payments = widget.orderDetails().payments;
              var remainingTotal = 0;
              for (var i = 0; i < payments.length; i++) {
                if (payments[i].paymentMethod != CCConstants.GIFT_CARD_PAYMENT_TYPE) {
                  remainingTotal += payments[i].amount;
                }
              }
            }
            return remainingTotal;
          }, widget);

        widget.approverName = ko.computed(
          function () {
            if (widget.orderDetails() && widget.orderDetails().approvers) {
              var approver = widget.orderDetails().approvers[0];
              if (approver.lastName != null) {
                return approver.firstName + " " + approver.lastName;
              } else {
                return approver.firstName;
              }
            }
            return null;
          }, widget);

        widget.approverMessage = ko.computed(
          function () {
            if (widget.orderDetails() && widget.orderDetails().approverMessages && widget.orderDetails().approverMessages.length > 0) {
              return widget.orderDetails().approverMessages[0];
            }
            return CCConstants.NO_COMMENTS;
          }, widget);

        widget.claimedCouponMultiPromotions = ko.pureComputed(
          function () {
            var coupons = new Array();
            if (widget.orderDetails()) {
              if (widget.orderDetails().discountInfo) {
                for (var prop in widget.orderDetails().discountInfo.claimedCouponMultiPromotions) {
                  var promotions = widget.orderDetails().discountInfo.claimedCouponMultiPromotions[prop];
                  var couponMultiPromotion = [];
                  couponMultiPromotion.code = prop;
                  couponMultiPromotion.promotions = promotions;
                  coupons.push(couponMultiPromotion);
                }
              }
            }
            return coupons;
          }, widget);

        /**
         * Function to check if complete Payment button should be displayed.
         */
        widget.isEligibleToCompletePayment = ko.computed(
          function () {
            //identify pending authorization payment group existence first for payU case
            var pendingAuthPaymentGroup = false;
            if (widget.orderDetails() && widget.orderDetails().payments) {
              var payments = widget.orderDetails().payments;
              for (var i = 0; i < payments.length; i++) {
                if (payments[i].paymentState == CCConstants.PENDING_AUTHORIZATION) {
                  pendingAuthPaymentGroup = true;
                  break;
                }
              }
            }
            // If order is pending payment and belongs to current user and does not
            //have pending authorization Payment Group then allow him to make payments
            if (widget.orderDetails() && widget.user() && widget.orderDetails().priceInfo &&
              widget.orderDetails().state == CCConstants.ORDER_STATE_PENDING_PAYMENT &&
              widget.orderDetails().orderProfileId == widget.user().id() &&
              !pendingAuthPaymentGroup && widget.orderDetails().priceInfo.total > 0) {
              return true;
            }
            return false;
          }, widget);

        // To append locale for scheduled orders link
        widget.detailsLinkWithLocale = ko.computed(
          function () {
            return navigation.getPathWithLocale('/scheduledOrders/');
          }, widget);

        widget.populatePaymentsViewModel = function () {
          var widget = this;
          var authorizedAmount = 0;
          var loyaltyAuthorizedAmount = 0;
          var completedPayments = [];
          var completedLoyaltyPayments = [];
          var isChargeShippingAndTaxInSecondaryCurrency = false;
          var currencySymbol = widget.orderDetails().priceListGroup.currency.symbol;

          if (widget.orderDetails().payShippingInSecondaryCurrency || widget.orderDetails().payTaxInSecondaryCurrency) {
            isChargeShippingAndTaxInSecondaryCurrency = true;
            currencySymbol = widget.secondaryCurrency() && widget.secondaryCurrency().symbol ? widget.secondaryCurrency().symbol : widget.orderDetails().priceListGroup.currency.symbol;
          }

          for (var i = 0; i < widget.orderDetails().payments.length; i++) {
            if (widget.orderDetails().payments[i].paymentState == CCConstants.PAYMENT_GROUP_STATE_AUTHORIZED ||
              widget.orderDetails().payments[i].paymentState == CCConstants.PAYMENT_GROUP_STATE_PAYMENT_REQUEST_ACCEPTED ||
              widget.orderDetails().payments[i].paymentState == CCConstants.PAYMENT_GROUP_PAYMENT_DEFERRED ||
              widget.orderDetails().payments[i].paymentState == CCConstants.PAYMENT_GROUP_STATE_SETTLED) {
              if (widget.orderDetails().payments[i].type === CCConstants.LOYALTY_POINTS_PAYMENT_TYPE && isChargeShippingAndTaxInSecondaryCurrency) {
                loyaltyAuthorizedAmount = parseFloat(loyaltyAuthorizedAmount) + parseFloat(widget.orderDetails().payments[i].amount);
                completedLoyaltyPayments.push(widget.generateCompletedPaymentsText(widget.orderDetails().payments[i], widget.orderDetails().priceListGroup.currency.symbol));
              } else {
                authorizedAmount = parseFloat(authorizedAmount) + parseFloat(widget.orderDetails().payments[i].amount);
                completedPayments.push(widget.generateCompletedPaymentsText(widget.orderDetails().payments[i], currencySymbol));
              }
            }
          }
          var dueAmount = 0;
          var loyaltyDueAmount = 0;
          if (isChargeShippingAndTaxInSecondaryCurrency) {
            dueAmount = parseFloat(widget.orderDetails().priceInfo.secondaryCurrencyTotal) - parseFloat(authorizedAmount);
            loyaltyDueAmount = parseFloat(widget.orderDetails().priceInfo.primaryCurrencyTotal) - parseFloat(loyaltyAuthorizedAmount);
          } else {
            dueAmount = parseFloat(widget.orderDetails().priceInfo.total) - parseFloat(authorizedAmount);
          }
          // Update Payments View Model
          var paymentsViewModel = paymentsContainer.getInstance();
          // Reset the view model before adding the completed payments
          paymentsViewModel.resetPaymentsContainer();
          paymentsViewModel.paymentDue(dueAmount);
          paymentsViewModel.loyaltyPaymentDue(loyaltyDueAmount);
          paymentsViewModel.historicalCompletedPayments(completedPayments);
          paymentsViewModel.historicalCompletedLoyaltyPayments(completedLoyaltyPayments);
          widget.user().isHistoricalOrder = true;
        };



        widget.generateCompletedPaymentsText = function (pPaymentData, currencySymbol) {
          var type;
          var maskedNumber;
          if (pPaymentData.paymentMethod == CCConstants.TOKENIZED_CREDIT_CARD || pPaymentData.paymentMethod == CCConstants.CREDIT_CARD) {
            if (pPaymentData.cardType) {
              type = pPaymentData.cardType;
            } else {
              type = CCConstants.CREDIT_CARD_TEXT;
            }
            maskedNumber = pPaymentData.cardNumber;
          } else if (pPaymentData.paymentMethod == CCConstants.GIFT_CARD_PAYMENT_TYPE) {
            type = CCConstants.GIFT_CARD_TEXT;
            maskedNumber = pPaymentData.maskedCardNumber;
          } else if (pPaymentData.paymentMethod == CCConstants.CASH_PAYMENT_TYPE) {
            type = CCConstants.CASH_PAYMENT_TYPE;
            maskedNumber = "";
          } else if (pPaymentData.paymentMethod == CCConstants.INVOICE_PAYMENT_METHOD) {
            type = CCConstants.INVOICE_PAYMENT_TYPE;
            maskedNumber = pPaymentData.PONumber;
          } else if (pPaymentData.paymentMethod == CCConstants.CUSTOM_CURRENCY_PAYMENT_TYPE) {
            type = CCConstants.LOYALTY_POINTS_PAYMENT_TYPE;
          }

          return (currencySymbol + pPaymentData.amount + widget.translate("toBeChargedPaymentText", { type: type, number: maskedNumber }));
        };

        widget.pendingApprovalReasons = ko.computed(
          function () {
            if (widget.orderDetails()) {
              var orderDetails = widget.orderDetails();
              if (orderDetails.approvalSystemMessages) {
                return orderDetails.approvalSystemMessages;
              }
            }
            return null;
          }, widget);

        widget.isAddToPurchaseListDisabled = ko.computed(
          function () {
            if (widget.getSelectedProducts().length > 0) {
              return false;
            } else {
              return true;
            }
          }, widget);

        //Keep updated in select all checkbox for purchase list
        widget.shippingGroupSelectedAllProduct = function (data, event) {
          var shippingGroupItems = [];
          shippingGroupItems = data.items;
          shippingGroupItems.map(function (item, index) {
            if (item.shippingGroupId !== null
              && item.shippingGroupId !== undefined) {
              item.shippingGroupId = '';
            }
            item.shippingGroupId = data.shippingGroupId;
          });

          if (event.target.checked) {
            widget.selectedProduct.push.apply(widget.selectedProduct,
              shippingGroupItems.slice(0));
          } else {
            for (var item = 0; item < widget.selectedProduct().length; item++) {
              if (widget.selectedProduct()[item].shippingGroupId === data.shippingGroupId) {
                widget.selectedProduct.remove(widget.selectedProduct()[item]);
                item -= 1;
              }
            }
          }
          return true;
        };
        // To keep updated purchase list select all checkbox when item is
        // selected under a shipping group
        widget.selectedProductPurchaseList = function (shippingGroup, event) {
          var shippingGroupItems = [];
          shippingGroupItems = shippingGroup.items;
          var itemShippingGroup = shippingGroup.shippingGroupId;
          shippingGroupItems.map(function (item, index) {
            if (item.shippingGroupId !== null
              && item.shippingGroupId !== undefined) {
              item.shippingGroupId = '';
            }
            item.shippingGroupId = itemShippingGroup;
          });
          var itemSGCount = 0;
          if (event.target.checked) {
            for (var item = 0; item < widget.selectedProduct().length; item++) {
              if (widget.selectedProduct()[item].shippingGroupId === shippingGroup.shippingGroupId) {
                itemSGCount += 1;
              }
            }
            if (itemSGCount === shippingGroup.items.length) {
              $("#CC-purchase-list-" + shippingGroup.shippingGroupId).prop("checked",
                true);
            }
          } else {
            $("#CC-purchase-list-" + shippingGroup.shippingGroupId).prop("checked",
              false);
          }
          return true;
        };

        /**
          * The method returns the value of isPurchaseListEnable flag as per configuration
          * specified in config.json
          */
        widget.checkPurchaseListEnabledFlag = function () {
          return widget.isPurchaseListEnable && widget.isPurchaseListEnable();

        };
        /**
          * The method returns the value of isShopperInitiatedReturnEnable flag as per configuration
          * specified in config.json
          */
        widget.checkShopperInitiatedReturnEnabledFlag = function () {
          return widget.isShopperInitiatedReturnEnable && widget.isShopperInitiatedReturnEnable();
        };
        /**
         * The method returns the value of isShopperInitiatedCancelEnable flag as per configuration
         * specified in config.json
         */
        widget.checkShopperInitiatedCancelEnabledFlag = function () {
          return widget.isShopperInitiatedCancelEnable && widget.isShopperInitiatedCancelEnable();
        };
        var userFormasPagamento; 
        var cartFormaPagamento;

        $.each(widget.user().dynamicProperties(), function (index, dyn) {
          if (dyn.id() == "formasPagamento_c") {
            userFormasPagamento = JSON.parse(dyn.value());
            
          }
        });

        
        $.each(widget.orderDetails().dynamicProperties, function (index, cartDyn) {
          if (cartDyn.id == "formasPagamento_c") {
            cartFormaPagamento = cartDyn;
          
          }
        });

        if (userFormasPagamento && userFormasPagamento != null && cartFormaPagamento && cartFormaPagamento != null) {
          $.each(userFormasPagamento, function (index, formas) {
            if (formas.nome == cartFormaPagamento.value) {
              widget.formaPagamentoSelecionada(formas);
             
            }
          });
        }



      },

      completePayment: function () {
        var widget = this;
        widget.populatePaymentsViewModel();

        this.cart().currentOrderId(this.orderDetails().id);
        this.cart().currentOrderState(this.orderDetails().state);
        this.user().validateAndRedirectPage(this.links().checkout.route + "?orderId=" + this.orderDetails().id);
      },

      beforeAppear: function (page) {
        var widget = this;
        widget.selectedProduct([]);
        var items = [];
        if (widget.orderDetails && widget.orderDetails() && widget.orderDetails().order) {
          items.push.apply(items, widget.orderDetails().order.items);
        }
        if (widget.orderDetails && widget.orderDetails() && widget.orderDetails().shippingGroups && widget.orderDetails().shippingGroups.length > 0) {
          for (var i = 0; i < widget.orderDetails().shippingGroups.length; i++) {
            items.push.apply(items, widget.orderDetails().shippingGroups[i].items);
          }
        }
        $.when(widget.site().siteLoadedDeferred).done(function () {
          if (widget.orderDetails()) {
            var secondaryCurrency = widget.site().getCurrency(widget.orderDetails().secondaryCurrencyCode);
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
            item.childItems[j].expanded = ko.observable(false);
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
        $("body").attr("id", "CC-orderDetails-body");
        if (!widget.orderDetails() || !widget.user().loggedIn() || widget.user().isUserSessionExpired()) {
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        }

        if (widget.user().currentOrganization() && this.orderDetails().organizationId !=
          widget.user().currentOrganization().repositoryId) {
          widget.displayOrder(false);
          widget.showModal();
        }
        else if (widget.orderDetails() && widget.orderDetails().state == CCConstants.PENDING_APPROVAL) {
          widget.displayOrder(true);
          widget.createSpinner(widget.orderDetailsBodyIndicator, widget.orderDetailsBodyIndicatorOptions);
          var order = {};
          order[CCConstants.ORDER_ID] = widget.orderDetails().id;
          order[CCConstants.REPRICE] = true;
          ccRestClient.request(CCConstants.ENDPOINT_ORDERS_PRICE_ORDER, order,
            function (data) {
              data.order = {};
              data.order = data.shoppingCart;
              widget.orderDetails(data);
              widget.destroySpinner(widget.orderDetailsBodyIndicator);
            }, function (result) {
              widget.destroySpinner(widget.orderDetailsBodyIndicator);
              widget.displayOrder(true);
              notifier.sendError(widget.WIDGET_ID, result.message, true);
            }, order)
        }
        else {
          widget.displayOrder(true);
        }

        widget.resetOrderDetails = function () {
          if (!(arguments[0].data.page.orderDetails && arguments[0].data.page.orderDetails.id)) {
            widget.orderDetails(null);
            $.Topic(pubsub.topicNames.PAGE_LAYOUT_LOADED).unsubscribe(widget.resetOrderDetails);
            $.Topic(pubsub.topicNames.PAGE_METADATA_CHANGED).unsubscribe(widget.resetOrderDetails);
          }
        };

        $.Topic(pubsub.topicNames.PAGE_LAYOUT_LOADED).subscribe(widget.resetOrderDetails);
        $.Topic(pubsub.topicNames.PAGE_METADATA_CHANGED).subscribe(widget.resetOrderDetails);

        if (widget.orderDetails() && widget.orderDetails().errorMessages != undefined) {
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.sendError(widget.WIDGET_ID, widget.orderDetails().errorMessages, true);
        }
        if (widget.orderDetails && widget.orderDetails() && widget.orderDetails().order) {
          var data = {};
          ccRestClient.request(CCConstants.ENDPOINT_VALID_ACTIONS_ON_ORDER, data,
            // Success callback
            function (pResult) {
              widget.isCancelAllowed(pResult.cancel.isCancelAllowed);
              widget.isReturnAllowed(pResult.returns.isReturnAllowed);
            }.bind(widget),
            // Error callback
            function () {
              //nothing
            }, widget.orderDetails().id);
        }
        widget.observacao_c();


      },
      /**
       * Function to get the display name of a state 
       * countryCd - Country Code
       * stateCd - State Code
       */
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

      observacao_c: function () {
        var widget = this;
        var dynamicProperties = widget.orderDetails().dynamicProperties;
        $.each(dynamicProperties, function (index, par) {
          if (par.id === "observacao_c") {
            widget.observacao(par.value)

          }
        })
      },

      subStatus_c: function () {
        var widget = this;

        var dynamicProperties = widget.orderDetails().dynamicProperties;



        $.each(dynamicProperties, function (index, par) {


          if (par.id === "subStatus_c") {

            widget.subStatus(par.value)



          }
        })

      },
      //boleto_url
      removeURL: function () {


        var widget = this;
        var customPaymentProperties = widget.orderDetails().payments[0].customPaymentProperties;
        var boletoUrl = "";
        if (customPaymentProperties && customPaymentProperties != null) {
          $.each(customPaymentProperties, function (index, value) {
            var spl = index.split("=");
            if (spl[0] == "boleto_url") {
              boletoUrl = spl[1];

            }

          })


          return boletoUrl;

        }


      },


      /**
       * Function to get the display name of a state 
       */
      getStateName: function () {
        if (this.orderDetails && this.orderDetails() && this.orderDetails().shippingAddress && this.orderDetails().shippingAddress.regionName) {
          return this.orderDetails().shippingAddress.regionName;
        }
        return "";
      },

      /**
       * Function to get the display name of a Country 
       * countryCd - Country Code
       */
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

      /**
       * Function to get the display name of a Country 
       */
      getCountryName: function () {
        if (this.orderDetails && this.orderDetails() && this.orderDetails().shippingAddress && this.orderDetails().shippingAddress.countryName) {
          return this.orderDetails().shippingAddress.countryName;
        }
        return "";
      },

      /**
       * Function to check if the order is quoted or not
       */
      isQuoted: function () {
        if (this.orderDetails && this.orderDetails() && (this.orderDetails().state == CCConstants.QUOTED_STATES)) {
          return true;
        }
        return false;
      },

      /**
       * Function to check if the address object contains atleast 1 not null field
       */
      isAddressAvailable: function (shippingGroup) {
        if (shippingGroup && shippingGroup.shippingAddress) {
          for (var i in shippingGroup.shippingAddress) {
            if (shippingGroup.shippingAddress[i]) {
              return true;
            }
          }
          return false;
        }
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

      /**
      * Returns the selected product details to the purchase list element.
      */
      getSelectedProducts: function () {
        var widget = this;
        var productItemArray = [];
        ko.utils.arrayForEach(widget.selectedProduct(), function (item) {
          var productItem = {
            "productId": item.productId,
            "catRefId": item.catRefId,
            "quantityDesired": item.quantity,
            "displayName": item.displayName
          };
          productItemArray.push(productItem);
        });
        return productItemArray;
      },

      /**
       * Method to fetch items from the order and send them to cart
       * so that these items can be added to the cart.
       */
      mergeToCart: function (data, event) {
        var widget = this;
        if (data.order) {
          widget.selectedOrder(data.order);
        }
        widget.cart().mergeCart(true);
        var state = widget.selectedOrder().state;
        var success = function () {
          widget.user().validateAndRedirectPage("/cart");
        };
        var error = function (errorBlock) {
          var errMessages = "";
          var displayName;
          for (var k = 0; k < errorBlock.length; k++) {
            errMessages = errMessages + "\r\n" + errorBlock[k].errorMessage;
          }
          notifier.sendError("CartViewModel", errMessages, true);
        };
        widget.cart().addItemsToCart(widget.selectedOrder().items, success, error);
      },

      setSelectedOrder: function (data, event) {
        this.selectedOrder(data.order);
      },



      /**
       * Method to redirect the request to Return Page
       * so that return can be initiated
       */

      clickReturnItems: function (data, event) {
        var widget = this;
        widget.user().validateAndRedirectPage(this.links().returnItems.route + '?' + "order" + "=" + data.id);
      },
      /**
       * Method to display the cancel model
       * on click of cancel button
       *

       */
      handleCancelOrderClick: function (data, event) {
        var data = {};
        ccRestClient.request(CCConstants.ENDPOINT_ORDERS_CANCEL_GET_CANCEL_REASONS, data,
          // Success callback
          function (pResult) {
            //suppressing the the irrelevant cancel reason for storefront.
            var i;
            for (i = 0; i < pResult.items.length; i++) {
              if (pResult.items[i].key == 'paymentNotReceived') {
                pResult.items.splice(i, 1);
                break;
              }
            }


            this.cancelReasons(pResult.items)
          }.bind(this),
          // Error callback
          function () {
            notifier.sendError(this.WIDGET_ID, CCi18n.t('ns.common:resources.cancelOrderFail'), true)
          }, this.orderDetails().id);

        $('#CC-cancel-order-modal').one('show.bs.modal', function () {
          // $('#CC-cancelOrderModel').show();
        });

        $('#CC-cancel-order-modal').modal('show');

        $('#CC-cancel-order-modal').one('hide.bs.modal', function () {
          //  $('#CC-cancelOrderModel').hide();
        });

      },

      /**
       * Method to invoke the cancel the order 
       * on click of continue button in Cancel model

       */
      handleClickContinue: function (data, event) {
        $('#CC-cancel-order-modal').modal('hide');
        var orderRequest = {};
        var path = {};
        if (this.selectedCancelReason() == null) {
          notifier.sendError(this.WIDGET_ID, CCi18n.t('ns.common:resources.enterCancelReason'), true);
        } else {
          orderRequest["cancelReason"] = this.selectedCancelReason().key;

          orderRequest["orderId"] = this.orderDetails().id;
          path = CCConstants.ENDPOINT_ORDERS_CANCEL_ORDER;
          ccRestClient.request(path, orderRequest,
            // Success callback
            function (pResult) {
              this.orderDetails(pResult.order);
              notifier.sendSuccess(this.WIDGET_ID, CCi18n.t('ns.common:resources.cancelOrderSuccess'), true)
            }.bind(this),
            // Error callback
            function (pResult) {
              notifier.sendError(this.WIDGET_ID, CCi18n.t('ns.common:resources.cancelOrderFail'), true)
            }.bind(this));
        }



      },

      /**
       * Method to hide the cancel model
       * on click of cancel button

       */
      handleClickCancel: function (data, event) {
        $('#CC-cancel-order-modal').modal('hide');

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
    }
  }
);
