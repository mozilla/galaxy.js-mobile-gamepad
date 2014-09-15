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
  PEER_KEY: 'fcdc4q2kljcq5mi',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

for (var key in settings_local) {
  settings[key] = settings_local[key];
}

module.exports = settings;

},{"./settings_local.js":4}],4:[function(require,module,exports){
module.exports = {
  DEBUG: true
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9ob3N0LmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL2xpYi91dGlscy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5nc19sb2NhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMC5qcycpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG5pZiAoISgncGVyZm9ybWFuY2UnIGluIHdpbmRvdykpIHtcbiAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgIG5vdzogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gK25ldyBEYXRlKCk7XG4gICAgfVxuICB9O1xufVxuXG5pZiAoKCdvcmlnaW4nIGluIHdpbmRvdy5sb2NhdGlvbikpIHtcbiAgd2luZG93LmxvY2F0aW9uLm9yaWdpbiA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcbn1cblxuXG4vKipcbiAqIEEgbGlicmFyeSBmb3IgY29udHJvbGxpbmcgYW4gSFRNTDUgZ2FtZSB1c2luZyBXZWJSVEMuXG4gKlxuICogQGV4cG9ydHMgZ2FtZXBhZFxuICogQG5hbWVzcGFjZSBnYW1lcGFkXG4gKi9cbmZ1bmN0aW9uIGdhbWVwYWQoKSB7XG59XG5cblxuLyoqXG4gKiAxLiBZb3VyIFBDIGNvbm5lY3RzIHRvIHRoZSBzZXJ2ZXIuXG4gKiAyLiBUaGUgc2VydmVyIGdpdmVzIHlvdXIgUEMgYSByYW5kb21seSBnZW5lcmF0ZWQgbnVtYmVyIGFuZCByZW1lbWJlcnMgdGhlIGNvbWJpbmF0aW9uIG9mIG51bWJlciBhbmQgUEMuXG4gKiAzLiBGcm9tIHlvdXIgbW9iaWxlIGRldmljZSwgc3BlY2lmeSBhIG51bWJlciBhbmQgY29ubmVjdCB0byB0aGUgc2VydmVyLlxuICogNC4gSWYgdGhlIG51bWJlciBzcGVjaWZpZWQgaXMgdGhlIHNhbWUgYXMgZnJvbSBhIGNvbm5lY3RlZCBQQywgeW91ciBtb2JpbGUgZGV2aWNlIGlzIHBhaXJlZCB3aXRoIHRoYXQgUEMuXG4gKiA1LiBJZiB0aGVyZSBpcyBubyBkZXNpZ25hdGVkIFBDLCBhbiBlcnJvciBvY2N1cnMuXG4gKiA2LiBXaGVuIGRhdGEgY29tZXMgaW4gZnJvbSB5b3VyIG1vYmlsZSBkZXZpY2UsIGl0IGlzIHNlbnQgdG8gdGhlIFBDIHdpdGggd2hpY2ggaXQgaXMgcGFpcmVkLCBhbmQgdmljZSB2ZXJzYS5cbiAqL1xuXG5cbi8qKlxuICogQ29ubmVjdHMgdG8gYSBwZWVyIChjb250cm9sbGVyKS5cbiAqXG4gKiBFc3RhYmxpc2hlcyBjb25uZWN0aW9uIHdpdGggcGVlci5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYW1lcGFkXG4gKi9cbmdhbWVwYWQuY29ubmVjdFRvUGVlciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcGlucyA9IHV0aWxzLmdldFBpbnMoKTtcblxuICAgIHZhciBwZWVyID0gbmV3IFBlZXIocGlucy5ob3N0LCB7XG4gICAgICBrZXk6IHNldHRpbmdzLlBFRVJfS0VZLFxuICAgICAgZGVidWc6IHNldHRpbmdzLkRFQlVHID8gMyA6IDBcbiAgICB9KTtcblxuICAgIHZhciBjb25uID0gcGVlci5jb25uZWN0KHBpbnMuY29udHJvbGxlcik7XG5cbiAgICBjb25uLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICAgICAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgICAgIHRyYWNlKCdNeSBjb25uZWN0aW9uIElEOiAnICsgY29ubi5pZCk7XG5cbiAgICAgIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyBkYXRhKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXNvbHZlKGNvbm4pO1xuICAgIH0pO1xuXG4gICAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBlcnJvcihlcnIubWVzc2FnZSk7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG52YXIgZ2FsYXh5T3JpZ2luID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbnZhciBkYXRhT3JpZ2luID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtZ2FsYXh5LW9yaWdpbl0nKTtcbmlmIChkYXRhT3JpZ2luICYmIGRhdGFPcmlnaW4uZGF0YXNldC5nYWxheHlPcmlnaW4pIHtcbiAgZ2FsYXh5T3JpZ2luID0gZGF0YXNldC5kYXRhc2V0LmdhbGF4eU9yaWdpbjtcbn1cblxuXG5nYW1lcGFkLnNob3dQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKHBhaXJJZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBwYWlyVXJsID0gZ2FsYXh5T3JpZ2luICsgJy9jbGllbnQuaHRtbD8nICsgcGFpcklkO1xuXG4gICAgLy8gdG9kbzogdXNlIG1vZGFsIGZyb20gZ2FsYXh5IHByb3RvdHlwZS5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYS9nYWxheHkvdHJlZS80OGEzN2EwL3NyYy9nYW1lcy9tb2RhbFxuICAgIHZhciBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3ZlcmxheS5jbGFzc05hbWUgPSAnb3ZlcmxheSc7XG4gICAgb3ZlcmxheS5pbm5lckhUTUwgPSAoXG4gICAgICAnPGRpdiBjbGFzcz1cIm92ZXJsYXkgcGFpci1vdmVybGF5XCIgaWQ9XCJwYWlyLW92ZXJsYXlcIj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJwYWlyXCI+VVJMOiA8YSBocmVmPVwiJyArIHBhaXJVcmwgKyAnXCIgY2xhc3M9XCJwYWlyLXVybFwiIHRhcmdldD1cIl9ibGFua1wiPicgKyBwYWlyVXJsICsgJzwvYT48L2Rpdj4nICtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2RlLWhlYWRpbmdcIj5Db2RlOiA8YiBjbGFzcz1cInBhaXItY29kZVwiPicgKyBwYWlySWQgKyAnPC9iPjwvZGl2PicgK1xuICAgICAgJzwvZGl2PidcbiAgICApO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChvdmVybGF5KTtcblxuICAgIHJlc29sdmUob3ZlcmxheSk7XG4gIH0pO1xufTtcblxuXG5nYW1lcGFkLmhpZGVQYWlyaW5nU2NyZWVuID0gZnVuY3Rpb24gKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGFpci1vdmVybGF5Jykuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbn07XG5cblxuZ2FtZXBhZC52ZXJzaW9uID0gc2V0dGluZ3MuVkVSU0lPTjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWVwYWQ7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGlucygpIHtcbiAgdmFyIHBpbiA9ICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcblxuICB2YXIgcGlucyA9IHtcbiAgXHRob3N0OiBwaW4sXG4gIFx0Y29udHJvbGxlcjogcGluXG4gIH07XG5cbiAgaWYgKCFwaW4pIHtcbiAgXHRyZXR1cm4gcGlucztcbiAgfVxuXG4gIC8vIFByZXBlbmQgYGhvc3RfYCB0byBob3N0J3MgSUQuXG4gIGlmIChwaW4uc3Vic3RyKDAsIDExKSAhPT0gJ2hvc3RfJykge1xuICAgIHBpbnMuaG9zdCA9ICdob3N0XycgKyBwaW5zLmhvc3Q7XG4gIH1cblxuICAvLyBQcmVwZW5kIGBjb250cm9sbGVyX2AgdG8gY29udHJvbGxlcidzIElELlxuICBpZiAocGluLnN1YnN0cigwLCAxMSkgIT09ICdjb250cm9sbGVyXycpIHtcbiAgICBwaW5zLmNvbnRyb2xsZXIgPSAnY29udHJvbGxlcl8nICsgcGlucy5jb250cm9sbGVyOyBcbiAgfVxuXG4gIHJldHVybiBwaW5zO1xufVxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGlucyA9IGdldFBpbnM7XG4iLCJ2YXIgc2V0dGluZ3NfbG9jYWwgPSB7fTtcbnRyeSB7XG4gIHNldHRpbmdzX2xvY2FsID0gcmVxdWlyZSgnLi9zZXR0aW5nc19sb2NhbC5qcycpO1xufSBjYXRjaCAoZSkge1xufVxuXG52YXIgc2V0dGluZ3MgPSB7XG4gIEFQSV9VUkw6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLCAgLy8gVGhpcyBVUkwgdG8gdGhlIEdhbGF4eSBBUEkuIE5vIHRyYWlsaW5nIHNsYXNoLlxuICBERUJVRzogZmFsc2UsXG4gIFBFRVJfS0VZOiAnZmNkYzRxMmtsamNxNW1pJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlXG59O1xuIl19
