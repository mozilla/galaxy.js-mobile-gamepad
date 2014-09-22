!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0.js');  // jshint ignore:line
var Modal = require('./lib/modal');
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


utils.polyfill(window);


/**
 * A library for controlling an HTML5 game using WebRTC.
 *
 * @exports gamepad
 * @namespace gamepad
 */
function gamepad() {
  this.listeners = {};
  this.state = {};
}


/**
 * 1. Your PC connects to the server.
 * 2. The server gives your PC a randomly generated number and remembers the combination of number and PC.
 * 3. From your mobile device, specify a number and connect to the server.
 * 4. If the number specified is the same as from a connected PC, your mobile device is paired with that PC.
 * 5. If there is no designated PC, an error occurs.
 * 6. When data comes in from your mobile device, it is sent to the PC with which it is paired, and vice versa.
 */


/**
 * Does a handshake with PeerJS' WebSocket server to get a peer ID.
 *
 * Once we have the peer ID, we can tell the controller how to find us. Then
 * all communication between the host and the controller is peer-to-peer via
 * WebRTC data channels.
 *
 * @param {String} peerId The peer ID.
 * @returns {Promise}
 * @memberOf gamepad
 */
gamepad.peerHandshake = function (peerId) {
  return new Promise(function (resolve, reject) {
    if (!peerId) {
      peerId = utils.getPeerId();  // The host ID.
    }

    var peer = new Peer(peerId, {
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
 * Listens for a peer connection with the controller via WebRTC data channels.
 *
 * If one is given, we will tell PeerJS to use the peer ID the query-string.
 *
 * @returns {Promise}
 * @memberOf gamepad
 */
gamepad.peerConnect = function (peer) {
  return new Promise(function (resolve, reject) {
    peer.on('connection', function (conn) {
      conn.on('data', function (data) {
        gamepad._updateState(data);
        trace('Received: ' + (typeof data === 'object' ? JSON.stringify(data) : ''));
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
 * Connects to a peer (controller).
 *
 * Establishes connection with peer.
 *
 * @returns {Promise}
 * @memberOf gamepad
 */
gamepad.pair = function (peerId) {
  return new Promise(function (resolve) {

    return gamepad.peerHandshake(peerId).then(function (peer) {
      var pairId = peer.id;  // This should be the same as `peerId`, but this comes from PeerJS, which is the source of truth.
      var pairIdEsc = encodeURIComponent(pairId);
      var pairUrl = galaxyOrigin + '/client.html?' + pairIdEsc;

      // Update the querystring in the address bar.
      window.history.replaceState(null, null, window.location.pathname + '?' + pairIdEsc);

      var content = (
        '<div class="modal-inner modal-pair">' +
          '<h2>URL</h2><p><a href="' + pairUrl + '" class="pair-url" target="_blank">' + pairUrl + '</a></p>' +
          '<h2>Code</h2><p class="pair-code">' + pairIdEsc + '</p>' +
        '</div>'
      );

      var modal = new Modal({
        id: 'pairing-screen',
        classes: 'slim',
        title: 'Pair your mobile phone',
        content: content
      }, true);

      // todo: replace `setTimeout`s with `transitionend` event listeners.
      setTimeout(function () {
        // Waiting for the transition to end.
        modal.open();
      }, 150);

      [
        'https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,700',
        '/css/modal.css'  // todo: do not hardcode absolute path
      ].forEach(function (stylesheet) {
        utils.injectCSS({href: stylesheet});
      });

      gamepad.peerConnect(peer).then(function (conn) {
        console.log('Peer connected');
        modal.close();
        resolve(conn);
      });

    }).catch(console.error.bind(console));
  });
};


gamepad._updateState = function (data) {
  Object.keys(data || {}).forEach(function (key) {
    if (!state[key] && data[key]) {
      // button pushed.
      gamepad._emit('buttondown', key);
      gamepad._emit(key + 'buttondown', true);
    } else if (state[key] && !data[key]) {
      // button released.
      gamepad._emit('buttonup', key);
      gamepad._emit(key + 'buttonup', true);
    }
  });
};


gamepad.hidePairingScreen = function () {
  Modal.closeAll();
};


/**
 * Fires an internal event with given data.
 *
 * @method _fire
 * @param {String} eventName Name of event to fire (e.g., `buttondown`).
 * @param {*} data Data to pass to the listener.
 * @private
 */
gamepad._emit = function (eventName, data) {
  console.log(eventName, data);
  (this.listeners[eventName] || []).forEach(function (listener) {
    listener.apply(listener, [data]);
  });
};


/**
 * Binds a listener to a gamepad event.
 *
 * @method bind
 * @param {String} eventName Event to bind to (e.g., `buttondown`).
 * @param {Function} listener Listener to call when given event occurs.
 * @return {Gamepad} Self
 */
gamepad._bind = function (eventName, listener) {
  if (typeof(this.listeners[event]) === 'undefined') {
    this.listeners[event] = [];
  }

  this.listeners[event].push(listener);

  return this;
};


/**
 * Removes listener of given type.
 *
 * If no type is given, all listeners are removed. If no listener is given, all
 * listeners of given type are removed.
 *
 * @method unbind
 * @param {String} [type] Type of listener to remove.
 * @param {Function} [listener] (Optional) The listener function to remove.
 * @return {Boolean} Was unbinding the listener successful.
 */
Gamepad.prototype.unbind = function (eventName, listener) {
  // Remove everything for all event types.
  if (typeof eventName === 'undefined') {
    this.listeners = {};
    return;
  }

  // Remove all listener functions for that event type.
  if (typeof listener === 'undefined') {
    this.listeners[eventName] = [];
    return;
  }

  if (typeof this.listeners[eventName] === 'undefined') {
    return false;
  }

  this.listeners[eventName].forEach(function (value) {
    // Remove only the listener function passed to this method.
    if (value === listener) {
      this.listeners[eventName].splice(i, 1);
      return true;
    }
  });

  return false;
};



// todo: these are mapped directly to NES controller. fix this.
gamepad.buttons = {
  a: {
    clicked: gamepad._bind
  }
};


gamepad.version = settings.VERSION;


var galaxyOrigin = window.location.origin;
var dataOrigin = document.querySelector('[data-galaxy-origin]');
if (dataOrigin) {
  gamepad.galaxyOrigin = dataOrigin.dataset.galaxyOrigin;
}


module.exports = gamepad;

},{"./lib/modal":2,"./lib/utils":3,"./settings":4}],2:[function(require,module,exports){
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
  // Close any open modal.
  var openedModal = document.querySelector('.md-show');
  if (openedModal) {
    openedModal.classList.remove('md-show');
  }
  // TODO: Wait until transition end.
  setTimeout(function () {
    document.body.classList.remove('galaxy-overlayed');
  }, 150);
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


module.exports = Modal;

},{"./utils":3}],3:[function(require,module,exports){
function trace(text, level) {
  console[level || 'log']((window.performance.now() / 1000).toFixed(3) + ': ' + text);
}


function error(text) {
  return trace(text, 'error');
}


function warn(text) {
  return trace(text, 'warn');
}


function polyfill(win) {
  if (!('performance' in win)) {
    win.performance = {
      now: function () {
        return +new Date();
      }
    };
  }

  if (('origin' in win.location)) {
    win.location.origin = win.location.protocol + '//' + win.location.host;
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
    window.DocumentTouch && document instanceof DocumentTouch);
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
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
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


function lockOrientation() {
  var lo = (screen.LockOrientation ||
    screen.mozLockOrientation ||
    screen.webkitLockOrientation ||
    screen.msLockOrientation);
  if (!lo) {
    return warn('Orientation could not be locked');
  }

  lo(orientation);
}


function triggerEvent(type) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.eventName = type;
  (document.body || window).dispatchEvent(event);
}


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.polyfill = polyfill;
module.exports.getPeerId = getPeerId;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;
module.exports.injectCSS = injectCSS;
module.exports.escape = escape;
module.exports.isFullScreen = isFullScreen;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.lockOrientation = lockOrientation;
module.exports.triggerEvent = triggerEvent;

},{}],4:[function(require,module,exports){
var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}

var settings = {
  API_URL: 'http://localhost:5000',  // This URL to the Galaxy API. No trailing slash.
  DEBUG: false,
  PEERJS_KEY: '',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

for (var key in settings_local) {
  settings[key] = settings_local[key];
}

module.exports = settings;

},{"./settings_local.js":5}],5:[function(require,module,exports){
module.exports = {
  DEBUG: true,
  PEERJS_KEY: 'rovu5xmqo69wwmi'
};

},{}]},{},[1])(1)
});