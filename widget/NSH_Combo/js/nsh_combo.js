define(

  ['knockout', 'CCi18n', 'ccConstants', 'ccRestClient'],

  function (ko, CCi18n, CCConstants, ccRestClient) {

    "use strict";

    return {
      categories: ko.observableArray(),
      rootCategoryId_vertical: ko.observable("river_shop"),
      catalogId_vertical: ko.observable("river_shop"),
      userCombo: ko.observable(),
      route: ko.observableArray([]),
      ids: ko.observable(""),
      arrCombos: ko.observableArray([]),
      images: ko.observable(),

      // resourcesLoaded: function (widget) {
      // },

      onLoad: function (widget) {
        //  widget.setCategoryList_vertical();

        var params = {
          catalogId: "river_shop",
          maxLevel: 3,
          //categoryIds: "COMBO_000,",
          expand: "childCategories",
          fields: "childCategories",

          //  showQuantity: true
        };

        ccRestClient.request(
          CCConstants.ENDPOINT_COLLECTIONS_GET_COLLECTION,
          params,
          function (results) {
            /*   results.items.forEach(function (prd) {
                 prd.itemQuantity = ko.observable(1);
               });
               widget.arrProducts(results.items);*/

            //COM MUDANCA

            var combo = results.childCategories;
            widget.categories.valueWillMutate();
            widget.categories([]);
            for (var i = 0; i < combo.length; i++) {
              var links = [];
              if (combo[i].id == "COMBO_000") {
                var childCategories = combo[i].childCategories;
                var dynProp = widget.user().dynamicProperties();

                var region;
                var segment;
                
                var comboProduct;

                $.each(dynProp, function (index, data) {
                  if (data.id() == "regiao_c") {
                    region = data.value().split("_");
                  }
                  if (data.id() == "segmento_c") {
                    segment = data.value();
                  }
                })
                widget.userCombo(region[0] + " " + region[1] + " " + segment);

                var id = '';
                $.each(childCategories, function (index, value) {
                  if (value.longDescription != null) {

                    if (value.longDescription.toUpperCase() == widget.userCombo()) {
                      $.each(value.childCategories, function (index2, data) {
                        widget.arrCombos().push({
                          text: data.displayName,
                          link: data.route,
                          src : null
                        });
                        id += data.id + ",";
                        widget.ids(id);
                      })
                      //widget.getCategoty(teste);
                   /*   var arr = []
                      if (comboProduct.route) {
                        console.log(comboProduct.route)
                        arr.push({
                          link: comboProduct.route
                        });
                      }*/
                     
                    }
                  }
                });
           
              }
            }
            widget.getCategoryImages(widget);
        
          },
          function (errorData) {
            // console.log("ERROR: ", errorData);
          },
          "river_shop")

      },

      getCategoryImages: function (widget) {
        var widget = this;
        var params = {
          catalogId: "river_shop",
          maxLevel: 3,
          categoryIds: widget.ids(),
          expand: "childCategories",
          fields: "categoryImages,categoryImages.url, id, displayName,childCategories(items)",
        };
        //  showQuantity: true
        ccRestClient.request(
          CCConstants.ENDPOINT_LIST_COLLECTIONS,
          params,
          function (result) {
            var arr = []
            for (var i = 0; i < result.length; i++) {
              if (result[i].categoryImages[1]) {
                widget.arrCombos()[i].src = result[i].categoryImages[1].url;
              }
                arr.push(widget.arrCombos()[i]);
              }
              widget.arrCombos(arr);
            
          },
          function (errorData) {
            // console.log("ERROR: ", error);
          })

      },

      beforeAppear: function (page) {
      },
    }
  }
);
