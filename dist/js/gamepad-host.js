!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
      key: settings.PEERJS_KEY,
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

},{"./lib/utils":2,"./settings":3}],2:[function(require,module,exports){
function trace(text, level) {
  console[level || 'log']((window.performance.now() / 1000).toFixed(3) + ': ' + text);
}


function error(text) {
  return trace(text, 'error');
}


function warn(text) {
  return trace(text, 'warn');
}


function getPins() {
  var pin = (window.location.pathname.indexOf('.html') ?
    window.location.search.substr(1) : window.location.pathname.substr(1));

  var pins = {
    host: pin,
    controller: pin
  };

  if (!pin) {
    return pins;
  }

  // Prepend `host_` to host's ID.
  if (pin.substr(0, 11) !== 'host_') {
    pins.host = 'host_' + pins.host;
  }

  // Prepend `controller_` to controller's ID.
  if (pin.substr(0, 11) !== 'controller_') {
    pins.controller = 'controller_' + pins.controller;
  }

  return pins;
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


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.getPins = getPins;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;

},{}],3:[function(require,module,exports){
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

},{"./settings_local.js":4}],4:[function(require,module,exports){
module.exports = {
  DEBUG: true,
  PEERJS_KEY: 'r1kfe5ze21iw9udi'
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi91dGlscy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5nc19sb2NhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAuanMnKTsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBlcnJvciA9IHV0aWxzLmVycm9yO1xudmFyIHRyYWNlID0gdXRpbHMudHJhY2U7XG5cblxuaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cpKSB7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICBub3c6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICAgIH1cbiAgfTtcbn1cblxuaWYgKCgnb3JpZ2luJyBpbiB3aW5kb3cubG9jYXRpb24pKSB7XG4gIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3Q7XG59XG5cblxuLyoqXG4gKiBBIGxpYnJhcnkgZm9yIGNvbnRyb2xsaW5nIGFuIEhUTUw1IGdhbWUgdXNpbmcgV2ViUlRDLlxuICpcbiAqIEBleHBvcnRzIGdhbWVwYWRcbiAqIEBuYW1lc3BhY2UgZ2FtZXBhZFxuICovXG5mdW5jdGlvbiBnYW1lcGFkKCkge1xufVxuXG5cbi8qKlxuICogMS4gWW91ciBQQyBjb25uZWN0cyB0byB0aGUgc2VydmVyLlxuICogMi4gVGhlIHNlcnZlciBnaXZlcyB5b3VyIFBDIGEgcmFuZG9tbHkgZ2VuZXJhdGVkIG51bWJlciBhbmQgcmVtZW1iZXJzIHRoZSBjb21iaW5hdGlvbiBvZiBudW1iZXIgYW5kIFBDLlxuICogMy4gRnJvbSB5b3VyIG1vYmlsZSBkZXZpY2UsIHNwZWNpZnkgYSBudW1iZXIgYW5kIGNvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqIDQuIElmIHRoZSBudW1iZXIgc3BlY2lmaWVkIGlzIHRoZSBzYW1lIGFzIGZyb20gYSBjb25uZWN0ZWQgUEMsIHlvdXIgbW9iaWxlIGRldmljZSBpcyBwYWlyZWQgd2l0aCB0aGF0IFBDLlxuICogNS4gSWYgdGhlcmUgaXMgbm8gZGVzaWduYXRlZCBQQywgYW4gZXJyb3Igb2NjdXJzLlxuICogNi4gV2hlbiBkYXRhIGNvbWVzIGluIGZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBpdCBpcyBzZW50IHRvIHRoZSBQQyB3aXRoIHdoaWNoIGl0IGlzIHBhaXJlZCwgYW5kIHZpY2UgdmVyc2EuXG4gKi9cblxuXG4vKipcbiAqIENvbm5lY3RzIHRvIGEgcGVlciAoY29udHJvbGxlcikuXG4gKlxuICogRXN0YWJsaXNoZXMgY29ubmVjdGlvbiB3aXRoIHBlZXIuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLmNvbm5lY3RUb1BlZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHBpbnMgPSB1dGlscy5nZXRQaW5zKCk7XG5cbiAgICB2YXIgcGVlciA9IG5ldyBQZWVyKHBpbnMuaG9zdCwge1xuICAgICAga2V5OiBzZXR0aW5ncy5QRUVSSlNfS0VZLFxuICAgICAgZGVidWc6IHNldHRpbmdzLkRFQlVHID8gMyA6IDBcbiAgICB9KTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBwZWVyLmRlc3Ryb3koKTtcbiAgICB9KTtcblxuICAgIHBlZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoY29ubikge1xuICAgICAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRyYWNlKCdSZWNlaXZlZDogJyArICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6ICcnKSk7XG4gICAgICB9KTtcblxuICAgICAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9KTtcblxuICAgICAgLy8gV2UndmUgY29ubmVjdGVkIHRvIGEgY29udHJvbGxlci5cbiAgICAgIHJlc29sdmUoY29ubik7XG4gICAgfSk7XG5cbiAgfSk7XG59O1xuXG52YXIgZ2FsYXh5T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbnZhciBkYXRhT3JpZ2luID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtZ2FsYXh5LW9yaWdpbl0nKTtcbmlmIChkYXRhT3JpZ2luICYmIGRhdGFPcmlnaW4uZGF0YXNldC5nYWxheHlPcmlnaW4pIHtcbiAgZ2FsYXh5T3JpZ2luID0gZGF0YXNldC5kYXRhc2V0LmdhbGF4eU9yaWdpbjtcbn1cblxuXG5nYW1lcGFkLnNob3dQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKHBhaXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBwYWlyVXJsID0gZ2FsYXh5T3JpZ2luICsgJy9jbGllbnQuaHRtbD8nICsgcGFpcklkO1xuXG4gICAgLy8gdG9kbzogdXNlIG1vZGFsIGZyb20gZ2FsYXh5IHByb3RvdHlwZS5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9nYWxheHkvdHJlZS80OGEzN2EwL3NyYy9nYW1lcy9tb2RhbFxuICAgIHZhciBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3ZlcmxheS5jbGFzc05hbWUgPSAnb3ZlcmxheSc7XG4gICAgb3ZlcmxheS5pbm5lckhUTUwgPSAoXG4gICAgICAnPGRpdiBjbGFzcz1cIm92ZXJsYXkgcGFpci1vdmVybGF5XCIgaWQ9XCJwYWlyLW92ZXJsYXlcIj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJwYWlyXCI+VVJMOiA8YSBocmVmPVwiJyArIHBhaXJVcmwgKyAnXCIgY2xhc3M9XCJwYWlyLXVybFwiIHRhcmdldD1cIl9ibGFua1wiPicgKyBwYWlyVXJsICsgJzwvYT48L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2RlLWhlYWRpbmdcIj5Db2RlOiA8YiBjbGFzcz1cInBhaXItY29kZVwiPicgKyBwYWlySWQgKyAnPC9iPjwvZGl2PicgK1xuICAgICAgJzwvZGl2PidcbiAgICApO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChvdmVybGF5KTtcblxuICAgIHJlc29sdmUob3ZlcmxheSk7XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLmhpZGVQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGFpci1vdmVybGF5Jykuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbn07XG5cblxuZ2FtZXBhZC52ZXJzaW9uID0gc2V0dGluZ3MuVkVSU0lPTjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWVwYWQ7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGlucygpIHtcbiAgdmFyIHBpbiA9ICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcblxuICB2YXIgcGlucyA9IHtcbiAgICBob3N0OiBwaW4sXG4gICAgY29udHJvbGxlcjogcGluXG4gIH07XG5cbiAgaWYgKCFwaW4pIHtcbiAgICByZXR1cm4gcGlucztcbiAgfVxuXG4gIC8vIFByZXBlbmQgYGhvc3RfYCB0byBob3N0J3MgSUQuXG4gIGlmIChwaW4uc3Vic3RyKDAsIDExKSAhPT0gJ2hvc3RfJykge1xuICAgIHBpbnMuaG9zdCA9ICdob3N0XycgKyBwaW5zLmhvc3Q7XG4gIH1cblxuICAvLyBQcmVwZW5kIGBjb250cm9sbGVyX2AgdG8gY29udHJvbGxlcidzIElELlxuICBpZiAocGluLnN1YnN0cigwLCAxMSkgIT09ICdjb250cm9sbGVyXycpIHtcbiAgICBwaW5zLmNvbnRyb2xsZXIgPSAnY29udHJvbGxlcl8nICsgcGlucy5jb250cm9sbGVyO1xuICB9XG5cbiAgcmV0dXJuIHBpbnM7XG59XG5cblxudmFyIEZJRUxEX0ZPQ1VTRURfVEFHUyA9IFtcbiAgJ2lucHV0JyxcbiAgJ2tleWdlbicsXG4gICdtZXRlcicsXG4gICdvcHRpb24nLFxuICAnb3V0cHV0JyxcbiAgJ3Byb2dyZXNzJyxcbiAgJ3NlbGVjdCcsXG4gICd0ZXh0YXJlYSdcbl07XG5mdW5jdGlvbiBmaWVsZEZvY3VzZWQoZSkge1xuICByZXR1cm4gRklFTERfRk9DVVNFRF9UQUdTLmluZGV4T2YoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xufVxuXG5cbmZ1bmN0aW9uIGhhc1RvdWNoRXZlbnRzKCkge1xuICByZXR1cm4gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fFxuICAgIHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMudHJhY2UgPSB0cmFjZTtcbm1vZHVsZS5leHBvcnRzLmVycm9yID0gZXJyb3I7XG5tb2R1bGUuZXhwb3J0cy53YXJuID0gd2Fybjtcbm1vZHVsZS5leHBvcnRzLmdldFBpbnMgPSBnZXRQaW5zO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbiIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUkpTX0tFWTogJycsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbmZvciAodmFyIGtleSBpbiBzZXR0aW5nc19sb2NhbCkge1xuICBzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBERUJVRzogdHJ1ZSxcbiAgUEVFUkpTX0tFWTogJ3Ixa2ZlNXplMjFpdzl1ZGknXG59O1xuIl19
