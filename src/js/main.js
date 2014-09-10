var peer = require('./lib/peer');
var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line

var settings = require('./settings');


if (!('performance' in window)) {
  window.performance = {
    now: function() {
      return +new Date();
    }
  };
}

function trace(text) {
  console.log((window.performance.now() / 1000).toFixed(3) + ": " + text);
}


/**
 * A library for controlling an HTML5 game using WebRTC.
 *
 * @exports gamepad
 * @namespace gamepad
 */
function gamepad() {
}

/*

1. Your PC connects to the server.
2. The server gives your PC a randomly generated number and remembers the combination of number and PC.
3. From your mobile device, specify a number and connect to the server.
4. If the number specified is the same as from a connected PC, your mobile device is paired with that PC.
5. If there is no designated PC, an error occurs.
6. When data comes in from your mobile device, it is sent to the PC with which it is paired, and vice versa.

*/

/**
 * Authenticates a user.
 *
 * Opens a modal that overlays the game, prompting the user to sign in.
 * Returns a Promise that resolves with a `User` object for the user.
 *
 * @returns {Promise}
 * @memberOf galaxy
 */
gamepad.connectToPeer = function () {
  var pin = (window.location.pathname.indexOf('.html') ?
    window.location.search.substr(1) : window.location.pathname.substr(1));

  var p = new Peer(pin, {key: settings.PEER_KEY});
  p.on('open', function (id) {
    trace('My peer ID: ' + id);
  });
};

gamepad.version = settings.VERSION;


module.exports = gamepad;
