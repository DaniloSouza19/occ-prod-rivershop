define(['knockout', 'viewModels/productListingViewModelFactory', 'CCi18n',
  'ccConstants', 'pubsub', 'pageLayout/product', 'storageApi', 'ccStoreConfiguration', 'notifier', 'ccRestClient'],

  function (ko, ProductListingViewModelFactory, CCi18n, CCConstants, pubsub, Product, storageApi, CCStoreConfiguration, notifier, ccRestClient) {

    "use strict";
    var loadCount = 1;
    var previousSearch = false;
    var itemsPerPage = CCConstants.DEFAULT_ITEMS_PER_PAGE;
    var offset = 0;
    var currentListType = '';
    var pageData;
    var viewPortWidth;
    var imageSizeList = 300;
    var imageSizeGrid = 300;
    var imageSize2PerRow = 600;
    var imageSize3PerRow = 400;
    var imageSize4PerRow = 300;
    var lastCategoryId = "";
    var selectedProductsPerRowStorageKey = 'selectedProductsPerRow';
    var changedViaPagination = false;
    var productViewed = false;
    return {
      blockSize: ko.observable("60"),
      fields: ko.observable(""),
      gridWidth: ko.observable("15"),
      // listType: ko.observable("product"),
      productsPerPage: ko.observable("15"),
      shouldUseStyleBased: ko.observable(false),
      showListViewOption: ko.observable(false),
      showResultsPerPageOption: ko.observable(true),

      productsPerRowArray: ko.observableArray([ko.observable(false), ko.observable(false), ko.observable(false), ko.observable(false), ko.observable(false)]),
      selectedProductsPerRow: ko.observable(),
      displayRefineResults: ko.observable(false),
      showListViewButton: ko.observable(false),
      showResultsPerPageSection: ko.observable(false),
      largeDimensions: ko.observable("300,300"),
      mediumDimensions: ko.observable("300,300"),
      imageSizes: [imageSizeList, imageSizeGrid, imageSize2PerRow, imageSize3PerRow, imageSize4PerRow],  //image sizes for items per row (list, grid, 2,3,4)
      rowClass: ko.observable("items4"),
      WIDGET_ID: 'productListing',
      mobileSize: 300,
      beforeAppearLoaded: $.Deferred(),
      isMobile: ko.observable(true),

      productGrid: ko.observableArray([]),

      resultsPerPageOptionsNew: ko.observableArray([
        {
          displayText: 15,
          id: "rec-per-page-15",
          value: 15
        }, {
          displayText: 30,
          id: "rec-per-page-30",
          value: 30
        }, {
          displayText: 60,
          id: "rec-per-page-60",
          value: 60
        }
      ]),



      //Add and Remove quantity function

      moreQuantity: function (id) {
        if ($("#qtd_itens-" + id).val() == "") {
          $("#qtd_itens-" + id).val(0);
        }
        $("#qtd_itens-" + id).val(parseInt($("#qtd_itens-" + id).val()) + 1);
      },

      removeQuantity: function (id) {
        if ($("#qtd_itens-" + id).val() == "") {
          $("#qtd_itens-" + id).val(1);
        }
        if ($("#qtd_itens-" + id).val() > 1) {
          $("#qtd_itens-" + id).val(parseInt($("#qtd_itens-" + id).val()) - 1);
        }
      },

      // Sends a message to the cart to add this product
      handleAddToCart: function (product) {

        var qtd = parseInt($("#qtd_itens-" + product.id()).val(), 10);

        if (!qtd || qtd <= 0) {
          notifier.sendError(this.WIDGET_ID, "Quantidade inválida.");
          $("#qtd_itens-" + product.id()).focus();
          return false;
        }

        var newProduct = $.extend(true, {}, product.product);

        newProduct.orderQuantity = qtd;

        $.Topic(pubsub.topicNames.CART_ADD).publishWith(
          newProduct, [{ message: "success" }]);

      },

      onLoad: function (widget) {
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
              $("body").removeClass("leftBody");
              widget.isMobile(false);
            }
          }
        });

        var contextObj = {};
        widget.productListing = new Object();
        contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS;
        contextObj[CCConstants.IDENTIFIER_KEY] = "productListingData";
        var filterKey = CCStoreConfiguration.getInstance().getFilterToUse(contextObj);
        if (filterKey) {
          widget.productListing.filterKey = filterKey;
        }
        // disabling refine results button if there are no results for the selected category.
        $.Topic(pubsub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).subscribe(function (obj) {
          if (!this.navigation || this.navigation.length == 0) {
            widget.displayRefineResults(false);
          }
          else {
            widget.displayRefineResults(true);
          }
        });

        // disabling refine results button if search is unavailable.
        $.Topic(pubsub.topicNames.SEARCH_FAILED_TO_PERFORM).subscribe(function (obj) {
          widget.displayRefineResults(false);
        });

        var self = this;
        // TODO: This sortOptions property would make a nice
        // configuration option. Should be specified server-side in widget
        // configuration
        var sortOptions = [
          {
            "id": "default",
            "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByRelevanceText"),
            "order": ko.observable("none"),
            "maintainSortOrder": true,
            "serverOnly": true
          },
          {
          "id": "displayName",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByNameAscText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "displayName",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByNameDescText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        },  {
          "id": "listPrice",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByPriceAscText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "listPrice",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByPriceDescText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "brand",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByBrandAscText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "brand",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByBrandDescText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }/*,{
          "id": "stockStatus",
          "displayText": "Em estoque",
          "order": ko.observable("none"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "stockStatus",
          "displayText": "Sem estoque",
          "order": ko.observable("none"),
          "maintainSortOrder": true,
          "serverOnly": true
        }*/];

        //Onsale
        var searchSortOptions = [{
          "id": "product.displayName",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByRelevanceText"),
          "order": ko.observable("none"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.activePrice",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByPriceAscText"),
          "sortKey": "sku.activePrice",
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.activePrice",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByPriceDescText"),
          "sortKey": "sku.activePrice",
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "product.brand",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByBrandAscText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "product.brand",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByBrandDescText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.displayName",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByNameAscText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.displayName",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByNameDescText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.availabilityStatus",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByInStockText"),
          "order": ko.observable("asc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }, {
          "id": "sku.availabilityStatus",
          "displayText": CCi18n.t("ns.nsh_product_listing:resources.sortByOutStockText"),
          "order": ko.observable("desc"),
          "maintainSortOrder": true,
          "serverOnly": true
        }];

        // widget.listType(widget.listType);

        currentListType = widget.listType();

        widget.listingViewModel = ko.observable();
        widget.listingViewModel(
          ProductListingViewModelFactory.createListingViewModel(widget));
        if (widget.listType() === CCConstants.LIST_VIEW_PRODUCTS) {
          widget.listingViewModel().sortOptions(sortOptions);
        } else {
          widget.listingViewModel().sortOptions(searchSortOptions);
        }

        // Optimizing product grid rows formation
        widget.listingViewModel().productGridExtension = true;
        // Using generic sort, to avoid hard coding of sort keys
        widget.listingViewModel().useGenericSort = true;
        // Using client side Product view model caching
        widget.listingViewModel().isCacheEnabled = widget.isViewModelCacheEnabled ? widget.isViewModelCacheEnabled() : false;
        // Specifying number of categories to cache on client side
        widget.listingViewModel().viewModelCacheLimit = widget.viewModelCacheLimit ? widget.viewModelCacheLimit() : 3;

        if (widget.user().catalog) {
          widget.listingViewModel().catalog = widget.user().catalog.repositoryId;
        }

        widget.listingViewModel().category.subscribe(function (cat) {
          if (cat.repositoryId != widget.lastCategoryId) {
            //changed cat, reset products per page
            widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
            widget.listingViewModel().categoryOrSearchChanged = true;
          }
          widget.lastCategoryId = cat.repositoryId;
        });

        widget.sortingCallback = function (evt) {
          // var element = $('#CC-product-sortAction');

          // $(element).focus();
        };

        // set the initial items per page to the widget's config value for products per page
        widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
        widget.listingViewModel().recordsPerPage(+widget.productsPerPage());

        /**
         * Updates the refinement list for the selected category.
         */
        widget.updateRefinements = function () {
          var searchParams = {
            recordsPerPage: itemsPerPage,
            recordOffSet: offset,
            newSearch: false,
            navigationDescriptors: widget.dimensionId(),
            suppressResults: true,
            searchType: CCConstants.SEARCH_TYPE_SIMPLE
          };
          $.Topic(pubsub.topicNames.SEARCH_CREATE_CATEGORY_LISTING).publishWith(searchParams, [{ message: "success" }]);

          var categoryInfo = {
            categoryRoute: widget.category().route,
            categoryName: widget.category().displayName,
            repositoryId: widget.category().repositoryId,
            dimensionId: widget.dimensionId()
          };
          storageApi.getInstance().setItem("category", JSON.stringify(categoryInfo));
          $.Topic(pubsub.topicNames.CATEGORY_UPDATED).publish(categoryInfo);
        };

        /**
         * Scroll handler method used in phone and tablet modes.
         *
         * Method gets next set of products once bottom of product listing
         * element comes into view
         **/
        widget.scrollHandler = function (eventData) {

          var scrollTop = $(window).scrollTop();
          var viewportHeight = $(window).height();

          var productListElement = $('#product-grid').hasClass('active') ? '#product-grid' : '#product-list';

          var productListHeight = $(productListElement).height();

          if ((scrollTop + viewportHeight) >= ((productListHeight / 5) * 4)) {
            widget.listingViewModel().incrementPage();
          }
        };

        // Scroll handle for mobile view
        widget.scrollHandleOnViewPort = function () {
          // Clear previous scrolls
          $(window).off('scroll.page');
          // Add scroll if it is mobile view only
          if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW
            || widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW || (widget.isScrollEnabled && widget.isScrollEnabled())) {
            $(window).on('scroll.page', widget.scrollHandler);
            widget.listingViewModel().pageNumber = 1;
            // if current page is already 1, then we need to trigger the computation of current products
            widget.listingViewModel().isLoadOnScroll(true);
          } else {
            widget.listingViewModel().isLoadOnScroll(false);
          }
        };

        widget.changePageForSearch = function (otherData) {
          // Do not search if the type is undefined or any other type that search.
          $("html, body").animate({ scrollTop: 0 }, "slow");
          widget.productGrid([]);
          widget.listingViewModel().targetPage = 1;
          if (this.parameters.type != CCConstants.PARAMETERS_SEARCH_QUERY) {
            return;
          }
          if (this.parameters.page) {
            widget.listingViewModel().pageNumber = parseInt(this.parameters.page);
            widget.listingViewModel().targetPage = parseInt(this.parameters.page);
          } else {
            widget.listingViewModel().pageNumber = 1;
          }
          widget.listingViewModel().parameters = this.parameters;
          if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {

            if (widget.listingViewModel().recordsPerPage && widget.listingViewModel().recordsPerPage() != null && !widget.changedViaPagination) {
              // Setting the recordsPerPage from widget configuration
              if (isNaN(widget.productsPerPage())) {
                widget.listingViewModel().recordsPerPage(CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE);
              } else {
                widget.listingViewModel().recordsPerPage(parseInt(widget.productsPerPage()));
              }
            }

            // Add scroll for mobile view
            widget.scrollHandleOnViewPort();
            widget.listingViewModel().load(1);
          }
          // Add pagination type as type 2
          widget.listingViewModel().paginationType(2);
        };

        // Handle the page change event data to generate pages
        $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.getPageUrlData.bind(widget));
        // Handle the pagination calls
        $.Topic(pubsub.topicNames.PAGE_PAGINATION_CHANGE).subscribe(widget.changePage.bind(widget));
        // Handle search
        $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(function (otherData) {
          widget.beforeAppearLoaded.done(
            widget.changePageForSearch.bind(this));
        });

        /**
         * Formats the updated products
         */
        widget.formatProducts = function (products) {
          var formattedProducts = [];
          var productsLength = products.length;
          for (var i = 0; i < productsLength; i++) {
            if (products[i]) {
              formattedProducts.push(new Product(products[i]));
            }
          }
          return formattedProducts;
        };

        widget.resultsText = ko.computed(function () {
          return widget.listingViewModel().resultsText();
        }, widget.listingViewModel());

        widget.updateFocus = function () {
          $.Topic(pubsub.topicNames.UPDATE_LISTING_FOCUS).publish();
          return true;
        };

        widget.updateScrollPosition = function () {
          if (widget.listingViewModel().isCacheEnabled) {
            var cachedIndex = widget.listingViewModel().findCachedResultIndex();
            if (cachedIndex != undefined) {
              widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition = window.pageYOffset || 0;
            }
          }
        };

        widget.updateFocusAndDisableQV = function (data, evt) {
          //hide the QV to prevent the user clicking it while the main PDP is loading
          return widget.updateFocus();
        };

        //Create productGrid computed for the widget
        widget.productGridComputed = ko.computed(function () {
          var numElements, start, end, width;
          var rows = [];

          var products = widget.listingViewModel().currentProductsComputed();

          if (!products) {
            return;
          }

          numElements = products.length;

          width = parseInt(widget.listingViewModel().itemsPerRow(), 10);
          start = 0;
          end = start + width;

          while (end <= numElements) {
            rows.push(products.slice(start, end));
            start = end;
            end += width;
          }

          if (end > numElements && start < numElements) {
            rows.push(products.slice(start, numElements));
          }

          return rows;
        }, widget);

        // Below subscription updated productGrid observable array.
        widget.productGridComputed.subscribe(function (newValues) {
          if (newValues && newValues.length > 0) {


            // Stock Search
            if (widget.pageContext().pageType.name == "searchResults") {
              for (var i = 0; i < newValues.length; i++) {
                for (var j = 0; j < newValues[i].length; j++) {
                  newValues[i][j].disponible = true;
                  if (newValues[i][j].hasOwnProperty('sku.availabilityStatus') && newValues[i][j]['sku.availabilityStatus']()[0] == "OUTOFSTOCK") {
                    newValues[i][j].disponible = false;
                  }
                }
              }
              if (widget.listingViewModel().refreshValues == true) {
                widget.productGrid(newValues);
                widget.listingViewModel().refreshValues = false;
              }
              else {
                widget.productGrid.push.apply(widget.productGrid, newValues); //Push the new row into the grid.
              }
            }


            // Stock Collection
            if (widget.pageContext().pageType.name == "category") {


              var idsList = "";
              for (var i = 0; i < newValues.length; i++) {
                for (var j = 0; j < newValues[i].length; j++) {
                  idsList += newValues[i][j].id() + ",";
                }
              }
              idsList = idsList.substring(0, idsList.length - 1);

              var productIdContainer = { "products": idsList, "catalogId": "river_shop" };

              // Get Stock
              ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_AVAILABILITY, productIdContainer,
                function (data) {

                  for (var i = 0; i < newValues.length; i++) {
                    for (var j = 0; j < newValues[i].length; j++) {

                      for (var k = 0; k < data.length; k++) {

                        if (data[k].hasOwnProperty(newValues[i][j].id())) {
                          if ((data[k].productSkuInventoryStatus[newValues[i][j].id()] > 0)) {
                            newValues[i][j].disponible = true;

                          } else {
                            newValues[i][j].disponible = false;
                          }
                        }
                      }
                    }
                  }


                  if (widget.listingViewModel().refreshValues == true) {
                    widget.productGrid(newValues);
                    widget.listingViewModel().refreshValues = false;

                  }
                  else {
                    widget.productGrid([]);
                    widget.productGrid.push.apply(widget.productGrid, newValues); //Push the new row into the grid.
                  }

                })

            }

          }
        });

        widget.adjustScrollPosition = function () {
          if (widget.listingViewModel().isCacheEnabled &&
            widget.productGrid() && widget.productGrid().length > 1) {
            var cachedIndex = widget.listingViewModel().findCachedResultIndex();
            if (cachedIndex != undefined && widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition > 0) {
              // Stop if there is any scroll top animation.
              $("html, body").stop();
              $(window).scrollTop(widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition);
            }
          }
        };

        /**
         * Updated the grids when the category has been upated
         */
        widget.categoryUpdate = function (value) {

          if (!value) {
            return;
          }
          function checkAndGetCachedCategory(categoryToCheck) {
            var cachedCategory = undefined;
            if (widget.listingViewModel().isCacheEnabled && categoryToCheck.id) {
              if (widget.listingViewModel().cachedViewModels.length > 0) {
                cachedCategory = widget.listingViewModel().cachedViewModels.find(function (viewModel) {
                  return viewModel.categoryId === categoryToCheck.id && viewModel.products.length > 0;
                })
              }
            }
            return cachedCategory === undefined ? null : cachedCategory;
          }

          var category = widget.listingViewModel().category();
          if (widget.listType() !== CCConstants.LIST_VIEW_PRODUCTS) {

            widget.listType(CCConstants.LIST_VIEW_PRODUCTS);
            widget.listingViewModel(
              ProductListingViewModelFactory.createListingViewModel(widget));
          }


          if ((!category || (category.id != value.id)) || (previousSearch)) {

            widget.listingViewModel().resetSortOptions();
          }
          if ((!category || (category.id != value.id)) || (previousSearch) || (!widget.listingViewModel().paginationOnly)) {
            widget.listingViewModel().category(value);
            var cachedCategory = checkAndGetCachedCategory(value);
            if (cachedCategory !== null) {
              var cachedProductsCount = cachedCategory.products.length;
              var itemsPerPage = widget.listingViewModel().itemsPerPage;
              var currentPageIndex = parseInt(cachedProductsCount / itemsPerPage);
              widget.listingViewModel().getPage(currentPageIndex);
            }
            else {
              widget.listingViewModel().clearOnLoad = true;
              widget.productGrid([]); //On category update we will need to clear the product grid if it is completely a new category. Also removed a or condition here (!widget.listingViewModel().paginationOnly()). Is it useful anywhere?
              widget.listingViewModel().targetPage = 1;
              widget.listingViewModel().load(1);
              widget.listingViewModel().paginationType(1);
              previousSearch = false;
            }
          }
        };

        /**
         * Issue with bootstrap tab-contents in that sometimes it loses the
         * active tab, this ensures we have a tab chosen
         */
        widget.ensureActiveTab = function () {
          if (!($('#product-grid').hasClass('active') ||
            $('#product-list').hasClass('active'))) {
            $('#product-grid').addClass('active');
          }
        };

        /**
         *  Handle the widget response when the search result have been updated.
         */
        if (widget.listType() !== CCConstants.LIST_VIEW_PRODUCTS) {
          $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).subscribe(function (obj) {
            widget.category(null);
            previousSearch = true;
            if (widget.listType() !== CCConstants.LIST_VIEW_SEARCH) {
              widget.listType(CCConstants.LIST_VIEW_SEARCH);
              widget.listingViewModel(
                ProductListingViewModelFactory.createListingViewModel(widget));
            }
            widget.ensureActiveTab();
            if ((this.navigation && this.navigation.length > 0) || (this.breadcrumbs && this.breadcrumbs.refinementCrumbs.length > 0)) {
              widget.displayRefineResults(true);
            }
            else {
              widget.displayRefineResults(false);
            }
          });
        }

        $.Topic(pubsub.topicNames.SEARCH_CREATE).subscribe(function (obj) {
          if (!widget.listingViewModel().changedViaDropDown && !widget.changedViaPagination && !widget.productViewed) {
            widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
            widget.listingViewModel().categoryOrSearchChanged = true;
            widget.changedViaPagination = false;
          } else if (widget.productViewed) {
            widget.changedViaPagination = false;
            widget.listingViewModel().categoryOrSearchChanged = false;
            widget.productViewed = false;
          }
        });

        $.Topic(pubsub.topicNames.PAGE_VIEW_CHANGED).subscribe(function (obj) {
          widget.changedViaPagination = false;
          // this is only paginated if there is a page in the url
          if (obj && obj.path == 'searchresults' && obj.parameters != null && obj.parameters.indexOf('&page=') >= 0) {
            widget.changedViaPagination = true;
            widget.listingViewModel().categoryOrSearchChanged = false;
          }
        });

        $.Topic(pubsub.topicNames.PRODUCT_VIEWED).subscribe(function (obj) {
          widget.productViewed = document.location.pathname != '/searchresults' ? true : false;
        });

        viewPortWidth = $(window).width();

        // Check on viewport resize
        $(window).resize(function () {
          // Empty product grid whenever view port changes ex: landscape to portrait in iPad
          // widget.productGrid([]);
          //Adding window.innerWidth for it to work correctly with the actual screen width
          var windowWidth = (window.innerWidth || $(window).width());
          if (widget.isActiveOnPage(pageData) && windowWidth != viewPortWidth) {
            //widget.listingViewModel().refreshValues=true;
            var oldViewPort = widget.listingViewModel().viewportMode();
            widget.listingViewModel().checkResponsiveFeatures(windowWidth);
            if (oldViewPort != widget.listingViewModel().viewportMode()) {
              if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
                widget.productsPerRowChange(CCConstants.PHONE_VIEW);
                widget.listingViewModel().itemsPerRow(CCConstants.PHONE_VIEW);

                largeDimensions: ko.observable(widget.mobileSize + ',' + widget.mobileSize);
                mediumDimensions: ko.observable(widget.mobileSize + ',' + widget.mobileSize);
                widget.listingViewModel().listingImageSize(widget.mobileSize);

                widget.rowClass("items2 mobile");

              } else if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW) {
                //tablet view defaults to 4
                widget.productsPerRowChange(CCConstants.LARGE_DESKTOP_VIEW);
                widget.listingViewModel().itemsPerRow(CCConstants.LARGE_DESKTOP_VIEW);
              }
            }
            widget.scrollHandleOnViewPort();
            widget.listingViewModel().cleanPage();
            viewPortWidth = windowWidth;
          }
        });

        widget.handlePageChanged = function (pageData) {
          var widget = this;
          if (!(pageData.pageId == "category" || pageData.pageId == "searchresults")) {
            $(window).off('scroll.page', widget.scrollHandler);
          }
        };
        $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.handlePageChanged.bind(widget));

        // when the page loads get the selected products per row value from local storage
        widget.selectedProductsPerRow(widget.getSelectedProductsPerRow());
      },

      beforeAppear: function (page) {


        var widget = this;
        //Regsiter this subscription only if we are on medium, desktop and large screens
        // if ((widget.isScrollEnabled && !widget.isScrollEnabled()) || (widget.listingViewModel().viewportMode() != CCConstants.TABLET_VIEW && widget.listingViewModel().viewportMode() != CCConstants.PHONE_VIEW)) {
        //   // We will need to clear the grid once the page canges to hold the new set of data.
        //   widget.listingViewModel().currentPage.subscribe(function(newValue) {
        //     if(newValue) {
        //       widget.productGrid([]);
        //     }
        //   });
        // }
        currentListType = widget.listType();

        // Adding code to clear the values of previous search results
        if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {
          widget.displayRefineResults(false);
          widget.listingViewModel().titleText('');
          widget.listingViewModel().noSearchResultsText('');
          widget.listingViewModel().suggestedSearches({});
        }


        if (widget.category() && widget.listType() != CCConstants.LIST_VIEW_SEARCH) {
          widget.categoryUpdate(widget.category());
        }

        // Updating refinements in the GuidedNavigation widget only if search is available.
        if (widget.listType() === CCConstants.LIST_VIEW_PRODUCTS) {
          if (widget.displayRefineResults() && widget.listingViewModel().paginationOnly) {
            // do nothing cause we don't want to update the refinements.
          } else if (widget.dimensionId()) {
            widget.updateRefinements();
          } else {
            widget.displayRefineResults(false);
            $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_CLEAR).publish();
          }
        }

        if (widget.showListViewOption) {
          widget.showListViewButton(widget.showListViewOption());
        }

        if (widget.showResultsPerPageOption) {
          var scrollEnabled = widget.isScrollEnabled && widget.isScrollEnabled();
          widget.showResultsPerPageSection(widget.showResultsPerPageOption() && !scrollEnabled);
        }

        widget.listingViewModel().handleResponsiveViewports();

        widget.setDefaultItemsPerRow();
        widget.beforeAppearLoaded.resolve();
      },

      getPageUrlData: function (data) {
        var widget = this;
        // Set the data to the widget level variable
        pageData = data;
        // Only change these properties if we're on the correct page.
        if (data.pageId == CCConstants.CATEGORY_CONTEXT || data.pageId == CCConstants.SEARCH_RESULTS) {
          widget.listingViewModel().pageId(data.pageId);
          widget.listingViewModel().contextId(data.contextId);
          widget.listingViewModel().seoslug(data.seoslug);
        }
      },

      changePage: function (data) {
        var widget = this;
        $("html, body").animate({ scrollTop: 0 }, "slow");
        // Handle the page number change
        if (data.page) {
          widget.listingViewModel().pageNumber = parseInt(data.page);
        } else {
          widget.listingViewModel().pageNumber = 1;
          widget.listingViewModel().initializeIndex();
        }
        // Add scroll for mobile view
        if (widget.listType() == CCConstants.LIST_VIEW_PRODUCTS) {
          widget.scrollHandleOnViewPort();
        }
        if ((widget.listType() == CCConstants.LIST_VIEW_PRODUCTS) && data.paginationOnly) {
          widget.listingViewModel().getPage(widget.listingViewModel().pageNumber);
        }
        widget.listingViewModel().paginationOnly = data.paginationOnly;
        if (!widget.listingViewModel().isLoadOnScroll()) {
          widget.productGrid([]);
        }
      },

      handleSortingHelper: function (sorting, cb) {
        var widget = this;
        widget.productGrid([]);
        widget.listingViewModel().handleSorting(sorting, cb);
      },

      /**
       * Handles click on refine results
       */
      handleRefineResults: function (data, event) {

        if (!($('#CC-overlayedGuidedNavigation-column').hasClass('open')) && !($('#CC-overlayedGuidedNavigation').hasClass('CC-overlayedGuidedNavigation-mobileView'))) {
          $('#CC-overlayedGuidedNavigation').addClass('CC-overlayedGuidedNavigation-mobileView');
          // Add a pubsub to open guided navigation
          $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_SHOW).publish();
        }
        if (($(window)[0].innerWidth || $(window).width()) < CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
          // Remove the scroll handling when the refinements is open in the mobile view.
          // This saves extra calls when refinements are loaded.
          $(window).off('scroll.page');
          $('html, body').css('overflow-y', 'hidden');
        }
        $('#CC-overlayedGuidedNavigation-done').focus();
        return false;
      },
      priceUnavailableText: function () {
        return CCi18n.t('ns.nsh_product_listing:resources.priceUnavailable');
      },
      /**
       * Set the numbers of items to display per row
       * @param items       number of items per row
       * @param imagesize   size of image (N.B. the image will be square so just one number ???)
       */
      setItemsPerRow: function (items, imageSize) {
        var widget = this;
        items = 48;
        widget.listingViewModel().itemsPerRow(items);
        widget.productGrid([]);
        widget.listingViewModel().listingImageSize(null);
        widget.listingViewModel().itemsPerRowInTabletView(items);
        widget.listingViewModel().itemsPerRowInDesktopView(items);
        widget.listingViewModel().itemsPerRowInLargeDesktopView(items);
        widget.listingViewModel().listingImageSize(imageSize);
        widget.largeDimensions(imageSize + ',' + imageSize);
        widget.mediumDimensions(imageSize + ',' + imageSize);
      },
      /**
       *  Handles change of number of items per row
       *  Updates the values in the array
       *  @param  items   number of items to display per row
       */
      productsPerRowChange: function (itemsPerRow) {
        var widget = this, mobileCss = "";

        if (itemsPerRow != widget.getSelectedProductsPerRow()) {

          if (widget.isScrollEnabled && widget.isScrollEnabled()) {
            widget.listingViewModel().currentPage(1);
            widget.listingViewModel().currentPage.notifySubscribers();
          }

          widget.listingViewModel().scrolledViewModels = [];

          if (itemsPerRow == 0) {
            widget.setItemsPerRow(1, widget.imageSizes[1]);
          } else {

            if (itemsPerRow == -1) {
              //grid button clicked in mobile/tablet view. 2 per row for mobile, 4 for tablet
              if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
                itemsPerRow = 2;
                mobileCss = " mobile";
              } else {
                itemsPerRow = 4;
              }

              if (!widget.isScrollEnabled || (widget.isScrollEnabled && !widget.isScrollEnabled())) {
                widget.listingViewModel().currentPage(1);
                widget.listingViewModel().currentPage.notifySubscribers();
              }
            }

            widget.setItemsPerRow(itemsPerRow, widget.imageSizes[itemsPerRow]);
          }

          widget.rowClass("items" + itemsPerRow + mobileCss);

          $.each(widget.productsPerRowArray(), function (i, val) {
            widget.setProductsPerRowArrayElement(i, itemsPerRow == i);
          });

          storageApi.getInstance().setItem(selectedProductsPerRowStorageKey, itemsPerRow);
          widget.selectedProductsPerRow(itemsPerRow);
        }
      },
      /**
       * Get the value saved in local storage
       * If nothing has been stored yet then return 4 rows
       */
      getSelectedProductsPerRow: function () {
        var widget = this,
          selectedProductsPerRow = storageApi.getInstance().getItem(selectedProductsPerRowStorageKey);

        if (selectedProductsPerRow == null) {
          if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
            // default to the grid button
            selectedProductsPerRow = CCConstants.PHONE_VIEW;
          } else if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW) {
            selectedProductsPerRow = CCConstants.LARGE_DESKTOP_VIEW;
          }
          else {
            // default to 4
            selectedProductsPerRow = CCConstants.LARGE_DESKTOP_VIEW;
          }
        }

        return selectedProductsPerRow;
      },
      /**
       * Set the default products per row
       */
      setDefaultItemsPerRow: function () {
        var widget = this,
          selectedProductsPerRow = widget.getSelectedProductsPerRow(),
          itemsPerRowToSet = selectedProductsPerRow;

        if (selectedProductsPerRow == 0) {
          if (!widget.showListViewOption()) {
            storageApi.getInstance().removeItem(selectedProductsPerRowStorageKey);
            selectedProductsPerRow = widget.getSelectedProductsPerRow();
            itemsPerRowToSet = selectedProductsPerRow;
          } else {
            itemsPerRowToSet = 1;
          }
        }

        widget.selectedProductsPerRow(selectedProductsPerRow);
        storageApi.getInstance().setItem(selectedProductsPerRowStorageKey, selectedProductsPerRow);
        widget.setItemsPerRow(itemsPerRowToSet, widget.imageSizes[selectedProductsPerRow]);

        if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
          widget.rowClass("items2 mobile");
        } else {
          widget.rowClass("items" + selectedProductsPerRow);
        }

        $.each(widget.productsPerRowArray(), function (i, val) {
          widget.setProductsPerRowArrayElement(i, selectedProductsPerRow == i);
        });
      },
      /**
       * Update the observable in the array
       * @param index - the index of the item to update
       * @param value - the value of the item
       */
      setProductsPerRowArrayElement: function (index, value) {
        var widget = this;
        widget.productsPerRowArray()[index](value);
      },
      /**
       * Get the class to be used in the ko css binding for
       * the products per row at the given index
       * @param index - the index of the item to update
       */
      getProductsPerRowClass: function (index) {
        return (this.productsPerRowArray()[index]() == true) ? 'active' : '';
      },
      /**
       * Get the class to be used in the ko css binding for
       * the grid or list
       * @param isGrid - whether it's the grid or list
       */
      getGridCss: function (isGrid) {
        var widget = this,
          selectedProductsPerRow = widget.getSelectedProductsPerRow();

        if (isGrid) {
          return selectedProductsPerRow != 0 ? 'active' : '';
        } else {
          return selectedProductsPerRow == 0 ? 'active' : '';
        }
      },
      /**
       *Handle results per page change
       */
      handleResultsPerPageHelper: function (resultsPerPage, callback) {
        var widget = this;
        if (widget.listingViewModel().itemsPerPage != resultsPerPage.value) {
          widget.productGrid([]);
          widget.listingViewModel().handleResultsPerPage(resultsPerPage, callback);

        }
      },
      getProductsPerRowHasFocus: function (index) {
        var widget = this,
          selectedProductsPerRow = widget.getSelectedProductsPerRow();
        return selectedProductsPerRow == index;
      },
      /**
       *Handle results per page change
       */
      resultsPerPageCallback: function (evt) { }
    };
  });
