/**
 * @fileoverview Order Confirmation Widget. 
 * Displays a confirmation of the order placed by the user.
 */
define(

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'CCi18n', 'pubsub', 'notifier', 'ccConstants', 'spinner', 'ccRestClient'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function (ko, CCi18n, PubSub, notifier, CCConstants, spinner, ccRestClient) {

        "use strict";

        return {
            WIDGET_ID: "accountCheckoutConfirmation",
            isPending: ko.observable(false),
            isPendingApproval: ko.observable(false),
            needsPayment: ko.observable(true),
            pendingApprovalStates: [CCConstants.PENDING_APPROVAL, CCConstants.PENDING_APPROVAL_TEMPLATE],

            showPaymentInfos: function () {
                var widget = this;
                if (widget.confirmation().payments[0].paymentMethod === "invoiceRequest") {
                    widget.showBoletoInfos();
                }
                else {
                    document.getElementById("boleto-tab").style.display = "none";
                }
            },

            showBoletoInfos: function () {
                var widget = this;
                //document.getElementById("boleto-tab").style.display = "block";

                var boletoInfos = widget.getBoletoInfos(widget);
                var boletoPdfElement = document.getElementById("boleto-pdf");
                var boletoLineElement = document.getElementById("boleto-line");
                boletoPdfElement.setAttribute("href", boletoInfos.boleto_url);
                boletoLineElement.value = boletoInfos.boleto_line;
            },

            getBoletoInfos: function (widget) {
                var boletoInfos = {};
                Object.keys(widget.confirmation().payments[0].customPaymentProperties).forEach(function (item) {
                    var splitted = item.split(/=(.+)/);
                    boletoInfos[splitted[0]] = splitted[1];
                });

                return boletoInfos;
            },

            resourcesLoaded: function (widget) {
                // Create observable to mark the resources loaded, if it's not already there
                if (typeof widget.checkoutResourcesLoaded === 'undefined') {
                    widget.checkoutResourcesLoaded = ko.observable(false);
                }
                // Notify the computeds relying on resources
                widget.checkoutResourcesLoaded(true);
            },

            getCountryDisplayName: function (countryCd) {
                if (this.shippingCountries()) {
                    for (var i in this.shippingCountries()) {
                        var countryObj = this.shippingCountries()[i];
                        if (countryObj.countryCode === countryCd) {
                            return countryObj.displayName;
                        }
                    }
                }
                return "";
            },

            getStateDisplayName: function (countryCd, stateCd) {
                if (this.shippingCountries()) {
                    for (var i in this.shippingCountries()) {
                        var countryObj = this.shippingCountries()[i];
                        if (countryObj.countryCode === countryCd) {
                            for (var j in countryObj.regions) {
                                var stateObj = countryObj.regions[j];
                                if (stateObj.abbreviation === stateCd) {
                                    return stateObj.displayName;
                                }
                            }
                        }
                    }
                }
                return "";
            },

            beforeAppear: function (page) {
                var widget = this;

                $.when(widget.site().siteLoadedDeferred).done(function () {
                    if (widget.confirmation()) {
                        var secondaryCurrency = widget.site().getCurrency(widget.confirmation().secondaryCurrencyCode);
                        if (widget.secondaryCurrency() || secondaryCurrency) {
                            if (widget.secondaryCurrency() && secondaryCurrency && (widget.secondaryCurrency().currencyCode === secondaryCurrency.currencyCode)) {
                                return;
                            }
                            widget.secondaryCurrency(secondaryCurrency);
                        }
                    }
                });

                if (widget.confirmation().state === CCConstants.PENDING_PAYMENT) {
                    widget.isPending(true);
                }
                else if (widget.pendingApprovalStates.indexOf(widget.confirmation().state) !== -1) {
                    widget.isPendingApproval(true);
                    if (this.confirmation().payments.length === 1 && (this.confirmation().payments[0].paymentMethod === CCConstants.INVOICE_PAYMENT_METHOD ||
                        this.confirmation().payments[0].paymentMethod === CCConstants.CASH_PAYMENT_TYPE)) {
                        widget.needsPayment(false);
                    }
                    else { widget.needsPayment(true); }
                }
                else {
                    widget.isPending(false);
                    widget.isPendingApproval(false);
                }

                //remove the spinner
                $('#loadingModal').hide();
                spinner.destroy(0);
                if (widget.user().errorMessageKey() !== '') {
                    notifier.sendError(widget.WIDGET_ID, widget.translate(widget.user().errorMessageKey()), true);
                }

                if(widget.user().successMessageKey() !== '') {
                    notifier.sendSuccess(widget.WIDGET_ID, widget.translate(widget.user().successMessageKey()));
                }

                if (ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION) !== null) {
                    var regStatus = ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
                    if (regStatus === CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_SUCCESS) {
                        notifier.sendSuccess(widget.WIDGET_ID, widget.translate('loginSuccessText'));
                    }

                    if (regStatus === CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_FAILURE) {
                        notifier.sendError(widget.WIDGET_ID, widget.translate('loginFailureText'), true);
                    }
                    ccRestClient.clearStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
                }
                widget.user().errorMessageKey('');
                widget.user().successMessageKey('');

                widget.showPaymentInfos();
            },

            onLoad: function (widget) {
                if (widget.confirmation()) {

                    // Create observable to mark the resources loaded, if it's not already there
                    if (typeof widget.checkoutResourcesLoaded === 'undefined') {
                        widget.checkoutResourcesLoaded = ko.observable(false);
                    }

                    // i18n strings required for table summary attributes
                    widget.yourOrderText = ko.computed(function () {
                        if (widget.checkoutResourcesLoaded()) {
                            var messageText = CCi18n.t(
                                'ns.locale:resources.yourOrderText', {}
                            );
                            return messageText;
                        }
                        else {
                            return '';
                        }

                    }, widget);

                    widget.shipToText = ko.computed(function () {
                        if (widget.checkoutResourcesLoaded()) {
                            var messageText = CCi18n.t(
                                'ns.locale:resources.shipToText', {}
                            );
                            return messageText;
                        }
                        else {
                            return '';
                        }

                    }, widget);

                    widget.shippingMethodText = ko.computed(function () {
                        if (widget.checkoutResourcesLoaded()) {
                            var messageText = CCi18n.t(
                                'ns.locale:resources.shippingMethodText', {}
                            );
                            return messageText;
                        }
                        else {
                            return '';
                        }

                    }, widget);

                    widget.secondaryCurrency = ko.observable(null);
                    widget.showSecondaryShippingData = ko.pureComputed(function () {
                        return widget.confirmation().payShippingInSecondaryCurrency &&
                            (null !== widget.secondaryCurrency());
                    });

                    // Parameterized i18n strings
                    widget.orderDate = ko.computed(function () {
                        var orderDateString = widget.ccDate(widget.confirmation().creationDate, null, null, CCConstants.MEDIUM);
                        return orderDateString;

                    }, widget);

                    widget.orderTime = ko.computed(function () {
                        var orderTimeString = widget.ccDate(widget.confirmation().creationDate, null, null, CCConstants.TIME);
                        return orderTimeString;

                    }, widget);

                    widget.thankyouMsg = ko.computed(function () {
                        if (widget.checkoutResourcesLoaded()) {
                            var linkText = CCi18n.t(
                                'ns.locale:resources.thankyouMsg',
                                {
                                    orderDate: widget.orderDate(),
                                    orderTime: widget.orderTime()
                                }
                            );
                            return linkText;
                        }
                        else {
                            return '';
                        }

                    }, widget);

                    widget.orderNumberMsg = ko.computed(function () {
                        if (widget.checkoutResourcesLoaded()) {
                            var linkText = CCi18n.t(
                                'ns.locale:resources.orderNumberMsg',
                                {
                                    orderNumber: widget.confirmation().id
                                }
                            );
                            return linkText;
                        }
                        else {
                            return '';
                        }

                    }, widget);
                }
            }
        };
    });