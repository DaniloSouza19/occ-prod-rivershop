/**
 * @fileoverview Source file for Breadcrumb widget.
 * 
 */
define(

  // -------------------------------------------------------------------
  // DEPENDENCIES
  // -------------------------------------------------------------------
  [ 'jquery', 'ccConstants', 'knockout', 'ccLogger', 'pubsub', 'CCi18n' ],
  
  // -------------------------------------------------------------------
  // Module definition
  // -------------------------------------------------------------------
  function($, CCConstants, ko, CCLogger, pubsub, CCi18n) {
  
    'use strict';
  
    return {
      breadcrumb : ko.observableArray([]),
      isCategory : ko.observable(),
      currentPageLoaded : $.Deferred(),
      /*
       * Retrieve all categories
       */
      getAllCats : function() {
        var widget = this;
  
        if(widget.user()!= undefined && widget.user().catalogId) {
          widget.catalogId(widget.user().catalogId());
        }
  
        widget.load('categoryList', [ widget.rootCategoryId(), widget.catalogId(), CCConstants.CATALOG_MAX_LEVEL ], function(result) {
          widget.allCategories = result;
          widget.setParentCats(result);
  
          if (widget.currentPage) {
            widget.doBreadcrumb(widget.currentPage);
          }
        }, widget);
      },
      onLoad : function(widget) {
          widget.categoryMap = {};
          widget.getAllCats();
          $(window).on("resize", $.proxy(widget.checkResponsive, widget));
          
          $.Topic(pubsub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).subscribe(function(){
            widget.isCategory(true);
          });
  
          $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).subscribe(function(){
            widget.currentPageLoaded.done(function(){
              if(widget.getParam(widget.currentPage.parameters, 'Ntt') !== null) {
                widget.isCategory(false);
              }
              widget.doBreadcrumb(widget.currentPage);
            });
          });
  
        },
      beforeAppear : function(page) {
        var widget = this;
      
        //reset the widget on catalog change for b2b scenario
        if(ko.isObservable(widget.user) && widget.user() &&
            ko.isObservable(widget.user().catalogId) && widget.user().catalogId()) {
           if(widget.user().catalogId() != widget.catalogId()) {
            widget.currentPage = null;
            widget.allCategories = null;
            widget.categoryMap = {};
            widget.breadcrumb([]);
            widget.catalogId(widget.user().catalogId());
            widget.getAllCats();
           }
        }
  
        if (widget.allCategories) {
          widget.doBreadcrumb(page);
        }
        widget.currentPage = page;
        widget.currentPageLoaded.resolve();
      },
      /*
       * Draw the breadcrumb trail
       * @param page  the current page
       */
      doBreadcrumb : function(page) {
        var crumb = [], widget = this, url, searchTerm, categories = [];
  
        // Add 'Home' breadcrumb
        crumb.push({
          label : CCi18n.t('ns.nsh_breadcrumb:resources.homeLinkText'),
          url : '/home'
        });
  
        var cats = [];
  
        if (!widget.isSearchResultsPage(page) && !widget.isNoSearchResultsPage(page)) {
          
          //if there is a widget category defined in the category model, then check the current product's parentCategories against it. If nothing is found,
          //then this should be a link from an external page or non-category page, e.g. related products widget, so get the category from the product        
          if (widget.isProductPage(page) && (!widget.category() || !widget.checkProductCategory(widget.product(), widget.category().id))) {
            cats = widget.getProductCategories(widget.product());
          } else {
            cats = widget.getCategories(widget.isCategoryPage(page));
          }
          $.each(cats, function(i, cat) {
            crumb.push(cat);
          });
          
          if (widget.isCategoryPage(page)){
            widget.lastCategoryBreadcrumb = crumb;
            widget.searchTerm = null;
          }
        } else {
          if (widget.isSearchResultsPage(page)) {
            // set search term
            widget.searchTerm = widget.getParam(page.parameters, 'Ntt');
          }
          if (widget.isCategoryRefinement(page)) {
            // this is a refinement of a category, show the last known category
            crumb = widget.lastCategoryBreadcrumb;
          } else {
  
            searchTerm = decodeURIComponent(widget.searchTerm);
            // add the search term breadcrumb
            crumb.push({
              label : CCi18n.t('ns.nsh_breadcrumb:resources.searchBreadcrumb', {
                searchTerm : searchTerm
              })
            });
          }
        }
  
        widget.originalBreadcrumb = $.extend(true, [], crumb);
  
        widget.delimiter = CCi18n.t('ns.nsh_breadcrumb:resources.breadcrumbDelimiter');
        
        if (crumb.length > 2) {
          crumb = widget.checkForTruncation(crumb);
        }
  
        widget.breadcrumb(crumb);
      },
      /*
       * Check if the specified page contains refinements to a category page
       * @param page  page to check
       */
      isCategoryRefinement : function(page){
        var widget = this;
        return widget.isCategory();
      },
      /*
       * Check if any of the categories need replaced with an ellipsis, keeping
       * the first and last intact
       * @params  breadcrumbs   current breadcrumb trail to check for size
       */
      checkForTruncation : function(breadcrumbs) {
        var widget = this, c = widget.buildBreadcrumbTrail(breadcrumbs), isTooWide = widget.isTooWide(c), index = 1, hasEllipsis = false;
  
        while (isTooWide && index < (breadcrumbs.length - 1)) {
          breadcrumbs[index].label = "...";
          delete (breadcrumbs[index].url);
          c = widget.buildBreadcrumbTrail(breadcrumbs);
          isTooWide = widget.isTooWide(c);
          index++;
          hasEllipsis = true;
        }
  
        // remove duplicate ellipses, if necessary
        if (hasEllipsis) {
          hasEllipsis = false;
          var newBreadcrumbs = [];
          $.each(breadcrumbs, function(i, b) {
            if (b.label != "...") {
              newBreadcrumbs.push(b);
            } else if (b.label == "..." && !hasEllipsis) {
              newBreadcrumbs.push(b);
              hasEllipsis = true;
            }
          });
          breadcrumbs = $.extend(true, [], newBreadcrumbs);
        }
        return breadcrumbs;
      },
      /*
       * Check if the breadcrumbs fit in the given space @param breadcrumbs current breadcrumb trail to check for size
       */
      isTooWide : function(breadcrumbs) {
        var height, lineHeight;
  
        $("#breadcrumbTrailTest").text(breadcrumbs);
        $("#breadcrumbTrailTest").show();
        $("#breadcrumbTrail").hide();
  
        height = $("#breadcrumbElement").height();
        lineHeight = $("#breadcrumbElement").css("line-height");
        if (lineHeight){
            lineHeight = lineHeight.replace("px", "");
        }
  
        $("#breadcrumbTrailTest").hide();
        $("#breadcrumbTrail").show();
  
        return (height > lineHeight);
      },
      /*
       * Concatenate breadcrumbs
       * @param breadcrumbs   array of current breadcrumbs
       */
      buildBreadcrumbTrail : function(breadcrumbs) {
        var res = '', widget = this;
              
        $.each(breadcrumbs, function(i, crumb) {
          if (i > 0) {
            res += ' ' + widget.delimiter + ' ';
          }
          res += crumb.label;
        });
        return res;
      },
      /*
       * Check responsive behaviour
       */
      checkResponsive : function() {
        var widget = this, bc;
  
        if (widget.originalBreadcrumb) {
          bc = $.extend(true, [], widget.originalBreadcrumb);
        } else {
          bc = widget.breadcrumb();
        }
  
        if (bc !== undefined && bc.length > 2) {
          bc = widget.checkForTruncation(bc);
        }
  
        widget.breadcrumb(bc);
      },
      /*
       * If the product is NOT in the current category, and the product's category is not a descendant of the category,  then it will be from a
       * non-category link
       * @param   product the product to check
       * @param   catId   the current widget category
       */
      checkProductCategory : function(product, catId) {
        var found = false, widget = this;
  
        $.each(product.parentCategories(), function(i, prodCat) {
          if (prodCat.id() == catId) {
            found = true;
            return false;
          }else{
            //check the parents of the category for catId
            found = widget.categoryInAncestors(prodCat.id(), catId);
            if (found){
              return false;
            }
          }
        });
  
        return found;
      },
      /*
       * check if "categoryToCheck" appears in any of categoryId's ancestors 
       * e.g. categoryToCheck is a product Id and category Id is the current category - check if appears in any of the product's ancestor categories
       * @param categoryToCheck   category (and ancestors) to check
       * @param categoryId        specific category to look for
       */
      categoryInAncestors : function(categoryToCheck, categoryId){
        var found = false, widget = this,
          cats = widget.categoryMap[categoryToCheck];
        if(cats){
        $.each(cats, function(i, cat) {
         while (cat.parent && !found){
          cat = cat.parent;
          
          if (cat.id == categoryId){
            found = true;
            return false;
          }
         }
        });
        }
  
        return found;
      },
      /*
       * Get category tree for product based on it's parents
       * @param product   product from which to get the category
       */
      getProductCategories : function(product) {
        var cats = [], widget = this, url, result = [];
        
        if (product && product.parentCategoryIdPath && product.parentCategoryIdPath()) {
          cats = product.parentCategoryIdPath().split('>');
  
          $.each(cats, function(i, cat) {
              url = widget.getCatURL(cat, widget.allCategories);
                if (url){
                  result.push({
                    label : widget.getCategory(cat, widget.allCategories).displayName,
                    url : url
                  });
                }
          });
        }
      return result;
      },
      /*
       * Recursive method to find catId in allCategories
       * @param catId       category to find
       * @param categories  list of categories to check
       */
      getCategory : function(catId, categories) {
        var category = '', widget = this, res;
  
        $.each(categories, function(i, cat) {
          if (cat.id == catId) {
            category = cat;
            return false;
          } else if (cat.childCategories !== undefined) {
            res = widget.getCategory(catId, cat.childCategories);
            if (res) {
              category = res;
              return false;
            }
          }
        });
  
        return category;
      },
      /*
       * get breadcrumb trail for category page
       * @param catPage  are we on a category page - boolean
       */
      getCategories : function(catPage) {
        var cats = [], names = [], result = [], widget = this, url;
        if (widget.category && widget.category() && widget.category().parentCategoryIdPath) {  
          cats = widget.category().parentCategoryIdPath.split('>');
  
          $.each(cats, function(i, cat) {
              if (i == (cats.length - 1) && catPage) {
                // no link on last category
                result.push({
                  label : widget.getCategory(cat, widget.allCategories).displayName
                });
              } else {
                url = widget.getCatURL(cat, widget.allCategories);
                if (url){
                  result.push({
                    label : widget.getCategory(cat, widget.allCategories).displayName,
                    url : url
                  });
                }
              }
          });
        }
        return result;
      },
  
      /*
       * get the URL for a category
       * @param catId       category to look for
       * @param categories  category list to search
       */
      getCatURL : function(catId, categories) {
        var widget = this, route = '', res;
        $.each(categories, function(i, cat) {
          if (cat.id == catId) {
            route = cat.route;
            return false;
          } else if (cat.childCategories !== undefined) {
            res = widget.getCatURL(catId, cat.childCategories);
  
            if (res) {
              route = res;
              return false;
            }
          }
        });
  
        return route;
      },
      /*
       * set parent property on each category where applicable
       * @param categories    list of categories to process
       */
      setParentCats : function(categories) {
        var widget = this;
        $.each(categories, function(i, cat) {
          if (cat.childCategories !== undefined) {
            $.each(cat.childCategories, function(i, child) {
              child.parent = cat;
              //add the category to the map, so that
              //we don't have to iterate the entire collection forest
              widget.setCategoryMap(child);
            });
            widget.setParentCats(cat.childCategories);
          }
        });
      },
      /*
       * setCategoryMap creates a Map where key is a category.id
       * and values are an array of all instances of the category
       * present in the categoryList(response of Collection API call).
       * The purpose of this is to keep a Map of category so that,
       * we don't need to iterate whole category all the time.
       * With this, we can retrieve all instances of a category in constant time.
       * @param child the category
       */
      setCategoryMap : function(child) {
        var widget = this;
        if(child.id){
          widget.categoryMap[child.id] = widget.categoryMap[child.id] || [];
          widget.categoryMap[child.id].push(child);  
        }
      },
      /*
       * get url parameter, e.g. for search term
       * @param string  string to search, e.g. querystring
       * @param key     key to find
       */
      getParam : function(string, key) {
        var vars = [], hash;
        if (string !== undefined) {
          string = string.split('&');
          for (var i = 0; i < string.length; i++) {
            hash = string[i].split('=');
            vars.push(hash[1]);
            vars[hash[0]] = hash[1];
          }
        }
        return vars[key] || null;
      },
  
      isProductPage : function(page) {
        return page.pageId.toLowerCase() == "product";
      },
      isCategoryPage : function(page) {
        return page.pageId.toLowerCase() == "category";
      },
      isSearchResultsPage : function(page) {
        return page.pageId.toLowerCase() == "searchresults";
      },
      isNoSearchResultsPage : function(page) {
        return page.pageId.toLowerCase() == "nosearchresults";
      }
    }
  });
  