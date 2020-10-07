define(

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //------------------------------------------------------------------- 
    ['knockout', 'ccConstants', 'pubsub', 'koValidate', 'notifier',
        'storeKoExtensions', 'ccKoValidateRules', 'CCi18n', 'spinner', 'js/mundicheckout', 'js/Mask'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function (ko, CCConstants, pubsub, koValidate, notifier,
        storeKoExtensions, rules, CCi18n, spinner, Mundijs, JsMask) {

        "use strict";

        return {
            genericPayment: { type: "generic" },
            isInvoicePaymentEnabled: ko.observable(false),
            installments: ko.observableArray([]),
            acceptedYears: [],
            months: [],
            installmentsChanged: ko.observable(),
            acceptedPaymentMethods: [],
            acceptedCardBrands: ko.observableArray([]),
            acceptedVoucherBrands: [],
            originalCardNumberInputColor: "",
            configuration: {},
            totalAmountChangedByMundi: false,
            brands: ko.observableArray([]),
            formaPagamento: ko.observable(),

            setInstallmentChanged: function (event, installment) {
                var widget = this;
                var installmentSelected = installment.currentTarget.selectedIndex;
                if (installmentSelected === undefined || installmentSelected === 0) {
                    installmentSelected = 1;
                }

                if (!widget.installments()[installmentSelected - 1]) {
                    return;
                }

                var paymentAmount = widget.installments()[installmentSelected - 1].amount;
                widget.totalAmountChangedByMundi = true;
                widget.setOrderTotalAmount(paymentAmount);

                widget.payment().customProperties["installments"] = installmentSelected;
            },

            getConfiguration: function () {
                var widget = this;

                var production = true;
                var mundiConnectorApiUrl;
                var mundiConnectorApiPathAndArgs;

                if (production) {
                    mundiConnectorApiUrl = 'https://occ-app.mundipagg.com';
                    mundiConnectorApiPathAndArgs = '/account-config?storeUrl=https://' + window.location.hostname;
                }
                else {
                    mundiConnectorApiUrl = 'https://stgocc-app.mundipagg.com';
                    mundiConnectorApiPathAndArgs = '/account-config?storeUrl=https://' + window.location.hostname + "&tunnel_url=https://occ.serveo.net";
                }

                $.ajax({
                    url: mundiConnectorApiUrl + mundiConnectorApiPathAndArgs,
                    type: 'GET',
                    dataType: 'json',
                    crossDomain: true,
                    success: function (data) {
                        widget.configuration = data;

                        //add document.ready because ajax return may be faster than widget's onload execution
                        // $(document).ready(function () {

                        widget.acceptedPaymentMethods = data.acceptedPaymentMethods;

                        widget.setMundiPk(data.publicKey);

                        // console.log("ajax");


                        Mundijs.MundiCheckout.init(

                            function (response) {
                                widget.createCardTokenSuccess(response);
                                // console.log("chama init", response);
                            },
                            function (error) {
                                // console.log("chama init falha", error);
                                widget.createCardTokenFailed();

                            }

                        );


                        var paymentAmount = widget.cart().total();
                        var saveBrand = [""];
                        widget.acceptedCardBrands([]);
                        if (data.acceptedPaymentMethods.includes("credit_card")) {
                            widget.acceptedCardBrands(data.acceptedCreditCardBrands);
                            widget.handleInstallmentsConfig(paymentAmount, data),
                                widget.createCardNumberListener();
                        }

                        if (data.acceptedPaymentMethods.includes("voucher")) {
                            if (data.acceptedVoucherBrands) {
                                data.acceptedVoucherBrands.forEach(function (brand) {
                                    widget.acceptedVoucherBrands.push(brand);
                                    widget.showAcceptedBrandImage(brand, "voucher");

                                });
                            }
                            widget.createCardNumberListener();
                        }

                        if (!data.acceptedPaymentMethods.includes("boleto")) {
                            document.getElementById("boleto-tab-link").style.display = "none";
                        }

                        //  var defaultPaymentMethodTab = data.defaultPaymentMethod.replace("_", "-") + "-tab";
                        //  widget.changeTab(defaultPaymentMethodTab);

                        widget.createMasks();
                        widget.createCreditCardSubmitListener();
                        // });
                    }
                });
            },

            handleInstallmentsConfig: function (paymentAmount, configuration) {
                var widget = this;
                if (widget.formaPagamento() == "credit_card") {
                    var installment;
                    var installments = [];
                    for (installment = 1; installment <= configuration.maxInstallments; installment++) {

                        var currentInterest = this.getInterestByInstallment(installment, configuration);
                        var totalAmountWithInterest = paymentAmount + paymentAmount * (currentInterest / 100);
                        var totalAmountPerInstallment = parseFloat(totalAmountWithInterest / installment);

                        if (!this.isMinAmountAllowedForInstallment(configuration, totalAmountPerInstallment, installment)) {
                            break;
                        }

                        totalAmountWithInterest = totalAmountWithInterest.toFixed(2);

                        var insterestMessage = " sem juros";
                        if (currentInterest !== 0) {
                            insterestMessage = " com juros de " + currentInterest.toFixed(2) + "% (total: R$ " + totalAmountWithInterest + ")";
                        }

                        totalAmountPerInstallment = totalAmountPerInstallment.toFixed(2);
                        var installmentText = installment + "x de R$ " + totalAmountPerInstallment + insterestMessage;
                        installments.push({
                            text: installmentText,
                            value: installment,
                            amount: totalAmountWithInterest
                        });
                    }
                    widget.installments(installments);
                    if (window.location.href.indexOf("checkout") > -1) {
                        if (widget.installments().length > 1 && document.getElementById("mundipagg-installment")) {
                            document.getElementById("mundipagg-installment").parentElement.style.display = 'block';
                        }
                        else {
                            var installmentsElement = document.getElementById("mundipagg-installment");
                            //  installmentsElement.parentElement.style.display = 'none';
                            installmentsElement.value = "1";
                        }
                    }
                }
            },

            isMinAmountAllowedForInstallment: function (configuration, totalAmount, installment) {

                if (configuration.installmentMinAmount !== null && configuration.installmentMinAmount > 0) {

                    var amountPerInstallment = totalAmount / installment;

                    if (amountPerInstallment < configuration.installmentMinAmount) {
                        return false;
                    }
                }

                return true;
            },

            getInterestByInstallment: function (installment, configuration) {
                var interest = 0;

                // Basic interest
                if (installment >= (configuration.maxInstallmentsWithoutInterest + 1)) {
                    interest = configuration.instalmentInterest;
                }

                // Incremental interest
                if (installment > (configuration.maxInstallmentsWithoutInterest + 1) &&
                    configuration.instalmentInterestIncrement > 0) {
                    var incrementFactor = installment - (configuration.maxInstallmentsWithoutInterest + 1);

                    interest = interest + incrementFactor * configuration.instalmentInterestIncrement;
                }

                return interest;
            },

            createBoletoOrder: function () {

                // console.log("createBoletoOrder");

                var boletoDocument = document.getElementById("mpagg-cpf-boleto").value;

                if (this.isValidDocument(boletoDocument) === false) {
                    $("#boleto-alert").fadeTo(6000, 500).slideUp(500, function () {
                        $("#boleto-alert").slideUp(500);
                    });
                    this.destroySpinner();
                    return;
                }

                this.payment().customProperties.x_document = boletoDocument.replace(/\D/g, '');

                this.genericPayment.id = this.id();

                this.genericPayment.customProperties = this.payment().customProperties;
                this.genericPayment.type = "invoice";
                var payments = [this.genericPayment];
                this.originalPayments = [this.payment()];
                this.order().updatePayments(payments);

                // console.log("createBoletoOrder 2", this.payment());
                this.createSpinner();
                this.order().createOrder();
            },

            createCardTokenFailed: function () {
                var errorMsg = CCi18n.t('ns.locale:resources.invalidPaymentData', {});
                this.createCardErrorWarning(errorMsg);
            },

            createCardTokenSuccess: function (data) {

                // console.log("createCardTokenSuccess");

                if (this.isValidDocument(data[0].card.holder_document) === false) {
                    var errorMsg = CCi18n.t('ns.locale:resources.invalidDocumentText', {});
                    this.createCardErrorWarning(errorMsg);
                    return;
                }

                this.payment().customProperties.x_document = data[0].card.holder_document.replace(/\D/g, '');

                this.payment().customProperties["mundiCardToken"] = data[0].id;
                var fakeCardNumber = "400000000000" + data[0].card.last_four_digits;
                var fakeName = "HOLDER NAME";
                var fakeCVV = "000";
                var brand = data[0].card.brand;
                var fakeMonth = "12";
                var fakeYear = new Date().getFullYear() + 1;

                if (this.genericPayment) {
                    if (this.genericPayment.type === "invoice") {
                        this.genericPayment.type = "card";
                        this.genericPayment.id = "";
                        this.genericPayment.cardNumber = fakeCardNumber;
                        this.genericPayment.nameOnCard = fakeName;
                        this.genericPayment.cardType = brand;
                        this.genericPayment.selectedCardType = brand;
                        this.genericPayment.cardCVV = fakeCVV;
                        this.genericPayment.endMonth = fakeMonth;
                        this.genericPayment.selectedEndMonth = fakeMonth;
                        this.genericPayment.endYear = fakeYear;
                        this.genericPayment.selectedEndYear = fakeYear;
                        this.genericPayment.customProperties = this.payment().customProperties;
                    }
                }

                this.order().isInvoicePayment(false);
                this.payment().cardCVV(fakeCVV);
                this.payment().cardNumber(fakeCardNumber);
                this.payment().cardType(brand);
                this.payment().endMonth(fakeMonth);
                this.payment().endYear(fakeYear);
                this.payment().nameOnCard(fakeName);
                this.payment().selectedCardType(brand);
                this.payment().selectedEndMonth(fakeMonth);
                this.payment().selectedEndYear(fakeYear);

                this.order().paymentDetails().cardCVV(fakeCVV);
                this.order().paymentDetails().cardNumber(fakeCardNumber);
                this.order().paymentDetails().cardType(brand);
                this.order().paymentDetails().endMonth(fakeMonth);
                this.order().paymentDetails().endYear(fakeYear);
                this.order().paymentDetails().nameOnCard(fakeName);
                this.order().paymentDetails().selectedCardType(brand);
                this.order().paymentDetails().selectedEndMonth(fakeMonth);
                this.order().paymentDetails().selectedEndYear(fakeYear);

                // console.log("createCardTokenSuccess 2", this.payment());
                this.createSpinner();
                this.order().createOrder();
            },

            createCardErrorWarning: function (message) {
                this.destroySpinner();
                $("#card-error-msg").html(message);

                $("#card-alert").fadeTo(6000, 500).slideUp(500, function () {
                    $("#card-alert").slideUp(500);
                });
            },

            isValidDocument: function (documentElement) {
                var isValid = true;
                if (!documentElement) {
                    isValid = false;
                }
                else {
                    var documentNumber = documentElement.replace(/\D/g, '');
                    isValid = documentNumber.length === 11 || documentNumber.length === 14;
                }

                return isValid;
            },

            showAcceptedBrandImage: function (brand, cardTypeElementName) {
                var image = new Image();
                var src = '/file/general/';
                brand = brand.toLowerCase();
                image.src = src + brand + '.png';

                image.onload = function () {
                    var $newImg = document.createElement('img');
                    $newImg.style.width = "120%";
                    $newImg.setAttribute('src', image.src);

                    var $newImgColumn = document.createElement('div');
                    $newImgColumn.setAttribute('class', 'col-ms-1 col-xs-1');

                    $newImgColumn.appendChild($newImg);
                    document.getElementById("accepted-brands-" + cardTypeElementName).appendChild($newImgColumn);
                };

                image.onerror = function () {
                    if (image.src.includes(".jpg")) {
                        image.src = image.src.replace(".jpg", ".png");
                    }
                };
            },

            createCardNumberListener: function () {
                var widget = this;
                if (widget.formaPagamento() == "credit_card") {
                    var cardNumber = document.getElementById("mpagg-card-number");
                    var cardNumberVoucher = document.getElementById("mpagg-card-number-voucher");

                    cardNumber.addEventListener('keypress', function () {
                        widget.validateCardBrand("");
                    });
                    cardNumber.addEventListener('keyup', function () {
                        widget.validateCardBrand("");
                    });
                    cardNumber.addEventListener('keydown', function () {
                        widget.validateCardBrand("");
                    });
                }
                if (widget.formaPagamento() == "voucher") {
                    cardNumberVoucher.addEventListener('keypress', function () {
                        widget.validateCardBrand("-voucher");
                    });
                    cardNumberVoucher.addEventListener('keyup', function () {
                        widget.validateCardBrand("-voucher");
                    });
                    cardNumberVoucher.addEventListener('keydown', function () {
                        widget.validateCardBrand("-voucher");
                    });
                }
            },

            createCreditCardSubmitListener: function () {
                var widget = this;
                if (widget.formaPagamento() == "cartao") {
                    var cardSubmittButton = document.getElementById("mundi-card-form");

                    cardSubmittButton.addEventListener('submit', function () {
                        widget.createSpinner();
                    });
                }
            },

            validateCardBrand: function (cardTypeElementName) {
                var cardNumberInput = document.getElementById("mpagg-card-number" + cardTypeElementName);

                if (cardNumberInput.value.length <= 6) {
                    document.getElementById("mpagg-invalid-brand" + cardTypeElementName).style.display = "none";
                    return;
                }

                var bin = cardNumberInput.value.replace(/\s/g, '').substring(0, 6);
                var types = Mundijs.MundiCheckout.getCardTypes();
                var brand = Mundijs.MundiCheckout.getBrand(types, bin);

                if (this.originalCardNumberInputColor === "") {
                    this.originalCardNumberInputColor = cardNumberInput.style.borderColor;
                }

                //remove "-"
                if (this.isValidBrand(brand, cardTypeElementName.substring(1))) {
                    document.getElementById("mpagg-invalid-brand" + cardTypeElementName).style.display = "none";
                    document.getElementById("mpagg-create-card-order" + cardTypeElementName).disabled = false;
                    cardNumberInput.style.borderColor = null;
                }
                else {
                    document.getElementById("mpagg-invalid-brand" + cardTypeElementName).style.display = "inline";
                    document.getElementById("mpagg-create-card-order" + cardTypeElementName).disabled = true;
                    cardNumberInput.style.borderColor = this.originalCardNumberInputColor;
                }
            },

            isValidBrand: function (brand, cardType) {
                var widget = this;
                if (cardType === "voucher") {
                    if (!this.acceptedVoucherBrands) {
                        return false;
                    }

                    if (widget.acceptedVoucherBrands.includes(brand) === false) {
                        return false;
                    }

                    return true;
                }
                else {
                    if (!widget.acceptedCardBrands()) {
                        return false;
                    }

                    if (widget.acceptedCardBrands().includes(brand) === false) {
                        return false;
                    }
                    return true;
                }
            },

            setOrderTotalAmount: function (amount) {
                amount = parseFloat(amount);
                this.payment().customProperties.amountWithInterest = amount;
            },

            /*    changeTab: function (clickedTab) {
                  var widget = this;
  
                  this.acceptedPaymentMethods.forEach(function (payment) {
                    //   console.log(11, payment)
                      payment = payment.replace("_", "-");
                      var paymentTab = payment + "-tab";
                      var tab = document.getElementById(paymentTab);
  
                      if (paymentTab === clickedTab) {
                       //   widget.showTab(tab);
                          widget.payment().customProperties.paymentMethod = payment.replace("-", "_");
                      }
                      else {
                      //    widget.hideTab(tab);
                      }
                  });
              },
  
            hideTab: function (tab) {
                  tab.style.display = "none";
                  tab.classList.remove('active');
              }, 
  
              showTab: function (tab) {
                  tab.style.display = "block";
                  tab.classList.add('active');
              }, */

            setMundiPk: function (publicAccountKey) {
                var mundiPkInput = $("[data-mundicheckout-app-id]")[0];
                mundiPkInput.setAttribute('data-mundicheckout-app-id', publicAccountKey);

            },

            createCustomProperties: function () {
                var widget = this;

                var customProperties = {
                    installments: "",
                    mundiCardToken: "",
                    paymentMethod: "",
                    x_document: "",
                    amountWithInterest: 0
                };

                widget.payment().customProperties = customProperties;


                widget.payment().customProperties.paymentMethod = widget.formaPagamento();


                // console.log("createCustomProperties", widget.formaPagamento());


            },

            populateExpMonthDropBox: function () {
                this.months = ko.observableArray([]);
                var months = [];
                for (var i = 1; i <= 12; i++) {
                    months.push({
                        text: i,
                        value: i
                    });
                }
                this.months(months);
            },

            populateExpYearsDropBox: function () {
                var actualYear = new Date().getFullYear();
                this.acceptedYears = ko.observableArray([]);
                var acceptedYears = [];

                for (var i = 0; i < 15; i++) {
                    acceptedYears.push({
                        text: actualYear + i,
                        value: actualYear + i
                    });
                }

                this.acceptedYears(acceptedYears);
            },

            createSpinner: function () {
                $(this.pricingIndicator).css('position', 'absolute');

                var config = {
                    parent: '#page',
                    posTop: '50%',
                    posLeft: '50%'
                };

                config.loadingText = this.translate('rePricingText', { defaultValue: "" });
                spinner.create(config);

                document.getElementById("cc-spinner").style.position = "fixed";
            },

            destroySpinner: function () {
                $(this.pricingIndicator).removeClass('loadingIndicator');
                spinner.selector = '#CC-orderSummaryLoadingModal';
                spinner.destroy(1);
            },

            createMasks: function () {
                JsMask.format(".mpagg-cvv");
                JsMask.format(".mpagg-cvv-voucher");
                JsMask.format(".mpagg-card-number");
                JsMask.format(".mpagg-card-number-voucher");
                JsMask.format(".mpagg-cpf-boleto");
                JsMask.format(".mpagg-cpf-voucher");
                // JsMask.format(".mpagg-cpf-card");
            },

            rendered: function () {
                var widget = this;

                widget.getConfiguration();

                // console.log("rendered");

            },

            onLoad: function (widget) {

                
                //   widget.hideRVPayment();
                $.Topic("placeOrder").subscribe(function () {


                    if (widget.formaPagamento() == "credit_card") {
                        $("#mpagg-create-card-order").click();
                    }
                    else if (widget.formaPagamento() == "voucher") {
                        $("#mpagg-create-card-order-voucher").click();
                    }
                    else if (widget.formaPagamento() == "boleto") {
                        widget.createBoletoOrder();
                    } else {
                        // widget.createSpinner();
                        var payment = { type: "generic" };
                        widget.order().addPayment(payment);

                        widget.handleOrderRetrieved = function (orderEvent) {

                            var widget = this;
                            widget.order().id(orderEvent.order.id);
                            widget.order().isVerified(true);

                            var payment = { type: "generic", paymentGroupId: orderEvent.order.payments[0].paymentGroupId };
                            var payments = [payment];
                            widget.order().updatePayments(payments);
                        };

                        $.Topic(pubsub.topicNames.ORDER_RETRIEVED_INITIAL).subscribe(
                            widget.handleOrderRetrieved.bind(widget));

                        widget.validate = function () {
                            return true;
                        }
                        if (widget.cart().currentOrderState() == CCConstants.PENDING_PAYMENTS || widget.cart().currentOrderState() == CCConstants.PENDING_PAYMENT_TEMPLATE) {
                            widget.order().handlePayments();
                        }
                        else {
                            // widget.createSpinner();
                            widget.order().handlePlaceOrder();
                        }
                    }
                });

                // widget.createCustomProperties();
                // widget.getConfiguration();
                widget.populateExpYearsDropBox();
                widget.populateExpMonthDropBox();


                widget.cart().total.subscribe(function (newAmount) {
                    if (widget.totalAmountChangedByMundi) {
                        widget.totalAmountChangedByMundi = false;
                        return;
                    }

                    //in case getConfiguration had not returned yet
                    if (widget.installments().length < 1) {
                        return;
                    }

                    var installment = {
                        currentTarget: {
                            selectedIndex: 1
                        }
                    };

                    if ($("#mundipagg-installment").length > 0 && window.location.href.indexOf("checkout") > -1) {
                        document.getElementById("mundipagg-installment").selectedIndex = "0";
                    }
                    widget.handleInstallmentsConfig(parseFloat(newAmount), widget.configuration);
                    widget.setInstallmentChanged(null, installment);
                });
            },

            beforeAppear: function () {
                var widget = this;


                if (sessionStorage.getItem("formasPagamento_c") == "331") {
                    widget.formaPagamento("credit_card");
                }
                else if (sessionStorage.getItem("formasPagamento_c") == "500") {
                    widget.formaPagamento("boleto");
                }
                else {
                    widget.formaPagamento("outro");
                }

                widget.createCustomProperties();



            },
        };
    }
);