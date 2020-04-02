"use strict";

var moment = require("moment");
var axios = require("axios");
var jwt = require("jsonwebtoken");

// axios.defaults.headers.post["Content-Type"] = "application/json";

function safeJsonParse(obj) {
  try {
    return JSON.parse(obj);
  } catch (e) {
    return obj;
  }
}

function getApiKey(pluginConfiguration) {
  if (pluginConfiguration.api_key) {
    return pluginConfiguration.api_key;
  }

  if (pluginConfiguration.dotstudiopro && pluginConfiguration.dotstudiopro.api_key) {
    return pluginConfiguration.dotstudiopro.api_key;
  }

  return "566ee6d19fef04459d959b08349d6c07b3a309a2";
}

var authenticate = function authenticate(nativeBridge, api_key) {
  console.log("authenticating", nativeBridge, api_key);

  return new Promise(function (resolve, reject) {
    var token = safeJsonParse(nativeBridge.getLocalStoreItem("token", "dotstudiopro"));
    var expires = safeJsonParse(nativeBridge.getLocalStoreItem("expiry", "dotstudiopro"));
    var cdn = safeJsonParse(nativeBridge.getLocalStoreItem("cdn", "dotstudiopro"));

    // console.log("auth promise resolves", { token, expires, cdn });

    // if we have a token check to make sure it's not expired first
    if (token && token.length && expires && expires.length) {
      var decoded = jwt.decode(token);
      var now = moment();

      if (now > decoded.expires) {
        //need to get a new token here
        console.log("Current available token is expired, getting a new one.");
        getAccessToken(api_key, function (err, authObj) {
          if (err) reject(err);

          var token = authObj.token,
              expires = authObj.expires,
              cdn = authObj.cdn,
              android_ad_tag = authObj.android_ad_tag,
              ios_ad_tag = authObj.ios_ad_tag;

          nativeBridge.setLocalStoreItem("api_key", api_key, "dotstudiopro");
          nativeBridge.setLocalStoreItem("token", token, "dotstudiopro"); //x-access-token
          nativeBridge.setLocalStoreItem("expiry", expires, "dotstudiopro");
          nativeBridge.setLocalStoreItem("cdn", cdn, "dotstudiopro");
          nativeBridge.setLocalStoreItem("android_ad_tag", android_ad_tag, "dotstudiopro");
          nativeBridge.setLocalStoreItem("ios_ad_tag", ios_ad_tag, "dotstudiopro");

          resolve(authObj);
        });
      } else {
        // return whatever is in session storage since it's still valid
        console.log("The current token is still valid");
        resolve({ token: token, expires: expires, cdn: cdn });
      }
    } else {
      console.log("No token in local storage, getting a new one.");
      getAccessToken(api_key, function (err, authObj) {
        if (err) return reject(err);

        var token = authObj.token,
            expires = authObj.expires,
            cdn = authObj.cdn,
            android_ad_tag = authObj.android_ad_tag,
            ios_ad_tag = authObj.ios_ad_tag;

        nativeBridge.setLocalStoreItem("api_key", api_key, "dotstudiopro");
        nativeBridge.setLocalStoreItem("token", token, "dotstudiopro");
        nativeBridge.setLocalStoreItem("expiry", expires, "dotstudiopro");
        nativeBridge.setLocalStoreItem("cdn", cdn, "dotstudiopro");
        nativeBridge.setLocalStoreItem("android_ad_tag", android_ad_tag, "dotstudiopro");
        nativeBridge.setLocalStoreItem("ios_ad_tag", ios_ad_tag, "dotstudiopro");

        resolve(authObj);
      });
    }
  });
};

// Acquires an access token and company CDN value from Spotlight API
function getAccessToken(api_key, cb) {
  var returnObj = {};
  // console.log("calling post on auth", api_key);

  axios.post("https://api.myspotlight.tv/token", { key: api_key }).then(function (response) {
    if (response.data.success) {
      var token = response.data.token;

      returnObj.token = token;
      // decode token to save it's expiry time
      var decoded = jwt.decode(token);
      returnObj.expires = decoded.expires;
      return axios.get("https://api.myspotlight.tv/companies/applicaster-config?token=" + token);
    } else {
      return cb("Cannot obtain access token from Spotlight API", null);
    }
  }).then(function (response) {
    returnObj.cdn = response.data.custom_cdn;
    returnObj.android_ad_tag = response.data.applicaster_tags.android || "";
    returnObj.ios_ad_tag = response.data.applicaster_tags.ios || "";
    return cb(null, returnObj);
  }).catch(function (error) {
    console.log("error from post");
    cb(error, null);
  });
}

function parseDate(date, format) {
  var event = moment(date, format);
  return event.format("YYYY-MM-DD");
}

function urlEncode(url) {
  return "maccabi://present?linkUrl=" + encodeURIComponent(url) + "&showContext=true";
}

function sliceWrap(list) {
  var payload_size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var validator = arguments[2];

  if (payload_size > list.length) return list;
  var validatedItemId = validator ? list.findIndex(validator) : 0;
  var extraItemsLeft = Math.floor((payload_size - 1) / 2);
  var extraItemsRight = Math.ceil((payload_size - 1) / 2);
  var leftOutOfBound = extraItemsLeft > validatedItemId ? Math.abs(validatedItemId - extraItemsLeft) : 0;
  var rightOutOfBound = extraItemsRight > list.length - 1 - validatedItemId ? Math.abs(list.length - 1 - validatedItemId - extraItemsRight) : 0;
  var left = extraItemsLeft - leftOutOfBound + rightOutOfBound;
  var right = extraItemsRight - rightOutOfBound + leftOutOfBound;
  return list.slice(validatedItemId - left, validatedItemId + right + 1);
}

function compareTimes(a, b) {
  var A = moment(a, "YYYY/MM/DD HH:mm:ss Z");
  var B = moment(b, "YYYY/MM/DD HH:mm:ss Z");
  if (A.isSame(B)) return 0;
  return A.isBefore(B) ? -1 : 1;
}

module.exports = {
  authenticate: authenticate,
  parseDate: parseDate,
  urlEncode: urlEncode,
  sliceWrap: sliceWrap,
  compareTimes: compareTimes,
  safeJsonParse: safeJsonParse,
  getApiKey: getApiKey
};