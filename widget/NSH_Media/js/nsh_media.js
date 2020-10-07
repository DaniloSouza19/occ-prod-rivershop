define(

  ['knockout', 'CCi18n', 'https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.7.1/slick.js'],

  function (ko, CCi18n, slick) {

    "use strict";

    return {
      arrImagesDesktop: ko.observableArray([]),
      arrImagesMobile: ko.observableArray([]),
      isMobile: ko.observable(true),
      isReady: ko.observable(true),



      resourcesLoaded: function (widget) {
      },


      onLoad: function (widget) {

        widget.arrImagesDesktop([]);
        widget.arrImagesMobile([]);

        if (window.innerWidth < 767) {
          widget.isMobile(true);
          var actualWindow = "mobile";
        } else {
          widget.isMobile(false);
          var actualWindow = "desktop";
        }

        $(window).resize(function () {
          if (window.innerWidth < 767) {

            if (actualWindow == "desktop") {
              widget.isReady(false);
              actualWindow = "mobile";
              // $("#" + widget.id()).slick("unslick");
              // $("#" + widget.id()).empty();
              widget.isMobile(true);
                widget.addSlick();
            }
          } else {

            if (actualWindow == "mobile") {
              widget.isReady(false);
              actualWindow = "desktop";
              // $("#" + widget.id()).slick("unslick");
              // $("#" + widget.id()).empty();
              widget.isMobile(false);
                widget.addSlick();
            }
          }
        });

        for (var index = 1; index <= 10; index++) {
          if (widget.hasOwnProperty("_enableMedia_" + index) && widget["_enableMedia_" + index]() && widget.hasOwnProperty("_mediaImageDesktop_" + index) && widget["_mediaImageDesktop_" + index]) {
            widget.arrImagesDesktop().push({
              src: widget["_mediaImageDesktop_" + index].src,
              link: widget["_linkMedia_" + index],
              newtab: widget["_newTabMedia_" + index],
              title: widget["_titleMedia_" + index],
              alt: widget["_altMedia_" + index]
            })
          }
          if (widget.hasOwnProperty("_enableMedia_" + index) && widget["_enableMedia_" + index]() && widget.hasOwnProperty("_mediaImageMobile_" + index) && widget["_mediaImageMobile_" + index]) {
            widget.arrImagesMobile().push({
              src: widget["_mediaImageMobile_" + index].src,
              link: widget["_linkMedia_" + index],
              newtab: widget["_newTabMedia_" + index],
              title: widget["_titleMedia_" + index],
              alt: widget["_altMedia_" + index]
            })
          }
        }
      },

      beforeAppear: function (page) {
      },

      addSlick: function () {
        var widget = this;
        if (widget._hasSlick() === true) {
          var widget = this;
          widget.isReady(true);

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
              slidesToShow: widget._mediasPerRow(),
              slidesToScroll: 1,
              dots: false,
              infinite: true,
              cssEase: 'linear',
              prevArrow: "<button type='button' class='slick-prev pull-left'><i class='fa fa-angle-left' aria-hidden='true'></i></button>",
              nextArrow: "<button type='button' class='slick-next pull-right'><i class='fa fa-angle-right' aria-hidden='true'></i></button>",
              responsive: [
                {
                  breakpoint: 768,

                  settings: {

                    dots: true

                  }
                }
              ]

            });

          }
        }
      }
    }
  }
);
