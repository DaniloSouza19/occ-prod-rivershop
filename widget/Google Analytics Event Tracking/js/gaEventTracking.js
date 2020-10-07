/**
 * @fileoverview Promotion Banner. 
 * 
 * @author 
 */
/*global $ */
/*global define */
/**
 * @fileoverview Promotion Banner. 
 * 
 * @author 
 */
/*global $ */
/*global define */
define(
    //-------------------------------------------------------------------
    // PACKAGE NAME
    //-------------------------------------------------------------------


    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'jquery', 'pubsub'],



    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, $, PubSub) {

        "use strict";


        return {
            onLoad: function(widget) {
				var trackingId = widget.gaTrackingID();

                $.Topic(PubSub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(
                    function() {
                        console.log("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'CreateAccount', eventAction: 'newUserRegistered', eventLabel: 'newUser'});</script>");
                        $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'CreateAccount', eventAction: 'newUserRegistered', eventLabel: 'newUser'});</script>");
                    }
                );
                $.Topic(PubSub.topicNames.NOTIFICATION_ADD).subscribe(function() {
                    var message = this;
                    var widgetId = widget.widgetId();
                    if ((message.text() === "Success! Your wish list has been created." || message.text() === "Success! Your remaining wish list was deleted. A new wish list was automatically created for you.")) {
                        console.log("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'CreateWishlist', eventAction: 'newWishListCreated', eventLabel: 'newWishList'});</script>");
                        $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'CreateWishlist', eventAction: 'newWishListCreated', eventLabel: 'newWishList'});</script>");
                    }
                });
                $.Topic(PubSub.topicNames.SEARCH_RESULTS_UPDATED).subscribe(function() {
                    var search = this;
                    if(search.searchResults.length !== 0){
                        console.log("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'userSearched', eventLabel: '"+search.searchAdjustments.originalSearchTerms[0]+"' , eventValue : "+search.totalRecordsFound+"});</script>");
                    
                        $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'userSearched', eventLabel: '"+search.searchAdjustments.originalSearchTerms[0]+"' , eventValue : "+search.totalRecordsFound+"});</script>");
    
                        if(search.searchAdjustments.suggestedSearches !== undefined){
                            var suggestedTermsJSON = search.searchAdjustments.suggestedSearches.search.searchAdjustments.originalTerms[0];
                            var suggestedTerms = "";
                            var suggestedTermsLength = suggestedTermsJSON.length;
                            if(suggestedTermsLength == 1){
                                suggestedTerms = suggestedTerms + suggestedTermsJSON[i].label 
                            }else{
                                for(var i=0;i<suggestedTermsLength;i++){
                                suggestedTerms = suggestedTerms + suggestedTermsJSON[i].label + ","
                            }
                            }
                            console.log("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'suggestedSearchTerms', eventLabel: '"+search.searchAdjustments.originalSearchTerms[0]+" = "+suggestedTerms+"'});</script>");
                            $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'suggestedSearchTerms', eventLabel: '"+search.searchAdjustments.originalSearchTerms[0]+" = "+suggestedTerms+"'});</script>");
                        }
                    }
                    
                });
                var cat;
                $.Topic(PubSub.topicNames.CATEGORY_UPDATED).subscribe(function(data) {
                    cat = data;
                    console.log(cat.categoryName);
                    }
                    );
                $.Topic(PubSub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).subscribe(function() {
                    var resultedRecordsForCollection = 0;
                    var search = this;
                    for(var i=0;i<search.navigation.length;i++){
                        if(search.navigation[i].displayName === "Price Range"){
                            for(var j=0;j<search.navigation[i].refinements.length;j++){
                                resultedRecordsForCollection = resultedRecordsForCollection + search.navigation[i].refinements[j].count;
                            }
                            
                        }
                    }
                    if(search.navigation.length !== 0){
                        console.log("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'userSearched', eventLabel: '"+cat.categoryName+"' , eventValue : "+search.navigation.length+"});</script>");
                        $("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', '" + trackingId + "', 'auto'); ga('send', 'event', { eventCategory: 'SearchEvent', eventAction: 'userNavigated', eventLabel: '"+cat.categoryName+"' , eventValue : "+resultedRecordsForCollection+"});</script>");
                    }
                });
            },
        };
    }
);
