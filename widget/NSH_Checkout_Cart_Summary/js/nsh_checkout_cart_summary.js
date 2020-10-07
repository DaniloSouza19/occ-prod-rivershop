/**
 * @fileoverview Checkout Cart Summary Widget. 
 * 
 */
/*global $ */
/*global define */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'ccLogger', 'CCi18n','notifier', 'ccConstants'], 
  
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, log, CCi18n, notifier, CCConstants) {
  
    "use strict";
  
    return {
      onLoad: function(widget) {
        widget.noOfItemsToDisplay(parseInt(widget.noOfItemsToDisplay()));
        // Checks if the cart is editable for the order.
        widget.isCartEditable = function() {
          if (widget.cart().currentOrderId() && ((widget.cart().currentOrderState() == CCConstants.QUOTED_STATES)||(widget.cart().currentOrderState() == CCConstants.PENDING_PAYMENT)||(widget.cart().currentOrderState() == CCConstants.PENDING_PAYMENT_TEMPLATE) )) {
            return false;
          }
          return true;
        };
      }
    }; 
  }
);
