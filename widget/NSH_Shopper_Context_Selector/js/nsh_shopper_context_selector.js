/**
 * @fileoverview Shopper Context Selector.
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'ccConstants','notifier', 'CCi18n', 'storageApi',
 'viewModels/shopperContext'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------

  function(ko, pubsub, CCConstants, notifier, CCi18n, storageApi,
ShopperContext) {
    "use strict";
    return {
      WIDGET_ID:
        "shopperContextSelector",
      isReady: ko.observable(false),
      onLoad: function(widget) {
        var self = this;
        widget.shopperContextViewModel = ko.observable();
        widget.shopperContextViewModel(ShopperContext.getInstance());
        widget.shopperContextViewModel().
           getOrderDynamicPropertiesWithDefaultValues();
        $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(){
          widget.shopperContextViewModel().populatePLGandCatalogData();
             });
        $.Topic(pubsub.topicNames.USER_LOGOUT_SUCCESSFUL).subscribe(function(){
          widget.isReady(false);
          window.location.reload();
        });
      },
      beforeAppear:function(page) {
        var widget = this;
        if (widget.user().loggedIn() != false) {
          widget.isReady(true);
        }else{
          widget.isReady(false);
        }
      },
   // Click handler for the Load Context button
      handleLoadContext: function (viewModel, event) {
        var widget = this;
        widget.shopperContextViewModel().populatePLGandCatalogData();
      },
     };
   }
);