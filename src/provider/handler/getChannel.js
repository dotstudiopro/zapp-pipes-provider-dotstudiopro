import axios from "axios";

export default params => {
  let { token } = params;
  const { category, slug, api_key } = params;

  if (api_key) {
    const auth_url = `https://api.myspotlight.tv/token?key=${api_key}`;

    return axios
      .post(auth_url)
      .then(response => {
        if (response.data && response.data.success) {
          token = response.data.token;
          const url = `https://api.myspotlight.tv/channels/US/${category}/${slug}?token=${token}`;
          return axios.get(url);
        } else {
          throw "Could not obtain access token from Spotlight API, please check your API Key";
        }
      })
      .then(response => {
        const { channels } = response.data;
        if (channels) {
          return handleChannelResponse(channels, params);
        } else {
          throw "No channels found in category " + category;
        }
      })
      .catch(e => {
        console.log("Error in request ", e);
        Promise.reject(e);
      });
  } else if (token) {
    const url = `https://api.myspotlight.tv/channel/US/${slug}?token=${token}`;
    return axios
      .get(url)
      .then(response => {
        const { channels } = response.data;
        if (channels) {
          return handleChannelResponse(channels, params);
        } else {
          throw "No channels found in category " + category;
        }
      })
      .catch(e => Promise.reject(e));
  } else {
    Promise.reject(
      "One of either API Key in query or Access Token in local storage is required"
    );
  }
};

function handleChannelResponse(response, params) {
  const channel = response[0];

  const { _id, title, description, spotlight_poster, poster } = channel;

  const returnObj = {
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
      media_item: [
        {
          type: "image",
          key: "image_base",
          src: spotlight_poster
        }
      ]
    });
  }

  if (poster) {
    returnObj.media_group.push({
      type: "image",
      media_item: [
        {
          type: "image",
          key: "poster",
          src: poster
        }
      ]
    });
  }

  // single channel could contain one or multiple videos
  if (channel.playlist && channel.playlist.length) {
    const videos = channel.playlist.map(video => parseVideo(video, params));
    returnObj.entry = videos;
    return returnObj;
  } else {
    const parsedVideo = parseVideo(channel.video, params);
    returnObj.entry = parsedVideo;
    return returnObj;
  }
}

function parseVideo(video, params) {
  const { _id, title, description, thumb, company_id } = video;
  const { cdn } = params;

  const video_ads = [];

  // calculate advertising array if video has ads
  if (video.ads) {
    const { android_ad_tag, ios_ad_tag, platform } = params;

    const ad_tag = platform === "android" ? android_ad_tag : ios_ad_tag;

    if (video.ads.pre && video.ads.pre === "yes") {
      video_ads.push({
        "offset": "preroll",
        "ad_url": `${ad_tag}`
      })
    }

    if (video.ads.mid_offset && video.ads.mid_offset.offsets && video.ads.mid_offset.offsets.linear && video.ads.mid_offset.offsets.linear.length > 0) {
      video.ads.mid_offset.offsets.linear.map((offset) => {
        video_ads.push({
          "offset": parseInt(offset).toString(),
          "ad_url": `${ad_tag}`
        })
      });
    }

    if (video.ads.post && video.ads.post === "yes") {
      video_ads.push({
        "offset": "postroll",
        "ad_url": `${ad_tag}`
      })
    }
  }

  const url = `${cdn}/files/company/${company_id}/assets/videos/${_id}/vod/${_id}.m3u8`;

  return {
    type: {
      value: "video"
    },
    id: _id,
    title,
    summary: description,
    media_group: [
      {
        type: "image",
        media_item: [
          {
            type: "image",
            key: "image_base",
            src: "https://images.dotstudiopro.com/" + thumb
          }
        ]
      }
    ],
    content: {
      type: "video/hls",
      src: url
    },
    extensions: {
      video_ads: video_ads
    }
  };

}
