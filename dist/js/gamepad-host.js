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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wLmpzJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBNb2RhbCA9IHJlcXVpcmUoJy4vbGliL21vZGFsJyk7XG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG51dGlscy5wb2x5ZmlsbCh3aW5kb3cpO1xuXG5cbi8qKlxuICogQSBsaWJyYXJ5IGZvciBjb250cm9sbGluZyBhbiBIVE1MNSBnYW1lIHVzaW5nIFdlYlJUQy5cbiAqXG4gKiBAZXhwb3J0cyBnYW1lcGFkXG4gKiBAbmFtZXNwYWNlIGdhbWVwYWRcbiAqL1xuZnVuY3Rpb24gZ2FtZXBhZCgpIHtcbiAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgdGhpcy5zdGF0ZSA9IHt9O1xufVxuXG5cbi8qKlxuICogMS4gWW91ciBQQyBjb25uZWN0cyB0byB0aGUgc2VydmVyLlxuICogMi4gVGhlIHNlcnZlciBnaXZlcyB5b3VyIFBDIGEgcmFuZG9tbHkgZ2VuZXJhdGVkIG51bWJlciBhbmQgcmVtZW1iZXJzIHRoZSBjb21iaW5hdGlvbiBvZiBudW1iZXIgYW5kIFBDLlxuICogMy4gRnJvbSB5b3VyIG1vYmlsZSBkZXZpY2UsIHNwZWNpZnkgYSBudW1iZXIgYW5kIGNvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqIDQuIElmIHRoZSBudW1iZXIgc3BlY2lmaWVkIGlzIHRoZSBzYW1lIGFzIGZyb20gYSBjb25uZWN0ZWQgUEMsIHlvdXIgbW9iaWxlIGRldmljZSBpcyBwYWlyZWQgd2l0aCB0aGF0IFBDLlxuICogNS4gSWYgdGhlcmUgaXMgbm8gZGVzaWduYXRlZCBQQywgYW4gZXJyb3Igb2NjdXJzLlxuICogNi4gV2hlbiBkYXRhIGNvbWVzIGluIGZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBpdCBpcyBzZW50IHRvIHRoZSBQQyB3aXRoIHdoaWNoIGl0IGlzIHBhaXJlZCwgYW5kIHZpY2UgdmVyc2EuXG4gKi9cblxuXG4vKipcbiAqIERvZXMgYSBoYW5kc2hha2Ugd2l0aCBQZWVySlMnIFdlYlNvY2tldCBzZXJ2ZXIgdG8gZ2V0IGEgcGVlciBJRC5cbiAqXG4gKiBPbmNlIHdlIGhhdmUgdGhlIHBlZXIgSUQsIHdlIGNhbiB0ZWxsIHRoZSBjb250cm9sbGVyIGhvdyB0byBmaW5kIHVzLiBUaGVuXG4gKiBhbGwgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHRoZSBob3N0IGFuZCB0aGUgY29udHJvbGxlciBpcyBwZWVyLXRvLXBlZXIgdmlhXG4gKiBXZWJSVEMgZGF0YSBjaGFubmVscy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGVlcklkIFRoZSBwZWVyIElELlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBlZXJIYW5kc2hha2UgPSBmdW5jdGlvbiAocGVlcklkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKCFwZWVySWQpIHtcbiAgICAgIHBlZXJJZCA9IHV0aWxzLmdldFBlZXJJZCgpOyAgLy8gVGhlIGhvc3QgSUQuXG4gICAgfVxuXG4gICAgdmFyIHBlZXIgPSBuZXcgUGVlcihwZWVySWQsIHtcbiAgICAgIGtleTogc2V0dGluZ3MuUEVFUkpTX0tFWSxcbiAgICAgIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG4gICAgfSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgcGVlci5kZXN0cm95KCk7XG4gICAgfSk7XG5cbiAgICBwZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgICAgIHJlc29sdmUocGVlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIExpc3RlbnMgZm9yIGEgcGVlciBjb25uZWN0aW9uIHdpdGggdGhlIGNvbnRyb2xsZXIgdmlhIFdlYlJUQyBkYXRhIGNoYW5uZWxzLlxuICpcbiAqIElmIG9uZSBpcyBnaXZlbiwgd2Ugd2lsbCB0ZWxsIFBlZXJKUyB0byB1c2UgdGhlIHBlZXIgSUQgdGhlIHF1ZXJ5LXN0cmluZy5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYW1lcGFkXG4gKi9cbmdhbWVwYWQucGVlckNvbm5lY3QgPSBmdW5jdGlvbiAocGVlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHBlZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoY29ubikge1xuICAgICAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc3RhdGUnOlxuICAgICAgICAgICAgZ2FtZXBhZC5fdXBkYXRlU3RhdGUoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dlYlJUQyBtZXNzYWdlIHJlY2VpdmVkIG9mIHVua25vd24gdHlwZTogXCInICsgZGF0YS50eXBlICsgJ1wiJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYWNlKCdSZWNlaXZlZDogJyArICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6ICcnKSk7XG4gICAgICB9KTtcblxuICAgICAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2UndmUgY29ubmVjdGVkIHRvIGEgY29udHJvbGxlci5cbiAgICAgIHJlc29sdmUoY29ubik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIENvbm5lY3RzIHRvIGEgcGVlciAoY29udHJvbGxlcikuXG4gKlxuICogRXN0YWJsaXNoZXMgY29ubmVjdGlvbiB3aXRoIHBlZXIuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBhaXIgPSBmdW5jdGlvbiAocGVlcklkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuXG4gICAgcmV0dXJuIGdhbWVwYWQucGVlckhhbmRzaGFrZShwZWVySWQpLnRoZW4oZnVuY3Rpb24gKHBlZXIpIHtcbiAgICAgIHZhciBwYWlySWQgPSBwZWVyLmlkOyAgLy8gVGhpcyBzaG91bGQgYmUgdGhlIHNhbWUgYXMgYHBlZXJJZGAsIGJ1dCB0aGlzIGNvbWVzIGZyb20gUGVlckpTLCB3aGljaCBpcyB0aGUgc291cmNlIG9mIHRydXRoLlxuICAgICAgdmFyIHBhaXJJZEVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChwYWlySWQpO1xuICAgICAgdmFyIHBhaXJVcmwgPSBnYWxheHlPcmlnaW4gKyAnL2NsaWVudC5odG1sPycgKyBwYWlySWRFc2M7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgcXVlcnlzdHJpbmcgaW4gdGhlIGFkZHJlc3MgYmFyLlxuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICc/JyArIHBhaXJJZEVzYyk7XG5cbiAgICAgIHZhciBjb250ZW50ID0gKFxuICAgICAgICAnPGRpdiBjbGFzcz1cIm1vZGFsLWlubmVyIG1vZGFsLXBhaXJcIj4nICtcbiAgICAgICAgICAnPGgyPlVSTDwvaDI+PHA+PGEgaHJlZj1cIicgKyBwYWlyVXJsICsgJ1wiIGNsYXNzPVwicGFpci11cmxcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nICsgcGFpclVybCArICc8L2E+PC9wPicgK1xuICAgICAgICAgICc8aDI+Q29kZTwvaDI+PHAgY2xhc3M9XCJwYWlyLWNvZGVcIj4nICsgcGFpcklkRXNjICsgJzwvcD4nICtcbiAgICAgICAgJzwvZGl2PidcbiAgICAgICk7XG5cbiAgICAgIHZhciBtb2RhbCA9IG5ldyBNb2RhbCh7XG4gICAgICAgIGlkOiAncGFpcmluZy1zY3JlZW4nLFxuICAgICAgICBjbGFzc2VzOiAnc2xpbScsXG4gICAgICAgIHRpdGxlOiAnUGFpciB5b3VyIG1vYmlsZSBwaG9uZScsXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcbiAgICAgIH0sIHRydWUpO1xuXG4gICAgICAvLyB0b2RvOiByZXBsYWNlIGBzZXRUaW1lb3V0YHMgd2l0aCBgdHJhbnNpdGlvbmVuZGAgZXZlbnQgbGlzdGVuZXJzLlxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdhaXRpbmcgZm9yIHRoZSB0cmFuc2l0aW9uIHRvIGVuZC5cbiAgICAgICAgbW9kYWwub3BlbigpO1xuICAgICAgfSwgMTUwKTtcblxuICAgICAgW1xuICAgICAgICAnaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3M/ZmFtaWx5PVNvdXJjZStTYW5zK1BybzozMDAsNDAwLDcwMCcsXG4gICAgICAgICcvY3NzL21vZGFsLmNzcycgIC8vIHRvZG86IGRvIG5vdCBoYXJkY29kZSBhYnNvbHV0ZSBwYXRoXG4gICAgICBdLmZvckVhY2goZnVuY3Rpb24gKHN0eWxlc2hlZXQpIHtcbiAgICAgICAgdXRpbHMuaW5qZWN0Q1NTKHtocmVmOiBzdHlsZXNoZWV0fSk7XG4gICAgICB9KTtcblxuICAgICAgZ2FtZXBhZC5wZWVyQ29ubmVjdChwZWVyKS50aGVuKGZ1bmN0aW9uIChjb25uKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQZWVyIGNvbm5lY3RlZCcpO1xuICAgICAgICBtb2RhbC5jbG9zZSgpO1xuICAgICAgICByZXNvbHZlKGNvbm4pO1xuICAgICAgfSk7XG5cbiAgICB9KS5jYXRjaChjb25zb2xlLmVycm9yLmJpbmQoY29uc29sZSkpO1xuICB9KTtcbn07XG5cblxuZ2FtZXBhZC5fdXBkYXRlU3RhdGUgPSBmdW5jdGlvbiAoZGF0YSkge1xuIE9iamVjdC5rZXlzKGRhdGEgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgaWYgKCF0aGlzLnN0YXRlW2tleV0gJiYgZGF0YVtrZXldKSB7XG4gICAgIC8vIEJ1dHRvbiBwdXNoZWQuXG4gICAgIGdhbWVwYWQuX2VtaXQoJ2J1dHRvbmRvd24nLCBrZXkpO1xuICAgICBnYW1lcGFkLl9lbWl0KCdidXR0b25kb3duLicgKyBrZXksIGtleSk7XG4gICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVba2V5XSAmJiAhZGF0YVtrZXldKSB7XG4gICAgIC8vIEJ1dHRvbiByZWxlYXNlZC5cbiAgICAgZ2FtZXBhZC5fZW1pdCgnYnV0dG9udXAnLCBrZXkpO1xuICAgICBnYW1lcGFkLl9lbWl0KCdidXR0b251cC4nICsga2V5LCBrZXkpO1xuICAgfVxuIH0uYmluZCh0aGlzKSk7XG59O1xuXG5cbmdhbWVwYWQuaGlkZVBhaXJpbmdTY3JlZW4gPSBmdW5jdGlvbiAoKSB7XG4gIE1vZGFsLmNsb3NlQWxsKCk7XG59O1xuXG5cbi8qKlxuICogRmlyZXMgYW4gaW50ZXJuYWwgZXZlbnQgd2l0aCBnaXZlbiBkYXRhLlxuICpcbiAqIEBtZXRob2QgX2ZpcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiBldmVudCB0byBmaXJlIChlLmcuLCBgYnV0dG9uZG93bmApLlxuICogQHBhcmFtIHsqfSBkYXRhIERhdGEgdG8gcGFzcyB0byB0aGUgbGlzdGVuZXIuXG4gKiBAcHJpdmF0ZVxuICovXG5nYW1lcGFkLl9lbWl0ID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSkge1xuICAodGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lci5hcHBseShsaXN0ZW5lciwgW2RhdGFdKTtcbiAgfSk7XG59O1xuXG5cbi8qKlxuICogQmluZHMgYSBsaXN0ZW5lciB0byBhIGdhbWVwYWQgZXZlbnQuXG4gKlxuICogQG1ldGhvZCBiaW5kXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnROYW1lIEV2ZW50IHRvIGJpbmQgdG8gKGUuZy4sIGBidXR0b25kb3duYCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBMaXN0ZW5lciB0byBjYWxsIHdoZW4gZ2l2ZW4gZXZlbnQgb2NjdXJzLlxuICogQHJldHVybiB7R2FtZXBhZH0gU2VsZlxuICovXG5nYW1lcGFkLl9iaW5kID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgaWYgKHR5cGVvZih0aGlzLmxpc3RlbmVyc1tldmVudF0pID09PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IFtdO1xuICB9XG5cbiAgdGhpcy5saXN0ZW5lcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFJlbW92ZXMgbGlzdGVuZXIgb2YgZ2l2ZW4gdHlwZS5cbiAqXG4gKiBJZiBubyB0eXBlIGlzIGdpdmVuLCBhbGwgbGlzdGVuZXJzIGFyZSByZW1vdmVkLiBJZiBubyBsaXN0ZW5lciBpcyBnaXZlbiwgYWxsXG4gKiBsaXN0ZW5lcnMgb2YgZ2l2ZW4gdHlwZSBhcmUgcmVtb3ZlZC5cbiAqXG4gKiBAbWV0aG9kIHVuYmluZFxuICogQHBhcmFtIHtTdHJpbmd9IFt0eXBlXSBUeXBlIG9mIGxpc3RlbmVyIHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtsaXN0ZW5lcl0gKE9wdGlvbmFsKSBUaGUgbGlzdGVuZXIgZnVuY3Rpb24gdG8gcmVtb3ZlLlxuICogQHJldHVybiB7Qm9vbGVhbn0gV2FzIHVuYmluZGluZyB0aGUgbGlzdGVuZXIgc3VjY2Vzc2Z1bC5cbiAqL1xuR2FtZXBhZC5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgLy8gUmVtb3ZlIGV2ZXJ5dGhpbmcgZm9yIGFsbCBldmVudCB0eXBlcy5cbiAgaWYgKHR5cGVvZiBldmVudE5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBSZW1vdmUgYWxsIGxpc3RlbmVyIGZ1bmN0aW9ucyBmb3IgdGhhdCBldmVudCB0eXBlLlxuICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAndW5kZWZpbmVkJykge1xuICAgIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBbXTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodHlwZW9mIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXS5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwgaWR4KSB7XG4gICAgLy8gUmVtb3ZlIG9ubHkgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHBhc3NlZCB0byB0aGlzIG1ldGhvZC5cbiAgICBpZiAodmFsdWUgPT09IGxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdLnNwbGljZShpZHgsIDEpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5cblxuLy8gdG9kbzogdGhlc2UgYXJlIG1hcHBlZCBkaXJlY3RseSB0byBORVMgY29udHJvbGxlci4gZml4IHRoaXMuXG5nYW1lcGFkLmJ1dHRvbnMgPSB7XG4gIGE6IHtcbiAgICBjbGlja2VkOiBnYW1lcGFkLl9iaW5kXG4gIH1cbn07XG5cblxuZ2FtZXBhZC52ZXJzaW9uID0gc2V0dGluZ3MuVkVSU0lPTjtcblxuXG52YXIgZ2FsYXh5T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbnZhciBkYXRhT3JpZ2luID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtZ2FsYXh5LW9yaWdpbl0nKTtcbmlmIChkYXRhT3JpZ2luKSB7XG4gIGdhbWVwYWQuZ2FsYXh5T3JpZ2luID0gZGF0YU9yaWdpbi5kYXRhc2V0LmdhbGF4eU9yaWdpbjtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWVwYWQ7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cblxuZnVuY3Rpb24gTW9kYWwob3B0cywgaW5qZWN0KSB7XG4gIC8vIENyZWF0ZSBwcm9wZXJ0aWVzIGZvciBgaWRgLCBgY2xhc3Nlc2AsIGB0aXRsZWAsIGFuZCBgY29udGVudGAuXG4gIE9iamVjdC5rZXlzKG9wdHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIHRoaXNba2V5XSA9IG9wdHNba2V5XTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBpZiAoaW5qZWN0KSB7XG4gICAgdGhpcy5pbmplY3QoKTtcbiAgfVxufVxuXG5Nb2RhbC5jbG9zZUFsbCA9IE1vZGFsLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gQ2xvc2UgYW55IG9wZW4gbW9kYWwuXG4gIHZhciBvcGVuZWRNb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZC1zaG93Jyk7XG4gIGlmIChvcGVuZWRNb2RhbCkge1xuICAgIG9wZW5lZE1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ21kLXNob3cnKTtcbiAgfVxuICAvLyBUT0RPOiBXYWl0IHVudGlsIHRyYW5zaXRpb24gZW5kLlxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ2dhbGF4eS1vdmVybGF5ZWQnKTtcbiAgfSwgMTUwKTtcbn07XG5cbk1vZGFsLmluamVjdE92ZXJsYXkgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEluamVjdCB0aGUgb3ZlcmxheSB3ZSB1c2UgZm9yIG92ZXJsYXlpbmcgaXQgYmVoaW5kIG1vZGFscy5cbiAgaWYgKCFkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWQtb3ZlcmxheScpKSB7XG4gICAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkLmNsYXNzTmFtZSA9ICdtZC1vdmVybGF5JztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGQpO1xuICB9XG59O1xuXG5Nb2RhbC5wcm90b3R5cGUuaHRtbCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZC5pZCA9ICdtb2RhbC0nICsgdGhpcy5pZDtcbiAgZC5jbGFzc05hbWUgPSAnbWQtbW9kYWwgbWQtZWZmZWN0LTEgJyArICh0aGlzLmNsYXNzZXMgfHwgJycpO1xuICBkLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIGQuaW5uZXJIVE1MID0gKFxuICAgICc8ZGl2IGNsYXNzPVwibWQtY29udGVudFwiPicgK1xuICAgICAgJzxoMz4nICsgdXRpbHMuZXNjYXBlKHRoaXMudGl0bGUpICsgJzwvaDM+ICcgK1xuICAgICAgJzxhIGNsYXNzPVwibWQtY2xvc2VcIiB0aXRsZT1cIkNsb3NlXCI+PHNwYW4+PGRpdj5DbG9zZTwvZGl2Pjwvc3Bhbj48L2E+JyArXG4gICAgICAnPGRpdj4nICsgdGhpcy5jb250ZW50ICsgJzwvZGl2PicgK1xuICAgICc8L2Rpdj4nXG4gICk7XG4gIHJldHVybiBkO1xufTtcblxuTW9kYWwucHJvdG90eXBlLmluamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgTW9kYWwuaW5qZWN0T3ZlcmxheSgpO1xuXG4gIHRoaXMuZWwgPSB0aGlzLmh0bWwoKTtcbiAgdGhpcy5lbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2dhbGF4eS1vdmVybGF5ZWQnKTtcblxuICByZXR1cm4gdGhpcy5lbDtcbn07XG5cbk1vZGFsLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoJ21kLXNob3cnKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbDtcbiIsImZ1bmN0aW9uIHRyYWNlKHRleHQsIGxldmVsKSB7XG4gIGNvbnNvbGVbbGV2ZWwgfHwgJ2xvZyddKCh3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKS50b0ZpeGVkKDMpICsgJzogJyArIHRleHQpO1xufVxuXG5cbmZ1bmN0aW9uIGVycm9yKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICdlcnJvcicpO1xufVxuXG5cbmZ1bmN0aW9uIHdhcm4odGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ3dhcm4nKTtcbn1cblxuXG5mdW5jdGlvbiBwb2x5ZmlsbCh3aW4pIHtcbiAgaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW4pKSB7XG4gICAgd2luLnBlcmZvcm1hbmNlID0ge1xuICAgICAgbm93OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiArbmV3IERhdGUoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKCgnb3JpZ2luJyBpbiB3aW4ubG9jYXRpb24pKSB7XG4gICAgd2luLmxvY2F0aW9uLm9yaWdpbiA9IHdpbi5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW4ubG9jYXRpb24uaG9zdDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldFBlZXJJZCgpIHtcbiAgcmV0dXJuICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcbn1cblxuXG52YXIgRklFTERfRk9DVVNFRF9UQUdTID0gW1xuICAnaW5wdXQnLFxuICAna2V5Z2VuJyxcbiAgJ21ldGVyJyxcbiAgJ29wdGlvbicsXG4gICdvdXRwdXQnLFxuICAncHJvZ3Jlc3MnLFxuICAnc2VsZWN0JyxcbiAgJ3RleHRhcmVhJ1xuXTtcbmZ1bmN0aW9uIGZpZWxkRm9jdXNlZChlKSB7XG4gIHJldHVybiBGSUVMRF9GT0NVU0VEX1RBR1MuaW5kZXhPZihlLnRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG59XG5cblxuZnVuY3Rpb24gaGFzVG91Y2hFdmVudHMoKSB7XG4gIHJldHVybiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8XG4gICAgd2luZG93LkRvY3VtZW50VG91Y2ggJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoKTtcbn1cblxuZnVuY3Rpb24gaW5qZWN0Q1NTKG9wdHMpIHtcbiAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gIGxpbmsuaHJlZiA9IG9wdHMuaHJlZjtcbiAgbGluay5tZWRpYSA9ICdhbGwnO1xuICBsaW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcbiAgbGluay50eXBlID0gJ3RleHQvY3NzJztcbiAgT2JqZWN0LmtleXMob3B0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIGxpbmtbcHJvcF0gPSBvcHRzW3Byb3BdO1xuICB9KTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmFwcGVuZENoaWxkKGxpbmspO1xufVxuXG5mdW5jdGlvbiBlc2NhcGUodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICByZXR1cm4gdGV4dC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJiMzNDsnKTtcbn1cblxuZnVuY3Rpb24gaXNGdWxsU2NyZWVuKCkge1xuICByZXR1cm4gKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJiAgLy8gc3RhbmRhcmQgbWV0aG9kXG4gICAgIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50Lm1zRnVsbHNjcmVlbkVsZW1lbnQpOyAgLy8gdmVuZG9yLXByZWZpeGVkIG1ldGhvZHNcbn1cblxuZnVuY3Rpb24gdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgaWYgKGlzRnVsbFNjcmVlbigpKSB7XG4gICAgdHJhY2UoJ0VudGVyaW5nIGZ1bGwgc2NyZWVuJyk7XG4gICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdHJhY2UoJ0V4aXRpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2NrT3JpZW50YXRpb24oKSB7XG4gIHZhciBsbyA9IChzY3JlZW4uTG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLm1vekxvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi53ZWJraXRMb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubXNMb2NrT3JpZW50YXRpb24pO1xuICBpZiAoIWxvKSB7XG4gICAgcmV0dXJuIHdhcm4oJ09yaWVudGF0aW9uIGNvdWxkIG5vdCBiZSBsb2NrZWQnKTtcbiAgfVxuXG4gIGxvKG9yaWVudGF0aW9uKTtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRXZlbnQodHlwZSkge1xuICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnSFRNTEV2ZW50cycpO1xuICBldmVudC5pbml0RXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gIGV2ZW50LmV2ZW50TmFtZSA9IHR5cGU7XG4gIChkb2N1bWVudC5ib2R5IHx8IHdpbmRvdykuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMudHJhY2UgPSB0cmFjZTtcbm1vZHVsZS5leHBvcnRzLmVycm9yID0gZXJyb3I7XG5tb2R1bGUuZXhwb3J0cy53YXJuID0gd2Fybjtcbm1vZHVsZS5leHBvcnRzLnBvbHlmaWxsID0gcG9seWZpbGw7XG5tb2R1bGUuZXhwb3J0cy5nZXRQZWVySWQgPSBnZXRQZWVySWQ7XG5tb2R1bGUuZXhwb3J0cy5maWVsZEZvY3VzZWQgPSBmaWVsZEZvY3VzZWQ7XG5tb2R1bGUuZXhwb3J0cy5oYXNUb3VjaEV2ZW50cyA9IGhhc1RvdWNoRXZlbnRzO1xubW9kdWxlLmV4cG9ydHMuaW5qZWN0Q1NTID0gaW5qZWN0Q1NTO1xubW9kdWxlLmV4cG9ydHMuZXNjYXBlID0gZXNjYXBlO1xubW9kdWxlLmV4cG9ydHMuaXNGdWxsU2NyZWVuID0gaXNGdWxsU2NyZWVuO1xubW9kdWxlLmV4cG9ydHMudG9nZ2xlRnVsbFNjcmVlbiA9IHRvZ2dsZUZ1bGxTY3JlZW47XG5tb2R1bGUuZXhwb3J0cy5sb2NrT3JpZW50YXRpb24gPSBsb2NrT3JpZW50YXRpb247XG5tb2R1bGUuZXhwb3J0cy50cmlnZ2VyRXZlbnQgPSB0cmlnZ2VyRXZlbnQ7XG4iLCJ2YXIgc2V0dGluZ3NfbG9jYWwgPSB7fTtcbnRyeSB7XG4gIHNldHRpbmdzX2xvY2FsID0gcmVxdWlyZSgnLi9zZXR0aW5nc19sb2NhbC5qcycpO1xufSBjYXRjaCAoZSkge1xufVxuXG52YXIgc2V0dGluZ3MgPSB7XG4gIEFQSV9VUkw6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLCAgLy8gVGhpcyBVUkwgdG8gdGhlIEdhbGF4eSBBUEkuIE5vIHRyYWlsaW5nIHNsYXNoLlxuICBERUJVRzogZmFsc2UsXG4gIFBFRVJKU19LRVk6ICcnLCAgLy8gU2lnbiB1cCBmb3IgYSBrZXkgYXQgaHR0cDovL3BlZXJqcy5jb20vcGVlcnNlcnZlclxuICBWRVJTSU9OOiAnMC4wLjEnICAvLyBWZXJzaW9uIG9mIHRoZSBgZ2FtZXBhZC5qc2Agc2NyaXB0XG59O1xuXG5mb3IgKHZhciBrZXkgaW4gc2V0dGluZ3NfbG9jYWwpIHtcbiAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdzX2xvY2FsW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3M7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgREVCVUc6IHRydWUsXG4gIFBFRVJKU19LRVk6ICdyb3Z1NXhtcW82OXd3bWknXG59O1xuIl19
