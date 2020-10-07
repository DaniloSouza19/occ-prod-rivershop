/**
 * @fileoverview Address Book Widget.
 *
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'navigation', 'viewModels/address', 'notifier', 'ccConstants', 'CCi18n'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, PubSub, navigation, Address, notifier, CCConstants, CCi18n) {
  
    "use strict";
        
    return {
      
      WIDGET_ID: "NSH_Profile_Address_Book",
      ignoreBlur: ko.observable(false),
      // Property to show edit screen.
      isUserProfileShippingEdited:        ko.observable(false),
      isUserProfileDefaultAddressEdited : ko.observable(false),
      interceptedLink: ko.observable(null),
      isUserProfileInvalid: ko.observable(false),
      isProfileLocaleNotInSupportedLocales : ko.observable(),
      
      beforeAppear: function (page) {
         // Every time the user goes to the profile page,
         // it should fetch the data again and refresh it.
        var widget = this;
        
        //pubsub event to discard the address changes (IF ANY) if save button of account details or update password 
        //is clicked 
         $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).subscribe(widget.handleCancelUpdateForAddressBook);
        // Checks whether the user is logged in or not
        // If not the user is taken to the home page
        // and is asked to login.
        if (widget.user().loggedIn() == false) {
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        } else if (widget.user().isSessionExpiredDuringSave()) {
          widget.user().isSessionExpiredDuringSave(false);
        } else {
          //reset all the password detals
          widget.user().resetPassword();
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.user().isUserProfileEdited(false);
        }
      },
      
      onLoad: function(widget) {
        var self = this;
        var isModalVisible = ko.observable(false);
        var clickedElementId = ko.observable(null);
        var isModalSaveClicked = ko.observable(false);
        
        widget.ErrorMsg = widget.translate('updateErrorMsg');
        widget.passwordErrorMsg = widget.translate('passwordUpdateErrorMsg');
        
        widget.showViewProfile = function (refreshData) {
          // Fetch data in case it is modified or requested to reload.
          // Change all div tags to view only.
          if(refreshData) {
            widget.user().getCurrentUser(false);
          }
          widget.isUserProfileShippingEdited(false);
          widget.isUserProfileDefaultAddressEdited(false);
        };
        
        // Reload shipping address.
        widget.reloadShipping = function() {
          //load the shipping address details
          if (widget.user().updatedShippingAddressBook) {
            var shippingAddresses = [];
            for (var k = 0; k < widget.user().updatedShippingAddressBook.length; k++)
            {
              var shippingAddress = new Address('user-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
              shippingAddress.countriesList(widget.shippingCountries());
              
              shippingAddress.copyFrom(widget.user().updatedShippingAddressBook[k], widget.shippingCountries());
              shippingAddress.resetModified();
              shippingAddress.country(widget.user().updatedShippingAddressBook[k].countryName);
              shippingAddress.state(widget.user().updatedShippingAddressBook[k].regionName);
              shippingAddresses.push(shippingAddress);
            }
              
            widget.user().shippingAddressBook(shippingAddresses);
          }
        };

        /**
         * Ignores the blur function when mouse click is up
         */
        widget.handleMouseUp = function() {
            this.ignoreBlur(false);
            return true;
          };
          
          /**
           * Ignores the blur function when mouse click is down
           */
        widget.handleMouseDown = function() {
            this.ignoreBlur(true);
            return true;
          };
        // hide the challange dialog box
        widget.hideModal = function () {
          if(isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
            $("#CC-customerProfile-modal-3").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        };
        
        widget.showModal = function () {
          $("#CC-customerProfile-modal-3").modal('show');
          isModalVisible(true);
        };
        
        // Handle cancel update.
        widget.handleCancelUpdateForAddressBook = function () {
          widget.showViewProfile(true);
          widget.user().editShippingAddress(null);
          widget.reloadShipping();
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.user().isUserProfileEdited(false);
          widget.hideModal();
        };
        
        // Discards user changes and navigates to the clicked link.
        widget.handleModalCancelUpdateDiscard = function () {
          widget.handleCancelUpdateForAddressBook();
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
          }
          else {
            widget.navigateAway();
          }
        };
        
        // Add new Shipping address, then display for editing.
        widget.handleCreateShippingAddress = function () {
          var addr = new Address('user-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
          widget.editShippingAddress(addr);
        },
        
        widget.editShippingAddress = function (addr) {
        	widget.user().isUserProfileEdited(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.user().editShippingAddress(addr);
          widget.isUserProfileShippingEdited(true);
          $('#CC-customerProfile-sfirstname').focus();
          if (widget.shippingCountries().length == 0) {
            $('#CC-customerProfile-shippingAddress-edit-region input').attr('disabled', true);
          }
        };
        
        widget.handleSelectDefaultShippingAddress = function (addr) {
          widget.selectDefaultShippingAddress(addr);
          widget.isUserProfileDefaultAddressEdited(true);
        };
        
        widget.handleRemoveShippingAddress = function (addr) {
          widget.user().shippingAddressBook.remove(addr);
          widget.user().deleteShippingAddress(true);
          
          // If addr was the default address, reset the default address to be the first entry.
          if (addr.isDefaultAddress() && widget.user().shippingAddressBook().length > 0) {
            widget.selectDefaultShippingAddress(widget.user().shippingAddressBook()[0]);
          }
          
          // If we delete the last user address, notify other modules that might have
          // cached it.
          if (widget.user().shippingAddressBook().length === 0) {
          	$.Topic(PubSub.topicNames.USER_PROFILE_ADDRESSES_REMOVED).publish();
          }
          
          widget.handleUpdateProfileForAddressBook();
        };
        
        widget.selectDefaultShippingAddress = function (addr) {
          widget.user().selectDefaultAddress(addr);
        };
        
        // Handles User profile update for shipping address modification
        widget.handleUpdateProfileForAddressBook = function () {
          var inputParams = {};
          var isDataInValid = false;
          var isDataModified = false;
          var includeShippingAddress = false;
          // If we're updating because of a change to a shipping address...
          if(widget.user().editShippingAddress() != null)
          {
            // Check if it's a new shipping address and add it to the address book.
           if ($.inArray(widget.user().editShippingAddress(), widget.user().shippingAddressBook()) < 0) {
            widget.user().shippingAddressBook.push(widget.user().editShippingAddress());
           }
           // If this was the first shipping address added, make it automatically the default.
           if (widget.user().shippingAddressBook().length === 1) {
            widget.user().shippingAddressBook()[0].isDefaultAddress(true);
           }
           if (widget.user().editShippingAddress().isDefaultAddress()) {
            widget.user().selectDefaultAddress(widget.user().editShippingAddress());
           }
          }
          // checking whether shipping address is modified/valid.
          if (widget.user().isShippingAddressBookModified()) {
           for (var k = 0; k < widget.user().shippingAddressBook().length; k++) {
            if (!widget.user().shippingAddressBook()[k].validateNow()) {
              isDataInValid = true;
              break;
            }
          }
          includeShippingAddress = !isDataInValid; // Because addresses are validated first!
          isDataModified = true;
        }
        if (!isDataModified) {
          // If data is not modified, show the view profile page.
          $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).publish();
          return;
         }else if (isDataInValid) {
          // If data is invalid, show error message.
          $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).publish();
          return;
        }
        if(includeShippingAddress){
         widget.user().handleShippingAddressUpdate(inputParams);
        }
         widget.user().invokeUpdateProfile(inputParams);
        };
        
        // Handles User profile update for shipping address modification and navigates to the clicked link.
        widget.handleModalUpdateProfile = function () {
          isModalSaveClicked(true);
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.handleUpdateProfileForAddressBook();
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
            return;
          }
          if (clickedElementId != "CC-loginHeader-myAccount") {
            widget.user().delaySuccessNotification(true);
          }
          widget.handleUpdateProfileForAddressBook();
        };
        
       // Handles if data does not change. 
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
        });

        //handle if the user logs in with different user when the session expiry prompts to relogin
        $.Topic(PubSub.topicNames.USER_PROFILE_SESSION_RESET).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
        });
        
        // Handles if data is invalid.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).subscribe(function() {
          notifier.sendError(widget.WIDGET_ID, widget.ErrorMsg, true);
          if (isModalSaveClicked()) {
            widget.isUserProfileInvalid(true);
            isModalSaveClicked(false);
          }
          widget.user().delaySuccessNotification(false);
          // Hide the modal.
          widget.hideModal();
        });
        
        // Handles if user profile update is saved.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).subscribe(function() {
        	widget.user().isUserProfileEdited(false);
          widget.showViewProfile(true);
          // Clears error message.
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          if (!widget.user().delaySuccessNotification()) {
            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('updateSuccessMsg'), true);
          }
          widget.hideModal();
          if (isModalSaveClicked()) {
            isModalSaveClicked(false);
            widget.navigateAway();
          }
        });
        
        // Handles if user profile update is failed.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_FAILURE).subscribe(function(data) {
          if (isModalSaveClicked()) {
            widget.isUserProfileInvalid(true);
            isModalSaveClicked(false);
          }
          widget.user().delaySuccessNotification(false);
          // Hide the modal.
          widget.hideModal();
          if (data.status == CCConstants.HTTP_UNAUTHORIZED_ERROR) {
            widget.user().isSessionExpiredDuringSave(true);
            navigation.doLogin(navigation.getPath());
          } else {
            var msg = widget.passwordErrorMsg;
            notifier.clearError(widget.WIDGET_ID);
            notifier.clearSuccess(widget.WIDGET_ID);
            if (data.errorCode === CCConstants.USER_PROFILE_INTERNAL_ERROR) {
              msg = data.message;
              // Reloading user profile and shipping data in edit mode.
              widget.user().getCurrentUser(false);
              widget.reloadShipping();
            } else if (data.errors && data.errors.length > 0 && 
              (data.errors[0].errorCode === CCConstants.USER_PROFILE_SHIPPING_UPDATE_ERROR)) {
              msg = data.errors[0].message;
            } else {
              msg = data.message;
            }
            notifier.sendError(widget.WIDGET_ID, msg, true);
            widget.hideModal();
          }
        });
        
        $.Topic(PubSub.topicNames.USER_LOAD_SHIPPING).subscribe(function() {
          widget.reloadShipping();
        });
        
        $.Topic(PubSub.topicNames.UPDATE_USER_LOCALE_NOT_SUPPORTED_ERROR).subscribe(function() {
          widget.isProfileLocaleNotInSupportedLocales(true);
        });
        
        /**
         *  Navigates window location to the interceptedLink OR clicks checkout/logout button explicitly.
         */
        widget.navigateAway = function() {

          if (clickedElementId === "CC-header-checkout" || clickedElementId === "CC-loginHeader-logout" || clickedElementId === "CC-customerAccount-view-orders" 
              || clickedElementId === "CC-header-language-link" || clickedElementId.indexOf("CC-header-languagePicker") != -1) {
            widget.removeEventHandlersForAnchorClick();
            widget.showViewProfile(false);
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#"+clickedElementId).get()[0];
            clickedElement.click();
          } else if (clickedElementId === "CC-loginHeader-myAccount") {
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#"+clickedElementId).get()[0];
            clickedElement.click();
          } else {
            if (!navigation.isPathEqualTo(widget.interceptedLink)) {
              navigation.goTo(widget.interceptedLink);
              widget.removeEventHandlersForAnchorClick();
            }
          }
        };
        
        // handler for anchor click event.
        var handleUnsavedChanges = function(e, linkData) {
          var usingCCLink = linkData && linkData.usingCCLink;
          
          widget.isProfileLocaleNotInSupportedLocales(false);
          // If URL is changed explicitly from profile.
//          if(!usingCCLink && !navigation.isPathEqualTo(widget.links().profile.route)) {
//            widget.showViewProfile(false);
//            widget.removeEventHandlersForAnchorClick();
//            return true;
//          }
          if (widget.user().loggedIn()) {
            clickedElementId = this.id;
            widget.interceptedLink = e.currentTarget.pathname;
            if (widget.isUserProfileShippingEdited() || widget.isUserProfileDefaultAddressEdited()) {
              widget.showModal();
              usingCCLink && (linkData.preventDefault = true);
              return false;
            }
            else {
              widget.showViewProfile(false);
            }
          }
        };
        
        var controlErrorMessageDisplay = function(e) {
          widget.isProfileLocaleNotInSupportedLocales(false);
        };
        
        /**
         *  Adding event handler for anchor click.
         */
        widget.addEventHandlersForAnchorClick = function() {
          $("body").on("click.cc.unsaved","a",handleUnsavedChanges);
          $("body").on("mouseleave", controlErrorMessageDisplay);
        };
        
        /**
         *  removing event handlers explicitly that has been added when anchor links are clicked.
         */
        widget.removeEventHandlersForAnchorClick = function(){
          $("body").off("click.cc.unsaved","a", handleUnsavedChanges);
        };
      }
    };
  }
);
