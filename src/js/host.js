(function (window, document) {
'use strict';

var Emitter = require('events').EventEmitter;

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


var GAMEPAD_DEFAULT_OPTIONS = {
  // Which transport protocol to try first (choices: 'webrtc' or 'websocket').
  protocol: 'webrtc'
};


/**
 * A library to control an HTML5 game using WebRTC or WebSocket.
 *
 * @param {String} emmiter Event emmiter.
 * @param {String} opts Options for gamepad (e.g., protocol).
 * @exports Gamepad
 * @namespace Gamepad
 */
function MobileGamepad(emitter, opts) {
  if (!emitter) {
    throw 'Emitter required!';
  }

  this.emitter = emitter;

  // Set properties based on options passed in, using defaults if missing.
  Object.keys(GAMEPAD_DEFAULT_OPTIONS).forEach(function (key) {
    this[key] = key in opts ? opts[key] : GAMEPAD_DEFAULT_OPTIONS[key];
  }.bind(this));

  this.connected = false;
  this.state = {};
}


/**
 * A library to control an HTML5 game using WebRTC or WebSocket.
 *
 * @param {String} opts Options for gamepad (e.g., protocol).
 * @memberOf Gamepad
 */
MobileGamepad.create = function (opts) {
  if (!opts) {
    opts = {};
  }

  var emitter = new Emitter();

  return new MobileGamepad(emitter, opts);
};


/**
 * Retrieve the version of the Gamepad.
 *
 * @private
 * @param {String} routeName The name of the route (e.g., `client`).
 * @returns {String}
 * @memberOf Gamepad
 */
MobileGamepad.prototype.version = settings.VERSION;


/**
 * Retrieve the origin of Galaxy server hosting the gamepad files.
 *
 * This is the origin (protocol + hostname + port) of where the iframe,
 * controller, etc. live.
 *
 * @returns {String}
 * @memberOf Gamepad
 */
MobileGamepad.prototype.getGamepadOrigin = function () {
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
MobileGamepad.prototype._reverse_url = function (routeName) {
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
MobileGamepad.prototype._pair = function (peerKey) {
  return new Promise(function (resolve, reject) {
    if (!peerKey) {
      peerKey = utils.getPeerKey();  // The host key.
    }
    trace('Peer key: ' + peerKey);

    var numReattempts = 0;

    // 1. Create a root `plink` instance.
    var plink = Plink.create();
    trace('Waiting for peer to connect');

    // 2. Connect to signalling server (`plink-server`).
    var link = plink.connect(settings.WS_URL);

    // 3. `link` emits `open` event (no event listener needed).

    // 4. Send this message containing our peer key *to* the signalling server:
    //
    //    {
    //       "type": "set key",
    //       "key": "1234"
    //    }
    //
    // Other peers can then use the key to connect to this game via the the
    // signalling server. Notice: this does not need to happen inside an
    // `open` event listener.
    //
    // Or "use key" if controller is already online.
    link.on('open', function () {
      link.setKey(peerKey).then(function () {
        trace('Sent message to signalling server: ' +
          JSON.stringify({type: 'set key', key: peerKey}));
      }).catch(function (err) {
        warn('Controller is already online; "set key" message rejected by ' +
          'signalling server: ' + err);

        link.useKey(peerKey).then(function () {
          trace('Sent message to signalling server: ' +
            JSON.stringify({type: 'use key', key: peerKey}));
        }).catch(function (err) {
          error('Failed to send "use key" mesage to signalling server: ' +
            err);
        });
      });
    });

    // 5. `link` emits this `message` *from* signalling server:
    //
    //    {
    //       "type": "key set",
    //       "key": "1234"
    //    }
    //

    // 6. We wait for a peer to send a session description protocol (SDP)
    // message to the signalling server.

    // 7. WebRTC takes over and we do the offer/answer dance. And that's
    // where `RTCPeerConnection` data channels come from.

    // 8. `RTCPeerConnection` emits `open` event when a peer is connected.


    // Event listeners for the signalling server.

    // `connection` will fire when a peer has connected using the peer key.
    link.on('connection', function (peer) {
      trace('[' + peer.address + '] Found peer via signalling server' +
        (numReattempts ? ' (reattempt #' + numReattempts++ + ')' : ''));
      resolve(peer);

      // Event listeners for `RTCPeerConnection`.
      peer.on('open', function () {
        trace('[' + peer.address + '] Opened peer connection to controller');
      }).on('message', function (msg) {
        if (typeof msg === 'object' && msg.type) {
          switch (msg.type) {
            case 'bye':
              // TODO: This should instead fire an event that the developer
              // can then handle in the game (will likely want to pause too).
              // We could offer Galaxy-styled toast notifications or modals.
              warn('[' + peer.address +
                '] Lost peer connection to controller');
              numReattempts++;
              return;
            case 'state':
              trace('[' + peer.address + '] Received new controller state ' +
                'from peer: ' +
                (typeof msg === 'object' ? JSON.stringify(msg) : msg));
              // TODO: Emit new `statechange` event!
              return this._updateState(msg.data);
            default:
              return warn('[' + peer.address + '] Received peer message of ' +
                'unexpected type (' + (msg.type || '') + '): ' +
                (typeof msg === 'object' ? JSON.stringify(msg) : msg));
          }
        }

        warn('[' + peer.address + '] Received unexpected peer message: ' +
          (typeof msg === 'object' ? JSON.stringify(msg) : msg));
      }.bind(this)).on('error', function (err) {
        error('[' + peer.address + '] Peer error: ' +
          (typeof err === 'object' ? JSON.stringify(err) : err));
        reject(peer);
      }).on('close', function () {
        trace('[' + peer.address + '] Peer closed');
      });

      window.addEventListener('beforeunload', function () {
        // Workaround for `RTCPeerConnection.onclose` browser bugs:
        // * https://code.google.com/p/webrtc/issues/detail?id=1676
        // * https://bugzilla.mozilla.org/show_bug.cgi?id=881337
        // * https://bugzilla.mozilla.org/show_bug.cgi?id=1009124
        peer.send({type: 'bye'});

        // Close WebSocket connection to signalling server.
        link.onramp.close();
        trace('Closed connection to signalling server');
      });
    }.bind(this)).on('message', function (msg) {
      trace('Received message from signalling server: ' +
        JSON.stringify(msg));
    }).on('error', function (err) {
      error('Could not connect to signalling server' +
        settings.DEBUG ? (': ' + JSON.stringify(err)) : '');
      reject(err);
    }).on('close', function () {
      // TODO: Reconnect to signalling server (#60).
      warn('Connection lost to signalling server');  // Not peer connection
    });
  }.bind(this));
};


/**
 * Prompt the user to pair a controller and open a connection for pairing.
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
MobileGamepad.prototype.pair = function (peerKey) {
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
      trace('Awaiting player to pair device');
    }).catch(function () {
      warn('Failed to open modal');
      reject();
    });

    [
      'https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,700',
      '/css/modal.css'  // TODO: do not hardcode absolute path
    ].forEach(function (stylesheet) {
      utils.injectCSS({href: stylesheet});
    });

    return this._pair(peerKey).then(function (peer) {
      trace('[' + peer.address + '] Paired to controller');
      this.connected = true;
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
MobileGamepad.prototype._updateState = function (data) {
  Object.keys(data || {}).forEach(function (key) {
    if (!this.state[key] && data[key]) {
      // Button pushed.
      this.emitter.emit('buttondown', key);
      this.emitter.emit('buttondown.' + key, key);  // TODO: Don't send two

      // Button pressed.
      this.emitter.emit('buttonpress', key);
      this.emitter.emit('buttonpress.' + key, key);

      // Button changed.
      this.emitter.emit('buttonchange', key, true);
      this.emitter.emit('buttonchange.' + key, true);
    } else if (this.state[key] && !data[key]) {
      // Button released.
      this.emitter.emit('buttonup', key);
      this.emitter.emit('buttonup.' + key, key);

      // Button changed.
      this.emitter.emit('buttonchange', key, false);
      this.emitter.emit('buttonchange.' + key, false);
    }
  }.bind(this));

  this.state = data;
  this.emitter.emit('statechange');
};


/**
 * Update the state of the controller.
 *
 * @returns {Promise}
 * @memberOf Gamepad
 */
MobileGamepad.prototype.hidePairingScreen = function () {
  this.modal.close();
};


/**
 * Bind an event listener listener to a gamepad event.
 *
 * @private
 * @method bind
 * @param {String} eventName Event to bind to (e.g., `buttondown`).
 * @param {Function} listener Listener to call when given event occurs.
 * @return {Gamepad} Self
 */
MobileGamepad.prototype.on = function () {
  this.emitter.on.apply(this.emitter, arguments);
  return this;
};

MobileGamepad.prototype.addListener = MobileGamepad.prototype.on;


/**
 * Remove an event listener of a given type.
 *
 * If no type is given, all listeners are removed. If no listener is given, all
 * listeners of given type are removed.
 *
 * @method unbind
 * @param {String} [eventName] Event name of listener to remove.
 * @param {Function} [listener] (Optional) The listener function to remove.
 * @return {Boolean} Was unbinding the listener successful.
 */
MobileGamepad.prototype.off = function () {
  if (arguments.length < 2) {
    // If no listener function is provided, remove all events of this type.
    this.removeAllListeners.apply(this, arguments);
    return this;
  }

  this.emitter.removeListener.apply(this.emitter, arguments);
  return this;
};

MobileGamepad.prototype.removeListener = MobileGamepad.prototype.off;


/**
 * Remove all event listeners.
 *
 * If no type is given, all listeners are removed. If no listener is given, all
 * listeners of given type are removed.
 *
 * @method unbind
 * @param {String} [eventName] Event name of listener to remove.
 * @param {Function} [listener] (Optional) The listener function to remove.
 * @return {Boolean} Was unbinding the listener successful.
 */
MobileGamepad.prototype.removeAllListeners = function () {
  this.emitter.removeAllListeners.apply(this.emitter, arguments);
  return this;
};


module.exports = MobileGamepad;

})(window, document);
