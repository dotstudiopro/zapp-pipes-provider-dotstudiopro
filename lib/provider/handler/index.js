"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handler = undefined;

var _commands = require("./commands");

var _utils = require("./utils");

var handler = exports.handler = function handler(nativeBridge) {
  return function (params) {
    // console.log("handler", { params, type, nativeBridge });
    var type = params.type;

    // acquire API key from Native Bridge appData() method

    var _nativeBridge$appData = nativeBridge.appData(),
        pluginConfigurations = _nativeBridge$appData.pluginConfigurations;
    // console.log("after setting config", JSON.stringify(pluginConfigurations));


    if (pluginConfigurations) {
      // console.log("with config");

      try {
        var _parsedPluginConfiguration = (0, _utils.safeJsonParse)(pluginConfigurations);

        // console.log("parsedPluginConfiguration", parsedPluginConfiguration);
        var api_key = (0, _utils.getApiKey)(_parsedPluginConfiguration);
        // console.log("api_key", api_key);

        return (0, _utils.authenticate)(nativeBridge, api_key).then(function (authObj) {
          console.log("authObj", authObj);
          params.token = authObj.token;
          params.cdn = authObj.cdn;
          if (params.cdn.indexOf("https://") === -1) {
            params.cdn = "https://" + params.cdn;
          }

          var appData = nativeBridge.appData();
          params.deviceWidth = appData.deviceWidth;
          params.deviceHeight = appData.deviceHeight;
          params.platform = appData.platform;
          params.deviceType = appData.deviceType;
          params.android_ad_tag = nativeBridge.getLocalStoreItem('android_ad_tag');
          params.ios_ad_tag = nativeBridge.getLocalStoreItem('ios_ad_tag');

          // console.log("Production build params:", params);

          return _commands.commands[type](params).then(nativeBridge.sendResponse).catch(nativeBridge.throwError);
        }).catch(nativeBridge.throwError);
      } catch (err) {
        parsedPluginConfiguration = pluginConfigurations;
      }
    } else {
      console.log("dev");
      // development environment does not have pluginConfigurations, use hard coded API key
      return (0, _utils.authenticate)(nativeBridge, "566ee6d19fef04459d959b08349d6c07b3a309a2").then(function (authObj) {
        params.token = authObj.token;
        params.cdn = authObj.cdn;
        if (params.cdn.indexOf("https://") === -1) {
          params.cdn = "https://" + params.cdn;
        }

        // dev build also missing nativeBridge.appData() method so hardcode this too
        params.deviceWidth = "1920";
        params.deviceHeight = "1080";
        params.platform = "android";
        params.deviceType = "phone";
        params.android_ad_tag = "http://adserver.dotstudiopro.com/adserver/www/delivery/fc.php?script=apVideo:vast2&zoneid=1152&cb=15031039373734338&mp4=true";
        params.ios_ad_tag = "http://adserver.dotstudiopro.com/adserver/www/delivery/fc.php?script=apVideo:vast2&zoneid=1152&cb=15031039373734338&mp4=true";

        return _commands.commands[type](params).then(nativeBridge.sendResponse).catch(nativeBridge.throwError);
      }).catch(nativeBridge.throwError);
    }
  };
};