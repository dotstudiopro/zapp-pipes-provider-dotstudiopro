"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (params) {
  var token = params.token;
  var category = params.category,
      slug = params.slug,
      api_key = params.api_key;


  if (api_key) {
    var auth_url = "https://api.myspotlight.tv/token?key=" + api_key;

    return _axios2.default.post(auth_url).then(function (response) {
      if (response.data && response.data.success) {
        token = response.data.token;
        var url = "https://api.myspotlight.tv/channels/US/" + category + "/" + slug + "?token=" + token;
        return _axios2.default.get(url);
      } else {
        throw "Could not obtain access token from Spotlight API, please check your API Key";
      }
    }).then(function (response) {
      var channels = response.data.channels;

      if (channels) {
        return handleChannelResponse(channels, params);
      } else {
        throw "No channels found in category " + category;
      }
    }).catch(function (e) {
      console.log("Error in request ", e);
      Promise.reject(e);
    });
  } else if (token) {
    var url = "https://api.myspotlight.tv/channel/US/" + slug + "?token=" + token;
    return _axios2.default.get(url).then(function (response) {
      var channels = response.data.channels;

      if (channels) {
        return handleChannelResponse(channels, params);
      } else {
        throw "No channels found in category " + category;
      }
    }).catch(function (e) {
      return Promise.reject(e);
    });
  } else {
    Promise.reject("One of either API Key in query or Access Token in local storage is required");
  }
};

function handleChannelResponse(response, params) {
  var channel = response[0];

  var _id = channel._id,
      title = channel.title,
      description = channel.description,
      spotlight_poster = channel.spotlight_poster,
      poster = channel.poster;


  var returnObj = {
    id: _id,
    title: title,
    summary: description,
    media_group: [],
    type: {
      value: "feed"
    }
  };

  if (channel.spotlight_poster) {
    returnObj.media_group.push({
      type: "image",
      media_item: [{
        type: "image",
        key: "image_base",
        src: spotlight_poster
      }]
    });
  }

  if (poster) {
    returnObj.media_group.push({
      type: "image",
      media_item: [{
        type: "image",
        key: "poster",
        src: poster
      }]
    });
  }

  // single channel could contain one or multiple videos
  if (channel.playlist && channel.playlist.length) {
    var videos = channel.playlist.map(function (video) {
      return parseVideo(video, params);
    });
    returnObj.entry = videos;
    return returnObj;
  } else {
    var parsedVideo = parseVideo(channel.video, params);
    returnObj.entry = parsedVideo;
    return returnObj;
  }
}

function parseVideo(video, params) {
  var _id = video._id,
      title = video.title,
      description = video.description,
      thumb = video.thumb,
      company_id = video.company_id;
  var cdn = params.cdn;


  var video_ads = [];

  // calculate advertising array if video has ads
  if (video.ads) {
    var android_ad_tag = params.android_ad_tag,
        ios_ad_tag = params.ios_ad_tag,
        platform = params.platform;


    var ad_tag = platform === "android" ? android_ad_tag : ios_ad_tag;

    if (video.ads.pre && video.ads.pre === "yes") {
      video_ads.push({
        "offset": "preroll",
        "ad_url": "" + ad_tag
      });
    }

    if (video.ads.mid_offset && video.ads.mid_offset.offsets && video.ads.mid_offset.offsets.linear && video.ads.mid_offset.offsets.linear.length > 0) {
      video.ads.mid_offset.offsets.linear.map(function (offset) {
        video_ads.push({
          "offset": parseInt(offset).toString(),
          "ad_url": "" + ad_tag
        });
      });
    }

    if (video.ads.post && video.ads.post === "yes") {
      video_ads.push({
        "offset": "postroll",
        "ad_url": "" + ad_tag
      });
    }
  }

  var url = cdn + "/files/company/" + company_id + "/assets/videos/" + _id + "/vod/" + _id + ".m3u8";

  return {
    type: {
      value: "video"
    },
    id: _id,
    title: title,
    summary: description,
    media_group: [{
      type: "image",
      media_item: [{
        type: "image",
        key: "image_base",
        src: "https://images.dotstudiopro.com/" + thumb
      }]
    }],
    content: {
      type: "video/hls",
      src: url
    },
    extensions: {
      video_ads: video_ads
    }
  };
}