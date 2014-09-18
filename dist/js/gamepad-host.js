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
        gamepad.updateState(data);
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


gamepad.hidePairingScreen = function () {
  Modal.closeAll();
};


gamepad.updateState = function (newState) {
  if (newState.b) {

  }
};


gamepad.bind = function (eventName) {
  return new Promise(function () {
    resolve();
  }.bind(this));
};


/**
 * Fires an internal event with given data.
 *
 * @method _fire
 * @param {String} eventName Name of event to fire (e.g., buttonpress)
 * @param {*} data Data to pass to the listener
 * @private
 */
gamepad._emit = function (eventName, data) {
  (this.listeners[eventName] || []).forEach(function (listenerFunc) {
    this.listeners[event][i].apply(this.listeners[event][i], [data]);
  });
}

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMC5qcycpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgTW9kYWwgPSByZXF1aXJlKCcuL2xpYi9tb2RhbCcpO1xudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBlcnJvciA9IHV0aWxzLmVycm9yO1xudmFyIHRyYWNlID0gdXRpbHMudHJhY2U7XG5cblxuaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cpKSB7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICBub3c6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiArbmV3IERhdGUoKTtcbiAgICB9XG4gIH07XG59XG5cbmlmICgoJ29yaWdpbicgaW4gd2luZG93LmxvY2F0aW9uKSkge1xuICB3aW5kb3cubG9jYXRpb24ub3JpZ2luID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xufVxuXG5cbi8qKlxuICogQSBsaWJyYXJ5IGZvciBjb250cm9sbGluZyBhbiBIVE1MNSBnYW1lIHVzaW5nIFdlYlJUQy5cbiAqXG4gKiBAZXhwb3J0cyBnYW1lcGFkXG4gKiBAbmFtZXNwYWNlIGdhbWVwYWRcbiAqL1xuZnVuY3Rpb24gZ2FtZXBhZCgpIHtcbiAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbn1cblxuXG4vKipcbiAqIDEuIFlvdXIgUEMgY29ubmVjdHMgdG8gdGhlIHNlcnZlci5cbiAqIDIuIFRoZSBzZXJ2ZXIgZ2l2ZXMgeW91ciBQQyBhIHJhbmRvbWx5IGdlbmVyYXRlZCBudW1iZXIgYW5kIHJlbWVtYmVycyB0aGUgY29tYmluYXRpb24gb2YgbnVtYmVyIGFuZCBQQy5cbiAqIDMuIEZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBzcGVjaWZ5IGEgbnVtYmVyIGFuZCBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuXG4gKiA0LiBJZiB0aGUgbnVtYmVyIHNwZWNpZmllZCBpcyB0aGUgc2FtZSBhcyBmcm9tIGEgY29ubmVjdGVkIFBDLCB5b3VyIG1vYmlsZSBkZXZpY2UgaXMgcGFpcmVkIHdpdGggdGhhdCBQQy5cbiAqIDUuIElmIHRoZXJlIGlzIG5vIGRlc2lnbmF0ZWQgUEMsIGFuIGVycm9yIG9jY3Vycy5cbiAqIDYuIFdoZW4gZGF0YSBjb21lcyBpbiBmcm9tIHlvdXIgbW9iaWxlIGRldmljZSwgaXQgaXMgc2VudCB0byB0aGUgUEMgd2l0aCB3aGljaCBpdCBpcyBwYWlyZWQsIGFuZCB2aWNlIHZlcnNhLlxuICovXG5cblxuLyoqXG4gKiBEb2VzIGEgaGFuZHNoYWtlIHdpdGggUGVlckpTJyBXZWJTb2NrZXQgc2VydmVyIHRvIGdldCBhIHBlZXIgSUQuXG4gKlxuICogT25jZSB3ZSBoYXZlIHRoZSBwZWVyIElELCB3ZSBjYW4gdGVsbCB0aGUgY29udHJvbGxlciBob3cgdG8gZmluZCB1cy4gVGhlblxuICogYWxsIGNvbW11bmljYXRpb24gYmV0d2VlbiB0aGUgaG9zdCBhbmQgdGhlIGNvbnRyb2xsZXIgaXMgcGVlci10by1wZWVyIHZpYVxuICogV2ViUlRDIGRhdGEgY2hhbm5lbHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBlZXJJZCBUaGUgcGVlciBJRC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wZWVySGFuZHNoYWtlID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmICghcGVlcklkKSB7XG4gICAgICBwZWVySWQgPSB1dGlscy5nZXRQZWVySWQoKTsgIC8vIFRoZSBob3N0IElELlxuICAgIH1cblxuICAgIHZhciBwZWVyID0gbmV3IFBlZXIocGVlcklkLCB7XG4gICAgICBrZXk6IHNldHRpbmdzLlBFRVJKU19LRVksXG4gICAgICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxuICAgIH0pO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHBlZXIuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgcGVlci5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gICAgICByZXNvbHZlKHBlZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBMaXN0ZW5zIGZvciBhIHBlZXIgY29ubmVjdGlvbiB3aXRoIHRoZSBjb250cm9sbGVyIHZpYSBXZWJSVEMgZGF0YSBjaGFubmVscy5cbiAqXG4gKiBJZiBvbmUgaXMgZ2l2ZW4sIHdlIHdpbGwgdGVsbCBQZWVySlMgdG8gdXNlIHRoZSBwZWVyIElEIHRoZSBxdWVyeS1zdHJpbmcuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBlZXJDb25uZWN0ID0gZnVuY3Rpb24gKHBlZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBwZWVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBnYW1lcGFkLnVwZGF0ZVN0YXRlKGRhdGEpO1xuICAgICAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkgOiAnJykpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBlcnJvcihlcnIubWVzc2FnZSk7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFdlJ3ZlIGNvbm5lY3RlZCB0byBhIGNvbnRyb2xsZXIuXG4gICAgICByZXNvbHZlKGNvbm4pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBDb25uZWN0cyB0byBhIHBlZXIgKGNvbnRyb2xsZXIpLlxuICpcbiAqIEVzdGFibGlzaGVzIGNvbm5lY3Rpb24gd2l0aCBwZWVyLlxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wYWlyID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcblxuICAgIHJldHVybiBnYW1lcGFkLnBlZXJIYW5kc2hha2UocGVlcklkKS50aGVuKGZ1bmN0aW9uIChwZWVyKSB7XG4gICAgICB2YXIgcGFpcklkID0gcGVlci5pZDsgIC8vIFRoaXMgc2hvdWxkIGJlIHRoZSBzYW1lIGFzIGBwZWVySWRgLCBidXQgdGhpcyBjb21lcyBmcm9tIFBlZXJKUywgd2hpY2ggaXMgdGhlIHNvdXJjZSBvZiB0cnV0aC5cbiAgICAgIHZhciBwYWlySWRFc2MgPSBlbmNvZGVVUklDb21wb25lbnQocGFpcklkKTtcbiAgICAgIHZhciBwYWlyVXJsID0gZ2FsYXh5T3JpZ2luICsgJy9jbGllbnQuaHRtbD8nICsgcGFpcklkRXNjO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHF1ZXJ5c3RyaW5nIGluIHRoZSBhZGRyZXNzIGJhci5cbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyAnPycgKyBwYWlySWRFc2MpO1xuXG4gICAgICB2YXIgY29udGVudCA9IChcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJtb2RhbC1pbm5lciBtb2RhbC1wYWlyXCI+JyArXG4gICAgICAgICAgJzxoMj5VUkw8L2gyPjxwPjxhIGhyZWY9XCInICsgcGFpclVybCArICdcIiBjbGFzcz1cInBhaXItdXJsXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIHBhaXJVcmwgKyAnPC9hPjwvcD4nICtcbiAgICAgICAgICAnPGgyPkNvZGU8L2gyPjxwIGNsYXNzPVwicGFpci1jb2RlXCI+JyArIHBhaXJJZEVzYyArICc8L3A+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApO1xuXG4gICAgICB2YXIgbW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgICBpZDogJ3BhaXJpbmctc2NyZWVuJyxcbiAgICAgICAgY2xhc3NlczogJ3NsaW0nLFxuICAgICAgICB0aXRsZTogJ1BhaXIgeW91ciBtb2JpbGUgcGhvbmUnLFxuICAgICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICB9LCB0cnVlKTtcblxuICAgICAgLy8gdG9kbzogcmVwbGFjZSBgc2V0VGltZW91dGBzIHdpdGggYHRyYW5zaXRpb25lbmRgIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBXYWl0aW5nIGZvciB0aGUgdHJhbnNpdGlvbiB0byBlbmQuXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgIH0sIDE1MCk7XG5cbiAgICAgIFtcbiAgICAgICAgJ2h0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1Tb3VyY2UrU2FucytQcm86MzAwLDQwMCw3MDAnLFxuICAgICAgICAnL2Nzcy9tb2RhbC5jc3MnICAvLyB0b2RvOiBkbyBub3QgaGFyZGNvZGUgYWJzb2x1dGUgcGF0aFxuICAgICAgXS5mb3JFYWNoKGZ1bmN0aW9uIChzdHlsZXNoZWV0KSB7XG4gICAgICAgIHV0aWxzLmluamVjdENTUyh7aHJlZjogc3R5bGVzaGVldH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGdhbWVwYWQucGVlckNvbm5lY3QocGVlcikudGhlbihmdW5jdGlvbiAoY29ubikge1xuICAgICAgICBjb25zb2xlLmxvZygnUGVlciBjb25uZWN0ZWQnKTtcbiAgICAgICAgbW9kYWwuY2xvc2UoKTtcbiAgICAgICAgcmVzb2x2ZShjb25uKTtcbiAgICAgIH0pO1xuXG4gICAgfSkuY2F0Y2goY29uc29sZS5lcnJvci5iaW5kKGNvbnNvbGUpKTtcbiAgfSk7XG59O1xuXG5cbmdhbWVwYWQuaGlkZVBhaXJpbmdTY3JlZW4gPSBmdW5jdGlvbiAoKSB7XG4gIE1vZGFsLmNsb3NlQWxsKCk7XG59O1xuXG5cbmdhbWVwYWQudXBkYXRlU3RhdGUgPSBmdW5jdGlvbiAobmV3U3RhdGUpIHtcbiAgaWYgKG5ld1N0YXRlLmIpIHtcblxuICB9XG59O1xuXG5cbmdhbWVwYWQuYmluZCA9IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uICgpIHtcbiAgICByZXNvbHZlKCk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG5cbi8qKlxuICogRmlyZXMgYW4gaW50ZXJuYWwgZXZlbnQgd2l0aCBnaXZlbiBkYXRhLlxuICpcbiAqIEBtZXRob2QgX2ZpcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudE5hbWUgTmFtZSBvZiBldmVudCB0byBmaXJlIChlLmcuLCBidXR0b25wcmVzcylcbiAqIEBwYXJhbSB7Kn0gZGF0YSBEYXRhIHRvIHBhc3MgdG8gdGhlIGxpc3RlbmVyXG4gKiBAcHJpdmF0ZVxuICovXG5nYW1lcGFkLl9lbWl0ID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSkge1xuICAodGhpcy5saXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXJGdW5jKSB7XG4gICAgdGhpcy5saXN0ZW5lcnNbZXZlbnRdW2ldLmFwcGx5KHRoaXMubGlzdGVuZXJzW2V2ZW50XVtpXSwgW2RhdGFdKTtcbiAgfSk7XG59XG5cbmdhbWVwYWQudmVyc2lvbiA9IHNldHRpbmdzLlZFUlNJT047XG5cblxudmFyIGdhbGF4eU9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG52YXIgZGF0YU9yaWdpbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWdhbGF4eS1vcmlnaW5dJyk7XG5pZiAoZGF0YU9yaWdpbikge1xuICBnYW1lcGFkLmdhbGF4eU9yaWdpbiA9IGRhdGFPcmlnaW4uZGF0YXNldC5nYWxheHlPcmlnaW47XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBnYW1lcGFkO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5cbmZ1bmN0aW9uIE1vZGFsKG9wdHMsIGluamVjdCkge1xuICAvLyBDcmVhdGUgcHJvcGVydGllcyBmb3IgYGlkYCwgYGNsYXNzZXNgLCBgdGl0bGVgLCBhbmQgYGNvbnRlbnRgLlxuICBPYmplY3Qua2V5cyhvcHRzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB0aGlzW2tleV0gPSBvcHRzW2tleV07XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgaWYgKGluamVjdCkge1xuICAgIHRoaXMuaW5qZWN0KCk7XG4gIH1cbn1cblxuTW9kYWwuY2xvc2VBbGwgPSBNb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIENsb3NlIGFueSBvcGVuIG1vZGFsLlxuICB2YXIgb3BlbmVkTW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWQtc2hvdycpO1xuICBpZiAob3BlbmVkTW9kYWwpIHtcbiAgICBvcGVuZWRNb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdtZC1zaG93Jyk7XG4gIH1cbiAgLy8gVE9ETzogV2FpdCB1bnRpbCB0cmFuc2l0aW9uIGVuZC5cbiAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdnYWxheHktb3ZlcmxheWVkJyk7XG4gIH0sIDE1MCk7XG59O1xuXG5Nb2RhbC5pbmplY3RPdmVybGF5ID0gZnVuY3Rpb24gKCkge1xuICAvLyBJbmplY3QgdGhlIG92ZXJsYXkgd2UgdXNlIGZvciBvdmVybGF5aW5nIGl0IGJlaGluZCBtb2RhbHMuXG4gIGlmICghZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kLW92ZXJsYXknKSkge1xuICAgIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZC5jbGFzc05hbWUgPSAnbWQtb3ZlcmxheSc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkKTtcbiAgfVxufTtcblxuTW9kYWwucHJvdG90eXBlLmh0bWwgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGQuaWQgPSAnbW9kYWwtJyArIHRoaXMuaWQ7XG4gIGQuY2xhc3NOYW1lID0gJ21kLW1vZGFsIG1kLWVmZmVjdC0xICcgKyAodGhpcy5jbGFzc2VzIHx8ICcnKTtcbiAgZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICBkLmlubmVySFRNTCA9IChcbiAgICAnPGRpdiBjbGFzcz1cIm1kLWNvbnRlbnRcIj4nICtcbiAgICAgICc8aDM+JyArIHV0aWxzLmVzY2FwZSh0aGlzLnRpdGxlKSArICc8L2gzPiAnICtcbiAgICAgICc8YSBjbGFzcz1cIm1kLWNsb3NlXCIgdGl0bGU9XCJDbG9zZVwiPjxzcGFuPjxkaXY+Q2xvc2U8L2Rpdj48L3NwYW4+PC9hPicgK1xuICAgICAgJzxkaXY+JyArIHRoaXMuY29udGVudCArICc8L2Rpdj4nICtcbiAgICAnPC9kaXY+J1xuICApO1xuICByZXR1cm4gZDtcbn07XG5cbk1vZGFsLnByb3RvdHlwZS5pbmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gIE1vZGFsLmluamVjdE92ZXJsYXkoKTtcblxuICB0aGlzLmVsID0gdGhpcy5odG1sKCk7XG4gIHRoaXMuZWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmVsKTtcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdnYWxheHktb3ZlcmxheWVkJyk7XG5cbiAgcmV0dXJuIHRoaXMuZWw7XG59O1xuXG5Nb2RhbC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lbC5jbGFzc0xpc3QuYWRkKCdtZC1zaG93Jyk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWw7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGVlcklkKCkge1xuICByZXR1cm4gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xufVxuXG5cbnZhciBGSUVMRF9GT0NVU0VEX1RBR1MgPSBbXG4gICdpbnB1dCcsXG4gICdrZXlnZW4nLFxuICAnbWV0ZXInLFxuICAnb3B0aW9uJyxcbiAgJ291dHB1dCcsXG4gICdwcm9ncmVzcycsXG4gICdzZWxlY3QnLFxuICAndGV4dGFyZWEnXG5dO1xuZnVuY3Rpb24gZmllbGRGb2N1c2VkKGUpIHtcbiAgcmV0dXJuIEZJRUxEX0ZPQ1VTRURfVEFHUy5pbmRleE9mKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbn1cblxuXG5mdW5jdGlvbiBoYXNUb3VjaEV2ZW50cygpIHtcbiAgcmV0dXJuICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcbiAgICB3aW5kb3cuRG9jdW1lbnRUb3VjaCAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2gpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RDU1Mob3B0cykge1xuICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgbGluay5ocmVmID0gb3B0cy5ocmVmO1xuICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xuICBPYmplY3Qua2V5cyhvcHRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgbGlua1twcm9wXSA9IG9wdHNbcHJvcF07XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJykuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZSh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmIzM0OycpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmICAvLyBzdGFuZGFyZCBtZXRob2RcbiAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCk7ICAvLyB2ZW5kb3ItcHJlZml4ZWQgbWV0aG9kc1xufVxuXG5mdW5jdGlvbiB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICBpZiAoaXNGdWxsU2NyZWVuKCkpIHtcbiAgICB0cmFjZSgnRW50ZXJpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cmFjZSgnRXhpdGluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvY2tPcmllbnRhdGlvbigpIHtcbiAgdmFyIGxvID0gKHNjcmVlbi5Mb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubW96TG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLndlYmtpdExvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi5tc0xvY2tPcmllbnRhdGlvbik7XG4gIGlmICghbG8pIHtcbiAgICByZXR1cm4gd2FybignT3JpZW50YXRpb24gY291bGQgbm90IGJlIGxvY2tlZCcpO1xuICB9XG5cbiAgbG8ob3JpZW50YXRpb24pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudCh0eXBlKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gIGV2ZW50LmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZXZlbnQuZXZlbnROYW1lID0gdHlwZTtcbiAgKGRvY3VtZW50LmJvZHkgfHwgd2luZG93KS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGVlcklkID0gZ2V0UGVlcklkO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluamVjdENTUyA9IGluamVjdENTUztcbm1vZHVsZS5leHBvcnRzLmVzY2FwZSA9IGVzY2FwZTtcbm1vZHVsZS5leHBvcnRzLmlzRnVsbFNjcmVlbiA9IGlzRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLnRvZ2dsZUZ1bGxTY3JlZW4gPSB0b2dnbGVGdWxsU2NyZWVuO1xubW9kdWxlLmV4cG9ydHMubG9ja09yaWVudGF0aW9uID0gbG9ja09yaWVudGF0aW9uO1xubW9kdWxlLmV4cG9ydHMudHJpZ2dlckV2ZW50ID0gdHJpZ2dlckV2ZW50O1xuIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSSlNfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSSlNfS0VZOiAncm92dTV4bXFvNjl3d21pJ1xufTtcbiJdfQ==
