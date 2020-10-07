/**
 * @fileoverview spaceSettingsNotificationWidget
 *
 */
/*global window: false */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery','knockout', 'navigation', 'pubsub', 'notifier', 'CCi18n', 'swmRestClient', 'swmKoValidateRules', 'storageApi'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($, ko, navigation, PubSub, notifier, CCi18n, swmRestClient, swmKoValidateRules, storageApi) {

    "use strict";

    return {
      // Widget Id
      WIDGET_ID: "NSH_Profile_WishList_Settings",

      // Observables
      showWidget: ko.observable(false),
      notificationSettingComments: ko.observable(false),
      notificationSettingNewMember: ko.observable(false),
      isSettingsFormDirty : ko.observable(false),

      /**
       * Runs the first time the module is loaded on a page.
       * It is passed the widgetViewModel which contains the configuration from the server.
       */
      onLoad: function(widget) {

        swmRestClient.init(widget.site().tenantId, widget.isPreview(), widget.locale());

        // subscribe to when name/value parameters appear in the url
        $.Topic(PubSub.topicNames.PAGE_PARAMETERS).subscribe(
          function () {
            if (this.parameters.email)
              widget.checkEmailParameterCallback(this);
          }
        );

        // callbacks for when user logs in to view settings
        widget.loginCallback = widget.loginCallback.bind(widget);
        $.Topic(PubSub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(widget.loginCallback);
        $.Topic(PubSub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(widget.loginCallback);
        
        // handle user logout, clear widget state.
        $.Topic(PubSub.topicNames.USER_LOGOUT_SUBMIT).subscribe(
          function(obj) {
            widget.resetWidget();
            navigation.goTo(widget.links().home.route);
          }
        );

      },

      toggleCommentsNotificationSetting: function(widget, event){
        widget.isSettingsFormDirty(true);

        if (widget.notificationSettingComments()){
          widget.notificationSettingComments(false);
        } else {
          widget.notificationSettingComments(true);
        }
      },

      toggleNewMemberNotificationSetting: function(widget, event){
        widget.isSettingsFormDirty(true);

        if (widget.notificationSettingNewMember()){
          widget.notificationSettingNewMember(false);
        } else {
          widget.notificationSettingNewMember(true);
        }
      },

      settingsCancelHandler : function(){
        var widget = this;

        widget.notificationSettingNewMember(widget.prevNewMemberSettingVal);
        widget.notificationSettingComments(widget.prevCommentsSettingVal);

        widget.isSettingsFormDirty(false);
      },

      settingsSaveHandler : function(){
        var widget = this;

        if (widget.prevNewMemberSettingVal == widget.notificationSettingNewMember()
              && widget.prevCommentsSettingVal == widget.notificationSettingComments())
        {
          widget.isSettingsFormDirty(false);
          return;
        }

        var successCB = function(result){

          if (result.response.code === '200.1'){
            widget.prevNewMemberSettingVal = widget.notificationSettingNewMember();
            widget.prevCommentsSettingVal = widget.notificationSettingComments();
            widget.isSettingsFormDirty(false);
          }
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.sendSuccess( widget.WIDGET_ID, widget.translate('spaceSettingsSaveSuccessTxt'), true );
        };

        var errorCB = function(response, status, errorThrown){
          notifier.clearError(widget.WIDGET_ID);
          notifier.sendError( widget.WIDGET_ID, widget.translate('spaceSettingsSaveErrorTxt'), true );
          widget.settingsCancelHandler();
        };

        var commentFlag = widget.notificationSettingComments() ? '1' : '0' ;
        var newMemberFlag = widget.notificationSettingNewMember() ? '1' : '0' ;
        var json = {
            notifyCommentFlag : commentFlag
            , notifyNewMemberFlag : newMemberFlag
        };
        swmRestClient.request('PUT', '/swm/rs/v1/sites/{siteid}/users/{userid}', json, successCB, errorCB, {
          "userid" : swmRestClient.apiuserid
        });
      },
      /**
       * Get User information from SWM, and then populate ViewModel data. 
       */
      getUser : function() {
        var widget = this;

        var successCB = function(result){
          if (result.response.code === '200.0'){
            var notifyCommentSettingEnabled = result.notifyCommentFlag === '1' ? true : false ;
            var notifyNewMemberSettingEnabled = result.notifyNewMemberFlag === '1' ? true : false ;

            widget.notificationSettingComments(notifyCommentSettingEnabled);
            widget.notificationSettingNewMember(notifyNewMemberSettingEnabled);

            widget.prevNewMemberSettingVal = widget.notificationSettingNewMember();
            widget.prevCommentsSettingVal = widget.notificationSettingComments();

            // Show the page
            widget.showWidget(true);
          }
        };

        var errorCB = function(response, status, errorThrown){
          widget.resetWidget();
        };

        if (swmRestClient.apiuserid) {
          swmRestClient.request('GET', '/swm/rs/v1/sites/{siteid}/users/{userid}', '', successCB, errorCB, {
            "userid" : swmRestClient.apiuserid
          }); 
        }
        else {
          widget.syncCCUserWithSWM(widget);
        }
      },

      resetWidget: function() {
        var widget = this;
        widget.showWidget(false);
        widget.notificationSettingComments(false);
        widget.notificationSettingNewMember(false);
        widget.isSettingsFormDirty(false);
      },
      /**
       * Call ccsync with SWM, then call getUser() method to populate the ViewModel data
       */
      syncCCUserWithSWM : function(arg1){
        var widget = this;
        var successCB = function(result){
          widget.getUser();
        };
        var errorCB = function(response, status, errorThrown){};
        swmRestClient.syncCCUser(successCB, errorCB);
      },
      /**
       * Runs late in the page cycle on every page where the widget will appear.
       */
      beforeAppear: function(page) {
        var widget = this;

        if (widget.user().loggedIn() == false) {
          widget.showWidget(false);
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        }
        else {
          widget.resetWidget();
          // Refresh header login/logout state
          widget.user().getCurrentUser(false);

          widget.getUser();

          // Clear any curtain messages
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);

        }
      },

      /**
       * Login callback that redirects back to wishlist settings page if had
       * to logout and log back in during email parameter check.
       */
      loginCallback: function() {
        var widget = this;
        if (storageApi.getInstance().getItem('social.settingsLoginCallback'))
        {
          navigation.goTo(widget.links().wishlist_settings.route);
          storageApi.getInstance().removeItem('social.settingsLoginCallback');
        }
      },
      /**
       * If user is loggedIn AND parameter (email) matches the loggedIn user email, then logout the user and trigger login modal.
       * If user is NOT loggedIn, just trigger login modal
       * Otherwise do nothing, flow without parameter (email) is handled by beforeAppear() 
       */
      processEmailCheck : function(email) {
        var widget = this;
        storageApi.getInstance().setItem('social.settingsLoginCallback', 'true');
        
        if (widget.user().loggedIn() &&
            widget.user().emailAddress().toUpperCase() != email.toUpperCase())
        {
          // user is somebody else, log them out and prompt for login
          swmRestClient.clear();
          $.Topic(PubSub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{message: "success"}]);
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        }
        else if (widget.user().loggedIn() == false)
        {
          // not logged in, prompt for login
          swmRestClient.clear();
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        }
      },
      /**
       * Executed when email name/value parameter is detected in the page url.
       */
      checkEmailParameterCallback : function(page) {
        var widget = this;
        // if on spaces page and has invite and email parameters, execute user email check flow.
        if (page.pageId === 'wishlist_settings' && page.parameters.email) {
          widget.processEmailCheck(page.parameters.email);
        }
      }

    }; //return
  }
);
