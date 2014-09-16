(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


// if there's not a pin, tell the user to open the game on another device
// first. instead of relegating mobile to be always a controller, allow the
// game to mirror the desktop (à la WiiU).

var pins = utils.getPins();

var peer = new Peer(pins.controller, {
  key: settings.PEER_KEY,
  debug: settings.DEBUG ? 3 : 0
});

window.addEventListener('beforeunload', function () {
  peer.destroy();
});

var conn = peer.connect(pins.host);

conn.on('open', function () {
  trace('My peer ID: ' + peer.id);
  trace('My connection ID: ' + conn.id);

  conn.on('data', function (data) {
    trace('Received: ' + data);
  });

  conn.on('error', function (err) {
    error(err.message);
  });

  conn.send({
    status: 'ready'
  });
});


var img = document.createElement('img');
document.body.appendChild(img);

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
  // DEBUG: true,
  PEER_KEY: 'r1kfe5ze21iw9udi'
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMCcpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG4vLyBpZiB0aGVyZSdzIG5vdCBhIHBpbiwgdGVsbCB0aGUgdXNlciB0byBvcGVuIHRoZSBnYW1lIG9uIGFub3RoZXIgZGV2aWNlXG4vLyBmaXJzdC4gaW5zdGVhZCBvZiByZWxlZ2F0aW5nIG1vYmlsZSB0byBiZSBhbHdheXMgYSBjb250cm9sbGVyLCBhbGxvdyB0aGVcbi8vIGdhbWUgdG8gbWlycm9yIHRoZSBkZXNrdG9wICjDoCBsYSBXaWlVKS5cblxudmFyIHBpbnMgPSB1dGlscy5nZXRQaW5zKCk7XG5cbnZhciBwZWVyID0gbmV3IFBlZXIocGlucy5jb250cm9sbGVyLCB7XG4gIGtleTogc2V0dGluZ3MuUEVFUl9LRVksXG4gIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgcGVlci5kZXN0cm95KCk7XG59KTtcblxudmFyIGNvbm4gPSBwZWVyLmNvbm5lY3QocGlucy5ob3N0KTtcblxuY29ubi5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgdHJhY2UoJ015IGNvbm5lY3Rpb24gSUQ6ICcgKyBjb25uLmlkKTtcblxuICBjb25uLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyBkYXRhKTtcbiAgfSk7XG5cbiAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICB9KTtcblxuICBjb25uLnNlbmQoe1xuICAgIHN0YXR1czogJ3JlYWR5J1xuICB9KTtcbn0pO1xuXG5cbnZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW1nKTtcbiIsImZ1bmN0aW9uIHRyYWNlKHRleHQsIGxldmVsKSB7XG4gIGNvbnNvbGVbbGV2ZWwgfHwgJ2xvZyddKCh3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKS50b0ZpeGVkKDMpICsgJzogJyArIHRleHQpO1xufVxuXG5cbmZ1bmN0aW9uIGVycm9yKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICdlcnJvcicpO1xufVxuXG5cbmZ1bmN0aW9uIHdhcm4odGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ3dhcm4nKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRQaW5zKCkge1xuICB2YXIgcGluID0gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xuXG4gIHZhciBwaW5zID0ge1xuICAgIGhvc3Q6IHBpbixcbiAgICBjb250cm9sbGVyOiBwaW5cbiAgfTtcblxuICBpZiAoIXBpbikge1xuICAgIHJldHVybiBwaW5zO1xuICB9XG5cbiAgLy8gUHJlcGVuZCBgaG9zdF9gIHRvIGhvc3QncyBJRC5cbiAgaWYgKHBpbi5zdWJzdHIoMCwgMTEpICE9PSAnaG9zdF8nKSB7XG4gICAgcGlucy5ob3N0ID0gJ2hvc3RfJyArIHBpbnMuaG9zdDtcbiAgfVxuXG4gIC8vIFByZXBlbmQgYGNvbnRyb2xsZXJfYCB0byBjb250cm9sbGVyJ3MgSUQuXG4gIGlmIChwaW4uc3Vic3RyKDAsIDExKSAhPT0gJ2NvbnRyb2xsZXJfJykge1xuICAgIHBpbnMuY29udHJvbGxlciA9ICdjb250cm9sbGVyXycgKyBwaW5zLmNvbnRyb2xsZXI7IFxuICB9XG5cbiAgcmV0dXJuIHBpbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzLnRyYWNlID0gdHJhY2U7XG5tb2R1bGUuZXhwb3J0cy5lcnJvciA9IGVycm9yO1xubW9kdWxlLmV4cG9ydHMud2FybiA9IHdhcm47XG5tb2R1bGUuZXhwb3J0cy5nZXRQaW5zID0gZ2V0UGlucztcbiIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUl9LRVk6ICdmY2RjNHEya2xqY3E1bWknLCAgLy8gU2lnbiB1cCBmb3IgYSBrZXkgYXQgaHR0cDovL3BlZXJqcy5jb20vcGVlcnNlcnZlclxuICBWRVJTSU9OOiAnMC4wLjEnICAvLyBWZXJzaW9uIG9mIHRoZSBgZ2FtZXBhZC5qc2Agc2NyaXB0XG59O1xuXG5mb3IgKHZhciBrZXkgaW4gc2V0dGluZ3NfbG9jYWwpIHtcbiAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdzX2xvY2FsW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3M7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gREVCVUc6IHRydWUsXG4gIFBFRVJfS0VZOiAncjFrZmU1emUyMWl3OXVkaSdcbn07XG4iXX0=
