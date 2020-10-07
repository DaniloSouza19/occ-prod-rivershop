/**
 *  Third Party File Uploader Widget
 *  by LAD Commerce SC Team
 *  root/widget/ThirdPartyUploader/js/ThirdPartyUploaderWidget.js
 */

define(
  //-----------------
  // DEPENDENCIES
  //-----------------
  ['knockout', 'jquery', 'notifier', 'spinner'],
  //-----------------
  // MODULE DEFINITION
  //-----------------
  function (ko, $, notifier, spinner) {
      "use strict";
      var widget;
      return {
          fileListItems: ko.observableArray([]),
          onLoad: function (widgetModel) {
              widget = widgetModel;
            //   console.log("-- 3rd Party File Uploader Widget Loaded");
              widget.listFiles();
          },
          readCookie: function (name) {
              var nameEQ = name + "=";
              var ca = document.cookie.split(';');
              for (var i = 0; i < ca.length; i++) {
                  var c = ca[i];
                  while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                  if (c.indexOf(nameEQ) === 0) {
                      var str = unescape(c.substring(nameEQ.length, c.length));
                      return (str.substring(1, str.length - 2));

                  }
              }
              return null;
          },
          getAdminToken: function () {
              var adminToken = sessionStorage.getItem('oauth_token_secret-adminUI');
              if (adminToken === null || adminToken === '')
                  adminToken = widget.readCookie('oauth_token_secret-adminUI');
              return adminToken;
          },
          listFiles: function () {
              var myInit = {
                  'method': 'GET',
                  'headers': new Headers({
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + widget.getAdminToken()
                  })
              };
              fetch('/ccadminui/v1/files?folder=/thirdparty&assetType=all', myInit)
                  .then(
                      function (response) {
                          if (response.ok === false) {
                              notifier.sendError('THIRDPARTY_UPLOADER', response.status + ' - ' + response.statusText + ' = Error listing third party files!', true);
                              return;
                          }
                          response.json().then(function (data) {
                              widget.fileListItems([]);
                              for (var item in data.items) {
                                  var newItem = {};
                                  newItem.name = ko.observable(data.items[item].name);
                                  newItem.path = ko.observable(data.items[item].path);
                                  newItem.size = ko.observable(data.items[item].size);
                                  newItem.url = ko.observable(data.items[item].url);
                                  newItem.type = ko.observable(data.items[item].type);
                                  widget.fileListItems.push(newItem);
                              }
                              notifier.sendSuccess('THIRDPARTY_UPLOADER', 'Updated SSE List', true);
                          });
                      }
                  )
                  .catch(function (err) {
                      notifier.sendError('THIRDPARTY_UPLOADER', err + ' = Error updating SSE List!', true);
                  });
          },
          startImportProcess: function (path) {

              var startImportProcessPayload = {
                  fileName: path(),
                  mode: 'standalone',
                  id: 'Inventory',
                  format: 'csv'
              };

              var myInit = {
                  'method': 'POST',
                  'headers': new Headers({
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + widget.getAdminToken()
                  }),
                  'body': JSON.stringify(startImportProcessPayload)
              };

            //   console.log('/ccadminui/v1/importProcess/');
              fetch('/ccadminui/v1/importProcess/', myInit)
                  .then(
                      function (response) {
                          if (response.ok === false) {
                              notifier.sendError('THIRDPARTY_UPLOADER', response.status + ' - ' + response.statusText + ' = Error starting Import Process "' + path + '"', true);
                              return;
                          }
                          notifier.sendSuccess('THIRDPARTY_UPLOADER', 'Successfully started import process for "' + path + '"', true);
                          return response.json();
                      }
                  )
                  .then(
                      function (response2) {
                        //   console.log(' processID = ' + response2.processId);
                          widget.listFiles();
                      }
                  )
                  .catch(function (err) {
                      notifier.sendError('THIRDPARTY_UPLOADER', err + ' = Error starting import process for  "' + path + '"', true);
                  });
          },
          sendFileToOCC: function () {
              var fileList = document.getElementById('thirdpartyfiles').files;
              var reader = new FileReader();
              reader.readAsDataURL(fileList[0]);
              reader.onload = function () {
                //   console.log("***** Started Processing File ********");

                  window.result = reader.result;

                //   console.log(reader.result);
                //   console.log(reader.result.split(',')[1]);
                  spinner.create({
                      parent: document.body
                  });

                  var doSegmentUploadPayload = {
                      filename: fileList[0].name,
                      file: reader.result.split(',')[1],
                      index: 0
                  };

                  //bG9jYXRpb25JZDtza3VOdW1iZXI7c3RvY2tMZXZlbA0KY2QxO3NrdTYwMTc0MDsxMTExDQpjZDI7c2t1NjAxNzQwOzIyMjI=
                  //doSegmentUploadPayload.file = "cHJlb3JkZXJMZXZlbDtsb2NhdGlvbklkO2JhY2tvcmRlclRocmVzaG9sZDtzdG9ja1RocmVzaG9sZDtkaXNwbGF5TmFtZTtza3VOdW1iZXI7YmFja29yZGVyTGV2ZWw7c3RvY2tMZXZlbDthdmFpbGFiaWxpdHlTdGF0dXM7YXZhaWxhYmxlVG9Qcm9taXNlLnJvdyM7YXZhaWxhYmxlVG9Qcm9taXNlLnF1YW50aXR5O2F2YWlsYWJsZVRvUHJvbWlzZS5hdmFpbGFibGVEYXRlO2F2YWlsYWJsZVRvUHJvbWlzZS5xdWFudGl0eVdpdGhGcmFjdGlvbjthdmFpbGFibGVUb1Byb21pc2UuaW52ZW50b3J5SWQ7cHJlb3JkZXJUaHJlc2hvbGQ7YXZhaWxhYmlsaXR5RGF0ZQ0KO2NkMTs7O3NrdTYwMTc0MDtza3U2MDE3NDA7OzExMTs7Ozs7Ozs7DQo7Y2QyOzs7c2t1NjAxNzQwO3NrdTYwMTc0MDs7MjIyOzs7Ozs7OzsNCg==";
                  //doSegmentUploadPayload.file = "cHJlb3JkZXJMZXZlbDtsb2NhdGlvbklkO2JhY2tvcmRlclRocmVzaG9sZDtzdG9ja1RocmVzaG9sZDtkaXNwbGF5TmFtZTtza3VOdW1iZXI7YmFja29yZGVyTGV2ZWw7c3RvY2tMZXZlbA0KMDtjZDE7MDswOztza3U2MDE3NDA7MDsxMjEyDQowO2NkMjswOzA7O3NrdTYwMTc0MDswOzM0MzQNCg==";

                  var initFileUploadToken = {
                      'method': 'PUT',
                      'headers': new Headers({
                          "Content-Type": "application/json",
                          "Authorization": "Bearer " + widget.getAdminToken()
                      }),
                      'body': JSON.stringify({
                          filename: fileList[0].name,
                          segments: 1,
                          uploadtype: "thirdPartyFile"
                      })
                  };

                  var generatedUploadToken;

                  fetch('/ccadminui/v1/files', initFileUploadToken)
                      .then(
                          function (response) {
                              if (response.ok === false) {
                                  spinner.destroy();
                                  notifier.sendError('THIRDPARTY_UPLOADER', response.status + ' - ' + response.statusText + ' = Error uploading new third party file!', true);
                                  document.getElementById('thirdpartyfileuploader').reset();
                                  return;
                              }
                              spinner.destroy();
                              return response.json();
                          })
                      .then(
                          function (myJSON) {
                              generatedUploadToken = myJSON.token;
                            //   console.log("-------------");
                            //   console.log(myJSON);
                            //   console.log(generatedUploadToken);
                            //   console.log("-------------");
                              notifier.sendSuccess('THIRDPARTY_UPLOADER', 'Successfully generated token "' + generatedUploadToken + '"', true);

                              doSegmentUploadPayload.token = generatedUploadToken;

                            //   console.log('=========');
                            //   console.log(JSON.stringify(doSegmentUploadPayload));
                            //   console.log('=========');

                              var initSendFile = {
                                  'method': 'POST',
                                  'headers': new Headers({
                                      "Content-Type": "application/json",
                                      "Authorization": "Bearer " + widget.getAdminToken()
                                  }),
                                  'body': JSON.stringify(doSegmentUploadPayload)
                              };

                              fetch('/ccadminui/v1/files/' + generatedUploadToken, initSendFile)
                                  .then(
                                      function (response2) {
                                          if (response2.ok === false) {
                                              notifier.sendError('THIRDPARTY_UPLOADER', response2.status + ' - ' + response2.statusText + ' = Error uploading new third party segment!', true);
                                              document.getElementById('thirdpartyfileuploader').reset();
                                              return;
                                          }
                                          notifier.sendSuccess('THIRDPARTY_UPLOADER', 'Successfully uploaded thirdy party file "' + fileList[0].name + '"', true);
                                        //   console.log('THIRDPARTY_UPLOADER SUCCESS');
                                        //   console.log(response2.body);
                                      })
                                  .catch(function (err) {
                                      notifier.sendError('THIRDPARTY_UPLOADER', err + ' = Error uploading third party file!', true);
                                      document.getElementById('thirdpartyfileuploader').reset();
                                  });
                              document.getElementById('thirdpartyfileuploader').reset();
                          }
                      )
                      .catch(function (err) {
                          spinner.destroy();
                          notifier.sendError('THIRDPARTY_UPLOADER', err + ' = Error uploading new third party file!', true);
                          document.getElementById('thirdpartyfileuploader').reset();
                      });

                  widget.listFiles();

                //   console.log("***** Finished Processing File ********");
              };
              reader.onerror = function (error) {
                //   console.log('Error reading file: ', error);
              };


          }
      };
  }
);
