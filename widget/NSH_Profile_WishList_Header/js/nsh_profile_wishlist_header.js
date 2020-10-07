/**
 * @fileoverview spaceSettingsHeaderWidget
 *
 */
/*global window: false */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery','knockout', 'pubsub', 'notifier', 'ccLogger', 'CCi18n'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($, ko, PubSub, notifier, logger, CCi18n) {

    "use strict";

    return {
      // Widget Id
      WIDGET_ID: "NSH_Profile_WishList_Header",

      // Observables
      showWidget: ko.observable(false),

      /**
       * Runs the first time the module is loaded on a page.
       * It is passed the widgetViewModel which contains the configuration from the server.
       */
      onLoad: function(widget) {

        //TODO: subscription to $Topics

        // In order to avoid timing issues with translation resource loading,
        // the computed value needs a dummy observable so that its value can
        // be refreshed once the resources have been properly loaded.
        widget.translationResourceTracker = ko.observable();

        widget.backToMyAcctTxt = ko.computed(function() {
          widget.translationResourceTracker();
          var successText = '<< ' + CCi18n.t(
              'ns.spacesettingsheader:resources.spaceSettingsHeaderBackToAcctText'
            );
            return successText;
          }, widget);
      },

      // Make sure computed string gets recalculated once the
      // resources have been properly loaded.
      resourcesLoaded: function(widget){
        if (widget.translationResourceTracker) {
          widget.translationResourceTracker.valueHasMutated();
        }
      },

      /**
       * Runs late in the page cycle on every page where the widget will appear.
       */
      beforeAppear: function(page) {
        var widget = this;
        if (widget.user().loggedIn() == false) {
          widget.showWidget(false);
        }
        else {
          widget.showWidget(true);
        }
      }

    }; //return
  }
);
