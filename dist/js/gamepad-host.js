!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (window, document) {
'use strict';

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
}


gamepad.listeners = {};
gamepad.state = {};


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
        switch (data.type) {
          case 'state':
            gamepad._updateState(data.data);
            break;
          default:
            console.warn('WebRTC message received of unknown type: "' + data.type + '"');
            break;
        }

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
      window.setTimeout(function () {
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

  this.listeners[eventName].forEach(function (value, idx) {
    // Remove only the listener function passed to this method.
    if (value === listener) {
      this.listeners[eventName].splice(idx, 1);
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

})(window, document);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG4ndXNlIHN0cmljdCc7XG5cbi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wLmpzJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBNb2RhbCA9IHJlcXVpcmUoJy4vbGliL21vZGFsJyk7XG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG51dGlscy5wb2x5ZmlsbCh3aW5kb3cpO1xuXG5cbi8qKlxuICogQSBsaWJyYXJ5IGZvciBjb250cm9sbGluZyBhbiBIVE1MNSBnYW1lIHVzaW5nIFdlYlJUQy5cbiAqXG4gKiBAZXhwb3J0cyBnYW1lcGFkXG4gKiBAbmFtZXNwYWNlIGdhbWVwYWRcbiAqL1xuZnVuY3Rpb24gZ2FtZXBhZCgpIHtcbn1cblxuXG5nYW1lcGFkLmxpc3RlbmVycyA9IHt9O1xuZ2FtZXBhZC5zdGF0ZSA9IHt9O1xuXG5cbi8qKlxuICogMS4gWW91ciBQQyBjb25uZWN0cyB0byB0aGUgc2VydmVyLlxuICogMi4gVGhlIHNlcnZlciBnaXZlcyB5b3VyIFBDIGEgcmFuZG9tbHkgZ2VuZXJhdGVkIG51bWJlciBhbmQgcmVtZW1iZXJzIHRoZSBjb21iaW5hdGlvbiBvZiBudW1iZXIgYW5kIFBDLlxuICogMy4gRnJvbSB5b3VyIG1vYmlsZSBkZXZpY2UsIHNwZWNpZnkgYSBudW1iZXIgYW5kIGNvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqIDQuIElmIHRoZSBudW1iZXIgc3BlY2lmaWVkIGlzIHRoZSBzYW1lIGFzIGZyb20gYSBjb25uZWN0ZWQgUEMsIHlvdXIgbW9iaWxlIGRldmljZSBpcyBwYWlyZWQgd2l0aCB0aGF0IFBDLlxuICogNS4gSWYgdGhlcmUgaXMgbm8gZGVzaWduYXRlZCBQQywgYW4gZXJyb3Igb2NjdXJzLlxuICogNi4gV2hlbiBkYXRhIGNvbWVzIGluIGZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBpdCBpcyBzZW50IHRvIHRoZSBQQyB3aXRoIHdoaWNoIGl0IGlzIHBhaXJlZCwgYW5kIHZpY2UgdmVyc2EuXG4gKi9cblxuXG4vKipcbiAqIERvZXMgYSBoYW5kc2hha2Ugd2l0aCBQZWVySlMnIFdlYlNvY2tldCBzZXJ2ZXIgdG8gZ2V0IGEgcGVlciBJRC5cbiAqXG4gKiBPbmNlIHdlIGhhdmUgdGhlIHBlZXIgSUQsIHdlIGNhbiB0ZWxsIHRoZSBjb250cm9sbGVyIGhvdyB0byBmaW5kIHVzLiBUaGVuXG4gKiBhbGwgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHRoZSBob3N0IGFuZCB0aGUgY29udHJvbGxlciBpcyBwZWVyLXRvLXBlZXIgdmlhXG4gKiBXZWJSVEMgZGF0YSBjaGFubmVscy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGVlcklkIFRoZSBwZWVyIElELlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBlZXJIYW5kc2hha2UgPSBmdW5jdGlvbiAocGVlcklkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKCFwZWVySWQpIHtcbiAgICAgIHBlZXJJZCA9IHV0aWxzLmdldFBlZXJJZCgpOyAgLy8gVGhlIGhvc3QgSUQuXG4gICAgfVxuXG4gICAgdmFyIHBlZXIgPSBuZXcgUGVlcihwZWVySWQsIHtcbiAgICAgIGtleTogc2V0dGluZ3MuUEVFUkpTX0tFWSxcbiAgICAgIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG4gICAgfSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgcGVlci5kZXN0cm95KCk7XG4gICAgfSk7XG5cbiAgICBwZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgICAgIHJlc29sdmUocGVlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIExpc3RlbnMgZm9yIGEgcGVlciBjb25uZWN0aW9uIHdpdGggdGhlIGNvbnRyb2xsZXIgdmlhIFdlYlJUQyBkYXRhIGNoYW5uZWxzLlxuICpcbiAqIElmIG9uZSBpcyBnaXZlbiwgd2Ugd2lsbCB0ZWxsIFBlZXJKUyB0byB1c2UgdGhlIHBlZXIgSUQgdGhlIHF1ZXJ5LXN0cmluZy5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYW1lcGFkXG4gKi9cbmdhbWVwYWQucGVlckNvbm5lY3QgPSBmdW5jdGlvbiAocGVlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHBlZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoY29ubikge1xuICAgICAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc3RhdGUnOlxuICAgICAgICAgICAgZ2FtZXBhZC5fdXBkYXRlU3RhdGUoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dlYlJUQyBtZXNzYWdlIHJlY2VpdmVkIG9mIHVua25vd24gdHlwZTogXCInICsgZGF0YS50eXBlICsgJ1wiJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWNlKCdSZWNlaXZlZDogJyArICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6ICcnKSk7XG4gICAgICB9KTtcblxuICAgICAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2UndmUgY29ubmVjdGVkIHRvIGEgY29udHJvbGxlci5cbiAgICAgIHJlc29sdmUoY29ubik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIENvbm5lY3RzIHRvIGEgcGVlciAoY29udHJvbGxlcikuXG4gKlxuICogRXN0YWJsaXNoZXMgY29ubmVjdGlvbiB3aXRoIHBlZXIuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBhaXIgPSBmdW5jdGlvbiAocGVlcklkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuXG4gICAgcmV0dXJuIGdhbWVwYWQucGVlckhhbmRzaGFrZShwZWVySWQpLnRoZW4oZnVuY3Rpb24gKHBlZXIpIHtcbiAgICAgIHZhciBwYWlySWQgPSBwZWVyLmlkOyAgLy8gVGhpcyBzaG91bGQgYmUgdGhlIHNhbWUgYXMgYHBlZXJJZGAsIGJ1dCB0aGlzIGNvbWVzIGZyb20gUGVlckpTLCB3aGljaCBpcyB0aGUgc291cmNlIG9mIHRydXRoLlxuICAgICAgdmFyIHBhaXJJZEVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChwYWlySWQpO1xuICAgICAgdmFyIHBhaXJVcmwgPSBnYWxheHlPcmlnaW4gKyAnL2NsaWVudC5odG1sPycgKyBwYWlySWRFc2M7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgcXVlcnlzdHJpbmcgaW4gdGhlIGFkZHJlc3MgYmFyLlxuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICc/JyArIHBhaXJJZEVzYyk7XG5cbiAgICAgIHZhciBjb250ZW50ID0gKFxuICAgICAgICAnPGRpdiBjbGFzcz1cIm1vZGFsLWlubmVyIG1vZGFsLXBhaXJcIj4nICtcbiAgICAgICAgICAnPGgyPlVSTDwvaDI+PHA+PGEgaHJlZj1cIicgKyBwYWlyVXJsICsgJ1wiIGNsYXNzPVwicGFpci11cmxcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nICsgcGFpclVybCArICc8L2E+PC9wPicgK1xuICAgICAgICAgICc8aDI+Q29kZTwvaDI+PHAgY2xhc3M9XCJwYWlyLWNvZGVcIj4nICsgcGFpcklkRXNjICsgJzwvcD4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICk7XG5cbiAgICAgIHZhciBtb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICAgIGlkOiAncGFpcmluZy1zY3JlZW4nLFxuICAgICAgICBjbGFzc2VzOiAnc2xpbScsXG4gICAgICAgIHRpdGxlOiAnUGFpciB5b3VyIG1vYmlsZSBwaG9uZScsXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcbiAgICAgIH0sIHRydWUpO1xuXG4gICAgICAvLyB0b2RvOiByZXBsYWNlIGBzZXRUaW1lb3V0YHMgd2l0aCBgdHJhbnNpdGlvbmVuZGAgZXZlbnQgbGlzdGVuZXJzLlxuICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBXYWl0aW5nIGZvciB0aGUgdHJhbnNpdGlvbiB0byBlbmQuXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgIH0sIDE1MCk7XG5cbiAgICAgIFtcbiAgICAgICAgJ2h0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1Tb3VyY2UrU2FucytQcm86MzAwLDQwMCw3MDAnLFxuICAgICAgICAnL2Nzcy9tb2RhbC5jc3MnICAvLyB0b2RvOiBkbyBub3QgaGFyZGNvZGUgYWJzb2x1dGUgcGF0aFxuICAgICAgXS5mb3JFYWNoKGZ1bmN0aW9uIChzdHlsZXNoZWV0KSB7XG4gICAgICAgIHV0aWxzLmluamVjdENTUyh7aHJlZjogc3R5bGVzaGVldH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGdhbWVwYWQucGVlckNvbm5lY3QocGVlcikudGhlbihmdW5jdGlvbiAoY29ubikge1xuICAgICAgICBjb25zb2xlLmxvZygnUGVlciBjb25uZWN0ZWQnKTtcbiAgICAgICAgbW9kYWwuY2xvc2UoKTtcbiAgICAgICAgcmVzb2x2ZShjb25uKTtcbiAgICAgIH0pO1xuXG4gICAgfSkuY2F0Y2goY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpKTtcbiAgfSk7XG59O1xuXG5cbmdhbWVwYWQuX3VwZGF0ZVN0YXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiBPYmplY3Qua2V5cyhkYXRhIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgIGlmICghdGhpcy5zdGF0ZVtrZXldICYmIGRhdGFba2V5XSkge1xuICAgICAvLyBCdXR0b24gcHVzaGVkLlxuICAgICBnYW1lcGFkLl9lbWl0KCdidXR0b25kb3duJywga2V5KTtcbiAgICAgZ2FtZXBhZC5fZW1pdCgnYnV0dG9uZG93bi4nICsga2V5LCBrZXkpO1xuICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW2tleV0gJiYgIWRhdGFba2V5XSkge1xuICAgICAvLyBCdXR0b24gcmVsZWFzZWQuXG4gICAgIGdhbWVwYWQuX2VtaXQoJ2J1dHRvbnVwJywga2V5KTtcbiAgICAgZ2FtZXBhZC5fZW1pdCgnYnV0dG9udXAuJyArIGtleSwga2V5KTtcbiAgIH1cbiB9LmJpbmQodGhpcykpO1xufTtcblxuXG5nYW1lcGFkLmhpZGVQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKCkge1xuICBNb2RhbC5jbG9zZUFsbCgpO1xufTtcblxuXG4vKipcbiAqIEZpcmVzIGFuIGludGVybmFsIGV2ZW50IHdpdGggZ2l2ZW4gZGF0YS5cbiAqXG4gKiBAbWV0aG9kIF9maXJlXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnROYW1lIE5hbWUgb2YgZXZlbnQgdG8gZmlyZSAoZS5nLiwgYGJ1dHRvbmRvd25gKS5cbiAqIEBwYXJhbSB7Kn0gZGF0YSBEYXRhIHRvIHBhc3MgdG8gdGhlIGxpc3RlbmVyLlxuICogQHByaXZhdGVcbiAqL1xuZ2FtZXBhZC5fZW1pdCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcbiAgKHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkobGlzdGVuZXIsIFtkYXRhXSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIEJpbmRzIGEgbGlzdGVuZXIgdG8gYSBnYW1lcGFkIGV2ZW50LlxuICpcbiAqIEBtZXRob2QgYmluZFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50TmFtZSBFdmVudCB0byBiaW5kIHRvIChlLmcuLCBgYnV0dG9uZG93bmApLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgTGlzdGVuZXIgdG8gY2FsbCB3aGVuIGdpdmVuIGV2ZW50IG9jY3Vycy5cbiAqIEByZXR1cm4ge0dhbWVwYWR9IFNlbGZcbiAqL1xuZ2FtZXBhZC5fYmluZCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YodGhpcy5saXN0ZW5lcnNbZXZlbnRdKSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSBbXTtcbiAgfVxuXG4gIHRoaXMubGlzdGVuZXJzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBSZW1vdmVzIGxpc3RlbmVyIG9mIGdpdmVuIHR5cGUuXG4gKlxuICogSWYgbm8gdHlwZSBpcyBnaXZlbiwgYWxsIGxpc3RlbmVycyBhcmUgcmVtb3ZlZC4gSWYgbm8gbGlzdGVuZXIgaXMgZ2l2ZW4sIGFsbFxuICogbGlzdGVuZXJzIG9mIGdpdmVuIHR5cGUgYXJlIHJlbW92ZWQuXG4gKlxuICogQG1ldGhvZCB1bmJpbmRcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdHlwZV0gVHlwZSBvZiBsaXN0ZW5lciB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbbGlzdGVuZXJdIChPcHRpb25hbCkgVGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHRvIHJlbW92ZS5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IFdhcyB1bmJpbmRpbmcgdGhlIGxpc3RlbmVyIHN1Y2Nlc3NmdWwuXG4gKi9cbkdhbWVwYWQucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIC8vIFJlbW92ZSBldmVyeXRoaW5nIGZvciBhbGwgZXZlbnQgdHlwZXMuXG4gIGlmICh0eXBlb2YgZXZlbnROYW1lID09PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gUmVtb3ZlIGFsbCBsaXN0ZW5lciBmdW5jdGlvbnMgZm9yIHRoYXQgZXZlbnQgdHlwZS5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdID0gW107XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0uZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGlkeCkge1xuICAgIC8vIFJlbW92ZSBvbmx5IHRoZSBsaXN0ZW5lciBmdW5jdGlvbiBwYXNzZWQgdG8gdGhpcyBtZXRob2QuXG4gICAgaWYgKHZhbHVlID09PSBsaXN0ZW5lcikge1xuICAgICAgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXS5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuXG5cbi8vIHRvZG86IHRoZXNlIGFyZSBtYXBwZWQgZGlyZWN0bHkgdG8gTkVTIGNvbnRyb2xsZXIuIGZpeCB0aGlzLlxuZ2FtZXBhZC5idXR0b25zID0ge1xuICBhOiB7XG4gICAgY2xpY2tlZDogZ2FtZXBhZC5fYmluZFxuICB9XG59O1xuXG5cbmdhbWVwYWQudmVyc2lvbiA9IHNldHRpbmdzLlZFUlNJT047XG5cblxudmFyIGdhbGF4eU9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG52YXIgZGF0YU9yaWdpbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWdhbGF4eS1vcmlnaW5dJyk7XG5pZiAoZGF0YU9yaWdpbikge1xuICBnYW1lcGFkLmdhbGF4eU9yaWdpbiA9IGRhdGFPcmlnaW4uZGF0YXNldC5nYWxheHlPcmlnaW47XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBnYW1lcGFkO1xuXG59KSh3aW5kb3csIGRvY3VtZW50KTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG5mdW5jdGlvbiBNb2RhbChvcHRzLCBpbmplY3QpIHtcbiAgLy8gQ3JlYXRlIHByb3BlcnRpZXMgZm9yIGBpZGAsIGBjbGFzc2VzYCwgYHRpdGxlYCwgYW5kIGBjb250ZW50YC5cbiAgT2JqZWN0LmtleXMob3B0cykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdGhpc1trZXldID0gb3B0c1trZXldO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIGlmIChpbmplY3QpIHtcbiAgICB0aGlzLmluamVjdCgpO1xuICB9XG59XG5cbk1vZGFsLmNsb3NlQWxsID0gTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAvLyBDbG9zZSBhbnkgb3BlbiBtb2RhbC5cbiAgdmFyIG9wZW5lZE1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kLXNob3cnKTtcbiAgaWYgKG9wZW5lZE1vZGFsKSB7XG4gICAgb3BlbmVkTW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnbWQtc2hvdycpO1xuICB9XG4gIC8vIFRPRE86IFdhaXQgdW50aWwgdHJhbnNpdGlvbiBlbmQuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsYXh5LW92ZXJsYXllZCcpO1xuICB9LCAxNTApO1xufTtcblxuTW9kYWwuaW5qZWN0T3ZlcmxheSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gSW5qZWN0IHRoZSBvdmVybGF5IHdlIHVzZSBmb3Igb3ZlcmxheWluZyBpdCBiZWhpbmQgbW9kYWxzLlxuICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZC1vdmVybGF5JykpIHtcbiAgICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGQuY2xhc3NOYW1lID0gJ21kLW92ZXJsYXknO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZCk7XG4gIH1cbn07XG5cbk1vZGFsLnByb3RvdHlwZS5odG1sID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkLmlkID0gJ21vZGFsLScgKyB0aGlzLmlkO1xuICBkLmNsYXNzTmFtZSA9ICdtZC1tb2RhbCBtZC1lZmZlY3QtMSAnICsgKHRoaXMuY2xhc3NlcyB8fCAnJyk7XG4gIGQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgZC5pbm5lckhUTUwgPSAoXG4gICAgJzxkaXYgY2xhc3M9XCJtZC1jb250ZW50XCI+JyArXG4gICAgICAnPGgzPicgKyB1dGlscy5lc2NhcGUodGhpcy50aXRsZSkgKyAnPC9oMz4gJyArXG4gICAgICAnPGEgY2xhc3M9XCJtZC1jbG9zZVwiIHRpdGxlPVwiQ2xvc2VcIj48c3Bhbj48ZGl2PkNsb3NlPC9kaXY+PC9zcGFuPjwvYT4nICtcbiAgICAgICc8ZGl2PicgKyB0aGlzLmNvbnRlbnQgKyAnPC9kaXY+JyArXG4gICAgJzwvZGl2PidcbiAgKTtcbiAgcmV0dXJuIGQ7XG59O1xuXG5Nb2RhbC5wcm90b3R5cGUuaW5qZWN0ID0gZnVuY3Rpb24gKCkge1xuICBNb2RhbC5pbmplY3RPdmVybGF5KCk7XG5cbiAgdGhpcy5lbCA9IHRoaXMuaHRtbCgpO1xuICB0aGlzLmVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZ2FsYXh5LW92ZXJsYXllZCcpO1xuXG4gIHJldHVybiB0aGlzLmVsO1xufTtcblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCgnbWQtc2hvdycpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsO1xuIiwiZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIHBvbHlmaWxsKHdpbikge1xuICBpZiAoISgncGVyZm9ybWFuY2UnIGluIHdpbikpIHtcbiAgICB3aW4ucGVyZm9ybWFuY2UgPSB7XG4gICAgICBub3c6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAoKCdvcmlnaW4nIGluIHdpbi5sb2NhdGlvbikpIHtcbiAgICB3aW4ubG9jYXRpb24ub3JpZ2luID0gd2luLmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbi5sb2NhdGlvbi5ob3N0O1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0UGVlcklkKCkge1xuICByZXR1cm4gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xufVxuXG5cbnZhciBGSUVMRF9GT0NVU0VEX1RBR1MgPSBbXG4gICdpbnB1dCcsXG4gICdrZXlnZW4nLFxuICAnbWV0ZXInLFxuICAnb3B0aW9uJyxcbiAgJ291dHB1dCcsXG4gICdwcm9ncmVzcycsXG4gICdzZWxlY3QnLFxuICAndGV4dGFyZWEnXG5dO1xuZnVuY3Rpb24gZmllbGRGb2N1c2VkKGUpIHtcbiAgcmV0dXJuIEZJRUxEX0ZPQ1VTRURfVEFHUy5pbmRleE9mKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbn1cblxuXG5mdW5jdGlvbiBoYXNUb3VjaEV2ZW50cygpIHtcbiAgcmV0dXJuICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcbiAgICB3aW5kb3cuRG9jdW1lbnRUb3VjaCAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2gpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RDU1Mob3B0cykge1xuICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgbGluay5ocmVmID0gb3B0cy5ocmVmO1xuICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xuICBPYmplY3Qua2V5cyhvcHRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgbGlua1twcm9wXSA9IG9wdHNbcHJvcF07XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJykuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZSh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmIzM0OycpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmICAvLyBzdGFuZGFyZCBtZXRob2RcbiAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCk7ICAvLyB2ZW5kb3ItcHJlZml4ZWQgbWV0aG9kc1xufVxuXG5mdW5jdGlvbiB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICBpZiAoaXNGdWxsU2NyZWVuKCkpIHtcbiAgICB0cmFjZSgnRW50ZXJpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cmFjZSgnRXhpdGluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvY2tPcmllbnRhdGlvbigpIHtcbiAgdmFyIGxvID0gKHNjcmVlbi5Mb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubW96TG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLndlYmtpdExvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi5tc0xvY2tPcmllbnRhdGlvbik7XG4gIGlmICghbG8pIHtcbiAgICByZXR1cm4gd2FybignT3JpZW50YXRpb24gY291bGQgbm90IGJlIGxvY2tlZCcpO1xuICB9XG5cbiAgbG8ob3JpZW50YXRpb24pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudCh0eXBlKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gIGV2ZW50LmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZXZlbnQuZXZlbnROYW1lID0gdHlwZTtcbiAgKGRvY3VtZW50LmJvZHkgfHwgd2luZG93KS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMucG9seWZpbGwgPSBwb2x5ZmlsbDtcbm1vZHVsZS5leHBvcnRzLmdldFBlZXJJZCA9IGdldFBlZXJJZDtcbm1vZHVsZS5leHBvcnRzLmZpZWxkRm9jdXNlZCA9IGZpZWxkRm9jdXNlZDtcbm1vZHVsZS5leHBvcnRzLmhhc1RvdWNoRXZlbnRzID0gaGFzVG91Y2hFdmVudHM7XG5tb2R1bGUuZXhwb3J0cy5pbmplY3RDU1MgPSBpbmplY3RDU1M7XG5tb2R1bGUuZXhwb3J0cy5lc2NhcGUgPSBlc2NhcGU7XG5tb2R1bGUuZXhwb3J0cy5pc0Z1bGxTY3JlZW4gPSBpc0Z1bGxTY3JlZW47XG5tb2R1bGUuZXhwb3J0cy50b2dnbGVGdWxsU2NyZWVuID0gdG9nZ2xlRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLmxvY2tPcmllbnRhdGlvbiA9IGxvY2tPcmllbnRhdGlvbjtcbm1vZHVsZS5leHBvcnRzLnRyaWdnZXJFdmVudCA9IHRyaWdnZXJFdmVudDtcbiIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUkpTX0tFWTogJycsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbmZvciAodmFyIGtleSBpbiBzZXR0aW5nc19sb2NhbCkge1xuICBzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBERUJVRzogdHJ1ZSxcbiAgUEVFUkpTX0tFWTogJ3JvdnU1eG1xbzY5d3dtaSdcbn07XG4iXX0=
