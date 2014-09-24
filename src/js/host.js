(function (window, document) {
'use strict';

var Peer = window.Peer;  // require('./external/peer');
var Promise = require('./external/promise-1.0.0.js');  // jshint ignore:line

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

window.gamepad = gamepad;

})(window, document);
