"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (params) {
  var token = params.token;
  var api_key = params.api_key;


  if (api_key) {
    var auth_url = "https://api.myspotlight.tv/token?key=" + api_key;

    return _axios2.default.post(auth_url).then(function (response) {
      if (response.data && response.data.success) {
        token = response.data.token;
        var url = "https://api.myspotlight.tv/categories/US?platform=applicaster&token=" + token;
        return _axios2.default.get(url);
      } else {
        throw "Could not obtain access token from Spotlight API, please check your API Key";
      }
    }).then(function (response) {
      var categories = response.data.categories;

      if (categories) {
        return handleCategoriesResponse(categories, params);
      } else {
        throw "No categories set for distrubtion to Applicaster";
      }
    }).catch(function (e) {
      return Promise.reject(e);
    });
  } else if (token) {
    var url = "https://api.myspotlight.tv/categories/US?platform=applicaster&token=" + token;
    return _axios2.default.get(url).then(function (response) {
      var categories = response.data.categories;

      if (categories) {
        return handleCategoriesResponse(categories, params);
      } else {
        throw "No categories set for distrubtion to Applicaster";
      }
    }).catch(function (e) {
      return Promise.reject(e);
    });
  } else {
    Promise.reject("One of either API Key in query or Access Token in local storage is required");
  }
};

function handleCategoriesResponse(response) {
  var rawData = response;
  var categories = rawData.map(function (category) {
    return parseCategory(category);
  });

  return {
    id: 'categories',
    title: 'Categories',
    type: {
      value: 'feed'
    },
    entry: categories
  };
}

function parseCategory(category) {
  var _id = category._id,
      name = category.name,
      slug = category.slug,
      display_name = category.display_name;


  var returnObj = {
    type: {
      value: 'feed'
    },
    id: _id,
    title: display_name ? display_name : name,
    media_group: [],
    extensions: {},
    content: {
      type: 'atom',
      rel: 'self',
      src: "dotstudiopro://fetchData?type=channels&category=" + slug //formatted url to retrieve this category's channels inside the Zapp app
    },
    link: {
      rel: 'self',
      type: 'feed',
      href: "dotstudiopro://fetchData?type=channels&category=" + slug
    }
  };

  if (category.image && category.image.poster) {
    returnObj.media_group[0] = {
      "type": "image",
      "media_item": [{
        "type": "image",
        "key": "image_base",
        "src": category.image.poster
      }]
    };
  }

  return returnObj;
}