/**
 * @fileoverview spaceSettingsHeaderWidget
 *
 */
/*global window: false */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery','knockout', 'pubsub', 'notifier', 'ccLogger', 'CCi18n', 'swmRestClient'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($, ko, PubSub, notifier, logger, CCi18n, swmRestClient) {

    "use strict";

    return {
      // Widget Id
      WIDGET_ID: "nsh_wishlist_welcome",
      showWidget: ko.observable(false),

      /**
       * Login link handler for link shown when user is not logged in.
       */
      clickLogin: function(data, event) {
        notifier.clearSuccess(this.WIDGET_ID);
        notifier.clearError(this.WIDGET_ID);
        data.reset();
        this.hideAllSections();

        $('#CC-headermodalpane').one('show.bs.modal', function() {
          $('#CC-loginUserPane').show();
        });

        // focus on textarea after modal css transitions
        $('#CC-headermodalpane').one('shown.bs.modal', function() {
          if (!data.loggedIn() && data.login() && data.login() != '' && data.isUserSessionExpired()) {
            data.populateUserFromLocalData(true);
            $('#CC-login-password-input').focus();
            data.password.isModified(false);
          } else {
            $('#CC-login-input').focus();
            data.login.isModified(false);
          }
        });

        // show modal content right away
        $('#CC-headermodalpane').one('hide.bs.modal', function() {
          $('#CC-loginUserPane').hide();
        });

        $(window).scrollTop('0');
        $('#CC-headermodalpane').show();
      },

      /**
       * Invoked when registration link is clicked
       */
      clickRegistration: function(data, event) {
        notifier.clearSuccess(this.WIDGET_ID);
        notifier.clearError(this.WIDGET_ID);
        data.reset();
        this.hideAllSections();

        $('#CC-headermodalpane').one('show.bs.modal', function() {
          $('#CC-registerUserPane').show();
        });

        // focus on textarea after modal css transitions
        $('#CC-headermodalpane').one('shown.bs.modal', function() {
          $('#CC-userRegistration-firstname').focus();
          data.firstName.isModified(false);
        });

        // show modal content right away
        $('#CC-headermodalpane').one('hide.bs.modal', function() {
          $('#CC-registerUserPane').hide();
        });

        $(window).scrollTop('0');
        $('#CC-headermodalpane').show();
      },

      /**
       * Hides all the sections of  modal dialogs.
       */
      hideAllSections: function() {
        $('#CC-loginUserPane').hide();
        $('#CC-registerUserPane').hide();
        $('#CC-forgotPasswordSectionPane').hide();
        $('#CC-forgotPasswordMessagePane').hide();
        $('#CC-createNewPasswordMessagePane').hide();
        $('#CC-createNewPasswordPane').hide();
        $('#CC-updatePasswordPane').hide();
        $('#CC-updatePasswordMessagePane').hide();
        $('#CC-updatePasswordErrorMessagePane').hide();
      },
      
      isLoggedIn: function() {
        var widget = this;
        if (widget.user().loggedIn() && widget.user().id() == "") {
          // If the UserViewModel says the user is logged in, but no profileId, then its from Layout Manager Preview
          return false;
        }
        
        return widget.user().loggedIn();
      },
      /**
       * Runs the first time the module is loaded on a page.
       * It is passed the widgetViewModel which contains the configuration from the server.
       */
      onLoad: function(widget) {
        // initialize swm rest client
        swmRestClient.init(widget.site().tenantId, widget.isPreview(), widget.locale());
        
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).subscribe(function() {
          widget.showWidget(true);   
        });
      },

      /**
       * Runs late in the page cycle on every page where the widget will appear.
       */
      beforeAppear: function(page) {
        var widget = this;
        // If we're in Design studio Layout Manager preview .... do nothing
        if (widget.user().loggedIn() && widget.user().id() == "") {
          widget.showWidget(true);
          return;
        }
        
        if(page.contextId){
          widget.showWidget(false);
        }
        else {
          widget.showWidget(true);
        }
      }

    }; // end return
  }
);
