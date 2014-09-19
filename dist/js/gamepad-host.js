!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0.js');  // jshint ignore:line
var Modal = require('./lib/modal');
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


if (!('performance' in window)) {
  window.performance = {
    now: function () {
      return +new Date();
    }
  };
}

if (('origin' in window.location)) {
  window.location.origin = window.location.protocol + '//' + window.location.host;
}


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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAuanMnKTsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxudmFyIE1vZGFsID0gcmVxdWlyZSgnLi9saWIvbW9kYWwnKTtcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbmlmICghKCdwZXJmb3JtYW5jZScgaW4gd2luZG93KSkge1xuICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgbm93OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gK25ldyBEYXRlKCk7XG4gICAgfVxuICB9O1xufVxuXG5pZiAoKCdvcmlnaW4nIGluIHdpbmRvdy5sb2NhdGlvbikpIHtcbiAgd2luZG93LmxvY2F0aW9uLm9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcbn1cblxuXG4vKipcbiAqIEEgbGlicmFyeSBmb3IgY29udHJvbGxpbmcgYW4gSFRNTDUgZ2FtZSB1c2luZyBXZWJSVEMuXG4gKlxuICogQGV4cG9ydHMgZ2FtZXBhZFxuICogQG5hbWVzcGFjZSBnYW1lcGFkXG4gKi9cbmZ1bmN0aW9uIGdhbWVwYWQoKSB7XG4gIHRoaXMubGlzdGVuZXJzID0ge307XG4gIHRoaXMuc3RhdGUgPSB7fTtcbn1cblxuXG4vKipcbiAqIDEuIFlvdXIgUEMgY29ubmVjdHMgdG8gdGhlIHNlcnZlci5cbiAqIDIuIFRoZSBzZXJ2ZXIgZ2l2ZXMgeW91ciBQQyBhIHJhbmRvbWx5IGdlbmVyYXRlZCBudW1iZXIgYW5kIHJlbWVtYmVycyB0aGUgY29tYmluYXRpb24gb2YgbnVtYmVyIGFuZCBQQy5cbiAqIDMuIEZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBzcGVjaWZ5IGEgbnVtYmVyIGFuZCBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuXG4gKiA0LiBJZiB0aGUgbnVtYmVyIHNwZWNpZmllZCBpcyB0aGUgc2FtZSBhcyBmcm9tIGEgY29ubmVjdGVkIFBDLCB5b3VyIG1vYmlsZSBkZXZpY2UgaXMgcGFpcmVkIHdpdGggdGhhdCBQQy5cbiAqIDUuIElmIHRoZXJlIGlzIG5vIGRlc2lnbmF0ZWQgUEMsIGFuIGVycm9yIG9jY3Vycy5cbiAqIDYuIFdoZW4gZGF0YSBjb21lcyBpbiBmcm9tIHlvdXIgbW9iaWxlIGRldmljZSwgaXQgaXMgc2VudCB0byB0aGUgUEMgd2l0aCB3aGljaCBpdCBpcyBwYWlyZWQsIGFuZCB2aWNlIHZlcnNhLlxuICovXG5cblxuLyoqXG4gKiBEb2VzIGEgaGFuZHNoYWtlIHdpdGggUGVlckpTJyBXZWJTb2NrZXQgc2VydmVyIHRvIGdldCBhIHBlZXIgSUQuXG4gKlxuICogT25jZSB3ZSBoYXZlIHRoZSBwZWVyIElELCB3ZSBjYW4gdGVsbCB0aGUgY29udHJvbGxlciBob3cgdG8gZmluZCB1cy4gVGhlblxuICogYWxsIGNvbW11bmljYXRpb24gYmV0d2VlbiB0aGUgaG9zdCBhbmQgdGhlIGNvbnRyb2xsZXIgaXMgcGVlci10by1wZWVyIHZpYVxuICogV2ViUlRDIGRhdGEgY2hhbm5lbHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBlZXJJZCBUaGUgcGVlciBJRC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wZWVySGFuZHNoYWtlID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmICghcGVlcklkKSB7XG4gICAgICBwZWVySWQgPSB1dGlscy5nZXRQZWVySWQoKTsgIC8vIFRoZSBob3N0IElELlxuICAgIH1cblxuICAgIHZhciBwZWVyID0gbmV3IFBlZXIocGVlcklkLCB7XG4gICAgICBrZXk6IHNldHRpbmdzLlBFRVJKU19LRVksXG4gICAgICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxuICAgIH0pO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHBlZXIuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgcGVlci5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gICAgICByZXNvbHZlKHBlZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBMaXN0ZW5zIGZvciBhIHBlZXIgY29ubmVjdGlvbiB3aXRoIHRoZSBjb250cm9sbGVyIHZpYSBXZWJSVEMgZGF0YSBjaGFubmVscy5cbiAqXG4gKiBJZiBvbmUgaXMgZ2l2ZW4sIHdlIHdpbGwgdGVsbCBQZWVySlMgdG8gdXNlIHRoZSBwZWVyIElEIHRoZSBxdWVyeS1zdHJpbmcuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBlZXJDb25uZWN0ID0gZnVuY3Rpb24gKHBlZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBwZWVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBnYW1lcGFkLl91cGRhdGVTdGF0ZShkYXRhKTtcbiAgICAgICAgdHJhY2UoJ1JlY2VpdmVkOiAnICsgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyA/IEpTT04uc3RyaW5naWZ5KGRhdGEpIDogJycpKTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25uLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBXZSd2ZSBjb25uZWN0ZWQgdG8gYSBjb250cm9sbGVyLlxuICAgICAgcmVzb2x2ZShjb25uKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5cbi8qKlxuICogQ29ubmVjdHMgdG8gYSBwZWVyIChjb250cm9sbGVyKS5cbiAqXG4gKiBFc3RhYmxpc2hlcyBjb25uZWN0aW9uIHdpdGggcGVlci5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYW1lcGFkXG4gKi9cbmdhbWVwYWQucGFpciA9IGZ1bmN0aW9uIChwZWVySWQpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG5cbiAgICByZXR1cm4gZ2FtZXBhZC5wZWVySGFuZHNoYWtlKHBlZXJJZCkudGhlbihmdW5jdGlvbiAocGVlcikge1xuICAgICAgdmFyIHBhaXJJZCA9IHBlZXIuaWQ7ICAvLyBUaGlzIHNob3VsZCBiZSB0aGUgc2FtZSBhcyBgcGVlcklkYCwgYnV0IHRoaXMgY29tZXMgZnJvbSBQZWVySlMsIHdoaWNoIGlzIHRoZSBzb3VyY2Ugb2YgdHJ1dGguXG4gICAgICB2YXIgcGFpcklkRXNjID0gZW5jb2RlVVJJQ29tcG9uZW50KHBhaXJJZCk7XG4gICAgICB2YXIgcGFpclVybCA9IGdhbGF4eU9yaWdpbiArICcvY2xpZW50Lmh0bWw/JyArIHBhaXJJZEVzYztcblxuICAgICAgLy8gVXBkYXRlIHRoZSBxdWVyeXN0cmluZyBpbiB0aGUgYWRkcmVzcyBiYXIuXG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgbnVsbCwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgJz8nICsgcGFpcklkRXNjKTtcblxuICAgICAgdmFyIGNvbnRlbnQgPSAoXG4gICAgICAgICc8ZGl2IGNsYXNzPVwibW9kYWwtaW5uZXIgbW9kYWwtcGFpclwiPicgK1xuICAgICAgICAgICc8aDI+VVJMPC9oMj48cD48YSBocmVmPVwiJyArIHBhaXJVcmwgKyAnXCIgY2xhc3M9XCJwYWlyLXVybFwiIHRhcmdldD1cIl9ibGFua1wiPicgKyBwYWlyVXJsICsgJzwvYT48L3A+JyArXG4gICAgICAgICAgJzxoMj5Db2RlPC9oMj48cCBjbGFzcz1cInBhaXItY29kZVwiPicgKyBwYWlySWRFc2MgKyAnPC9wPicgK1xuICAgICAgICAnPC9kaXY+J1xuICAgICAgKTtcblxuICAgICAgdmFyIG1vZGFsID0gbmV3IE1vZGFsKHtcbiAgICAgICAgaWQ6ICdwYWlyaW5nLXNjcmVlbicsXG4gICAgICAgIGNsYXNzZXM6ICdzbGltJyxcbiAgICAgICAgdGl0bGU6ICdQYWlyIHlvdXIgbW9iaWxlIHBob25lJyxcbiAgICAgICAgY29udGVudDogY29udGVudFxuICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgIC8vIHRvZG86IHJlcGxhY2UgYHNldFRpbWVvdXRgcyB3aXRoIGB0cmFuc2l0aW9uZW5kYCBldmVudCBsaXN0ZW5lcnMuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gV2FpdGluZyBmb3IgdGhlIHRyYW5zaXRpb24gdG8gZW5kLlxuICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgICB9LCAxNTApO1xuXG4gICAgICBbXG4gICAgICAgICdodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2Nzcz9mYW1pbHk9U291cmNlK1NhbnMrUHJvOjMwMCw0MDAsNzAwJyxcbiAgICAgICAgJy9jc3MvbW9kYWwuY3NzJyAgLy8gdG9kbzogZG8gbm90IGhhcmRjb2RlIGFic29sdXRlIHBhdGhcbiAgICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoc3R5bGVzaGVldCkge1xuICAgICAgICB1dGlscy5pbmplY3RDU1Moe2hyZWY6IHN0eWxlc2hlZXR9KTtcbiAgICAgIH0pO1xuXG4gICAgICBnYW1lcGFkLnBlZXJDb25uZWN0KHBlZXIpLnRoZW4oZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BlZXIgY29ubmVjdGVkJyk7XG4gICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgIHJlc29sdmUoY29ubik7XG4gICAgICB9KTtcblxuICAgIH0pLmNhdGNoKGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKSk7XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLl91cGRhdGVTdGF0ZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gIE9iamVjdC5rZXlzKGRhdGEgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghc3RhdGVba2V5XSAmJiBkYXRhW2tleV0pIHtcbiAgICAgIC8vIGJ1dHRvbiBwdXNoZWQuXG4gICAgICBnYW1lcGFkLl9lbWl0KCdidXR0b25kb3duJywga2V5KTtcbiAgICAgIGdhbWVwYWQuX2VtaXQoa2V5ICsgJ2J1dHRvbmRvd24nLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlW2tleV0gJiYgIWRhdGFba2V5XSkge1xuICAgICAgLy8gYnV0dG9uIHJlbGVhc2VkLlxuICAgICAgZ2FtZXBhZC5fZW1pdCgnYnV0dG9udXAnLCBrZXkpO1xuICAgICAgZ2FtZXBhZC5fZW1pdChrZXkgKyAnYnV0dG9udXAnLCB0cnVlKTtcbiAgICB9XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLmhpZGVQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKCkge1xuICBNb2RhbC5jbG9zZUFsbCgpO1xufTtcblxuXG4vKipcbiAqIEZpcmVzIGFuIGludGVybmFsIGV2ZW50IHdpdGggZ2l2ZW4gZGF0YS5cbiAqXG4gKiBAbWV0aG9kIF9maXJlXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgZXZlbnQgdG8gZmlyZSAoZS5nLiwgYGJ1dHRvbmRvd25gKS5cbiAqIEBwYXJhbSB7Kn0gZGF0YSBEYXRhIHRvIHBhc3MgdG8gdGhlIGxpc3RlbmVyLlxuICogQHByaXZhdGVcbiAqL1xuZ2FtZXBhZC5fZW1pdCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcbiAgY29uc29sZS5sb2coZXZlbnROYW1lLCBkYXRhKTtcbiAgKHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkobGlzdGVuZXIsIFtkYXRhXSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIEJpbmRzIGEgbGlzdGVuZXIgdG8gYSBnYW1lcGFkIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgYmluZFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50TmFtZSBFdmVudCB0byBiaW5kIHRvIChlLmcuLCBgYnV0dG9uZG93bmApLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgTGlzdGVuZXIgdG8gY2FsbCB3aGVuIGdpdmVuIGV2ZW50IG9jY3Vycy5cbiAqIEByZXR1cm4ge0dhbWVwYWR9IFNlbGZcbiAqL1xuZ2FtZXBhZC5fYmluZCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YodGhpcy5saXN0ZW5lcnNbZXZlbnRdKSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSBbXTtcbiAgfVxuXG4gIHRoaXMubGlzdGVuZXJzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZW1vdmVzIGxpc3RlbmVyIG9mIGdpdmVuIHR5cGUuXG4gKlxuICogSWYgbm8gdHlwZSBpcyBnaXZlbiwgYWxsIGxpc3RlbmVycyBhcmUgcmVtb3ZlZC4gSWYgbm8gbGlzdGVuZXIgaXMgZ2l2ZW4sIGFsbFxuICogbGlzdGVuZXJzIG9mIGdpdmVuIHR5cGUgYXJlIHJlbW92ZWQuXG4gKlxuICogQG1ldGhvZCB1bmJpbmRcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdHlwZV0gVHlwZSBvZiBsaXN0ZW5lciB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbGlzdGVuZXJdIChPcHRpb25hbCkgVGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHRvIHJlbW92ZS5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IFdhcyB1bmJpbmRpbmcgdGhlIGxpc3RlbmVyIHN1Y2Nlc3NmdWwuXG4gKi9cbkdhbWVwYWQucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIC8vIFJlbW92ZSBldmVyeXRoaW5nIGZvciBhbGwgZXZlbnQgdHlwZXMuXG4gIGlmICh0eXBlb2YgZXZlbnROYW1lID09PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gUmVtb3ZlIGFsbCBsaXN0ZW5lciBmdW5jdGlvbnMgZm9yIHRoYXQgZXZlbnQgdHlwZS5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdID0gW107XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0uZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IGxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdLnNwbGljZShpLCAxKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuXG5cbi8vIHRvZG86IHRoZXNlIGFyZSBtYXBwZWQgZGlyZWN0bHkgdG8gTkVTIGNvbnRyb2xsZXIuIGZpeCB0aGlzLlxuZ2FtZXBhZC5idXR0b25zID0ge1xuICBhOiB7XG4gICAgY2xpY2tlZDogZ2FtZXBhZC5fYmluZFxuICB9XG59O1xuXG5cbmdhbWVwYWQudmVyc2lvbiA9IHNldHRpbmdzLlZFUlNJT047XG5cblxudmFyIGdhbGF4eU9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG52YXIgZGF0YU9yaWdpbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWdhbGF4eS1vcmlnaW5dJyk7XG5pZiAoZGF0YU9yaWdpbikge1xuICBnYW1lcGFkLmdhbGF4eU9yaWdpbiA9IGRhdGFPcmlnaW4uZGF0YXNldC5nYWxheHlPcmlnaW47XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBnYW1lcGFkO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5cbmZ1bmN0aW9uIE1vZGFsKG9wdHMsIGluamVjdCkge1xuICAvLyBDcmVhdGUgcHJvcGVydGllcyBmb3IgYGlkYCwgYGNsYXNzZXNgLCBgdGl0bGVgLCBhbmQgYGNvbnRlbnRgLlxuICBPYmplY3Qua2V5cyhvcHRzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB0aGlzW2tleV0gPSBvcHRzW2tleV07XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgaWYgKGluamVjdCkge1xuICAgIHRoaXMuaW5qZWN0KCk7XG4gIH1cbn1cblxuTW9kYWwuY2xvc2VBbGwgPSBNb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIENsb3NlIGFueSBvcGVuIG1vZGFsLlxuICB2YXIgb3BlbmVkTW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWQtc2hvdycpO1xuICBpZiAob3BlbmVkTW9kYWwpIHtcbiAgICBvcGVuZWRNb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdtZC1zaG93Jyk7XG4gIH1cbiAgLy8gVE9ETzogV2FpdCB1bnRpbCB0cmFuc2l0aW9uIGVuZC5cbiAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdnYWxheHktb3ZlcmxheWVkJyk7XG4gIH0sIDE1MCk7XG59O1xuXG5Nb2RhbC5pbmplY3RPdmVybGF5ID0gZnVuY3Rpb24gKCkge1xuICAvLyBJbmplY3QgdGhlIG92ZXJsYXkgd2UgdXNlIGZvciBvdmVybGF5aW5nIGl0IGJlaGluZCBtb2RhbHMuXG4gIGlmICghZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kLW92ZXJsYXknKSkge1xuICAgIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZC5jbGFzc05hbWUgPSAnbWQtb3ZlcmxheSc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkKTtcbiAgfVxufTtcblxuTW9kYWwucHJvdG90eXBlLmh0bWwgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGQuaWQgPSAnbW9kYWwtJyArIHRoaXMuaWQ7XG4gIGQuY2xhc3NOYW1lID0gJ21kLW1vZGFsIG1kLWVmZmVjdC0xICcgKyAodGhpcy5jbGFzc2VzIHx8ICcnKTtcbiAgZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICBkLmlubmVySFRNTCA9IChcbiAgICAnPGRpdiBjbGFzcz1cIm1kLWNvbnRlbnRcIj4nICtcbiAgICAgICc8aDM+JyArIHV0aWxzLmVzY2FwZSh0aGlzLnRpdGxlKSArICc8L2gzPiAnICtcbiAgICAgICc8YSBjbGFzcz1cIm1kLWNsb3NlXCIgdGl0bGU9XCJDbG9zZVwiPjxzcGFuPjxkaXY+Q2xvc2U8L2Rpdj48L3NwYW4+PC9hPicgK1xuICAgICAgJzxkaXY+JyArIHRoaXMuY29udGVudCArICc8L2Rpdj4nICtcbiAgICAnPC9kaXY+J1xuICApO1xuICByZXR1cm4gZDtcbn07XG5cbk1vZGFsLnByb3RvdHlwZS5pbmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gIE1vZGFsLmluamVjdE92ZXJsYXkoKTtcblxuICB0aGlzLmVsID0gdGhpcy5odG1sKCk7XG4gIHRoaXMuZWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmVsKTtcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdnYWxheHktb3ZlcmxheWVkJyk7XG5cbiAgcmV0dXJuIHRoaXMuZWw7XG59O1xuXG5Nb2RhbC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCdtZC1zaG93Jyk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWw7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGVlcklkKCkge1xuICByZXR1cm4gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xufVxuXG5cbnZhciBGSUVMRF9GT0NVU0VEX1RBR1MgPSBbXG4gICdpbnB1dCcsXG4gICdrZXlnZW4nLFxuICAnbWV0ZXInLFxuICAnb3B0aW9uJyxcbiAgJ291dHB1dCcsXG4gICdwcm9ncmVzcycsXG4gICdzZWxlY3QnLFxuICAndGV4dGFyZWEnXG5dO1xuZnVuY3Rpb24gZmllbGRGb2N1c2VkKGUpIHtcbiAgcmV0dXJuIEZJRUxEX0ZPQ1VTRURfVEFHUy5pbmRleE9mKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbn1cblxuXG5mdW5jdGlvbiBoYXNUb3VjaEV2ZW50cygpIHtcbiAgcmV0dXJuICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcbiAgICB3aW5kb3cuRG9jdW1lbnRUb3VjaCAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2gpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RDU1Mob3B0cykge1xuICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgbGluay5ocmVmID0gb3B0cy5ocmVmO1xuICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xuICBPYmplY3Qua2V5cyhvcHRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgbGlua1twcm9wXSA9IG9wdHNbcHJvcF07XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJykuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZSh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmIzM0OycpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmICAvLyBzdGFuZGFyZCBtZXRob2RcbiAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCk7ICAvLyB2ZW5kb3ItcHJlZml4ZWQgbWV0aG9kc1xufVxuXG5mdW5jdGlvbiB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICBpZiAoaXNGdWxsU2NyZWVuKCkpIHtcbiAgICB0cmFjZSgnRW50ZXJpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cmFjZSgnRXhpdGluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvY2tPcmllbnRhdGlvbigpIHtcbiAgdmFyIGxvID0gKHNjcmVlbi5Mb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubW96TG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLndlYmtpdExvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi5tc0xvY2tPcmllbnRhdGlvbik7XG4gIGlmICghbG8pIHtcbiAgICByZXR1cm4gd2FybignT3JpZW50YXRpb24gY291bGQgbm90IGJlIGxvY2tlZCcpO1xuICB9XG5cbiAgbG8ob3JpZW50YXRpb24pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudCh0eXBlKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gIGV2ZW50LmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZXZlbnQuZXZlbnROYW1lID0gdHlwZTtcbiAgKGRvY3VtZW50LmJvZHkgfHwgd2luZG93KS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGVlcklkID0gZ2V0UGVlcklkO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluamVjdENTUyA9IGluamVjdENTUztcbm1vZHVsZS5leHBvcnRzLmVzY2FwZSA9IGVzY2FwZTtcbm1vZHVsZS5leHBvcnRzLmlzRnVsbFNjcmVlbiA9IGlzRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLnRvZ2dsZUZ1bGxTY3JlZW4gPSB0b2dnbGVGdWxsU2NyZWVuO1xubW9kdWxlLmV4cG9ydHMubG9ja09yaWVudGF0aW9uID0gbG9ja09yaWVudGF0aW9uO1xubW9kdWxlLmV4cG9ydHMudHJpZ2dlckV2ZW50ID0gdHJpZ2dlckV2ZW50O1xuIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSSlNfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSSlNfS0VZOiAncm92dTV4bXFvNjl3d21pJ1xufTtcbiJdfQ==
