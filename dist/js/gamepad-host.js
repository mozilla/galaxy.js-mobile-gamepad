!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (window, document) {
'use strict';

// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0.js');  // jshint ignore:line
var Modal = require('./lib/modal')(window, document);
var settings = require('./settings');
var utils = require('./lib/utils')(window, document);
var error = utils.error;
var trace = utils.trace;


utils.polyfill();


var _instance;
var GAMEPAD_DEFAULT_OPTIONS = {
  // Which transport protocol to try first (choices: 'webrtc' or 'websocket').
  protocol: 'webrtc'
};

var gamepad = {
  get: function () {
    return _instance;
  },
  init: function (protocol) {
    return _instance || new Gamepad({
      protocol: protocol
    });
  }
};


/**
 * A library to control an HTML5 game using WebRTC or WebSocket.
 *
 * @param {String} opts Options for gamepad (e.g., protocol).
 * @exports Gamepad
 * @namespace Gamepad
 */
function Gamepad(opts) {
  _instance = this;

  if (!opts) {
    opts = {};
  }

  // Set properties based on options passed in, using defaults if missing.
  Object.keys(GAMEPAD_DEFAULT_OPTIONS).forEach(function (key) {
    this[key] = key in opts ? opts[key] : GAMEPAD_DEFAULT_OPTIONS[key];
  }.bind(this));

  this.eventEmitter = new Gamepad.EventEmitter();
  this.state = {};
}


Gamepad.version = settings.VERSION;


/**
 * Handshake with PeerJS' WebSocket server to get a peer ID.
 *
 * Once we have the peer ID, we can tell the controller how to find us. Then
 * all communication between the host and the controller is peer-to-peer via
 * WebRTC data channels.
 *
 * @param {String} peerId The peer ID.
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype._handshake = function (peerId) {
  return new Promise(function (resolve) {
    if (!peerId) {
      peerId = utils.getPeerId();  // The host ID.
    }

    var peer = new window.Peer(peerId, {
      key: settings.PEERJS_KEY,
      debug: settings.DEBUG ? 3 : 0
    });

    window.addEventListener('beforeunload', function () {
      peer.destroy();
    });

    peer.on('open', function () {
      trace('My peer ID: ' + peer.id);
      resolve(peer);
    });
  });
};


/**
 * Listen for a peer connection with the controller via WebRTC data channels.
 *
 * If one is given, we will tell PeerJS to use the peer ID the query-string.
 *
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype._connect = function (peer) {
  return new Promise(function (resolve, reject) {
    peer.on('connection', function (conn) {
      conn.on('data', function (data) {
        switch (data.type) {
          case 'state':
            gamepad._updateState(data.data);
            break;
          default:
            console.warn(
              'WebRTC message received of unknown type: "' + data.type + '"');
            break;
        }

        trace('Received: ' +
          (typeof data === 'object' ? JSON.stringify(data) : ''));
      });

      conn.on('error', function (err) {
        error(err.message);
        reject(err);
      });

      // We've connected to a controller.
      resolve(conn);
    });
  });
};


/**
 * Connect to a peer (controller).
 *
 * Establish connection with peer.
 *
 * @returns {Promise}
 * @memberOf gamepad
 */
Gamepad.prototype.pair = function (peerId) {
  return new Promise(function (resolve) {

    return gamepad._handshake(peerId).then(function (peer) {
      // `pairId` should be the same as `peerId`,
      // but `peer.id` is the source of truth.
      var pairId = peer.id;
      var pairIdEsc = encodeURIComponent(pairId);
      var pairUrl = galaxyOrigin + '/client.html?' + pairIdEsc;

      // Update the querystring in the address bar.
      window.history.replaceState(null, null,
        window.location.pathname + '?' + pairIdEsc);

      var content = (
        '<div class="modal-inner modal-pair">' +
          '<h2>URL</h2><p><a href="' + pairUrl +
            '" class="pair-url" target="_blank">' + pairUrl + '</a></p>' +
          '<h2>Code</h2><p class="pair-code">' + pairIdEsc + '</p>' +
        '</div>'
      );

      this.modal = new Modal({
        id: 'pairing-screen',
        classes: 'slim',
        title: 'Pair your mobile phone',
        content: content
      }, true);

      // todo: replace `setTimeout`s with `transitionend` event listeners.
      window.setTimeout(function () {
        // Waiting for the transition to end.
        this.modal.open();
      }, 150);

      [
        'https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,700',
        '/css/modal.css'  // todo: do not hardcode absolute path
      ].forEach(function (stylesheet) {
        utils.injectCSS({href: stylesheet});
      });

      return gamepad.connect(peer);
    }.bind(this)).then(function (conn) {
      console.log('Peer connected');
      this.modal.close();
      resolve(conn);
    }.bind(this)).catch(console.error.bind(console));
  }.bind(this));
};


/**
 * Update the state of the controller.
 *
 * @memberOf Gamepad
 */
Gamepad.prototype._updateState = function (data) {
  if (!data) {
    data = {};
  }

  Object.keys(data).forEach(function (key) {
    if (!this.state[key] && data[key]) {
      // Button pushed.
      gamepad._emit('buttondown', key);
      gamepad._emit('buttondown.' + key, key);
    } else if (this.state[key] && !data[key]) {
      // Button released.
      gamepad._emit('buttonup', key);
      gamepad._emit('buttonup.' + key, key);
    }
  }.bind(this));

  this.state = data;
};


/**
 * Update the state of the controller.
 *
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype.hidePairingScreen = function () {
  this.modal.close();
};


/**
 * Bind a handler to events being emitted by the index.
 *
 * The handler can be bound to many events at the same time.
 *
 * @param {String} [eventName] The name(s) of events to bind the function to.
 * @param {Function} func The serialised set to load.
 * @memberOf Index
 */
Gamepad.prototype.on = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.eventEmitter.addListener.apply(this.eventEmitter, args);
};


/**
 * Remove a handler from an event being emitted by the index.
 *
 * @param {String} eventName The name of events to remove the function from.
 * @param {Function} func The serialised set to load.
 * @memberOf Index
 */
Gamepad.prototype.off = function (name, func) {
  return this.eventEmitter.removeListener(name, func);
};


/**
 * Gamepad.EventEmitter is an event emitter for Gamepad. It manages adding
 * and removing event handlers and triggering events and their handlers.
 *
 * @constructor
 */
Gamepad.EventEmitter = function () {
  this.events = {};
};


/**
 * Bind a handler function to a specific event(s).
 *
 * Can bind a single function to many different events in one call.
 *
 * @param {String} [eventName] The name(s) of events to bind this function to.
 * @param {Function} func The function to call when an event is fired.
 * @memberOf EventEmitter
 */
Gamepad.EventEmitter.prototype.addListener = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.pop();
  var names = args;

  if (typeof fn !== 'function') {
    throw new TypeError('Last argument must be a function');
  }

  names.forEach(function (name) {
    if (this.hasHandler(name)) {
      this.events[name].push(fn);
    } else {
      this.events[name] = [fn];
    }
  }, this);
};


/**
 * Remove a handler function from a specific event.
 *
 * @param {String} eventName The name of the event to remove the function from.
 * @param {Function} func The function to remove from an event.
 * @memberOf EventEmitter
 */
Gamepad.EventEmitter.prototype.removeListener = function (eventName, func) {
  if (!this.hasHandler(eventName)) {
    return;
  }

  var funcIdx = this.events[eventName].indexOf(func);
  this.events[eventName].splice(funcIdx, 1);

  if (!this.events[eventName].length) {
    delete this.events[eventName];
  }
};


/**
 * Call all functions bound to the given event.
 *
 * Additional data can be passed to the event handler as arguments to `emit`
 * after the event name.
 *
 * @param {String} eventName The name of the event to emit.
 * @memberOf EventEmitter
 */
Gamepad.EventEmitter.prototype.emit = function (eventName) {
  if (!this.hasHandler(eventName)) {
    return;
  }

  var args = Array.prototype.slice.call(arguments, 1);

  this.events[eventName].forEach(function (func) {
    func.apply(undefined, args);
  });
};


/**
 * Check whether a handler has ever been stored for an event.
 *
 * @param {String} eventName The name of the event to check.
 * @private
 * @memberOf EventEmitter
 */
Gamepad.EventEmitter.prototype.hasHandler = function (eventName) {
  return eventName in this.events;
};


var galaxyOrigin = window.location.origin;
var dataOrigin = document.querySelector('[data-galaxy-origin]');
if (dataOrigin) {
  Gamepad.galaxyOrigin = dataOrigin.dataset.galaxyOrigin;
}


module.exports = gamepad;

})(window, document);

},{"./lib/modal":2,"./lib/utils":3,"./settings":4}],2:[function(require,module,exports){
module.exports = function (window, document) {
'use strict';

var utils = require('./utils');


function Modal(opts, inject) {
  // Create properties for `id`, `classes`, `title`, and `content`.
  Object.keys(opts).forEach(function (key) {
    this[key] = opts[key];
  }.bind(this));

  if (inject) {
    this.inject();
  }
}

Modal.closeAll = Modal.prototype.close = function () {
  return new Promise(function (resolve, reject) {
    var openedModal = document.querySelector('.md-show');
    if (!openedModal) {
      return reject();
    }

    // Close any open modal.
    openedModal.classList.remove('md-show');

    // TODO: Wait until transition end.
    setTimeout(function () {
      document.body.classList.remove('galaxy-overlayed');
      resolve();
    }, 150);
  });
};

Modal.injectOverlay = function () {
  // Inject the overlay we use for overlaying it behind modals.
  if (!document.querySelector('.md-overlay')) {
    var d = document.createElement('div');
    d.className = 'md-overlay';
    document.body.appendChild(d);
  }
};

Modal.prototype.html = function () {
  var d = document.createElement('div');
  d.id = 'modal-' + this.id;
  d.className = 'md-modal md-effect-1 ' + (this.classes || '');
  d.style.display = 'none';
  d.innerHTML = (
    '<div class="md-content">' +
      '<h3>' + utils.escape(this.title) + '</h3> ' +
      '<a class="md-close" title="Close"><span><div>Close</div></span></a>' +
      '<div>' + this.content + '</div>' +
    '</div>'
  );
  return d;
};

Modal.prototype.inject = function () {
  Modal.injectOverlay();

  this.el = this.html();
  this.el.style.display = 'block';

  document.body.appendChild(this.el);
  document.body.classList.add('galaxy-overlayed');

  return this.el;
};

Modal.prototype.open = function () {
  this.el.classList.add('md-show');
};


return Modal;

};

},{"./utils":3}],3:[function(require,module,exports){
module.exports = function (window, document) {
'use strict';

if (!window) {
  throw new Error('window required');
}
if (!document) {
  throw new Error('document required');
}

function trace(text, level) {
  console[level || 'log'](
    (window.performance.now() / 1000).toFixed(3) + ': ' + text);
}


function error(text) {
  return trace(text, 'error');
}


function warn(text) {
  return trace(text, 'warn');
}


function polyfill() {
  if (!('performance' in window)) {
    window.performance = {
      now: function () {
        return +new Date();
      }
    };
  }

  if (('origin' in window.location)) {
    window.location.origin = (window.location.protocol + '//' +
      window.location.host);
  }
}


function getPeerId() {
  return (window.location.pathname.indexOf('.html') ?
    window.location.search.substr(1) : window.location.pathname.substr(1));
}


var FIELD_FOCUSED_TAGS = [
  'input',
  'keygen',
  'meter',
  'option',
  'output',
  'progress',
  'select',
  'textarea'
];
function fieldFocused(e) {
  return FIELD_FOCUSED_TAGS.indexOf(e.target.nodeName.toLowerCase()) !== -1;
}


function hasTouchEvents() {
  return ('ontouchstart' in window ||
    window.DocumentTouch && document instanceof window.DocumentTouch);
}

function injectCSS(opts) {
  var link = document.createElement('link');
  link.href = opts.href;
  link.media = 'all';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  Object.keys(opts || {}).forEach(function (prop) {
    link[prop] = opts[prop];
  });
  document.querySelector('head').appendChild(link);
}

function escape(text) {
  if (!text) {
    return text;
  }
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/'/g, '&#39;')
             .replace(/"/g, '&#34;');
}

function isFullScreen() {
  return (!document.fullscreenElement &&  // standard method
    !document.mozFullScreenElement &&
    !document.webkitFullscreenElement &&
    !document.msFullscreenElement);  // vendor-prefixed methods
}

function toggleFullScreen() {
  if (isFullScreen()) {
    trace('Entering full screen');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(
        Element.ALLOW_KEYBOARD_INPUT);
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  } else {
    trace('Exiting full screen');
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}


function lockOrientation(orientation) {
  var lo = (window.screen.LockOrientation ||
    window.screen.mozLockOrientation ||
    window.screen.webkitLockOrientation ||
    window.screen.msLockOrientation);
  if (!lo) {
    return warn('Orientation could not be locked');
  }

  return lo(orientation);
}


function triggerEvent(type) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.eventName = type;
  (document.body || window).dispatchEvent(event);
}


return {
  trace: trace,
  error: error,
  warn: warn,
  polyfill: polyfill,
  getPeerId: getPeerId,
  fieldFocused: fieldFocused,
  hasTouchEvents: hasTouchEvents,
  injectCSS: injectCSS,
  escape: escape,
  isFullScreen: isFullScreen,
  toggleFullScreen: toggleFullScreen,
  lockOrientation: lockOrientation,
  triggerEvent: triggerEvent
};

};

},{}],4:[function(require,module,exports){
'use strict';

var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}


var settings = {
  API_URL: 'http://localhost:5000',  // Galaxy API URL. No trailing slash.
  DEBUG: false,
  PEERJS_KEY: '',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

// Override each default setting with user-defined setting.
Object.keys(settings_local).forEach(function (key) {
	settings[key] = settings_local[key];
});


module.exports = settings;

},{"./settings_local.js":5}],5:[function(require,module,exports){
module.exports = {
  DEBUG: true,
  PEERJS_KEY: 'rovu5xmqo69wwmi'
};

},{}]},{},[1])(1)
});
