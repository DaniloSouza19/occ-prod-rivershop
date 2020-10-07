/**
 * @fileoverview spaceHeaderWidget
 *
 */
/*global window: false */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub', 'notifier', 'ccLogger', 'CCi18n', 'swmRestClient', 'swmKoValidateRules', 'ccRestClient', 'ccConstants', 'navigation', 'facebookjs', 'storageApi', 'pinitjs'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($, ko, PubSub, notifier, logger, CCi18n, swmRestClient, swmKoValidateRules, ccRestClient, CCConstants, navigation , facebookjs, storageApi, pinitjs) {

    "use strict";

    var MAX_FILE_SIZE = 1024 * 1024 * 10; // 10 MB
    var NO_IMAGE_IMG = "/images/stockuserprofileimage000.png";

    var mySpacesComparator = function(opt1, opt2) {
      if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
        return 1;
      } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
        return -1;
      } else {
        return 0;
      }
    };
    var joinedSpacesComparator = function(opt1, opt2) {
      if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
        return 1;
      } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
        return -1;
      } else {
        return 0;
      }
    };

    var IDEA_TEXTAREA_HEIGHT_FACTOR = 2; 

    return {

      WIDGET_ID : "nsh_wishlist_header",
      spaceTitle: ko.observable(''),
      spaceAccessLevel : ko.observable('0'),
      currentSpaceId : ko.observable(''),
      currentSpaceOwnerId : ko.observable(''),
      spaceOptionsArray: ko.observableArray([]),
      createSpaceName: ko.observable(''),
      createSpaceAccessLevel : ko.observable('0'),
      showWidget: ko.observable(false),
      userIsSpaceOwner : ko.observable(false),
      currentUserIsMember : ko.observable(false),
      errBadRequestSpaceName: ko.observable(false),
      uploadProfileImgFileName : ko.observable(''),
      

      // Observables for Site
      siteName: ko.observable(''),

      // Space members Widget
      currentUserFullName : ko.observable(""),
      currentUserMediaUrl : ko.observable(""),
      removalMembersList: ko.observableArray([]),

      /**
       * Runs the first time the module is loaded on a page.
       * It is passed the widgetViewModel which contains the configuration from the server.
       */
      addContainer: function(elemento) {
        $(elemento).parent().parent().parent().addClass("container");
        $('#page').addClass("bgIntern");
      },
      onLoad: function (widget) {

        // initialize swm rest client
        swmRestClient.init(widget.site().tenantId, widget.isPreview(), widget.locale());
        facebookjs.init(widget.isPreview());
        
        
        // Declarations
        widget.swmhostbaseurl = swmRestClient.swmhost;
        widget.swmhostimagesbaseurl = widget.swmhostbaseurl + "/swm";

        //TODO
        /* Hold the value of currentSpaceId, when user selects "Create Space" and cancel, we want to update the space-select drop down back to the previous value.
         * Since widget.currentSpaceId() is bound to the input, the previous value is lost.
         * KO should have a way to preserve the value before update, for now preserve the value in local scope. This needs to be researched, remove todo when this is done.*/
        widget.spaceIdValueBeforeUpdate = "";

        // Login successful via registration
        $.Topic(PubSub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(
          function(){
            notifier.clearSuccess(widget.WIDGET_ID);
            notifier.clearError(widget.WIDGET_ID);

            // refresh the content only if we're on /spaces page AND not currently processing an invitation
            if (!storageApi.getInstance().getItem("social.invite")) {
              widget.getSpaces(function() {
                if ( widget.space().contextId() ) {
                  widget.getSpace(widget.space().contextId(), function(){
                    if (widget.space().showSpace()){
                      widget.setSpace(true);
                    }
                  });
                }
                else {
                  widget.space().contextId('');
                  widget.defaultGetSpacesCallback(widget.getDefaultSpaceId());
                  widget.space().showSpace(true);
                }
                widget.showWidget(true);
              });
            }
          }
        );

        // Login successful (not via registration)
        $.Topic(PubSub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(
          function(){
            // refresh the content only if we're on /spaces page AND not currently processing an invitation
            if (!storageApi.getInstance().getItem("social.invite")){
              widget.getSpaces(function() {
                if ( widget.space().contextId() ) {
                  widget.getSpace(widget.space().contextId(), function(){
                    if (widget.space().showSpace()){
                      widget.setSpace(true);
                    }
                  });
                }
                else {
                  widget.space().contextId('');
                  widget.defaultGetSpacesCallback(widget.getDefaultSpaceId());
                  widget.space().showSpace(true);
                }
                widget.showWidget(true);
              });
            }
          }
        );

        // handle user logout, clear widget state.
        $.Topic(PubSub.topicNames.USER_LOGOUT_SUBMIT).subscribe(
          function(obj) {
            if(!widget.space().contextId()){
              widget.resetWidget();
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_UNAVAILABLE).publish({});
            }
            else {
              widget.resetUserContext();
              //first check global scope, if private just reset, if shared then make space call
              if(widget.space().isPrivateOrGroup()){
                //logging out from a private or group space url
                widget.resetWidget();
                widget.space().contextId('');
                $.Topic(PubSub.topicNames.SOCIAL_SPACE_UNAVAILABLE).publish({});
              }
            }
            widget.userIsSpaceOwner(false);
            widget.currentUserIsMember(false);
            widget.showWidget(true);
          }
        );

        // A space has been created (such as creating a new space from PDP),
        // refresh the space select drop down from server
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).subscribe(function(obj){
          widget.getSpaces(function() {
            widget.defaultGetSpacesCallback(storageApi.getInstance().getItem('social.currentSpaceId'));
          });
        });

        // User has left a joined space, which should be removed from the spaces dropdown
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBER_LEFT).subscribe(function(obj){
          widget.getSpaces(function() {
            widget.firstOwnedSpaceGetSpacesCallback();
          });
        });

        // handle Space is unavailable, whether through REST error or logged out, clear widget state.
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_UNAVAILABLE).subscribe(function(obj){
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          widget.resetWidget();
          widget.showWidget(true);
        });

        // SWM-Rest-Client has detected a change in userContext
        // something has occurred that requires the page to be refreshed,
        // such as a new space added, or the logged in user has changed
        $.Topic(PubSub.topicNames.SOCIAL_REFRESH_SPACES).subscribe(function(refreshPage){
          // refresh the user data in case a different user has logged in
          widget.user().handlePageChanged.bind(widget);
          
          if (refreshPage) {
            widget.resetUserContext();
          }
          
          // close any open modals
          $('#SWM-modalContainer').modal('hide'); // space-header widget, create new space
          $('#SWM-editSpaceModalPane').modal('hide'); // space-header widget, edit space details
          $('#SWM-inviteToSpaceModalContainer').modal('hide'); // space-members widget, invite user
          $('#CC-loginUserPane').modal('hide'); // header widget, login
          $('#CC-registerUserPane').modal('hide'); // header widget, create user
          // MS Edge fix : clean up any remaining modal elements in DOM.
          $('body').removeClass('modal-open');
          $('.modal-backdrop').remove();

          if (widget.user().loggedIn()){
            if (refreshPage) {
              widget.getSpaces(function(){
                if ( widget.space().contextId() ) {
                  widget.defaultGetSpacesCallback(widget.space().contextId());
                }
                else {
                  widget.defaultGetSpacesCallback(widget.getDefaultSpaceId());
                  widget.space().showSpace(true);
                }
                widget.showWidget(true);
              });
            }
            else {
              widget.getSpaces(function() {
                widget.userIsSpaceOwner(widget.space().isSpaceOwner(swmRestClient.apiuserid));
              });
            }
          }
        });

        // A space had been joined by a member.
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBER_JOIN).subscribe(function(obj){
          storageApi.getInstance().setItem('social.currentSpaceId', obj.spaceid);
          widget.getSpaces(function() {
            widget.currentSpaceId(obj.spaceid);
            widget.setSpace(true);
            widget.currentSpaceId.valueHasMutated();
            widget.showWidget(true);
          });
        });


        // SpaceViewModel has changed, need to re-evaluate whether or not show the space
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_MODEL_MEMBERS_CHANGED).subscribe( function(){
          
          if (!widget.space().isPrivate() || widget.space().isMember(swmRestClient.apiuserid) || widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.space().showSpace(true);
          }
          else {
            widget.space().showSpace(false);
          }
        });

        // The Spaces, "Wish List", link in header or footer has been clicked, url will become /spaces/.
        $.Topic(PubSub.topicNames.UPDATE_FOCUS).subscribe( function(){
          // First make sure user is logged in, then if currentSpaceId has been populated, otherwise do nothing and display space login page.
          if(widget.user().loggedIn() && widget.currentSpaceId()){
            // Only load the default space id of the loggedIn user if it is different than what the user is currently viewing. From a direct spaceId link.
            if( widget.getDefaultSpaceId() != widget.currentSpaceId() ){
              widget.defaultGetSpacesCallback(widget.getDefaultSpaceId());
            }
          }
        });

        $.Topic(PubSub.topicNames.SOCIAL_CURRENT_USER).subscribe(function(obj){
          widget.currentUserFullName(obj.currentUserFullName);

          if (widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.currentUserMediaUrl(widget.space().ownerMediaUrl());
          }
          else {
            widget.currentUserMediaUrl(obj.currentUserMediaUrl);
          }

          widget.showWidget(true);
        });
        
        // Debug event handler for space successfully deleted
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_DELETED).subscribe(function(deletedSpaceEventData){
          // alert("SOCIAL_SPACE_DELETED: SpaceName="+deletedSpaceEventData.spaceName+" SpaceId="+deletedSpaceEventData.spaceId);
          var test = deletedSpaceEventData;
        });
        
        // Handles if user profile update is saved.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).subscribe(function() {
          if (widget.space().isSpaceOwner(swmRestClient.apiuserid)) {
            widget.space().ownerFirstName(widget.user().firstName());
            widget.space().ownerLastName(widget.user().lastName());
          }
        });
        
        $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBERS_INFO_CHANGED).subscribe(function() {
            widget.getMembers();
        });

        // add validation rules on load.
        widget.addValidation();
        widget.addSpaceTitleValidation();
      },
      
      getMembers : function(){
        var widget = this;

        widget.getMembersForSpace(widget.space().id(), widget.space().ownerId(), function(){

          if(widget.space().isSpaceOwner(swmRestClient.apiuserid)){
            widget.userIsSpaceOwner(true);
          }
          else {
            widget.userIsSpaceOwner(false);
          }
          
          if(widget.space().isMember(swmRestClient.apiuserid)){
            widget.currentUserIsMember(true);
          }
          else {
            widget.currentUserIsMember(false);
          }

          $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).publish();

          $.Topic(PubSub.topicNames.SOCIAL_CURRENT_USER).publish({
            "currentUserFullName" : widget.currentUserFullName(),
            "currentUserMediaUrl" : widget.currentUserMediaUrl()
          });
          widget.showWidget(true);

        });
      },
      getMembersForSpace : function (spaceId, spaceOwnerId, callback) {

        var widget = this;

        // REST API callback - success
        var errorCB = function(result) {};

        // REST API callback - success
        var successCB = function(result) {
          if (result.response.code.indexOf("200") === 0) {
            var spaceMembers = [];

            result.items.forEach(function(member){
              // first, if the current loggedin user is a member/owner, extract the profileImage and name, otherwise, we don't need to populate the currentLoggedInUser's Name and Image, because it will not be in the UI.
              if(member.userId == swmRestClient.apiuserid) {
                var currentLoggedInUserMediaUrl = member.mediaUrl ? member.mediaUrl : NO_IMAGE_IMG ;
                widget.currentUserMediaUrl(widget.swmhostimagesbaseurl + currentLoggedInUserMediaUrl);
                widget.currentUserFullName(member.firstName + " " + member.lastName);
              }

              //then, differentiate betwwen space owner vs space member
              if (member.userId == spaceOwnerId){
                var profileMediaUrl = member.mediaUrl ? member.mediaUrl : NO_IMAGE_IMG ;

                // initialize space owner's media ID
                // TODO owner's mediaid should be included with a rest endpoint; until then, parsing mediaurl instead (not ideal)
                var memberMediaID = member.mediaUrl ? member.mediaUrl.substr(member.mediaUrl.lastIndexOf("/")+1,24) : "stockuserprofileimage000";
                //widget.spaceOwnerMediaID(memberMediaID);

                var ownerObj = {
                    ownerFirstName : member.firstName,
                    ownerLastName : member.lastName,
                    ownerMediaId : memberMediaID,
                    ownerMediaUrl : widget.swmhostimagesbaseurl + profileMediaUrl
                };
                widget.space().updateSpace(ownerObj);
              }
              else {
                var memberMediaUrl = member.mediaUrl ? member.mediaUrl : NO_IMAGE_IMG ;
                member.mediaUrl = widget.swmhostimagesbaseurl + memberMediaUrl;
                member.fullName = member.firstName + " " + member.lastName;
                spaceMembers.push(member);
              }
            });

            //update widget.space().members() in SpaceViewModel with with all members (excludes owner),
            widget.space().updateMembers(spaceMembers);

            //if a callback is supplied, do it at the end
            if (callback){
              callback();
            }
          }
        };

        swmRestClient.request('GET', '/swm/rs/v1/spaces/{spaceid}/members', null, successCB, errorCB, {
          "spaceid" : spaceId
        });
      },

      /**
       * Button Handler: Display Invite to Space modal
       */
      inviteToSpaceClick: function() {
        var widget = this;

        // if user is logged in, display modal to invite new user to space
        if (widget.user().loggedIn()) {

          if (widget.space().id() === "") {
            //TODO: Need to revisit error handling
            // Error: No space selected. Out of sync with CC? Reload?
            return;
          }

          // clear any notifications
          widget.messageBox.removeAllMessages();

          // open modal
          widget.openInviteToSpaceModal();

        } //loggedIn
      },

      /**
       * Shows the invite to Space modal, includes reseting the invite to space modal form back to its original state
       */
      openInviteToSpaceModal: function() {
        var widget = this;

        // show modal content right away
        $('#SWM-inviteToSpaceModalContainer').one('show.bs.modal', function() {
          $('#SWM-inviteToSpaceModalPane').show();
        });

        // show modal content right away
        $('#SWM-inviteToSpaceModalContainer').one('hide.bs.modal', function() {
          $('#SWM-inviteToSpaceModalPane').hide();
        });

        // Open a modal
        $('#SWM-inviteToSpaceModalContainer').modal('show');
      },

      /**
       * construct the well-formed base wishlist url that can be passed to Social services.  
       */
      constructWishlistRoute: function() {
        var widget = this;
        var result;
        var protocol = window.location.protocol;
        var host = window.location.host;
        var siteBaseUrl = "";
        if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
          siteBaseUrl = window.siteBaseURLPath; 
        }
        result = protocol + "//" + host + siteBaseUrl + widget.links().wishlist.route;
        return result;
      },
      
      /**
       * Button Handler for Send Invite to Space
       */
      inviteToSpaceSend: function() {

        var widget = this;
        
        var successCB = function(result) {
          
          // Update SpaceViewModel with new accessLevel
          widget.updateSpaceInGlobalScope({
            accessLevel : result.accessLevel
          });
          
          var mailto = [];
          mailto.push("mailto:?");
          
          mailto.push("subject=");
          mailto.push(encodeURIComponent(widget.translate('inviteClientEmailSubject', {'wishlistName': widget.space().name()})));
          
          //Begin mail body
          mailto.push("&body=");
          var body = [];
          body.push(widget.translate('inviteClientEmailBodyIntro', {'wishlistName': widget.space().name()}));
          body.push("\n\n");
          
          var inviteUrl = widget.constructWishlistRoute() + '?invite=' + result.invitationToken;
          body.push(inviteUrl);
          body.push("\n\n");
          body.push("\u2022 " + widget.translate('inviteClientEmailBodyIntroItem1'));
          body.push("\n");
          body.push("\u2022 " + widget.translate('inviteClientEmailBodyIntroItem2'));
          body.push("\n");
          body.push("\u2022 " + widget.translate('inviteClientEmailBodyIntroItem3'));
          mailto.push(encodeURIComponent(body.join("")));
          //End mail body

          // SC-4113: IE9 bug : mailto will not open, and will replace current page. This is due the unicode charactors, \u2022, in the body and IE will not handle that gracefully
          if (document.all && !window.atob) {
            window.open(mailto.join(""), "_blank");
          } 
          else {
            //trigger default email client
            window.location.href = mailto.join("");
          }
        };
        var errorCB = function(err) {
          notifier.sendError(widget.WIDGET_ID, widget.translate('generalUnrecoverableErrorMsg'), true);
        };

        swmRestClient.request('POST',
            '/swm/rs/v1/spaces/{spaceid}/invitations', {},
            successCB, errorCB, {
              "spaceid" : widget.space().id()
            });
        
        widget.closeModalById('#SWM-inviteToSpaceModalContainer');
      },

      /**
       * Button Handler: Display View Members (Mobile) modal
       */
      viewMembersClick: function() {
        var widget = this;

        // if it's a shared space, members should be visible
        if (widget.user().loggedIn() || widget.space().isShared()) {

          if (widget.space().id() === "") {
            //TODO: Need to revisit error handling
            // Error: No space selected. Out of sync with CC? Reload?
            return;
          }

          // clear any notifications
          widget.messageBox.removeAllMessages();

          // open modal
          widget.openViewMembersModal();

        } //loggedIn
      },

      /**
       * Shows the View Members (Mobile) modal
       */
      openViewMembersModal: function() {
        var widget = this;

        // show modal content right away
        $('#SWM-viewMembersModalContainer').one('show.bs.modal', function() {
          $('#SWM-viewMembersModalPane').show();
        });

        // show modal content right away
        $('#SWM-viewMembersModalContainer').one('hide.bs.modal', function() {
          $('#SWM-viewMembersModalPane').hide();
        });

        // reset modal form observables after modal css transitions
        $('#SWM-viewMembersModalContainer').one('hidden.bs.modal', function() {
        });

        // Open a modal
        $('#SWM-viewMembersModalContainer').modal('show');
      },

      /**
       * Button Handler: Display Edit Members modal
       */
      onClickEditMembers: function() {
        var widget = this;

        // if user is logged in, display modal
        if (widget.user().loggedIn()) {

          // clear any notifications
          widget.messageBox.removeAllMessages();

          // open modal
          widget.openSelectMembersModal();
        }
      },

      /**
       * Shows the select members modal
       */
      openSelectMembersModal: function() {
        var widget = this;

        // show modal content right away
        $('#SWM-selectMembersModalContainer').one('show.bs.modal', function() {
          widget.removalMembersList.removeAll();
          $('#SWM-selectMembersModalPane').show();
        });

        // hide modal content right away
        $('#SWM-selectMembersModalContainer').one('hide.bs.modal', function() {
          $('#SWM-selectMembersModalPane').hide();
        });

        // Open a modal
        $('#SWM-selectMembersModalContainer').modal('show');
      },

      /**
       * Handler: Member selected (or deselected) for removal members list
       */
      onClickMemberSelectedToggle: function(userID) {
        var widget = this;

        if (widget.removalMembersList.indexOf(userID) == -1) {
          widget.removalMembersList.push(userID)
        }
        else {
          widget.removalMembersList.remove(userID);
        }
      },

      /**
       * Determins if member has been selected for removal from space
       */
      isMemberSelectedForRemoval: function(userID) {
        var widget = this;

        if (widget.removalMembersList.indexOf(userID) == -1)
          return false;
        else
          return true;
      },

      /**
       * Handler: Cancel members selection
       */
      onClickSelectedMembersCancel: function() {
        var widget = this;

        widget.removalMembersList.removeAll();
      },

      /**
       * Handler: Remove selected members from Space
       */
      onClickSelectedMembersRemove: function() {
        var widget = this;

        if (widget.removalMembersList().length > 0)
          widget.showRemoveMembersConfirmationModal();
      },

      /**
       * Displays Remove Members confirmation modal
       */
      showRemoveMembersConfirmationModal: function() {
        var widget = this;

        // create new 'shown' event handler
        $('#SWM-removeMembersConfirm-ModalContainer').one('show.bs.modal', function() {
          $('#SWM-removeMembersConfirm-ModalPane').show();
        });

        // create new 'hidden' event handler
        $('#SWM-removeMembersConfirm-ModalContainer').one('hide.bs.modal', function() {
          $('#SWM-removeMembersConfirm-ModalPane').hide();
        });

        // open modal
        $('#SWM-removeMembersConfirm-ModalContainer').modal('show');
      },

      /**
       * Performs the member removal by iterating through removalMembersList
       */
      performMembersRemoval: function() {
        var widget = this;

        // hide confirmation modal
        $('#SWM-removeMembersConfirm-ModalPane').hide();
        widget.closeModalById('#SWM-removeMembersConfirm-ModalContainer');

        // hide remove members modal
        $('#SWM-selectMembersModalPane').hide();
        widget.closeModalById('#SWM-selectMembersModalContainer');

        // since we are calling the endpoint once for each member to remove, the space members
        // model will be refreshed as each member is removed--done in the success callback
        ko.utils.arrayForEach(widget.removalMembersList(), function(removeMemberUserID) {
          widget.removeMemberFromSpace(removeMemberUserID);
        });

      },

      /**
       * Remove a member from SpaceViewModel by userId
       */
      removeMemberFromSpaceViewModel : function(memberId){
        var widget = this;
        if (memberId){
          var membersArrayClone = ko.observableArray(widget.space().members().slice(0));
          membersArrayClone.remove( function(item) {
            return item.userId == memberId;
          });
        }
        widget.space().updateMembers(membersArrayClone());
      },

      /**
       * Calls SWM server to remove a member from space
       */
      removeMemberFromSpace : function(removeMemberUserID) {
        var widget = this;
        var atLeastOneSuccess = false;

        var successCB = function(result) {

          // update removal list
          widget.removalMembersList.remove(removeMemberUserID);

          // update space members model
          widget.removeMemberFromSpaceViewModel(removeMemberUserID);

          // refresh space
          $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).publish();
          $.Topic(PubSub.topicNames.SOCIAL_CURRENT_USER).publish({
            "currentUserFullName" : widget.space().ownerFirstName + " " + widget.space().ownerLastName,
            "currentUserMediaUrl" : widget.space().ownerMediaUrl()
          });

          // Show notification
          notifier.sendSuccess(widget.WIDGET_ID, (widget.translate('removeMembersSuccessText')), true);
        };

        var errorCB = function(err) {

          // display an error message
          var errMsg = widget.translate('removeMembersFailureText');

          notifier.sendError(widget.WIDGET_ID, errMsg, true);
        };

        swmRestClient.request('DELETE', '/swm/rs/v1/spaces/{spaceid}/members/{userid}', '', successCB, errorCB, {
          "userid" : removeMemberUserID,
          "spaceid" : widget.space().id()
        });
      },

      /**
       * Button Handler: Display Leave space modal
       */
      onClickLeaveSpace: function() {
        var widget = this;

        // if user is logged in, display modal
        if (widget.user().loggedIn()) {

          // clear any notifications
          widget.messageBox.removeAllMessages();

          // open modal
          widget.showLeaveConfirmationModal();
        }
      },

      /**
       * Displays Delete Confirmation modal
       */
      showLeaveConfirmationModal: function() {
        var widget = this;

        // create new 'shown' event handler
        $('#SWM-leaveConfirm-ModalContainer').one('show.bs.modal', function() {
          $('#SWM-leaveConfirm-ModalPane').show();
        });

        // create new 'hidden' event handler
        $('#SWM-leaveConfirm-ModalContainer').one('hide.bs.modal', function() {
          $('#SWM-leaveConfirm-ModalPane').hide();
        });

        // open modal
        $('#SWM-leaveConfirm-ModalContainer').modal('show');
      },

      /**
       * Performs leave space action and refreshes widget
       */
      performLeaveSpace : function() {
        var widget = this;
        var refreshSpaceId = widget.space().id();

        var successCB = function(result) {
          widget.closeModalById('#SWM-leaveConfirm-ModalContainer');

          if (result.response.code.indexOf("200") === 0) {
            if (widget.space().isPrivateOrGroup()) { // if private or group, display first owned spaced in list
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBER_LEFT).publish();
            }
            else {
              widget.getSpaces(function() {
                widget.defaultGetSpacesCallback(storageApi.getInstance().getItem('social.currentSpaceId'));
              });
              
            }

            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('leaveSpaceSuccessMessage'), true);
          }
        };

        var errorCB = function(err) {
          var errResponse = JSON.parse(err);
          widget.closeModalById('#SWM-leaveConfirm-ModalContainer');

          if (errResponse['o:errorCode'] === "403.1")
            notifier.sendError(widget.WIDGET_ID, widget.translate('leaveSpaceAlreadyRemovedMessage'), true);
          else if (errResponse['o:errorCode'] === "404.0")
            notifier.sendError(widget.WIDGET_ID, widget.translate('leaveSpaceNotExistMessage'), true);
          else
            notifier.sendError(widget.WIDGET_ID, widget.translate('leaveSpaceFailureMessage'), true);
        };

        swmRestClient.request('DELETE', '/swm/rs/v1/spaces/{spaceid}/members/{userid}', '', successCB, errorCB, {
          "userid" : swmRestClient.apiuserid,
          "spaceid" : widget.space().id()
        });
      },

      /**
       * Button Handler: Display Share Space modal
       */
      shareSpaceClick: function() {
        var widget = this;

        if (widget.space().id() === "") {
          //TODO: Need to revisit error handling
          // Error: No space selected. Out of sync with CC? Reload?
          return;
        }

        // clear any notifications
        widget.messageBox.removeAllMessages();

        if (widget.space().isShared()) {
          widget.shareSpaceSend();
        }
        else {
          // open modal
          widget.openShareSpaceModal();
        }
      },

      shareSpaceUpdateShared: function() {
        var widget = this;

        var successCB = function(result) {
         // update global scope SpaceViewModel
          widget.updateSpaceInGlobalScope({
            accessLevel : "1"
          });
          
          widget.shareSpaceSend();
        };
        var errorCB = function(resultStr, status, errorThrown) {
          notifier.sendError(widget.WIDGET_ID, errorThrown, true);
        };
        
        if (widget.userIsSpaceOwner())
        {
          //TODO: remove after swm invite endpoint has been updated
          var requestJson = {
              spaceName: widget.spaceTitle().trim(),
              spaceDescription: 'edit sample description from storefront',
              accessLevel: "1"
            };
          swmRestClient.request('PUT',
              '/swm/rs/v1/spaces/{spaceid}', requestJson,
              successCB, errorCB, {
                "spaceid" : widget.space().id()
              });
        }
      },

      shareSpaceSend: function() {
        var widget = this;

        var mailto = [];
        mailto.push("mailto:?");
        
        mailto.push("subject=");
        mailto.push(encodeURIComponent(widget.translate('shareWishlistEmailSubject', {'wishlistName': widget.space().name()})));
        
        //Begin mail body
        mailto.push("&body=");
        var body = [];
        body.push(widget.translate('shareWishlistEmailBodyIntro', {'wishlistName': widget.space().name()}));
        body.push("\n\n");
        var shareUrl = widget.constructWishlistRoute() + "/" + widget.space().id();
        body.push(shareUrl);
        mailto.push(encodeURIComponent(body.join("")));
        //End mail body
        
        //trigger default email client
        window.location.href = mailto.join("");
        
        widget.closeModalById('#SWM-shareSpaceModalContainer');
      },
      
      /**
       * Share space link on facebook
       */
      shareSpaceFbClick: function (widget) {
        // clear any notifications
        widget.messageBox.removeAllMessages();

        var successCB = function(result) {};
        
        var errorCB = function(err) {
          logger.error("generateStaticWishlistPage : Static page generation request failed.");          
        };
        
        // generate the static wishlist page
        ccRestClient.request(CCConstants.GENERATE_STATIC_WISHLIST_PAGE,
            null, successCB, errorCB, widget.space().id());
        
        // open fb share dialog
        var spaceName = widget.space().name();
        var spaceUrl = widget.constructWishlistRoute() + '/' + widget.space().id(); 
        var spaceUrlEncoded = encodeURIComponent(spaceUrl);
        var appID = widget.space().fbAppId();
        // NOTE: Once we can support the Facebook Crawler OG meta-tags, then we should try and use the newer Facebook Share Dialog URL
        //       (per https://developers.facebook.com/docs/sharing/reference/share-dialog).  Until then, we will use a legacy
        //       share URL.  Facebook may eventually not support this older URL, so would be good to replace it as soon as possible.
        //var fbShareUrl = "https://www.facebook.com/dialog/share?app_id=" + appID + "&display=popup&href=" + spaceUrlEncoded + "&redirect_uri=https://www.facebook.com";
        var fbShareUrl = "https://www.facebook.com/sharer/sharer.php?app_id=" + appID + "&u=" + spaceUrlEncoded;
        var facebookWin = window.open(fbShareUrl, 'facebookWin', 'width=720, height=500');
        if(facebookWin){
          facebookWin.focus();
        }
       
      },

      /**
       * Share space link on twitter
       */
      shareSpaceTwitterClick : function (widget) {
        var spaceName = widget.space().name();
        var spaceUrl = widget.constructWishlistRoute() + '/' + widget.space().id();
        var spaceNameEncoded = encodeURIComponent(spaceName);
        var spaceUrlEncoded = encodeURIComponent(spaceUrl);
        var twitterWin = window.open('https://twitter.com/share?url=' + spaceUrlEncoded + '&text=' + spaceNameEncoded, 'twitterWindow', 'width=720, height=500');
        if(twitterWin){
          twitterWin.focus();
        }
      },
      
      // Share space to Pinterest
      shareSpacePinterestClick: function() {
        var widget = this;
        var spaceUrl = widget.constructWishlistRoute() + '/' + widget.space().id();
        var spaceNameEncoded = encodeURIComponent(widget.space().name());
        var spaceUrlEncoded = encodeURIComponent(spaceUrl);
        var productMediaEncoded = encodeURIComponent(widget.space().spaceProductMediaUrl());
        
        var pinterestWin = window.open('https://pinterest.com/pin/create/button/?url=' + spaceUrlEncoded + '&description=' + spaceNameEncoded + '&media=' + productMediaEncoded, 'pinterestWindow', 'width=720, height=500');
        if(pinterestWin){
          pinterestWin.focus();
        }
      },
      
      /**
       * Shows the share space message indicating that space will be changed to shared from private or group
       */
      openShareSpaceModal: function() {
        var widget = this;

        // show modal content right away
        $('#SWM-shareSpaceModalContainer').one('show.bs.modal', function() {
          $('#SWM-shareSpaceModalPane').show();
        });

        // focus on textarea after modal css transitions
        $('#SWM-shareSpaceModalContainer').one('shown.bs.modal', function() {
        });

        // show modal content right away
        $('#SWM-shareSpaceModalContainer').one('hide.bs.modal', function() {
          $('#SWM-shareSpaceModalPane').hide();
        });

        // reset modal form observables after modal css transitions
        $('#SWM-shareSpaceModalContainer').one('hidden.bs.modal', function() {
        });

        // Open a modal
        $('#SWM-shareSpaceModalContainer').modal('show');
      },      
      
      /**
       * Invite friends via Facebook
       */
      showFbRequestDialog : function() {
        var widget = this;
        
        var inviteMsg = widget.translate('socialFacebookInviteMessageText', {
          ownername : widget.space().ownerFirstName()
        });
        
        // Get invitation token from SWM server
        // REST API callback - error
        var errorCB = function(resultStr, status, errorThrown) {
          // send error curtain
          notifier.sendError(widget.WIDGET_ID, widget.translate('generalUnrecoverableErrorMsg'), true);
          // hide pane
          $('#SWM-inviteToSpaceModalPane').hide();
          widget.closeModalById('#SWM-inviteToSpaceModalContainer');
        };

        // REST API callback - success
        var successCB = function(result) {
          // hide pane
          $('#SWM-inviteToSpaceModalPane').hide();
          widget.closeModalById('#SWM-inviteToSpaceModalContainer');

          // Update SpaceViewModel with new accessLevel
          widget.updateSpaceInGlobalScope({
            accessLevel : result.accessLevel
          });
          
          // FB Requests Dialog (already includes login check)
          // Pass additional data in the future, use the 'data' property in the JSON:
          //  example: FB.ui ({ data: "invite=abc123token&example=example@example.com" }, callback);
          var fbData = "invite=" + result.invitationToken;
          FB.ui(
            {
              method: 'apprequests',
              message: inviteMsg,
              data: fbData
            }, 
            function(response){
              // console.log('FB Request Dialog Response', response);
            }
          );
        };

        swmRestClient.request('POST', '/swm/rs/v1/spaces/{spaceid}/invitations', {}, successCB, errorCB, {"spaceid":widget.space().id()});

      },
      
      /**
       * Handle selecting a different profile image 
       */
      handleChangeSelect : function(widget, pEvent){
        var target = pEvent.target ? pEvent.target : pEvent.srcElement;
        var file, fileName;
        if(target.files) {
          file = target.files[0];
        } else {
          file = target.value;
        }

        if (!file){
          //user canceled from browse dialog
          return;
        }

        fileName = file.name || file;
        if(file && fileName) {
          // fileName should be the name without the path.
          fileName = fileName.match(/[^\/\\]+\..*/)[0];

          var canDoHtml5 = false;
          try {
            if(FileReader && File) {
              canDoHtml5 = true;
            }
          } catch(error) {
          }

          //Validation
          var hasError = '';
          if (file.size > MAX_FILE_SIZE){
            hasError = widget.translate('uploadProfileImgMaxSizeError');
          }
          if (file.type != 'image/jpeg' && file.type != 'image/gif' && file.type != 'image/png') {
            hasError = widget.translate('uploadProfileImgFileTypeError');
          }

          if (hasError){
            widget.resetUploadImage();
            widget.showErrorCurtainForLocalizedMsg(hasError);
            return;
          }

          // Process the file
          if (canDoHtml5) {
            var oFReader = new FileReader();
            oFReader.readAsDataURL(file);
            oFReader.onload = function (oFREvent) {
              widget.uploadProfileImgFileName(fileName);
              widget.uploadFile(fileName, pEvent);
            };
          } else {
        	//TODO: Need to support Iframe upload for NOHTML5 case
          }
        }
      },
      triggerChangeSelect : function() {
        $("#SWM-profile-img-browse-file").click();
      },
      resetUploadImage : function () {
        var widget = this;
        $("#SWM-profile-img-upload")[0].reset();
        //clear the fileName observable
        widget.uploadProfileImgFileName('');
      },
      uploadFile : function (fileName, pEvent) {
        var widget = this;
        var form = document.getElementById("SWM-profile-img-upload");
        if(FileReader && File) {
          // set up the reader
          var reader = new FileReader();
          reader.onloadend = function(e) {
            // make sure we're done
            if(e.target.readyState == FileReader.DONE) {
              var contents = e.target.result;

              var contentsArray = contents.split(",");
              var encodedData = contentsArray[contentsArray.length - 1];

              var mediaJson = {};
              mediaJson.file = encodedData;
              mediaJson.fileName = fileName;

              var successCB = function(result) {
                if (result.response.code.indexOf("201.0") === 0) {
                  widget.updateSpaceInGlobalScope({
                    ownerMediaId : result.mediaId,
                    ownerMediaUrl : widget.swmhostimagesbaseurl + result.mediaUrl
                  });
                  $.Topic(PubSub.topicNames.SOCIAL_CURRENT_USER).publish({
                    "currentUserFullName" : widget.space().ownerFirstName + " " + widget.space().ownerLastName,
                    "currentUserMediaUrl" : widget.space().ownerMediaUrl()
                  });
                  notifier.sendSuccess(widget.WIDGET_ID, widget.translate('uploadProfileImgSuccess'), true);
                }
              };

              // failure
              var errorCB = function(pResult) {
                widget.resetUploadImage();
                widget.showErrorCurtainForLocalizedMsg(widget.translate('uploadProfileImgError'));
              };

              swmRestClient.request("POST", '/swm/rs/v1/users/{userid}/media',
                  mediaJson, successCB, errorCB, {"userid": swmRestClient.apiuserid});
            }
          };

          if (document.getElementById("SWM-profile-img-browse-file").files[0]){
            reader.readAsDataURL(document.getElementById("SWM-profile-img-browse-file").files[0]);
          }
        }
        else {
          // TODO: Need to support Iframe upload for NOHTML5 case
        }

      },
      showErrorCurtainForLocalizedMsg : function(localizedString) {
        var widget = this;
        notifier.sendError(widget.WIDGET_ID, localizedString, true);
      },
      /**
     * Retrieve list of spaces for a user
     */
      getSpaces : function(callback) {
        var widget = this;
        var successCB = function(result) {
          var mySpaceOptions = [];
          var joinedSpaceOptions = [];
          if (result.response.code.indexOf("200") === 0) {
            //site info
            widget.siteName(result.siteName);
            
            //spaces
            var spaces = result.items;
            spaces.forEach( function (space, index) {
              var spaceOption = {spaceid: space.spaceId,
                                 spaceNameFull: ko.observable(space.spaceName),
                                 spaceNameAbbr: space.spaceName.substr(0,41),
                                 spaceNameFormatted : ko.computed(function(){
                                   if (space.creatorId == swmRestClient.apiuserid) {
                                     return space.spaceName;
                                   }
                                   return space.spaceName + " (" + space.creatorFirstName + " " + space.creatorLastName + ")";
                                 }, widget),
                                 creatorid: space.creatorId,
                                 accessLevel: space.accessLevel,
                                 spaceOwnerFirstName: space.creatorFirstName,
                                 spaceOwnerLastName: space.creatorLastName};

              // if user created the space, add it to My Spaces, otherwise add it to Joined Spaces
              if (space.creatorId == swmRestClient.apiuserid) {
                if (spaceOption.spaceNameFull.length > 42) {
                  spaceOption.spaceNameAbbr += "...";
                }
                mySpaceOptions.push(spaceOption);
              }
              else {
                if (spaceOption.spaceNameFormatted().length > 42) {
                  spaceOption.spaceNameAbbr += "...";
                }
                else {
                  spaceOption.spaceNameAbbr = spaceOption.spaceNameFormatted;
                }
                joinedSpaceOptions.push(spaceOption);
              }
            });

            // sort each group alphabetically
            mySpaceOptions.sort(mySpacesComparator);
            joinedSpaceOptions.sort(joinedSpacesComparator);

            // update myWishLists and joinedWishLists in UserViewModel.
            widget.user().myWishLists(mySpaceOptions);
            widget.user().joinedWishLists(joinedSpaceOptions);

            var groups = [];
            var mySpacesGroup = {label: widget.translate('mySpacesGroupText'), children: widget.user().myWishLists};
            var joinedSpacesGroup = {label: widget.translate('joinedSpacesGroupText'), children: widget.user().joinedWishLists};

            var createOptions = [];
            var createNewOption = {spaceid: "createnewspace", spaceNameFull: ko.observable(widget.translate('createNewSpaceOptText'))};
            createOptions.push(createNewOption);
            var createNewSpaceGroup = {label: "", children: ko.observableArray(createOptions)};

            groups.push(mySpacesGroup);
            groups.push(joinedSpacesGroup);
            groups.push(createNewSpaceGroup);
            widget.spaceOptionsArray(groups);
            
            if(callback){
              callback();
            }
          }
        };
        var errorCB = function(resultStr, status, errorThrown) {
        };

        swmRestClient.request('GET', '/swm/rs/v1/sites/{siteid}/spaces', '', successCB, errorCB, {"siteId": swmRestClient.siteid});
      },

      /**
       * Callback handles setting the proper space in the list dropdown when a getSpaces call occurs
       */
      defaultGetSpacesCallback: function(spaceid) {
        var widget = this;
        if (spaceid) {
          widget.currentSpaceId(spaceid);
          widget.setSpace(true);
        }
        else {
          widget.currentSpaceId('');
          widget.setSpace();
        }
        widget.userIsSpaceOwner(widget.space().isSpaceOwner(swmRestClient.apiuserid));
      },

      /**
       * Callback handles setting the proper space in the list dropdown when a getSpaces call occurs
       */
      firstOwnedSpaceGetSpacesCallback: function() {
        var widget = this;

        storageApi.getInstance().setItem('social.currentSpaceId', widget.user().myWishLists()[0].spaceid);
        widget.currentSpaceId(widget.user().myWishLists()[0].spaceid);
        widget.setSpace(true);

        widget.userIsSpaceOwner(widget.space().isSpaceOwner(swmRestClient.apiuserid));
      },

      /**
       * Add any necessary validation
       */
      addValidation : function() {
        var widget = this;
        widget.createSpaceName.extend({
          required: {
            message: widget.translate('emptyNameMsg')
          }
        }).extend({
          uniquespacename: {
            params: widget.user().myWishLists,
            message: widget.translate('uniqueNameMsg')
          }
        }).extend({
          badrequestspacename: {
            message: widget.translate('uniqueNameMsg'),
            onlyIf: widget.errBadRequestSpaceName
          }
        });
        
        // members bar
      },

      setSpace : function(publish){
        var widget = this;
        var spaceNameToPublish = widget.space().name();
        var spaceOwnerFirstName = "";
        var spaceOwnerLastName = "";
        ko.utils.arrayFirst(widget.spaceOptionsArray(), function(optionsGroup) {
          ko.utils.arrayFirst(optionsGroup.children(), function(optionsItem) {
            if (widget.currentSpaceId() == optionsItem.spaceid) {
              widget.currentSpaceOwnerId(optionsItem.creatorid);
              widget.spaceAccessLevel(optionsItem.accessLevel);
              spaceNameToPublish = optionsItem.spaceNameFull();
              spaceOwnerFirstName = optionsItem.spaceOwnerFirstName;
              spaceOwnerLastName = optionsItem.spaceOwnerLastName;
            }
          });
        });

        // set the spaceTitle and update previous value for "create new space" cancel
        widget.spaceTitle(spaceNameToPublish);
        widget.spaceIdValueBeforeUpdate = widget.currentSpaceId();
        if (publish){
          var locallyStoredSpaceId = storageApi.getInstance().getItem('social.currentSpaceId');
          if(widget.currentSpaceId() === '' && locallyStoredSpaceId){
            widget.currentSpaceId(locallyStoredSpaceId);
          }

          // Update space information in global scope, instead of publishing with $Topic
          widget.updateSpaceInGlobalScope({
            id : widget.currentSpaceId(),
            name : spaceNameToPublish,
            ownerId : widget.currentSpaceOwnerId(),
            ownerFirstName : spaceOwnerFirstName,
            ownerLastName : spaceOwnerLastName,
            accessLevel : widget.spaceAccessLevel(),
            siteName : widget.siteName()
          });

          widget.getMembers();

          if (!widget.space().contextId()){
            // if visiting /spaces/{spaceid}, we don't want that space to be sticky
        	storageApi.getInstance().setItem('social.currentSpaceId', widget.currentSpaceId());
          }
        }
      },
      handleCreateSpaceModelOpen : function() {
        var widget = this;

        // execute onHideCreaetSpaceModal right away on hide (before css transitions)
        $('#SWM-modalContainer').one('hide.bs.modal', { widget: widget, isCancel: 'true' }, widget.onHideCreateSpaceModal);

        // remove validations on observables after css transitions
        $('#SWM-modalContainer').one('hidden.bs.modal', function(){
          widget.errBadRequestSpaceName(false);
        });

        // show modal content right away
        $('#SWM-modalContainer').one('show.bs.modal', function() {
          $('#SWM-modalPane').show();
        });

        // focus on spacename input text after css transitions
        $('#SWM-modalContainer').one('shown.bs.modal', function() {
          $('#SWM-createSpace-name').focus();
        });

        // Open a modal
        $('#SWM-modalContainer').modal('show');
      },

      createSpaceInputUnmodified : function(){
        var widget = this;
        widget.createSpaceName.isModified(false);
      },
      /**
       * Callback for when the create space modal is being hidden.
       */
      onHideCreateSpaceModal : function (event) {
        var widget = event.data.widget;

        // hide the contents under the modal
        $('#SWM-modalPane').hide();

        widget.createSpaceAccessLevel('0');

        // clear the viewModel field, which in binded to the input field
        widget.createSpaceName('');
        widget.createSpaceName.isModified(false);
        
        // reset to the previous space if user cancelled
        if (event.data.isCancel == 'true') {
          widget.currentSpaceId(widget.spaceIdValueBeforeUpdate);
        }
      },

      /**
       * Handler: create new space
       */
      handleCreateSpace : function() {
        var widget = this;
        widget.createSpaceName.isModified(true);
        //Add validation
        widget.createSpaceName(widget.createSpaceName().trim());
        widget.errBadRequestSpaceName(false);
        
        if (!widget.createSpaceName.isValid()){
          return;
        }

        //Set up success and error callbacks for ajax call
        var errorCB = function(err) {
          var errResponse = JSON.parse(err);
          if (errResponse['o:errorCode'] === "409.0") {
            widget.errBadRequestSpaceName(true);
          }
          else if (errResponse['o:errorCode'] === "403.4") {
            var errMsg = widget.translate('spaceCreateMaxSpacesMsg');
            notifier.sendError(widget.WIDGET_ID, errMsg, true);
            
            // execute onHideCreateSpaceModal right away
            $('#SWM-modalContainer').one('hide.bs.modal', { widget: widget, isCancel: 'false' }, widget.onHideCreateSpaceModal);

            $('#SWM-modalContainer').modal('hide');
          }
        };
        var createSpaceSuccessCB = function(result) {
          if (result.response.code.indexOf("201") === 0) {
            var spaceid = result.spaceId;
            var ownerid = swmRestClient.apiuserid;

            // refresh contents of dropdown to include new space
            widget.getSpaces(function() {
              widget.defaultGetSpacesCallback(spaceid);
            });

            widget.createSpaceName(result.spaceName);

            // Update space information in global scope, instead of publishing with $Topic
            widget.updateSpaceInGlobalScope({
              id : spaceid,
              name : widget.createSpaceName(),
              ownerId : ownerid
            });

            storageApi.getInstance().setItem('social.currentSpaceId', spaceid);
            widget.spaceTitle(widget.createSpaceName());
            widget.spaceIdValueBeforeUpdate = spaceid;

            // Show space created notification
            notifier.sendSuccess(widget.WIDGET_ID, (widget.translate('spaceCreatedSuccessMsg')), true);

            // execute onHideCreateSpaceModal right away
            $('#SWM-modalContainer').one('hide.bs.modal', { widget: widget, isCancel: 'false' }, widget.onHideCreateSpaceModal);

            widget.closeModalById('#SWM-modalContainer');

            if(widget.space().contextId()){
              navigation.goTo(widget.links().wishlist.route);
            }
          }
        };

        var json = {
          siteId: swmRestClient.siteid,
          spaceName: widget.createSpaceName().trim(),
          spaceDescription: 'sample description from storefront',
          accessLevel: widget.createSpaceAccessLevel()
        };

        // call SWM server to create space
        swmRestClient.request('POST', '/swm/rs/v1/spaces', json, createSpaceSuccessCB, errorCB);
      },

      /**
       * Handler: create space modal canceled
       */
      handleCreateSpaceCancel : function() {
        var widget = this;
        widget.closeModalById('#SWM-modalContainer');

        // clear the viewModel field, which in binded to the input field
        widget.createSpaceName('');
      },

      // Begin Edit Space Title
      /**
       * Opens the Edit Space Modal
       */
      openEditSpaceModal: function() {
        var widget = this;

        if (!widget.userIsSpaceOwner()){
          // Only space owner can open edit modal
          return;
        }

        widget.spaceAccessLevel(widget.space().accessLevel());

        // remove validations on observables after css transitions
        $('#SWM-editSpaceModalContainer').one('hidden.bs.modal', function(){
          widget.errBadRequestSpaceName(false);
        });

        // execute onHideCreaetSpaceModal right away on hide (before css transitions)
        $('#SWM-editSpaceModalContainer').one('hide.bs.modal', { widget: widget, isCancel: 'true' }, widget.onHideEditSpaceModal);

        // show modal content right away
        $('#SWM-editSpaceModalContainer').one('show.bs.modal', function() {
          $('#SWM-editSpaceModalPane').show();
        });

        // focus on spacename input text after css transitions
        $('#SWM-editSpaceModalContainer').one('shown.bs.modal', function() {
          $('#SWM-editSpaceName').focus();
        });

        // Open a modal
        $('#SWM-editSpaceModalContainer').modal('show');

      },
      /**
       * Close the edit space modal
       */
      closeEditSpaceModal : function() {
        var widget = this;
        widget.closeModalById('#SWM-editSpaceModalContainer');
      },
      /**
       * OnHide handler for Edit Space Modal
       */
      onHideEditSpaceModal : function (event) {
        var widget = event.data.widget;

        $('#SWM-editSpaceModalPane').hide();

        // reset to the previous space if user cancelled
        if (event.data.isCancel == 'true') {
          widget.spaceTitle(widget.space().name());
        }
               
      },
      /**
       * Handle Edit space details save action
       */
      saveEditSpaceModalAction : function() {
        var widget = this;

        // if the space name and access level did not change, just close the Edit Space Modal
        var trimmedSpaceTitle = widget.spaceTitle().trim();
          if (trimmedSpaceTitle == widget.space().name()
              && widget.spaceAccessLevel() == widget.space().accessLevel()) {
          widget.closeEditSpaceModal();
          return;
        }

        //now, set the spaceTitle input to be the trimmed version
        widget.spaceTitle(trimmedSpaceTitle);

        if (!widget.spaceTitle.isValid()){
          return;
        }

        //execute rest
        var editSpaceTitleErrorCB = function(err) {
          var errResponse = JSON.parse(err);
          var errMsg = "";
          if (errResponse['o:errorCode'] === "409.0") {
            widget.errBadRequestSpaceName(true);
            return;
          }
          else {
            errMsg = widget.translate('spaceEditFailureMsg');
          }
          //if there was an error set the widget title back to the value before change
          widget.spaceTitle(widget.space().name());
          widget.spaceAccessLevel(widget.space().accessLevel());
          widget.closeEditSpaceModal();

          notifier.sendError(widget.WIDGET_ID, errMsg, true);
        };

        var editSpaceTitleSuccessCB = function(result) {
          if (result.response.code.indexOf("200") === 0) {
            ko.utils.arrayFirst(widget.spaceOptionsArray(), function(optionsGroup) {
              ko.utils.arrayFirst(optionsGroup.children(), function(optionsItem) {
                if (result.spaceId == optionsItem.spaceid) {

                  var itemToFind = function(item) {
                    return result.spaceId == item.spaceid;
                  };

                  var removedItems = optionsGroup.children.remove(itemToFind);
                  if(removedItems && removedItems.length > 0){
                    removedItems[0].spaceNameFull(widget.spaceTitle());
                    removedItems[0].spaceNameFormatted = ko.computed(function(){
                      if (removedItems[0].creatorId == swmRestClient.apiuserid) {
                        return removedItems[0].spaceName;
                      }
                      return removedItems[0].spaceName + " (" + removedItems[0].creatorFirstName + " " + removedItems[0].creatorLastName + ")";
                    }, widget);
                    removedItems[0].accessLevel = widget.spaceAccessLevel();
                    optionsGroup.children.push(removedItems[0]);
                  }
                }
              });
              var mySpacesArr = widget.user().myWishLists().sort(mySpacesComparator);
              widget.user().myWishLists(mySpacesArr);
              widget.user().myWishLists.valueHasMutated();

              // update global scope SpaceViewModel
              widget.updateSpaceInGlobalScope({
                name : widget.spaceTitle(),
                accessLevel : widget.spaceAccessLevel()
              });

              // close the edit space modal
              widget.closeEditSpaceModal();

            });
            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('spaceEditSuccessMsg'), true);
          }
        };

        var editSpaceTitleJson = {
          spaceName: widget.spaceTitle().trim(),
          spaceDescription: 'edit sample description from storefront',
          accessLevel : widget.spaceAccessLevel()
        };

        // call SWM server to edit space name
        swmRestClient.request('PUT', '/swm/rs/v1/spaces/{spaceid}', editSpaceTitleJson, editSpaceTitleSuccessCB, editSpaceTitleErrorCB, {"spaceid":widget.currentSpaceId()});
      },

     // Begin Delete Space
      /**
       * Opens the Delete Space Modal
       */
      openDeleteSpaceModal: function() {
        var widget = this;

        // execute onHideDeleteSpaceModal right away on hide (before css transitions)
        $('#SWM-deleteSpaceConfirm-ModalContainer').one('hide.bs.modal', { widget: widget, isCancel: 'true' }, widget.onHideDeleteSpaceModal);

        // show modal content right away
        $('#SWM-deleteSpaceConfirm-ModalContainer').one('show.bs.modal', function() {
          $('#SWM-deleteSpaceConfirm-ModalPane').show();
        });

        // Open a modal
        $('#SWM-deleteSpaceConfirm-ModalContainer').modal('show');

      },
      /**
       * Close the delete space modal
       */
      closeDeleteSpaceModal : function() {
        var widget = this;
        widget.closeModalById('#SWM-deleteSpaceConfirm-ModalContainer');
      },
      /**
       * OnHide handler for Delete Space Modal
       */
      onHideDeleteSpaceModal : function (event) {
        var widget = event.data.widget;
        $('#SWM-deleteSpaceModalPane').hide();
      },
      /**
       * Handle delete space action
       */
      deleteSpaceModalAction : function() {
        var widget = this;
        var successMsg = widget.translate('spaceDeleteSuccessMsg');
        if (widget.user().myWishLists().length == 1) {
          successMsg = widget.translate('spaceDeleteLastSpaceSuccessMsg');
        }

        var deletedSpaceEventData = {
          spaceName: widget.spaceTitle(),
          spaceId: widget.currentSpaceId()
        };

        //execute rest
        var deleteSpaceErrorCB = function(err) {
          widget.closeDeleteSpaceModal();
          widget.closeEditSpaceModal();

          notifier.sendError(widget.WIDGET_ID, widget.translate('spaceDeleteErrorMsg'), true);
        };

        var deleteSpaceSuccessCB = function(result) {
          if (result.response.code.indexOf("200") === 0) {
            // close the modal(s)
            widget.closeDeleteSpaceModal();
            widget.closeEditSpaceModal();
            widget.getSpaces(function() {
              // set space to first in alphabetical list
              var firstSpaceId = widget.user().myWishLists()[0].spaceid;
              widget.getSpace(firstSpaceId, function() {
                widget.setSpace(true);
                notifier.sendSuccess(widget.WIDGET_ID, successMsg, true);
                $.Topic(PubSub.topicNames.SOCIAL_SPACE_DELETED).publish(deletedSpaceEventData);
              });
            });
          }
        };

        // call SWM server to delete space
        swmRestClient.request('DELETE', '/swm/rs/v1/spaces/{spaceid}', '', deleteSpaceSuccessCB, deleteSpaceErrorCB, {"spaceid":widget.currentSpaceId()});
      },
      inviteFriendsBtnTooltip : function() {
        var widget = this;
        
        var key;
        if(widget.space().isPrivate()) {
          key = 'inviteFriendsPrivateTooltipTxt';
        } 
        else {
          key = 'inviteFriendsTooltipTxt';
        }
        
        return widget.translate(key);
      },
      spaceTitleIconTooltip : function(accessLevel) {
        var widget = this;
        
        var additionalTxt = "";
        if (accessLevel === "0") {
          additionalTxt = widget.translate('editWishlistPrivateTooltipTxt');
        }
        if (accessLevel === "1") {
          additionalTxt = widget.translate('editWishlistSharedTooltipTxt');
        }
        if (accessLevel === "2") {
          additionalTxt = widget.translate('editWishlistGroupTooltipTxt');
        }
        return (widget.translate('editWishlistTooltipTxt') + " " + additionalTxt);
        
      },
      addSpaceTitleValidation : function() {
        var widget = this;
          widget.spaceTitle.extend({
            required: {
              message: widget.translate('emptyNameMsg')
            }
          }).extend({
            editSpaceNameUniqueRule: {
              params: {
                currentSpaceId : widget.currentSpaceId(),
                spaces : widget.user().myWishLists()
              },
              message: widget.translate('uniqueNameMsg')
            }
          }).extend({
            badrequestspacename: {
              message: widget.translate('uniqueNameMsg'),
              onlyIf: widget.errBadRequestSpaceName
            }
          });
        },
      // End Edit Space Title
        
      /**
       * handle space selector click
       */
      selectSpace : function(spaceid) {
        var widget = this;
        widget.getSpace(spaceid, function() {
          widget.setSpace(true);
          // user should be able to see the spaces listed in their space selector
          widget.space().showSpace(true);
        });
        if(widget.space().contextId()){
          // if user is on /spaces/{spaceId} page, send them back to /spaces/
          return true;
        }
      },

      /**
       * Logic for initial space to show. If storageApi data is available, use that, otherwise, use the 1st space in myspaces
       */
      getDefaultSpaceId : function() {
        var widget = this;
        
        // use the 1st space in myspaces by default
        var defaultCurrentSpaceId = widget.user().myWishLists()[0].spaceid;
        
        // if storageApi value present, validated against currently logged in user's myspaces list.
        var locallyStoredSpaceId = storageApi.getInstance().getItem('social.currentSpaceId');
        if (locallyStoredSpaceId){
          var ownedOrJoinedSpaces = widget.user().myWishLists().concat(widget.user().joinedWishLists());
          for (var i=0; i<ownedOrJoinedSpaces.length; i++){
            if (locallyStoredSpaceId == ownedOrJoinedSpaces[i].spaceid){
              // storageApi value matches myspaces, return storageApi value
              defaultCurrentSpaceId = locallyStoredSpaceId;
              break;
            }
          }
        }
        return defaultCurrentSpaceId;
      },

      /**
       * Reset widget
       */
      resetWidget : function() {
        var widget = this;

        // clear page data
        widget.currentSpaceId("");
        widget.spaceTitle("");
        widget.spaceAccessLevel("");
        widget.currentSpaceOwnerId(''),

        // remove create space validations on observables
        widget.createSpaceName('');
        widget.createSpaceAccessLevel('0');
        widget.errBadRequestSpaceName(false);

        // clear user information
        widget.resetUserContext();

        widget.space().showSpace(false);

        // BEGIN : SPACE MEMBERS
        // clear observables
        widget.removalMembersList.removeAll();

        widget.currentUserFullName("");
        widget.currentUserMediaUrl("");

        // END : SPACE MEMBERS

      },


      
      /**
       * Reset user context, clear user information in widget, handle log and logout
       */
      resetUserContext : function() {
        var widget = this;
        swmRestClient.clear();
        widget.spaceOptionsArray.removeAll();
        widget.user().myWishLists.removeAll();
        widget.user().joinedWishLists.removeAll();
        widget.userIsSpaceOwner(false);
        widget.currentUserIsMember(false);

        // remove storageApi item for wishlist stickiness
        storageApi.getInstance().removeItem("social.currentSpaceId");
      },
      /**
       * Clear all error messages in the notification bar for this widget
       */
      clearAllErrorNotifications : function() {
        var widget = this;
        notifier.clearError(widget.WIDGET_ID);
      },

      /**
       * Clear all success messages in the notification bar for this widget
       */
      clearAllSuccessNotifications : function() {
        var widget = this;
        notifier.clearSuccess(widget.WIDGET_ID);
      },

      getSpace : function(spaceId, callback) {
        var widget = this;
        var successCB = function(result) {
          var mySpaceOptions = [];
          var joinedSpaceOptions = [];
          if (result.response.code.indexOf("200") === 0) {
            widget.currentSpaceId(result.spaceId);
            widget.currentSpaceOwnerId(result.creatorId);
            widget.spaceAccessLevel(result.accessLevel);
            widget.spaceTitle(result.spaceName);

            // Update space information in global scope, instead of publishing with $Topic
            widget.updateSpaceInGlobalScope({
              id : widget.currentSpaceId(),
              name : result.spaceName,
              ownerId : result.creatorId,
              ownerFirstName : result.creatorFirstName,
              ownerLastName : result.creatorLastName,
              accessLevel : result.accessLevel,
              siteName : result.siteName
            });
            widget.userIsSpaceOwner(widget.space().isSpaceOwner(swmRestClient.apiuserid));
            // Begin - determine space visibility
            if (widget.space().isPrivateOrGroup()){
              var isSpaceAccessible = false;
              // Group Space, only member and owner can access
              if (widget.space().isGroup && ( widget.space().isMember(swmRestClient.apiuserid) || widget.space().isSpaceOwner(swmRestClient.apiuserid) )){
                isSpaceAccessible = true;
              }
              // Private Space, only owner can access
              if(widget.space().isPrivate && widget.space().isSpaceOwner(swmRestClient.apiuserid)) {
                isSpaceAccessible = true;
              }
              widget.space().showSpace(isSpaceAccessible);
            }
            else {
              // Shared Space, anyone can see
              widget.space().showSpace(true);
            }

            widget.showWidget(true);
            // End - determine space visibility

            if (callback) {
              callback();
            }
          }
        };
        var errorCB = function(resultStr, status, errorThrown) {
          widget.space().showSpace(false);
          widget.showWidget(true);

          notifier.sendError(widget.WIDGET_ID, widget.translate('spaceNotFound'), true);
        };

        swmRestClient.request('GET', '/swm/rs/v1/spaces/{spaceid}', '', successCB, errorCB, {
          "spaceid" : spaceId
        });
      },
      /**
       * Handler: Display the Select Profile Image modal
       */
      spaceOwnerImageClick: function() {
        var widget = this;

        // if user is logged in, display modal to invite new user to space
        if (widget.user().loggedIn()) {

          // clear any notifications
          widget.messageBox.removeAllMessages();

          // set selected image
          widget.triggerChangeSelect();

        } //loggedIn
      },
      
      /**
       * Runs late in the page cycle on every page where the widget will appear.
       */
      beforeAppear : function(page) {
        var widget = this;

        // clear the banner so it doesn't repeatedly show
        notifier.clearSuccess('header');

        // If we're in Design studio Layout Manager preview .... do nothing
        if (widget.user().loggedIn() && widget.user().id() == "") {
          return;
        }
        
        if ( storageApi.getInstance().getItem("social.invite") ) {
          return;
        }
        
        if(page.contextId){
          widget.space().contextId(page.contextId);
          widget.getSpace(page.contextId, function(){
            if (widget.user().loggedIn()){
              widget.getSpaces(function(){
                widget.defaultGetSpacesCallback(page.contextId);
              });
            }
            else {
              widget.getMembers();
            }
            widget.showWidget(true);
          });
        }
        else {
          widget.space().contextId('');
          if (!widget.user().loggedIn()){
            widget.resetWidget();
            widget.space().showSpace(false);
            widget.showWidget(true);
          }
          else if (!widget.currentSpaceId()) {
            widget.getSpaces(function() {
              widget.defaultGetSpacesCallback(widget.getDefaultSpaceId());
              widget.space().showSpace(true);
              widget.showWidget(true);
            });
          }
        }
      },
      /**
       * Close a modal by it's element id. 
       * 
       * Note: Fix SC-4106: MS Edge 'spartan'
       * browser requires removing 'modal-open' and 'modal-backdrop' from DOM,
       * as event propagation stops after 'hide' listener, in bootstrap 3.1.
       * 
       * modalId should be passed in with '#' identifier, example '#modalId'
       */
      closeModalById: function(modalId) {
        $(modalId).modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      /**
       * Update SpaceViewModel in global scope.
       */
      updateSpaceInGlobalScope: function(obj) {
        var widget = this;
        widget.space().updateSpace(obj);
      }
    };
  }
);
