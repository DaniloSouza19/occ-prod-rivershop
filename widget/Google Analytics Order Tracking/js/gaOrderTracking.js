/**
 * @fileoverview Google Analytics Order Tracking Widget.
 *
 * @author 
 */
define(
    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'ccRestClient', 'ccConstants'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, pubsub,ccRestClient,CCConstants) {
        "use strict";
        var widgetModel;

        /**
         * Initialize the widget properties.
         * @private
         * @param {Object} The widget model object
         */
        var initVars = function(widget) {
            widgetModel = widget;
        };

        var prodResponse;
        var gsOrderTrackingFunc = function gsOrderTracking(widget) {
            console.log("Inside Order Object function");
            console.log("widget "+Object.getOwnPropertyNames(widget));
            console.log("cart "+Object.getOwnPropertyNames(widget.cart()));
            
            if (widget.confirmation()) {
				var trackingId = widget.gaTrackingID();
                var orderObj = widget.confirmation();
                var coupons = "";
                var promotionsListLength = orderObj.discountInfo.orderDiscountDescList.length;
                if(promotionsListLength === 1){
                    coupons = orderObj.discountInfo.orderDiscountDescList[0].coupon;
                }else{
                    for(var j = 0; j < promotionsListLength; j++){
                        if(orderObj.discountInfo.orderDiscountDescList[0].promotionLevel != 'item'){
                            coupons = coupons +orderObj.discountInfo.orderDiscountDescList[j].coupon + ",";
                        }
                    }
                }
                var addProductsString = "";
                var itemsLength = orderObj.shoppingCart.items.length;
                    for (var i = 0; i < itemsLength; i++) {
                        var id = orderObj.shoppingCart.items[i].productId;
                        var name = orderObj.shoppingCart.items[i].displayName;
                        var variant = orderObj.shoppingCart.items[i].catRefId;
                        var price = orderObj.shoppingCart.items[i].price;
                        var quantity = orderObj.shoppingCart.items[i].quantity;
                        var productDiscountList = orderObj.shoppingCart.items[i].discountInfo;
                        var productDiscountListLength = productDiscountList.length;
                        var prodCoupons = "";
                        ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_GET_PRODUCT,null,pSuccessFunc,pErrorFunc,id);
                        if(productDiscountListLength === 1){
                            prodCoupons = orderObj.discountInfo.orderDiscountDescList[0].coupon;
                        }else{
                            for(var k = 0; k < productDiscountListLength; k++){
                            prodCoupons = prodCoupons +orderObj.discountInfo.orderDiscountDescList[k].coupon + ",";
                            }
                        }
                        var gaProductsString = "ga('ec:addProduct', {'id': '"+id+"', 'name': '"+name+"','variant': '"+variant+"','price': '"+price+"','quantity': "+quantity+", 'coupon' : '"+prodCoupons+"'});"
                    addProductsString = addProductsString + gaProductsString;
                    }
                coupons = coupons.replace(prodCoupons,"");
                var printingObj = "<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');ga('create', '" + trackingId + "', 'auto');ga('require', 'ec');"+addProductsString+";ga('ec:setAction', 'purchase'," + "{ id : '" +orderObj.id+"', affiliation : 'Cloud Commerce', revenue : '"+orderObj.priceInfo.total+"', shipping : '"+orderObj.priceInfo.shipping+"', tax : '"+orderObj.priceInfo.tax+ ", coupon : '"+coupons+"'});ga('send', 'pageview');</script>";
                console.log("Text getting appended " + printingObj);
                $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');ga('create', '" + trackingId + "', 'auto');ga('require', 'ec');"+addProductsString+"ga('ec:setAction', 'purchase'," + "{ id : '" +orderObj.id+"', affiliation : 'Cloud Commerce', revenue : '"+orderObj.priceInfo.total+"', shipping : '"+orderObj.priceInfo.shipping+"', tax : '"+orderObj.priceInfo.tax+ "', coupon : '"+coupons+"'});ga('send', 'pageview');</script>");
            } else {
                setTimeout(gsOrderTracking(widget), 250);
            }
        }
        
        var pSuccessFunc = function(pResult){
            prodResponse = pResult;
            console.log("success pResult "+JSON.stringify(pResult));
        }
        
        var pErrorFunc = function(pResult){
            console.log("failure pResult "+pResult);
        }
        
        return {
            onLoad: function(widget) {
                if (widget.confirmation()) {
                    console.log(widget);
                    initVars(widget);
                }
            },
            
            beforeAppear: function(page) {
                var widget = this;
                console.log("Page is " + page);
                console.log("Page ID is " + page.pageId);
                if (page.pageId == "confirmation") {
                    console.log("Page COnfirmation reached");
                    gsOrderTrackingFunc(widget);
                }

            },
        }
    }
);
