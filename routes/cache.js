const NodeCache = require('node-cache')
let cache

const getCache = () => {
  if(cache) {
    return cache
  } else {
    cache = new NodeCache({stdTTL: 3600 * 24 * 7})
    return cache
  }
}

module.exports = getCache
