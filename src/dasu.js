// basic streamlined xhr request for browser and server

var client = {
  follow: true, // auto-follow redirects
  mode: 'auto' // possible values: 'auto', 'node', 'browser'
}

// use this require hack so that bundlers don't automatically bundle
// node's http library within exported bundles
var require_ = require

var _request = function () {
  throw new Error( 'dasu: no _request implementation found!' )
}

if ( typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined' ) {
  // use XMLHttpRequest
}

function browserRequest ( opts, dataString, callback ) {
  client._mode = 'browser'

  var req = new window.XMLHttpRequest()

  if ( !window ) throw new Error( 'no global browser "window" object found.' )
  if ( !window.location ) throw new Error( 'no global browser "window.location" object found.' )

  opts.protocol = opts.protocol || ( window.location.protocol ) || 'http'
  if ( opts.protocol[ opts.protocol.length - 1 ] !== ':' ) opts.protocol += ':'
  // opts.host = opts.host || window.location.host
  opts.hostname = opts.hostname || opts.host || window.location.hostname

  var defaultPort = 80

  // default port based off of protocol
  if ( opts.protocol ) {
    if ( opts.protocol.indexOf( 'https' ) !== -1 ) {
      defaultPort = 443
    } else {
      defaultPort = 80
    }
  }

  // if requesting current domain, assume by default the same port
  var ohn = opts.hostname.toLowerCase().trim()
  var whn = window.location.hostname.toLowerCase().trim()
  if ( ohn.indexOf( whn ) !== -1 ) defaultPort = window.location.port || defaultPort

  opts.port = opts.port || defaultPort

  var origin = opts.protocol + '//' + ( opts.hostname + ( opts.port ? ( ':' + opts.port ) : '' ) )
  // XMLHttpRequest takes a complete url (not host and path separately)
  var url = origin + opts.path

  if ( client.debug ) {
    console.log( 'dasu: url [' + url + ']' )
  }

  if ( client.debug ) {
    console.log( '--- dasu opts ---' )
    console.log( opts )
    console.log()
  }

  req.open( opts.method, url, true )

  req.onload = function () {
    callback( null, req, req.responseText )
  }

  req.onerror = function () {
    var desc = '' + opts.method.toUpperCase() + ' ' + url

    var err = {
      name: 'NetworkError',
      message: req.responseText || 'NetworkError: XMLHttpRequest (' + desc + ')',
      desc: desc,
      url: url,
      opts: opts,
      data: dataString,
      origin: origin,
      responseText: req.responseText
    }

    err.toString = function () {
      return err.message + '\n' + JSON.stringify( opts, null, 2 ).split( ',' )
    }

    err.message = err.toString()

    callback( err )
  }

  // attach headers to the request
  // console.log(opts.headers)
  var headerKeys = Object.keys( opts.headers )
  for ( var i = 0; i < headerKeys.length; i++ ) {
    var key = headerKeys[ i ].toLowerCase()
    var value = opts.headers[ key ]
    req.setRequestHeader( key, value )
    // console.log("set header: %s, to: %s", key, value)
  }

  try {
    req.send( dataString )
  } catch ( err ) {
    var desc = '' + opts.method.toUpperCase() + ' ' + url

    err.desc = desc
    err.url = url
    err.opts = opts
    err.data = dataString
    err.origin = origin

    err.toString = function () {
      return err.message + '\n' + JSON.stringify( opts, null, 2 ).split( ',' )
    }

    callback( err )
  }

  // return minimal api to abort
  return {
    abort: function () {
      req.abort()
    }
  }
}

function nodeRequest ( opts, dataString, callback ) {
  client._mode = 'node'

  // assume in nodejs environment, use nodejs core http lib
  var http = require_( 'http' )
  var https = require_( 'https' )
  var zlib = require_( 'zlib' )

  opts = opts || {}
  opts.hostname = opts.hostname || opts.host // alias opts.host to opts.hostname
  opts.protocol = opts.protocol || 'http'
  var _h = http

  if ( opts.protocol && opts.protocol.indexOf( 'https' ) !== -1 ) _h = https
  if ( opts.protocol[ opts.protocol.length - 1 ] !== ':' ) opts.protocol += ':'

  if ( client.debug ) {
    console.log( '--- dasu opts ---' )
    console.log( opts )
    console.log()
  }

  var req = _h.request( opts, function ( res ) {
    var buffer = []
    var stream = res

    // brotli support
    if ( zlib.createBrotliDecompress && res.headers[ 'content-encoding' ] === 'br' ) {
      var bunzip = zlib.createBrotliDecompress()
      stream = bunzip
      res.pipe( bunzip )
    }

    // gzip support
    if ( zlib.createGunzip && res.headers[ 'content-encoding' ] === 'gzip' ) {
      var gunzip = zlib.createGunzip()
      stream = gunzip
      res.pipe( gunzip )
    }

    // deflate support
    if ( zlib.createDeflate && res.headers[ 'content-encoding' ] === 'deflate' ) {
      var deflate = zlib.createDeflate()
      stream = deflate
      res.pipe( deflate )
    }

    var contentType = res.headers[ 'content-type' ]
    if ( contentType ) {
      if ( contentType.indexOf( 'text/' ) >= 0 ) {
        if ( contentType.indexOf( 'ascii' ) >= 0 ) {
          stream.setEncoding( 'ascii' )
        } else {
          stream.setEncoding( 'utf8' )
        }
      } else {
        stream.setEncoding( 'binary' )
      }
    } else {
      stream.setEncoding( 'binary' )
    }

    stream.on( 'data', function ( chunk ) {
      buffer.push( chunk )
    } )

    stream.on( 'end', function () {
      var body = buffer.join( '' )
      res.responseText = res.responseText || body
      callback( null, res, body )
    } )
  } )

  req.on( 'error', function ( err ) {
    var origin = opts.protocol + '//' + ( opts.hostname + ( opts.port ? ( ':' + opts.port ) : '' ) )
    var url = origin + opts.path

    var desc = '' + opts.method.toUpperCase() + ' ' + url

    err.desc = desc
    err.url = url
    err.opts = opts
    err.data = dataString
    err.origin = origin

    err.toString = function () {
      return err.message + '\n' + JSON.stringify( opts, null, 2 ).split( ',' )
    }

    err.message = err.toString()

    callback( err )
  } )

  if ( client.debug ) {
    console.log( 'dasu typeof dataString: ' + typeof dataString )
    dataString && dataString.length >= 0 && console.log( 'dasu sending length: ' + dataString.length )
  }

  req.write( dataString )
  req.end()

  // return minimal api to abort
  return {
    abort: function () {
      req.abort()
    }
  }
}

function request ( params, done ) {
  var _currentMode

  if (
    ( client.mode === 'browser' ) ||
    ( client.mode !== 'node' && typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined' )
  ) {
    _currentMode = 'browser'
    _request = browserRequest
  } else {
    _currentMode = 'node'
    _request = nodeRequest
  }

  if ( typeof params === 'string' ) {
    // shorthand for GET request

    var parsedUrl
    if ( typeof URL !== 'undefined' ) {
      parsedUrl = new URL( params )
    } else {
      parsedUrl = require_( 'url' ).parse( params )
    }

    if ( typeof parsedUrl !== 'object' ) {
      throw new Error( 'failed to parse params shorthand: ' + params )
    }

    params = {}
    params.method = 'GET'
    params.protocol = parsedUrl.protocol
    params.host = parsedUrl.host
    params.hostname = parsedUrl.hostname
    params.port = parsedUrl.port
    params.path = parsedUrl.path || parsedUrl.pathname
  }

  var contentType = ''
  var data = ( params.data || params.json ) || ''
  var dataString = ''
  switch ( typeof data ) {
    case 'object':
      // make sure we only convert simple objects and not for example Buffer objects
      if ( data.toString === ( {} ).toString ) {
        dataString = JSON.stringify( data )
        contentType = 'application/json'
      } else {
        if ( client.debug ) {
          console.log( 'dasu: complex object data' )
        }
        dataString = data
        contentType = 'application/octet-stream'
      }
      break

    case 'string':
      if ( data.length > 1 && ( data[ 0 ] === '{' || data[ 0 ] === '[' ) ) {
        try { // could be json
          JSON.parse( data ) // throws error on fail
          if ( console && console.warn ) {
            console.warn( '[WARNING] dasu: Sending data that may be JSON as text/plain' )
          } else {
            console.log( '[WARNING] dasu: Sending data that may be JSON as text/plain' )
          }
        } catch ( err ) {} // text was not parsed as json, ignore and assume text/plain
      }
      dataString = data
      contentType = 'text/plain'
      break

    default: // try coercion as a last resort
      dataString = ( '' + data )
      contentType = 'text/plain'
  }
  // console.log('dataString: ' + dataString)

  // console.log("rest: contentType: " + contentType)

  params = Object.assign( {}, params )
  delete params.data

  // try to add content-type if it doesn't exist
  if ( contentType ) {
    params.headers = Object.assign( {}, {
      'content-type': contentType
    }, params.headers || {} )

    // set content-length if it doesn't already exist
    if ( contentType === 'application/octet-stream' && dataString && dataString.length ) {
      params.headers = Object.assign( {}, {
        'content-length': dataString.length
      }, params.headers || {} )
    }
  }

  // delete params.headers[ 'content-type' ]

  // console.log("rest: headers: " + JSON.stringify(params.headers))

  // set default method
  params.method = params.method || 'GET'

  // default path
  params.path = params.path || '/'
  // people often emit leading '/' - so support it
  if ( params.path[ 0 ] !== '/' ) {
    params.path = '/' + params.path
  }

  /*
   * set default protocl based off of port number
   */
  var defaultProtocol = 'http'

  if ( params.port ) {
    var n = Number( params.port )

    // convert params.port to a Number
    if ( String( n ) === params.port ) {
      params.port = n
    }

    if ( params.port === 443 ) {
      defaultProtocol = 'https'
    }
  }

  if ( !params.protocol ) {
    params.protocol = defaultProtocol
  }

  // delete params.protocol // TODO debug delete this

  var opts = {
    protocol: params.protocol,
    host: params.host,
    hostname: params.hostname,
    port: params.port,
    path: params.path, // attach root path
    method: params.method,
    headers: params.headers
  }

  var redirectCount = 0
  var REDIRECT_LIMIT = 3

  // log responses (and reset last)
  client.log = ''

  // uses XMLHttpRequest if available, else nodejs http/https library
  return _request( opts, dataString, reqCallback )

  function reqCallback ( err, res, body ) {
    if ( err || res === undefined ) {
      done( err )
    } else {
      // homogenize response headers
      if ( !res.getResponseHeader && res.headers ) {
        res.getResponseHeader = function ( header ) {
          return res.headers[ header ]
        }
      }
      if ( res.getAllResponseHeaders && !res.headers ) {
        res.headers = res.getAllResponseHeaders()
      }
      if ( !res.getAllResponseHeaders && res.headers ) {
        res.getAllResponseHeaders = function () {
          return res.headers
        }
      }

      // homogenize response status
      if ( res.status === undefined ) {
        res.status = res.statusCode
      } else {
        res.statusCode = res.status
      }

      if ( client.debug ) {
        client.log += '\n-------------\n'
        client.log += ( new Date() )
        client.log += 'headers:\n' + JSON.stringify( res.headers, null, 2 ) + '\n\n'
        client.log += 'body:\n' + body + '\n'
      }

      if (
        client.follow &&
        res.status >= 300 && res.status < 400 &&
        res.headers[ 'location' ] &&
        ( redirectCount < REDIRECT_LIMIT )
      ) {
        redirectCount++

        var loc = res.headers[ 'location' ]
        if ( loc.slice( 0, 2 ) === '//' ) {
          loc = params.protocol + ':' + loc
        }
        if ( loc[ 0 ] === '/' ) {
          // path only
          opts.path = loc
          return _request( opts, dataString, reqCallback )
        }

        var parsedUrl
        if ( typeof URL !== 'undefined' ) {
          parsedUrl = new URL( loc )
        } else {
          if ( _currentMode === 'node' ) {
            parsedUrl = require_( 'url' ).parse( loc )
          }
        }

        if ( client.debug ) {
          if ( _currentMode === 'node' ) {
            try {
              var fs = require_( 'fs' )
              fs.writeFileSync( 'debug.dasu-response.log', client.log, 'utf8' )
            } catch ( err ) { /* ignore */ }
          } else {
            console.log( client.log )
          }
        }

        if ( parsedUrl ) {
          opts.protocol = parsedUrl.protocol && parsedUrl.protocol
          opts.host = parsedUrl.host && parsedUrl.host
          opts.hostname = parsedUrl.hostname && parsedUrl.hostname
          opts.port = parsedUrl.port && parsedUrl.port
          opts.path = parsedUrl.path && parsedUrl.pathname
          return _request( opts, dataString, reqCallback )
        }
      }

      done( undefined, res, body )
    }
  }
}

client.xhr = function ( params, done ) {
  request( params, function ( err, res, body ) {
    done( err, body )
  } )
}

client.req = request

module.exports = client