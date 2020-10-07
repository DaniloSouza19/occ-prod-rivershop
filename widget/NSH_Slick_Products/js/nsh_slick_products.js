define(

  ['knockout', "ccConstants", "ccRestClient", 'CCi18n', '/file/thirdparty/slick-slider.js', 'pubsub', 'notifier', 'pageLayout/product'],

  function (ko, CCConstants, ccRestClient, CCi18n, slick, pubsub, notifier, Product) {

    "use strict";

    return {

      products: ko.observableArray(),
      recommendations: ko.observableArray([]),
      recommendationsloaded: ko.observable(false),

      arrProducts: ko.observableArray([]),
      isAddToCartClicked: ko.observable(false),
      isReady: ko.observable(true),
      tryAddSlick: ko.observable(0),

      onLoad: function (widget) {

        widget.arrProducts.subscribe(function (newValues) {
          if (newValues && newValues.length > 0) {
            for (var i = 0; i < newValues.length; i++) {
              if (!newValues[i].hasOwnProperty('disponible')) {
                newValues[i].disponible = true;
              }
            }
          }
        })

        var productIds = [];
        var collections = [];
        if (widget.hasOwnProperty('_enableProductsById') && widget["_enableProductsById"]()) {
          productIds = widget['_productIds']().split(",");
        }
        if (widget.hasOwnProperty('_enableProductsByCollection') && widget["_enableProductsByCollection"]()) {
          collections = widget['_collections']().split(",");
        }
        if (widget.hasOwnProperty('_enableProductsRelated') && widget["_enableProductsRelated"]()) {
          if (widget.product().relatedProducts && widget.product().relatedProducts.length > 0) {
            widget.product().relatedProducts.forEach(function (prd) {
              prd.itemQuantity = ko.observable(1);
            });
            // widget.arrProducts(widget.product().relatedProducts);
            widget.validateStockListProducts(widget.product().relatedProducts)
          }
        }
        if (widget.hasOwnProperty('_enableProductsRecommendation') && widget["_enableProductsRecommendation"]()) {
          widget.recProdFunction();
        }

        if (productIds.length > 0 || collections.length > 0) {
          widget.getProducts(productIds, collections);
        }
      },
      addClassInParent: function (element, parent, value) {
        $("#" + element).parents().eq(parent).addClass(value);
      },

      getProducts: function (productIds, collections) {
        var widget = this;

        var fields =
          "id, displayName, route, primaryFullImageURL, primaryImageTitle, primaryImageAltText, listPrice";

        var paramQ = "";
        productIds.forEach(function (id) {
          if (paramQ != "") paramQ += " or ";
          paramQ += 'id eq "' + id + '"';
        })
        collections.forEach(function (id) {
          if (paramQ != "") paramQ += " or ";
          paramQ += 'parentCategories eq "' + id + '"';
        })

        var dynamicProperties = widget.user().dynamicProperties();
        var listaPrecoPadrao_c = "Regiao_01";
        $.each(dynamicProperties, function (index, value) {
          if (value.id() === "listaPrecoPadrao_c") {
            listaPrecoPadrao_c = value.value();
          }
        })

        var params = {
          q: paramQ,
          showQuantity: true,
          storePriceListGroupId: listaPrecoPadrao_c,
          limit: 12
        };

        ccRestClient.request(
          CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS,
          params,
          function (result) {
            if (result && result.items && result.items.length > 0) {

              // widget.arrProducts(result.items);
              widget.validateStockListProducts(result.items);

            }
          },
          function (errorData) {
          }

        );
      },

      validateStockListProducts: function (listProducts) {
        var widget = this;
        var idsList = "";
        for (var i = 0; i < listProducts.length; i++) {
          listProducts[i].itemQuantity = ko.observable(1);
          idsList += listProducts[i].id + ",";
        }
        idsList = idsList.substring(0, idsList.length - 1);

        var productIdContainer = { "products": idsList, "catalogId": "river_shop" };

        // Get Stock
        ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_AVAILABILITY, productIdContainer,
          function (data) {

            for (var i = 0; i < listProducts.length; i++) {
              for (var j = 0; j < data.length; j++) {

                if (data[j].hasOwnProperty(listProducts[i].id)) {
                  if ((data[j].productSkuInventoryStatus[listProducts[i].id] > 0)) {
                    listProducts[i].disponible = true;

                  } else {
                    listProducts[i].disponible = false;
                  }
                }
              }
            }

            widget.arrProducts(listProducts);

          })

      },

      addSlick: function () {
        var widget = this;

        widget.isReady(true);
        if (!$("#" + widget.id()).hasClass("slick-initialized")) {
          $("#" + widget.id()).slick({
            slidesToShow: widget._slickProductsDesktop(),
            slidesToScroll: 4,
            dots: false,
            infinite: true,
            cssEase: 'linear',
            prevArrow: "<button type='button' class='slick-prev pull-left'></button>",
            nextArrow: "<button type='button' class='slick-next pull-right'></button>",
            responsive: [
              {
                breakpoint: 1400,
                settings: {

                  slidesToShow: widget._slickProductsDesktop_1400(),
                  slidesToScroll: 4,


                }
              },
              {
                breakpoint: 1200,
                settings: {

                  slidesToShow: widget._slickProductsDesktop_1200(),
                  slidesToScroll: 4,


                }
              },


              {
                breakpoint: 983,
                settings: {

                  slidesToShow: widget._slickProductsTablet_983(),
                  slidesToScroll: 2,

                }
              },
              {
                breakpoint: 800,
                settings: {



                  slidesToShow: widget._slickProductsTablet_800(),
                  slidesToScroll: 1,

                }
              },
              {
                breakpoint: 600,
                settings: {



                  slidesToShow: widget._slickProductsMobile_600(),
                  slidesToScroll: 1,
                  centerMode: false,
                }
              }
            ]

          });

          if ($(".slick_products_home .slick-track").width() == 0) {
            if (widget.tryAddSlick() < 5) {
              var tryAddCount = widget.tryAddSlick();
              tryAddCount++;
              widget.tryAddSlick(tryAddCount);
              setTimeout(function () {
                widget.isReady(false);
                widget.addSlick();
              }, 2000);
            }
          }
        }
      },


      recProdFunction: function () {
        var widget = this;
        widget.recommendations = ko.observableArray();

        var curPageId;
        $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(function (page) {
          curPageId = page.pageId;
        });

        // publishing with it the slotId (widget's Id), numRecs
        $.Topic(pubsub.topicNames.RECS_WHO_WANT_RECS).subscribe(function (obj) {
          // pages() return an array of pageIds that this widget is to appear on
          // pageIds are like 'home', 'product' and etc.
          var pagesToAppearOn = widget.pages();

          var pageIdInObj = obj.pageId;
          if (pagesToAppearOn.indexOf(pageIdInObj) > -1) {
            var eventObj = {};
            eventObj.id = widget.id();
            eventObj.numRecs = widget.numRecs();
            eventObj.restriction = widget.restriction ? widget.restriction() : 'Blended';
            eventObj.strategy = widget.strategy ? widget.strategy() : 'Unrestricted';
            eventObj.pageId = curPageId;
            // Don't include collections configuration if it is unset or empty
            // and trim entries.
            eventObj.collections = widget.collections && widget.collections() ? widget.collections().split(',').map(function (e) {
              return e.trim();
            }) : [];
            $.Topic(pubsub.topicNames.RECS_WANT_RECS).publish(eventObj);
          }
        });
        // End publishing RECS_WANT_RECS topic

        /**
         * Get the data useful for recommendations from the CartViewModel.
         * This returns both the simple list of productIds as well as objects with quantity and price data.
         * In this way it is useful for both the cart and checkout information.
         *
         * @param model a CartViewModel instance
         * @return a 2 index array where index 0 is the array of productIds and index 1 is the array of line item info
         */
        var getProductDataFromCartViewModel = function (model) {
          var items = model.items(),
            item,
            length = items.length,
            productIds = [],
            lineItemInfo = [];

          while (length--) {
            // get a reference so we don't have to use the index
            item = items[length];

            // push onto the array of productIds
            productIds.push(item.productId);
            // push onto the array of line item product info
            lineItemInfo.push({
              productId: item.productId,
              quantity: item.quantity(),
              price: item.itemTotal()
            });
          }

          // return both lists
          return [productIds, lineItemInfo];
        },

          populateCCProducts = function (recsObservableArray, uvRecsArray, recSetId, recsProducts) {
            var listProducts = function (productIds) {
              // Exit early if there's no need to call CC.
              if (productIds.length == 0)
                return Promise.resolve([]);

              var data = {
                storePriceListGroupId: widget.site().selectedPriceListGroup().id,
                productIds: productIds
              };

              return new Promise(function (resolve, reject) {
                ccRestClient.request(
                  CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS,
                  data,
                  resolve,
                  function (response) {
                    reject({ "response": response, "requestedProductIds": productIds });
                  }
                );
              });
            }; // end of listProducts function.

            // TODO: Change promise["catch"](fn) to promise.catch(fn) when CC no longer uses
            //       Rhino to examine the JavaScript at startup.

            listProducts(recsProducts.map(function (p) { return p.repositoryid; }))["catch"](
              function (err) {
                if (err.response && err.response.status && (err.response.status.charAt(0) == "4") && err.response.errors) {
                  var badIds = err.response.errors
                    .filter(function (e) { return e.errorCode === "20031"; })
                    .map(function (e) { return e.moreInfo; });
                  var goodIds = err.requestedProductIds.filter(function (p) { return badIds.indexOf(p) < 0; })
                  if (goodIds.length < err.requestedProductIds.length)
                    return listProducts(goodIds);
                }
                return Promise.reject();  // Something isn't right.  Give up.
              })
              .then(function (response) {

                response.forEach(function (prd) {
                  prd.itemQuantity = ko.observable(1);
                });
                widget.arrProducts([]);
                // widget.arrProducts(response)
                widget.validateStockListProducts(response);
                response.forEach(function (product) {
                  // use the storefront listing product which has a bunch of APIs for pricing
                  // adding a recSetId for sending clickthru request
                  recsObservableArray.push({
                    id: product.id,
                    recSetId: recSetId,
                    ccProduct: new Product(product)
                  });

                  // universal variable product
                  // @see http://tools.qubitproducts.com/uv/developers/specification/#toc_9
                  var uvProduct = {
                    id: product.repositoryId,
                    url: product.route,
                    name: product.displayName,
                    description: product.description,
                    manufacturer: product.brand,
                    // TODO, the following property, category, is not in CC product, and is null in recs product
                    category: null,
                    //subcategory:
                    //linked_products:
                    // @see http://en.wikipedia.org/wiki/ISO_4217#Active_codes
                    unit_sale_price: product.listPrice,
                    //unit_price:
                    //reviews:
                  };


                  // this sets up the objects the universal variable is expecting
                  uvRecsArray.push(uvProduct);
                });

                widget.recommendationsloaded(true);
                $.Topic(pubsub.topicNames.RECS_RECOMMENDATIONS_CHANGED).publish(uvRecsArray);
              })["catch"](
                function (err) {
                  // Do nothing, we've encounted an unrecoverable issue.
                });
          }, // end of populateCCProducts
          /**
           * Updates the knockout model for recommendations on the page with
           * data returned from the Recs servers.
           *
           * @param slots The slots json hash returned by the server
           */
          processRecommendations = function (slotData) {
            var i, products, recSetId, product,
              // recs for updating the universal variable
              uvRecs = [];

            widget.recommendations.removeAll();

            // of course this only works with one recslot on the page
            products = slotData.recs;
            recSetId = slotData.recSetId;

            populateCCProducts(widget.recommendations, uvRecs, recSetId, products);
          };

        // subscribe to RECS_HAVE_RECS topic, if get any data, process it
        $.Topic(pubsub.topicNames.RECS_HAVE_RECS).subscribe(function (eventData) {
          //logger.debug(JSON.stringify(eventData.data));
          //logger.debug(JSON.stringify(eventData.visitorId));
          //logger.debug(JSON.stringify(eventData.sessionId));
          widget.recsVisitorId = eventData.visitorId;
          widget.recsSessionId = eventData.sessionId;

          // only interested in the event that is for the same slot, which is identified by widget.id()
          var slotIds = Object.keys(eventData.data);
          if (slotIds.indexOf(widget.id()) > -1) {
            processRecommendations(eventData.data[widget.id()]);
          }
        });

      }
    }
  }

);
