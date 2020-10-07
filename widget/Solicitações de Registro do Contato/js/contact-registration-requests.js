/**
 * @fileoverview Widget to get contact registration requests
 */
define(

  // -------------------------------------------------------------------
  // DEPENDENCIES
  // -------------------------------------------------------------------
  ['knockout', 'CCi18n', 'ccConstants', 'viewModels/registrationRequestSearch', 'navigation', 'spinner', 'ccRestClient',
    'jquery', 'storageApi', 'koValidate', 'ccKoValidateRules', 'notifier', 'viewModels/site-listing', 'viewModels/dynamicPropertyMetaContainer'],

  // -------------------------------------------------------------------
  // MODULE DEFINITION
  // -------------------------------------------------------------------
  function (ko, CCi18n, CCConstants, RegistrationRequestSearchViewModel, navigation, spinner, CCRestClient,
    $, storageApi, koValidate, rules, notifier, SiteListingViewModel, DynamicPropertyMetaContainer) {

    'use strict';
    /**
     * Widget to show notes
     */
    return {
      WIDGET_ID: "contactRegistrationRequestWidget",
      spinnerOptions: {
        parent: 'body',
        posTop: '50%',
        posLeft: '50%'
      },
      registrationRequestSearchViewModel: null,
      queryParamString: "",
      currentFilterOption: ko.observable(),
      filterOption: "",
      sortDirections: ko.observable(),
      contactSearchValue: ko.observable(""),
      isDetailsView: ko.observable(false),
      ///////Start: Details related variables/////////
      contactHeader: ko.observable(),
      registrationRequestStatus: ko.observable(),
      contactRequestId: ko.observable(),
      isReadOnly: ko.observable(),
      isExistingB2BUser: ko.observable(false),
      allowedRegistrationRequestsStatus: ko.observableArray(),
      siteName: ko.observable(""),
      siteProductionUrl: ko.observable(""),
      registrationRequestDate: ko.observable(""),
      requesterComments: ko.observable(),
      dialogHeader: ko.observable(),
      headerText: ko.observable(),
      descriptionText: ko.observable(),
      approverComments: ko.observable(),
      requestTabData: ko.observable({}),
      contactFirstName: ko.observable(),
      contactLastName: ko.observable(),
      contactEmail: ko.observable(),
      profileType: "",
      requestedAccountId: ko.observable(),
      requestId: ko.observable(),
      placeholderText: ko.observable(),
      acceptOrRejectText: ko.observable(),
      commentsText: ko.observable(),
      requestTabDirty: false,
      isApproveOrRejectAction: ko.observable(),
      isRequestForApproval: ko.observable(),
      selectedOrganization: ko.observable(),
      isAgentApplication: null,

      dynamicPropertyMetaInfo: DynamicPropertyMetaContainer.getInstance(),
      requestTabDynamicProperties: ko.observableArray([]),
      contactTabDynamicProperties: ko.observableArray([]),
      opDynamicProperty: ko.observable(CCConstants.DYNAMIC_PROPERTY_VIEW_ONLY),
      /////// End: Details related variables/////////

      onLoad: function (widget) {
        widget.isDetailsView(false);
        widget.isAgentApplication = window.isAgentApplication;

        var sortKeysAndDirection = {};
        sortKeysAndDirection[CCConstants.REGISTRATION_REQUEST_ID] = "both";
        sortKeysAndDirection[CCConstants.SCIM_EMAIL] = "both";
        sortKeysAndDirection[CCConstants.SCIM_FIRST_NAME] = "both";
        sortKeysAndDirection[CCConstants.SCIM_LAST_NAME] = "both";
        sortKeysAndDirection[CCConstants.REGISTRATION_REQUEST_DATE] = "both";
        sortKeysAndDirection[CCConstants.REGISTRATION_REQUEST_STATUS] = "both";
        widget.sortDirections(sortKeysAndDirection);
        widget.columnOptions = [
          { cloWidth: "col-md-1", columnNameHeader: "idText", columnSortKey: CCConstants.REGISTRATION_REQUEST_ID },
          { cloWidth: "col-md-2", columnNameHeader: "emailText", columnSortKey: CCConstants.SCIM_EMAIL },
          { cloWidth: "col-md-2", columnNameHeader: "lastNameText", columnSortKey: CCConstants.SCIM_LAST_NAME },
          { cloWidth: "col-md-2", columnNameHeader: "firstNameText", columnSortKey: CCConstants.SCIM_FIRST_NAME },
          { cloWidth: "col-md-2", columnNameHeader: "siteText", columnSortKey: null },
          { cloWidth: "col-md-2", columnNameHeader: "createdTimeText", columnSortKey: CCConstants.REGISTRATION_REQUEST_DATE },
          { cloWidth: "col-md-1", columnNameHeader: "statusText", columnSortKey: CCConstants.REGISTRATION_REQUEST_STATUS },
        ]
        widget.filterOptions = [{
          value: CCConstants.REGISTRATION_REQUEST_EXPAND_REQUEST_ALL_TYPE,
          label: CCi18n.t('ns.contactregistrationrequests:resources.filterTextAll')
        }, {
          value: CCConstants.REGISTRATION_REQUEST_TYPES_REJECT,
          label: CCi18n.t('ns.contactregistrationrequests:resources.registrationRequestRejectedText')
        }, {
          value: CCConstants.REGISTRATION_REQUEST_TYPES_MORE_INFO_NEEDED,
          label: CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestMoreInfoText")
        }, {
          value: CCConstants.REGISTRATION_REQUEST_TYPES_REVIEW,
          label: CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestReviewText")
        }, {
          value: CCConstants.REGISTRATION_REQUEST_TYPES_NEW,
          label: CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestNewText")
        }];
        widget.currentFilterOption(widget.filterOptions[0].value);
        widget.registrationRequestSearchViewModel = new RegistrationRequestSearchViewModel(this.createSpinner.bind(this), this.destroySpinner.bind(this))
        // If the configuration is set by user for pagination count, use that or else use default value as 10.
        if (widget.registrationRequestItemsPerPage && widget.registrationRequestItemsPerPage()) {
          widget.registrationRequestSearchViewModel.itemsPerPage = parseInt(widget.registrationRequestItemsPerPage());
        } else {
          widget.registrationRequestSearchViewModel.itemsPerPage = 10;
        }
        widget.registrationRequestSearchViewModel.isAccountSearch(false);

      },

      beforeAppear: function (page) {
        var widget = this;
        if (widget.user().loggedIn() == false) {
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        } else {
          if (!widget.user().isDelegatedAdmin()) {
            notifier.clearError(widget.WIDGET_ID);
            notifier.clearSuccess(widget.WIDGET_ID);
          } else {
            widget.isDetailsView(false);
            this.loadContactRequests();
          }
        }
      },

      /**
       * loads all unapproved contact requests.
       */
      loadContactRequests: function () {
        var widget = this;
        widget.createSpinner();
        widget.currentFilterOption(widget.filterOptions[0].value);
        widget.filterOption = CCConstants.REGISTRATION_REQUEST_EXPAND_REQUEST_ALL_TYPE;
        widget.queryParamString = "status ne " + "\"approved\"";
        widget.appendOrganizationQuery();
        widget.contactSearchValue("");
        widget.sortDirections()["createdTime"] = "desc";
        widget.refinedFetch();
      },

      /**
       * Parse the response item.
       * @param {Object} pItem.
       */
      parseResponseItem: function (pItem) {
        var widget = this;
        var parsedItem = {};
        parsedItem.id = pItem.id;
        parsedItem.email = pItem.profile ? pItem.profile.email : CCi18n.t("ns.contactregistrationrequests:resources.nameNotRetainedText");
        parsedItem.requestDate = widget.formatRegistrationRequestDate(pItem.createdTime, false);
        parsedItem.status = pItem.status;
        //if production url exists use it else if siteName exists use siteName else empty string
        parsedItem.productionUrl = pItem.site ? (pItem.site.productionURL ? "http://" + pItem.site.productionURL : "") : "";
        parsedItem.site = pItem.site ? (pItem.site.productionURL ? pItem.site.productionURL : (pItem.site.name ? pItem.site.name : pItem.site.id)) : "";
        parsedItem.firstName = pItem.profile ? pItem.profile.firstName : CCi18n.t("ns.contactregistrationrequests:resources.nameNotRetainedText");
        parsedItem.lastName = pItem.profile ? pItem.profile.lastName : CCi18n.t("ns.contactregistrationrequests:resources.nameNotRetainedText");
        parsedItem.localizedStatus = widget.getRequestStatus(pItem.status);
        return parsedItem;
      },

      /**
       * Format the date as per locale.
       * @param: {object} date string
       */
      formatRegistrationRequestDate: function (pInputDate, pLongFormat) {
        var widget = this;
        var formattedDate = pInputDate;
        var locale = (widget.locale()) ? widget.locale() : "en";
        if (pInputDate) {
          var date = new Date(pInputDate);
          // Defaulting to localeString value
          formattedDate = date.toLocaleString();
          if (Intl && Intl.DateTimeFormat) {
            var dateFormatter;
            if (pLongFormat) {
              dateFormatter = new Intl.DateTimeFormat(locale, {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                hour12: true
              });
            } else {
              dateFormatter = new Intl.DateTimeFormat(locale, {
                month: "long",
                day: "numeric",
                year: "numeric"
              });
            }
            formattedDate = dateFormatter.format(date);
          }
        }
        return formattedDate;
      },

      /**
       * Method to get the proper locale text for Status of each request
       * @param {String} Status string.
       */
      getRequestStatus: function (pStatus) {
        var status = "";
        if (pStatus) {
          switch (pStatus) {
            case CCConstants.REGISTRATION_REQUEST_TYPES_REJECT:
              status = CCi18n.t('ns.contactregistrationrequests:resources.registrationRequestRejectedText');
              break;
            case CCConstants.REGISTRATION_REQUEST_TYPES_MORE_INFO_NEEDED:
              status = CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestMoreInfoText");
              break;
            case CCConstants.REGISTRATION_REQUEST_TYPES_REVIEW:
              status = CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestReviewText");
              break;
            case CCConstants.REGISTRATION_REQUEST_TYPES_NEW:
              status = CCi18n.t("ns.contactregistrationrequests:resources.registrationReguestNewText");
              break;
          }
        }
        return status;
      },

      /**
       * On filter option change
       * @param pWidget Widget instance
       * @param pEvent Event object
       */
      onFilterOptionChange: function (pWidget, pEvent) {
        var widget = this;
        widget.createSpinner();
        widget.filterOption = pEvent.target.value;
        widget.refinedFetch();
      },

      /**
       * On sort icon click.
       * @param pSortItem Item on which sorting is done.
       * @param pSortOrder Ascending or descending.
       * @param pWidget Widget instance
       * @param pEvent Event object
       */
      sort: function (pSortItem, pSortOrder, pWidget, pEvent) {
        var widget = this;
        if (pEvent.type === "keypress") {
          var keyCode = (pEvent.which ? pEvent.which : pEvent.keyCode);
          if (keyCode !== CCConstants.KEY_CODE_ENTER) {
            return;
          }
        }
        widget.createSpinner();
        widget.updateSortDirections(pSortItem, pSortOrder);
        widget.sortDirections.valueHasMutated();
        widget.refinedFetch();

      },

      /**
       * updates the sort directions
       * @param pSortItem - sort value
       * @param pSortOrder -sort order
       */
      updateSortDirections: function (pSortItem, pSortOrder) {
        var self = this;
        this.sortDirections()[pSortItem] = pSortOrder;
        for (var prop in self.sortDirections()) {
          if (prop !== pSortItem) {
            self.sortDirections()[prop] = "both";
          }
        }
      },

      /**
       * get current sortProperty
       */
      getCurrentSortProperty: function () {
        var self = this;
        var sortObj = {};
        for (var prop in self.sortDirections()) {
          if (self.sortDirections()[prop] != "both") {
            sortObj.sortProperty = prop;
            sortObj.sortDirection = self.sortDirections()[prop];
          }
        }
        return sortObj;
      },

      /**
       * Destroy spinner.
       */
      destroySpinner: function () {
        spinner.destroy();
      },

      /**
       * Redirects to the registration request details page.
       * @param {String} pId.
       * @param {Object} pData.
       * @param {Object} pEvent object.
       */
      redirectToRequestDetailsPage: function (pId, pData, pEvent) {
        var widget = this;
        widget.isDetailsView(true);
        widget.loadContactRequestDetails(pId);
        this.isReadOnly(false);
      },

      /**
       * Create spinner.
       */
      createSpinner: function () {
        spinner.create(this.spinnerOptions);
      },

      appendOrganizationQuery: function () {
        if (this.user().currentOrganization()) {
          this.queryParamString += " and organization eq " + '\"' + this.user().currentOrganization().repositoryId + '\"';
        }
      },

      /**
       * Generates query and calls PerformSearch
       */
      refinedFetch: function () {
        var widget = this;
        var searchParamString = widget.queryParamString;
        searchParamString = (widget.filterOption !== CCConstants.REGISTRATION_REQUEST_EXPAND_REQUEST_ALL_TYPE) ? (searchParamString + "and status eq " + "\"" + widget.filterOption + "\"") : searchParamString;

        if (widget.contactSearchValue()) {
          if (searchParamString) {
            searchParamString += " and "
          }
          var searchStringValue = widget.getSCIMCompatibleString(widget.contactSearchValue());
          searchParamString += " profile.lastName co " + '\"' + searchStringValue + '\"';
        }

        var data = {};
        data.q = searchParamString;
        var currentSortObj = this.getCurrentSortProperty();
        data.sort = currentSortObj.sortProperty + ":" + currentSortObj.sortDirection;
        widget.registrationRequestSearchViewModel.performSearch(1, data, widget.parseResponseItem.bind(widget));
      },

      /**
       * Called when the user enters a contact in the search box on the Request listing page:
       * @page {param}
       * @type {function}
       */
      searchContactDetails: function (data, event) {
        var widget = this;
        widget.refinedFetch();
      },
      /**
       * Called when the user presses "Enter" key for search after the search term is entered:
       */
      searchContactKeyPress: function (data, event) {
        var widget = this;
        try {
          if (event.which == 13) {
            widget.searchContactDetails();
            return false;
          }
          return true;
        } catch (e) { }
      },
      /**
       * Returns SCIM compatible string.
       * @param {String} scimSearchString.
       */
      getSCIMCompatibleString: function (pScimSearchString) {
        var widget = this;
        pScimSearchString = pScimSearchString.replace(/\\/g, "\\\\");
        pScimSearchString = pScimSearchString.replace(/"/g, "\\\"");
        return pScimSearchString;
      },

      ////////////////////////////////////////////////////////////////START: details related methods//////////////////////////////////////////////////////////////////////////////////////

      loadContactRequestDetails: function (pRequestId) {
        this.requestId(pRequestId);
        var queryParam = {};
        queryParam.expand = CCConstants.REGISTRATION_REQUEST_EXPAND_REQUEST_ALL_TYPE;
        CCRestClient.request(CCConstants.ENDPOINT_B2B_ADMINISTRATION_GET_CONTACT_REQUEST, queryParam,
          this.requestLoadSuccess.bind(this), this.requestLoadFailure.bind(this), this.requestId());

      },

      /**
       * Success callback for the request Tab Load success
       * @param pResponse Response of the REST call
       */
      requestLoadSuccess: function (pResponse) {
        this.requestTabData(pResponse);
        if (pResponse) {
          this.allowedRegistrationRequestsStatus([{
            value: CCConstants.REGISTRATION_REQUEST_TYPES_ACCEPT,
            label: CCi18n.t("ns.contactregistrationrequests:resources.AcceptText")
          }, {
            value: CCConstants.REGISTRATION_REQUEST_TYPES_REJECT,
            label: CCi18n.t("ns.contactregistrationrequests:resources.RejectText")
          }, {
            value: CCConstants.REGISTRATION_REQUEST_TYPES_MORE_INFO_NEEDED,
            label: CCi18n.t("ns.contactregistrationrequests:resources.MoreInfoText")
          }, {
            value: CCConstants.REGISTRATION_REQUEST_TYPES_REVIEW,
            label: CCi18n.t("ns.contactregistrationrequests:resources.ReviewText")
          }, {
            value: CCConstants.REGISTRATION_REQUEST_TYPES_NEW,
            label: CCi18n.t("ns.contactregistrationrequests:resources.NewText")
          }]);
          if (!pResponse.profile) {
            this.isReadOnly(true);
          }
          this.initializeEditableProperties(pResponse);
          this.loadRequestTabDynamicPropertiesMetaData(pResponse);
        }
      },

      /**
       * Failure method callback for Request Tab load failure
       * @param pResponse Response of the REST call
       */
      requestLoadFailure: function (pResponse) {
        notifier.sendError(this.WIDGET_ID, pResponse.message, true);
      },

      /**
       * method to initialize editable properties once the request tab properties are fetched
       * @param pResponse response of the REST call 
       */
      initializeEditableProperties: function (pResponse) {
        if (pResponse.status) {
          if (!pResponse.profile) {
            this.allowedRegistrationRequestsStatus.remove(function (states) {
              return (pResponse.status !== states.value) && (CCConstants.REGISTRATION_REQUEST_TYPES_REJECT !== states.value)
            });
          } else if (CCConstants.REGISTRATION_REQUEST_TYPES_NEW !== pResponse.status) {
            this.allowedRegistrationRequestsStatus.remove(function (states) {
              return CCConstants.REGISTRATION_REQUEST_TYPES_NEW == states.value
            });
          }
        }
        this.registrationRequestStatus(pResponse.status);
        this.isReadOnly(this.isReadOnly() || this.registrationRequestStatus() == "rejected" ? true : false);
        if (this.isReadOnly()) {
          $("#selfRegistrationProfileTabs_contact").addClass("contactLinkDisabled");
          $("#selfRegistrationProfileTabs_contact").children("a").attr("data-toggle", "").removeAttr("href");
          $("#selfRegistrationProfileTabsMobile_contact").children("a").attr("data-toggle", "").removeAttr("href");

        }
        var contactFullName = "";
        this.requestTabDirty = false;
        this.isApproveOrRejectAction(false);
        this.isRequestForApproval(false);
        if (pResponse.profile) {
          contactFullName = pResponse.profile.firstName + " " + pResponse.profile.lastName;
        } else {
          contactFullName = pResponse.id;
        }
        var options = {
          "contactFullName": contactFullName
        }
        this.contactHeader(CCi18n.t('ns.contactregistrationrequests:resources.registrationRequestText', options));
        this.contactRequestId(pResponse.id);
        this.siteName(pResponse.siteId);
        this.requestedAccountId(pResponse.requestedOrgId);
        this.requesterComments(pResponse.requesterComments);
        this.approverComments(pResponse.approverComments);
        var longFormattedDate = this.formatRegistrationRequestDate(pResponse.createdTime, true);
        this.registrationRequestDate(longFormattedDate);
        this.populateSiteName(pResponse.siteId, SiteListingViewModel.sites());
        this.selectedOrganization(this.user().currentOrganization().repositoryId);

      },

      /**
       * method to populate the site name from the siteId
       * @param pSiteId site id of the site
       * @param pItemsArray Available sites from the sitelisting view model
       */
      populateSiteName: function (pSiteId, pItemsArray) {
        var item;
        var widget = this;
        if (pItemsArray) {
          for (var i = 0; i < pItemsArray.length; ++i) {
            if (pItemsArray[i].id === pSiteId) {
              item = pItemsArray[i];
              break;
            }
          }
        }
        if (item && item.productionURL) {
          widget.siteProductionUrl("http://" + item.productionURL);
        }
        if (item && item.name) {
          widget.siteName(item.name);
        } else {
          widget.siteName(pSiteId);
        }
      },

      /**
       * event handler for status change
       */
      handleStatusChange: function (data, event) {
        var selectedStatus = $("#request-tab-status")[0].value;
        this.commentsText("");
        this.allowedRegistrationRequestsStatus.remove(function (states) {
          return CCConstants.REGISTRATION_REQUEST_TYPES_NEW == states.value
        });
        if (selectedStatus == CCConstants.REGISTRATION_REQUEST_TYPES_ACCEPT) {
          this.dialogHeader(CCi18n.t("ns.contactregistrationrequests:resources.acceptConfirmation"));
          this.placeholderText(CCi18n.t("ns.contactregistrationrequests:resources.acceptDialogPlaceholderText"));
          this.headerText(CCi18n.t("ns.contactregistrationrequests:resources.approvedRequestCommentsHeaderText"));
          this.descriptionText(CCi18n.t("ns.contactregistrationrequests:resources.acceptRequestDialogDescriptionText"));
          this.acceptOrRejectText(CCi18n.t("ns.contactregistrationrequests:resources.AcceptText"));
        } else if (selectedStatus == CCConstants.REGISTRATION_REQUEST_TYPES_REJECT) {
          this.dialogHeader(CCi18n.t("ns.contactregistrationrequests:resources.rejectConfirmation"));
          this.placeholderText(CCi18n.t("ns.contactregistrationrequests:resources.rejectDialogPlaceholderText"));
          this.headerText(CCi18n.t("ns.contactregistrationrequests:resources.rejectedRequestCommentsHeaderText"));
          this.descriptionText(CCi18n.t("ns.contactregistrationrequests:resources.rejectRequestDialogDescriptionText"));
          this.acceptOrRejectText(CCi18n.t("ns.contactregistrationrequests:resources.RejectText"));
        }
        if (event.originalEvent) {
          this.requestTabDirty = true;
        }
      },

      /**
       * method to load contact tab data
       */
      loadContactTab: function () {
        var widget = this;
        if (!this.isReadOnly()) {
          var queryParam = {};
          queryParam.expand = CCConstants.REGISTRATION_REQUEST_EXPAND_PROFILE_ALL_TYPE;
          CCRestClient.request(CCConstants.ENDPOINT_B2B_ADMINISTRATION_GET_CONTACT_REQUEST, queryParam,
            this.contactLoadSuccess.bind(this), this.contactLoadFailure.bind(this), this.requestId());
        }
      },

      /**
       * Success callback for Contact load
       * @param pResponse Response of the REST call
       */
      contactLoadSuccess: function (pResponse) {
        this.contactFirstName(pResponse.profile.firstName);
        this.contactLastName(pResponse.profile.lastName);
        this.contactEmail(pResponse.profile.email);
        this.profileType = pResponse.profile.profileType;
        this.isExistingB2BUser(false);
        if (CCConstants.B2B_PROFILE_TYPE === this.profileType) {
          this.isExistingB2BUser(true);
        }
        this.loadContactTabDynamicPropertiesMetaData(pResponse);
      },

      /**
       * Failure method callback for Contact Tab load failure
       * @param pResponse Response of the REST call
       */
      contactLoadFailure: function (pResponse) {
        notifier.sendError(this.WIDGET_ID, pResponse.message, true);
      },

      /**
       * Click hanlder for Save button click. Consolidates the changed data and
       * makes a REST call
       */
      handleSave: function () {
        var widget = this;
        var requestPayload = {};
        if (this.requestTabDirty) {
          requestPayload[CCConstants.REGISTRATION_REQUEST_STATUS] = this.registrationRequestStatus();
          this.setRequestStatusProperties(requestPayload.status);
        }
        if (!this.isApproveOrRejectAction()) {
          this.updateRegistrationRequestDetails(requestPayload);
        } else {
          widget.commentsText.extend({ maxLength: { params: 1000, message: CCi18n.t('ns.common:resources.approverCommentMaxLengthText') } });
          widget.commentsText('');
          $("#commentsModal").modal();
        }
      },

      /**
       * Cancel button handler
       */
      handleCancel: function () {
        var widget = this;
        widget.isDetailsView(false);
      },

      /**
       * method to set the request status for other methods to use
       * @param pStatus Selected status for the request
       */
      setRequestStatusProperties: function (pStatus) {
        var isRequestApproved = false;
        var isActionApprovedOrReject = false;
        if (pStatus) {
          if (pStatus === CCConstants.REGISTRATION_REQUEST_TYPES_ACCEPT) {
            isRequestApproved = true;
            isActionApprovedOrReject = true;
          } else if (pStatus === CCConstants.REGISTRATION_REQUEST_TYPES_REJECT) {
            isRequestApproved = false;
            isActionApprovedOrReject = true;
          }
          this.isApproveOrRejectAction(isActionApprovedOrReject);
          this.isRequestForApproval(isRequestApproved);
        }
      },

      /**
       * method to handle update action
       */
      updateRegistrationRequestDetails: function (requestPayload) {
        var self = this;
        var savePayload = {};
        var isRequestApprovedOrRejected = false;
        // Organization Request tab
        if (this.requestTabDirty) {
          if (savePayload && !savePayload.organization) {
            var org = {};
            org.id = this.selectedOrganization();
            savePayload.organization = org;
          }
          if (CCConstants.REGISTRATION_REQUEST_TYPES_ACCEPT === requestPayload.status || CCConstants.REGISTRATION_REQUEST_TYPES_REJECT === requestPayload.status) {
            delete requestPayload.status;
          }
        }
        // Add the payload to final payload
        $.extend(savePayload, requestPayload);
        if (!$.isEmptyObject(savePayload) && !(this.isApproveOrRejectAction() === true && this.isRequestForApproval() === true)) {
          CCRestClient.request(CCConstants.ENDPOINT_B2B_ADMINISTRATION_UPDATE_CONTACT_REQUEST, savePayload,
            this.saveSuccess.bind(this, isRequestApprovedOrRejected), this.restFailure.bind(this), this.contactRequestId());
        }
      },

      /**
       * Success callback for update action on contact requests
       * @param pResult Success response
       */
      saveSuccess: function (pResult) {
        var widget = this;
        notifier.sendSuccess(this.WIDGET_ID, pResult.message ? pResult.message : (CCi18n.t("ns.contactregistrationrequests:resources.confirmationSuccessMessage")), true);
        widget.isDetailsView(false);
        widget.refinedFetch();
      },

      /**
       * Failure callback for update action on contact requests
       * @param pResult Failure response
       */
      restFailure: function (pResult) {
        notifier.sendError(this.WIDGET_ID, pResult.message ? pResult.message : (CCi18n.t("ns.contactregistrationrequests:resources.confirmationErrorMessage")), true);
      },

      /**
       * method to handle Approve/Reject action
       */
      handleApproveOrRejectRequest: function () {
        var url, requestObj = {};
        var org = {};
        if (this.selectedOrganization) {
          org.id = this.selectedOrganization();
        }
        requestObj.approverComments = this.commentsText();
        requestObj.organization = org;
        requestObj.requestedOrgId = this.selectedOrganization();
        if (this.isRequestForApproval()) {
          url = CCConstants.ENDPOINT_B2B_ADMINISTRATION_APPROVE_CONTACT_REQUEST;
        } else {
          url = CCConstants.ENDPOINT_B2B_ADMINISTRATION_REJECT_CONTACT_REQUEST;
        }
        CCRestClient.request(url, requestObj, this.approveOrRejectSuccess.bind(this),
          this.onAcceptRequestFailure.bind(this), this.contactRequestId());
      },

      /**
       * click handler for Accept/Reject Button in Comments Dialog
       */
      acceptCommentsHandler: function () {
        var widget = this;
        if (widget.commentsText.isValid()) {
          var savePayLoad = {};
          var requestPayload = {};
          requestPayload[CCConstants.REGISTRATION_REQUEST_STATUS] = this.registrationRequestStatus();
          this.handleApproveOrRejectRequest(status);
        }
      },

      /**
       * Success callback for Accept/reject action on Contact
       * @param pResult Success Response
       */
      approveOrRejectSuccess: function (pResult) {
        var widget = this;
        notifier.sendSuccess(this.WIDGET_ID, pResult.message ? pResult.message : (CCi18n.t("ns.contactregistrationrequests:resources.confirmationSuccessMessage")), true);
        $('#commentsModal').modal('hide');
        $(document.body).removeClass("modal-open");
        $(".modal-backdrop").remove();
        widget.isDetailsView(false);
        widget.refinedFetch();
      },

      /**
       * Failure callback for Accept/reject action on Contact
       * @param pResult Failure Response
       */
      onAcceptRequestFailure: function (pResult) {
        $('#commentsModal').modal('hide');
        notifier.sendError(this.WIDGET_ID, pResult.message ? pResult.message : (CCi18n.t("ns.contactregistrationrequests:resources.confirmationErrorMessage")), true);
      },

      /**
       * method to load dynamic properties of request tab
       * 
       * pResult pResult organization data
       */
      loadRequestTabDynamicPropertiesMetaData: function (pResult) {
        var widget = this;
        var type = CCConstants.ENDPOINT_CONTACT_REQUEST_TYPE_PARAM;
        var params = {};
        params[CCConstants.PARENT] = type;
        if (widget.dynamicPropertyMetaInfo && widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache) {
          if (!(widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache.hasOwnProperty(type))) {
            widget.requestDynamicPropertyMetaData(params,
              widget.onRequestTabDynamicPropertiesLoadSuccess.bind(widget, pResult),
              widget.onRequestTabDynamicPropertiesLoadFailure.bind(widget),
              type);
          } else {
            var dynamicPropertyMetaCache = widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache[type];
            widget.initializeDynamicProperties(dynamicPropertyMetaCache, pResult, widget.requestTabDynamicProperties);
          }
        }
      },

      /**
       * method to load dynamic properties of contact tab
       * pResult pResult organization data
       */
      loadContactTabDynamicPropertiesMetaData: function (pResult) {
        var widget = this;
        var params = {};
        params[CCConstants.PARENT] = CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM;
        if (widget.dynamicPropertyMetaInfo && widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache) {
          if (!(widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache.hasOwnProperty(CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM))) {
            widget.requestDynamicPropertyMetaData(params,
              widget.onContactTabDynamicPropertiesLoadSuccess.bind(widget, pResult),
              widget.onContactTabDynamicPropertiesLoadFailure.bind(widget),
              CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM);
          } else {
            var dynamicPropertyMetaCache = widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache[CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM];
            widget.initializeDynamicProperties(dynamicPropertyMetaCache, pResult.profile, widget.contactTabDynamicProperties);
          }
        }
      },

      /**
       * Generic method for dynamic properties rest call.
       * @param {object} query parameters
       * @param {function} success handler
       * @param {function} failure handler
       * @param {object} parameter
       */
      requestDynamicPropertyMetaData: function (pQueryParam, pSuccessCallback, pErrorCallback, pParam) {
        CCRestClient.request(CCConstants.ENDPOINT_GET_ITEM_TYPE, pQueryParam,
          pSuccessCallback, pErrorCallback, pParam);
      },

      /**
       * Request tab success handler for dynamic properties
       */
      onRequestTabDynamicPropertiesLoadSuccess: function (pResult, pDynamicPropData) {
        var widget = this;
        var type = CCConstants.ENDPOINT_CONTACT_REQUEST_TYPE_PARAM;
        widget.dynamicPropertyMetaInfo.intializeDynamicProperties(pDynamicPropData.specifications, type);
        if (widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache.hasOwnProperty(type)) {
          var dynamicPropertyMetaCache = widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache[type];
          widget.initializeDynamicProperties(dynamicPropertyMetaCache, pResult, widget.requestTabDynamicProperties);
        }
      },

      /**
       * Request tab failure handler for dynamic properties
       */
      onRequestTabDynamicPropertiesLoadFailure: function (pError) {
        var widget = this;
        notifier.sendError(widget.WIDGET_ID, pError.message, true);
      },

      /**
       * success handler for contact tab dynamic properties REST call
       * @param pResult organization data
       * @param response received form server
       */
      onContactTabDynamicPropertiesLoadSuccess: function (pResult, pDynamicPropData) {
        var widget = this;
        widget.dynamicPropertyMetaInfo.intializeDynamicProperties(pDynamicPropData.specifications, CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM);
        if (widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache.hasOwnProperty(CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM)) {
          var dynamicPropertyMetaCache = widget.dynamicPropertyMetaInfo.dynamicPropertyMetaCache[CCConstants.ENDPOINT_SHOPPER_TYPE_PARAM];
          widget.initializeDynamicProperties(dynamicPropertyMetaCache, pResult.profile, widget.contactTabDynamicProperties);
        }
      },

      /**
       * failure handler for contact tab dynamic properties REST call
       */
      onContactTabDynamicPropertiesLoadFailure: function (pError) {
        var widget = this;
        notifier.sendError(widget.WIDGET_ID, pError.message, true);
      },

      /**
       * Initializes the dynamic properties
       * @param pMetaData: dynamic Property Meta Cache
       * @param pResult: response of tab rest call
       * @param pDynPropArray: tab specific dyn properties observable array
       */
      initializeDynamicProperties: function (pMetaData, pResult, pDynPropArray) {
        var widget = this;
        pDynPropArray.removeAll();
        var dynPropArray = [];
        for (var i = 0; i < pMetaData.length; i++) {
          var dynPropValue = pResult[pMetaData[i].id()];
          // Special case for checkboxes
          if (pMetaData[i].type() === 'checkbox' && dynPropValue !== true) {
            dynPropValue = false;
          }
          //type check for 'boolean' is added as dynamic property of type checkbox should be shown even if it is not checked.
          if (dynPropValue || typeof dynPropValue === "boolean") {
            if (pMetaData[i].type() === "enum") {
              for (var j = 0; j < dynPropValue.length; j++) {
                value = dynPropValue[j];
                pMetaData[i].values.push(value);
              }
              dynPropArray.push(pMetaData[i]);
            } else {
              pMetaData[i].value(dynPropValue);
              dynPropArray.push(pMetaData[i]);
            }
          }
        }
        pDynPropArray(pDynPropArray().concat(dynPropArray));
      }
      //////////////////////////////////////////////////////////////// END: details related methods //////////////////////////////////////////////////////////////////////////////////////

    }
  });
