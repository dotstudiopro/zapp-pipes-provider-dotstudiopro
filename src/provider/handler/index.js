import { commands } from "./commands";
import { authenticate, safeJsonParse, getApiKey } from "./utils";

export const handler = nativeBridge => params => {
  // console.log("handler", { params, type, nativeBridge });
  const { type } = params;

  // acquire API key from Native Bridge appData() method
  const { pluginConfigurations } = nativeBridge.appData();
  // console.log("after setting config", JSON.stringify(pluginConfigurations));
  if (pluginConfigurations) {
    // console.log("with config");

    try {
      const parsedPluginConfiguration = safeJsonParse(pluginConfigurations);

      // console.log("parsedPluginConfiguration", parsedPluginConfiguration);
      const api_key = getApiKey(parsedPluginConfiguration);
      // console.log("api_key", api_key);

      return authenticate(nativeBridge, api_key)
        .then(authObj => {
          console.log("authObj", authObj);
          params.token = authObj.token;
          params.cdn = authObj.cdn;
          if (params.cdn.indexOf("https://") === -1){
            params.cdn = "https://" + params.cdn;
          }

          const SessionStorage = nativeBridge.SessionStorage();
          params.deviceWidth = SessionStorage.getItem("deviceWidth", "");
          params.deviceHeight = SessionStorage.getItem("deviceHeight", "");
          params.platform = SessionStorage.getItem("platform", "");
          params.deviceType = SessionStorage.getItem("deviceType", "");
          params.bundleIdentifier = SessionStorage.getItem("bundleIdentifier", "");
          params.advertisingIdentifier = SessionStorage.getItem("advertisingIdentifier", "");
          params.appName = SessionStorage.getItem("app_name", "");

          params.android_ad_tag = nativeBridge.getLocalStoreItem('android_ad_tag', 'dotstudiopro');
          params.ios_ad_tag = nativeBridge.getLocalStoreItem('ios_ad_tag', 'dotstudiopro');

          // console.log("Production build params:", params);

          return commands[type](params)
            .then(nativeBridge.sendResponse)
            .catch(nativeBridge.throwError);
        })
        .catch(nativeBridge.throwError);
    } catch (err) {
      parsedPluginConfiguration = pluginConfigurations;
    }
  } else {
    console.log("Development environment detecting, using fake data.");
    // development environment does not have pluginConfigurations, use hard coded API key
    return authenticate(
      nativeBridge,
      "566ee6d19fef04459d959b08349d6c07b3a309a2"
    )
      .then(authObj => {
        params.token = authObj.token;
        params.cdn = authObj.cdn;
        if (params.cdn.indexOf("https://") === -1){
          params.cdn = "https://" + params.cdn;
        }

        // dev build also missing nativeBridge.appData() method so hardcode this too
        params.deviceWidth = "1920";
        params.deviceHeight = "1080";
        params.platform = "android";
        params.deviceType = "phone";
        params.app_name = "Staging Environment";
        params.bundleIdentifier = "1234567890";
        params.advertisingIdentifier = "1234567890";
        params.android_ad_tag = "https://vid.springserve.com/vast/604131?w={{deviceWidth}}&h={{deviceHeight}}&cb={{cb}}&dnt=&app_bundle={{app_bundle}}&app_name={{app_name}}&us_privacy=&coppa=1";
        params.ios_ad_tag = "https://vid.springserve.com/vast/604130?w={{deviceWidth}}&h={{deviceHeight}}&cb={{cb}}&dnt=&app_bundle={{app_bundle}}&app_name={{app_name}}&us_privacy=&coppa=1";

        return commands[type](params)
          .then(nativeBridge.sendResponse)
          .catch(nativeBridge.throwError);
      })
      .catch(nativeBridge.throwError);
  }
};
