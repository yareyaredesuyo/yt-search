(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ytSearch = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// basic streamlined xhr request for browser and server
var client = {
  follow: true,
  // auto-follow redirects
  mode: 'auto' // possible values: 'auto', 'node', 'browser'

}; // use this require hack so that bundlers don't automatically bundle
// node's http library within exported bundles

var require_ = require;

var _request = function _request() {
  throw new Error('dasu: no _request implementation found!');
};

if (typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined') {// use XMLHttpRequest
}

function browserRequest(opts, dataString, callback) {
  client._mode = 'browser';
  var req = new window.XMLHttpRequest();
  if (!window) throw new Error('no global browser "window" object found.');
  if (!window.location) throw new Error('no global browser "window.location" object found.');
  opts.protocol = opts.protocol || window.location.protocol || 'http';
  if (opts.protocol[opts.protocol.length - 1] !== ':') opts.protocol += ':'; // opts.host = opts.host || window.location.host

  opts.hostname = opts.hostname || opts.host || window.location.hostname;
  var defaultPort = 80; // default port based off of protocol

  if (opts.protocol) {
    if (opts.protocol.indexOf('https') !== -1) {
      defaultPort = 443;
    } else {
      defaultPort = 80;
    }
  } // if requesting current domain, assume by default the same port


  var ohn = opts.hostname.toLowerCase().trim();
  var whn = window.location.hostname.toLowerCase().trim();
  if (ohn.indexOf(whn) !== -1) defaultPort = window.location.port || defaultPort;
  opts.port = opts.port || defaultPort;
  var origin = opts.protocol + '//' + (opts.hostname + (opts.port ? ':' + opts.port : '')); // XMLHttpRequest takes a complete url (not host and path separately)

  var url = origin + opts.path;

  if (client.debug) {
    console.log('dasu: url [' + url + ']');
  }

  if (client.debug) {
    console.log('--- dasu opts ---');
    console.log(opts);
    console.log();
  }

  req.open(opts.method, url, true);

  req.onload = function () {
    callback(null, req, req.responseText);
  };

  req.onerror = function () {
    var desc = '' + opts.method.toUpperCase() + ' ' + url;
    var err = {
      name: 'NetworkError',
      message: req.responseText || 'NetworkError: XMLHttpRequest (' + desc + ')',
      desc: desc,
      url: url,
      opts: opts,
      data: dataString,
      origin: origin,
      responseText: req.responseText
    };

    err.toString = function () {
      return err.message + '\n' + JSON.stringify(opts, null, 2).split(',');
    };

    err.message = err.toString();
    callback(err);
  }; // attach headers to the request
  // console.log(opts.headers)


  var headerKeys = Object.keys(opts.headers);

  for (var i = 0; i < headerKeys.length; i++) {
    var key = headerKeys[i].toLowerCase();
    var value = opts.headers[key];
    req.setRequestHeader(key, value); // console.log("set header: %s, to: %s", key, value)
  }

  try {
    req.send(dataString);
  } catch (err) {
    var desc = '' + opts.method.toUpperCase() + ' ' + url;
    err.desc = desc;
    err.url = url;
    err.opts = opts;
    err.data = dataString;
    err.origin = origin;

    err.toString = function () {
      return err.message + '\n' + JSON.stringify(opts, null, 2).split(',');
    };

    callback(err);
  } // return minimal api to abort


  return {
    abort: function abort() {
      req.abort();
    }
  };
}

function nodeRequest(opts, dataString, callback) {
  client._mode = 'node'; // assume in nodejs environment, use nodejs core http lib

  var http = require_('http');
  var https = require_('https');
  var zlib = require_('zlib');
  opts = opts || {};
  opts.hostname = opts.hostname || opts.host; // alias opts.host to opts.hostname

  opts.protocol = opts.protocol || 'http';
  var _h = http;
  if (opts.protocol && opts.protocol.indexOf('https') !== -1) _h = https;
  if (opts.protocol[opts.protocol.length - 1] !== ':') opts.protocol += ':';

  if (client.debug) {
    console.log('--- dasu opts ---');
    console.log(opts);
    console.log();
  }

  var req = _h.request(opts, function (res) {
    var buffer = [];
    var stream = res; // brotli support

    if (zlib.createBrotliDecompress && res.headers['content-encoding'] === 'br') {
      var bunzip = zlib.createBrotliDecompress();
      stream = bunzip;
      res.pipe(bunzip);
    } // gzip support


    if (zlib.createGunzip && res.headers['content-encoding'] === 'gzip') {
      var gunzip = zlib.createGunzip();
      stream = gunzip;
      res.pipe(gunzip);
    } // deflate support


    if (zlib.createDeflate && res.headers['content-encoding'] === 'deflate') {
      var deflate = zlib.createDeflate();
      stream = deflate;
      res.pipe(deflate);
    }

    var contentType = res.headers['content-type'];

    if (contentType) {
      if (contentType.indexOf('text/') >= 0) {
        if (contentType.indexOf('ascii') >= 0) {
          stream.setEncoding('ascii');
        } else {
          stream.setEncoding('utf8');
        }
      } else {
        stream.setEncoding('binary');
      }
    } else {
      stream.setEncoding('binary');
    }

    stream.on('data', function (chunk) {
      buffer.push(chunk);
    });
    stream.on('end', function () {
      var body = buffer.join('');
      res.responseText = res.responseText || body;
      callback(null, res, body);
    });
  });

  req.on('error', function (err) {
    var origin = opts.protocol + '//' + (opts.hostname + (opts.port ? ':' + opts.port : ''));
    var url = origin + opts.path;
    var desc = '' + opts.method.toUpperCase() + ' ' + url;
    err.desc = desc;
    err.url = url;
    err.opts = opts;
    err.data = dataString;
    err.origin = origin;

    err.toString = function () {
      return err.message + '\n' + JSON.stringify(opts, null, 2).split(',');
    };

    err.message = err.toString();
    callback(err);
  });

  if (client.debug) {
    console.log('dasu typeof dataString: ' + _typeof(dataString));
    dataString && dataString.length >= 0 && console.log('dasu sending length: ' + dataString.length);
  }

  req.write(dataString);
  req.end(); // return minimal api to abort

  return {
    abort: function abort() {
      req.abort();
    }
  };
}

function request(params, done) {
  var _currentMode;

  if (client.mode === 'browser' || client.mode !== 'node' && typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined') {
    _currentMode = 'browser';
    _request = browserRequest;
  } else {
    _currentMode = 'node';
    _request = nodeRequest;
  }

  if (typeof params === 'string') {
    // shorthand for GET request
    var parsedUrl;

    if (typeof URL !== 'undefined') {
      parsedUrl = new URL(params);
    } else {
      parsedUrl = require_('url').parse(params);
    }

    if (_typeof(parsedUrl) !== 'object') {
      throw new Error('failed to parse params shorthand: ' + params);
    }

    params = {};
    params.method = 'GET';
    params.protocol = parsedUrl.protocol;
    params.host = parsedUrl.host;
    params.hostname = parsedUrl.hostname;
    params.port = parsedUrl.port;
    params.path = parsedUrl.path || parsedUrl.pathname;
  }

  var contentType = '';
  var data = params.data || params.json || '';
  var dataString = '';

  switch (_typeof(data)) {
    case 'object':
      // make sure we only convert simple objects and not for example Buffer objects
      if (data.toString === {}.toString) {
        dataString = JSON.stringify(data);
        contentType = 'application/json';
      } else {
        if (client.debug) {
          console.log('dasu: complex object data');
        }

        dataString = data;
        contentType = 'application/octet-stream';
      }

      break;

    case 'string':
      if (data.length > 1 && (data[0] === '{' || data[0] === '[')) {
        try {
          // could be json
          JSON.parse(data); // throws error on fail

          if (console && console.warn) {
            console.warn('[WARNING] dasu: Sending data that may be JSON as text/plain');
          } else {
            console.log('[WARNING] dasu: Sending data that may be JSON as text/plain');
          }
        } catch (err) {} // text was not parsed as json, ignore and assume text/plain

      }

      dataString = data;
      contentType = 'text/plain';
      break;

    default:
      // try coercion as a last resort
      dataString = '' + data;
      contentType = 'text/plain';
  } // console.log('dataString: ' + dataString)
  // console.log("rest: contentType: " + contentType)


  params = Object.assign({}, params);
  delete params.data; // try to add content-type if it doesn't exist

  if (contentType) {
    params.headers = Object.assign({}, {
      'content-type': contentType
    }, params.headers || {}); // set content-length if it doesn't already exist

    if (contentType === 'application/octet-stream' && dataString && dataString.length) {
      params.headers = Object.assign({}, {
        'content-length': dataString.length
      }, params.headers || {});
    }
  } // delete params.headers[ 'content-type' ]
  // console.log("rest: headers: " + JSON.stringify(params.headers))
  // set default method


  params.method = params.method || 'GET'; // default path

  params.path = params.path || '/'; // people often emit leading '/' - so support it

  if (params.path[0] !== '/') {
    params.path = '/' + params.path;
  }
  /*
   * set default protocl based off of port number
   */


  var defaultProtocol = 'http';

  if (params.port) {
    var n = Number(params.port); // convert params.port to a Number

    if (String(n) === params.port) {
      params.port = n;
    }

    if (params.port === 443) {
      defaultProtocol = 'https';
    }
  }

  if (!params.protocol) {
    params.protocol = defaultProtocol;
  } // delete params.protocol // TODO debug delete this


  var opts = {
    protocol: params.protocol,
    host: params.host,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    // attach root path
    method: params.method,
    headers: params.headers
  };
  var redirectCount = 0;
  var REDIRECT_LIMIT = 3; // log responses (and reset last)

  client.log = ''; // uses XMLHttpRequest if available, else nodejs http/https library

  return _request(opts, dataString, reqCallback);

  function reqCallback(err, res, body) {
    if (err || res === undefined) {
      done(err);
    } else {
      // homogenize response headers
      if (!res.getResponseHeader && res.headers) {
        res.getResponseHeader = function (header) {
          return res.headers[header];
        };
      }

      if (res.getAllResponseHeaders && !res.headers) {
        res.headers = res.getAllResponseHeaders();
      }

      if (!res.getAllResponseHeaders && res.headers) {
        res.getAllResponseHeaders = function () {
          return res.headers;
        };
      } // homogenize response status


      if (res.status === undefined) {
        res.status = res.statusCode;
      } else {
        res.statusCode = res.status;
      }

      if (client.debug) {
        client.log += '\n-------------\n';
        client.log += new Date();
        client.log += 'headers:\n' + JSON.stringify(res.headers, null, 2) + '\n\n';
        client.log += 'body:\n' + body + '\n';
      }

      if (client.follow && res.status >= 300 && res.status < 400 && res.headers['location'] && redirectCount < REDIRECT_LIMIT) {
        redirectCount++;
        var loc = res.headers['location'];

        if (loc.slice(0, 2) === '//') {
          loc = params.protocol + ':' + loc;
        }

        if (loc[0] === '/') {
          // path only
          opts.path = loc;
          return _request(opts, dataString, reqCallback);
        }

        var parsedUrl;

        if (typeof URL !== 'undefined') {
          parsedUrl = new URL(loc);
        } else {
          if (_currentMode === 'node') {
            parsedUrl = require_('url').parse(loc);
          }
        }

        if (client.debug) {
          if (_currentMode === 'node') {
            try {
              var fs = require_('fs');
              fs.writeFileSync('debug.dasu-response.log', client.log, 'utf8');
            } catch (err) {
              /* ignore */
            }
          } else {
            console.log(client.log);
          }
        }

        if (parsedUrl) {
          opts.protocol = parsedUrl.protocol && parsedUrl.protocol;
          opts.host = parsedUrl.host && parsedUrl.host;
          opts.hostname = parsedUrl.hostname && parsedUrl.hostname;
          opts.port = parsedUrl.port && parsedUrl.port;
          opts.path = parsedUrl.path && parsedUrl.pathname;
          return _request(opts, dataString, reqCallback);
        }
      }

      done(undefined, res, body);
    }
  }
}

client.xhr = function (params, done) {
  request(params, function (err, res, body) {
    done(err, body);
  });
};

client.req = request;
module.exports = client;

},{}],2:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _cheerio = require('cheerio');

var _dasu = require('./dasu'); // const _parallel = require( 'async.parallellimit' )
// auto follow off


_dasu.follow = false;
_dasu.debug = false;

var _require = require('./util.js'),
    _getScripts = _require._getScripts,
    _findLine = _require._findLine,
    _between = _require._between;

var _jp = require('jsonpath'); // google bot user-agent
// Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
// use fixed user-agent to get consistent html page documents as
// it varies depending on the user-agent
// the string "Googlebot" seems to give us pages without
// warnings to update our browser, which is why we keep it in


var DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) (yt-search; https://www.npmjs.com/package/yt-search)';
var _userAgent = DEFAULT_USER_AGENT; // mutable global user-agent

var _url = require('url');

var _envs = {};
Object.keys(process.env).forEach(function (key) {
  var n = process.env[key];

  if (n == '0' || n == 'false' || !n) {
    return _envs[key] = false;
  }

  _envs[key] = n;
});
var _debugging = _envs.debug;

function debug() {
  if (!_debugging) return;
  console.log.apply(this, arguments);
} // used to escape query strings


var _querystring = require('querystring');

var _humanTime = require('human-time');

var TEMPLATES = {
  YT: 'https://youtube.com',
  SEARCH_MOBILE: 'https://m.youtube.com/results',
  SEARCH_DESKTOP: 'https://www.youtube.com/results'
};
var ONE_SECOND = 1000;
var ONE_MINUTE = ONE_SECOND * 60;
var TIME_TO_LIVE = ONE_MINUTE * 5;
/**
 * Exports
 **/

module.exports = function (query, callback) {
  return search(query, callback);
};

module.exports.search = search;
/**
 * Main
 */

function search(query, callback) {
  // support promises when no callback given
  if (!callback) {
    return new Promise(function (resolve, reject) {
      search(query, function (err, data) {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  var _options;

  if (typeof query === 'string') {
    _options = {
      query: query
    };
  } else {
    _options = query;
  } // override userAgent if set ( not recommended )


  if (_options.userAgent) _userAgent = _options.userAgent; // support common alternatives ( mutates )

  _options.search = _options.query || _options.search; // initial search text ( _options.search is mutated )

  _options.original_search = _options.search; // ignore query, only get metadata from specific video id

  if (_options.videoId) {
    return getVideoMetaData(_options.videoId, callback);
  } // ignore query, only get metadata from specific playlist id


  if (_options.listId) {
    return getPlaylistMetaData(_options.listId, callback);
  }

  if (!_options.search) {
    return callback(Error('yt-search: no query given'));
  }

  work();

  function work() {
    getSearchResults(_options, callback);
  }
}

function _videoFilter(video, index, videos) {
  if (video.type !== 'video') return false; // filter duplicates

  var videoId = video.videoId;
  var firstIndex = videos.findIndex(function (el) {
    return videoId === el.videoId;
  });
  return firstIndex === index;
}

function _playlistFilter(result, index, results) {
  if (result.type !== 'list') return false; // filter duplicates

  var id = result.listId;
  var firstIndex = results.findIndex(function (el) {
    return id === el.listId;
  });
  return firstIndex === index;
}

function _channelFilter(result, index, results) {
  if (result.type !== 'channel') return false; // filter duplicates

  var url = result.url;
  var firstIndex = results.findIndex(function (el) {
    return url === el.url;
  });
  return firstIndex === index;
}

function _liveFilter(result, index, results) {
  if (result.type !== 'live') return false; // filter duplicates

  var videoId = result.videoId;
  var firstIndex = results.findIndex(function (el) {
    return videoId === el.videoId;
  });
  return firstIndex === index;
}

function _allFilter(result, index, results) {
  switch (result.type) {
    case 'video':
    case 'list':
    case 'channel':
    case 'live':
      break;

    default:
      // unsupported type
      return false;
  } // filter duplicates


  var url = result.url;
  var firstIndex = results.findIndex(function (el) {
    return url === el.url;
  });
  return firstIndex === index;
}
/* Request search page results with provided
 * search_query term
 */


function getSearchResults(_options, callback) {
  // querystring variables
  var q = _querystring.escape(_options.search).split(/\s+/);

  var hl = _options.hl || 'en';
  var gl = _options.gl || 'US';
  var category = _options.category || ''; // music

  var pageStart = Number(_options.pageStart) || 1;
  var pageEnd = Number(_options.pageEnd) || Number(_options.pages) || 1; // handle zero-index start

  if (pageStart <= 0) {
    pageStart = 1;

    if (pageEnd >= 1) {
      pageEnd += 1;
    }
  }

  if (Number.isNaN(pageEnd)) {
    callback('error: pageEnd must be a number');
  }

  _options.pageStart = pageStart;
  _options.pageEnd = pageEnd;
  _options.currentPage = _options.currentPage || pageStart;
  var queryString = '?';
  queryString += 'search_query=' + q.join('+'); // language
  // queryString += '&'

  if (queryString.indexOf('&hl=') === -1) {
    queryString += '&hl=' + hl;
  } // location
  // queryString += '&'


  if (queryString.indexOf('&gl=') === -1) {
    queryString += '&gl=' + gl;
  }

  if (category) {
    // ex. "music"
    queryString += '&category=' + category;
  }

  if (_options.sp) {
    queryString += '&sp=' + _options.sp;
  }

  var uri = TEMPLATES.SEARCH_DESKTOP + queryString;

  var params = _url.parse(uri);

  params.headers = {
    'user-agent': _userAgent,
    'accept': 'text/html',
    'accept-encoding': 'gzip',
    'accept-language': 'en-US'
  };
  debug(params);
  debug('getting results: ' + _options.currentPage);

  _dasu.req(params, function (err, res, body) {
    if (err) {
      callback(err);
    } else {
      if (res.status !== 200) {
        return callback('http status: ' + res.status);
      }

      if (_debugging) {
        var fs = require('fs');

        var path = require('path');

        fs.writeFileSync('dasu.response', res.responseText, 'utf8');
      }

      try {
        _parseSearchResultInitialData(body, function (err, results) {
          if (err) return callback(err);
          var list = results;
          var videos = list.filter(_videoFilter);
          var playlists = list.filter(_playlistFilter);
          var channels = list.filter(_channelFilter);
          var live = list.filter(_liveFilter);
          var all = list.filter(_allFilter); // keep saving results into temporary memory while
          // we get more results

          _options._data = _options._data || {}; // init memory

          _options._data.videos = _options._data.videos || [];
          _options._data.playlists = _options._data.playlists || [];
          _options._data.channels = _options._data.channels || [];
          _options._data.live = _options._data.live || [];
          _options._data.all = _options._data.all || []; // push received results into memory

          videos.forEach(function (item) {
            _options._data.videos.push(item);
          });
          playlists.forEach(function (item) {
            _options._data.playlists.push(item);
          });
          channels.forEach(function (item) {
            _options._data.channels.push(item);
          });
          live.forEach(function (item) {
            _options._data.live.push(item);
          });
          all.forEach(function (item) {
            _options._data.all.push(item);
          });
          _options.currentPage++;
          var getMoreResults = _options.currentPage <= _options.pageEnd;

          if (getMoreResults && results._sp) {
            _options.sp = results._sp;
            setTimeout(function () {
              getSearchResults(_options, callback);
            }, 2500); // delay a bit to try and prevent throttling
          } else {
            var _videos = _options._data.videos.filter(_videoFilter);

            var _playlists = _options._data.playlists.filter(_playlistFilter);

            var _channels = _options._data.channels.filter(_channelFilter);

            var _live = _options._data.live.filter(_liveFilter);

            var _all = _options._data.all.slice(_allFilter); // return all found videos


            callback(null, {
              all: _all,
              videos: _videos,
              live: _live,
              playlists: _playlists,
              lists: _playlists,
              accounts: _channels,
              channels: _channels
            });
          }
        });
      } catch (err) {
        callback(err);
      }
    }
  });
}
/* For "modern" user-agents the html document returned from
 * YouTube contains initial json data that is used to populate
 * the page with JavaScript. This function will aim to find and
 * parse such data.
 */


function _parseSearchResultInitialData(responseText, callback) {
  var re = /{.*}/;

  var $ = _cheerio.load(responseText);

  var initialData = $('div#initial-data').html() || '';
  initialData = re.exec(initialData) || '';

  if (!initialData) {
    var scripts = $('script');

    for (var i = 0; i < scripts.length; i++) {
      var script = $(scripts[i]).html();
      var lines = script.split('\n');
      lines.forEach(function (line) {
        var i;

        while ((i = line.indexOf('ytInitialData')) >= 0) {
          line = line.slice(i + 'ytInitialData'.length);
          var match = re.exec(line);

          if (match && match.length > initialData.length) {
            initialData = match;
          }
        }
      });
    }
  }

  if (!initialData) {
    return callback('could not find inital data in the html document');
  }

  var errors = [];
  var results = [];
  var json = JSON.parse(initialData[0]);

  var items = _jp.query(json, '$..itemSectionRenderer..contents.*');

  debug('items.length: ' + items.length);

  for (var _i = 0; _i < items.length; _i++) {
    var item = items[_i];
    var result = undefined;
    var type = 'unknown';
    var hasList = item.compactPlaylistRenderer || item.playlistRenderer;
    var hasChannel = item.compactChannelRenderer || item.channelRenderer;
    var hasVideo = item.compactVideoRenderer || item.videoRenderer;

    var listId = hasList && _jp.value(item, '$..playlistId');

    var channelId = hasChannel && _jp.value(item, '$..channelId');

    var videoId = hasVideo && _jp.value(item, '$..videoId');

    var watchingLabel = _jp.query(item, '$..viewCountText..text').join('');

    var isUpcoming = // if scheduled livestream (has not started yet)
    _jp.query(item, '$..thumbnailOverlayTimeStatusRenderer..style').join('').trim() === 'UPCOMING';
    var isLive = watchingLabel.indexOf('watching') >= 0 || _jp.query(item, '$..thumbnailOverlayTimeStatusRenderer..text').join('').trim() === 'LIVE' || isUpcoming;

    if (videoId) {
      type = 'video';
    }

    if (channelId) {
      type = 'channel';
    }

    if (listId) {
      type = 'list';
    }

    if (isLive) {
      type = 'live';
    }

    try {
      switch (type) {
        case 'video':
          {
            var thumbnail = _normalizeThumbnail(_jp.value(item, '$..thumbnail..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails'));

            var title = _jp.value(item, '$..title..text') || _jp.value(item, '$..title..simpleText');

            var author_name = _jp.value(item, '$..shortBylineText..text') || _jp.value(item, '$..longBylineText..text');

            var author_url = _jp.value(item, '$..shortBylineText..url') || _jp.value(item, '$..longBylineText..url'); // publish/upload date


            var agoText = _jp.value(item, '$..publishedTimeText..text') || _jp.value(item, '$..publishedTimeText..simpleText');

            var viewCountText = _jp.value(item, '$..viewCountText..text') || _jp.value(item, '$..viewCountText..simpleText') || "0";
            var viewsCount = Number(viewCountText.split(/\s+/)[0].split(/[,.]/).join('').trim());

            var lengthText = _jp.value(item, '$..lengthText..text') || _jp.value(item, '$..lengthText..simpleText');

            var duration = _parseDuration(lengthText || '0:00');

            var description = _jp.query(item, '$..description..text').join('') || _jp.query(item, '$..descriptionSnippet..text').join(''); // url ( playlist )
            // const url = _jp.value( item, '$..navigationEndpoint..url' )


            var url = TEMPLATES.YT + '/watch?v=' + videoId;
            result = {
              type: 'video',
              videoId: videoId,
              url: url,
              title: title.trim(),
              description: description,
              image: thumbnail,
              thumbnail: thumbnail,
              seconds: Number(duration.seconds),
              timestamp: duration.timestamp,
              duration: duration,
              ago: agoText,
              views: Number(viewsCount),
              author: {
                name: author_name,
                url: TEMPLATES.YT + author_url
              }
            };
          }
          break;

        case 'list':
          {
            var _thumbnail = _normalizeThumbnail(_jp.value(item, '$..thumbnail..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails'));

            var _title = _jp.value(item, '$..title..text') || _jp.value(item, '$..title..simpleText');

            var _author_name = _jp.value(item, '$..shortBylineText..text') || _jp.value(item, '$..longBylineText..text') || _jp.value(item, '$..shortBylineText..simpleText') || _jp.value(item, '$..longBylineText..simpleTextn') || 'YouTube';

            var _author_url = _jp.value(item, '$..shortBylineText..url') || _jp.value(item, '$..longBylineText..url') || '';

            var video_count = _jp.value(item, '$..videoCountShortText..text') || _jp.value(item, '$..videoCountText..text') || _jp.value(item, '$..videoCountShortText..simpleText') || _jp.value(item, '$..videoCountText..simpleText') || _jp.value(item, '$..thumbnailText..text') || _jp.value(item, '$..thumbnailText..simpleText'); // url ( playlist )
            // const url = _jp.value( item, '$..navigationEndpoint..url' )


            var _url2 = TEMPLATES.YT + '/playlist?list=' + listId;

            result = {
              type: 'list',
              listId: listId,
              url: _url2,
              title: _title.trim(),
              image: _thumbnail,
              thumbnail: _thumbnail,
              videoCount: video_count,
              author: {
                name: _author_name,
                url: TEMPLATES.YT + _author_url
              }
            };
          }
          break;

        case 'channel':
          {
            var _thumbnail2 = _normalizeThumbnail(_jp.value(item, '$..thumbnail..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails'));

            var _title2 = _jp.value(item, '$..title..text') || _jp.value(item, '$..title..simpleText') || _jp.value(item, '$..displayName..text');

            var _author_name2 = _jp.value(item, '$..shortBylineText..text') || _jp.value(item, '$..longBylineText..text') || _jp.value(item, '$..displayName..text') || _jp.value(item, '$..displayName..simpleText');

            var video_count_label = _jp.value(item, '$..videoCountText..text') || _jp.value(item, '$..videoCountText..simpleText') || '0';

            var sub_count_label = _jp.value(item, '$..subscriberCountText..text') || _jp.value(item, '$..subscriberCountText..simpleText'); // first space separated word that has digits


            if (typeof sub_count_label === 'string') {
              sub_count_label = sub_count_label.split(/\s+/).filter(function (w) {
                return w.match(/\d/);
              })[0];
            } // url ( playlist )
            // const url = _jp.value( item, '$..navigationEndpoint..url' )


            var _url3 = _jp.value(item, '$..navigationEndpoint..url') || '/user/' + _title2;

            result = {
              type: 'channel',
              name: _author_name2,
              url: TEMPLATES.YT + _url3,
              title: _title2.trim(),
              image: _thumbnail2,
              thumbnail: _thumbnail2,
              videoCount: Number(video_count_label.replace(/\D+/g, '')),
              videoCountLabel: video_count_label,
              subCount: _parseSubCountLabel(sub_count_label),
              subCountLabel: sub_count_label
            };
          }
          break;

        case 'live':
          {
            var _thumbnail3 = _normalizeThumbnail(_jp.value(item, '$..thumbnail..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails..url')) || _normalizeThumbnail(_jp.value(item, '$..thumbnails'));

            var _title3 = _jp.value(item, '$..title..text') || _jp.value(item, '$..title..simpleText');

            var _author_name3 = _jp.value(item, '$..shortBylineText..text') || _jp.value(item, '$..longBylineText..text');

            var _author_url2 = _jp.value(item, '$..shortBylineText..url') || _jp.value(item, '$..longBylineText..url');

            var _watchingLabel = _jp.query(item, '$..viewCountText..text').join('') || _jp.query(item, '$..viewCountText..simpleText').join('') || '0';

            var watchCount = Number(_watchingLabel.split(/\s+/)[0].split(/[,.]/).join('').trim());

            var _description = _jp.query(item, '$..description..text').join('') || _jp.query(item, '$..descriptionSnippet..text').join('');

            var scheduledEpochTime = _jp.value(item, '$..upcomingEventData..startTime');

            var scheduledTime = Date.now() > scheduledEpochTime ? scheduledEpochTime * 1000 : scheduledEpochTime;

            var scheduledDateString = _toInternalDateString(scheduledTime); // url ( playlist )
            // const url = _jp.value( item, '$..navigationEndpoint..url' )


            var _url4 = TEMPLATES.YT + '/watch?v=' + videoId;

            result = {
              type: 'live',
              videoId: videoId,
              url: _url4,
              title: _title3.trim(),
              description: _description,
              image: _thumbnail3,
              thumbnail: _thumbnail3,
              watching: Number(watchCount),
              author: {
                name: _author_name3,
                url: TEMPLATES.YT + _author_url2
              }
            };

            if (scheduledTime) {
              result.startTime = scheduledTime;
              result.startDate = scheduledDateString;
              result.status = 'UPCOMING';
            } else {
              result.status = 'LIVE';
            }
          }
          break;

        default: // ignore other stuff

      }

      if (result) {
        results.push(result);
      }
    } catch (err) {
      debug(err);
      errors.push(err);
    }
  }

  var ctoken = _jp.value(json, '$..continuation');

  results._ctoken = ctoken;

  if (errors.length) {
    return callback(errors.pop(), results);
  }

  return callback(null, results);
}
/* Get metadata of a single video
 */


function getVideoMetaData(opts, callback) {
  debug('fn: getVideoMetaData');
  var videoId;

  if (typeof opts === 'string') {
    videoId = opts;
  }

  if (_typeof(opts) === 'object') {
    videoId = opts.videoId;
  }

  var uri = 'https://www.youtube.com/watch?hl=en&gl=US&v=' + videoId;

  var params = _url.parse(uri);

  params.headers = {
    'user-agent': _userAgent,
    'accept': 'text/html',
    'accept-encoding': 'gzip',
    'accept-language': 'en-US'
  };
  params.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15';

  _dasu.req(params, function (err, res, body) {
    if (err) {
      callback(err);
    } else {
      if (res.status !== 200) {
        return callback('http status: ' + res.status);
      }

      if (_debugging) {
        var fs = require('fs');

        var path = require('path');

        fs.writeFileSync('dasu.response', res.responseText, 'utf8');
      }

      try {
        _parseVideoInitialData(body, callback);
      } catch (err) {
        callback(err);
      }
    }
  });
}

function _parseVideoInitialData(responseText, callback) {
  debug('_parseVideoInitialData'); // const fs = require( 'fs' )
  // fs.writeFileSync( 'tmp.file', responseText )

  responseText = _getScripts(responseText);

  var initialData = _between(_findLine(/ytInitialData.*=\s*{/, responseText), '{', '}');

  if (!initialData) {
    return callback('could not find inital data in the html document');
  }

  var initialPlayerData = _between(_findLine(/ytInitialPlayerResponse.*=\s*{/, responseText), '{', '}');

  if (!initialPlayerData) {
    return callback('could not find inital player data in the html document');
  } // debug( initialData[ 0 ] )
  // debug( '\n------------------\n' )
  // debug( initialPlayerData[ 0 ] )


  var idata = JSON.parse(initialData);
  var ipdata = JSON.parse(initialPlayerData);

  var videoId = _jp.value(idata, '$..currentVideoEndpoint..videoId');

  if (!videoId) {
    return callback('video unavailable');
  }

  if (_jp.value(ipdata, '$..status') === 'ERROR' || _jp.value(ipdata, '$..reason') === 'Video unavailable') {
    return callback('video unavailable');
  }

  var title = _jp.value(idata, '$..videoPrimaryInfoRenderer..title..text') || _jp.value(idata, '$..videoPrimaryInfoRenderer..title..simpleText') || _jp.value(idata, '$..videoPrimaryRenderer..title..text') || _jp.value(idata, '$..videoPrimaryRenderer..title..simpleText') || _jp.value(idata, '$..title..text') || _jp.value(idata, '$..title..simpleText');

  var description = _jp.query(idata, '$..description..text').join('') || _jp.query(ipdata, '$..description..simpleText').join('') || _jp.query(ipdata, '$..microformat..description..simpleText').join('') || _jp.query(ipdata, '$..videoDetails..shortDescription').join('');

  var author_name = _jp.value(idata, '$..owner..title..text') || _jp.value(idata, '$..owner..title..simpleText');

  var author_url = _jp.value(idata, '$..owner..navigationEndpoint..url') || _jp.value(idata, '$..owner..title..url');

  var thumbnailUrl = 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
  var seconds = Number(_jp.value(ipdata, '$..videoDetails..lengthSeconds'));

  var timestamp = _msToTimestamp(seconds * 1000);

  var duration = _parseDuration(timestamp);

  var sentimentBar = // ex. "tooltip": "116,701 / 8,930"
  _jp.value(idata, '$..sentimentBar..tooltip').split(/[,.]/).join('').split(/\D+/);

  var likes = Number(sentimentBar[0]);
  var dislikes = Number(sentimentBar[1]);

  var uploadDate = _jp.value(idata, '$..uploadDate') || _jp.value(idata, '$..dateText..simpleText');

  var agoText = uploadDate && _humanTime(new Date(uploadDate)) || '';
  var video = {
    title: title,
    description: description,
    url: TEMPLATES.YT + '/watch?v=' + videoId,
    videoId: videoId,
    seconds: Number(duration.seconds),
    timestamp: duration.timestamp,
    duration: duration,
    views: Number(_jp.value(ipdata, '$..videoDetails..viewCount')),
    genre: (_jp.value(ipdata, '$..category') || '').toLowerCase(),
    uploadDate: _toInternalDateString(uploadDate),
    ago: agoText,
    // ex: 10 years ago
    image: thumbnailUrl,
    thumbnail: thumbnailUrl,
    author: {
      name: author_name,
      url: TEMPLATES.YT + author_url
    }
  };
  callback(null, video);
}
/* Get metadata from a playlist page
 */


function getPlaylistMetaData(opts, callback) {
  debug('fn: getPlaylistMetaData');
  var listId;

  if (typeof opts === 'string') {
    listId = opts;
  }

  if (_typeof(opts) === 'object') {
    listId = opts.listId || opts.playlistId;
  }

  var uri = 'https://www.youtube.com/playlist?hl=en&gl=US&list=' + listId;

  var params = _url.parse(uri);

  params.headers = {
    'user-agent': _userAgent,
    'accept': 'text/html',
    'accept-encoding': 'gzip',
    'accept-language': 'en-US'
  };

  _dasu.req(params, function (err, res, body) {
    if (err) {
      callback(err);
    } else {
      if (res.status !== 200) {
        return callback('http status: ' + res.status);
      }

      if (_debugging) {
        var fs = require('fs');

        var path = require('path');

        fs.writeFileSync('dasu.response', res.responseText, 'utf8');
      }

      try {
        _parsePlaylistInitialData(body, callback);
      } catch (err) {
        callback(err);
      }
    }
  });
}

function _parsePlaylistInitialData(responseText, callback) {
  debug('fn: parsePlaylistBody');
  responseText = _getScripts(responseText);
  var jsonString = responseText.match(/ytInitialData.*=\s*({.*});/)[1]; // console.log( jsonString )

  if (!jsonString) {
    throw new Error('failed to parse ytInitialData json data');
  }

  var json = JSON.parse(jsonString); //console.log( json )
  // TODO parse relevant json data with jsonpath

  var listId = _jp.value(json, '$..microformat..urlCanonical').split('=')[1]; // console.log( 'listId: ' + listId )


  var viewCount = _jp.value(json, '$..sidebar.playlistSidebarRenderer.items[0]..stats[1].simpleText').match(/\d+/); // console.log( 'viewCount: ' + viewCount )
  // playlistVideoListRenderer contents


  var list = _jp.query(json, '$..playlistVideoListRenderer..contents')[0]; // const list = _jp.query( json, '$..contents..tabs[0]..contents[0]..contents[0]..contents' )[ 0 ]


  var videos = [];
  list.forEach(function (playlistVideoRenderer) {
    var json = playlistVideoRenderer;

    var duration = _parseDuration(_jp.value(json, '$..lengthText..simpleText') || _jp.value(json, '$..thumbnailOverlayTimeStatusRenderer..simpleText') || _jp.query(json, '$..lengthText..text').join('') || _jp.query(json, '$..thumbnailOverlayTimeStatusRenderer..text').join(''));

    var video = {
      title: _jp.value(json, '$..title..simpleText') || _jp.value(json, '$..title..text') || _jp.query(json, '$..title..text').join(''),
      videoId: _jp.value(json, '$..videoId'),
      listId: listId,
      thumbnail: _jp.value(json, '$..thumbnail..thumbnails[0]..url').split('?')[0],
      // ref: issue #35 https://github.com/talmobi/yt-search/issues/35
      duration: duration,
      author: {
        name: _jp.value(json, '$..shortBylineText..runs[0]..text'),
        url: 'https://youtube.com' + _jp.value(json, '$..shortBylineText..runs[0]..url')
      }
    };
    videos.push(video);
  }); // console.log( videos )
  // console.log( 'videos.length: ' + videos.length )

  var playlist = {
    title: _jp.value(json, '$..microformat..title'),
    listId: listId,
    url: 'https://youtube.com/playlist?list=' + listId,
    views: Number(viewCount),
    // lastUpdate: lastUpdate,
    date: _parsePlaylistLastUpdateTime(_jp.value(json, '$..sidebar.playlistSidebarRenderer.items[0]..stats[2]..simpleText') || _jp.query(json, '$..sidebar.playlistSidebarRenderer.items[0]..stats[2]..text').join('') || ''),
    image: videos[0].thumbnail,
    thumbnail: videos[0].thumbnail,
    // playlist items/videos
    videos: videos,
    author: {
      name: _jp.value(json, '$..videoOwner..title..runs[0]..text'),
      url: 'https://youtube.com' + _jp.value(json, '$..videoOwner..navigationEndpoint..url')
    }
  };
  callback && callback(null, playlist);
}

function _parsePlaylistLastUpdateTime(lastUpdateLabel) {
  debug('fn: _parsePlaylistLastUpdateTime'); // ex "Last Updated on Jun 25, 2018"
  // ex: "Viimeksi päivitetty 25.6.2018"

  var words = lastUpdateLabel.trim().split(/[\s.-]+/);

  for (var i = 0; i < words.length; i++) {
    var slice = words.slice(i);
    var t = slice.join(' ');
    var r = slice.reverse().join(' ');

    var _a = new Date(t);

    var b = new Date(r);
    if (_a.toString() !== 'Invalid Date') return _toInternalDateString(_a);
    if (b.toString() !== 'Invalid Date') return _toInternalDateString(b);
  }

  return '';
}

function _toInternalDateString(date) {
  date = new Date(date);
  debug('fn: _toInternalDateString');
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + // january gives 0
  date.getDate();
}
/* Helper fn to parse duration labels
 * ex: Duration: 2:27, Kesto: 1.07.54
 */


function _parseDuration(timestampText) {
  var a = timestampText.split(/\s+/);
  var lastword = a[a.length - 1]; // ex: Duration: 2:27, Kesto: 1.07.54
  // replace all non :, non digits and non .

  var timestamp = lastword.replace(/[^:.\d]/g, '');
  if (!timestamp) return {
    toString: function toString() {
      return a[0];
    },
    seconds: 0,
    timestamp: 0
  }; // remove trailing junk that are not digits

  while (timestamp[timestamp.length - 1].match(/\D/)) {
    timestamp = timestamp.slice(0, -1);
  } // replaces all dots with nice ':'


  timestamp = timestamp.replace(/\./g, ':');
  var t = timestamp.split(/[:.]/);
  var seconds = 0;
  var exp = 0;

  for (var i = t.length - 1; i >= 0; i--) {
    if (t[i].length <= 0) continue;
    var number = t[i].replace(/\D/g, ''); // var exp = (t.length - 1) - i;

    seconds += parseInt(number) * (exp > 0 ? Math.pow(60, exp) : 1);
    exp++;
    if (exp > 2) break;
  }

  ;
  return {
    toString: function toString() {
      return seconds + ' seconds (' + timestamp + ')';
    },
    seconds: seconds,
    timestamp: timestamp
  };
}
/* Parses a type of human-like timestamps found on YouTube.
 * ex: "PT4M13S" -> "4:13"
 */


function _parseHumanDuration(timestampText) {
  debug('_parseHumanDuration'); // ex: PT4M13S

  var pt = timestampText.slice(0, 2);
  var timestamp = timestampText.slice(2).toUpperCase();
  if (pt !== 'PT') return {
    toString: function toString() {
      return a[0];
    },
    seconds: 0,
    timestamp: 0
  };
  var h = timestamp.match(/\d?\dH/);
  var m = timestamp.match(/\d?\dM/);
  var s = timestamp.match(/\d?\dS/);
  h = h && h[0].slice(0, -1) || 0;
  m = m && m[0].slice(0, -1) || 0;
  s = s && s[0].slice(0, -1) || 0;
  h = parseInt(h);
  m = parseInt(m);
  s = parseInt(s);
  timestamp = '';
  if (h) timestamp += h + ':';
  if (m) timestamp += m + ':';
  timestamp += s;
  var seconds = h * 60 * 60 + m * 60 + s;
  return {
    toString: function toString() {
      return seconds + ' seconds (' + timestamp + ')';
    },
    seconds: seconds,
    timestamp: timestamp
  };
}
/* Helper fn to parse sub count labels
 * and turn them into Numbers.
 *
 * It's an estimate but can be useful for sorting etc.
 *
 * ex. "102M subscribers" -> 102000000
 * ex. "5.33m subscribers" -> 5330000
 */


function _parseSubCountLabel(subCountLabel) {
  if (!subCountLabel) return undefined;
  var label = subCountLabel.split(/\s+/).filter(function (w) {
    return w.match(/\d/);
  })[0].toLowerCase();
  var m = label.match(/\d+(\.\d+)?/);

  if (m && m[0]) {} else {
    return;
  }

  var num = Number(m[0]);
  var THOUSAND = 1000;
  var MILLION = THOUSAND * THOUSAND;
  if (label.indexOf('m') >= 0) return MILLION * num;
  if (label.indexOf('k') >= 0) return THOUSAND * num;
  return num;
}
/* Helper fn to choose a good thumbnail.
 */


function _normalizeThumbnail(thumbnails) {
  var t;

  if (typeof thumbnails === 'string') {
    t = thumbnails;
  } else {
    // handle as array
    if (thumbnails.length) {
      t = thumbnails[0];
      return _normalizeThumbnail(t);
    } // failed to parse thumbnail


    return undefined;
  }

  t = t.split('?')[0];
  t = t.split('/default.jpg').join('/hqdefault.jpg');
  t = t.split('/default.jpeg').join('/hqdefault.jpeg');

  if (t.indexOf('//') === 0) {
    return 'https://' + t.slice(2);
  }

  return t.split('http://').join('https://');
}
/* Helper fn to transform ms to timestamp
 * ex: 253000 -> "4:13"
 */


function _msToTimestamp(ms) {
  var t = '';
  var MS_HOUR = 1000 * 60 * 60;
  var MS_MINUTE = 1000 * 60;
  var MS_SECOND = 1000;
  var h = Math.floor(ms / MS_HOUR);
  var m = Math.floor(ms / MS_MINUTE) % 60;
  var s = Math.floor(ms / MS_SECOND) % 60;
  if (h) t += h + ':';
  if (m) t += m + ':';
  if (String(s).length < 2) t += '0';
  t += s;
  return t;
} // run tests is script is run directly


if (require.main === module) {
  // https://www.youtube.com/watch?v=e9vrfEoc8_g
  test('superman theme list pewdiepie channel');
}

function test(query) {
  console.log('test: doing list search');
  var opts = {
    query: query,
    pageEnd: 1
  };
  search(opts, function (error, r) {
    if (error) throw error;
    var videos = r.videos;
    var playlists = r.playlists;
    var channels = r.channels;
    console.log('videos: ' + videos.length);
    console.log('playlists: ' + playlists.length);
    console.log('channels: ' + channels.length);

    for (var i = 0; i < videos.length; i++) {
      var song = videos[i];
      var time = " (".concat(song.timestamp, ")");
      console.log(song.title + time);
    }

    playlists.forEach(function (p) {
      console.log("playlist: ".concat(p.title, " | ").concat(p.listId));
    });
    channels.forEach(function (c) {
      console.log("channel: ".concat(c.title, " | ").concat(c.description));
    });
  });
}

},{"./dasu":1,"./util.js":3,"cheerio":undefined,"fs":undefined,"human-time":undefined,"jsonpath":undefined,"path":undefined,"querystring":undefined,"url":undefined}],3:[function(require,module,exports){
"use strict";

var _cheerio = require('cheerio');

var util = {};
module.exports = util;
util._getScripts = _getScripts;
util._findLine = _findLine;
util._between = _between;

function _getScripts(text) {
  // match all contents within html script tags
  var $ = _cheerio.load(text);

  var scripts = $('script');
  var buffer = ''; // combine all scripts

  for (var i = 0; i < scripts.length; i++) {
    var el = scripts[i];
    var child = el && el.children[0];
    var data = child && child.data;

    if (data) {
      buffer += data + '\n';
    }
  }

  return buffer;
}

function _findLine(regex, text) {
  var cache = _findLine.cache || {};
  _findLine.cache = cache;
  cache[text] = cache[text] || {};
  var lines = cache[text].lines || text.split('\n');
  cache[text].lines = lines;
  clearTimeout(cache[text].timeout);
  cache[text].timeout = setTimeout(function () {
    delete cache[text];
  }, 100);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (regex.test(line)) return line;
  }

  return '';
}

function _between(text, start, end) {
  var i = text.indexOf(start);
  var j = text.lastIndexOf(end);
  if (i < 0) return '';
  if (j < 0) return '';
  return text.slice(i, j + 1);
}

},{"cheerio":undefined}]},{},[2])(2)
});
