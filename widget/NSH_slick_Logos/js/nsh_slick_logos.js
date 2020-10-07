define(

  ['knockout', 'CCi18n', '/file/thirdparty/slick-slider.js'],

  function(ko, CCi18n, slick) {

    "use strict";

    return {
      isReady: ko.observable(true),
      isMobile: ko.observable(true),
      resourcesLoaded : function(widget) {
      },
      
      openModal: function(id) {       
        $("#popup-stack-"+id+"-popup").modal();
        $("#popup-stack-"+id+"-popup .modal-header").remove();
        $("#popup-stack-"+id+"-popup .modal-content").css(
            {"background": "transparent", 
            "border": "none",
            "box-shadow": "none",
            });
        $("body").on('click', "#popup-stack-"+id+"-popup img", function(){
            $("#popup-stack-"+id+"-popup").modal('hide');
        });
      },

      onLoad : function(widget) {       

      },

      beforeAppear : function(page) {
      },

      addContainer: function(elemento) {
        $(elemento).parent().parent().parent().addClass("container");
      },

      addClassInParent: function(element ,parent, value){
        $("#"+element).parents().eq(parent).addClass(value);
      },

      addSlick: function () {
        var widget = this;

        if (!$("#" + widget.id()).hasClass("slick-initialized")) {

          var configSlickAutoPlay = false;
          if (widget.hasOwnProperty('_autoPlay') && widget._autoPlay()) {
            configSlickAutoPlay = true;
          }

          var configSlickLoop = 0;
          if (widget.hasOwnProperty('_loopSpeed') && widget._loopSpeed()) {
            configSlickLoop = widget._loopSpeed();
          }

          $("#" + widget.id()).slick({
            slidesToShow: 8,
            slidesToScroll: 1,
            dots: false,
            infinite: false,
            cssEase: 'linear',
            prevArrow: "<button type='button' class='slick-prev'>></button>",
            nextArrow: "<button type='button' class='slick-next'><</button>",
            responsive: [
              {
                breakpoint: 1600,
  
                settings: {
  
  
                  slidesToShow: 7,
                  slidesToScroll: 1,
  
                }
              },
              {
                breakpoint: 1270,
  
                settings: {
  
  
                  slidesToShow: 6,
                  slidesToScroll: 1,
  
                }
              },
              {
                breakpoint: 900,
  
                settings: {
  
  
                  slidesToShow: 4,
                  slidesToScroll: 1,
  
                }
              },
              {
                breakpoint: 600,
  
                settings: {
  
  
                  slidesToShow: 3,
                  slidesToScroll: 1,
                 
  
  
                }
              },
              {
                breakpoint: 400,
  
                settings: {
  
  
                  slidesToShow: 2,
                  slidesToScroll: 1,
                 
  
  
                }
              },
  
            ]});

        }
      }
    }
  }
);
