/**
 * @fileoverview Google Analytics Tracking Widget.
 * 
 * This JS file updates the HTML body to include the Goolge Analytics tracking code. 
 * On the load we will read the tracking ID of the google account from the settings 
 * and use it for tracking.
 *
 * @author 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout','pubsub'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko,pubsub) {
    "use strict";
    var accountId = "";
	var defaultSiteAccountId = "";
	var currentSiteName = "";
	
    function GAInitialize(trackingId){
        $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '"+trackingId+"', 'auto'); ga('send', 'pageview', location.pathname);</script>");
    }
    

    return {
        onLoad : function(widget) {
            defaultSiteAccountId = widget.gaTrackingID();
			currentSiteName = widget.site().siteInfo.repositoryId;
        },
        beforeAppear : function(page){
			accountId = defaultSiteAccountId;
            new GAInitialize(accountId);
        }
    }
  }
);