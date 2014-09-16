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
