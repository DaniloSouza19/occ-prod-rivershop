define(

  ['knockout', 'CCi18n', 'jquery', 'ccConstants', 'ccStoreConfiguration',
    'viewModels/searchTypeahead', 'placeholderPatch', 'navigation', 'notifications', 'pubsub', 'notifier'
  ],

  function (ko, CCi18n, $, CCConstants, CCStoreConfiguration,
    searchTypeahead, placeholder, navigation, notifications, pubsub, notifier) {

    "use strict";
    

    return {

      WIDGET_ID: ko.observable("NSH_Footer"),


      resourcesLoaded: function (widget) { },

      rendered: function (widget) {

      },
      
      onLoad: function (widget) {
        $.Topic(pubsub.topicNames.PAGE_READY).subscribe(function(message){
          $('html, body').animate({scrollTop:0},500);
        });
      },

    }
  }
);