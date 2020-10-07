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
        if (window.innerWidth < 768) {
          widget.isMobile(true);
          var actualWindow = "mobile";
        } else {
          widget.isMobile(false);
          var actualWindow = "desktop";
        }
        
        $(window).resize(function () {
          if (window.innerWidth < 768) {

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
            autoplay: configSlickAutoPlay,
            autoplaySpeed: configSlickLoop,
            pauseOnHover: true,
            pauseOnFocus: true,
            slidesToShow: 4,
            slidesToScroll: 4,
            dots: false,
            infinite: true,
            cssEase: 'linear',
            prevArrow: "<button type='button' class='slick-prev pull-left'><i class='fa fa-angle-left' aria-hidden='true'></i></button>",
            nextArrow: "<button type='button' class='slick-next pull-right'><i class='fa fa-angle-right' aria-hidden='true'></i></button>",
            responsive: [
              {
                breakpoint: 1400,
                settings: {
                  
                  slidesToShow: 4,
                  slidesToScroll:4,
                 
                  
                }
              },
              {
                breakpoint: 1200,
                settings: {
                  
                  slidesToShow: 4,
                  slidesToScroll:4,
                 
                  
                }
              },
       
        
              {
                breakpoint: 983,
                settings: {

                  slidesToShow:3,
                  slidesToScroll:1,
                  
                }
              },
              { 
                breakpoint: 800,
                settings: {

                 
                  centerMode: true,
                  slidesToShow:1,
                  slidesToScroll:1,
                  
                }
              },
              { 
                breakpoint: 600,
                settings: {

                 
                  
                  slidesToShow:  1,
                  slidesToScroll:1,
                  centerMode: true,
                }
              }
            ]
          
          });

        }
      }
    }
  }
);
