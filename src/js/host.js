// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0.js');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


if (!('performance' in window)) {
  window.performance = {
    now: function() {
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
 * Connects to a peer (controller).
 *
 * Establishes connection with peer.
 *
 * @returns {Promise}
 * @memberOf gamepad
 */
gamepad.connectToPeer = function () {
  return new Promise(function (resolve, reject) {
    var pins = utils.getPins();

    var peer = new Peer(pins.host, {
      key: settings.PEER_KEY,
      debug: settings.DEBUG ? 3 : 0
    });

    window.addEventListener('beforeunload', function () {
      peer.destroy();
    });

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

var galaxyOrigin = window.location.origin;
var dataOrigin = document.querySelector('[data-galaxy-origin]');
if (dataOrigin && dataOrigin.dataset.galaxyOrigin) {
  galaxyOrigin = dataset.dataset.galaxyOrigin;
}


gamepad.showPairingScreen = function (pairId) {
  return new Promise(function (resolve, reject) {
    var pairUrl = galaxyOrigin + '/client.html?' + pairId;

    // todo: use modal from galaxy prototype.
    // https://github.com/mozilla/galaxy/tree/48a37a0/src/games/modal
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = (
      '<div class="overlay pair-overlay" id="pair-overlay">' +
        '<div class="pair">URL: <a href="' + pairUrl + '" class="pair-url" target="_blank">' + pairUrl + '</a></div>' +
        '<div class="code-heading">Code: <b class="pair-code">' + pairId + '</b></div>' +
      '</div>'
    );

    document.body.appendChild(overlay);

    resolve(overlay);
  });
};


gamepad.hidePairingScreen = function () {
  document.querySelector('#pair-overlay').style.display = 'none';
};


gamepad.version = settings.VERSION;


module.exports = gamepad;
