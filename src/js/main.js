(function () {

var peer = require('./lib/peer');
var Promise = require('./lib/promise-1.0.0');

var settings = require('./settings');


var gum = navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.msGetUserMedia;


/**
 * A library for controlling an HTML5 game using WebRTC.
 *
 * @exports gamepad
 * @namespace gamepad
 */
function gamepad() {
}


/**
 * Authenticates a user.
 *
 * Opens a modal that overlays the game, prompting the user to sign in.
 * Returns a Promise that resolves with a `User` object for the user.
 *
 * @returns {Promise}
 * @memberOf galaxy
 */
gamepad.getPeer = function () {
  return new Peer({key: settings.PEER_KEY});
};

gamepad.version = settings.VERSION;


/**
 * Export the module via AMD, CommonJS, or as a browser global.
 */
if (typeof define === 'function' && define.amd) {
  define(function () {
    return gamepad;
  });
} else if (typeof module === 'object' && module.exports) {
  module.exports = gamepad;
} else {
  this.gamepad = gamepad;
}

})();
