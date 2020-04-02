const moment = require("moment");
const axios = require("axios");
const jwt = require("jsonwebtoken");

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

  if (
    pluginConfiguration.dotstudiopro &&
    pluginConfiguration.dotstudiopro.api_key
  ) {
    return pluginConfiguration.dotstudiopro.api_key;
  }

  return "566ee6d19fef04459d959b08349d6c07b3a309a2";
}

var authenticate = function(nativeBridge, api_key) {
  console.log("authenticating", nativeBridge, api_key);

  return new Promise(function(resolve, reject) {
    const token = safeJsonParse(
      nativeBridge.getLocalStoreItem("token", "dotstudiopro")
    );
    const expires = safeJsonParse(
      nativeBridge.getLocalStoreItem("expiry", "dotstudiopro")
    );
    const cdn = safeJsonParse(
      nativeBridge.getLocalStoreItem("cdn", "dotstudiopro")
    );

    // console.log("auth promise resolves", { token, expires, cdn });

    // if we have a token check to make sure it's not expired first
    if (token && token.length && expires && expires.length) {
      var decoded = jwt.decode(token);
      var now = moment();

      if (now > decoded.expires) {
        //need to get a new token here
        console.log("Current available token is expired, getting a new one.");
        getAccessToken(api_key, function(err, authObj) {
          if (err) reject(err);

          const { token, expires, cdn, android_ad_tag, ios_ad_tag } = authObj;
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
        resolve({ token, expires, cdn });
      }
    } else {
      console.log("No token in local storage, getting a new one.");
      getAccessToken(api_key, function(err, authObj) {
        if (err) return reject(err);

        const { token, expires, cdn, android_ad_tag, ios_ad_tag } = authObj;
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
  const returnObj = {};
  // console.log("calling post on auth", api_key);

  axios
    .post("https://api.myspotlight.tv/token", { key: api_key })
    .then(response => {
      if (response.data.success) {
        const { token } = response.data;
        returnObj.token = token;
        // decode token to save it's expiry time
        var decoded = jwt.decode(token);
        returnObj.expires = decoded.expires;
        return axios.get(
          `https://api.myspotlight.tv/companies/applicaster-config?token=${token}`
        );
      } else {
        return cb("Cannot obtain access token from Spotlight API", null);
      }
    })
    .then(response => {
      returnObj.cdn = response.data.custom_cdn;
      returnObj.android_ad_tag = response.data.applicaster_tags.android || "";
      returnObj.ios_ad_tag = response.data.applicaster_tags.ios || "";
      return cb(null, returnObj);
    })
    .catch(function(error) {
      console.log("error from post");
      cb(error, null);
    });
}

function parseDate(date, format) {
  const event = moment(date, format);
  return event.format("YYYY-MM-DD");
}

function urlEncode(url) {
  return `maccabi://present?linkUrl=${encodeURIComponent(
    url
  )}&showContext=true`;
}

function sliceWrap(list, payload_size = 1, validator) {
  if (payload_size > list.length) return list;
  const validatedItemId = validator ? list.findIndex(validator) : 0;
  const extraItemsLeft = Math.floor((payload_size - 1) / 2);
  const extraItemsRight = Math.ceil((payload_size - 1) / 2);
  const leftOutOfBound =
    extraItemsLeft > validatedItemId
      ? Math.abs(validatedItemId - extraItemsLeft)
      : 0;
  const rightOutOfBound =
    extraItemsRight > list.length - 1 - validatedItemId
      ? Math.abs(list.length - 1 - validatedItemId - extraItemsRight)
      : 0;
  const left = extraItemsLeft - leftOutOfBound + rightOutOfBound;
  const right = extraItemsRight - rightOutOfBound + leftOutOfBound;
  return list.slice(validatedItemId - left, validatedItemId + right + 1);
}

function compareTimes(a, b) {
  const A = moment(a, "YYYY/MM/DD HH:mm:ss Z");
  const B = moment(b, "YYYY/MM/DD HH:mm:ss Z");
  if (A.isSame(B)) return 0;
  return A.isBefore(B) ? -1 : 1;
}

module.exports = {
  authenticate,
  parseDate,
  urlEncode,
  sliceWrap,
  compareTimes,
  safeJsonParse,
  getApiKey
};
