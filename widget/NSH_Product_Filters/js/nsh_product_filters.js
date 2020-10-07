/**
 * @fileoverview Overlayed Guided Navigation Widget. 
 * 
 */
define(
 
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout','viewModels/guidedNavigationViewModel', 'CCi18n',
  'ccConstants', 'pubsub'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(ko, GuidedNavigationViewModel, CCi18n, CCConstants, pubsub) {  
  
    "use strict";
  
    return {

      isMobile: ko.observable(true),

      addContainer: function(elemento) {
        $(elemento).parent().parent().parent().addClass("container");
      },

      /**
        Overlayed Guided Navigation Widget.
        @private
        @name guided-navigation
        @property {observable GuidedNavigationViewModel} view model object representing the guided navigation details
       */
      onLoad : function(widget) {
        widget.guidedNavigationViewModel = ko.observable();
        widget.guidedNavigationViewModel(new GuidedNavigationViewModel(widget.maxDimensionCount(), widget.maxRefinementCount(), widget.locale()));
        widget.isExpanded = ko.observable(true);
        widget.isNavigationVisible = ko.observable(true);
           isMobile: ko.observable(false),
        widget.hideRefinements = function() {
          widget.isNavigationVisible(false);
          $('html, body').css('overflow-y', 'initial');
        
          if ($('#CC-overlayedGuidedNavigation').hasClass('CC-overlayedGuidedNavigation-mobileView')) {
            $('#CC-overlayedGuidedNavigation').removeClass('CC-overlayedGuidedNavigation-mobileView');
          }
          if ( widget.guidedNavigationViewModel().dimensions() && widget.guidedNavigationViewModel().dimensions().length > 0 ) {
            for (var i = 0; i < widget.guidedNavigationViewModel().dimensions().length; i++) {
              if (widget.guidedNavigationViewModel().dimensions()[i].shouldDimensionExpand()) {
                widget.guidedNavigationViewModel().dimensions()[i].shouldDimensionExpand(false);
              }
            }
          }
        };
        widget.openNavigation = function() {
          widget.isNavigationVisible(true);
        };
        $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).subscribe(widget.hideRefinements);
        $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_SHOW).subscribe(widget.openNavigation);

        $(window).scroll(function () {
          // $(window).scrollTop() >= 100 ? $(".header, #dropdowncart").addClass("fixed") : $(".header, #dropdowncart").removeClass("fixed")
        })

        if (window.innerWidth < 994) {
          widget.isMobile(true);
 
          var actualWindow = "mobile";
        } else {
          widget.isMobile(false);
          var actualWindow = "desktop";
        }

        $(window).resize(function () {
          if (window.innerWidth < 994) {
            $("#navTrigger").click(function (e) {
              $(this).toggleClass('open');
              e.preventDefault();
              $("body").toggleClass("leftBody");
              $("#mySidenav").toggleClass("toggled");
            });

            if (actualWindow == "desktop") {
              actualWindow = "mobile";
        


              widget.isMobile(true);
            }
          } else {

            if (actualWindow == "mobile") {
              actualWindow = "desktop";
              $("body").removeClass("leftBody");
              widget.isMobile(false);
            }
          }
        });



      },
      
      /**
       * Handles click on Done button .It hides the overlayed guided navigation.
       */
      handleHideRefinements : function(data, event) {
        this.hideRefinements();
        $('#CC-productList-refineResults').focus();
        return false;
      },
      
      /**
       * Handles click on the collapsible dimensions list.
       */
      collapseDimension : function(data, event) {
        if (!data.isExpanded()) {
          data.isExpanded(true);
          data.ariaLabelText('collapseText');
        } else {
          data.isExpanded(false);
          data.ariaLabelText('expandText');
        }
      }
    };
    
  }
);
