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
        '<div class="overlay pair-overlay" id="pair-overlay">' +
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
        '../css/modal.css'
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


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.getPeerId = getPeerId;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;
module.exports.injectCSS = injectCSS;
module.exports.escape = escape;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi9tb2RhbC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvdXRpbHMuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3MuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvc2V0dGluZ3NfbG9jYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMC5qcycpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgTW9kYWwgPSByZXF1aXJlKCcuL2xpYi9tb2RhbCcpO1xudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBlcnJvciA9IHV0aWxzLmVycm9yO1xudmFyIHRyYWNlID0gdXRpbHMudHJhY2U7XG5cblxuaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cpKSB7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICBub3c6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiArbmV3IERhdGUoKTtcbiAgICB9XG4gIH07XG59XG5cbmlmICgoJ29yaWdpbicgaW4gd2luZG93LmxvY2F0aW9uKSkge1xuICB3aW5kb3cubG9jYXRpb24ub3JpZ2luID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0O1xufVxuXG5cbi8qKlxuICogQSBsaWJyYXJ5IGZvciBjb250cm9sbGluZyBhbiBIVE1MNSBnYW1lIHVzaW5nIFdlYlJUQy5cbiAqXG4gKiBAZXhwb3J0cyBnYW1lcGFkXG4gKiBAbmFtZXNwYWNlIGdhbWVwYWRcbiAqL1xuZnVuY3Rpb24gZ2FtZXBhZCgpIHtcbn1cblxuXG4vKipcbiAqIDEuIFlvdXIgUEMgY29ubmVjdHMgdG8gdGhlIHNlcnZlci5cbiAqIDIuIFRoZSBzZXJ2ZXIgZ2l2ZXMgeW91ciBQQyBhIHJhbmRvbWx5IGdlbmVyYXRlZCBudW1iZXIgYW5kIHJlbWVtYmVycyB0aGUgY29tYmluYXRpb24gb2YgbnVtYmVyIGFuZCBQQy5cbiAqIDMuIEZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBzcGVjaWZ5IGEgbnVtYmVyIGFuZCBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuXG4gKiA0LiBJZiB0aGUgbnVtYmVyIHNwZWNpZmllZCBpcyB0aGUgc2FtZSBhcyBmcm9tIGEgY29ubmVjdGVkIFBDLCB5b3VyIG1vYmlsZSBkZXZpY2UgaXMgcGFpcmVkIHdpdGggdGhhdCBQQy5cbiAqIDUuIElmIHRoZXJlIGlzIG5vIGRlc2lnbmF0ZWQgUEMsIGFuIGVycm9yIG9jY3Vycy5cbiAqIDYuIFdoZW4gZGF0YSBjb21lcyBpbiBmcm9tIHlvdXIgbW9iaWxlIGRldmljZSwgaXQgaXMgc2VudCB0byB0aGUgUEMgd2l0aCB3aGljaCBpdCBpcyBwYWlyZWQsIGFuZCB2aWNlIHZlcnNhLlxuICovXG5cblxuLyoqXG4gKiBEb2VzIGEgaGFuZHNoYWtlIHdpdGggUGVlckpTJyBXZWJTb2NrZXQgc2VydmVyIHRvIGdldCBhIHBlZXIgSUQuXG4gKlxuICogT25jZSB3ZSBoYXZlIHRoZSBwZWVyIElELCB3ZSBjYW4gdGVsbCB0aGUgY29udHJvbGxlciBob3cgdG8gZmluZCB1cy4gVGhlblxuICogYWxsIGNvbW11bmljYXRpb24gYmV0d2VlbiB0aGUgaG9zdCBhbmQgdGhlIGNvbnRyb2xsZXIgaXMgcGVlci10by1wZWVyIHZpYVxuICogV2ViUlRDIGRhdGEgY2hhbm5lbHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBlZXJJZCBUaGUgcGVlciBJRC5cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wZWVySGFuZHNoYWtlID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGlmICghcGVlcklkKSB7XG4gICAgICBwZWVySWQgPSB1dGlscy5nZXRQZWVySWQoKTsgIC8vIFRoZSBob3N0IElELlxuICAgIH1cblxuICAgIHZhciBwZWVyID0gbmV3IFBlZXIocGVlcklkLCB7XG4gICAgICBrZXk6IHNldHRpbmdzLlBFRVJKU19LRVksXG4gICAgICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxuICAgIH0pO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHBlZXIuZGVzdHJveSgpO1xuICAgIH0pO1xuXG4gICAgcGVlci5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gICAgICByZXNvbHZlKHBlZXIpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBMaXN0ZW5zIGZvciBhIHBlZXIgY29ubmVjdGlvbiB3aXRoIHRoZSBjb250cm9sbGVyIHZpYSBXZWJSVEMgZGF0YSBjaGFubmVscy5cbiAqXG4gKiBJZiBvbmUgaXMgZ2l2ZW4sIHdlIHdpbGwgdGVsbCBQZWVySlMgdG8gdXNlIHRoZSBwZWVyIElEIHRoZSBxdWVyeS1zdHJpbmcuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLnBlZXJDb25uZWN0ID0gZnVuY3Rpb24gKHBlZXIpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBwZWVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkgOiAnJykpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBlcnJvcihlcnIubWVzc2FnZSk7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFdlJ3ZlIGNvbm5lY3RlZCB0byBhIGNvbnRyb2xsZXIuXG4gICAgICByZXNvbHZlKGNvbm4pO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBDb25uZWN0cyB0byBhIHBlZXIgKGNvbnRyb2xsZXIpLlxuICpcbiAqIEVzdGFibGlzaGVzIGNvbm5lY3Rpb24gd2l0aCBwZWVyLlxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbWVwYWRcbiAqL1xuZ2FtZXBhZC5wYWlyID0gZnVuY3Rpb24gKHBlZXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcblxuICAgIHJldHVybiBnYW1lcGFkLnBlZXJIYW5kc2hha2UocGVlcklkKS50aGVuKGZ1bmN0aW9uIChwZWVyKSB7XG4gICAgICB2YXIgcGFpcklkID0gcGVlci5pZDsgIC8vIFRoaXMgc2hvdWxkIGJlIHRoZSBzYW1lIGFzIGBwZWVySWRgLCBidXQgdGhpcyBjb21lcyBmcm9tIFBlZXJKUywgd2hpY2ggaXMgdGhlIHNvdXJjZSBvZiB0cnV0aC5cbiAgICAgIHZhciBwYWlySWRFc2MgPSBlbmNvZGVVUklDb21wb25lbnQocGFpcklkKTtcbiAgICAgIHZhciBwYWlyVXJsID0gZ2FsYXh5T3JpZ2luICsgJy9jbGllbnQuaHRtbD8nICsgcGFpcklkRXNjO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIHF1ZXJ5c3RyaW5nIGluIHRoZSBhZGRyZXNzIGJhci5cbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyAnPycgKyBwYWlySWRFc2MpO1xuXG4gICAgICB2YXIgY29udGVudCA9IChcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJvdmVybGF5IHBhaXItb3ZlcmxheVwiIGlkPVwicGFpci1vdmVybGF5XCI+JyArXG4gICAgICAgICAgJzxoMj5VUkw8L2gyPjxwPjxhIGhyZWY9XCInICsgcGFpclVybCArICdcIiBjbGFzcz1cInBhaXItdXJsXCIgdGFyZ2V0PVwiX2JsYW5rXCI+JyArIHBhaXJVcmwgKyAnPC9hPjwvcD4nICtcbiAgICAgICAgICAnPGgyPkNvZGU8L2gyPjxwIGNsYXNzPVwicGFpci1jb2RlXCI+JyArIHBhaXJJZEVzYyArICc8L3A+JyArXG4gICAgICAgICc8L2Rpdj4nXG4gICAgICApO1xuXG4gICAgICB2YXIgbW9kYWwgPSBuZXcgTW9kYWwoe1xuICAgICAgICBpZDogJ3BhaXJpbmctc2NyZWVuJyxcbiAgICAgICAgY2xhc3NlczogJ3NsaW0nLFxuICAgICAgICB0aXRsZTogJ1BhaXIgeW91ciBtb2JpbGUgcGhvbmUnLFxuICAgICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICB9LCB0cnVlKTtcblxuICAgICAgLy8gdG9kbzogcmVwbGFjZSBgc2V0VGltZW91dGBzIHdpdGggYHRyYW5zaXRpb25lbmRgIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBXYWl0aW5nIGZvciB0aGUgdHJhbnNpdGlvbiB0byBlbmQuXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcbiAgICAgIH0sIDE1MCk7XG5cbiAgICAgIFtcbiAgICAgICAgJ2h0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1Tb3VyY2UrU2FucytQcm86MzAwLDQwMCw3MDAnLFxuICAgICAgICAnLi4vY3NzL21vZGFsLmNzcydcbiAgICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoc3R5bGVzaGVldCkge1xuICAgICAgICB1dGlscy5pbmplY3RDU1Moe2hyZWY6IHN0eWxlc2hlZXR9KTtcbiAgICAgIH0pO1xuXG4gICAgICBnYW1lcGFkLnBlZXJDb25uZWN0KHBlZXIpLnRoZW4oZnVuY3Rpb24gKGNvbm4pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1BlZXIgY29ubmVjdGVkJyk7XG4gICAgICAgIG1vZGFsLmNsb3NlKCk7XG4gICAgICAgIHJlc29sdmUoY29ubik7XG4gICAgICB9KTtcblxuICAgIH0pLmNhdGNoKGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKSk7XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLmhpZGVQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKCkge1xuICBNb2RhbC5jbG9zZUFsbCgpO1xufTtcblxuXG5nYW1lcGFkLnZlcnNpb24gPSBzZXR0aW5ncy5WRVJTSU9OO1xuXG5cbnZhciBnYWxheHlPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xudmFyIGRhdGFPcmlnaW4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1nYWxheHktb3JpZ2luXScpO1xuaWYgKGRhdGFPcmlnaW4pIHtcbiAgZ2FtZXBhZC5nYWxheHlPcmlnaW4gPSBkYXRhT3JpZ2luLmRhdGFzZXQuZ2FsYXh5T3JpZ2luO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2FtZXBhZDtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuXG5mdW5jdGlvbiBNb2RhbChvcHRzLCBpbmplY3QpIHtcbiAgLy8gQ3JlYXRlIHByb3BlcnRpZXMgZm9yIGBpZGAsIGBjbGFzc2VzYCwgYHRpdGxlYCwgYW5kIGBjb250ZW50YC5cbiAgT2JqZWN0LmtleXMob3B0cykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdGhpc1trZXldID0gb3B0c1trZXldO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIGlmIChpbmplY3QpIHtcbiAgICB0aGlzLmluamVjdCgpO1xuICB9XG59XG5cbk1vZGFsLmNsb3NlQWxsID0gTW9kYWwucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAvLyBDbG9zZSBhbnkgb3BlbiBtb2RhbC5cbiAgdmFyIG9wZW5lZE1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1kLXNob3cnKTtcbiAgaWYgKG9wZW5lZE1vZGFsKSB7XG4gICAgb3BlbmVkTW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnbWQtc2hvdycpO1xuICB9XG4gIC8vIFRPRE86IFdhaXQgdW50aWwgdHJhbnNpdGlvbiBlbmQuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsYXh5LW92ZXJsYXllZCcpO1xuICB9LCAxNTApO1xufTtcblxuTW9kYWwuaW5qZWN0T3ZlcmxheSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gSW5qZWN0IHRoZSBvdmVybGF5IHdlIHVzZSBmb3Igb3ZlcmxheWluZyBpdCBiZWhpbmQgbW9kYWxzLlxuICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZC1vdmVybGF5JykpIHtcbiAgICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGQuY2xhc3NOYW1lID0gJ21kLW92ZXJsYXknO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZCk7XG4gIH1cbn07XG5cbk1vZGFsLnByb3RvdHlwZS5odG1sID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkLmlkID0gJ21vZGFsLScgKyB0aGlzLmlkO1xuICBkLmNsYXNzTmFtZSA9ICdtZC1tb2RhbCBtZC1lZmZlY3QtMSAnICsgKHRoaXMuY2xhc3NlcyB8fCAnJyk7XG4gIGQuaW5uZXJIVE1MID0gKFxuICAgICc8ZGl2IGNsYXNzPVwibWQtY29udGVudFwiPicgK1xuICAgICAgJzxoMz4nICsgdXRpbHMuZXNjYXBlKHRoaXMudGl0bGUpICsgJzwvaDM+ICcgK1xuICAgICAgJzxhIGNsYXNzPVwibWQtY2xvc2VcIiB0aXRsZT1cIkNsb3NlXCI+PHNwYW4+PGRpdj5DbG9zZTwvZGl2Pjwvc3Bhbj48L2E+JyArXG4gICAgICAnPGRpdj4nICsgdGhpcy5jb250ZW50ICsgJzwvZGl2PicgK1xuICAgICc8L2Rpdj4nXG4gICk7XG4gIHJldHVybiBkO1xufTtcblxuTW9kYWwucHJvdG90eXBlLmluamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgTW9kYWwuaW5qZWN0T3ZlcmxheSgpO1xuXG4gIHRoaXMuZWwgPSB0aGlzLmh0bWwoKTtcblxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2dhbGF4eS1vdmVybGF5ZWQnKTtcblxuICByZXR1cm4gdGhpcy5lbDtcbn07XG5cbk1vZGFsLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmVsLmNsYXNzTGlzdC5hZGQoJ21kLXNob3cnKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNb2RhbDtcbiIsImZ1bmN0aW9uIHRyYWNlKHRleHQsIGxldmVsKSB7XG4gIGNvbnNvbGVbbGV2ZWwgfHwgJ2xvZyddKCh3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKS50b0ZpeGVkKDMpICsgJzogJyArIHRleHQpO1xufVxuXG5cbmZ1bmN0aW9uIGVycm9yKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICdlcnJvcicpO1xufVxuXG5cbmZ1bmN0aW9uIHdhcm4odGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ3dhcm4nKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRQZWVySWQoKSB7XG4gIHJldHVybiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoJy5odG1sJykgP1xuICAgIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XG59XG5cblxudmFyIEZJRUxEX0ZPQ1VTRURfVEFHUyA9IFtcbiAgJ2lucHV0JyxcbiAgJ2tleWdlbicsXG4gICdtZXRlcicsXG4gICdvcHRpb24nLFxuICAnb3V0cHV0JyxcbiAgJ3Byb2dyZXNzJyxcbiAgJ3NlbGVjdCcsXG4gICd0ZXh0YXJlYSdcbl07XG5mdW5jdGlvbiBmaWVsZEZvY3VzZWQoZSkge1xuICByZXR1cm4gRklFTERfRk9DVVNFRF9UQUdTLmluZGV4T2YoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xufVxuXG5cbmZ1bmN0aW9uIGhhc1RvdWNoRXZlbnRzKCkge1xuICByZXR1cm4gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fFxuICAgIHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaCk7XG59XG5cbmZ1bmN0aW9uIGluamVjdENTUyhvcHRzKSB7XG4gIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuICBsaW5rLmhyZWYgPSBvcHRzLmhyZWY7XG4gIGxpbmsubWVkaWEgPSAnYWxsJztcbiAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG4gIGxpbmsudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gIE9iamVjdC5rZXlzKG9wdHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICBsaW5rW3Byb3BdID0gb3B0c1twcm9wXTtcbiAgfSk7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hlYWQnKS5hcHBlbmRDaGlsZChsaW5rKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlKHRleHQpIHtcbiAgaWYgKCF0ZXh0KSB7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyYjMzQ7Jyk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMudHJhY2UgPSB0cmFjZTtcbm1vZHVsZS5leHBvcnRzLmVycm9yID0gZXJyb3I7XG5tb2R1bGUuZXhwb3J0cy53YXJuID0gd2Fybjtcbm1vZHVsZS5leHBvcnRzLmdldFBlZXJJZCA9IGdldFBlZXJJZDtcbm1vZHVsZS5leHBvcnRzLmZpZWxkRm9jdXNlZCA9IGZpZWxkRm9jdXNlZDtcbm1vZHVsZS5leHBvcnRzLmhhc1RvdWNoRXZlbnRzID0gaGFzVG91Y2hFdmVudHM7XG5tb2R1bGUuZXhwb3J0cy5pbmplY3RDU1MgPSBpbmplY3RDU1M7XG5tb2R1bGUuZXhwb3J0cy5lc2NhcGUgPSBlc2NhcGU7XG4iLCJ2YXIgc2V0dGluZ3NfbG9jYWwgPSB7fTtcbnRyeSB7XG4gIHNldHRpbmdzX2xvY2FsID0gcmVxdWlyZSgnLi9zZXR0aW5nc19sb2NhbC5qcycpO1xufSBjYXRjaCAoZSkge1xufVxuXG52YXIgc2V0dGluZ3MgPSB7XG4gIEFQSV9VUkw6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLCAgLy8gVGhpcyBVUkwgdG8gdGhlIEdhbGF4eSBBUEkuIE5vIHRyYWlsaW5nIHNsYXNoLlxuICBERUJVRzogZmFsc2UsXG4gIFBFRVJKU19LRVk6ICcnLCAgLy8gU2lnbiB1cCBmb3IgYSBrZXkgYXQgaHR0cDovL3BlZXJqcy5jb20vcGVlcnNlcnZlclxuICBWRVJTSU9OOiAnMC4wLjEnICAvLyBWZXJzaW9uIG9mIHRoZSBgZ2FtZXBhZC5qc2Agc2NyaXB0XG59O1xuXG5mb3IgKHZhciBrZXkgaW4gc2V0dGluZ3NfbG9jYWwpIHtcbiAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdzX2xvY2FsW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3M7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgREVCVUc6IHRydWUsXG4gIFBFRVJKU19LRVk6ICdyb3Z1NXhtcW82OXd3bWknXG59O1xuIl19
