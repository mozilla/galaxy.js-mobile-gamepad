(function (window, document) {
'use strict';

var Plink = require('plink');
// var Promise = require('./external/promise-1.0.0.js');  // jshint ignore:line

var Modal = require('./lib/modal')(window, document);
var settings = require('./settings');
var utils = require('./lib/utils')(window, document);
var routes = require('./lib/routes');
var error = utils.error;
var trace = utils.trace;
var warn = utils.warn;


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

  this.state = {};
}


/**
 * Retrieve the version of the Gamepad.
 *
 * @private
 * @param {String} routeName The name of the route (e.g., `client`).
 * @returns {String}
 * @memberOf Gamepad
 */
Gamepad.prototype.version = gamepad.version = settings.VERSION;


/**
 * Retrieve the origin of Galaxy server hosting the gamepad files.
 *
 * This is the origin (protocol + hostname + port) of where the iframe,
 * controller, etc. live.
 *
 * @returns {String}
 * @memberOf Gamepad
 */
Gamepad.prototype.getGamepadOrigin = gamepad.getGamepadOrigin = function () {
  // This is a function instead of a property, because this element could be
  // injected after this script is loaded but before the origin is retrieved.
  var dataOrigin = document.querySelector('[data-gamepad-origin]');
  if (dataOrigin) {
    return dataOrigin.dataset.gamepadOrigin;
  }

  return settings.GAMEPAD_ORIGIN;
};


/**
 * Reverse a URL from a route name.
 *
 * For example, turn `client` to `/client.html`.
 *
 * @private
 * @param {String} routeName The name of the route (e.g., `client`).
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype._reverse_url = function (routeName) {
  if (!(routeName in routes)) {
    throw 'No route matches for that name: ' + routeName;
  }

  return this.getGamepadOrigin() + routes[routeName];
};


/**
 * Handle metadata signalling and create a peer-to-peer connection.
 *
 * After handshaking with the WebSocket signalling server, listen for and
 * establish a a peer connection (via WebRTC's `RTCPeerConnection`) using a
 * shared key. All subsequent communication between the controller and the
 * host is directly peer to peer.
 *
 * @private
 * @param {String} [peerKey] (Optional) The shared peer key.
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype._handshake = function (peerKey) {
  return new Promise(function (resolve, reject) {
    if (!peerKey) {
      peerKey = utils.getPeerKey();  // The host key.
    }
    trace('Peer key: ' + peerKey);

    // Create a root `plink` instance.
    var plink = Plink.create();
    trace('Waiting for peer to connect');

    // Connect to `plink-server` and await connection using the peer ID.
    var link = plink.connect(settings.WS_URL);
    link.on('connection', function (peer) {
      resolve(peer);
    }).on('close', function () {
      // TODO: Reconnect to signalling server (#60).
      warn('Connection lost with signalling server');
    }).on('error', function (err) {
      error('Could not connect to `plink-server`: ' +
        JSON.stringify(err));
      reject(err);
    });

    // Set a key. Other peers can use to connect to this browser using this
    // key via the connected `plink-server`.
    // (This returns a Promise on whether the operation succeeded.)
    link.setKey(peerKey);
  });
};


/**
 * Connect to a controller using a shared peer key.
 *
 * Handshake with the WebSocket signalling server, listen for and establish a
 * a peer connection (via WebRTC's `RTCPeerConnection`), and relay messages
 * from the controller to the game.
 *
 * @private
 * @param {String} [peerKey] (Optional) The shared peer key.
 * @returns {Promise}
 * @memberOf Gamepad
 */
Gamepad.prototype.pair = function (peerKey) {
  return new Promise(function (resolve, reject) {
    trace('Pairing started');

    var pairKeySafe = encodeURIComponent(peerKey || '');

    if (!peerKey) {
      peerKey = utils.getPeerKey();
      pairKeySafe = encodeURIComponent(peerKey || '');
    }

    var pairUrl = this._reverse_url('client') + '?' + pairKeySafe;

    var content = (
      '<div class="modal-inner modal-pair">' +
        '<h2>URL</h2><p><a href="' + pairUrl +
          '" class="pair-url" target="_blank">' + pairUrl + '</a></p>' +
        '<h2>Code</h2><p class="pair-code">' + pairKeySafe + '</p>' +
      '</div>'
    );

    this.modal = new Modal({
      id: 'pairing-screen',
      classes: 'slim',
      title: 'Pair your mobile phone',
      content: content
    }, true);

    this.modal.open().then(function () {
      trace('Modal opened');
    });

    [
      'https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,700',
      '/css/modal.css'  // TODO: do not hardcode absolute path
    ].forEach(function (stylesheet) {
      utils.injectCSS({href: stylesheet});
    });

    return this._handshake(peerKey).then(function (peer) {
      trace('[' + peer.address + '] Connected');

      peer.on('open', function () {
        trace('[' + peer.address + '] Opened');
        resolve(peer);
      });

      peer.on('close', function () {
        trace('[' + peer.address + '] Closed');
      });

      peer.on('error', function (err) {
        error('[' + peer.address + '] Error: ' +
          (typeof err === 'object' ? JSON.stringify(err) : err));
        reject(peer);
      });

      peer.on('message', function (msg) {
        if (typeof msg === 'object' && msg.type) {
          switch (msg.type) {
            case 'state':
              trace('[' + peer.address + '] Received new controller state: ' +
                (typeof msg === 'object' ? JSON.stringify(msg) : msg));
              return this._updateState(msg.data);
            default:
              return warn('[' + peer.address + '] Received message of ' +
                'unexpected type (' + (msg.type || '') + '): ' +
                (typeof msg === 'object' ? JSON.stringify(msg) : msg));
          }
        }

        warn('[' + peer.address + '] Received unexpected message: ' +
          (typeof msg === 'object' ? JSON.stringify(msg) : msg));
      }.bind(this));
    }.bind(this)).then(function () {
      this.modal.close();
    }.bind(this)).catch(function (err) {
      console.trace(err.stack ? err.stack : err);
    });
  }.bind(this));
};


/**
 * Update the state of the controller.
 *
 * @private
 * @memberOf Gamepad
 */
Gamepad.prototype._updateState = function (data) {
  this.state = data;

  Object.keys(data || {}).forEach(function (key) {
    if (!this.state[key] && data[key]) {
      // Button pushed.
      this._emit('buttondown', key);
      this._emit('buttondown.' + key, key);
    } else if (this.state[key] && !data[key]) {
      // Button released.
      this._emit('buttonup', key);
      this._emit('buttonup.' + key, key);
    }
  }.bind(this));
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
 * Fire an internal event with given data.
 *
 * @private
 * @method _fire
 * @param {String} eventName Name of event to fire (e.g., `buttondown`).
 * @param {*} data Data to pass to the listener.
 */
Gamepad.prototype._emit = function (eventName, data) {
  // For now, skip.
  // (this.listeners[eventName] || []).forEach(function (listener) {
  //   listener.apply(listener, [data]);
  // });
};


/**
 * Bind a listener to a gamepad event.
 *
 * @private
 * @method bind
 * @param {String} eventName Event to bind to (e.g., `buttondown`).
 * @param {Function} listener Listener to call when given event occurs.
 * @return {Gamepad} Self
 */
Gamepad.prototype._bind = function (eventName, listener) {
  if (typeof(this.listeners[event]) === 'undefined') {
    this.listeners[event] = [];
  }

  this.listeners[event].push(listener);

  return this;
};


/**
 * Remove listener of given type.
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


module.exports = gamepad;

})(window, document);
