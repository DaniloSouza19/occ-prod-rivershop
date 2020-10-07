define(

    ['knockout', 'CCi18n', 'jquery', 'ccConstants', 'ccStoreConfiguration',
        'viewModels/searchTypeahead', 'placeholderPatch', 'navigation', 'notifications', 'pubsub', 'notifier', 'ccRestClient'
    ],

    function (ko, CCi18n, $, CCConstants, CCStoreConfiguration,
        searchTypeahead, placeholder, navigation, notifications, pubsub, notifier, ccRestClient) {

        "use strict";

        return {

            WIDGET_ID: ko.observable("NSH_Header"),

            //Search
            searchText: ko.observable(""),
            SEARCH_SELECTOR: '.search-query',

            //Minicart
            displayedMiniCartItems: ko.observableArray(),
            currentSection: ko.observable(1),
            totalSections: ko.observable(),
            dropdowncartItemsHeight: ko.observable(),
            gwpQualifiedMessage: ko.observable(),
            isTotalRecordsGreater: ko.observable(false),

            linkList: ko.observableArray(),
            cartVisible: ko.observable(false),

            miniCartNumberOfItems: ko.observable(3),
            displayMiniCart: ko.observable(true),
            miniCartDuration: ko.observable(5000),

            //Menu
            categories_vertical: ko.observableArray(),
            categories_horizontal: ko.observableArray(),
            storeConfiguration: CCStoreConfiguration.getInstance(),
            rootCategoryId_horizontal: ko.observable("river_shop_horizontal"),
            catalogId_horizontal: ko.observable("river_shop"),
            rootCategoryId_vertical: ko.observable("river_shop"),
            catalogId_vertical: ko.observable("river_shop"),
            isMobile: ko.observable(true),
            show_vertical: ko.observable(false),

            limitCredit: ko.observable(),
            resourcesLoaded: function (widget) { },



            rendered: function (widget) {

                $('button.category-toggle.departamento_vertical').on('click', function () {
                    $("ul.list.nav.nav__small.clearfix.vertical").css("display", "block");

                });
                $("ul.list.nav.nav__small.clearfix.vertical").hover(function () {
                    $(this).css("display", "block");
                }, function () {

                    $(this).css("display", "none");
                });




                //Menu mobile

                $("#navTrigger").click(function (e) {
                    $(this).toggleClass('open');
                    e.preventDefault();
                    $("body").toggleClass("leftBody");
                    $("#mySidenav").toggleClass("toggled");
                });



                $('#category').on('click', function () {
                    $('#category').toggleClass("active");
                    $('.nav__content').toggleClass("active");

                });



                $("#changeCurrency").on("click", function (t) {
                    t.stopPropagation(),
                        $("#currencyList").slideToggle(),
                        $("#languageList").slideUp("slow"),
                        $("#accountList").slideUp("slow"),
                        $("#paymentList").slideUp("slow")
                }),
                    $("#changeLanguage").on("click", function (t) {
                        t.stopPropagation(),
                            $("#languageList").slideToggle(),
                            $("#currencyList").slideUp("slow"),
                            $("#accountList").slideUp("slow"),
                            $("#paymentList").slideUp("slow")
                    }),

                    $("#changePayment").on("click", function (t) {
                        t.stopPropagation(),
                            $("#paymentList").slideToggle(),
                            $("#currencyList").slideUp("slow"),
                            $("#languageList").slideUp("slow"),
                            $("#accountList").slideUp("slow")
                    }),
                    $("body:not(#changeLanguage)").on("click", function () {
                        $("#languageList").slideUp("slow")
                    }),
                    $("body:not(#changeCurrency)").on("click", function () {
                        $("#currencyList").slideUp("slow")
                    }),

                    $("#cart-icon").on("click", function (t) {
                        t.stopPropagation(),
                            $("#cart-floating-box").slideToggle()
                    }),
                    $("body:not(#cart-icon)").on("click", function () {
                        $("#cart-floating-box").slideUp("slow")
                    });

            },

            onLoad: function (widget) {
                //setTimeout(function() {
                //    widget.findCardLimit();
                //}, 1000);

                $.Topic(pubsub.topicNames.PAGE_READY).subscribe(function () {
                    widget.findCardLimit();
                });


                $(window).scroll(function () {

                });

                $('#category').on('click', function () {
                    $('#category').toggleClass("active");
                    $('.nav__content').toggleClass("active");
                });

                $("html").on("click", "#changeAccount", function (t) {
                    t.stopPropagation(),
                        $("#accountList").slideToggle(),
                        $("#currencyList").slideUp("slow"),
                        $("#languageList").slideUp("slow"),
                        $("#paymentList").slideUp("slow")
                });


                $.Topic(pubsub.topicNames.CART_ADD_SUCCESS).subscribe(function () {
                    notifier.sendSuccess(this.WIDGET_ID, 'Produto adicionado ao carrinho.', false);
                });

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


                        if (actualWindow == "desktop") {
                            actualWindow = "mobile";



                            widget.isMobile(true);
                        }
                    } else {

                        if (actualWindow == "mobile") {
                            actualWindow = "desktop";
                            widget.isMobile(false);
                        }
                    }
                });

                widget.setCategoryList_horizontal();
                widget.setCategoryList_vertical();




                //Minicart
                if (widget.hasOwnProperty('miniCartNumberOfItems')) {

                    //If miniCartNumberOfItems is not configured then default value is 3
                    if (widget.miniCartNumberOfItems() === undefined) {
                        widget.miniCartNumberOfItems(3);
                    }

                    widget.miniCartNumberOfItems(parseInt(widget.miniCartNumberOfItems()));

                    // Changing height of .dropdowncartItems based on miniCartNumberOfItems
                    widget.computeDropdowncartHeight = function () {
                        var itemHeight = $("#CC-headerWidget #dropdowncart .item").css("height");
                        if (itemHeight) { //Converting height from string to integer
                            itemHeight = itemHeight.split("p");
                            itemHeight = parseInt(itemHeight[0]);
                        } else { // default height
                            itemHeight = 80;
                        }
                        self.dropdowncartItemsHeight(widget.miniCartNumberOfItems() * itemHeight + 24);
                        self.dropdowncartItemsHeight(self.dropdowncartItemsHeight() + "px");
                    };

                    /**
                     *As grouping is done based on miniCartNumberOfItems() , this
                     variable stores the maximum groups of miniCartNumberOfItems()
                     items possible based on number of items in the cart.
                     Currently miniCartNumberOfItems() has a value of 3
                     */
                    self.totalSections = ko.computed(function () {
                        if (widget.cart().allItems().length == 0) {
                            return 0;
                        } else {

                            var totalNoOfRecords = 0;
                            for (var index = 0; index < widget.cart().allItems().length; index++) {
                                var cartItem = widget.cart().allItems()[index];
                                if (cartItem.shippingGroupRelationships && null != cartItem.shippingGroupRelationships()) {
                                    totalNoOfRecords += cartItem.shippingGroupRelationships().length;
                                } else {
                                    // We wouldn't have shippinggroups for GWP items.
                                    totalNoOfRecords += 1;
                                }
                                if (!widget.isTotalRecordsGreater.peek() && totalNoOfRecords > widget.miniCartNumberOfItems()) {
                                    widget.isTotalRecordsGreater(true);
                                } else if (totalNoOfRecords <= widget.miniCartNumberOfItems()) {
                                    widget.isTotalRecordsGreater(false);
                                }
                            }
                            return Math.ceil(totalNoOfRecords / widget.miniCartNumberOfItems());
                        }
                    }, widget);

                    // function to display items in miniCart array when scrolling down
                    widget.miniCartScrollDown = function () {
                        // Clear any timeout flag if it exists. This is to make sure that
                        // there is no interruption while browsing cart.
                        if (widget.cartOpenTimeout) {
                            clearTimeout(widget.cartOpenTimeout);
                        }
                        widget.currentSection(widget.currentSection() + 1);
                        widget.computeMiniCartItems();
                        if (widget.displayedMiniCartItems()[0]) {
                            $("#CC-header-dropdown-minicart-image-" + widget.displayedMiniCartItems()[0].productId + widget.displayedMiniCartItems()[0].catRefId).focus();
                        }
                    };

                    // function to display items in miniCart array when scrolling up
                    widget.miniCartScrollUp = function () {
                        // Clear any timeout flag if it exists. This is to make sure that
                        // there is no interruption while browsing cart.
                        if (widget.cartOpenTimeout) {
                            clearTimeout(widget.cartOpenTimeout);
                        }
                        widget.currentSection(widget.currentSection() - 1);
                        self.computeMiniCartItems();
                        if (widget.displayedMiniCartItems()[0]) {
                            $("#CC-header-dropdown-minicart-image-" + widget.displayedMiniCartItems()[0].productId + widget.displayedMiniCartItems()[0].catRefId).focus();
                        }
                    };

                    // Re-populate displayedMiniCartItems array based on add/remove
                    widget.computeMiniCartItems = function () {

                        widget.displayedMiniCartItems.removeAll();

                        for (var index = 0; index < widget.cart().allItems().length; index++) {
                            var cartItem = widget.cart().allItems()[index];
                            if (cartItem.shippingGroupRelationships && null != cartItem.shippingGroupRelationships()) {
                                for (var sgIndex = 0; sgIndex < cartItem.shippingGroupRelationships().length; sgIndex++) {
                                    var miniCartitem = {};
                                    miniCartitem.shippingGroupRelationship = cartItem.shippingGroupRelationships()[sgIndex];
                                    miniCartitem.cartItem = cartItem;
                                    miniCartitem.currency = widget.cart().currency;

                                    widget.displayedMiniCartItems.push(miniCartitem);
                                }
                            } else {
                                widget.displayedMiniCartItems.push(cartItem);
                            }

                        }
                        if (widget.currentSection() <= self.totalSections()) {
                            widget.displayedMiniCartItems(widget.displayedMiniCartItems().slice((widget.currentSection() - 1) * widget.miniCartNumberOfItems(),
                                widget.currentSection() * widget.miniCartNumberOfItems()));
                        } else {
                            if (self.totalSections()) {
                                widget.displayedMiniCartItems(widget.displayedMiniCartItems().slice((self.totalSections() - 1) * widget.miniCartNumberOfItems(),
                                    self.totalSections() * widget.miniCartNumberOfItems()));
                                widget.currentSection(self.totalSections());
                            } else { // Mini-cart is empty, so initialize variables
                                widget.displayedMiniCartItems.removeAll();
                                widget.currentSection(1);
                            }
                        }
                    };

                    widget.getCartItem = function (shippingGroup) {
                        var cartItem = null;
                        if (shippingGroup && shippingGroup.productId && shippingGroup.catRefId) {
                            for (var index = 0; index < widget.cart().allItems().length; index++) {
                                var currentCartItem = widget.cart().allItems()[index];
                                if (shippingGroup.productId === currentCartItem.productId && shippingGroup.catRefId === currentCartItem.catRefId) {
                                    cartItem = currentCartItem;
                                    break;
                                }
                            }
                        }
                        return cartItem;
                    }
                    /**
                     * Function that makes sure that the mini cart opens of, if set to
                     * and goes to the particular product that has just been added to cart.
                     */
                    widget.goToProductInDropDownCart = function (product) {

                        widget.computeMiniCartItems();

                        var skuId = product.childSKUs[0].repositoryId;
                        var cartItems = widget.cart().allItems();
                        var itemNumber = -1;
                        // Focus at start.
                        $('.cc-cartlink-anchor').focus();
                        if (widget.displayMiniCart()) {
                            for (var i = 0; i < cartItems.length; i++) {
                                if ((product.id == cartItems[i].productId) && (cartItems[i].catRefId == skuId)) {
                                    itemNumber = i;
                                    break;
                                }
                            }
                            if (itemNumber > -1) {
                                widget.showDropDownCart();
                                // Move down the number of times given
                                var prodPage = Math.floor(itemNumber / widget.miniCartNumberOfItems());
                                var prodNum = itemNumber % widget.miniCartNumberOfItems();
                                widget.currentSection(prodPage + 1);
                                widget.computeMiniCartItems();
                                // Now focus on the product
                                $("#CC-header-dropdown-minicart-image-" + product.id + skuId).focus();
                                // Set the timeout if the item exists (should be there all the time.
                                // Still a fallback).
                                widget.cartOpenTimeout = setTimeout(function () {
                                    widget.hideDropDownCart();
                                    $('.cc-cartlink-anchor').focus();
                                }, widget.miniCartDuration() * 1000);
                            }
                        }
                    };

                    $.Topic(pubsub.topicNames.CART_ADD_SUCCESS).subscribe(widget.goToProductInDropDownCart);
                    $.Topic(pubsub.topicNames.CART_REMOVE_SUCCESS).subscribe(widget.computeMiniCartItems);
                    $.Topic(pubsub.topicNames.SHIPPING_GROUP_REMOVE_SUCCESS).subscribe(widget.computeMiniCartItems);
                    $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY_SUCCESS).subscribe(widget.computeMiniCartItems);
                    $.Topic(pubsub.topicNames.CART_UPDATED).subscribe(widget.computeMiniCartItems);
                    $.Topic(pubsub.topicNames.GWP_QUALIFIED_MESSAGE).subscribe(function (message) {
                        widget['header-dropdown-minicart'].gwpQualifiedMessage(message.summary);
                    });
                    $.Topic(pubsub.topicNames.GWP_CLEAR_QUALIFIED_MESSAGE).subscribe(function () {
                        widget['header-dropdown-minicart'].gwpQualifiedMessage(null);
                    });

                }


                // save the links in an array for later
                widget.linkList.removeAll();

                for (var propertyName in widget.links()) {
                    widget.linkList.push(widget.links()[propertyName]);
                }
                // compute function to create the text for the cart link  "0 items - $0.00" "1 item - $15.25" "2 items - $41.05"
                widget.cartLinkText = ko.computed(function () {
                    var cartSubTotal, linkText, numItems;
                    var currencySymbol = widget.cart().currency.symbol;
                    var cartSubTotal = widget.formatPrice(widget.cart().subTotal(), widget.cart().currency.fractionalDigits);
                    if (currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
                        currencySymbol = currencySymbol + ' ';
                    }
                    numItems = widget.ccNumber(widget.cart().numberOfItems());
                    // use the CCi18n to format the text avoiding concatination  "0 items - $0.00"
                    // we need to get the currency symbol from the site currently set to a $
                    linkText = CCi18n.t('ns.common:resources.cartDropDownText', {
                        count: widget.cart().numberOfItems(),
                        formattedCount: numItems,
                        currency: currencySymbol,
                        totalPrice: cartSubTotal
                    });
                    return numItems; //linkText;
                }, widget);
                var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
                if (isiPad) {
                    $(window).on('touchend', function (event) {
                        if (!($(event.target).closest('#dropdowncart').length)) {
                            //close the mini cart if clicked outside minicart
                            $('#dropdowncart > .content').fadeOut('slow');
                            $('#dropdowncart').removeClass('active');
                        }
                        if (!($(event.target).closest('#languagedropdown').length)) {
                            //close the language picker if clicked outside language picker
                            $('#languagedropdown > .content').fadeOut('slow');
                            $('#languagedropdown').removeClass('active');
                        }
                        if (!($(event.target).closest('#CC-megaMenu').length)) {
                            //close the mega menu if clicked outside mega menu
                            $('li.cc-desktop-dropdown:hover > ul.dropdown-menu').css("display", "none");
                            isMegaMenuExpanded = false;
                        } else {
                            if ($(event.target).closest('a').next('ul').length === 0) {
                                return true;
                            }
                            //for ipad, clicking on megaMenu should show the megaMenu drop down, clicking again will take to the category page
                            if (!isMegaMenuExpanded && $(window).width() >= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                                isMegaMenuExpanded = true;
                                return false;
                            } else if (isMegaMenuExpanded && $(event.target).closest('a').attr('href') === navigation.getRelativePath()) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                    });
                }
                //Fim MiniCart


            },

            findCardLimit: function () {
                var widget = this;
                var dynamicProperties = widget.user().dynamicProperties();
                $.each(dynamicProperties, function (index, value) {
                    if (value.id() === "limitecredito_c") {
                        //console.log ("value.value() ", value.value());
                        widget.limitCredit(value.value());
                        //$(".card-limit").text(widget.limitCredit());
                    }
                })
            },

            toggleDropDownCart: function () {

                if ($('#dropdowncart').hasClass('active')) {
                    this.hideDropDownCart();
                } else {
                    this.showDropDownCart();
                }
            },

            beforeAppear: function (page) {

                $(window).resize(function () {

                    $("#navTrigger").click(function (e) {
                        $(this).toggleClass('open');
                        e.preventDefault();
                        $("body").toggleClass("leftBody");
                        $("#mySidenav").toggleClass("toggled");
                    });


                });




                // $('.btn-dropdown__account ul li a, .btn-dropdown__simple--list   li a').click(function () {
                //   $('.btn-dropdown__account,btn-dropdown__simple,.btn-dropdown__simple ').hide();
                // });

                // $('.nav__content ul.list.nav li a , .nav__content ul.list.nav li a span  ').click(function () {
                //   $('.nav__content').removeClass("active");

                // });
                $("body").on("click", "a.nav__link.nav__combo--item.text.text-bold.text-gray.text-medium.hasSubMenu.linke", function () {
                    $(".sidenav").removeClass("toggled");
                    $("body").removeClass("leftBody");
                    $(".navTrigger.float-btn").removeClass("open");
                    $(".navTrigger.float-btn").removeClass("active");

                });



                $("body").on("click", "a.linke", function () {

                    $(".sidenav").removeClass("toggled");
                    $("body").removeClass("leftBody");
                    $(".navTrigger.float-btn").removeClass("open");
                    $(".navTrigger.float-btn").removeClass("active");
                    $('ul.list.nav.nav__small.clearfix.vertical').hide()

                    $(".collapse.in").removeClass("in");
                    $("ul.list.nav.nav__small.clearfix.vertical.show").removeClass("show");



                });




                // $("body").on("click", ".caret", function () {
                //   $(".collapse.in").removeClass("in");

                // });


                /*
                       $("#changeCurrency").on("click", function (t) {
                           t.stopPropagation(),
                             $("#currencyList").slideToggle(),
                             $("#languageList").slideUp("slow"),
                             $("#accountList").slideUp("slow"),
                             $("#paymentList").slideUp("slow")
                         }),
                         $("#changeLanguage").on("click", function (t) {
                           t.stopPropagation(),
                             $("#languageList").slideToggle(),
                             $("#currencyList").slideUp("slow"),
                             $("#accountList").slideUp("slow"),
                             $("#paymentList").slideUp("slow")
                         }),
                         $("#changeAccount").on("click", function (t) {
                           t.stopPropagation(),
                             $("#accountList").slideToggle(),
                             $("#currencyList").slideUp("slow"),
                             $("#languageList").slideUp("slow"),
                             $("#paymentList").slideUp("slow")
                         }),
                         $("#changePayment").on("click", function (t) {
                           t.stopPropagation(),
                             $("#paymentList").slideToggle(),
                             $("#currencyList").slideUp("slow"),
                             $("#languageList").slideUp("slow"),
                             $("#accountList").slideUp("slow")
                         }),
                         $("body:not(#changeLanguage)").on("click", function () {
                           $("#languageList").slideUp("slow")
                         }),
                         $("body:not(#changeCurrency)").on("click", function () {
                           $("#currencyList").slideUp("slow")
                         }),
                         $("body:not(#changeAccount)").on("click", function () {
                           $("#accountList").slideUp("slow")
                         }),
                         $("#cart-icon").on("click", function (t) {
                           t.stopPropagation(),
                             $("#cart-floating-box").slideToggle()
                         }),
                         $("body:not(#cart-icon)").on("click", function () {
                           $("#cart-floating-box").slideUp("slow")
                         });
                       $(".js-medicine__open").click(function (e) {
                         $('.js-medicine__open').toggleClass("active");
                         $('.btn-dropdown__simple.btn-dropdown__pres').hide();
                         $('.btn-dropdown__simple.btn-dropdown__account').hide();
                         $('.nav__content').toggleClass("active");
                       });
                       */


            },

            /**
             * Get the categories for the catalog and set it to the widget.
             */
            setCategoryList_horizontal: function () {
                var widget = this;
                var params = {};
                var contextObj = {};
                contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_COLLECTIONS_GET_COLLECTION;
                var filterKey = widget.storeConfiguration.getFilterToUse(contextObj);
                if (filterKey) {
                    params[CCConstants.FILTER_KEY] = filterKey;
                }
                widget.load(
                    'categoryList',
                    [widget.rootCategoryId_horizontal(),
                    widget.catalogId_horizontal(), 1000
                    ],
                    params,
                    function (result) {

                        widget.categories_horizontal.valueWillMutate();
                        widget.categories_horizontal([]);
                        for (var i = 0; i < result.length; i++) {
                            widget.categories_horizontal.push($.extend({}, result[i]));
                        }
                        widget.categories_horizontal.valueHasMutated();

                    },
                    widget);

            },
            setCategoryList_vertical: function () {
                var widget = this;
                var params = {};
                var contextObj = {};

                contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_COLLECTIONS_GET_COLLECTION;
                var filterKey = widget.storeConfiguration.getFilterToUse(contextObj);
                if (filterKey) {
                    params[CCConstants.FILTER_KEY] = filterKey;
                }
                widget.load(
                    'categoryList',
                    [widget.rootCategoryId_vertical(),
                    widget.catalogId_vertical(), 1000
                    ],
                    params,
                    function (result) {
                        var segmento_c = "";
                        var regiao_c = "";

                        var dynamicProperties = widget.user().dynamicProperties();

                        $.each(dynamicProperties, function (index, value) {
                            if (value.id() === "segmento_c") {
                                segmento_c = value.value();

                            }
                            if (value.id() === "regiao_c") {
                                if (value.value() != null) {
                                    regiao_c = value.value().split("_")[1];
                                }
                            }
                        })


                        //SIMPLES
                        // widget.categories_vertical.valueWillMutate();
                        //         widget.categories_vertical([]);
                        //         for (var i = 0; i < result.length; i++) {
                        //             widget.categories_vertical.push($.extend({}, result[i]));
                        //         }

                        //         widget.categories_vertical.valueHasMutated();


                        //COM MUDANCA
                        widget.categories_vertical.valueWillMutate();
                        widget.categories_vertical([]);
                        for (var i = 0; i < result.length; i++) {
                            if (result[i].id == "COMBO_000") {
                                var childCategories = result[i].childCategories;
                                var newChildCategories = [];
                                for (var j = 0; j < childCategories.length; j++) {
                                    var spl = childCategories[j].id.split("_");

                                    if (

                                        spl[0] == "REGIAO" &&
                                        spl[1] == regiao_c &&
                                        spl[2] == segmento_c

                                    ) {
                                        newChildCategories.push(childCategories[j]);
                                    }
                                }
                                result[i].childCategories = newChildCategories;
                                if (newChildCategories.length > 0) {
                                    widget.categories_vertical.push($.extend({}, result[i]));
                                }
                            } else {
                                widget.categories_vertical.push($.extend({}, result[i]));
                            }



                        }

                        // widget.categories_vertical.valueHasMutated();


                        //COM AUDIENCIA
                        // var params = {
                        //     filter: "bazar,distribuidor,food,outros,perfumaria,supermercado,AudienciaTeste"
                        // };
                        // ccRestClient.request(
                        //     "/ccstore/v1/audienceMembership",
                        //     params,
                        //     function (resultAudience) {

                        //         widget.categories_vertical.valueWillMutate();
                        //         widget.categories_vertical([]);
                        //         for (var i = 0; i < result.length; i++) {
                        //             if (
                        //                 result[i].id.substring(0, 6) != "combo_" ||
                        //                 (
                        //                     result[i].id.substring(0, 6) == "combo_" &&
                        //                     resultAudience &&
                        //                     resultAudience.audienceMembership &&
                        //                     resultAudience.audienceMembership.indexOf(result[i].id.substring(6, result[i].id.length)) > -1
                        //                 )
                        //             ) {
                        //                 widget.categories_vertical.push($.extend({}, result[i]));
                        //             }
                        //         }

                        //         widget.categories_vertical.valueHasMutated();
                        //     },
                        //     function (errorData) {

                        //         widget.categories_vertical.valueWillMutate();
                        //         widget.categories_vertical([]);
                        //         for (var i = 0; i < result.length; i++) {
                        //             widget.categories_vertical.push($.extend({}, result[i]));
                        //         }

                        //         widget.categories_vertical.valueHasMutated();

                        //     }
                        // );

                    },
                    widget);

            },


            //SEARCH

            handleKeyPress: function (data, event) {
                // displays modal dialog if search is initiated with unsaved changes.
                if (data.user().isUserProfileEdited()) {
                    $("#CC-customerProfile-modal").modal('show');
                    data.user().isSearchInitiatedWithUnsavedChanges(true);
                    return false;
                }
                var keyCode;

                keyCode = (event.which ? event.which : event.keyCode);

                switch (keyCode) {
                    case CCConstants.KEY_CODE_ENTER:
                        // Enter key
                        this.handleSearch(data, event);
                        //document.activeElement.blur();
                        $("input#CC-headerWidget-Search-Mobile").blur();
                        return false;
                }
                return true;
            },

            // publishes a message to say create a search 
            handleSearch: function (data, event) {
                // Executing a full search, cancel any search typeahead requests
                $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_CANCEL).publish([{
                    message: "success"
                }]);

                var trimmedText = $.trim(this.searchText());
                if (trimmedText.length != 0) {

                    // Send the search results and the related variables for the Endeca query on the URI
                    navigation.goTo("/searchresults" + "?" +
                        CCConstants.SEARCH_TERM_KEY + "=" +
                        encodeURIComponent(this.searchText().trim()) + "&" +
                        CCConstants.SEARCH_RANDOM_KEY + "=" + Math.floor(Math.random() * 1000) + "&" +
                        CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&" +
                        CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY);
                    this.searchText('');
                }
            },

            // Initializes search typeahead and the placeholder text
            initializeSearch: function () {
                this.initTypeahead.bind(this)();
                this.addPlaceholder();
            },

            initTypeahead: function () {
                var typeAhead = searchTypeahead.getInstance(this.SEARCH_SELECTOR, this.site().selectedPriceListGroup().currency);
                notifications.emptyGrowlMessages();
            },

            addPlaceholder: function () {
                $('#CC-headerWidget-Search-Desktop').placeholder();
                $('#CC-headerWidget-Search-Mobile').placeholder();
            },

            /**
             * Invoked when the search text box is in focus.
             * Used to fix the bug with growl messages not clearing on clicking
             * the search box
             */
            searchSelected: function () {
                notifications.emptyGrowlMessages();
                $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{
                    message: "success"
                }]);
            },

            /**
             * Hide the search typeahead dropdown when the button is used for search
             */
            hideSearchDropdown: function (data, event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === CCConstants.KEY_CODE_ENTER) {
                    $('#typeaheadDropdown').hide();
                } else {
                    return true;
                }
            },

            /**
             * Invoked when Logout method is called
             */
            handleLogout: function (data) {
                // Clearing the auto-login success message
                notifier.clearSuccess(this.WIDGET_ID);
                // Clearing any other notifier
                notifier.clearError(this.WIDGET_ID);
                // data.updateLocalData(data.loggedinAtCheckout(), false);
                $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{
                    message: "success"
                }]);
            },

            //MiniCart

            /**
             * key press event handle
             * 
             * data - knockout data 
             * event - event data
             */
            keypressHandler: function (data, event) {

                var self, $this, keyCode;

                self = this;
                $this = $(event.target);
                keyCode = event.which ? event.which : event.keyCode;

                if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
                    keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
                }
                switch (keyCode) {
                    case CCConstants.KEY_CODE_TAB:
                        if (!($this[0].id === "CC-header-cart-total")) {
                            this.handleCartClosedAnnouncement();
                            $('#dropdowncart').removeClass('active');
                        }
                        break;

                    case CCConstants.KEY_CODE_SHIFT_TAB:
                        if ($this[0].id === "CC-header-cart-total") {
                            this.handleCartClosedAnnouncement();
                            $('#dropdowncart').removeClass('active');
                        }
                }
                return true;
            },

            showDropDownCart: function () {

                // Clear any previous timeout flag if it exists
                if (this.cartOpenTimeout) {
                    clearTimeout(this.cartOpenTimeout);
                }

                // Tell the template its OK to display the cart.
                this.cartVisible(true);

                $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));
                $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));

                notifications.emptyGrowlMessages();
                // this.computeDropdowncartHeight();
                this.currentSection(1);
                this.computeMiniCartItems();
                $('#dropdowncart').addClass('active');
                $('#dropdowncart > .content').fadeIn('slow');

                var self = this;
                $(document).on('mouseleave', '#dropdowncart', function () {
                    self.handleCartClosedAnnouncement();
                    $('#dropdowncart > .content').fadeOut('slow');
                    $(this).removeClass('active');
                });

                // to handle the mouseout/mouseleave events for ipad for mini-cart
                var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
                if (isiPad) {
                    $(document).on('touchend', function (event) {
                        if (!($(event.target).closest('#dropdowncart').length)) {
                            self.handleCartClosedAnnouncement();
                            $('#dropdowncart > .content').fadeOut('slow');
                            $('#dropdowncart').removeClass('active');
                        }
                    });
                }
            },

            hideDropDownCart: function () {
                // Tell the template the cart should no longer be visible.
                this.cartVisible(false);

                $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
                $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
                setTimeout(function () {
                    $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
                    $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
                }, 1000);

                $('#dropdowncart > .content').fadeOut('slow');
                $('#dropdowncart').removeClass('active');

                // Clear the timeout flag if it exists
                if (this.cartOpenTimeout) {
                    clearTimeout(this.cartOpenTimeout);
                }

                return true;
            },

            toggleDropDownCart: function () {

                if ($('#dropdowncart').hasClass('active')) {
                    this.hideDropDownCart();
                } else {
                    this.showDropDownCart();
                }
            },

            // Sends a message to the cart to remove this product
            handleRemoveFromCart: function () {
                $.Topic(pubsub.topicNames.CART_REMOVE).publishWith(
                    this.cartItem.productData(), [{
                        "message": "success",
                        "commerceItemId": this.cartItem.commerceItemId,
                        "shippingGroup": this.shippingGroupRelationship
                    }]);
            },

            // Sends a message to the cart to remove this placeholder
            handlePlaceHolderRemove: function () {
                $.Topic(pubsub.topicNames.PLACE_HOLDER_REMOVE).publish(this);
            },

            /**
             * validate the cart items stock status as per the quantity. base on the 
             * stock status of cart items redirect to checkout or cart
             */
            handleValidateCart: function (data, event) {
                // returns if the profile has unsaved changes.
                if (data.user().isUserProfileEdited()) {
                    return true;
                }
                data.cart().validatePrice = true;
                if (navigation.getRelativePath() == data.links().cart.route) {
                    data.cart().skipPriceChange(true);
                }
                $.Topic(pubsub.topicNames.LOAD_CHECKOUT).publishWith(data.cart(), [{
                    message: "success"
                }]);
            },

            handleDropDownCheckout: function (data, event) {
                this.hideDropDownCart();
                this.handleValidateCart(data, event);
            },

            /**
             * Invoked to skip the repetitive navigation for assistive technologies
             */
            skipToContentHandler: function () {
                var id, i, regionsRendered = this;
                for (i = 0; i < regionsRendered.length; i++) {
                    if (regionsRendered[i].type() === CCConstants.REGION_TYPE_BODY) {
                        break;
                    }
                }
                if (i == regionsRendered.length) {
                    id = $("#main .row .redBox div:first-child").attr("id");
                } else {
                    id = 'region-' + regionsRendered[i].name();
                }

                var idGen = "#" + id + " :focusable";
                if (idGen) {
                    $(idGen).first().focus();
                }
            },

            /**
             * Process the Nr parameter by removing product.priceListPair or product.language
             */
            processNrParameter: function (data, source) {
                if (data.indexOf('(') === -1) {
                    return data;
                }
                var rightToken = data.split('(')[1];
                var parseString = rightToken.split(')')[0];
                var tokenizedKeys = parseString.split(',');
                var finalString = '';
                for (var i = 0; i < tokenizedKeys.length; i++) {
                    if (tokenizedKeys[i].indexOf('product.priceListPair') !== -1 && source === 'currency-picker') {
                        continue;
                    } else if (tokenizedKeys[i].indexOf('product.language') !== -1 && source === 'language-picker') {
                        continue;
                    }
                    if (finalString === '') {
                        finalString = tokenizedKeys[i];
                    } else {
                        finalString = finalString + "," + tokenizedKeys[i];
                    }
                }
                finalString = data.split('(')[0] + '(' + finalString;
                finalString = finalString + ')' + data.split(')')[1];
                return finalString;
            },

            /**
             * Hand the aria announcement when the minicart is closed
             */
            handleCartClosedAnnouncement: function () {
                if ($('#dropdowncart').hasClass('active')) {
                    $('#alert-modal-change').text(CCi18n.t('ns.common:resources.miniCartClosedText'));
                    $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
                    $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
                }
            }
        }
    }
);