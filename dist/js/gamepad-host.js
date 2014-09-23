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
gamepad.prototype.unbind = function (eventName, listener) {
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


return Modal;

};

},{"./utils":3}],3:[function(require,module,exports){
module.exports = function (window, document) {
'use strict';

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHdpbmRvdywgZG9jdW1lbnQpIHtcbid1c2Ugc3RyaWN0JztcblxuLy8gdmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAuanMnKTsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxudmFyIE1vZGFsID0gcmVxdWlyZSgnLi9saWIvbW9kYWwnKSh3aW5kb3csIGRvY3VtZW50KTtcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJykod2luZG93LCBkb2N1bWVudCk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbnV0aWxzLnBvbHlmaWxsKCk7XG5cblxuLyoqXG4gKiBBIGxpYnJhcnkgZm9yIGNvbnRyb2xsaW5nIGFuIEhUTUw1IGdhbWUgdXNpbmcgV2ViUlRDLlxuICpcbiAqIEBleHBvcnRzIGdhbWVwYWRcbiAqIEBuYW1lc3BhY2UgZ2FtZXBhZFxuICovXG5mdW5jdGlvbiBnYW1lcGFkKCkge1xufVxuXG5cbmdhbWVwYWQubGlzdGVuZXJzID0ge307XG5nYW1lcGFkLnN0YXRlID0ge307XG5cblxuLyoqXG4gKiBEb2VzIGEgaGFuZHNoYWtlIHdpdGggUGVlckpTJyBXZWJTb2NrZXQgc2VydmVyIHRvIGdldCBhIHBlZXIgSUQuXG4gKlxuICogT25jZSB3ZSBoYXZlIHRoZSBwZWVyIElELCB3ZSBjYW4gdGVsbCB0aGUgY29udHJvbGxlciBob3cgdG8gZmluZCB1cy4gVGhlblxuICogYWxsIGNvbW11bmljYXRpb24gYmV0d2VlbiB0aGUgaG9zdCBhbmQgdGhlIGNvbnRyb2xsZXIgaXMgcGVlci10by1wZWVyIHZpYVxuICogV2ViUlRDIGRhdGEgY2hhbm5lbHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBlZXJJZCBUaGUgcGVlciBJRC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wZWVySGFuZHNoYWtlID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICBpZiAoIXBlZXJJZCkge1xuICAgICAgcGVlcklkID0gdXRpbHMuZ2V0UGVlcklkKCk7ICAvLyBUaGUgaG9zdCBJRC5cbiAgICB9XG5cbiAgICB2YXIgcGVlciA9IG5ldyB3aW5kb3cuUGVlcihwZWVySWQsIHtcbiAgICAgIGtleTogc2V0dGluZ3MuUEVFUkpTX0tFWSxcbiAgICAgIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG4gICAgfSk7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgcGVlci5kZXN0cm95KCk7XG4gICAgfSk7XG5cbiAgICBwZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgICAgIHJlc29sdmUocGVlcik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIExpc3RlbnMgZm9yIGEgcGVlciBjb25uZWN0aW9uIHdpdGggdGhlIGNvbnRyb2xsZXIgdmlhIFdlYlJUQyBkYXRhIGNoYW5uZWxzLlxuICpcbiAqIElmIG9uZSBpcyBnaXZlbiwgd2Ugd2lsbCB0ZWxsIFBlZXJKUyB0byB1c2UgdGhlIHBlZXIgSUQgdGhlIHF1ZXJ5LXN0cmluZy5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYW1lcGFkXG4gKi9cbmdhbWVwYWQucGVlckNvbm5lY3QgPSBmdW5jdGlvbiAocGVlcikge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHBlZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoY29ubikge1xuICAgICAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHN3aXRjaCAoZGF0YS50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnc3RhdGUnOlxuICAgICAgICAgICAgZ2FtZXBhZC5fdXBkYXRlU3RhdGUoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgICdXZWJSVEMgbWVzc2FnZSByZWNlaXZlZCBvZiB1bmtub3duIHR5cGU6IFwiJyArIGRhdGEudHlwZSArICdcIicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgK1xuICAgICAgICAgICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6ICcnKSk7XG4gICAgICB9KTtcblxuICAgICAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2UndmUgY29ubmVjdGVkIHRvIGEgY29udHJvbGxlci5cbiAgICAgIHJlc29sdmUoY29ubik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuXG4vKipcbiAqIENvbm5lY3RzIHRvIGEgcGVlciAoY29udHJvbGxlcikuXG4gKlxuICogRXN0YWJsaXNoZXMgY29ubmVjdGlvbiB3aXRoIHBlZXIuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBhaXIgPSBmdW5jdGlvbiAocGVlcklkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuXG4gICAgcmV0dXJuIGdhbWVwYWQucGVlckhhbmRzaGFrZShwZWVySWQpLnRoZW4oZnVuY3Rpb24gKHBlZXIpIHtcbiAgICAgIC8vIGBwYWlySWRgIHNob3VsZCBiZSB0aGUgc2FtZSBhcyBgcGVlcklkYCxcbiAgICAgIC8vIGJ1dCBgcGVlci5pZGAgaXMgdGhlIHNvdXJjZSBvZiB0cnV0aC5cbiAgICAgIHZhciBwYWlySWQgPSBwZWVyLmlkO1xuICAgICAgdmFyIHBhaXJJZEVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChwYWlySWQpO1xuICAgICAgdmFyIHBhaXJVcmwgPSBnYWxheHlPcmlnaW4gKyAnL2NsaWVudC5odG1sPycgKyBwYWlySWRFc2M7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgcXVlcnlzdHJpbmcgaW4gdGhlIGFkZHJlc3MgYmFyLlxuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsIG51bGwsXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICc/JyArIHBhaXJJZEVzYyk7XG5cbiAgICAgIHZhciBjb250ZW50ID0gKFxuICAgICAgICAnPGRpdiBjbGFzcz1cIm1vZGFsLWlubmVyIG1vZGFsLXBhaXJcIj4nICtcbiAgICAgICAgICAnPGgyPlVSTDwvaDI+PHA+PGEgaHJlZj1cIicgKyBwYWlyVXJsICtcbiAgICAgICAgICAgICdcIiBjbGFzcz1cInBhaXItdXJsXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIHBhaXJVcmwgKyAnPC9hPjwvcD4nICtcbiAgICAgICAgICAnPGgyPkNvZGU8L2gyPjxwIGNsYXNzPVwicGFpci1jb2RlXCI+JyArIHBhaXJJZEVzYyArICc8L3A+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApO1xuXG4gICAgICB2YXIgbW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgICBpZDogJ3BhaXJpbmctc2NyZWVuJyxcbiAgICAgICAgY2xhc3NlczogJ3NsaW0nLFxuICAgICAgICB0aXRsZTogJ1BhaXIgeW91ciBtb2JpbGUgcGhvbmUnLFxuICAgICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICB9LCB0cnVlKTtcblxuICAgICAgLy8gdG9kbzogcmVwbGFjZSBgc2V0VGltZW91dGBzIHdpdGggYHRyYW5zaXRpb25lbmRgIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gV2FpdGluZyBmb3IgdGhlIHRyYW5zaXRpb24gdG8gZW5kLlxuICAgICAgICBtb2RhbC5vcGVuKCk7XG4gICAgICB9LCAxNTApO1xuXG4gICAgICBbXG4gICAgICAgICdodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2Nzcz9mYW1pbHk9U291cmNlK1NhbnMrUHJvOjMwMCw0MDAsNzAwJyxcbiAgICAgICAgJy9jc3MvbW9kYWwuY3NzJyAgLy8gdG9kbzogZG8gbm90IGhhcmRjb2RlIGFic29sdXRlIHBhdGhcbiAgICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoc3R5bGVzaGVldCkge1xuICAgICAgICB1dGlscy5pbmplY3RDU1Moe2hyZWY6IHN0eWxlc2hlZXR9KTtcbiAgICAgIH0pO1xuXG4gICAgICBnYW1lcGFkLnBlZXJDb25uZWN0KHBlZXIpLnRoZW4oZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BlZXIgY29ubmVjdGVkJyk7XG4gICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgIHJlc29sdmUoY29ubik7XG4gICAgICB9KTtcblxuICAgIH0pLmNhdGNoKGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKSk7XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLl91cGRhdGVTdGF0ZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gT2JqZWN0LmtleXMoZGF0YSB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICBpZiAoIXRoaXMuc3RhdGVba2V5XSAmJiBkYXRhW2tleV0pIHtcbiAgICAgLy8gQnV0dG9uIHB1c2hlZC5cbiAgICAgZ2FtZXBhZC5fZW1pdCgnYnV0dG9uZG93bicsIGtleSk7XG4gICAgIGdhbWVwYWQuX2VtaXQoJ2J1dHRvbmRvd24uJyArIGtleSwga2V5KTtcbiAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtrZXldICYmICFkYXRhW2tleV0pIHtcbiAgICAgLy8gQnV0dG9uIHJlbGVhc2VkLlxuICAgICBnYW1lcGFkLl9lbWl0KCdidXR0b251cCcsIGtleSk7XG4gICAgIGdhbWVwYWQuX2VtaXQoJ2J1dHRvbnVwLicgKyBrZXksIGtleSk7XG4gICB9XG4gfS5iaW5kKHRoaXMpKTtcbn07XG5cblxuZ2FtZXBhZC5oaWRlUGFpcmluZ1NjcmVlbiA9IGZ1bmN0aW9uICgpIHtcbiAgTW9kYWwuY2xvc2VBbGwoKTtcbn07XG5cblxuLyoqXG4gKiBGaXJlcyBhbiBpbnRlcm5hbCBldmVudCB3aXRoIGdpdmVuIGRhdGEuXG4gKlxuICogQG1ldGhvZCBfZmlyZVxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50TmFtZSBOYW1lIG9mIGV2ZW50IHRvIGZpcmUgKGUuZy4sIGBidXR0b25kb3duYCkuXG4gKiBAcGFyYW0geyp9IGRhdGEgRGF0YSB0byBwYXNzIHRvIHRoZSBsaXN0ZW5lci5cbiAqIEBwcml2YXRlXG4gKi9cbmdhbWVwYWQuX2VtaXQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhKSB7XG4gICh0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyLmFwcGx5KGxpc3RlbmVyLCBbZGF0YV0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBCaW5kcyBhIGxpc3RlbmVyIHRvIGEgZ2FtZXBhZCBldmVudC5cbiAqXG4gKiBAbWV0aG9kIGJpbmRcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudE5hbWUgRXZlbnQgdG8gYmluZCB0byAoZS5nLiwgYGJ1dHRvbmRvd25gKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIExpc3RlbmVyIHRvIGNhbGwgd2hlbiBnaXZlbiBldmVudCBvY2N1cnMuXG4gKiBAcmV0dXJuIHtHYW1lcGFkfSBTZWxmXG4gKi9cbmdhbWVwYWQuX2JpbmQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mKHRoaXMubGlzdGVuZXJzW2V2ZW50XSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gW107XG4gIH1cblxuICB0aGlzLmxpc3RlbmVyc1tldmVudF0ucHVzaChsaXN0ZW5lcik7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogUmVtb3ZlcyBsaXN0ZW5lciBvZiBnaXZlbiB0eXBlLlxuICpcbiAqIElmIG5vIHR5cGUgaXMgZ2l2ZW4sIGFsbCBsaXN0ZW5lcnMgYXJlIHJlbW92ZWQuIElmIG5vIGxpc3RlbmVyIGlzIGdpdmVuLCBhbGxcbiAqIGxpc3RlbmVycyBvZiBnaXZlbiB0eXBlIGFyZSByZW1vdmVkLlxuICpcbiAqIEBtZXRob2QgdW5iaW5kXG4gKiBAcGFyYW0ge1N0cmluZ30gW3R5cGVdIFR5cGUgb2YgbGlzdGVuZXIgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2xpc3RlbmVyXSAoT3B0aW9uYWwpIFRoZSBsaXN0ZW5lciBmdW5jdGlvbiB0byByZW1vdmUuXG4gKiBAcmV0dXJuIHtCb29sZWFufSBXYXMgdW5iaW5kaW5nIHRoZSBsaXN0ZW5lciBzdWNjZXNzZnVsLlxuICovXG5nYW1lcGFkLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICAvLyBSZW1vdmUgZXZlcnl0aGluZyBmb3IgYWxsIGV2ZW50IHR5cGVzLlxuICBpZiAodHlwZW9mIGV2ZW50TmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFJlbW92ZSBhbGwgbGlzdGVuZXIgZnVuY3Rpb25zIGZvciB0aGF0IGV2ZW50IHR5cGUuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0aGlzLmxpc3RlbmVyc1tldmVudE5hbWVdLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlLCBpZHgpIHtcbiAgICAvLyBSZW1vdmUgb25seSB0aGUgbGlzdGVuZXIgZnVuY3Rpb24gcGFzc2VkIHRvIHRoaXMgbWV0aG9kLlxuICAgIGlmICh2YWx1ZSA9PT0gbGlzdGVuZXIpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzW2V2ZW50TmFtZV0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cblxuXG4vLyB0b2RvOiB0aGVzZSBhcmUgbWFwcGVkIGRpcmVjdGx5IHRvIE5FUyBjb250cm9sbGVyLiBmaXggdGhpcy5cbmdhbWVwYWQuYnV0dG9ucyA9IHtcbiAgYToge1xuICAgIGNsaWNrZWQ6IGdhbWVwYWQuX2JpbmRcbiAgfVxufTtcblxuXG5nYW1lcGFkLnZlcnNpb24gPSBzZXR0aW5ncy5WRVJTSU9OO1xuXG5cbnZhciBnYWxheHlPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xudmFyIGRhdGFPcmlnaW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1nYWxheHktb3JpZ2luXScpO1xuaWYgKGRhdGFPcmlnaW4pIHtcbiAgZ2FtZXBhZC5nYWxheHlPcmlnaW4gPSBkYXRhT3JpZ2luLmRhdGFzZXQuZ2FsYXh5T3JpZ2luO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2FtZXBhZDtcblxufSkod2luZG93LCBkb2N1bWVudCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG5mdW5jdGlvbiBNb2RhbChvcHRzLCBpbmplY3QpIHtcbiAgLy8gQ3JlYXRlIHByb3BlcnRpZXMgZm9yIGBpZGAsIGBjbGFzc2VzYCwgYHRpdGxlYCwgYW5kIGBjb250ZW50YC5cbiAgT2JqZWN0LmtleXMob3B0cykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdGhpc1trZXldID0gb3B0c1trZXldO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIGlmIChpbmplY3QpIHtcbiAgICB0aGlzLmluamVjdCgpO1xuICB9XG59XG5cbk1vZGFsLmNsb3NlQWxsID0gTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAvLyBDbG9zZSBhbnkgb3BlbiBtb2RhbC5cbiAgdmFyIG9wZW5lZE1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kLXNob3cnKTtcbiAgaWYgKG9wZW5lZE1vZGFsKSB7XG4gICAgb3BlbmVkTW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnbWQtc2hvdycpO1xuICB9XG4gIC8vIFRPRE86IFdhaXQgdW50aWwgdHJhbnNpdGlvbiBlbmQuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsYXh5LW92ZXJsYXllZCcpO1xuICB9LCAxNTApO1xufTtcblxuTW9kYWwuaW5qZWN0T3ZlcmxheSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gSW5qZWN0IHRoZSBvdmVybGF5IHdlIHVzZSBmb3Igb3ZlcmxheWluZyBpdCBiZWhpbmQgbW9kYWxzLlxuICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZC1vdmVybGF5JykpIHtcbiAgICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGQuY2xhc3NOYW1lID0gJ21kLW92ZXJsYXknO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZCk7XG4gIH1cbn07XG5cbk1vZGFsLnByb3RvdHlwZS5odG1sID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkLmlkID0gJ21vZGFsLScgKyB0aGlzLmlkO1xuICBkLmNsYXNzTmFtZSA9ICdtZC1tb2RhbCBtZC1lZmZlY3QtMSAnICsgKHRoaXMuY2xhc3NlcyB8fCAnJyk7XG4gIGQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgZC5pbm5lckhUTUwgPSAoXG4gICAgJzxkaXYgY2xhc3M9XCJtZC1jb250ZW50XCI+JyArXG4gICAgICAnPGgzPicgKyB1dGlscy5lc2NhcGUodGhpcy50aXRsZSkgKyAnPC9oMz4gJyArXG4gICAgICAnPGEgY2xhc3M9XCJtZC1jbG9zZVwiIHRpdGxlPVwiQ2xvc2VcIj48c3Bhbj48ZGl2PkNsb3NlPC9kaXY+PC9zcGFuPjwvYT4nICtcbiAgICAgICc8ZGl2PicgKyB0aGlzLmNvbnRlbnQgKyAnPC9kaXY+JyArXG4gICAgJzwvZGl2PidcbiAgKTtcbiAgcmV0dXJuIGQ7XG59O1xuXG5Nb2RhbC5wcm90b3R5cGUuaW5qZWN0ID0gZnVuY3Rpb24gKCkge1xuICBNb2RhbC5pbmplY3RPdmVybGF5KCk7XG5cbiAgdGhpcy5lbCA9IHRoaXMuaHRtbCgpO1xuICB0aGlzLmVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZ2FsYXh5LW92ZXJsYXllZCcpO1xuXG4gIHJldHVybiB0aGlzLmVsO1xufTtcblxuTW9kYWwucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZWwuY2xhc3NMaXN0LmFkZCgnbWQtc2hvdycpO1xufTtcblxuXG5yZXR1cm4gTW9kYWw7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHRyYWNlKHRleHQsIGxldmVsKSB7XG4gIGNvbnNvbGVbbGV2ZWwgfHwgJ2xvZyddKFxuICAgICh3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKS50b0ZpeGVkKDMpICsgJzogJyArIHRleHQpO1xufVxuXG5cbmZ1bmN0aW9uIGVycm9yKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICdlcnJvcicpO1xufVxuXG5cbmZ1bmN0aW9uIHdhcm4odGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ3dhcm4nKTtcbn1cblxuXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cpKSB7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgbm93OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiArbmV3IERhdGUoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKCgnb3JpZ2luJyBpbiB3aW5kb3cubG9jYXRpb24pKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLm9yaWdpbiA9ICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0KTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGdldFBlZXJJZCgpIHtcbiAgcmV0dXJuICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcbn1cblxuXG52YXIgRklFTERfRk9DVVNFRF9UQUdTID0gW1xuICAnaW5wdXQnLFxuICAna2V5Z2VuJyxcbiAgJ21ldGVyJyxcbiAgJ29wdGlvbicsXG4gICdvdXRwdXQnLFxuICAncHJvZ3Jlc3MnLFxuICAnc2VsZWN0JyxcbiAgJ3RleHRhcmVhJ1xuXTtcbmZ1bmN0aW9uIGZpZWxkRm9jdXNlZChlKSB7XG4gIHJldHVybiBGSUVMRF9GT0NVU0VEX1RBR1MuaW5kZXhPZihlLnRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG59XG5cblxuZnVuY3Rpb24gaGFzVG91Y2hFdmVudHMoKSB7XG4gIHJldHVybiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8XG4gICAgd2luZG93LkRvY3VtZW50VG91Y2ggJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiB3aW5kb3cuRG9jdW1lbnRUb3VjaCk7XG59XG5cbmZ1bmN0aW9uIGluamVjdENTUyhvcHRzKSB7XG4gIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuICBsaW5rLmhyZWYgPSBvcHRzLmhyZWY7XG4gIGxpbmsubWVkaWEgPSAnYWxsJztcbiAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG4gIGxpbmsudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gIE9iamVjdC5rZXlzKG9wdHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICBsaW5rW3Byb3BdID0gb3B0c1twcm9wXTtcbiAgfSk7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hlYWQnKS5hcHBlbmRDaGlsZChsaW5rKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlKHRleHQpIHtcbiAgaWYgKCF0ZXh0KSB7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyYjMzQ7Jyk7XG59XG5cbmZ1bmN0aW9uIGlzRnVsbFNjcmVlbigpIHtcbiAgcmV0dXJuICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgJiYgIC8vIHN0YW5kYXJkIG1ldGhvZFxuICAgICFkb2N1bWVudC5tb3pGdWxsU2NyZWVuRWxlbWVudCAmJlxuICAgICFkb2N1bWVudC53ZWJraXRGdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50KTsgIC8vIHZlbmRvci1wcmVmaXhlZCBtZXRob2RzXG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUZ1bGxTY3JlZW4oKSB7XG4gIGlmIChpc0Z1bGxTY3JlZW4oKSkge1xuICAgIHRyYWNlKCdFbnRlcmluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKFxuICAgICAgICBFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cmFjZSgnRXhpdGluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvY2tPcmllbnRhdGlvbihvcmllbnRhdGlvbikge1xuICB2YXIgbG8gPSAod2luZG93LnNjcmVlbi5Mb2NrT3JpZW50YXRpb24gfHxcbiAgICB3aW5kb3cuc2NyZWVuLm1vekxvY2tPcmllbnRhdGlvbiB8fFxuICAgIHdpbmRvdy5zY3JlZW4ud2Via2l0TG9ja09yaWVudGF0aW9uIHx8XG4gICAgd2luZG93LnNjcmVlbi5tc0xvY2tPcmllbnRhdGlvbik7XG4gIGlmICghbG8pIHtcbiAgICByZXR1cm4gd2FybignT3JpZW50YXRpb24gY291bGQgbm90IGJlIGxvY2tlZCcpO1xuICB9XG5cbiAgcmV0dXJuIGxvKG9yaWVudGF0aW9uKTtcbn1cblxuXG5mdW5jdGlvbiB0cmlnZ2VyRXZlbnQodHlwZSkge1xuICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnSFRNTEV2ZW50cycpO1xuICBldmVudC5pbml0RXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gIGV2ZW50LmV2ZW50TmFtZSA9IHR5cGU7XG4gIChkb2N1bWVudC5ib2R5IHx8IHdpbmRvdykuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cblxucmV0dXJuIHtcbiAgdHJhY2U6IHRyYWNlLFxuICBlcnJvcjogZXJyb3IsXG4gIHdhcm46IHdhcm4sXG4gIHBvbHlmaWxsOiBwb2x5ZmlsbCxcbiAgZ2V0UGVlcklkOiBnZXRQZWVySWQsXG4gIGZpZWxkRm9jdXNlZDogZmllbGRGb2N1c2VkLFxuICBoYXNUb3VjaEV2ZW50czogaGFzVG91Y2hFdmVudHMsXG4gIGluamVjdENTUzogaW5qZWN0Q1NTLFxuICBlc2NhcGU6IGVzY2FwZSxcbiAgaXNGdWxsU2NyZWVuOiBpc0Z1bGxTY3JlZW4sXG4gIHRvZ2dsZUZ1bGxTY3JlZW46IHRvZ2dsZUZ1bGxTY3JlZW4sXG4gIGxvY2tPcmllbnRhdGlvbjogbG9ja09yaWVudGF0aW9uLFxuICB0cmlnZ2VyRXZlbnQ6IHRyaWdnZXJFdmVudFxufTtcblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxuXG52YXIgc2V0dGluZ3MgPSB7XG4gIEFQSV9VUkw6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLCAgLy8gR2FsYXh5IEFQSSBVUkwuIE5vIHRyYWlsaW5nIHNsYXNoLlxuICBERUJVRzogZmFsc2UsXG4gIFBFRVJKU19LRVk6ICcnLCAgLy8gU2lnbiB1cCBmb3IgYSBrZXkgYXQgaHR0cDovL3BlZXJqcy5jb20vcGVlcnNlcnZlclxuICBWRVJTSU9OOiAnMC4wLjEnICAvLyBWZXJzaW9uIG9mIHRoZSBgZ2FtZXBhZC5qc2Agc2NyaXB0XG59O1xuXG4vLyBPdmVycmlkZSBlYWNoIGRlZmF1bHQgc2V0dGluZyB3aXRoIHVzZXItZGVmaW5lZCBzZXR0aW5nLlxuT2JqZWN0LmtleXMoc2V0dGluZ3NfbG9jYWwpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3M7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgREVCVUc6IHRydWUsXG4gIFBFRVJKU19LRVk6ICdyb3Z1NXhtcW82OXd3bWknXG59O1xuIl19
