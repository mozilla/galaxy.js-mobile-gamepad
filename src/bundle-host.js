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
      key: settings.PEER_KEY,
      debug: settings.DEBUG ? 3 : 0
    });

    var conn = peer.connect(pins.controller);

    conn.on('open', function () {
      trace('My peer ID: ' + peer.id);
      trace('My connection ID: ' + conn.id);

      conn.on('data', function (data) {
        trace('Received: ' + data);
      });

      resolve(conn);
    });

    conn.on('error', function (err) {
      error(err.message);
      reject(err);
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


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.getPins = getPins;

},{}],3:[function(require,module,exports){
var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}

var settings = {
  API_URL: 'http://localhost:5000',  // This URL to the Galaxy API. No trailing slash.
  DEBUG: false,
  PEER_KEY: '',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

for (var key in settings_local) {
  settings[key] = settings_local[key];
}

module.exports = settings;

},{"./settings_local.js":4}],4:[function(require,module,exports){
module.exports = {
  DEBUG: true,
  PEER_KEY: 'r1kfe5ze21iw9udi'
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi91dGlscy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5nc19sb2NhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAuanMnKTsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBlcnJvciA9IHV0aWxzLmVycm9yO1xudmFyIHRyYWNlID0gdXRpbHMudHJhY2U7XG5cblxuaWYgKCEoJ3BlcmZvcm1hbmNlJyBpbiB3aW5kb3cpKSB7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICBub3c6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICAgIH1cbiAgfTtcbn1cblxuaWYgKCgnb3JpZ2luJyBpbiB3aW5kb3cubG9jYXRpb24pKSB7XG4gIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luZG93LmxvY2F0aW9uLmhvc3Q7XG59XG5cblxuLyoqXG4gKiBBIGxpYnJhcnkgZm9yIGNvbnRyb2xsaW5nIGFuIEhUTUw1IGdhbWUgdXNpbmcgV2ViUlRDLlxuICpcbiAqIEBleHBvcnRzIGdhbWVwYWRcbiAqIEBuYW1lc3BhY2UgZ2FtZXBhZFxuICovXG5mdW5jdGlvbiBnYW1lcGFkKCkge1xufVxuXG5cbi8qKlxuICogMS4gWW91ciBQQyBjb25uZWN0cyB0byB0aGUgc2VydmVyLlxuICogMi4gVGhlIHNlcnZlciBnaXZlcyB5b3VyIFBDIGEgcmFuZG9tbHkgZ2VuZXJhdGVkIG51bWJlciBhbmQgcmVtZW1iZXJzIHRoZSBjb21iaW5hdGlvbiBvZiBudW1iZXIgYW5kIFBDLlxuICogMy4gRnJvbSB5b3VyIG1vYmlsZSBkZXZpY2UsIHNwZWNpZnkgYSBudW1iZXIgYW5kIGNvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqIDQuIElmIHRoZSBudW1iZXIgc3BlY2lmaWVkIGlzIHRoZSBzYW1lIGFzIGZyb20gYSBjb25uZWN0ZWQgUEMsIHlvdXIgbW9iaWxlIGRldmljZSBpcyBwYWlyZWQgd2l0aCB0aGF0IFBDLlxuICogNS4gSWYgdGhlcmUgaXMgbm8gZGVzaWduYXRlZCBQQywgYW4gZXJyb3Igb2NjdXJzLlxuICogNi4gV2hlbiBkYXRhIGNvbWVzIGluIGZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBpdCBpcyBzZW50IHRvIHRoZSBQQyB3aXRoIHdoaWNoIGl0IGlzIHBhaXJlZCwgYW5kIHZpY2UgdmVyc2EuXG4gKi9cblxuXG4vKipcbiAqIENvbm5lY3RzIHRvIGEgcGVlciAoY29udHJvbGxlcikuXG4gKlxuICogRXN0YWJsaXNoZXMgY29ubmVjdGlvbiB3aXRoIHBlZXIuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKiBAbWVtYmVyT2YgZ2FtZXBhZFxuICovXG5nYW1lcGFkLmNvbm5lY3RUb1BlZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHBpbnMgPSB1dGlscy5nZXRQaW5zKCk7XG5cbiAgICB2YXIgcGVlciA9IG5ldyBQZWVyKHBpbnMuaG9zdCwge1xuICAgICAga2V5OiBzZXR0aW5ncy5QRUVSX0tFWSxcbiAgICAgIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG4gICAgfSk7XG5cbiAgICB2YXIgY29ubiA9IHBlZXIuY29ubmVjdChwaW5zLmNvbnRyb2xsZXIpO1xuXG4gICAgY29ubi5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gICAgICB0cmFjZSgnTXkgY29ubmVjdGlvbiBJRDogJyArIGNvbm4uaWQpO1xuXG4gICAgICBjb25uLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdHJhY2UoJ1JlY2VpdmVkOiAnICsgZGF0YSk7XG4gICAgICB9KTtcblxuICAgICAgcmVzb2x2ZShjb25uKTtcbiAgICB9KTtcblxuICAgIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH0pO1xufTtcblxudmFyIGdhbGF4eU9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG52YXIgZGF0YU9yaWdpbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWdhbGF4eS1vcmlnaW5dJyk7XG5pZiAoZGF0YU9yaWdpbiAmJiBkYXRhT3JpZ2luLmRhdGFzZXQuZ2FsYXh5T3JpZ2luKSB7XG4gIGdhbGF4eU9yaWdpbiA9IGRhdGFzZXQuZGF0YXNldC5nYWxheHlPcmlnaW47XG59XG5cblxuZ2FtZXBhZC5zaG93UGFpcmluZ1NjcmVlbiA9IGZ1bmN0aW9uIChwYWlySWQpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcGFpclVybCA9IGdhbGF4eU9yaWdpbiArICcvY2xpZW50Lmh0bWw/JyArIHBhaXJJZDtcblxuICAgIC8vIHRvZG86IHVzZSBtb2RhbCBmcm9tIGdhbGF4eSBwcm90b3R5cGUuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvZ2FsYXh5L3RyZWUvNDhhMzdhMC9zcmMvZ2FtZXMvbW9kYWxcbiAgICB2YXIgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG92ZXJsYXkuY2xhc3NOYW1lID0gJ292ZXJsYXknO1xuICAgIG92ZXJsYXkuaW5uZXJIVE1MID0gKFxuICAgICAgJzxkaXYgY2xhc3M9XCJvdmVybGF5IHBhaXItb3ZlcmxheVwiIGlkPVwicGFpci1vdmVybGF5XCI+JyArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicGFpclwiPlVSTDogPGEgaHJlZj1cIicgKyBwYWlyVXJsICsgJ1wiIGNsYXNzPVwicGFpci11cmxcIiB0YXJnZXQ9XCJfYmxhbmtcIj4nICsgcGFpclVybCArICc8L2E+PC9kaXY+JyArXG4gICAgICAgICc8ZGl2IGNsYXNzPVwiY29kZS1oZWFkaW5nXCI+Q29kZTogPGIgY2xhc3M9XCJwYWlyLWNvZGVcIj4nICsgcGFpcklkICsgJzwvYj48L2Rpdj4nICtcbiAgICAgICc8L2Rpdj4nXG4gICAgKTtcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG5cbiAgICByZXNvbHZlKG92ZXJsYXkpO1xuICB9KTtcbn07XG5cblxuZ2FtZXBhZC5oaWRlUGFpcmluZ1NjcmVlbiA9IGZ1bmN0aW9uICgpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhaXItb3ZlcmxheScpLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG59O1xuXG5cbmdhbWVwYWQudmVyc2lvbiA9IHNldHRpbmdzLlZFUlNJT047XG5cblxubW9kdWxlLmV4cG9ydHMgPSBnYW1lcGFkO1xuIiwiZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBpbnMoKSB7XG4gIHZhciBwaW4gPSAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoJy5odG1sJykgP1xuICAgIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XG5cbiAgdmFyIHBpbnMgPSB7XG4gIFx0aG9zdDogcGluLFxuICBcdGNvbnRyb2xsZXI6IHBpblxuICB9O1xuXG4gIGlmICghcGluKSB7XG4gIFx0cmV0dXJuIHBpbnM7XG4gIH1cblxuICAvLyBQcmVwZW5kIGBob3N0X2AgdG8gaG9zdCdzIElELlxuICBpZiAocGluLnN1YnN0cigwLCAxMSkgIT09ICdob3N0XycpIHtcbiAgICBwaW5zLmhvc3QgPSAnaG9zdF8nICsgcGlucy5ob3N0O1xuICB9XG5cbiAgLy8gUHJlcGVuZCBgY29udHJvbGxlcl9gIHRvIGNvbnRyb2xsZXIncyBJRC5cbiAgaWYgKHBpbi5zdWJzdHIoMCwgMTEpICE9PSAnY29udHJvbGxlcl8nKSB7XG4gICAgcGlucy5jb250cm9sbGVyID0gJ2NvbnRyb2xsZXJfJyArIHBpbnMuY29udHJvbGxlcjsgXG4gIH1cblxuICByZXR1cm4gcGlucztcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGlucyA9IGdldFBpbnM7XG4iLCJ2YXIgc2V0dGluZ3NfbG9jYWwgPSB7fTtcbnRyeSB7XG4gIHNldHRpbmdzX2xvY2FsID0gcmVxdWlyZSgnLi9zZXR0aW5nc19sb2NhbC5qcycpO1xufSBjYXRjaCAoZSkge1xufVxuXG52YXIgc2V0dGluZ3MgPSB7XG4gIEFQSV9VUkw6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLCAgLy8gVGhpcyBVUkwgdG8gdGhlIEdhbGF4eSBBUEkuIE5vIHRyYWlsaW5nIHNsYXNoLlxuICBERUJVRzogZmFsc2UsXG4gIFBFRVJfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSX0tFWTogJ3Ixa2ZlNXplMjFpdzl1ZGknXG59O1xuIl19
