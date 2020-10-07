define(

  // -------------------------------------------------------------------
  // DEPENDENCIES
  // -------------------------------------------------------------------
  [ 'knockout', 'CCi18n', 'ccConstants' ],

  // -------------------------------------------------------------------
  // MODULE DEFINITION
  // -------------------------------------------------------------------
  function(ko, CCi18n, ccConstants) {

    "use strict";

    return {
      claimedCouponMultiPromotions: ko.observableArray([]),
      implicitPromotionList: ko.observableArray([]),
      newPromotion: function(promotionDesc, promotionId, promotionLevel, totalAdjustment, promotionApplied) {
        var blankPromotion = new Object();
        blankPromotion.promotionDesc = promotionDesc?promotionDesc:'';
        blankPromotion.promotionId = promotionId?promotionId:'';
        blankPromotion.promotionLevel = promotionLevel?promotionLevel:'';
        blankPromotion.totalAdjustment = totalAdjustment?totalAdjustment:'0';
        blankPromotion.promotionApplied = promotionApplied?promotionApplied:false;
        return ko.mapping.fromJS(blankPromotion);
      },
      addToClaimedCouponMultiPromotions: function(coupon,widget) {
        var couponFound = false;
        for(var j = 0; j<widget.claimedCouponMultiPromotions().length; j++) {
          if(coupon.coupon == widget.claimedCouponMultiPromotions()[j].couponCode()) {
            widget.claimedCouponMultiPromotions()[j].promotions.push(widget.newPromotion(coupon.promotionDesc, coupon.promotionId, coupon.promotionLevel, coupon.totalAdjustment, true));
            couponFound = true;
            break;
          }
        }
        if(!couponFound) {
          var newCoupon = new Object()
          var promotionList = [];
          promotionList.push(widget.newPromotion(coupon.promotionDesc, coupon.promotionId, coupon.promotionLevel, coupon.totalAdjustment, true));
          newCoupon.couponCode = coupon.coupon;
          newCoupon.staus = ccConstants.COUPON_STATUS_CLAIMED;
          newCoupon.promotions = promotionList;
          widget.claimedCouponMultiPromotions.push(ko.mapping.fromJS(newCoupon));
        }
      },
      addToImplictDiscountList: function(coupon,widget) {
        widget.implicitPromotionList.push(widget.newPromotion(coupon.promotionDesc, coupon.promotionId, coupon.promotionLevel, coupon.totalAdjustment, true));
      },
      populatePromotions: function(coupons,widget) {
        if(coupons) {
          for(var i=0; i<coupons.length; i++) {
            if(coupons[i].hasOwnProperty("coupon")) {
              widget.addToClaimedCouponMultiPromotions(coupons[i],widget);
            } else {
              widget.addToImplictDiscountList(coupons[i],widget);
            }
          }
        }
      },
      onLoad : function(widget) {

        //Secondary currency for the order being displayed
        widget.secondaryCurrency = ko.observable(null);

        widget.showSecondaryShippingData = ko.pureComputed(function(){
          return widget.confirmation().payShippingInSecondaryCurrency &&
                   (null != widget.secondaryCurrency());
        });

        widget.showSecondaryTaxData = ko.pureComputed(function(){
          return widget.confirmation().payTaxInSecondaryCurrency &&
                   (null != widget.secondaryCurrency());
          
        });

        widget.isGiftCardUsed = ko.computed(
          function() {
            var payments = widget.confirmation().payments;
            if (typeof(payments) != 'undefined' && payments != null){
              for ( var i = 0; i < payments.length; i++) {
                if (payments[i].paymentMethod == ccConstants.GIFT_CARD_PAYMENT_TYPE) {
                  return true;
                }
              }
            }
            
            return false;
          }, widget);

        widget.totalAmount = ko.computed(
          function() {
            var payments = widget.confirmation().payments;
            if (typeof(payments) != 'undefined' && payments != null){
              for ( var i = 0; i < payments.length; i++) {
                if (payments[i].isAmountRemaining
                    && payments[i].paymentMethod != ccConstants.GIFT_CARD_PAYMENT_TYPE) {
                  return payments[i].amount;
                }
              }
            }
            return 0;
          }, widget);
      },

      beforeAppear: function (page) {
        var widget = this;
        $.when (widget.site().siteLoadedDeferred).done(function() {
          var secondaryCurrency = widget.site().getCurrency(widget.confirmation().secondaryCurrencyCode);
          if (widget.secondaryCurrency() || secondaryCurrency) {
            if (widget.secondaryCurrency() && secondaryCurrency && (widget.secondaryCurrency().currencyCode == secondaryCurrency.currencyCode)) {
              return;
            }
            widget.secondaryCurrency(secondaryCurrency);
          }
        });
        widget.claimedCouponMultiPromotions.splice(0);
        widget.implicitPromotionList.splice(0);
        widget.populatePromotions(widget.confirmation().discountInfo.orderDiscountDescList,widget);
      },
    };
  });
