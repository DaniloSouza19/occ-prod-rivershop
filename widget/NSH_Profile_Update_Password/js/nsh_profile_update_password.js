/**
 * @fileoverview Update Password Widget.
 *
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'navigation', 'notifier', 'ccConstants', 'ccPasswordValidator', 'CCi18n'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, PubSub, navigation, notifier, CCConstants, CCPasswordValidator, CCi18n) {
  
    "use strict";
        
    return {
      
      WIDGET_ID:        "NSH_Profile_Update_Password",
      ignoreBlur:   ko.observable(false),
      interceptedLink: ko.observable(null),
      isUserProfileInvalid: ko.observable(false),
      isProfileLocaleNotInSupportedLocales : ko.observable(),
      
      beforeAppear: function (page) {
         // Every time the user goes to the profile page,
         // it should fetch the data again and refresh it.
        var widget = this;
        
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
          widget.user().isChangePassword(true);
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
        
        widget.showViewProfile = function (refreshData) {
          // Fetch data in case it is modified or requested to reload.
          // Change all div tags to view only.
          if(refreshData) {
            widget.user().getCurrentUser(false);
          }
        };

        /**
         * Ignores password validation when the input field is focused.
         */
        widget.passwordFieldFocused = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignorePasswordValidation(true);
          this.user().isUserProfileEdited(true);
          return true;
        };

        /**
         * Password is validated when the input field loses focus (blur).
         */
        widget.passwordFieldLostFocus = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignorePasswordValidation(false);        
          return true;
        };
        
        widget.inputFieldFocused = function(data, event) {
        	this.user().isUserProfileEdited(true);
        	return true;
        };

        /**
         * Ignores confirm password validation when the input field is focused.
         */
        widget.confirmPwdFieldFocused = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().isUserProfileEdited(true);
          this.user().ignoreConfirmPasswordValidation(true);
          return true;
        };

        /**
         * Confirm password is validated when the input field loses focus (blur).
         */
        widget.confirmPwdFieldLostFocus = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignoreConfirmPasswordValidation(false);
          return true;
        };

        /**
         * Ignores the blur function when mouse click is up
         */
        widget.handleMouseUp = function() {
            this.ignoreBlur(false);
            this.user().ignoreConfirmPasswordValidation(false);
            return true;
          };
          
          /**
           * Ignores the blur function when mouse click is down
           */
          widget.handleMouseDown = function() {
            this.ignoreBlur(true);
            this.user().ignoreConfirmPasswordValidation(true);
            return true;
          };
          
        widget.hideModal = function () {
          if(isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
            $("#CC-customerProfile-modal-2").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        };
        
        widget.showModal = function () {
          $("#CC-customerProfile-modal-2").modal('show');
          isModalVisible(true);
        };
        
        // Handle cancel update.
        widget.handleCancelUpdateForUpdatePassword = function () {
          widget.showViewProfile(true);
          widget.user().resetPassword();
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.hideModal();
          widget.user().isUserProfileEdited(false)
        };
        
        // Discards user changes and navigates to the clicked link.
        widget.handleModalCancelUpdateDiscard = function () {
          widget.handleCancelUpdateForUpdatePassword();
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
            widget.user().isUserProfileEdited(false);
          }
          else {
          	widget.user().isUserProfileEdited(false);
            widget.navigateAway();
          }
        };
        
        // Handles User profile update for password change
        widget.handleUpdateProfileForUpdatePassword = function () {
          var inputParams = {};
          var isDataInValid = false;
          var isDataModified = false;
          var includeUserPassword = false;
          if (!widget.user().isPasswordValid()) {
            isDataInValid = true;
          }else {
            includeUserPassword = true;
          }
          if (widget.user().isPasswordModified()) {
            isDataModified = true;
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
          if(includeUserPassword){
            widget.user().handleUpdatePassword(inputParams);
          }
          widget.user().invokeUpdateProfile(inputParams);
        };
        
        // Handles User profile update for password change and navigates to the clicked link.
        widget.handleModalUpdateProfile = function () {
          isModalSaveClicked(true);
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.handleUpdateProfileForUpdatePassword();
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
            return;
          }
          if (clickedElementId != "CC-loginHeader-myAccount") {
            widget.user().delaySuccessNotification(true);
          }
          widget.handleUpdateProfileForUpdatePassword();
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
          widget.showViewProfile(true);
          // Clears error message.
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          if (!widget.user().delaySuccessNotification()) {
            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('updateSuccessMsg'), true);
          }
          widget.hideModal();
          widget.user().isUserProfileEdited(false);
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
            if (data.errorCode == CCConstants.USER_PROFILE_OLD_PASSWORD_INCORRECT) {
              $('#CC-customerProfile-soldPassword-phone-error-1').css("display", "block");
              $('#CC-customerProfile-soldPassword-phone-error-1').text(data.message);
              $('#CC-customerProfile-soldPassword-phone').addClass("invalid");
              $('#CC-customerProfile-spassword1-error-1').css("display", "block");
              $('#CC-customerProfile-spassword1-error-1').text(data.message);
              $('#CC-customerProfile-soldPassword-1').addClass("invalid");
            } else if (data.errorCode == CCConstants.USER_PROFILE_PASSWORD_POLICIES_ERROR) {
              $('#CC-customerProfile-spassword-error-1').css("display", "block");
              $('#CC-customerProfile-spassword-error-1').text(CCi18n.t('ns.common:resources.passwordPoliciesErrorText'));
              $('#CC-customerProfile-spassword-1').addClass("invalid");
              $('#CC-customerProfile-spassword-embeddedAssistance-1').css("display", "block");
              var embeddedAssistance = CCPasswordValidator.getAllEmbeddedAssistance(widget.passwordPolicies(), true);
              $('#CC-customerProfile-spassword-embeddedAssistance-1').text(embeddedAssistance);
            } else if (data.errorCode === CCConstants.USER_PROFILE_INTERNAL_ERROR) {
              msg = data.message;
              // Reloading user profile and shipping data in edit mode.
              widget.user().getCurrentUser(false);
              widget.reloadShipping();
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
