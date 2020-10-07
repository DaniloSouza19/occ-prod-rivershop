/**
 * @fileoverview spaceContentWidget
 *
 */
/*global window: false */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub', 'notifier', 'ccLogger', 'ccRestClient', 
     'swmRestClient', 'ccConstants', 'CCi18n', 'moment', 'spinner', 'ccDate', 
     'viewModels/wishlistContentViewModel', 'pageLayout/site'],
  
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($, ko, PubSub, notifier, logger, ccRestClient, swmRestClient, 
      CCConstants, CCi18n, moment, spinner, ccDate, WishlistContentViewModel, SiteViewModel) {
  
    "use strict";
  
    var NO_IMAGE_IMG = "/images/stockuserprofileimage000.png";
    var NO_LONGER_MEMBER_PROFILE_IMG = "/images/nolongermemberprofileimage.png";
    var WIDGET_ID = "nsh_wishlist_content";
    var currDeleteContentID = -1;
    var currDeleteContentIndex = -1;
    var currDeleteParentContentID = -1;
    
    var PARAM_SWM_CONSTANTS_SORT = 'orderBy';
    
    var mySpacesComparator = function(opt1, opt2) {
      if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
        return 1;
      } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
        return -1;
      } else {
        return 0;
      }
    };
    var joinedSpacesComparator = function(opt1, opt2) {
      if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
        return 1;
      } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
        return -1;
      } else {
        return 0;
      }
    };
  
    return {
      editingPost : ko.observable(false),
      spaceContentData: ko.observableArray([]),
      currentUserFullName: ko.observable(),
      currentUserMediaUrl: ko.observable(),
      allowPost: ko.observable(false),
      currentUserIsSpaceOwner : ko.observable(false),
      editQuantityCurrVal : ko.observable(),
      editPriorityCurrVal : ko.observable(),
      editPriorityContentId : ko.observable(),
      // observable to keep track of products added to cart for temporary button disabling
      clickedAddToCartProducts : ko.observableArray(),
      deletedProducts : ko.observableArray(),
      //observable to keep track of null priced Product
      nullPricedProducts : ko.observableArray(),
      unavailableSKUContentIds : ko.observableArray(),
      
      spaceOptionsArray: ko.observableArray([]),
      myOwnedWishLists: ko.observableArray([]),
      myJoinedWishLists: ko.observableArray([]),
      destinationSpaceId: ko.observable(''),
      moveProductProductId: ko.observable(''),
      moveProductContentId: ko.observable(''),
      moveProductContentTitle: ko.observable(''),
      moveProductNotificationPrice: ko.observable(''),
      moveProductTargetSpaceName: ko.observable(''),
      moveProductTargetSpaceLink: ko.observable(''),
      moveCreateSpaceName: ko.observable(''),
      errBadRequestSpaceName: ko.observable(false),
      moveNewSpaceAccessLevel: ko.observable("0"),
      listType: ko.observable(),


      addContainer: function(elemento) {
        $(elemento).parent().parent().parent().addClass("container");
      
      },
      
      /**
       * Runs the first time the module is loaded on a page.
       * It is passed the widgetViewModel which contains the configuration from the server.
       */
      onLoad : function(widget) {
  
        widget.wishlistContentViewModel = ko.observable();
        widget.wishlistContentViewModel(new WishlistContentViewModel(widget));
        
        // declare hosts so they can be accessed from template
        widget.swmhostbaseurl = swmRestClient.swmhost;
        widget.swmhostbaseurl = widget.swmhostbaseurl + "/swm";
  
        widget.productDesiredPriorityOpts = ['', '1', '2', '3'];
  
        widget.currentPosts = ko.computed(function() {
          var posts = widget.spaceContentData();
          return posts;
        }, this);
  
        widget.resultsText = ko.computed(function(){
          return widget.wishlistContentViewModel().resultsText();  
        },widget.wishlistContentViewModel());
        
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).subscribe(function(obj) {
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          widget.resetWidget();
          widget.wishlistContentViewModel().load(false, 1);
          widget.getSpaces();
          if(widget.space().isMember(swmRestClient.apiuserid) || widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.allowPost(true);
            widget.currentUserMediaUrl(widget.space().ownerMediaUrl());
          }
          else {
            widget.allowPost(false);
          }
          widget.wishlistContentViewModel().resetSortOptions();
        });
        
        $.Topic(PubSub.topicNames.SOCIAL_USER_GET_SPACES_SUCCESS).subscribe(function(obj){
          widget.getSpaces();
        });
  
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_UNAVAILABLE).subscribe(function(obj) {
            notifier.clearSuccess(widget.WIDGET_ID);
            notifier.clearError(widget.WIDGET_ID);
            widget.resetWidget();
        });
  
        $.Topic(PubSub.topicNames.USER_LOGOUT_SUBMIT).subscribe(function(obj){
          widget.currentUserIsSpaceOwner(false);
          widget.allowPost(false);
          
          // clear dynamically created observables in content (if they're permission based)
          ko.utils.arrayForEach(widget.spaceContentData(), function(contentObj) {
            contentObj.isContentPostCreator(false);
            contentObj.replyTextBoxValue('');
            contentObj.editingPost(false);
            if (contentObj.replies.length > 0) {
              ko.utils.arrayForEach(contentObj.replies, function(contentReplies) {
                contentReplies.editingPost(false);
                contentReplies.isContentReplyCreator(false);
              });
            }
          });
        });
  
        $.Topic(PubSub.topicNames.SOCIAL_CURRENT_USER).subscribe(function(obj){
          widget.currentUserFullName(obj.currentUserFullName);
          widget.currentUserMediaUrl(obj.currentUserMediaUrl);
          //allow posting comments or replies?
          if(widget.space().isMember(swmRestClient.apiuserid) || widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.allowPost(true);
          }
          else {
            widget.allowPost(false);
          }
          //allow edit priority and cquantity
          if(widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.currentUserIsSpaceOwner(true);
            widget.currentUserMediaUrl(widget.space().ownerMediaUrl());
          }
        });
  
        $.Topic(PubSub.topicNames.SOCIAL_POST_MESSAGE).subscribe(function(obj) {
          widget.wishlistContentViewModel().load(false, 1);
        });
        
        // Test event handler for product post successfully deleted
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_PRODUCT_REMOVED).subscribe(function(deletedProductEventData){
          //alert("SOCIAL_SPACE_PRODUCT_REMOVED: SpaceId="+deletedProductEventData.spaceId+" ProductName="+deletedProductEventData.productName+" ProductId="+deletedProductEventData.productId);
          var test = deletedProductEventData;
        });
             
        // Test event handler for product post successfully moved
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_PRODUCT_MOVED).subscribe(function(movedProductEventData){
          //alert("SOCIAL_SPACE_PRODUCT_MOVED: FromSpaceId="+movedProductEventData.fromSpaceId+" ToSpaceId="+movedProductEventData.toSpaceId+" ProductName="+movedProductEventData.productName+" ProductId="+movedProductEventData.productId);
          var test = movedProductEventData;
        });
        
        widget.addSpaceValidation();
  
        var sortOptions = [{
          "id": "default",
          "displayText": CCi18n.t("ns.nsh_wishlist_content:resources.sortByDateAddedText"),
          "order": ko.observable("none"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "priority",
          "displayText": CCi18n.t("ns.nsh_wishlist_content:resources.sortByPriorityHighToLowText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }];
        
        if (widget.wishlistContentViewModel().sortOptions().length == 0) {
          widget.wishlistContentViewModel().sortOptions(sortOptions);
          widget.wishlistContentViewModel().resetSortOptions();
        }
      },
  
      /**
       * Load data for logged in swm user
       */
      loadUserData : function() {
        var widget = this;
  
        var successCB = function(result) {
          if (result.response.code.indexOf("200") === 0) {
            if (result.mediaUrl) {
              widget.userMediaURL(result.mediaUrl);
            }
          }
        };
  
        var errorCB = function(err) {};
  
        swmRestClient.request('GET', '/swm/rs/v1/spaces/{spaceid}/members/{userid}', '', successCB, errorCB, {
          "spaceid" : widget.space().id(),
          "userid" : swmRestClient.apiuserid
        });
      },
      /**
       * Show the spinner
       */
      spinnerShow : function() {
        var widget = this;
        var loadingOptions = {
          parent : '#SWM-space-content',
          posTop : '15px'
        };
        spinner.create(loadingOptions);
        
      },
      /**
       * Hide the spinner
       */
      spinnerHide : function() {
        var widget = this;
        // Before closing the spinner, notify ko subscribers that the underlying array of spaceContentData observable array has changed.
        widget.spaceContentData.valueHasMutated();
        spinner.destroy();
      },
      
      /**
       * Retrieve list of spaces for a user
       */
      getSpaces : function() {
        var widget = this;
        var groups = [];
        var myLists = [];
        myLists = myLists.concat(widget.user().myWishLists());
        var joinedLists = [];
        joinedLists = joinedLists.concat(widget.user().joinedWishLists());
        
        myLists.every( function(mySpace, index, array) {
          if (mySpace.spaceid == widget.space().id()) {
            myLists.splice(index, 1);
            return false;
          }
          return true;
        });
        
        joinedLists.every( function(joinedSpace, index, array) {
          if (joinedSpace.spaceid == widget.space().id()) {
            joinedLists.splice(index, 1);
            return false;
          }
          else {
            if (joinedSpace.spaceNameFormatted().length > 42) {
              joinedSpace.spaceNameAbbr += "...";
            }
            else {
              joinedSpace.spaceNameAbbr = joinedSpace.spaceNameFormatted;
            }
          }
          return true;
        });
        
        widget.myOwnedWishLists(myLists);
        widget.myJoinedWishLists(joinedLists);
  
        var mySpacesGroup = {
          label: widget.translate('mySpacesGroupText'),
          children: myLists,
          canBeHidden: true
        };
        var joinedSpacesGroup = {
          label: widget.translate('joinedSpacesGroupText'),
          children: joinedLists,
          canBeHidden: true
        };
  
        var createOptions = [];
        var createNewOption = {
          spaceid: "createnewspace",
          spaceNameFormatted: ko.observable(widget.translate('createNewSpaceOptText')),
          spaceNameAbbr: ko.observable(widget.translate('createNewSpaceOptText'))
        };
        
        createOptions.push(createNewOption);
        var createNewSpaceGroup = {label: "", children: ko.observableArray(createOptions), canBeHidden: false};
  
        groups.push(mySpacesGroup);
        groups.push(joinedSpacesGroup);
        groups.push(createNewSpaceGroup);
        widget.spaceOptionsArray(groups);
      },
      /* widget sort callback */
      sortingCallback : function(evt) {
        var widget = this;
        // Clear wishlist posts on sort
        widget.spaceContentData([]);
      },
      /**
       * Load all posts and comments for a space
       */
      loadSpaceContentData : function(startingIndex, doClear) {
        var widget = this;
        var viewModel = widget.wishlistContentViewModel();
        
        // clear observable arrays
        widget.deletedProducts = ko.observableArray();
        widget.nullPricedProducts = ko.observableArray();
        
        var nameValues = "";
        nameValues += CCConstants.OFFSET + '=' + startingIndex;
        nameValues += '&' + CCConstants.LIMIT + '=' + viewModel.blockSize;
        if (viewModel.sortDirectiveProp() === 'default') {
          nameValues += '&' + PARAM_SWM_CONSTANTS_SORT + '=' + 'dateadded' + ":" + 'desc';
        }
        else {
          nameValues += '&' + PARAM_SWM_CONSTANTS_SORT + '=' + viewModel.sortDirectiveProp() + ":" + viewModel.sortDirectiveOrder();
        }
           
        
        swmRestClient.request('GET', '/swm/rs/v1/spaces/{spaceid}/content?' + nameValues,
            '', 
            function(result) {
              widget.wishlistContentViewModel().successFunc(result); 
              widget.loadSpaceContentDataSuccessCB(doClear); 
              }, 
            function(err) { 
                widget.wishlistContentViewModel().errorFunc(err); 
                widget.loadSpaceContentDataErrorCB(err); 
              },
            { "spaceid" : widget.space().id() }
         );
      },
      
      loadSpaceContentDataSuccessCB : function(doClear) {
        var widget = this;
        
        var startPosition = (widget.wishlistContentViewModel().currentPage() - 1) * widget.wishlistContentViewModel().itemsPerPage;
        var endPosition = startPosition + widget.wishlistContentViewModel().itemsPerPage;
        var pageProducts = widget.wishlistContentViewModel().data.slice(startPosition, endPosition);
        
        var dataSet = [];
        var pProductIdList = new Array();
        
        if (pageProducts) {
          for (var i = 0; i < pageProducts.length; i++) {
            if (pageProducts[i] == undefined)
              continue;
            
            if (pageProducts[i].productProductId) {
              
              // product Ids are not unique, no need to ask for duplicates in availability request. 
              if ( $.inArray( pageProducts[i].productProductId, pProductIdList ) == -1 ) {
                pProductIdList.push(pageProducts[i].productProductId);  
              }
  
              // for products, save off swm product properties as backup if cc product isn't available
              pageProducts[i].swmProductTitle = pageProducts[i].productTitle;
              pageProducts[i].swmProductPrice = pageProducts[i].productPrice;
              pageProducts[i].swmProductSalePrice = pageProducts[i].productSalePrice;
              pageProducts[i].swmProductCurrencyCode = pageProducts[i].productCurrencyCode;
              pageProducts[i].swmMediaUrl = pageProducts[i].mediaUrl;
              pageProducts[i].swmProductVariantOptions = pageProducts[i].productVariantOptions;
  
              // clear existing values
              pageProducts[i].productTitle = '';
              pageProducts[i].productPrice = '';
              pageProducts[i].productSalePrice = '';
              pageProducts[i].productCurrencyCode = '';
              pageProducts[i].mediaUrl = '';
              pageProducts[i].productVariantOptions = '';
              pageProducts[i].stockAvailability = '';
              pageProducts[i].availabilityDate = '';
            }
  
            dataSet.push(widget.formatContentObj(pageProducts[i]));
          }
        }
       
        if (widget.spaceContentData().length == 0 || doClear)
          widget.spaceContentData([]);
        
        ko.utils.arrayPushAll(widget.spaceContentData(), dataSet);
        widget.spaceContentData.valueHasMutated();
  
        // request latest product info from CC for all products on page
        widget.fetchCCProducts(pageProducts, true, widget.fetchCCAvailabilityforProducts.bind(widget, pProductIdList));
      },
  
      /**
       * Fetch product availability for a list of productsIds
       */
      fetchCCAvailabilityforProducts : function(productIdList) {
        var widget = this;
        
        if (productIdList.length > 0) {
          var catalogId;
          if(ko.isObservable(widget.user) && widget.user() &&
             ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
            catalogId = widget.user().catalogId();
          }
  
          var productIdContainer = { "products" : productIdList, "catalogId" :  catalogId };
          
          ccRestClient.request( CCConstants.ENDPOINT_PRODUCTS_AVAILABILITY, productIdContainer, 
              widget.fetchCCAvailabilityforProductsSuccessCB.bind(widget), 
              widget.fetchCCAvailabilityforProductsErrorCB.bind(widget)
            );
        }    
      },
      
      /**
       * Fetch product availability error handler
       */
      fetchCCAvailabilityforProductsErrorCB : function() {
        var widget = this;
        widget.spinnerHide();
      },
      
      /**
       * Fetch product availability error handler
       */
      fetchCCAvailabilityforProductsSuccessCB : function(rProductAvailabilitySkuIdList) {
        var widget = this;
  
        var spaceDataSet = widget.spaceContentData();
        
        for (var j=0; j < spaceDataSet.length; j++) {
          if (spaceDataSet[j].productProductId){ // is it a product post? if not, no need to process availability
            var skuFieldName = spaceDataSet[j].productSkuId;
            for(var k=0; k < rProductAvailabilitySkuIdList.length; k++){
              if (rProductAvailabilitySkuIdList[k][skuFieldName]) { // if found matching skuId 
                // Display price change text, if current price is different than originally added in wishlist price
                var localizedPriceChangeTextForSpaceContentItem = widget.getPriceChangeText(spaceDataSet[j]);
                spaceDataSet[j].productPriceChange(localizedPriceChangeTextForSpaceContentItem);
  
                if (widget.deletedProducts.indexOf(spaceDataSet[j].contentId) == -1 && widget.unavailableSKUContentIds.indexOf(spaceDataSet[j].contentId) == -1) {
                  var stock = rProductAvailabilitySkuIdList[k][skuFieldName];
                  var date = rProductAvailabilitySkuIdList[k].productSkuInventoryDetails[0].availabilityDate;
                  //adding availability date if available in inventory mainly for backorder and preorder
                  spaceDataSet[j].availabilityDate(date);
                  if (stock == "IN_STOCK" || ((stock == "BACKORDERABLE" || stock == "PREORDERABLE") && widget.cart().isPreOrderBackOrderEnabled)) {
                    if (stock == "IN_STOCK") {
                      spaceDataSet[j].stockAvailability(widget.translate('productInStock'));
                    } else if (stock == "BACKORDERABLE") {
                      spaceDataSet[j].stockAvailability(widget.translate('productBackorderable'));
                    } else if (stock == "PREORDERABLE") {
                      spaceDataSet[j].stockAvailability(widget.translate('productPreorderable'));
                    }
                    if(widget.nullPricedProducts.indexOf(spaceDataSet[j].contentId) == -1) {
                      spaceDataSet[j].showAddToCartBtn(true);
                    }
                  }
                  else {
                    spaceDataSet[j].stockAvailability(widget.translate('productOutOfStock'));
                    spaceDataSet[j].showAddToCartBtn(false);
                  }
                }
                break;
              }  
            }
          }        
        }
  
        widget.spinnerHide();
      },
      
      loadSpaceContentDataErrorCB : function(err) {
        var widget = this;
        widget.spinnerHide();  
      },
  
      /**
       * Return localized price change string for a content
       * Calculation is based off of the SWM Price (CC price when added to wishlist) vs current CC Price
       */
      getPriceChangeText : function (pSpaceContent) {
        var widget = this;
        // compute price change since added active price and added price
        var res = "";
        
        var productActivePrice = pSpaceContent.productPrice();
        if (pSpaceContent.productSalePrice()) {
          productActivePrice = pSpaceContent.productSalePrice();
        }
        //SC-4525: productActivePrice is empty so, the product/sku is either deleted or not Active, therefore, just return empty string.
        if (productActivePrice == '' || productActivePrice == null) {
          return res;
        }
  
        var swmProductActivePrice = pSpaceContent.swmProductPrice;
        if (pSpaceContent.swmProductSalePrice != '') {
          swmProductActivePrice = pSpaceContent.swmProductSalePrice;
        }
  
        var priceChange = 0;
        if (Number(productActivePrice) > Number(swmProductActivePrice)) {
          var nsText = 'ns.nsh_wishlist_content:resources.productPriceChangeIncreasedText';
          priceChange = Number(productActivePrice) - Number(swmProductActivePrice);
        }
        else if (Number(productActivePrice) < Number(swmProductActivePrice)) {
          var nsText = 'ns.nsh_wishlist_content:resources.productPriceChangeDecreasedText';
          priceChange = Number(swmProductActivePrice) - Number(productActivePrice);
        }
  
        if (priceChange != 0) {var currencyObj = widget.site().selectedPriceListGroup().currency;
          var currencySymbol = widget.site().selectedPriceListGroup().currency.symbol;
          var formattedPriceChange = widget.formatPrice(priceChange, widget.site().selectedPriceListGroup().currency.fractionalDigits);
          if (currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
            currencySymbol = currencySymbol + ' ';
          }
          res = CCi18n.t(nsText, { currencysymbol: currencySymbol, pricechange: formattedPriceChange });
        }
        return res;
      },
      /**
       * add swmContentId to Deleted content collection, prevents duplicate swmContentIds being added.
       */
      addToDeletedProductsContentIds : function(swmContentId) {
        var widget = this;
        if (widget.deletedProducts.indexOf(swmContentId) == -1){
          widget.deletedProducts.push(swmContentId);  
        }
      },
      /**
       * add swmContentId to null Priced Products content collection, prevents duplicate swmContentIds being added.
       */
      addToNullPricedProductsContentIds : function(swmContentId) {
        var widget = this;
        if (widget.nullPricedProducts.indexOf(swmContentId) == -1){
          widget.nullPricedProducts.push(swmContentId);
        }
      },
  
      /**
       * add swmContentId to Unavailable sku content collection, prevents duplicate swmContentIds being added.
       */
      addToUnavailableSKUContentIds : function(swmContentId) {
        var widget = this;
        if (widget.unavailableSKUContentIds.indexOf(swmContentId) == -1){
          widget.unavailableSKUContentIds.push(swmContentId);
        }
      },
      /**
       * Refresh the information for the products on the spaces page by retrieving
       * the latest product data from the CC storefront.  Display SWM product content
       * data if product/sku is not available, or not displayable.
       */
      fetchCCProducts : function(content, updateAll, callback) {
        var widget = this;
  
        if (content.length > 0) {
          
          var catalogId;
          if(ko.isObservable(widget.user) && widget.user() &&
             ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
            catalogId = widget.user().catalogId();
          }
  
          var productIdList = new Array();
          var productSkuIdList = new Array();
          
          for (var i = 0; i < content.length; i++) {
  
            // only update products
            if (!content[i].productProductId)
              continue;
  
            productIdList.push(content[i].productProductId);
            productSkuIdList.push(content[i].productSkuId);
          }
  
          // show the spinner in desktop view only to avoid flashing in infinite scroll mobile
          if (widget.wishlistContentViewModel().viewportMode() == CCConstants.TABLET_VIEW ||
              widget.wishlistContentViewModel().viewportMode() == CCConstants.DESKTOP_VIEW ||
              widget.wishlistContentViewModel().viewportMode() == CCConstants.LARGE_DESKTOP_VIEW) {
            if (productIdList.length > 0 && updateAll){
              widget.spinnerShow();
            }
          }
          
          //TODO EVALUATE REFACTOR error callback for 2nd try
          // error callback
          var fetchCCProductsErrorCB = function(errorData) {
            var modifiedProductIdList = productIdList.slice(0);
            var modifiedSkuIdList = productSkuIdList.slice(0);
            var dataSet = widget.spaceContentData();
  
            if(errorData.errors) {
              // Remove the productIds and skuIds that caused error, and send the any remaining productIds to retry request
              for (var i=0; i<errorData.errors.length; i++) {
                if (errorData.errors[i].errorCode == "20031") {
                  var prodId = errorData.errors[i].moreInfo;
                  var deletedProductIndex = modifiedProductIdList.indexOf(prodId);
                  if (deletedProductIndex > -1) {
                    modifiedProductIdList.splice(deletedProductIndex, 1);
                    modifiedSkuIdList.splice(deletedProductIndex, 1);
                    for (var j=0; j < dataSet.length; j++) {
                      if (dataSet[j].productProductId == prodId) {
                        var cloneOrigSWMProductContentObj = $.extend(true, {}, dataSet[j]);
                        cloneOrigSWMProductContentObj.productTitle(dataSet[j].swmProductTitle);
                        cloneOrigSWMProductContentObj.productPrice('');
                        cloneOrigSWMProductContentObj.productSalePrice('');
                        cloneOrigSWMProductContentObj.productCurrencyCode('');
                        cloneOrigSWMProductContentObj.mediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
                        cloneOrigSWMProductContentObj.productVariantOptions(dataSet[j].swmProductVariantOptions);
                        cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productUnavailable'));
                        cloneOrigSWMProductContentObj.availabilityDate('');
                        cloneOrigSWMProductContentObj.showAddToCartBtn(false);
                        widget.addToDeletedProductsContentIds(dataSet[j].contentId);
                        if (j == 0) {
                          widget.space().spaceProductMediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
                        }
  
                        
                        widget.spaceContentData()[j] = cloneOrigSWMProductContentObj;
                      }
                    }
                  }
                }
              }  
            }
            
            var fetchCCProductsSecondTryErrorCB = function(){
              // Error on 2nd try is not recoverable, just hide the spinner if spinner is active, and update UI.
              widget.spinnerHide();
            };
  
            // Re-try the request to fetch the desired list of products, with deleted products removed
            if (modifiedProductIdList.length > 0) {
              var productIdContainer = { "productIds" : modifiedProductIdList };
         productIdContainer[CCConstants.INCLUDE_CKILD_SKUS_LISTING_IDS] = true;
              productIdContainer[CCConstants.STORE_PRICELISTGROUP_ID] = SiteViewModel.getInstance().selectedPriceListGroup().id;
              ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS, productIdContainer, 
                  widget.fetchCCProductsSuccessHandler.bind(widget, updateAll, modifiedSkuIdList, callback), 
                  fetchCCProductsSecondTryErrorCB
                );
            }
            else {
              // End of processing cycle, no more products to query, update UI and hide spinner.
              widget.spinnerHide();
            }
          };
  
          // make the request to fetch the desired list of products
          if (productIdList.length > 0) {
            var productIdContainer = { "productIds" : productIdList };
       productIdContainer[CCConstants.INCLUDE_CKILD_SKUS_LISTING_IDS] = true;
            productIdContainer[CCConstants.STORE_PRICELISTGROUP_ID] = SiteViewModel.getInstance().selectedPriceListGroup().id;
            
            ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS, productIdContainer, 
                widget.fetchCCProductsSuccessHandler.bind(widget, updateAll, productSkuIdList, callback), 
                fetchCCProductsErrorCB
              );
          }
          else {
            // End of processing cycle, no more products to query, update UI and hide spinner.
            widget.spinnerHide();
          }
        }
      },
      
      /**
       * construct the well-formed ccHost url that can be passed to Social services.  
       */
      constructCCHostRoute: function() {
        var result;
        var protocol = window.location.protocol;
        var host = window.location.host;
        var siteBaseUrl = "";
        if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
          siteBaseUrl = window.siteBaseURLPath; 
        }
        result = protocol + "//" + host + siteBaseUrl;
        return result;  
      },
      
      /**
       * Success handler for fetch CC products
       */
      fetchCCProductsSuccessHandler : function(updateAll, productSkuIdList, callback, pResult) {
        
        var widget = this;
        
        var productTypeList = new Array();
        var dataSet = widget.spaceContentData();
  
        // for each product returned by CC
        for (var i=0; i < pResult.length; i++) {
          var productType;
          var productData = pResult[i];
          
          // determine product type and add to a list that will be used to make calls
          // to /productTypes/{id} to retrieve variant options labels for each product type
  
          if (productData.childSKUs.length > 0) {
            if (productData.childSKUs[0].dynamicPropertyMapLong) {
              var propType = Object.keys(productData.childSKUs[0].dynamicPropertyMapLong)[0];
  
              // we'll need to parse out the product type because CC doesn't provide it in its raw form
              if (propType) {
  
                // remove "sku-" prefix
                propType = propType.substring(4);
  
                for (var idx = propType.indexOf("_"); idx >= 0; idx = propType.indexOf("_", idx + 1)) {
                  productType = propType.substring(0, idx);
                  var prop = propType.substring(idx + 1);
                  if (productData.childSKUs[0][prop]) {
  
                    // store product type for future reference
                    productData.childSKUs[0].productType = productType;
  
                    // add it to our list of types to fetch
                    if (productTypeList.indexOf(productType) === -1) {
                      productTypeList.push(productType);
                    }
                    break;
                  }
                }
              }
            }
          }
  
          // update product properties (excluding variant options) for this product
          for (var j=0; j < dataSet.length; j++) {
            if (dataSet[j].productProductId == productData.id) {
              var cloneProductContentObj = $.extend(true, {}, dataSet[j]);
  
              var skuId = cloneProductContentObj.productSkuId;
              cloneProductContentObj.productType = productType;
  
              // determine if the CC product has the child SKU
              var foundCCChildSKU = false, skuMediaUrl = null;
              for (var k=0; k < productData.childSKUs.length; k++) {
                    if (productData.childSKUs[k].repositoryId == skuId) {
                      foundCCChildSKU = true;
                      if (productData.childSKUs[k].primarySmallImageURL == null) {
                        skuMediaUrl = widget.fetchSkuImageUrl(productData, skuId);
                      } else {
                        skuMediaUrl = productData.childSKUs[k].primarySmallImageURL;
                      }
  
                      break;
                    }
              }
  
              if (foundCCChildSKU) {
                // CC child sku exists, load CC version of product
                cloneProductContentObj.productType = productType;
                cloneProductContentObj.productTitle(productData.displayName);
                cloneProductContentObj.productUrl = {url: productData.route};
                var prodImageUrl = (productData.primarySmallImageURL == CCConstants.SITE_DEFAULT_NO_IMAGE_URL ? widget.site().noImageSrc() : skuMediaUrl);
                cloneProductContentObj.mediaUrl(prodImageUrl);
                if (j == 0){
                  widget.space().spaceProductMediaUrl(widget.constructCCHostRoute() + prodImageUrl);
                }
                
                widget.deletedProducts.remove(cloneProductContentObj.contentId);
                widget.unavailableSKUContentIds.remove(cloneProductContentObj.contentId);
                
                for (var k=0; k < productData.childSKUs.length; k++) {
                  if (productData.childSKUs[k].repositoryId == skuId) {
                    cloneProductContentObj.productPrice(productData.childSKUs[k].listPrice);
                    //if sku price is null hide addTo cart button
                    if(productData.childSKUs[k].listPrice == null){
                      cloneProductContentObj.showAddToCartBtn(false);
                      widget.addToNullPricedProductsContentIds(cloneProductContentObj.contentId);
                    } else {
                     //incase it is already there in the array remove it
                      widget.nullPricedProducts.remove(cloneProductContentObj.contentId);
                    }
                    if (productData.childSKUs[k].salePrice != null && Number(productData.childSKUs[k].salePrice) != Number.NaN) {
                      cloneProductContentObj.productSalePrice(productData.childSKUs[k].salePrice);
                    }
                    else {
                      cloneProductContentObj.productSalePrice('');
                    }
                    break;
                  }
                }
              }
              else {
                cloneProductContentObj.productTitle(cloneProductContentObj.swmProductTitle);
                cloneProductContentObj.productPrice('');
                cloneProductContentObj.productSalePrice('');
                cloneProductContentObj.productCurrencyCode('');
                cloneProductContentObj.mediaUrl(widget.swmhostbaseurl + cloneProductContentObj.swmMediaUrl);
                cloneProductContentObj.productVariantOptions(cloneProductContentObj.swmProductVariantOptions);
                cloneProductContentObj.stockAvailability(widget.translate('productUnavailable'));
                cloneProductContentObj.availabilityDate('');
                cloneProductContentObj.showAddToCartBtn(false);
                widget.addToUnavailableSKUContentIds(cloneProductContentObj.contentId);
                if (j == 0) {
                  widget.space().spaceProductMediaUrl(widget.swmhostbaseurl + cloneProductContentObj.swmMediaUrl);
                }
              }
  
              widget.spaceContentData()[j] = cloneProductContentObj;
            }
          }
        }
  
        if (updateAll) {
          // if any products were NOT updated in the loop above, then they weren't returned
          // in the CC productList call, either because the product is deleted or the product
          // is marked as not displayable;  update these products with SWM product data by default
          for (var j=0; j < dataSet.length; j++) {
            if (dataSet[j].productProductId && dataSet[j].productTitle() == '') {
              var cloneOrigSWMProductContentObj = $.extend(true, {}, dataSet[j]);
              cloneOrigSWMProductContentObj.productTitle(dataSet[j].swmProductTitle);
              cloneOrigSWMProductContentObj.productPrice('');
              cloneOrigSWMProductContentObj.productSalePrice('');
              cloneOrigSWMProductContentObj.productCurrencyCode('');
              cloneOrigSWMProductContentObj.mediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
              cloneOrigSWMProductContentObj.productVariantOptions(dataSet[j].swmProductVariantOptions);
              cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productUnavailable'));
              cloneOrigSWMProductContentObj.showAddToCartBtn(false);
              widget.addToDeletedProductsContentIds(dataSet[j].contentId);
              if (j == 0){
                widget.space().spaceProductMediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
              }
           
              widget.spaceContentData()[j] = cloneOrigSWMProductContentObj;
            }
          }
        }
        else if (pResult.length == 0){
          // only updating one product and it has been marked as not displayable
          for (var j=0; j < dataSet.length; j++) {
            //find the spaceContentDataItem by SKU ID, as productId is NOT unique
            if (dataSet[j].productProductId && dataSet[j].productSkuId == productSkuIdList[0]) {
              var cloneOrigSWMProductContentObj = $.extend(true, {}, dataSet[j]);
              cloneOrigSWMProductContentObj.productTitle(dataSet[j].swmProductTitle);
              cloneOrigSWMProductContentObj.productPrice('');
              cloneOrigSWMProductContentObj.productSalePrice('');
              cloneOrigSWMProductContentObj.productCurrencyCode('');
              cloneOrigSWMProductContentObj.mediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
              cloneOrigSWMProductContentObj.productVariantOptions(dataSet[j].swmProductVariantOptions);
              cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productUnavailable'));
              cloneOrigSWMProductContentObj.showAddToCartBtn(false);
              widget.addToDeletedProductsContentIds(dataSet[j].contentId);
  
              if (j == 0){
                widget.space().spaceProductMediaUrl(widget.swmhostbaseurl + dataSet[j].swmMediaUrl);
              }
  
              
              widget.spaceContentData()[j] = cloneOrigSWMProductContentObj;
              break;
            }
          }
        }
  
        // Update variant options for the products;
        // Make a /productTypes/{id} call for each productType
        if (productTypeList.length > 0) {
          for (var j=0; j < productTypeList.length; j++) {
            widget.fetchCCProductType( productTypeList[j], 
                 widget.fetchCCProductTypeSuccessCallback.bind(widget, productTypeList[j], pResult), 
                 widget.fetchCCProductTypeErrorCallback.bind(widget) );
          }
        }
  
        if (typeof callback === 'function'){
          callback();
        }
        
      },
      
      fetchCCProductTypeErrorCallback : function(error) {
        var widget = this;
        logger.warn('failed to load productType');  
      },
      
      fetchCCProductTypeSuccessCallback : function(productType, ccProducts, pResult) {
  
        var widget = this;
      
        var dataSet = widget.spaceContentData();
  
        // for each product on the page ...
        for (var k=0; k < dataSet.length; k++) {
  
          if (dataSet[k].productType == productType) {
            
            // add the productType variant options to the dataSet
            dataSet[k].variantOptions = pResult;
  
            // find the product in ccProducts that has the the same sku
            var dataItem = null;
            for (var kk=0; kk < ccProducts.length; kk++) {
              if (ccProducts[kk].repositoryId == dataSet[k].productProductId) {
                for (var jj=0; jj < ccProducts[kk].childSKUs.length; jj++) {
                  if (ccProducts[kk].childSKUs[jj].repositoryId == dataSet[k].productSkuId) {
                    dataItem = ccProducts[kk].childSKUs[jj];
                    break;
                  }
                }
              }
              if (dataItem != null) {
                // Item was found, no need to continue ccProducts iteration
                break;
              }
            }
  
            var jsonArray = [];
  
            // build the variant options if there are any present
            if (dataItem != null) {
              for (var kk=0; kk < dataSet[k].variantOptions.length; kk++) {
                // check if the product/sku has any matching variant options and if so, add
                if (dataItem[dataSet[k].variantOptions[kk].id]) {
                  var label = dataSet[k].variantOptions[kk].label;
                  var value = dataItem[dataSet[k].variantOptions[kk].id];
                  var json = {};
                  json.optionName = label;
                  json.optionValue = value;
                  jsonArray.push(json);
                }
              }
            }
  
            // update the variant options on the page
            if (jsonArray.length > 0) {
              dataSet[k].productVariantOptions(JSON.stringify(jsonArray));
            }
          }
        }
      },
      
      /**
       * Fetch product type data.
       */
      fetchCCProductType : function(productType, successCB, errorCB) {
        var widget = this;
  
        // success function
        var fetchCCProductTypeSuccessCB = function(pResult) {
          if (pResult.variants) {
            successCB(pResult.variants);
          }
        };
  
        // error function
        var fetchCCProductTypeErrorCB = function(pResult) {
          errorCB();
        };
  
        var url = CCConstants.ENDPOINT_ITEMTYPES_GET_PRODUCT_TYPE;
        ccRestClient.request(url, null, fetchCCProductTypeSuccessCB, fetchCCProductTypeErrorCB, productType);
      },
  
      /**
       * Given a REST content JSON response, sort replies and build content level bindings.
       */
      formatContentObj : function(contentResponse) {
        var widget = this;
  
        var contentObj = $.extend(true, {}, contentResponse);
        contentObj.dateCreatedEpoch = moment(contentResponse.dateCreated).valueOf();
        contentObj.dateCreated = widget.formatTS(contentObj.dateCreatedEpoch);
        contentObj.replyTextBoxValue = ko.observable('');
        contentObj.editingPost = ko.observable(false);
        contentObj.currency = widget.site().selectedPriceListGroup().currency;
  
        // if creator is space owner, tie media url to ownerMediaUrl in global scope.
        if (widget.space().isSpaceOwner(contentObj.creatorId)) {
          contentObj.creatorMediaUrl = widget.space().ownerMediaUrl;
          contentObj.creatorNotMember = ko.observable(false);
        }
        else {
          // if creator is still a member, then show stock image or creator's media url.
          if (widget.space().isMember(contentObj.creatorId))  {
            var cMediaUrl = contentObj.creatorMediaUrl ? contentObj.creatorMediaUrl : NO_IMAGE_IMG;
            contentObj.creatorMediaUrl = ko.observable(widget.swmhostbaseurl + cMediaUrl);
            contentObj.creatorNotMember = ko.observable(false);
          }
          // else creator is no longer a member
          else {
            contentObj.creatorMediaUrl = ko.observable(widget.swmhostbaseurl + NO_LONGER_MEMBER_PROFILE_IMG);
            contentObj.creatorNotMember = ko.observable(true);
          }
        }
  
        // define new observables for product properties
        if (contentObj.productProductId) {
          contentObj.productTitle = ko.observable(contentObj.productTitle);
          contentObj.productPrice = ko.observable(contentObj.productPrice);
          contentObj.productSalePrice = ko.observable(contentObj.productSalePrice);
          contentObj.productCurrencyCode = ko.observable(contentObj.swmProductCurrencyCode);
          contentObj.mediaUrl = ko.observable(contentObj.mediaUrl);
          contentObj.productVariantOptions = ko.observable(contentObj.productVariantOptions);
          contentObj.stockAvailability = ko.observable(contentObj.stockAvailability);
          contentObj.availabilityDate = ko.observable(contentObj.availabilityDate);
          contentObj.productUrl = {url: contentObj.productUrl};
          contentObj.showAddToCartBtn = ko.observable(false);
          contentObj.productPriceChange = ko.observable(contentObj.productPriceChange);
  
          contentObj.jsonProductVariantOptions = ko.computed(function() {
            var json = [];
            if (contentObj.productVariantOptions && contentObj.productVariantOptions().length > 0) {
              json = JSON.parse(contentObj.productVariantOptions());
            }
            return json;
          }, widget);
  
          // compute whether on sale based on value of productSalePrice
          contentObj.isOnSale = ko.computed(function() {
            var isOnSale = false;
            if (contentObj.productSalePrice() != "" && Number(contentObj.productSalePrice()) != Number.NaN) {
              isOnSale = true;
            }
            return isOnSale;
          }, widget);
  
          // compute savings based on productSalePrice and productPrice
          contentObj.priceSavings = ko.computed(function() {
            if (contentObj.productSalePrice() != "" && Number(contentObj.productSalePrice()) != Number.NaN) {
              return (Number(contentObj.productPrice()) - Number(contentObj.productSalePrice())).toFixed(2);
            }
            return '';
          }, widget);
  
          // compute percentage off based on productSalePrice and productPrice
          contentObj.productPercentageOff = ko.computed(function() {
            var percentOffText = '';
            if (contentObj.productSalePrice() != "" && Number(contentObj.productSalePrice()) != Number.NaN) {
              percentOffText = CCi18n.t(
                'ns.nsh_wishlist_content:resources.productSavingsPercentageText',
                {
                  percentagesaved: (((Number(contentObj.productPrice()) - Number(contentObj.productSalePrice())) / Number(contentObj.productPrice())) * 100).toFixed(0)
                }
              );
            }
            return percentOffText;
          }, widget);
  
  
  
        }
  
        //content with product desired and quantity options
        contentObj.productDesiredPriorityOpts = ['', '1', '2', '3'];
        contentObj.productDesiredPriority = ko.observable(contentObj.productDesiredPriority);
  
        contentObj.productDesiredQuantity = ko.observable(contentObj.productDesiredQuantity);
  
        //content replies and add comment pane open?
        contentObj.isCommentsRepliesSectionOpen = ko.observable(false);
        
        // did user post this content?
        if (swmRestClient.apiuserid == contentObj.creatorId) {
          contentObj.isContentPostCreator = ko.observable(true);
        }
        else {
          contentObj.isContentPostCreator = ko.observable(false);
        }
  
        contentObj.desiredByOwnerLabel = CCi18n.t('ns.nsh_wishlist_content:resources.productDesiredByOwnerLabel', {
          displayfirstname : widget.space().ownerFirstName()
        });
  
        if (contentObj.replies.length > 0) {
          contentObj.replies.forEach( function(cReply){
            cReply.dateCreatedEpoch = moment(cReply.dateCreated).valueOf();
            cReply.dateCreated = widget.formatTS(cReply.dateCreatedEpoch);
            cReply.editingPost = ko.observable(false);
  
            // If logged in user, is space owner, tie media url to ownerMediaUrl in global scope.
            if ( widget.space().isSpaceOwner(cReply.creatorId) ) {
              cReply.creatorMediaUrl = widget.space().ownerMediaUrl;
              cReply.creatorNotMember = ko.observable(false);
            }
            else {
              if (widget.space().isMember(cReply.creatorId)) {
                var rMediaUrl = cReply.creatorMediaUrl ? cReply.creatorMediaUrl : NO_IMAGE_IMG;
                cReply.creatorMediaUrl = ko.observable(widget.swmhostbaseurl + rMediaUrl);
                cReply.creatorNotMember = ko.observable(false);
              }
              else {
                cReply.creatorMediaUrl = ko.observable(widget.swmhostbaseurl + NO_LONGER_MEMBER_PROFILE_IMG);
                cReply.creatorNotMember = ko.observable(true);
              }
            }
  
            if (cReply.creatorId == swmRestClient.apiuserid) {
              cReply.isContentReplyCreator = ko.observable(true);
            }
            else {
              cReply.isContentReplyCreator = ko.observable(false);
            }
          });
  
          // Sort the replies after reply viewModel is populated
          contentObj.replies.sort(widget.repliesDateComparator);
        }
  
        //Construct content object cache to restore values for cancel and error handling
        if (contentObj.productDesiredPriority) {
          contentObj.cache = {
            "productDesiredPriority" : ko.observable(contentObj.productDesiredPriority()),
            "productDesiredQuantity" : ko.observable(contentObj.productDesiredQuantity())
          };
        }
  
        return contentObj;
      },
  
      /**
       * handle click for creating a Comment on a Post
       */
      createCommentMessage : function(contentId, text, contentIndex) {
        if (text && text.trim().length > 0) {
          var widget = this;
          var jsonParams = {
            "parentContentId" : contentId,
            "comment" : text
          };
          var successCB = function(result) {
            widget.refreshParentContent(contentId, contentIndex);
          };
          var errorCB = function(err) {
            var errResponse = JSON.parse(err);
            if (errResponse['o:errorCode'] === "403.4") {
              notifier.sendError(widget.WIDGET_ID, widget.translate('commentAddMaxCommentsMsg'), true);
            }
            else {
              notifier.sendError(widget.WIDGET_ID, widget.translate('unableToCreateCommentMsg'), true);
            }
          };
  
          swmRestClient.request('POST', '/swm/rs/v1/spaces/{spaceid}/comments', jsonParams, successCB, errorCB, {
            "spaceid" : widget.space().id()
          });
        }
      },
  
      /**
       * get a single Post and all its Comments from Rest and update that section only
       */
      refreshParentContent : function(contentId, contentIndex) {
        var widget = this;
        var successCB = function(result) {
          if (result) {
  
            var dataSet = widget.spaceContentData();
            
            if (result.productProductId) {
              // save swm product details for backup in case cc fetch fails
              result.swmProductTitle = result.productTitle;
              result.swmProductPrice = result.productPrice;
              result.swmProductSalePrice = result.productSalePrice;
              result.swmProductCurrencyCode = result.productCurrencyCode;
              result.swmMediaUrl = result.mediaUrl;
              result.swmProductVariantOptions = result.productVariantOptions;
  
              // set product details back to currently loaded details to prevent ugly display refresh
              result.productTitle = dataSet[contentIndex].productTitle();
              result.productPrice = dataSet[contentIndex].productPrice();
              result.productSalePrice = dataSet[contentIndex].productSalePrice();
              result.productCurrencyCode = dataSet[contentIndex].productCurrencyCode();
              result.mediaUrl = dataSet[contentIndex].mediaUrl();
              result.productVariantOptions = dataSet[contentIndex].productVariantOptions();
              result.stockAvailability = dataSet[contentIndex].stockAvailability();
              result.availabilityDate = dataSet[contentIndex].availabilityDate();
              result.productPriceChange = dataSet[contentIndex].productPriceChange();
            }
  
            var contentObj = widget.formatContentObj(result);
            contentObj.isCommentsRepliesSectionOpen(true);
            widget.spaceContentData()[contentIndex] = contentObj;
  
            // fetch availability from CC for this product
            var availSuccessCB = function(isAvail, contentId, status) {
              var dataSet = widget.spaceContentData();
              var cloneOrigSWMProductContentObj = $.extend(true, {}, dataSet[contentIndex]);
              
              //re-calc price change
              cloneOrigSWMProductContentObj.productPriceChange(widget.getPriceChangeText(dataSet[contentIndex]));
               
              if (isAvail && status && widget.deletedProducts.indexOf(contentId) == -1 && widget.unavailableSKUContentIds.indexOf(contentId) == -1) {
                if (status == 'IN_STOCK') {
                  cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productInStock'));
                } else if (status == 'BACKORDERABLE') {
                  cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productBackorderable'));
                } else if (status == 'PREORDERABLE') {
                  cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productPreorderable'));
                }
                cloneOrigSWMProductContentObj.showAddToCartBtn(true);
              }
              else if (!isAvail) {
                cloneOrigSWMProductContentObj.stockAvailability(widget.translate('productOutOfStock'));
                cloneOrigSWMProductContentObj.showAddToCartBtn(false);
              }
  
              widget.spaceContentData()[contentIndex] = cloneOrigSWMProductContentObj;
            };
  
            var availErrorCB = function() {
            };
  
  
  
            // if product, request product info from CC, only update this one
            if (result.productProductId) {
              var catalogId;
              if(ko.isObservable(widget.user) && widget.user() &&
                 ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
                catalogId = widget.user().catalogId();
              }
  
              var idArray = [result.productSkuId, result.productProductId, catalogId];
              var contentList = [ result ];            
              widget.fetchCCProducts(contentList, false, function(){
                // if product has not been deleted and is not unavailable, check stock status
                if (widget.deletedProducts.indexOf(contentId) == -1 && widget.unavailableSKUContentIds.indexOf(contentId) == -1){
                  widget.getAvailability(idArray, contentId, availSuccessCB, availErrorCB); 
                }
                // otherwise close spinner as this is the end of calls
                else {
                  widget.spinnerHide();
                }
              });
            }
          }
        };
  
        var errorCB = function(result) {
          notifier.sendError(widget.WIDGET_ID, widget.translate('unableToRefreshContentMsg'), true);
        };
  
        swmRestClient.request('GET', '/swm/rs/v1/spaces/{spaceid}/content/{contentid}', '', successCB, errorCB, {
          "contentid" : contentId,
          "spaceid" : widget.space().id()
        });
      },
  
      /**
       * Formats a timestamp into MM/DD/YY HH:MM AM, or into X minutes/hours ago
       */
      formatTS : function(ts) {
        var widget = this;
  
        var dtStr;
        var d = new Date();
        var n = d.getTimezoneOffset();
        var currTimeUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
        var diff = (currTimeUTC - ts);
  
        if (diff < 3600000) {
          var m = Math.floor(Math.min(3540000, diff) / 60000);
          var minutesAgoText = CCi18n.t(
              'ns.nsh_wishlist_content:resources.tsMinutesAgo',
              {
                displayminutes: m.toString()
              }
            );
          dtStr = (m > 1 ? minutesAgoText : widget.translate("tsMinuteAgo"));
        }
        else if (diff < (24 * 3600000)) {
          var h = Math.floor(Math.min(24 * 3450000, diff) / 3600000);
          var hoursAgoText = CCi18n.t(
              'ns.nsh_wishlist_content:resources.tsHoursAgo',
              {
                displayhours: h.toString()
              }
            );
          dtStr = (h > 1 ? hoursAgoText : widget.translate("tsHourAgo"));
        }
        else {
          dtStr = ccDate.formatDateAndTime(ts ,null, null, 'long');
        }
  
        return dtStr;
      },
  
      /**
       * Date comparator for descending post timestamps.
       */
      postDateComparator: function(a, b) {
        if (a.dateCreatedEpoch < b.dateCreatedEpoch)
          return 1;
        else if (a.dateCreatedEpoch > b.dateCreatedEpoch)
          return -1;
        
        return 0;
      },
  
      /**
       * Date comparator for ascending reply (comment) timestamps.
       */
      repliesDateComparator: function(a, b) {
        if (a.dateCreatedEpoch > b.dateCreatedEpoch)
          return 1;
        else if (a.dateCreatedEpoch < b.dateCreatedEpoch)
          return -1;
          
        return 0;
      },
  
      ////////////////////////////////////////////
      //
      // Edit Content Functionality
      //
      ////////////////////////////////////////////
  
      /**
       * Toggle flag that indicates if post/comment is currently
       * being edited for the specified post
       */
      toggleEditingPost : function(postData) {
        var widget = this;
        if (postData.editingPost()) {
          postData.editingPost(false);
        }
        else {
          postData.editingPost(true);
          postData.previousCommentText = postData.comment;
        }
      },
  
      /**
       * Handle click for editing comment/post
       */
      onEditComment : function(contentId, postData, elementIdToFocus) {
        var widget = this;
        widget.toggleEditingPost(postData);
        var cssIdQuery = "#" + elementIdToFocus;
        if ( $(cssIdQuery).length > 0 ) {
          $(cssIdQuery).focus();
        }
      },
  
      /**
       * Handle cancel editing a comment/post
       */
      cancelEditComment : function(contentId, postData) {
        var widget = this;
        postData.comment = postData.previousCommentText;
        widget.toggleEditingPost(postData);
      },
  
      /**
       * Handle key press from edit comment/post textarea.
       * ESC key cancels editing mode and reverts back
       * to original text.
       */
      onKeyPressEditComment : function(contentId, postData, evt) {
        var widget = this;
        if (evt.keyCode == 27) {
          postData.comment = postData.previousCommentText;
          widget.toggleEditingPost(postData);
        }
        return true;
      },
  
      /**
       * Handle saving an edit to a comment/post
       */
      saveEditComment : function(contentId, postData, parentContentId, relativeContentIndex, deleteMessage) {
        var widget = this;
        if (postData.previousCommentText != postData.comment.trim()) {
          var jsonParams = {
            "comment" : postData.comment
          };
          var successCB = function(result) {
            widget.toggleEditingPost(postData);
          };
          var errorCB = function(err) {
            notifier.sendError(widget.WIDGET_ID, widget.translate('unableToSaveCommentMsg'), true);
          };
  
          if (postData.comment.trim().length > 0) {
            // SAVE
            swmRestClient.request('PUT', '/swm/rs/v1/spaces/{spaceid}/comments/' + contentId, jsonParams, successCB, errorCB, {
              "spaceid" : widget.space().id()
            });
          }
          else {
            // DELETE
            widget.onDeleteContent(contentId, parentContentId, relativeContentIndex, deleteMessage);
          }
        }
        else {
          widget.toggleEditingPost(postData);
        }
      },
  
      ////////////////////////////////////////////
      //
      // Delete Content Functionality
      //
      ////////////////////////////////////////////
  
      /**
       * On click to delete content
       */
      onDeleteContent : function(deleteContentId, parentContentId, relativeContentIndex, deleteMessage) {
        var widget = this;
  
        widget.currDeleteContentID = deleteContentId;
        widget.currDeleteParentContentID = parentContentId;
        widget.currDeleteRelativeContextIndex = relativeContentIndex;
  
        widget.showDeleteConfirmationModal(deleteMessage);
      },
  
      /**
       * Displays Delete Confirmation modal
       */
      showDeleteConfirmationModal: function(deleteMessageText) {
        var widget = this;
  
        // setup delete message
        $('#SWM-deleteConfirm-Message').text(deleteMessageText);
  
        // create new 'shown' event handler
        $('#SWM-deleteConfirm-ModalContainer').one('show.bs.modal', function() {
          $('#SWM-deleteConfirm-ModalPane').show();
        });
  
        // create new 'hidden' event handler
        $('#SWM-deleteConfirm-ModalContainer').one('hide.bs.modal', function() {
          $('#SWM-deleteConfirm-ModalPane').hide();
        });
  
        // open modal
        $('#SWM-deleteConfirm-ModalContainer').modal('show');
      },
  
      /**
       * Performs content delete on server and refreshes observable array (view) if successful
       */
      performContentDelete : function() {
        var widget = this;
  
        var successCB = function(result) {
          if (result) {
            // Close the delete confirmation modal
            widget.closeModalById('#SWM-deleteConfirm-ModalContainer');
  
            if (widget.currDeleteContentID == widget.currDeleteParentContentID) {
              // handle product post deletion
              widget.deleteProductPostSuccessHandler(result);
            }
            else {
              // handle comment post deletion
              widget.deleteCommentPostSuccessHandler(result);
            }
          }
        };
  
        var errorCB = function(result) {
          widget.closeModalById('#SWM-deleteConfirm-ModalContainer');
          notifier.sendError(widget.WIDGET_ID, widget.translate('unableToDeleteContentMsg'), true);
        };
  
        swmRestClient.request('DELETE', '/swm/rs/v1/spaces/{spaceid}/content/{contentid}', '', successCB, errorCB, {
          "contentid" : widget.currDeleteContentID,
          "spaceid" : widget.space().id()
        });
      },
  
      deleteProductPostSuccessHandler : function(result) {
        var widget = this;
        
        // Product Post
        $('#SWM-product-post-'+result.contentId).addClass('swm-display-none');
        $('#SWM-replies-list-'+result.contentId).addClass('swm-display-none');
        $('#SWM-replies-text-box-'+result.contentId).addClass('swm-display-none');
        
        // save off product event info
        var deletedProductId = widget.spaceContentData()[widget.currDeleteRelativeContextIndex].productProductId;
        var deletedProductName = widget.spaceContentData()[widget.currDeleteRelativeContextIndex].productTitle();
  
        // delete the data in our underlying model
        widget.wishlistContentViewModel().deleteData(result.contentId);
        
        // adjust space content
        // TODO: ultimately we want to remove this item from the view instead of hiding it above
        //widget.spaceContentData.splice(widget.currDeleteRelativeContextIndex, 1);
        
        
        
        // Show delete notification
        if (widget.wishlistContentViewModel().viewportMode() == CCConstants.TABLET_VIEW ||
            widget.wishlistContentViewModel().viewportMode() == CCConstants.DESKTOP_VIEW ||
            widget.wishlistContentViewModel().viewportMode() == CCConstants.LARGE_DESKTOP_VIEW) {
           // show curtain notification
          var successCurtainMsg = widget.translate('deletePostSuccessMsg');
          notifier.sendSuccess(widget.WIDGET_ID, successCurtainMsg, false);
        } else {
          // show inline notification
          var successInlineMsg = CCi18n.t('ns.nsh_wishlist_content:resources.deletePostSuccessInlineMsg', { producttitle: deletedProductName });
          $('#SWM-product-moved-msg-'+result.contentId).text(successInlineMsg);
          $('#SWM-product-moved-link-'+result.contentId).attr("href", "");
          $('#SWM-product-moved-space-name-'+result.contentId).text("");
          
          $('#SWM-product-moved-msg-div-'+result.contentId).removeClass('swm-display-none');
          window.setTimeout(function() { $('#SWM-product-moved-msg-div-'+result.contentId).addClass('swm-display-none'); }, 5000);
        }
        
        // send deleted product event
        if (deletedProductId != null) {
          var deletedProductPostEventData = {
              spaceId: widget.space().id(),
              productName: deletedProductName,
              productId: deletedProductId
            };
          $.Topic(PubSub.topicNames.SOCIAL_SPACE_PRODUCT_REMOVED).publish(deletedProductPostEventData);
        }
      },
      
      deleteCommentPostSuccessHandler : function(result) {
        var widget = this;
        // comment reply
        widget.refreshParentContent(widget.currDeleteParentContentID, widget.currDeleteRelativeContextIndex);
        // show curtain notification
        var successMsg = widget.translate('deleteCommentSuccessMsg');
        notifier.sendSuccess(widget.WIDGET_ID, successMsg, false);
      },
      
      /**
       * Displays Edit Priority & Quantity modal
       */
      showEditPriorityModal: function(postData, contentId) {
        var widget = this;
  
        widget.editPriorityContentObj = postData;
        widget.editPriorityContentId(contentId);
        widget.editPriorityCurrVal(postData.productDesiredPriority());
        widget.editQuantityCurrVal(postData.productDesiredQuantity());
        widget.editQuantityCurrVal.extend({ digit: {message: widget.translate('validNumberErrorMsg'), params: true}, min: 0 });
  
        // create new 'shown' event handler
        $('#SWM-editPriorityModalContainer').one('show.bs.modal', function() {
          $('#SWM-editPriorityModalPane').show();
        });
  
        // create new 'hidden' event handler
        $('#SWM-editPriorityModalContainer').one('hide.bs.modal', function() {
          $('#SWM-editPriorityModalPane').hide();
        });
  
        // open modal
        $('#SWM-editPriorityModalContainer').modal('show');
      },
  
      closeEditPriorityModal : function() {
        var widget = this;
        widget.closeModalById('#SWM-editPriorityModalContainer');
      },
  
      toggleCommentsDisplay : function(contentId, contentObj, evt) {
        // if add reply text box exists and is not hidden, then hide
        if(contentObj.isCommentsRepliesSectionOpen()) {
          $('#SWM-comments-toggle-icon-'+contentId).removeClass('fa-caret-up');
          $('#SWM-comments-toggle-icon-'+contentId).addClass('fa-caret-down');
          contentObj.isCommentsRepliesSectionOpen(false);
        }
        else {
          $('#SWM-comments-toggle-icon-'+contentId).removeClass('fa-caret-down');
          $('#SWM-comments-toggle-icon-'+contentId).addClass('fa-caret-up');
          contentObj.isCommentsRepliesSectionOpen(true);
        }
        
  
      },
  
  
      ////////////////////////////////////////////
      //
      // Add Product to Cart Functionality
      //
      ////////////////////////////////////////////
  
      /**
       * Adds a product in the space to the shopping cart.
       */
      handleAddProductToCart : function(data) {
        var widget = this;
  
        var productId = data.productProductId;
        var productSkuId = data.productSkuId;
        var swmContentId = data.contentId;
        var productVariantOptions = data.productVariantOptions;
  
        // success function
        var getProductSuccessCB = function(pResult) {
          var productData = pResult;
  
          //if product is not displayable, show error because it cannot be added to cart
          if (!productData.active) {
            widget.displayAddToCartError();
            return;
          }
  
          var isProductAvailable = true; // product always available, for now
          var skuFound = false;
          var skuId = productSkuId;
  
          // populate product variant values, if any, to send to ADD_CART
          var selectedOptions = [];
          if ( ko.utils.unwrapObservable(productVariantOptions) ) {
            var prodVariantOptionsArray = JSON.parse(productVariantOptions());
            for (var i = 0; i < prodVariantOptionsArray.length; i++) {
              selectedOptions.push({'optionName': prodVariantOptionsArray[i].optionName, 'optionValue': prodVariantOptionsArray[i].optionValue});
            }
          }
          
          var selectedOptionsObj = { 'selectedOptions': selectedOptions};
          var newProduct = $.extend(true, {}, productData.product, selectedOptionsObj);
          newProduct.orderQuantity = 1;
  
          for (var i=0; i < newProduct.childSKUs.length; i++) {
            if (newProduct.childSKUs[i].repositoryId == skuId) {
              newProduct.childSKUs = [newProduct.childSKUs[i]];
              skuFound = true;
              break;
            }
          }
  
          // if sku was not found under this product, the sku now has
          // a different parent and we should disable adding to cart
          if (!skuFound) {
            widget.displayAddToCartError();
            return;
          }
  
          var catalogId;
          if(ko.isObservable(widget.user) && widget.user() &&
             ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
            catalogId = widget.user().catalogId();
          }
          var idArray = [skuId, productData.id, catalogId];
  
          // callbacks for api call to fetch product prices
          var pricesSuccessCB = function(priceData) {
            newProduct.listPrice = priceData.listPrice;
            newProduct.salePrice = priceData.salePrice;
          };
          var pricesErrorCB = function(err) {
            widget.displayAddToCartError();
            return;
          };
  
          // callback for api call to fetch product availability
          var availSuccessCB = function(isAvail, contentId, status) {
            isProductAvailable = isAvail;
            if (!isAvail) {
              widget.displayAddToCartStockError();
              return;
            }
          };
          var availErrorCB = function(err, contentId) {
            widget.displayAddToCartError();
            return;
          };
  
          var processItemsDeferred = [];
          processItemsDeferred.push( widget.getPrices(productId, skuId, pricesSuccessCB, pricesErrorCB) );
          processItemsDeferred.push( widget.getAvailability(idArray, swmContentId, availSuccessCB, availErrorCB) );
  
          $.when.apply($, processItemsDeferred).then(
            function () {
              if (isProductAvailable) {
                $.Topic(PubSub.topicNames.CART_ADD).publishWith( newProduct, [{message:"success"}] );
  
                // disable add to cart button for three seconds when it is clicked
                widget.clickedAddToCartProducts.push(swmContentId);
                window.setTimeout(function() { widget.clickedAddToCartProducts.remove(swmContentId); }, 3000);
              }
            });
        };
  
        // error function
        var getProductErrorCB = function(pResult) {
          widget.displayAddToCartError();
          return;
        };
  
        var catalogId;
        if(ko.isObservable(widget.user) && widget.user() &&
           ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
          catalogId = widget.user().catalogId();
        }
  
        var idArray = [productId, catalogId];
        widget.load('product', idArray, null, getProductSuccessCB, getProductErrorCB, widget);
      },
      
      //////////////////////////////
      // Move product functionality
      //////////////////////////////
      moveToSpace: function(contentObj, moveToSpaceId, moveToSpaceName) {
        var widget = this;
        if (widget.space().id() != moveToSpaceId) {
          widget.moveProductProductId(contentObj.productProductId);
          widget.moveProductContentTitle(contentObj.productTitle());
          if (contentObj.productSalePrice() != "") {
            widget.moveProductNotificationPrice(contentObj.productSalePrice());
          }
          else {
            widget.moveProductNotificationPrice(contentObj.productPrice());
          }
          widget.moveSWMContent(contentObj.contentId, moveToSpaceId, moveToSpaceName());
        }
      },
      
      /**
       * Display create new space modal
       */
      displayMoveToNewSpace: function(contentId, productId, productTitle, createNewFlag, productPrice, productSalePrice) {
  
        var widget = this;
        
        widget.moveProductContentId(contentId);
        widget.moveProductProductId(productId);
        widget.moveProductContentTitle(productTitle);
        if (productSalePrice != ''){
          widget.moveProductNotificationPrice(productSalePrice);
        }
        else {
          widget.moveProductNotificationPrice(productPrice);
        }
        
        // remove validations on observables after css transitions
        $('#SWM-moveNewSpaceModalContainer').one('hidden.bs.modal', function(){
          widget.moveCreateSpaceName('');
          widget.moveCreateSpaceName.isModified(false);
          widget.errBadRequestSpaceName(false);
          widget.moveNewSpaceAccessLevel("0");
          $('#SWM-move-space-name-div').addClass('hide');
        });
        
        // create new 'shown' event handler
        $('#SWM-moveNewSpaceModalContainer').one('show.bs.modal', function() {
          $('#SWM-moveNewSpaceModalPane').show();
        });
  
        // create new 'hidden' event handler
        $('#SWM-moveNewSpaceModalContainer').one('hide.bs.modal', function() {
          $('#SWM-moveNewSpaceModalPane').hide();
        });
        
        $('#SWM-move-space-name-div').removeClass('hide');
        
        if (createNewFlag || $('#SWM-move-space-selector')[0].length <= 1) {
          // attach handler to shown.bs.modal to process after css transitions
          $('#SWM-moveNewSpaceModalContainer').one('shown.bs.modal', function () {
            var elem = $('#SWM-move-space-selector').val('createnewspace');
            //put focus on the text box
            $('#SWM-move-addToSpace-name').focus();
          });
        }
        else {
          $('#SWM-move-space-selector')[0].selectedIndex = 0;
          $('#SWM-move-space-name-div').addClass('hide');
        }
  
        // open modal
        $('#SWM-moveNewSpaceModalContainer').modal('show');
      },
  
      
      /**
       * Move product to WL selected from Add to Space modal
       */
      handleMoveProductToSelectedWL: function() {
        var widget = this;
        
        var elem = $('#SWM-move-space-selector')[0];
        if (elem && elem.options.length > 0) {
          var destSpaceId = elem.options[elem.selectedIndex].value;
  
          if (destSpaceId == 'createnewspace') {
            widget.moveCreateSpaceName.isModified(true);
            this.moveCreateSpaceName(this.moveCreateSpaceName().trim());
            widget.errBadRequestSpaceName(false);
            if (!this.moveCreateSpaceName.isValid()) {
              return;
            }
            
            var createSpaceErrorCB = function(err) {
              var errResponse = JSON.parse(err);
              if (errResponse['o:errorCode'] === "403.4") {
                var errMsg = widget.translate('spaceCreateMaxSpacesMsg');
                notifier.sendError(widget.WIDGET_ID, errMsg, true);
              }
              else if (errResponse['o:errorCode'] === "409.0") {
                widget.errBadRequestSpaceName(true);
              }
            };
    
            var createSpaceSuccessCB = function(result) {        
              if (result.response.code.indexOf("201") === 0) {
                $.Topic(PubSub.topicNames.SOCIAL_REFRESH_SPACES).publish(false);
                widget.moveSWMContent(widget.moveProductContentId(), result.spaceId, result.spaceName);
              }
            };
            
            var json = {
              siteId: swmRestClient.siteid,
              spaceName: widget.moveCreateSpaceName(),
              spaceDescription: 'sample description from storefront',
              accessLevel: widget.moveNewSpaceAccessLevel()
            };
    
            // call SWM server to create space
            swmRestClient.request("POST", '/swm/rs/v1/spaces', json, createSpaceSuccessCB, createSpaceErrorCB);
          
          }
          else {
            if (widget.space().id() != destSpaceId) {
              widget.moveSWMContent(widget.moveProductContentId(), destSpaceId, elem.options[elem.selectedIndex].text);
            }
          }
        }
        
        // close modal
        widget.closeModalById('#SWM-moveNewSpaceModalContainer');
      },
      
      /**
       * Make rest call to move product on SWM server
       */
      moveSWMContent : function(contentId, targetSpaceId, targetSpaceName) {
        var widget = this;
        
        var jsonParams = {
          "targetSpaceId" : targetSpaceId
        };
        
        // productImageUrl
        var productImageUrl = widget.findContentItem(contentId).mediaUrl();
        if (productImageUrl) {
          if (productImageUrl.indexOf("http") != 0) { // swmhost url (absolute) or cchost url (relative)?
            productImageUrl = widget.constructCCHostRoute() + productImageUrl;
          }
          jsonParams["productImageUrl"] = productImageUrl;
        }
        
        // notificationPrice
        if (widget.moveProductNotificationPrice() != '' && widget.moveProductNotificationPrice() != null) {
          jsonParams["notificationProductPrice"] = widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.moveProductNotificationPrice(), widget.site().selectedPriceListGroup().currency.fractionalDigits);
        }
        
        // product price
        var productPrice = new String( widget.findContentItem(contentId).productPrice() );
        if (productPrice != '') {
          jsonParams["productPrice"] = productPrice;
          jsonParams["productCurrencyCode"] = widget.site().selectedPriceListGroup().currency.currencyCode;
        }
        
        // product sale price
        var productSalePrice = new String( widget.findContentItem(contentId).productSalePrice() );
        if (productSalePrice) {
          jsonParams["productSalePrice"] = productSalePrice;
        }
        
        // move target wishlist name and route
        var targetSpaceIdRoute = widget.links().wishlist.route + "/" + targetSpaceId;
        var wlLinkObj = {url: widget.links().wishlist.route + '/' + targetSpaceId};
        widget.moveProductTargetSpaceLink(wlLinkObj);
        widget.moveProductTargetSpaceName(targetSpaceName);
        
        var successCB = function(result) {
            
          if (result.finalSpaceId == targetSpaceId) {
            $('#SWM-product-post-'+contentId).addClass('swm-display-none');
            $('#SWM-replies-list-'+contentId).addClass('swm-display-none');
            $('#SWM-replies-text-box-'+contentId).addClass('swm-display-none');
  
            if (widget.wishlistContentViewModel().viewportMode() == CCConstants.TABLET_VIEW ||
               widget.wishlistContentViewModel().viewportMode() == CCConstants.DESKTOP_VIEW ||
               widget.wishlistContentViewModel().viewportMode() == CCConstants.LARGE_DESKTOP_VIEW) {
                 // show notifier curtain notification
                 notifier.sendTemplateSuccess(widget.WIDGET_ID, widget, widget.notificationTemplateUrl('product-content-moved-fully-template'), false);
            } 
            else {
              // show inline notification
              var moveTitle = CCi18n.t('ns.nsh_wishlist_content:resources.productMovedMessage', { producttitle: widget.moveProductContentTitle() });
              $('#SWM-product-moved-msg-'+contentId).text(moveTitle);
              $('#SWM-product-moved-link-'+contentId).attr("href", targetSpaceIdRoute);
              $('#SWM-product-moved-space-name-'+contentId).text(targetSpaceName);
              $('#SWM-product-moved-msg-div-'+contentId).removeClass('swm-display-none');
              // hide inline notification in 5 seconds
              window.setTimeout(function() { $('#SWM-product-moved-msg-div-'+contentId).addClass('swm-display-none'); }, 5000);
            }
            
            // delete the data in our underlying model
            widget.wishlistContentViewModel().deleteData(contentId);
            // refresh the move button dropdown options 
            widget.getSpaces();
            
            // send moved product $TOPIC event 
            var movedProductPostEventData = {
                fromSpaceId: widget.space().id(),
                toSpaceId: targetSpaceId,
                productName: widget.moveProductContentTitle(),
                productId: widget.moveProductProductId()
              };
            $.Topic(PubSub.topicNames.SOCIAL_SPACE_PRODUCT_MOVED).publish(movedProductPostEventData);
          }
          else {
            notifier.sendTemplateSuccess(widget.WIDGET_ID, widget, widget.notificationTemplateUrl('product-content-moved-template'), false);
          }
        };
        
        var errorCB = function(err) {
          var errResponse = JSON.parse(err);
          if (errResponse['o:errorCode'] === "403.4") {
            notifier.sendError(widget.WIDGET_ID, widget.translate('productAddMaxProductsMsg'), true);
          }
          else {
            notifier.sendError(widget.WIDGET_ID, widget.translate('unableToMoveProductMsg'), true);
          }
        };
  
        swmRestClient.request('PUT', '/swm/rs/v1/spaces/{spaceid}/products/{contentid}', jsonParams, successCB, errorCB, {
          "spaceid" : widget.space().id(),
          "contentid" : contentId
        });
      },
      
      createSpaceInputUnmodified : function() {
        var widget = this;
        widget.moveCreateSpaceName.isModified(false);
      },
      
      handleCancelMoveToSpace: function() {
        var widget = this;
  
        $('#SWM-moveNewSpaceModalPane').hide();
        widget.closeModalById('#SWM-moveNewSpaceModalContainer');
      },
      
      /**
       * Handler for space selection changes within the move Add to Space modal
       */
      onSpaceSelectionChange: function() {
        var widget = this;
  
        var elem = $('#SWM-move-space-selector')[0];
        if (elem && elem.options.length > 0) {
          var spaceid = elem.options[elem.selectedIndex].value;
          widget.moveCreateSpaceName.isData = true;
  
          if (spaceid == 'createnewspace') {
            $('#SWM-move-space-name-div').removeClass('hide');
            //put focus on the text box
            $('#SWM-move-addToSpace-name').focus();
          }
          else{
            $('#SWM-move-space-name-div').addClass('hide');
          }
        }
      },
  
      /**
       * Fetch the latest product prices a particular product/sku.
       * Note: sku actually not supported by CC yet at time of this writing
       */
      getPrices: function(productId, skuId, successCB, errorCB) {
        var widget = this;
  
        var dfd = $.Deferred();
  
        var priceData = {};
  
        var getPricesSuccessCB = function(data) {
          priceData.priceRange = data.priceRange;
  
          if (data.priceRange === true) {
            priceData.priceMax = data.priceMax;
            priceData.priceMin = data.priceMin;
          }
          if (data.list) {
            priceData.listPrice = data.list;
          }
          if (data.sale || data.sale === 0) {
            priceData.salePrice = data.sale;
          } else {
            priceData.salePrice = null;
          }
  
          // notify caller of getPrices of success
          successCB(priceData);
  
          // mark this promise as resolved
          dfd.resolve();
        };
  
        var getPricesErrorCB = function(data) {
          // notify caller of getPrices of error
          errorCB();
        };
  
        widget.load(CCConstants.ENDPOINT_GET_PRODUCT_PRICES, productId, null, getPricesSuccessCB, getPricesErrorCB, widget);
        return dfd.promise();
      },
  
      /**
       * fetch the availability of particular product
       */
      getAvailability : function(id, contentId, successCB, errorCB) {
        var widget = this;
  
        var dfd = $.Deferred();
        var inStock;
  
        var getAvailabilitySuccessCB = function(data) {
          if (data.stockStatus === 'IN_STOCK' || 
                  (data.stockStatus === 'BACKORDERABLE' || data.stockStatus === 'PREORDERABLE') && widget.cart().isPreOrderBackOrderEnabled) {
            inStock = true;
          } else {
            inStock = false;
          }
  
          // notify getAvailability caller of success
          successCB(inStock, contentId, data.stockStatus);
  
          // mark this promise as resolved
          dfd.resolve();
          widget.spinnerHide();
        };
  
        var getAvailabilityErrorCB = function(data) {
          errorCB(data.message, contentId);
          widget.spinnerHide();
        };
  
        widget.load(CCConstants.ENDPOINT_GET_PRODUCT_AVAILABILITY, id, null, getAvailabilitySuccessCB, getAvailabilityErrorCB, widget);
        return dfd.promise();
      },
  
      handleSaveProductOptions : function() {
        var widget = this;
        var widgetContentObj = widget.editPriorityContentObj;
  
        if (!widget.editQuantityCurrVal.isValid()){
          widgetContentObj.productDesiredQuantity(widgetContentObj.cache.productDesiredQuantity());
          return;
        }
  
        var errorCB = function(err) {
          widgetContentObj.productDesiredPriority(widgetContentObj.cache.productDesiredPriority());
          widgetContentObj.productDesiredQuantity(widgetContentObj.cache.productDesiredQuantity());
          notifier.sendError(widget.WIDGET_ID, widget.translate('genericSaveErrorMsg'), true);
        };
        var successCB = function(result) {
          if (result.response.code.indexOf("200.1") === 0) {
            widgetContentObj.cache.productDesiredPriority(widgetContentObj.productDesiredPriority());
            widgetContentObj.cache.productDesiredQuantity(parseInt(widgetContentObj.productDesiredQuantity()).toString());
          }
        };
  
        var newQuantity = parseInt(widget.editQuantityCurrVal()).toString();
        if (isNaN(newQuantity)) {
          newQuantity = "";
        }
        
        var jsonParams = {
            "productDesiredPriority" : widget.editPriorityCurrVal(),
            "productDesiredQuantity" : newQuantity
        };
  
        swmRestClient.request('PUT', '/swm/rs/v1/spaces/{spaceid}/products/{contentid}', jsonParams, successCB, errorCB, {
          "spaceid" : widget.space().id(),
          "contentid" : widgetContentObj.contentId
        });
  
        widgetContentObj.productDesiredPriority(widget.editPriorityCurrVal());
        widgetContentObj.productDesiredQuantity(newQuantity);
        
        // close modal
        widget.closeModalById('#SWM-editPriorityModalContainer');
      },
      
      //
      // Other
      //
      
      addSpaceValidation : function() {
        var widget = this;
        widget.moveCreateSpaceName.extend({
          required: {
            message: widget.translate('emptyNameMsg')
          }
        }).extend({
          uniquespacename: {
            params: widget.user().myWishLists,
            message: widget.translate('uniqueNameMsg')
          }
        }).extend({
          badrequestspacename: {
            message: widget.translate('uniqueNameMsg'),
            onlyIf: widget.errBadRequestSpaceName
          }
        });
      },
  
      displayAddToCartError : function() {
        var widget = this;
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        notifier.sendError(widget.WIDGET_ID, widget.translate('unableToAddToCartMsg'), true);
      },
      
      displayAddToCartStockError : function() {
        var widget = this;
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        notifier.sendError(widget.WIDGET_ID, widget.translate('unableToAddToCartStockMsg'), true);
      },
      
      /**
       * Finds an item in the spaceContentData() observable array that
       * matches a particular content id.
       */
      findContentItem: function(contentId) {
        var widget = this;
        var contentItem = null;
        
        var spaceDataSet = widget.spaceContentData();
        for (var ii=0; ii < spaceDataSet.length; ii++) {
          if (spaceDataSet[ii].contentId == contentId) {
            contentItem = spaceDataSet[ii];
            break;
          }
        }
        return contentItem;
      },
  
      /**
       * Close a modal by it's element id. 
       * 
       * Note: Fix SC-4106: MS Edge 'spartan'
       * browser requires removing 'modal-open' and 'modal-backdrop' from DOM,
       * as event propagation stops after 'hide' listener, in bootstrap 3.1.
       * 
       * modalId should be passed in with '#' identifier, example '#modalId'
       */
      closeModalById: function(modalId) {
        $(modalId).modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      
      resetWidget : function() {
        var widget = this;
        widget.spaceContentData([]);
        widget.currentUserFullName('');
        widget.currentUserMediaUrl('');
        widget.allowPost(false);
        widget.currentUserIsSpaceOwner(false);
        widget.deletedProducts.removeAll();
        widget.nullPricedProducts.removeAll();
        widget.unavailableSKUContentIds.removeAll();
        
        widget.spaceOptionsArray.removeAll();
        widget.myOwnedWishLists.removeAll();
        widget.myJoinedWishLists.removeAll();
        widget.destinationSpaceId('');
        widget.moveProductProductId('');
        widget.moveProductContentId('');
        widget.moveProductContentTitle('');
        widget.moveProductTargetSpaceName('');
        widget.moveProductTargetSpaceLink('');
        widget.moveCreateSpaceName('');
        widget.errBadRequestSpaceName(false);
        widget.moveNewSpaceAccessLevel("0");
      },
      
      fetchSkuImageUrl : function(productData, sku) {
        var skuMediaUrl = null;
        var tempSKUItem = null;
        var listingSKU = null;
        for(var i=0; i < productData.childSKUs.length; i++){
          tempSKUItem = productData.childSKUs[i];
          if(tempSKUItem.repositoryId == sku){
            if(tempSKUItem.primarySmallImageURL == null){
              listingSKU = tempSKUItem.listingSKUId;
            }else{
              skuMediaUrl = tempSKUItem.primarySmallImageURL;
            }
            break;
          }
        }
        if(listingSKU != null){
          for(var j=0; j < productData.childSKUs.length; j++) {
            tempSKUItem = productData.childSKUs[j];
            if(tempSKUItem.repositoryId == listingSKU){
              if(tempSKUItem.primarySmallImageURL != null){
                skuMediaUrl = tempSKUItem.primarySmallImageURL;
              }
            break;
            }
          }
        }
        if(skuMediaUrl == null){
          // If the sku does not have a image, fall back logic where the product image should be displayed.
          // There could be a scenario where product image could be null as well. Hence checking for null
          // before setting to product image url.
          if (productData.primarySmallImageURL != "no-image")
            skuMediaUrl = productData.primarySmallImageURL;
        }
        return skuMediaUrl;
      },
      
      /**
       * Clear all error messages in the notification bar for this widget
       */
      clearAllErrorNotifications : function() {
        var widget = this;
        notifier.clearError(widget.WIDGET_ID);
      },
  
      /**
       * Clear all success messages in the notification bar for this widget
       */
      clearAllSuccessNotifications : function() {
        var widget = this;
        notifier.clearSuccess(widget.WIDGET_ID);
      },
  
      /**
       * Clear the add-to-cart success message in the notification bar
       */
      clearAddToCartSuccessNotification : function() {
        var widget = this;
        notifier.clearSuccess('productDetails');
      },
    };
  });