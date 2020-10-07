/**
 * @fileoverview Shopper Details Widget.
 *
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'navigation', 'notifier', 'ccConstants', 'CCi18n', 'swmRestClient'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, PubSub, navigation, notifier, CCConstants, CCi18n, swmRestClient) {
  
    "use strict";
        
    return {
      
      WIDGET_ID:        "NSH_Profile_Account_Details",
      ignoreBlur:   ko.observable(false),
      interceptedLink: ko.observable(null),
      isUserProfileInvalid: ko.observable(false),
      showSWM : ko.observable(true),
      isProfileLocaleNotInSupportedLocales : ko.observable(),
      
      beforeAppear: function (page) {
         
        var widget = this;
        // Checks whether the user is logged in or not
        // If not the user is taken to the home page
        // and is asked to login.
        if (widget.user().loggedIn() == false) {
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        } else if (widget.user().isSessionExpiredDuringSave()) {
          widget.user().isSessionExpiredDuringSave(false);
        } else {
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
        }
      },
      
      onLoad: function(widget) {
        var self = this;
        var isModalVisible = ko.observable(false);
        var clickedElementId = ko.observable(null);
        var isModalSaveClicked = ko.observable(false);
        
        widget.ErrorMsg = widget.translate('updateErrorMsg');
        widget.passwordErrorMsg = widget.translate('passwordUpdateErrorMsg');
        
        widget.getProfileLocaleDisplayName = function() {
          //Return the display name of profile locale
          for (var i=0; i<widget.user().supportedLocales.length; i++) {
            if (widget.user().locale() === widget.user().supportedLocales[i].name) {
              return widget.user().supportedLocales[i].displayName; 
            }
          }
        };
        
        //returns the edited locale to be displayed in non-edit mode
        widget.getFormattedProfileLocaleDisplayName = function(item) {
          return item.name.toUpperCase() + ' - ' + item.displayName;
        };
        
        widget.showViewProfile = function (refreshData) {
          // Fetch data in case it is modified or requested to reload.
          // Change all div tags to view only.
          if(refreshData) {
            widget.user().getCurrentUser(false);
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
          
        widget.hideModal = function () {
          if(isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
            $("#CC-customerProfile-modal-1").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        };
        
        widget.showModal = function () {
          $("#CC-customerProfile-modal-1").modal('show');
          isModalVisible(true);
        };
        
        // Handle cancel update.
        widget.handleCancelUpdateForShopperDetails = function () {
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.hideModal();
          this.user().isUserProfileEdited(false);
        };
        
        // Discards user changes and navigates to the clicked link.
        widget.handleModalCancelUpdateDiscard = function () {
          widget.handleCancelUpdateForShopperDetails();
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
          }
          else {
            widget.navigateAway();
          }
        };
         
        // Handles User profile update for account details
        widget.handleUpdateProfileForShopperDetails = function () {
          var inputParams = {};
          var isDataInValid = false;
          var isDataModified = false;
          var includeUserProfile = false;
          var includeDynamicProperties = false;
          // checking whether user profile is modified/valid.
          if (widget.user().isProfileModified()) {
           if (!widget.user().isProfileValid()) {
              isDataInValid = true;
           } else {
              includeUserProfile = true;
           }
           isDataModified = true;
          }
           if (widget.user().dynamicProperties().length > 0) {
             if (widget.user().isDynamicPropertiesModified()) {
              for ( var i = 0; i < widget.user().dynamicProperties().length; i++) {
                var dynProp = widget.user().dynamicProperties()[i];
                if (!dynProp.isValid()) {
                   isDataInValid = true;
                   break;
                 }
              }
            if (!isDataInValid) {
                includeDynamicProperties = true;
            }
             isDataModified = true;
           }
          }
          if (!isDataModified) {
           // If data is not modified, show the view profile page.
           $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).publish();
           return;
          } else if (isDataInValid) {
           // If data is invalid, show error message.
           $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).publish();
           return;
          }
          if(includeUserProfile){
             widget.user().handleAccountDetailsUpdate(inputParams);
          }
          if(includeDynamicProperties){
             widget.user().handleDynamicPropertiesUpdate(inputParams);
          }
           widget.user().invokeUpdateProfile(inputParams);
        };
        
        // Handles User profile update for account details and navigates to the clicked link.
        widget.handleModalUpdateProfile = function () {
          isModalSaveClicked(true);
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.handleUpdateProfileForShopperDetails();
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
            return;
          }
          if (clickedElementId != "CC-loginHeader-myAccount") {
            widget.user().delaySuccessNotification(true);
          }
          widget.handleUpdateProfileForShopperDetails();
        };
        
        
       // Handles if data does not change. 
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
          widget.user().isUserProfileEdited(false);
        });

        //handle if the user logs in with different user when the session expiry prompts to relogin
        $.Topic(PubSub.topicNames.USER_PROFILE_SESSION_RESET).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
          this.user().isUserProfileEdited(false);
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
          // update user in Social module
        	widget.user().isUserProfileEdited(false);
          if (widget.displaySWM) {
            var successCB = function(result){
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).publish();
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBERS_INFO_CHANGED).publish();
            };
            var errorCB = function(response, status, errorThrown){};
            
            var json = {};
            if (widget.user().emailMarketingMails()) {
              json = {
                firstName : widget.user().firstName()
                , lastName : widget.user().lastName()
              };
            }
            else {
              json = {
	                firstName : widget.user().firstName()
	                , lastName : widget.user().lastName()
	                , notifyCommentFlag : '0'
                  , notifyNewMemberFlag : '0'
	            };
	          }
	          
            swmRestClient.request('PUT', '/swm/rs/v1/sites/{siteid}/users/{userid}', json, successCB, errorCB, {
              "userid" : swmRestClient.apiuserid
            });
          }
          
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
          $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
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
            } 
            else {
              msg = data.message;
            }
            notifier.sendError(widget.WIDGET_ID, msg, true);
            widget.hideModal();
          }
          $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
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
            if (widget.user().isUserProfileEdited()) {
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
        
        widget.inputFieldFocused = function(data, event) {
        	this.user().isUserProfileEdited(true);
        	return true;
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
