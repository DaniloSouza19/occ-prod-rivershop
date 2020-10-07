/**
 * @fileoverview Shopping Cart Summary Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'viewModels/giftProductListingViewModel', 'ccConstants', 'notifier',
      'CCi18n', 'jquery', 'viewModels/integrationViewModel', 'viewModels/inventoryViewModel'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, giftProductListingViewModel, CCConstants, notifier, CCi18n, $, integrationViewModel, Inventory) {
  
    "use strict";

    return {

      // This will hold the data displayed in gift selection modal
      currentGiftChoice: ko.observable(),
      selectedGiftSku: ko.observable(),
      cartItem: {},
      stores : ko.observableArray(),
      selectedShippingGroup : null,
      selectedShpgrpElement : {},
      storeSearchText : ko.observable(),
      
      // -1 -> Some thing went wrong in either fetching locatins / stock status of a sku.
      // -2 -> No Stores found for given string.
      // 0  -> Everything went well. Got stock status of given sku across requested locatins.
      storeLookupStatus : ko.observable(0),
      botaodeletar1 : ko.observable(),
   

      // Sends a message to the cart to remove this product
      handleRemoveFromCart: function(cartItem) {
        $.Topic(pubsub.topicNames.CART_REMOVE).publishWith(
            cartItem.productData(),[{"message":"success", "commerceItemId": cartItem.commerceItemId, "shippingGroup": this}]);
      },

      handleRemoveAddonFromCart: function(childCartItem) {
        var widget = this;
        widget.cart().removeChildItemFromCart(childCartItem, true);
      },

      focusOnField : function(data) {
        var field = data.source;
        field.focus();
      },

      updateQuantity: function(data, event, id, shippingGroup) {
        
        if('click' === event.type || ('keypress' === event.type && event.keyCode === 13)) {

          // update the 'updatableQuantity' to cart-item.
          var cartItemTotal = 0;
          for(var index=0; index < data.shippingGroupRelationships().length; index++) {
            cartItemTotal = parseInt(cartItemTotal) + parseInt(data.shippingGroupRelationships()[index].updatableQuantity());
          }
          data.updatableQuantity(parseInt(cartItemTotal));
          if(data.updatableQuantity && data.updatableQuantity.isValid()) {
        	
            $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY).publishWith(
            data.productData(),[{"message":"success", "commerceItemId": data.commerceItemId, "shippingGroup": shippingGroup}]);
        	 
            var button = $('#' + id);
            button.focus();
            button.fadeOut();
          }
        } else {
          this.quantityFocus(data, event);
        }
        
        return true;
      },

      quantityFocus: function (data, event) {   
        var field = $('#' + event.target.id);
        var button = field.siblings("p").children("button");
        button.fadeIn();
      },

      getGiftChoices: function() {
        giftProductListingViewModel.prototype.getGiftProductChoices(this);
      },

      changeGiftChoice: function(widget) {
        widget.cartItem = {
          "catRefId": this.catRefId,
          "productId": this.productId,
          "quantity": this.quantity()
        };

        // This data is needed to add giftWithPurchaseSelections for the new item which is selected.
        var giftData = {};
        giftData.giftWithPurchaseIdentifier = this.giftData[0].giftWithPurchaseIdentifier;
        giftData.promotionId = this.giftData[0].promotionId;
        giftData.giftWithPurchaseQuantity = this.giftData[0].giftWithPurchaseQuantity;
        widget.currentGiftChoice(giftData);

        // While changing the gift, add giftWithPurchaseSelections info to the product being modified
        widget.addGiftWithPurchaseSelectionsToItem(this);

        var getGiftChoiceData = {};
        getGiftChoiceData.giftWithPurchaseType = this.giftData[0].giftWithPurchaseType;
        getGiftChoiceData.giftWithPurchaseDetail = this.giftData[0].giftWithPurchaseDetail;
        getGiftChoiceData.id = null;
        giftProductListingViewModel.prototype.getGiftProductChoices(getGiftChoiceData);
      },

      // Adds giftWithPurchaseSelections information to the cart item
      addGiftWithPurchaseSelectionsToItem: function(item) {
        var giftWithPurchaseSelections = [];
        var data = {};
        data.giftWithPurchaseIdentifier = item.giftData[0].giftWithPurchaseIdentifier;
        data.promotionId = item.giftData[0].promotionId;
        data.giftWithPurchaseQuantity = item.giftData[0].giftWithPurchaseQuantity;
        data.catRefId = item.catRefId;
        data.productId = item.productId;
        giftWithPurchaseSelections.push(data);
        item.giftWithPurchaseSelections = giftWithPurchaseSelections;
      },

      handleGiftAddToCart: function () {
        // 'this' is widget view model

        var variantOptions = this.currentGiftChoice().giftChoice.variantOptionsArray;
        //get the selected options, if all the options are selected.
        var selectedOptions = this.getSelectedSkuOptions(variantOptions);
        var selectedOptionsObj = { 'selectedOptions': selectedOptions };
        var newProduct = $.extend(true, {}, this.currentGiftChoice().giftChoice.product, selectedOptionsObj);
        if (variantOptions.length > 0) {
          //assign only the selected sku as child skus
          newProduct.childSKUs = [this.selectedGiftSku()];
        }

        //If the gift being added is already present in the cart, do not trigger pricing
        if (this.cartItem && this.cartItem.catRefId && this.cartItem.productId) {
          var item = this.cart().getCartItem(this.cartItem.productId, this.cartItem.catRefId);
          if (item != null && item.giftWithPurchaseCommerceItemMarkers.length && newProduct.id == this.cartItem.productId
              && newProduct.childSKUs[0].repositoryId == this.cartItem.catRefId) {
            this.cartItem = {};
            this.hideGiftSelectionModal();
            return;
          }
        }

        // add gwp selections in the request
        newProduct.giftProductData = {
          "giftWithPurchaseIdentifier": this.currentGiftChoice().giftWithPurchaseIdentifier,
          "promotionId": this.currentGiftChoice().promotionId,
          "giftWithPurchaseQuantity" : (this.currentGiftChoice().giftWithPurchaseQuantityAvailableForSelection ?
              this.currentGiftChoice().giftWithPurchaseQuantityAvailableForSelection : this.currentGiftChoice().giftWithPurchaseQuantity)
        };

        newProduct.orderQuantity = newProduct.giftProductData.giftWithPurchaseQuantity;

        // Triggers price call
        this.cart().addItem(newProduct);
        this.cartItem = {};
        this.hideGiftSelectionModal();
      },

      // hide gift selection modal
      hideGiftSelectionModal: function() {
        $('#CC-giftSelectionpane').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },

      // this method  returns a map of all the options selected by the user for the product
      getSelectedSkuOptions : function(variantOptions) {
        var selectedOptions = [];
        for (var i = 0; i < variantOptions.length; i++) {
          if (!variantOptions[i].disable()) {
            selectedOptions.push({'optionName': variantOptions[i].optionDisplayName, 'optionValue': variantOptions[i].selectedOption().key, 'optionId': variantOptions[i].actualOptionId, 'optionValueId': variantOptions[i].selectedOption().value});
          }
        }
        return selectedOptions;
      },

      // Checks if all variant values are selected
      allOptionsSelected: function () {
          var allOptionsSelected = true;
          if (!this.currentGiftChoice() || !this.currentGiftChoice().giftChoice) {
            allOptionsSelected = false;
          } else if (this.currentGiftChoice().giftChoice.variantOptionsArray.length > 0) {
            var variantOptions = this.currentGiftChoice().giftChoice.variantOptionsArray;
            for (var i = 0; i < variantOptions.length; i++) {
              if (! variantOptions[i].selectedOption.isValid() && !variantOptions[i].disable()) {
                allOptionsSelected = false;
                this.selectedGiftSku(null);
                break;
              }
            }
            
            if (allOptionsSelected) {
              // get the selected sku based on the options selected by the user
              var selectedSKUObj = this.getSelectedSku(variantOptions);
              if (selectedSKUObj === null) {
                return false;
              }
              this.selectedGiftSku(selectedSKUObj);
            }
            this.refreshSkuStockStatus(this.selectedGiftSku());
          }
          
          return allOptionsSelected;
        },

        //refreshes the stockstatus based on the variant options selected
        refreshSkuStockStatus : function(selectedSKUObj) {
          var key;
          var product = this.currentGiftChoice().giftChoice;
          if (selectedSKUObj === null) {
            key = 'stockStatus';
          } else {
            key = selectedSKUObj.repositoryId;
          }
          var stockStatusMap = product.stockStatus();
          for (var i in stockStatusMap) {
            if (i == key) {
              if (stockStatusMap[key] == CCConstants.IN_STOCK) {
                product.inStock(true); 
              } else {
                product.inStock(false);
              }
              return;
            }
          }
        },

        //this method returns the selected sku in the product, Based on the options selected
        getSelectedSku : function(variantOptions) {
          var childSkus = this.currentGiftChoice().giftChoice.product.childSKUs;
          var selectedSKUObj = {};
          for (var i = 0; i < childSkus.length; i++) {
            selectedSKUObj =  childSkus[i];
            for (var j = 0; j < variantOptions.length; j++) {
              if ( !variantOptions[j].disable() && childSkus[i].dynamicPropertyMapLong[variantOptions[j].optionId] != variantOptions[j].selectedOption().value ) {
                selectedSKUObj = null;
                break;
              }
            }
            if (selectedSKUObj !== null) {
              return selectedSKUObj;
            }
          }
          return null;
        },
        
        setExpandedFlag : function(element, data) {
          if (data.expanded()) {
            data.expanded(false);
          } else {
            data.expanded(true);
          }
        },

        botaodeletar :function(){
          
        },

      onLoad: function(widget) {
        var self = this;
        widget.botaodeletar1 = function(){}

        $.Topic(pubsub.topicNames.GET_GIFT_CHOICES_SUCCESSFUL).subscribe(function() {
          // Currently only one product is returned as a gift
          var product = this[0].products[0];
          var placeHolderItemId = this[1];
          
          if (placeHolderItemId != null) {
            for (var i = 0 ; i < widget.cart().placeHolderItems().length; i++) {
              if (placeHolderItemId == widget.cart().placeHolderItems()[i].id) {
                widget.cart().placeHolderItems()[i].giftChoice = product;
                widget.cart().placeHolderItems()[i].giftChoice.itemTotal = 0;
                widget.currentGiftChoice(widget.cart().placeHolderItems()[i]);
                break;
              }
            }
          } else { // A request was made by shopper to change the gift choice
            product.itemTotal = 0;
            var giftData = widget.currentGiftChoice();
            giftData.giftChoice = product;
            widget.currentGiftChoice(giftData);
          }
          
          // Get stock status of the product
          product.stockStatus.subscribe(function(newValue) {
            if (product.stockStatus().stockStatus === CCConstants.IN_STOCK) {
              product.inStock(true);
            } else {
              product.inStock(false);
              widget.hideGiftSelectionModal();
              notifier.sendError('shoppingCartSummary', CCi18n.t('ns.shoppingcartsummary:resources.gwpItemNotAvailable'), true);
            }
            product.showStockStatus(true);
          });
          var firstchildSKU = product.childSKUs()[0];
          if (firstchildSKU) {
            var skuId = firstchildSKU.repositoryId();
            if (product.variantOptionsArray.length > 0) {
              skuId = '';
            }
            product.showStockStatus(false);
            var catalogId = null;
            if (widget.user().catalog) {
              catalogId = widget.user().catalog.repositoryId;
            }
            product.getAvailability(product.id(), skuId, catalogId);
          } else {
            product.showStockStatus(true);
            product.inStock(false);
          }
        });

        // Need to remove giftWithPurchaseSelections from cart items if pricing was not triggered
        $(document).on('hidden.bs.modal', '#CC-giftSelectionpane', function () {
          ko.utils.arrayForEach(widget.cart().items(), function(item) {
            if (item.giftWithPurchaseSelections) {
              delete item.giftWithPurchaseSelections;
            }
          });
        });

        // <select> tag in bootstrap modal, changes the modal's position. So always displaying the modal on the top of the browser.
        if (navigator.userAgent.toLowerCase().indexOf('safari') > -1 && navigator.userAgent.toLowerCase().indexOf('chrome') == -1) {
          $(document).on('show.bs.modal', '#CC-giftSelectionpane', function(){
            $('body').scrollTop(0);
          });
          $(document).on('shown.bs.modal', '#CC-giftSelectionpane', function(){
            $('#CC-giftSelectionpane').find('select').blur(function(){
              $('body').scrollTop(0);
            });
          });
        }

        widget.handlePlaceHolderRemove = function() {
          widget.cart().removePlaceHolderFromCart(this);
        };
        widget.storeSearchText.extend({
          maxLength: {
            params: 50, message: CCi18n.t('ns.common:resources.maxlengthValidationMsg', {maxLength: 50})
          }
        });
        $.Topic(pubsub.topicNames.GIFT_CHOICES_NOT_AVAILABLE).subscribe(function() {
          widget.hideGiftSelectionModal();
          notifier.sendError('shoppingCartSummary', CCi18n.t('ns.shoppingcartsummary:resources.gwpItemNotAvailable'), true);
        });
        $.Topic(pubsub.topicNames.CART_ADD_SUCCESS_CPQ).subscribe(self.handleClose);
      },
      // Returns the reconfiguration frame document.
      getReconfigurationFrameDocument : function() {
        var iframe = document.getElementById("cc-cpqReconfiguration-frame");
        if (iframe) {
          return iframe.contentDocument || iframe.contentWindow.document;
        }
      },

      // Returns the reconfiguration form.
      getReconfigurationForm : function() {
        var iframeDocument = this.getReconfigurationFrameDocument();
        if (iframeDocument) {
          return iframeDocument.getElementById("reconfiguration_form");
        }
      },

      // Reloads the reconfiguration frame.
      reloadReconfigurationFrame : function() {
        var iframe = document.getElementById("cc-cpqReconfiguration-frame");
        if (iframe) {
          iframe.src = iframe.src;
        }
      },

      // Handle the reconfigure button click on a line item
      handleReconfigure: function(widget, shippingGroup) {
         // Handle opening the reconfiguration i-frame here
         var self=this;
         if(shippingGroup) {
           var selectedStore = shippingGroup.selectedStore
                && ko.isObservable(shippingGroup.selectedStore) ? shippingGroup.selectedStore() : null;
           var cpqConfig = {};
           cpqConfig.selectedStore=selectedStore;
           widget.cart().cpqConfigMap.set(shippingGroup.catRefId, cpqConfig);
         }
         integrationViewModel.getInstance().iFrameId = "cc-cpqReconfiguration-frame";
         var reconfigurationDetails = new Object();
         if(self.configuratorId) {
           reconfigurationDetails.configuratorId = self.configuratorId;
         }
         reconfigurationDetails.locale = widget.locale();
         reconfigurationDetails.currency = widget.site()
             .selectedPriceListGroup().currency.currencyCode;

       // Injecting the reconfiguration form values
         var keys = Object.keys(reconfigurationDetails);
         var frameDocument = widget.getReconfigurationFrameDocument();
         if (frameDocument) {
           for (var i = 0; i < keys.length; i++) {
             var element = frameDocument.getElementById(keys[i]);
             if (element) {
               element.value = reconfigurationDetails[keys[i]];
             }
           }
         }
         widget.getReconfigurationForm().action = widget.site().extensionSiteSettings.CPQConfigurationSettings.ReConfigurationURL;
         widget.getReconfigurationForm().submit();
         $('#cc-re-cpqmodalpane').modal({
           backdrop: 'static',
           keyboard: false
         });
         $('#cc-re-cpqmodalpane').modal('show');
         $('#cc-re-cpqmodalpane').one('hidden.bs.modal', function() {
             widget.reloadReconfigurationFrame();
         });
      },

      handleClose: function() {
          // Close the reconfiguration modal.
          $('#cc-re-cpqmodalpane').modal('hide');
      },

      /**
       * Handles store selection for BOPIS usecase.
       * @param shippingGroup
       */
      displayStoreSelector: function(shippingGroup, cartItem, event) {

        var self = this;
        self.storeLookupStatus(0);
        self.cartItem = cartItem;
        self.selectedShippingGroup = shippingGroup;
        self.selectedShpgrpElement = event.currentTarget;
        self.stores.removeAll();
        var inventory = new Inventory();
        var successCallBack = function(storeInfos) {
          // clear previous search results, if any
          self.stores.removeAll();
          if(null !== storeInfos && storeInfos.length > 0) {
            for(var index = 0;index < storeInfos.length; index++) {
              self.stores.push(storeInfos[index]);
            }
          }
        }
        var errorCallBack = function(errorInfo) {
          self.storeLookupStatus(errorInfo.storeLookupStatus);
        }
        inventory.getLocationInventoryForUserQuery({
          searchText : self.storeSearchText(),
          noOfStoresToDisplay : self.noOfStoresToDisplay(),
          siteId : self.site().siteInfo.id,
          catalogId : self.user().catalogId(),
          locationType : 'store',
          pickUp : true,
          comparator : 'CO',
          searchableFields : ['city', 'postalCode', 'name'],
          productSkuIds : inventory.getProductSkuIdsInCartItem(cartItem)
        }, successCallBack.bind(self), errorCallBack.bind(self));
        $('#storePickUpModal').on('shown.bs.modal', function () {
          // get the locator for an input in your modal.
          var storeSearchTextField = $('#CC-storeSelect');
          var storeSearchTextFieldMobile = $('#CC-storeSelect-mobile');
          if(storeSearchTextField) {
            storeSearchTextField.focus();
          } else if(storeSearchTextFieldMobile) {
            storeSearchTextFieldMobile.focus();
          }
        });
        $("#storePickUpModal").on("hidden.bs.modal", function () {
          if(self.selectedShpgrpElement) {
            self.selectedShpgrpElement.focus();
          }
        });
      },

      /**
       * Performs inventory checks for selected item against selected store / global inventory.
       * @param cartItem
       * @param inventoryDetails
       * @param shippingGroupRelationship
       */
      validateInventoryForShippingGroup: function(cartItem, inventoryDetails, shippingGroupRelationship) {
        var self = this;
        cartItem = !cartItem ? self.cartItem : cartItem;
        if (self.cart().isConfigurableItem(cartItem) && cartItem.childItems && cartItem.childItems.length > 0) {
          shippingGroupRelationship.addConfigurableStockValidation(inventoryDetails, self.cart().isPreOrderBackOrderEnabled);
        } else {
          shippingGroupRelationship.addLimitsValidation(cartItem, inventoryDetails, self.cart().isPreOrderBackOrderEnabled);
        }
      },

      /**
       * Method to save shopper's selected store. We would fetch stock status and validate inventory against
       * selected store.
       * @param selectedStore
       */
      handleStoreSelection: function(selectedStore) {
        var self = this;
        if(null != self.selectedShippingGroup) {
          self.selectedShippingGroup.selectedStore(selectedStore);
          self.selectedShippingGroup.isPickupInStore(true);
          self.validateInventoryForShippingGroup(undefined, selectedStore.inventoryDetails, self.selectedShippingGroup);
          self.cart().saveCartCookie();
          self.cart().markDirty();
          self.handleStorePickupClose();
          if(self.selectedShpgrpElement) {
        	self.selectedShpgrpElement.focus();
          }
        }
      },

      
      /**
       * Handles store removal. Would fetch default global inventory details and does inventory checks.
       * @param cartItem
       * @param shippingGroupRelationship
       */
      handleStoreRemoval: function(cartItem, shippingGroupRelationship) {

        var self = this;
        if(null != shippingGroupRelationship) {
          shippingGroupRelationship.isPickupInStore(false);
          shippingGroupRelationship.selectedStore(null);
          self.storeSearchText(null);

          // Get back global inventory details when home delivery option is chosen.
          var inventory = new Inventory();
          var successCallBack = function(data) {
            self.validateInventoryForShippingGroup(cartItem, data,shippingGroupRelationship);
            self.cart().saveCartCookie();
            self.cart().markDirty();
          };
          var errorCallBack = function(errorInfo) {
          };
          inventory.getStockStatuses({
            productSkuIds : inventory.getProductSkuIdsInCartItem(cartItem),
            catalogId : self.user().catalogId()
          }, successCallBack.bind(this), errorCallBack.bind(this))

        }
      },

      /**
       * Handles Close of Store selection popup.
       */
      handleStorePickupClose: function() {
        var self=this;
        // Close the modal.
        self.storeSearchText('');
        $('#storePickUpModal').modal('hide');
        if(self.selectedShpgrpElement) {
          self.selectedShpgrpElement.focus();
        }
      },
      
      handleKeyPress: function(data, event) {
      	var self = this;
          var keyCode = (event.which ? event.which : event.keyCode);
          switch(keyCode) {
            case CCConstants.KEY_CODE_ENTER:
              // Enter key
              self.displayStoreSelector(self.selectedShippingGroup, self.cartItem, event);
              $('#storePickUpModal').modal('show');

            }
          return true;
      },
      
      addContainer: function (element){
        $(element).parent().parent().parent().addClass("container");
      }
    };
  }
);
