import axios from 'axios';

export default (params) => {
  let { token } = params;
  const { api_key } = params;

  if (api_key) {
    const auth_url = `https://api.myspotlight.tv/token?key=${api_key}`;

    return axios.post(auth_url)
      .then((response) => {
        if (response.data && response.data.success) {
          token = response.data.token;
          const url = `https://api.myspotlight.tv/categories/US?platform=applicaster&token=${token}`;
          return axios.get(url)
        } else {
          throw "Could not obtain access token from Spotlight API, please check your API Key";
        }
      })
      .then((response) => {
        const {
          categories
        } = response.data;
        if (categories) {
          return handleCategoriesResponse(categories, params);
        } else {
          throw "No categories set for distrubtion to Applicaster";
        }
      })
      .catch(e => Promise.reject(e));
  } else if (token) {
    const url = `https://api.myspotlight.tv/categories/US?platform=applicaster&token=${token}`;
    return axios.get(url)
      .then((response) => {
        const {
          categories
        } = response.data;
        if (categories) {
          return handleCategoriesResponse(categories, params);
        } else {
          throw "No categories set for distrubtion to Applicaster";
        }
      })
      .catch(e => Promise.reject(e));
  } else {
    Promise.reject("One of either API Key in query or Access Token in local storage is required")
  }
};

function handleCategoriesResponse(response) {
  const rawData = response;
  const categories = rawData.map(category => parseCategory(category));

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
  const {
    _id,
    name,
    slug,
    display_name
  } = category;

  const returnObj = {
    type: {
      value: 'feed'
    },
    id: _id,
    title: display_name ? display_name :name,
    media_group: [],
    extensions: {},
    content: {
      type: 'atom',
      rel: 'self',
      src: `dotstudiopro://fetchData?type=channels&category=${slug}` //formatted url to retrieve this category's channels inside the Zapp app
    },
    link: {
      rel: 'self',
      type: 'feed',
      href: `dotstudiopro://fetchData?type=channels&category=${slug}`
    }
  }

  if (category.image && category.image.poster) {
    returnObj.media_group[0] = {
      "type": "image",
      "media_item": [{
        "type": "image",
        "key": "image_base",
        "src": category.image.poster
      }]
    }
  }

  return returnObj;
}