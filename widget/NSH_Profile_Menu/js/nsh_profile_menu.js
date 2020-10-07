define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'jquery','navigation','pubsub','ccConstants', 'ccRestClient'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, $, navigation, PubSub, CCConstants, ccRestClient) {
  
    "use strict";
    
    return {
      WIDGET_ID: 'nsh_profile_menu',
      keyValuePair :ko.observableArray([]),
      currentTab: ko.observable(),
      userRoles:[],
      isUserB2B:false,
      subscriptions:[],
      activeTab: ko.observable(),

      addContainer: function(elemento) {
        $(elemento).parent().parent().parent().addClass("container");
        $('#page').addClass("bgIntern");
      },
      
      onLoad: function(widget) {  
        widget.isMobile = ko.observable(false);
        $(window).resize(function(){
             widget.checkResponsiveFeatures($(window).width());
           });
        widget.isUserB2B = widget.user().isB2BUser();
        if(widget.isUserB2B){
          for(var noOfRoles=0; noOfRoles< widget.user().rolesForCurrentOrganization().length; noOfRoles++){
             widget.userRoles.push(widget.user().rolesForCurrentOrganization()[noOfRoles]); 
          }
        }
        if(!(ccRestClient.profileType === "agentUI")) {
          widget.initializeWidgetData(widget.displayAndURL());
        } else {
          widget.agentConfiguration = require("agentViewModels/agentConfiguration");
          $.Topic(PubSub.topicNames.PAGE_CHANGED).subscribe(widget.triggerPageChangeEvent.bind(widget));
        }
      },
      
      beforeAppear: function(page) {
        var widget = this;
        if((ccRestClient.profileType === "agentUI")) {
          widget.agentConfiguration = require("agentViewModels/agentConfiguration");
          widget.agentConfigurationData =  widget.agentConfiguration.getConfigurationProperty(CCConstants.AGENT_CONFIGURATIONS);
          widget.subscriptions.push(widget.currentTab.subscribe(function(pValue) {
            widget.activeTab(pValue);
          }));
          widget.isUserB2B = widget.user().isB2BUser();
          var keyValueStrings = JSON.parse(widget.displayAndURL().replace(/'/g, '"'));
          widget.initializeAgentWidgetData(widget.displayAndURL());
          if (!(keyValueStrings.length>0 && (keyValueStrings[0]["2"] === undefined))) {
            widget.widgetSubscriptions();
          }
        } else {
          widget.initializeWidgetData(widget.displayAndURL())
        }
        widget.currentTab("/"+page.pageId);
        widget.checkResponsiveFeatures($(window).width());
      },
      
      triggerPageChangeEvent: function () {
          var widget = this;
          var length = widget.subscriptions.length;
          for (var i =0; i<length; i++){
             widget.subscriptions[i].dispose();
          } 
          widget.subscriptions = []
      },
      
      widgetSubscriptions: function() {
       var widget = this;
       if(widget.isUserB2B) {
         widget.subscriptions.push(widget.user().rolesForCurrentOrganization.subscribe(function(pValue){
           widget.userRoles = [];
           widget.isUserB2B = widget.user().isB2BUser();
           var currentTab = widget.currentTab();
           if(widget.isUserB2B){
             for(var noOfRoles=0; noOfRoles< widget.user().rolesForCurrentOrganization().length; noOfRoles++){
             	widget.userRoles.push(widget.user().rolesForCurrentOrganization()[noOfRoles]); 
             }
           }
           if(!(ccRestClient.profileType === "agentUI")) {
             widget.initializeWidgetData(widget.displayAndURL());
           } else {
             widget.initializeAgentWidgetData(widget.displayAndURL());
           }
           var hasPermissionForCurrentTab = true;
           for(var i=0;i<widget.keyValuePair().length;i++) {
             if (currentTab === widget.keyValuePair()[i].route) {
               hasPermissionForCurrentTab = true;
               break;
             } else {
               hasPermissionForCurrentTab = false;
             }
           }
           if (!hasPermissionForCurrentTab) {
             widget.currentTab(widget.links().agentCustomerDetails.route);
             widget.user().navigateToPage(widget.links().agentCustomerDetails.route);
           } else {
             widget.currentTab(currentTab);
           }
         }));
       }
      },
      
      /**
       * Function that determines if the template in secondary-navigation should be mobile or desktop.
       */
      checkResponsiveFeatures : function(viewportWidth) {
	      if(viewportWidth >= 768) {
	        this.isMobile(false);
	      }   
	      else if(viewportWidth < 768){
	        this.isMobile(true);
	      }
	    },
	    /**
	     * Creates displayname and link from the data received.
	     */
      initializeWidgetData: function(widgetData){
        if (widgetData) {
          this.keyValuePair.removeAll();
          var keyValueStrings = JSON.parse(widgetData.replace(/'/g, '"'));
          if(!this.isUserB2B){
            for (var i = 0; i < keyValueStrings.length; i++) {
            	if(keyValueStrings[i]['0'] !=="" && keyValueStrings[i]['1']!==""){
            		this.keyValuePair.push({
                  displayName: keyValueStrings[i]['0'],
                  route: keyValueStrings[i]['1']});
            	}              
            }
          }else if(this.isUserB2B){
            for (var i = 0; i < keyValueStrings.length; i++) {
              var rolesToDisplay= keyValueStrings[i]['2'].split(',');
              for(var j=0;j<rolesToDisplay.length; j++){  
                if (this.validateUserRole(this.userRoles,rolesToDisplay[j])){
                    if(keyValueStrings[i]['0'] !=="" && keyValueStrings[i]['1']!==""){
                        this.keyValuePair.push({
                      displayName: keyValueStrings[i]['0'],
                      route: keyValueStrings[i]['1']});
                    }
                  break;
                }
              }
            }
          }    
        }
      },
      /**
      * Check user roles against the allowable roll.
      */
      validateUserRole: function(userRoles, displayRole){
        var len = userRoles.length;
          var roleFound = false;
        for(var i=0;i<len;i++){
            if(userRoles[i]===displayRole){
              roleFound =true;
            break;
            }
          }
          return roleFound;
      },
      initializeAgentWidgetData: function(widgetData) {
        var widget = this;
        var contextManager = require("agentViewModels/agent-context-manager");
        var agentShopperProfileId = contextManager.getInstance().getShopperProfileId();
        var siteId = contextManager.getInstance().getSelectedSite();
        var organizationId = contextManager.getInstance().getCurrentOrganizationId();
        var profileInfo = '';
        // Append customer id, site id and organization id to the url if this is profile page in agent
        if(agentShopperProfileId && (widget.metaPageType && widget.metaPageType() === CCConstants.AGENT_PROFILE_PAGE_META_TYPE)){
          profileInfo += "?" + CCConstants.AGENT_PARAM_CUSTOMER_ID + "=" + agentShopperProfileId;
        }
        var addKeyValurPair = true;
        if (widgetData){
          widget.keyValuePair([]);
          var keyValueStrings = JSON.parse(widgetData.replace(/'/g, '"'));
          if (!widget.isUserB2B) {
            keyValueStrings = widget.showB2CUserSpecificTabNames(keyValueStrings);
          }
          if(keyValueStrings && keyValueStrings.length > 0) {
            //if Roles are not present
            if (keyValueStrings[0]["2"] === undefined) {
              var keyValueStrings = JSON.parse(widget.displayAndURL().replace(/'/g, '"'));
              for (var i=0;i<keyValueStrings.length;i++) {
                 widget.keyValuePair.push({
                    displayName: keyValueStrings[i]['0'],
                    route: keyValueStrings[i]['1'],
                    url : keyValueStrings[i]['1'] + profileInfo});
              }
            } else {
              //if Roles are present
              var rolesToDisplay = null;
              for (var i=0;i<keyValueStrings.length;i++) {
                rolesToDisplay=keyValueStrings[i]['2'].split(',');
                for (var j=0;j<rolesToDisplay.length;j++) {
                  if (rolesToDisplay[j]==="") {
                    widget.keyValuePair.push({
                      displayName: keyValueStrings[i]['0'],
                      route: keyValueStrings[i]['1'],
                      url : keyValueStrings[i]['1'] + profileInfo});
                    break;
                  } else {
                    if(rolesToDisplay[j] === "approver" && widget.agentConfigurationData && !widget.agentConfigurationData.orderApprovalsAllowedThroughAgent) {
                      addKeyValurPair = false;
                    }
                    if(rolesToDisplay[j] === "admin" && widget.agentConfigurationData && !widget.agentConfigurationData.delegatedAdminAllowedThroughAgent) {
                      addKeyValurPair = false;
                    }
                    if (widget.isUserB2B && addKeyValurPair && (widget.user().rolesForCurrentOrganization().indexOf(rolesToDisplay[j]))!== -1) {
                      widget.keyValuePair.push({
                        displayName: keyValueStrings[i]['0'],
                        route: keyValueStrings[i]['1'],
                        url : keyValueStrings[i]['1'] + profileInfo});
                      break;
                    } else {
                      addKeyValurPair = true;
                    }
                  }
                }
              }
            }
          }
        }
      },
      
      showB2CUserSpecificTabNames: function (pConfig) {
        for (var i = 0; i < pConfig.length; ++i) {
          if (pConfig[i][1] === "/agentAddressBook") {
            pConfig[i][0] = "addressBookText";
            break;
          }
        }
        return pConfig;
      },
      
      onClick: function(pData,pIndex) {
        var widget = this;
        widget.currentTab(pData.route);
      }
    };
  }
);

