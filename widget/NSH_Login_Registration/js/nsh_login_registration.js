define(

  ['jquery', 'knockout', 'koValidate', 'notifier', 'ccPasswordValidator', 'pubsub', 'CCi18n', 'ccConstants', 'navigation', 'ccLogger', 'pageLayout/rest-adapter', "ccRestClient", 'moment', 'file/thirdparty/jQuery Mask Plugin v1.14.16.js'],

  function($, ko, koValidate, notifier, CCPasswordValidator, pubsub, CCi18n, CCConstants, navigation, ccLogger, Adapter, restClient, moment, mask) {

      "use strict";

      var parent,
          widgetModel,
          newUser,
          cachedProfile,
          ADAPTER_VERSION = "/ccstore/v1/";

      function init(widget) {
          widgetModel = widget;
          newUser = false;

          // Workaround for custom fields with null value after register.
          // On user autologin after registration, silently try to update the profile with the custom fields only.
          $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(data) {
              if (newUser) {
                  widgetModel.user().adapter.loadJSON(CCConstants.ENDPOINT_UPDATE_PROFILE, CCConstants.ENDPOINT_UPDATE_PROFILE, cachedProfile, function(n) {
                      $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).publish(n);
                  }, function(e) {
                      $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_FAILURE).publish(e);
                  });
              }
          });

          koValidateRegister();
          //    widgetModel.setValidations();
          widgetModel.user().emailMarketingMails(true);
      }

      function koValidateRegister() {
          var cnpj = widgetModel.cnpj();

          cnpj = cnpj.replace(/[^\d]+/g, '');

          if (cnpj == '') {
              return false;
          }

          if (cnpj.length != 14) {
              return false;
          }


          // Elimina CNPJs invalidos conhecidos
          if (cnpj == "00000000000000" ||
              cnpj == "11111111111111" ||
              cnpj == "22222222222222" ||
              cnpj == "33333333333333" ||
              cnpj == "44444444444444" ||
              cnpj == "55555555555555" ||
              cnpj == "66666666666666" ||
              cnpj == "77777777777777" ||
              cnpj == "88888888888888" ||
              cnpj == "99999999999999") {
              return false;
          }


          // Valida DVs
          tamanho = cnpj.length - 2
          numeros = cnpj.substring(0, tamanho);
          digitos = cnpj.substring(tamanho);
          soma = 0;
          pos = tamanho - 7;
          for (i = tamanho; i >= 1; i--) {
              soma += numeros.charAt(tamanho - i) * pos--;
              if (pos < 2)
                  pos = 9;
          }
          resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
          if (resultado != digitos.charAt(0)) {
              return false;
          }


          tamanho = tamanho + 1;
          numeros = cnpj.substring(0, tamanho);
          soma = 0;
          pos = tamanho - 7;
          for (i = tamanho; i >= 1; i--) {
              soma += numeros.charAt(tamanho - i) * pos--;
              if (pos < 2)
                  pos = 9;
          }
          resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
          if (resultado != digitos.charAt(1)) {
              return false;
          }

          return true;

          if (koValidate.rules.phoneBR === void 0) {
              koValidate.rules.phoneBR = {
                  validator: function(val) {
                      var pattern = new RegExp(/^(\([1-9]{2}\)|[1-9]{2})([ .-]?)(?:[2-8][\d]|9[1-9])[\d]{2,3}([ .-]?)[\d]{4}$/g);

                      return pattern.test(val);
                  },
                  message: 'Invalid phone.'
              };
          }

          /* if (koValidate.rules.birthdayBR === void 0) {
             koValidate.rules.birthdayBR = {
               validator: function (val) {
                 return moment(val, "DD/MM/YYYY", true).isValid();
               },
               message: 'Invalid birthday.'
             };
           }*/

          koValidate.registerExtenders();
      }

      function register() {
          var widget = this;
          var profile = {};

          var dynamicProperties = widgetModel.user().dynamicProperties();

          profile[CCConstants.PROFILE_EMAIL] = widgetModel.user().emailAddress();
          profile[CCConstants.PROFILE_PASSWORD] = widgetModel.user().newPassword();
          profile[CCConstants.PROFILE_FIRST_NAME] = widgetModel.user().firstName();
          profile[CCConstants.PROFILE_LAST_NAME] = widgetModel.user().lastName();
          profile[CCConstants.PROFILE_RECEIVE_EMAIL] = widgetModel.user().emailMarketingMails() ? "yes" : "no";
          //  profile.cpf = widgetModel.cpf();
          // profile.birthDate = widgetModel.birthday();
          // profile.cellPhoneNumber = widgetModel.phone();
          profile.CNPJ_c = widgetModel.cnpj();
          profile.inscricaoEstadual_c = widgetModel.stateRegistration();
          profile.daytimeTelephoneNumber = widgetModel.daytimeTelephoneNumber();
          profile.celular_c = widgetModel.celular();
          profile.skype_c = widgetModel.skype();

          /*   $.each(dynamicProperties, function( index, value ) {
                 if (value.id() == "CNPJ_c"){
                 //  value.value = widgetModel.cnpj(); 
                 profile["dynamicProperties"] = []; 
                 profile["dynamicProperties"][index].value = widgetModel.cnpj();

                 } 
                 
               });*/


          if (widgetModel.user().shippingAddressBook() !== null && widgetModel.user().shippingAddressBook() !== void 0 && widgetModel.user().isShippingAddressBookValid()) {
              profile[CCConstants.PROFILE_SHIPPING_ADDRESSES] = widgetModel.user().shippingAddressBook();
          }

          var profileLocale = JSON.parse(restClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE));
          profile[CCConstants.PROFILE_LOCALE] = profileLocale && profileLocale[0].name || widgetModel.locale();


          widgetModel.adapter.persistCreate(CCConstants.ENDPOINT_CREATE_PROFILE, CCConstants.ENDPOINT_CREATE_PROFILE, profile, function(success) {
              newUser = true;
              cachedProfile = {
                  cnpj: profile.cnpj
                  // cpf: profile.cpf
                  // birthDate: widgetModel.formatDate(profile.birthDate),
                  // cellPhoneNumber: profile.cellPhoneNumber
              };
              widgetModel.user().emailAddress($('#CC-userRegistration-emailAddress').val());
              widgetModel.user().password($('#CC-userRegistration-password').val());

              widgetModel.user().login(widgetModel.user().emailAddress());

              $.Topic(pubsub.topicNames.USER_LOGIN_SUBMIT).publishWith(widgetModel.user(), [{
                  message: "success"
              }]);

              widgetModel.redirectLogin();
          }, function(error) {

              if (error.errorCode == CCConstants.CREATE_PROFILE_USER_EXISTS) {
                  notifier.sendError(widgetModel.WIDGET_ID, "Account Already Exists", true);

              }

              $.Topic(pubsub.topicNames.USER_CREATION_FAILURE).publish(error);
          });

          widgetModel.koValidateRegister();
      }

      return {


          redirect: ko.observable(true),
          isReady: ko.observable(true),
          WIDGET_ID: 'nshLoginRegistration',
          ignoreBlur: ko.observable(false),
          newPassword: ko.observable(),
          adapter: new Adapter(ADAPTER_VERSION),
          cpf: ko.observable(''),
          cnpj: ko.observable(''),
          stateRegistration: ko.observable(),
          daytimeTelephoneNumber: ko.observable(),
          celular: ko.observable(),
          skype: ko.observable(),
          birthday: ko.observable(''),
          phone: ko.observable(''),
          validation: ko.validatedObservable(),
          inRegister: ko.observable(false),
          login_blocked: ko.observable(false),

          rendered: function(widget) {
             
              if (location.search.substr(1).split("&")[0] == ("registro")) {
                  $('html, body').animate({
                      scrollTop: $("#registro").offset().top - 130
                  }, 500);
              }
          },


          onLoad: function(widget) {
              init(widget);

              $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(function() {
                  if (window.location.pathname == "/login-bloqueado") {
                      console.log("PG-C LoginBloqueado");
                      widget.login_blocked(true);
                      $("#blocked").removeClass("none");
                  } else {
                      console.log("PG-C NOT LoginBloqueado");
                      widget.login_blocked(false);
                  }
              });

              /*
              setTimeout(function () {
                if (window.location.pathname == "/login-bloqueado") {
                $("#blocked").removeClass("none");
                }
              }, 1000);
              */


              widget.user().login("");

              $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function() {
                  setTimeout(function() {
                      widgetModel.redirectLogin();
                  }.bind(widget), 1000);
              });

              // Handle widget responses when registration is successful or invalid
              $.Topic(pubsub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                  if (obj.widgetId === widgetModel.WIDGET_ID) {
                      notifier.clearSuccess(widgetModel.WIDGET_ID);
                      notifier.sendSuccess(widgetModel.WIDGET_ID, widgetModel.translate('createAccountSuccess'));
                      $(window).scrollTop('0');
                  }
              });

              $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_SUCCESS).subscribe(function(data) {
                  $('#CC-forgotPasswordMessagePane').show();
              });

              $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_FAILURE).subscribe(function(data) {
                  notifier.sendError(widgetModel.WIDGET_ID, data.message, true);
              });

              // $.Topic(pubsub.topicNames.USER_AUTO_LOGIN_FAILURE).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_UNAUTHORIZED).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_LOCALE_NOT_SUPPORTED).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_LOGIN_CANCEL).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_NETWORK_ERROR).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_PROFILE_PASSWORD_UPDATE_FAILURE).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_FAILURE).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_INVALID).subscribe(function(data) {
              // });
              //
              // $.Topic(pubsub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).subscribe(function(data) {
              // });

              $.Topic(pubsub.topicNames.USER_PASSWORD_GENERATED).subscribe(function(data) {
                  widgetModel.hideAllSections();
                  widgetModel.user().showCreateNewPasswordMsg(true);
                  widgetModel.user().hasFieldLevelError(false);
                  widgetModel.user().createNewPasswordError(CCi18n.t('ns.common:resources.createNewPasswordError'));
                  widgetModel.user().resetPassword();
                  widgetModel.user().ignoreEmailValidation(false);
                  widgetModel.user().oldPassword.isModified(false);

                  /*  $('#CC-headermodalpane').modal();
                    $('#CC-createNewPassword-oldPassword-error').empty();
                    $('#CC-createNewPassword-password-error').empty();
                    $('#CC-createNewPassword-password-embeddedAssistance').empty();
                    $('#CC-createNewPassword-oldPassword').removeClass("invalid");
                    $('#CC-createNewPassword-password').removeClass("invalid");
                    $('#CC-createNewPassword-oldPassword').focus(); */
                  $('#CC-updatePasswordPane').show();
                  $('#CC-userLogin').hide();
              });

              $.Topic(pubsub.topicNames.USER_PASSWORD_EXPIRED).subscribe(function(data) {
                  widgetModel.hideAllSections();
                  widgetModel.user().ignoreEmailValidation(false);
                  $('#CC-forgotPasswordSectionPane').show();
                  $('#CC-forgotPwd-input').focus();
                  widgetModel.user().emailAddressForForgottenPwd('');
                  widgetModel.user().emailAddressForForgottenPwd.isModified(false);
                  widgetModel.user().forgotPasswordMsg(CCi18n.t('ns.common:resources.resetPwdText'));
              });

              $.Topic(pubsub.topicNames.USER_PROFILE_PASSWORD_UPDATE_FAILURE).subscribe(function(data) {
                  widgetModel.user().showCreateNewPasswordMsg(false);
                  if (data.errorCode == CCConstants.UPDATE_EXPIRED_PASSWORD_OLD_PASSWORD_INCORRECT) {
                      $('#CC-createNewPassword-oldPassword-error').css("display", "block");
                      $('#CC-createNewPassword-oldPassword-error').text(CCi18n.t('ns.common:resources.oldPasswordsDoNotMatch'));
                      $('#CC-createNewPassword-oldPassword').addClass("invalid");
                      widgetModel.user().hasFieldLevelError(true);
                  } else if (data.errorCode == CCConstants.USER_EXPIRED_PASSWORD_POLICIES_ERROR) {
                      $('#CC-createNewPassword-password-error').css("display", "block");
                      $('#CC-createNewPassword-password-error').text(CCi18n.t('ns.common:resources.passwordPoliciesErrorText'));
                      $('#CC-createNewPassword-password').addClass("invalid");
                      $('#CC-createNewPassword-password-embeddedAssistance').css("display", "block");
                      var embeddedAssistance = CCPasswordValidator.getAllEmbeddedAssistance(widgetModel.passwordPolicies(), true);
                      $('#CC-createNewPassword-password-embeddedAssistance').text(embeddedAssistance);
                      widgetModel.user().hasFieldLevelError(true);
                  } else {
                      widgetModel.user().createNewPasswordError(data.message);
                      widgetModel.user().showCreateNewPasswordMsg(true);
                      widgetModel.user().hasFieldLevelError(false);
                  }
              });

              $.Topic(pubsub.topicNames.USER_PROFILE_PASSWORD_UPDATE_SUCCESSFUL).subscribe(function(data) {
                  widgetModel.hideAllSections();

                  $.Topic(pubsub.topicNames.USER_LOGIN_SUBMIT).publishWith(widgetModel.user(), [{
                      message: "success"
                  }]);
              });

              $.Topic(pubsub.topicNames.USER_CREATION_FAILURE).subscribe(function(obj) {
                  notifier.sendError(widgetModel.WIDGET_ID, obj.message, true);
              });

              $.Topic(pubsub.topicNames.USER_LOGIN_FAILURE).subscribe(function(obj) {
                  notifier.sendError(widgetModel.WIDGET_ID, CCi18n.t('ns.common:resources.loginError'), true);
              });

              $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                  notifier.clearSuccess(widgetModel.WIDGET_ID);
              });

              // This pubsub checks for the page parameters and if there is a token
              // in the page URL, validates it and then starts the update expired/
              // forgotten password modal.
              $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(function() {
                  var token = this.parameters.occsAuthToken;
                  // Proceed only if there is a token on the parameters
                  if (token) {
                      // Validate the token to make sure that it is valid
                      // before proceeding to update the password.
                      widget.user().validateTokenForPasswordUpdate(token,
                          // Success callback
                          function(data) {
                              // Let's try and update the password.
                              // $('#CC-headermodalpane').modal('show');
                              // self.hideAllSections();
                              widget.cancelForgotPasswordSection();
                              $('#CC-userLogin').hide();
                              $("div#registro").hide();
                              $('#CC-updatePasswordPane').show();
                              // $('#CC-headermodalpane').on('shown.bs.modal', function () {
                              $('#CC-updatePassword-email').focus();
                              // });
                          },
                          // Error callback
                          function(data) {
                              // Error function - show error message
                              // $('#CC-headermodalpane').modal('show');
                              // self.hideAllSections();
                              widget.cancelForgotPasswordSection();
                              $('#CC-userLogin').hide();
                              $('#CC-updatePasswordErrorMessagePane').show();
                          });
                  }
              });

              $.Topic(pubsub.topicNames.USER_PASSWORD_GENERATED).subscribe(function(data) {
                  $('#alert-modal-change').text(CCi18n.t('ns.common:resources.resetPasswordModalOpenedText'));
                  widgetModel.user().ignoreEmailValidation(false);
                  //   self.hideAllSections();
                  //   $('#CC-forgotPasswordSectionPane').show();
                  $('#CC-forgotPwd-input').focus();
                  widgetModel.user().emailAddressForForgottenPwd('');
                  widgetModel.user().emailAddressForForgottenPwd.isModified(false);
              });

              //Mask´s
              $('#CC-userRegistration-CNPJ').mask('00.000.000/0000-00');
              $('#CC-userRegistration-daytimeTelephoneNumber').mask('00 0000-0000');
              $('#CC-userRegistration-celular').mask('00 000000000');
          },

          registerLayout: function() {
              var widget = this;

              if (widgetModel.inRegister() == true) {
                  $(".login-banner").css("display", "none");
                  // $(".login-register").css("margin-left", "580px");
              } else {
                  $(".login-banner").css("display", "block");
                  //$(".login-register").css("margin-left", "0px");
              }
          },


          beforeAppear: function(page) {
              $(".modal-backdrop").remove();
          },

          removeMessageFromPanel: function() {
              var message = this;
              var messageId = message.id();
              var messageType = message.type();
              notifier.deleteMessage(messageId, messageType);
          },

          emailAddressFocused: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignoreEmailValidation(true);
              return true;
          },

          emailAddressLostFocus: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignoreEmailValidation(false);
              return true;
          },

          passwordFieldFocused: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignorePasswordValidation(true);
              return true;
          },

          passwordFieldLostFocus: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignorePasswordValidation(false);
              return true;
          },

          confirmPwdFieldFocused: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignoreConfirmPasswordValidation(true);
              return true;
          },

          confirmPwdFieldLostFocus: function(data) {
              var widget = this;
              if (widget.ignoreBlur && widget.ignoreBlur()) {
                  return true;
              }
              widgetModel.user().ignoreConfirmPasswordValidation(false);
              return true;
          },

          handleLabelsInIEModals: function() {
              if (!!(navigator.userAgent.match(/Trident/))) {
                  $("#CC-LoginRegistrationModal label").removeClass("inline");
              }
          },

          handleCancelForgottenPassword: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  notifier.clearError(this.WIDGET_ID);
                  navigation.doLogin(navigation.getPath(), widgetModel.links().home.route);
              }
              return true;
          },

          handleSuccessForgottenPassword: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  navigation.doLogin(widgetModel.links().home.route, widgetModel.links().home.route);
              }
              return true;
          },

          /**
           * Registration will be called when register is clicked
           */
          //   registerUser: function(data, event) {

          //       if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
          //           notifier.clearError(this.WIDGET_ID);
          //           console.log(widgetModel.cnpj());
          //           //removing the shipping address if anything is set
          //           widgetModel.user().shippingAddressBook([]);
          //           if (widgetModel.user().validateUser()) {


          //           }
          //       }
          //       return true;

          //   },

          /**
           * this method is invoked to hide the login modal
           */
          hideLoginModal: function() {
              $('#CC-headermodalpane').modal('hide');
              $('body').removeClass('modal-open');
              $('.modal-backdrop').remove();
          },

          /**
           * Invoked when Login method is called
           */
          handleLogin: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  notifier.clearError(widgetModel.WIDGET_ID);
                  if (widgetModel.user().validateLogin()) {
                      widgetModel.user().updateLocalData(false, false);
                      $.Topic(pubsub.topicNames.USER_LOGIN_SUBMIT).publishWith(widgetModel.user(), [{
                          message: "success"
                      }]);
                  }
              }

              return true;
          },

          /**
           * Invoked when cancel button is clicked on login modal
           */
          handleCancel: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  notifier.clearError(widgetModel.WIDGET_ID);
                  if (widgetModel.user().isUserSessionExpired()) {
                      $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{
                          message: "success"
                      }]);
                      this.hideLoginModal();
                  }
              }
              return true;
          },

          /**
           * this method is triggered when the user clicks on the save
           * on the create new password model
           */
          // savePassword: function (data, event) {
          //   if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
          //     if (widgetModel.user().isPasswordValid()) {
          //       widgetModel.user().updateExpiredPassword();
          //     }
          //   }
          //   return true;
          // },

          /**
           * Invoked when cancel button is called on
           */
          cancelLoginModal: function(widget) {
              if (widgetModel.hasOwnProperty("user")) {
                  widgetModel.user().handleCancel();
                  if (widgetModel.user().pageToRedirect() && widgetModel.user().pageToRedirect() == widgetModel.links().checkout.route && widgetModel.cart().items().length > 0) {
                      var hash = widgetModel.user().pageToRedirect();
                      widgetModel.user().pageToRedirect(null);
                      navigation.goTo(hash);
                  } else {
                      navigation.cancelLogin();
                  }
                  widgetModel.user().pageToRedirect(null);
                  notifier.clearError(widgetModel.WIDGET_ID);
                  widgetModel.user().clearUserData();
                  widgetModel.user().profileRedirect();
              } else {
                  navigation.cancelLogin();
              }
          },

          /**
           * Invoked when Logout method is called
           */
          handleLogout: function(data) {
              // returns if the profile has unsaved changes.
              if (data.isUserProfileEdited()) {
                  return true;
              }
              // Clearing the auto-login success message
              notifier.clearSuccess(this.WIDGET_ID);
              // Clearing any other notifications
              notifier.clearError(this.WIDGET_ID);
              data.updateLocalData(data.loggedinAtCheckout(), false);
              $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{
                  message: "success"
              }]);
          },

          /**
           * Invoked when the modal dialog for registration is closed
           */
          cancelRegistration: function(data) {
              notifier.clearSuccess(this.WIDGET_ID);
              notifier.clearError(this.WIDGET_ID);
              this.hideLoginModal();
              widgetModel.user().reset();
              widgetModel.user().pageToRedirect(null);
          },

          /**
           * Ignores the blur function when mouse click is up
           */
          /*   handleMouseUp: function (data) {
              var widget = this;
              widget.ignoreBlur(false);
              widgetModel.user().ignoreConfirmPasswordValidation(false);
              return true;
            },*/

          /**
           * Ignores the blur function when mouse click is down
           */
          /*   handleMouseDown: function () {
               var widget = this;
               widget.ignoreBlur(true);
               widgetModel.user().ignoreConfirmPasswordValidation(true);
               return true;
             },*/

          /**
           * Ignores the blur function when mouse click is down outside the modal dialog(backdrop click).
           */
          handleModalDownClick: function(data, event) {
              var widget = this;
              if (event.target === event.currentTarget) {
                  widget.ignoreBlur(true);
                  widgetModel.user().ignoreConfirmPasswordValidation(true);
              }
              return true;
          },

          /**
           * Invoked when forgotten Password link is clicked.
           */
          showForgotPasswordSection: function() {
              var widget = this;
              widget.hideAllSections();
              widgetModel.user().ignoreEmailValidation(false);
              $('#CC-forgotPasswordSectionPane').show();
              $('#CC-forgotPwd-input').focus();
              widgetModel.user().emailAddressForForgottenPwd('');
              widgetModel.user().emailAddressForForgottenPwd.isModified(false);
              widgetModel.user().forgotPasswordMsg(CCi18n.t('ns.common:resources.forgotPwdText'));
          },

          showForgotRegistreSection: function() {

              var widget = this;
              $(".login-register").removeClass("col-lg-4");
              widgetModel.inRegister(true);
              $('.Registration').show();
              $('#CC-userLogin').hide();

              widgetModel.registerLayout();
          },


          /**
           * Ignores the blur function when mouse click is down
           */
          handleMouseDown: function(data) {
              var widget = this;
              //  widget.ignoreBlur(true);
              widgetModel.user().ignoreConfirmPasswordValidation(true);
              return true;
          },

          handleMouseUp: function(data) {
              var widget = this;
              //  widget.ignoreBlur(false);
              widgetModel.user().ignoreConfirmPasswordValidation(false);
              return true;
          },

          /**
           * Hides all the sections of  modal dialogs.
           */
          hideAllSections: function() {
              $('#CC-headermodalpane').modal('hide');
              $('#CC-loginUserPane').hide();
              $('#CC-registerUserPane').hide();
              $('#CC-forgotPasswordSectionPane').hide();
              $('#CC-forgotPasswordMessagePane').hide();
              $('#CC-createNewPasswordMessagePane').hide();
              $('#CC-createNewPasswordPane').hide();
          },

          /**
           * Resets the password for the entered email id.
           */
          resetForgotPassword: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  widgetModel.user().ignoreEmailValidation(false);
                  widgetModel.user().emailAddressForForgottenPwd.isModified(true);
                  if (widgetModel.user().emailAddressForForgottenPwd && widgetModel.user().emailAddressForForgottenPwd.isValid()) {
                      widgetModel.user().resetForgotPassword();
                      $("#CC-forgotPasswordSectionPane").hide();
                      $("#CC-forgotPasswordMessagePane").show();
                  }
              }
              return true;
          },

          redirectLogin: function() {
              if (widgetModel.redirect() === true) {
                  if (widgetModel.user().loggedIn()) {
                      // var get = widgetModel.readQueryString(window.location.search), url;

                      // if (get) {
                      //   url = '/' + get.url[0];
                      // } else {
                      //   url = '/home';
                      // }
                      var url = '/profile';
                      navigation.goTo(url);
                  }
              }
          },

          readQueryString: function(query) {
              var i,
                  queryString = {},
                  pair,
                  pairOfValues;

              if (!query) return null;

              if (query.indexOf('?') >= 0) query = query.substr(1, query.length);

              pairOfValues = query.split('&');

              if (pairOfValues.length < 1) return null;

              for (i in pairOfValues) {
                  pair = pairOfValues[i].split('=');

                  if (queryString[pair[0]] === void 0) {
                      queryString[pair[0]] = [decodeURIComponent(pair[1])];
                  } else {
                      queryString[pair[0]].push(decodeURIComponent(pair[1]));
                  }
              }

              return queryString;
          },

          registerUser: function(data, event) {
              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  if ($("#privacy-policy").prop("checked") == true) {


                      notifier.clearError(this.WIDGET_ID);
                      //removing the shipping address if anything is set
                      widgetModel.user().shippingAddressBook([]);

                      var validUser = widgetModel.user().validateUser();
                      var validCustomFields = widgetModel.validateCustomFields();
                      if (validUser && validCustomFields) {
                          var settings = {
                              "url": "https://commerce.riovermelho.net/api/integra/v1/profilevalidation",
                              "method": "POST",
                              "crossDomain": "true",
                              "timeout": 0,
                              "headers": {
                                "Content-Type": "application/json"
                              },
                              "data": JSON.stringify({"profileId": "000","profile":{"CNPJ_c": widgetModel.cnpj(),"email": widgetModel.user().emailAddress()}}),
                            };
                            
                            $.ajax(settings).done(function (response) {
                              if(response.existeCadastro){
                                // se usuario exite mostrar notificação
                                notifier.sendError(widgetModel.WIDGET_ID, 'Vimos que o seu CNPJ já consta em nosso cadastro. Atualizamos seu email e enviamos mais informações sobre sua conta para esse email. Verifique sua caixa de entrada ou caixa de SPAM do seu email! Quaisquer dúvidas, entre em contato. WhatsApp: 62 99964-9927', true); 
                              }
                              else{
                                // se não cadastro usuario 
                              //    $.Topic(pubsub.topicNames.USER_REGISTRATION_SUBMIT).publishWith(widgetModel.user(), [{ message: "success", widgetId: data.WIDGET_ID }]);
                                register();
                
                              }
                            });
                    
                      }
                  } else {
                      $(".policy-erro").css("display", "block");
                  }
                  if (widgetModel.stateRegistration() == undefined) {
                      $("#CC-userRegistration-stateRegistration-error").css("display", "block");
                  }

                  if (widgetModel.cnpj() == "") {
                      $("#CC-userRegistration-CNPJ-error").css("display", "block");
                  }

              }

              return true;
          },


          validateCustomFields: function() {
              widgetModel.cnpj.isModified(true);
              widgetModel.stateRegistration.isModified(true);
              return widgetModel.cnpj.isValid() && widgetModel.stateRegistration.isValid();
              // widgetModel.cpf.isModified(true);
              // widgetModel.birthday.isModified(true);
              // widgetModel.phone.isModified(true);
              //return widgetModel.cpf.isValid();// && widgetModel.birthday.isValid() && widgetModel.phone.isValid();
          },
          formatDate: function(date) {
              // YYYY-MM-DDT00 00:00.000Z
              var spacer;

              if (!date) return '';

              if (date.indexOf(' ') >= 0) date = date.split(' ')[0];

              if (date.indexOf('/') >= 0) {
                  spacer = '/';
              } else if (date.indexOf('-') >= 0) {
                  spacer = '-';
              } else {
                  spacer = '.';
              }

              date = date.split(spacer);

              return date[2] + '-' + date[1] + '-' + date[0];
          },
          setValidations: function() {
              var self = this;

              if (self.validation()) return true;

              self.validation([
                  self.cnpj.extend({
                      required: {
                          params: true,
                          message: "CNPJ Obrigatório"
                      },
                      cnpj: {
                          params: true,
                          message: "Invalido CNPJ"
                      }
                  })

              ]);

              self.validation([
                  self.stateRegistration.extend({
                      required: {
                          params: true,
                          message: "Inscrição Estadual Obrigatório"
                      },
                      stateRegistration: {
                          params: true,
                          message: "Inscrição Estadual Invalida"
                      }
                  })

              ]);

              /*     self.validation([
           self.celular.extend({
             required: {
               params: true,
               message: "Celular Obrigatório"
             },
             celular: {
               params: true,
               message: "Celular Invalido"
             }
           })
 
         ]);

         self.validation([
           self.skype.extend({
             required: {
               params: true,
               message: "Skype Obrigatório"
             },
             skype: {
               params: true,
               message: "Skype Invalido"
             }
           })
 
         ]);

         self.validation([
           self.daytimeTelephoneNumber.extend({
             required: {
               params: true,
               message: "Telefone Fixo Obrigatório"
             },
             daytimeTelephoneNumber: {
               params: true,
               message: "Telefone Fixo Invalido"
             }
           })
 
         ]);*/

              return true;
          },
          /**
           * Invoked when forgotten Password link is clicked.
           */
          showForgotPasswordSection: function(data) {
              var widget = this;
              $('#alert-modal-change').text(CCi18n.t('ns.common:resources.forgottenPasswordModalOpenedText'));
              data.ignoreEmailValidation(false);
              //widget.hideAllSections();
              $('#CC-userLogin').hide();
              $('#CC-forgotPasswordSectionPane').show();
              $('#CC-forgotPwd-input').focus();
              data.emailAddressForForgottenPwd('');
              data.emailAddressForForgottenPwd.isModified(false);
          },

          cancelForgotPasswordSection: function(data) {
              $('#CC-userLogin').show();
              $('#CC-forgotPasswordSectionPane').hide();
              $('#CC-forgotPasswordMessagePane').hide();
              $('#CC-updatePasswordPane').hide();
              $("#CC-updatePasswordErrorMessagePane").hide();
          },
          cancelForgotregisterSection: function(data) {
              var widget = this;
              $(".login-register").addClass("col-lg-4");
              widgetModel.inRegister(false);
              $('#Registration').hide();
              $('#CC-userLogin').show();
              widgetModel.registerLayout();
          },

          /**
           * Hides all the sections of  modal dialogs.
           */
          hideAllSections: function() {
              $('#CC-loginUserPane').hide();
              $('#CC-registerUserPane').hide();
              $('#CC-forgotPasswordSectionPane').hide();
              $('#CC-updatePasswordPane').hide();
              $('#CC-updatePasswordMessagePane').hide();
              $('#CC-forgotPasswordMessagePane').hide();
              $('#CC-updatePasswordErrorMessagePane').hide();
          },

          savePassword: function(data, event) {
              var widget = this;

              if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
                  notifier.clearError(this.WIDGET_ID);
                  widgetModel.user().ignoreConfirmPasswordValidation(false);
                  widgetModel.user().ignoreEmailValidation(false);
                  widgetModel.user().emailAddressForForgottenPwd.isModified(true);
                  if (widgetModel.user().isPasswordValid(true) &&
                      widgetModel.user().emailAddressForForgottenPwd &&
                      widgetModel.user().emailAddressForForgottenPwd.isValid()) {

                      widgetModel.user().updateExpiredPasswordUsingToken(
                          widgetModel.user().token,
                          widgetModel.user().emailAddressForForgottenPwd(),
                          widgetModel.user().newPassword(),
                          widgetModel.user().confirmPassword(),
                          function(retData) {
                              // Success function
                              //  widgetModel['login-registration-v2'].hideAllSections();
                              $('#CC-updatePasswordMessagePane').show();
                              $('#CC-updatePasswordMsgContinue').focus();
                              $("#CC-updatePasswordPane").hide();
                          },
                          function(retData) {
                              // Error function - show error message
                              // widgetModel['login-registration-v2'].hideAllSections();
                              $('#CC-updatePasswordErrorMessagePane').show();
                              $("#CC-updatePasswordPane").hide();
                          }
                      );
                  }
              }
              return true;
          }

      }
  }
);