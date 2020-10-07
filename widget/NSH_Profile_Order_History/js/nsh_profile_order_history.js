/**
 * @fileoverview Order History Widget.
 * 
 * 
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'viewModels/orderHistoryViewModel', 'notifier', 'CCi18n', 'ccConstants', 'navigation', 'ccRestClient',
    'pageLayout/currency'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, OrderHistoryViewModel, notifier, CCi18n, CCConstants, navigation, ccRestClient,
    CurrencyViewModel) {

    "use strict";

    return {

      WIDGET_ID: "NSH_Profile_Order_History",
      includeScheduledInformation: ko.observable(false),
      ordersArray: ko.observableArray([]),
      sortDirections: ko.observable({ "submittedDate": "both" }),
      Status: function (displayName, statuses) {
        this.selectedName = displayName;
        this.selectedStatuses = statuses;
      },

      status: ko.observable(),
      selectedOrderId: ko.observable(),
      contextManager: null,
      isAgentApplication: window.isAgentApplication,
      subscriptions: [],
      homeRoute: "",
      beforeAppear: function (page) {
        var widget = this;
        if (widget.user().loggedIn() == false) {
          navigation.doLogin(navigation.getPath(), widget.homeRoute);
        } else {
          widget.status(widget.availableStatuses()[0]);
          widget.sortDirections({ "submittedDate": "both" });
          widget.historyViewModel().clearOnLoad = true;
          widget.historyViewModel().profileId = widget.user().id();
          if (widget.contextManager) {
            widget.subscriptions.push(widget.contextManager.selectedSite.subscribe(widget.getFilteredBySiteAndOrganization.bind(widget)));
            widget.subscriptions.push(widget.contextManager.currentOrganizationId.subscribe(widget.getFilteredBySiteAndOrganization.bind(widget)));
          }
          if (widget.status() && widget.status().selectedName === widget.availableStatuses()[0].selectedName) {
            widget.getFilteredStatus(widget);
          } else {
            widget.status(widget.availableStatuses()[0]);
          }
          // widget.historyViewModel().load(1, 1);
        }
      },

      onLoad: function (widget) {
        var self = this;
        widget.availableStatuses = ko.observableArray([]);

        widget.historyViewModel = ko.observable();
        widget.currencyViewModel = CurrencyViewModel.getInstance();
        widget.historyViewModel(new OrderHistoryViewModel());
        widget.historyViewModel().profileId = widget.user().id();
        widget.homeRoute = widget.links().home.route;
        if (widget.isAgentApplication) {
          widget.homeRoute = widget.links().agentHome.route;
          widget.contextManager = require("agentViewModels/agent-context-manager").getInstance();
          widget.loadOrderStates();
        } else {
          widget.populateDefaultOrderStates();
        }

        $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.triggerPageChangeEvent.bind(widget));
        //Create historyGrid computed for the widget
        widget.historyGrid = ko.computed(function () {
          var numElements, start, end, width;
          var rows = [];
          var orders;
          if (($(window)[0].innerWidth || $(window).width()) > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
            var startPosition, endPosition;
            // Get the orders in the current page
            startPosition = (widget.historyViewModel().currentPage() - 1) * widget.historyViewModel().itemsPerPage;
            endPosition = startPosition + widget.historyViewModel().itemsPerPage;
            orders = widget.historyViewModel().data.slice(startPosition, endPosition);
          } else {
            var length = widget.historyViewModel().data().length;
            orders = widget.historyViewModel().data.slice(0, length);
          }
          if (!orders) {
            return;
          }
          numElements = orders.length;
          width = parseInt(widget.historyViewModel().itemsPerRow(), 10);
          start = 0;
          end = start + width;
          while (end <= numElements) {
            rows.push(orders.slice(start, end));
            start = end;
            end += width;
          }
          if (end > numElements && start < numElements) {
            rows.push(orders.slice(start, numElements));
          }

          for (var i = 0; i < orders.length; i++) {
            orders[i]['isCurrencyLoaded'] = ko.observable(true);
            if (widget.isAgentApplication) {
              orders[i].isCurrencyLoaded(false);
              orders[i]['orderId'] = orders[i]['id'];
              orders[i]['primaryCurrencyTotal'] = orders[i].priceInfo.primaryCurrencyTotal;
              orders[i]['secondaryCurrencyTotal'] = orders[i].priceInfo.secondaryCurrencyTotal;
              orders[i]['total'] = orders[i].priceInfo.total;
              orders[i]['priceListGroup'] = {};
              orders[i]['priceListGroup'].currency = null;
              $.when(widget.currencyViewModel.siteCurrenciesLoaded).done(function () {
                orders[i].priceListGroup.currency = widget.currencyViewModel.getCurrency(orders[i].priceInfo.currencyCode);
                orders[i].isCurrencyLoaded(true);
              });
            }
            orders[i]['secondaryOrderDataAvailable'] = orders[i].payTaxInSecondaryCurrency && orders[i].payShippingInSecondaryCurrency &&
              orders[i].secondaryCurrencyCode ? true : false;
            if (orders[i].secondaryOrderDataAvailable) {
              orders[i]['secondaryCurrency'] = ko.observable(null);
              $.when(widget.currencyViewModel.siteCurrenciesLoaded).done(function () {
                orders[i].secondaryCurrency(widget.currencyViewModel.getCurrency(orders[i].secondaryCurrencyCode));
              });
            }
          }
          return rows;
        }, widget);

        $.Topic(pubsub.topicNames.ORDERS_GET_HISTORY_FAILED).subscribe(function (data) {
          if (this.status == CCConstants.HTTP_UNAUTHORIZED_ERROR) {
            widget.user().handleSessionExpired();
            if (navigation.isPathEqualTo(navigation.isPathEqualTo(widget.links().profile.route) || navigation.isPathEqualTo(widget.links().orderHistory.route))) {
              navigation.doLogin(navigation.getPath, widget.homeRoute);
            }
          } else {
            navigation.goTo('/profile');
          }
        });
      },
      /**
       * Called when the user sorts the order history based on creation date , status:
       * @param sortOrder : order of sort either ascending or descending
       * @param sortTerm : attribute on which the sort needs to be performed
       */
      clickToSort: function (sortOrder, sortTerm) {
        var widget = this;
        widget.sortDirections()[sortTerm] = sortOrder;
        /* if(sortTerm=="submittedDate"){
           widget.sortDirections()["state"]="both";
         }else if(sortTerm=="state"){
           widget.sortDirections()["submittedDate"]="both";
         } */
        widget.sortDirections.valueHasMutated();
        var sortString = sortTerm + ":" + sortOrder;
        widget.historyViewModel().sortProperty = sortString;
        widget.historyViewModel().refinedFetch();

      },
      getFilteredStatus: function (pData) {
        var widget = this;
        var filtertext = pData.status() ? pData.status().selectedStatuses : [];
        widget.historyViewModel().filterArray = filtertext;
        widget.populateSiteAndOrganization();
        widget.historyViewModel().refinedFetch();
      },
      getFilteredBySiteAndOrganization: function () {
        var widget = this;
        widget.populateSiteAndOrganization();
        widget.historyViewModel().refinedFetch();
      },
      clickOrderDetails: function (data, event) {
        var widget = this;
        var link = this.isAgentApplication ? (this.links().AgentOrderDetails.route) : this.links().orderDetails.route;
        widget.user().validateAndRedirectPage(link + '/' + data.orderId);
        return false;
      },
      populateSiteAndOrganization: function () {
        var widget = this;
        if (widget.historyViewModel() && widget.contextManager) {
          widget.historyViewModel().siteFilter = widget.contextManager.getSelectedSite();
          widget.historyViewModel().organizationFilter = widget.contextManager.getCurrentOrganizationId();
        }
      },
      mergeToCart: function (data, event) {
        var widget = this;
        if (data.orderId) {
          widget.selectedOrderId(data.orderId);
        }
        widget.cart().mergeCart(true);
        ccRestClient.request(CCConstants.ENDPOINT_GET_ORDER, null,
          function (order) {
            var state = order.state;
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
            widget.cart().addItemsToCart(order.order.items, success, error);
            widget.selectedOrderId(null);
          },
          function (data) {
            // If not go 404
            if (data.status == CCConstants.HTTP_UNAUTHORIZED_ERROR) {
              notifier.sendError(widget.WIDGET_ID, CCi18n.t('ns.common:resources.cartSessionExpired'), true);
              navigation.doLogin(window.location.pathname);
            }
            else {
              navigation.goTo(widget.cart().contextData.global.links['404'].route);
            }
            widget.cart().mergeCart(false);
            widget.selectedOrderId(null);
          },
          widget.selectedOrderId());
      },

      setSelectedOrderId: function (data, event) {
        this.selectedOrderId(data.orderId);
      },
      triggerPageChangeEvent: function () {
        var widget = this;
        var length = widget.subscriptions.length;
        for (var i = 0; i < length; i++) {
          widget.subscriptions[i].dispose();
        }
        widget.subscriptions = []
      },

      loadOrderStates: function () {
        var widget = this;
        widget.historyViewModel().loadOrderStates({}, widget.loadOrderStatesSuccess.bind(widget), widget.loadOrderStatesFailure.bind(widget));
      },

      /**
       * Success handler for requesting Order States.
       * 
       * @param pData
       *          {Object} the orders search response
       */
      loadOrderStatesSuccess: function (pData) {
        var widget = this;
        var orderStatesArray = [new widget.Status(CCi18n.t('ns.common:resources.ALL'), [])];
        //Convert the label based on the locale, as locale support is not provided from endpoint.
        if (pData && 0 < pData.length) {
          for (var itr = 0; itr < pData.length; itr++) {
            var orderState = new widget.Status(CCi18n.t('ns.common:resources.' + pData[itr].displayKey), [pData[itr].displayKey]);
            orderStatesArray.push(orderState);
          }
        }
        widget.availableStatuses(orderStatesArray);
      },

      /**
       * Error handler for when a Order States load request fails.
       */
      loadOrderStatesFailure: function () {
        var widget = this;
        notifier.sendError(widget.WIDGET_ID, CCi18n.t('ns.orderhistory:resources.orderStatesListingErrorText'));
        widget.populateDefaultOrderStates();
      },

      /**
       * Gets order states
       * if the submitted order in queued, the state/value will be appended with the key
       * Otherwise returns the default values
       */
      getStateLabel: function (pKey) {
        return pKey == CCConstants.QUEUED_ORDER_KEY ? CCi18n.t('ns.common:resources.' + pKey) + ' (' + pKey + ')'
          : CCi18n.t('ns.common:resources.' + pKey);
      },

      /**
       * Set order states to default values
       */
      populateDefaultOrderStates: function () {
        var widget = this;
        widget.availableStatuses([
          new widget.Status(CCi18n.t('ns.common:resources.ALL'), []),
          new widget.Status(CCi18n.t('ns.common:resources.SUBMITTED'), ["SUBMITTED"]),
          new widget.Status(CCi18n.t('ns.common:resources.PROCESSING'), ["PROCESSING"]),
          new widget.Status(CCi18n.t('ns.common:resources.NO_PENDING_ACTION'), ["NO_PENDING_ACTION"])
        ]);
      }
    };
  }
);
