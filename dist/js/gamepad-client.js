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


/**
 * Traditional, NES-inspired gamepad.
 */

(function () {
  'use strict';
  var pad = document.getElementById('dpad');
  var i = 0;
  var padbuttons = pad.getElementsByClassName('button');
  var click = function () {
    pad.className = this.id;
    document.onmouseup = function () {
      pad.className = '';
    };
  };

  for (i = 0; i < padbuttons.length; i += 1) {
    padbuttons[i].onmousedown = click;
  }
}());


/**
 * Draw D-pad.
 */
var canvas = document.getElementById('dpad-body');

function angularShape(canvas, coords) {
  var shape = canvas.getContext('2d');
  var i = 0;
  shape.beginPath();
  shape.moveTo(coords[0][0], coords[0][1]);
  coords.slice(1);

  for (; i < coords.length; i+=1) {
    shape.lineTo(coords[i][0], coords[i][1]);
  }

  shape.closePath();
  return shape;
}

function linearFill(shape, color1, color2, coords) {
  var bg = shape.createLinearGradient(coords[0], coords[1], coords[2], coords[3]);
  bg.addColorStop(0, color1);
  bg.addColorStop(1, color2);
  shape.fillStyle = bg;
  shape.fill();
}

function ySide(canvas, y, xFrom, xTo) {
  var shape = angularShape(canvas, [
    [y, xFrom],
    [y + 5, xFrom + 3.5],
    [y + 5, xTo + 3.5],
    [y, xTo]
  ]);
  linearFill(shape, '#666', '#000', [y, xFrom, y + 15, xFrom]);
}

function xSide(canvas, x, yFrom, yTo) {
  var shape = angularShape(canvas, [
    [yFrom, x],
    [yFrom + 5, x + 3.5],
    [yTo + 5, x + 3.5],
    [yTo, x]
  ]);
  linearFill(shape, '#666', '#000', [yFrom, x, yFrom, x + 15]);
}

// Draw the sides first.
xSide(canvas, 63.5, 0, 100);
xSide(canvas, 100, 36.5, 63.5);
ySide(canvas, 63.5, 0, 36.5);
ySide(canvas, 63.5, 63.5, 100);
ySide(canvas, 100, 36.5, 63.5);

// Draw the D-pad.
var plus = angularShape(canvas, [
  [0, 36.5],
  [36.5, 36.5],
  [36.5, 0],
  [63.5, 0],
  [63.5, 36.5],
  [100, 36.5],
  [100, 63.5],
  [63.5, 63.5],
  [63.5, 100],
  [36.5, 100],
  [36.5, 63],
  [0, 63.5]
]);

plus.fillStyle = '#1a1a1a';
plus.shadowColor = 'rgba(0,0,0,.6)';
plus.shadowBlur = 15;
plus.shadowOffsetX = 20;
plus.shadowOffsetY = 10;
plus.fill();

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbi8vIGlmIHRoZXJlJ3Mgbm90IGEgcGluLCB0ZWxsIHRoZSB1c2VyIHRvIG9wZW4gdGhlIGdhbWUgb24gYW5vdGhlciBkZXZpY2Vcbi8vIGZpcnN0LiBpbnN0ZWFkIG9mIHJlbGVnYXRpbmcgbW9iaWxlIHRvIGJlIGFsd2F5cyBhIGNvbnRyb2xsZXIsIGFsbG93IHRoZVxuLy8gZ2FtZSB0byBtaXJyb3IgdGhlIGRlc2t0b3AgKMOgIGxhIFdpaVUpLlxuXG52YXIgcGlucyA9IHV0aWxzLmdldFBpbnMoKTtcblxudmFyIHBlZXIgPSBuZXcgUGVlcihwaW5zLmNvbnRyb2xsZXIsIHtcbiAga2V5OiBzZXR0aW5ncy5QRUVSX0tFWSxcbiAgZGVidWc6IHNldHRpbmdzLkRFQlVHID8gMyA6IDBcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICBwZWVyLmRlc3Ryb3koKTtcbn0pO1xuXG52YXIgY29ubiA9IHBlZXIuY29ubmVjdChwaW5zLmhvc3QpO1xuXG5jb25uLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICB0cmFjZSgnTXkgcGVlciBJRDogJyArIHBlZXIuaWQpO1xuICB0cmFjZSgnTXkgY29ubmVjdGlvbiBJRDogJyArIGNvbm4uaWQpO1xuXG4gIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRyYWNlKCdSZWNlaXZlZDogJyArIGRhdGEpO1xuICB9KTtcblxuICBjb25uLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBlcnJvcihlcnIubWVzc2FnZSk7XG4gIH0pO1xuXG4gIGNvbm4uc2VuZCh7XG4gICAgc3RhdHVzOiAncmVhZHknXG4gIH0pO1xufSk7XG5cblxuLyoqXG4gKiBUcmFkaXRpb25hbCwgTkVTLWluc3BpcmVkIGdhbWVwYWQuXG4gKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgcGFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RwYWQnKTtcbiAgdmFyIGkgPSAwO1xuICB2YXIgcGFkYnV0dG9ucyA9IHBhZC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdidXR0b24nKTtcbiAgdmFyIGNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHBhZC5jbGFzc05hbWUgPSB0aGlzLmlkO1xuICAgIGRvY3VtZW50Lm9ubW91c2V1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHBhZC5jbGFzc05hbWUgPSAnJztcbiAgICB9O1xuICB9O1xuXG4gIGZvciAoaSA9IDA7IGkgPCBwYWRidXR0b25zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgcGFkYnV0dG9uc1tpXS5vbm1vdXNlZG93biA9IGNsaWNrO1xuICB9XG59KCkpO1xuXG5cbi8qKlxuICogRHJhdyBELXBhZC5cbiAqL1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcGFkLWJvZHknKTtcblxuZnVuY3Rpb24gYW5ndWxhclNoYXBlKGNhbnZhcywgY29vcmRzKSB7XG4gIHZhciBzaGFwZSA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICB2YXIgaSA9IDA7XG4gIHNoYXBlLmJlZ2luUGF0aCgpO1xuICBzaGFwZS5tb3ZlVG8oY29vcmRzWzBdWzBdLCBjb29yZHNbMF1bMV0pO1xuICBjb29yZHMuc2xpY2UoMSk7XG5cbiAgZm9yICg7IGkgPCBjb29yZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgc2hhcGUubGluZVRvKGNvb3Jkc1tpXVswXSwgY29vcmRzW2ldWzFdKTtcbiAgfVxuXG4gIHNoYXBlLmNsb3NlUGF0aCgpO1xuICByZXR1cm4gc2hhcGU7XG59XG5cbmZ1bmN0aW9uIGxpbmVhckZpbGwoc2hhcGUsIGNvbG9yMSwgY29sb3IyLCBjb29yZHMpIHtcbiAgdmFyIGJnID0gc2hhcGUuY3JlYXRlTGluZWFyR3JhZGllbnQoY29vcmRzWzBdLCBjb29yZHNbMV0sIGNvb3Jkc1syXSwgY29vcmRzWzNdKTtcbiAgYmcuYWRkQ29sb3JTdG9wKDAsIGNvbG9yMSk7XG4gIGJnLmFkZENvbG9yU3RvcCgxLCBjb2xvcjIpO1xuICBzaGFwZS5maWxsU3R5bGUgPSBiZztcbiAgc2hhcGUuZmlsbCgpO1xufVxuXG5mdW5jdGlvbiB5U2lkZShjYW52YXMsIHksIHhGcm9tLCB4VG8pIHtcbiAgdmFyIHNoYXBlID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICAgIFt5LCB4RnJvbV0sXG4gICAgW3kgKyA1LCB4RnJvbSArIDMuNV0sXG4gICAgW3kgKyA1LCB4VG8gKyAzLjVdLFxuICAgIFt5LCB4VG9dXG4gIF0pO1xuICBsaW5lYXJGaWxsKHNoYXBlLCAnIzY2NicsICcjMDAwJywgW3ksIHhGcm9tLCB5ICsgMTUsIHhGcm9tXSk7XG59XG5cbmZ1bmN0aW9uIHhTaWRlKGNhbnZhcywgeCwgeUZyb20sIHlUbykge1xuICB2YXIgc2hhcGUgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gICAgW3lGcm9tLCB4XSxcbiAgICBbeUZyb20gKyA1LCB4ICsgMy41XSxcbiAgICBbeVRvICsgNSwgeCArIDMuNV0sXG4gICAgW3lUbywgeF1cbiAgXSk7XG4gIGxpbmVhckZpbGwoc2hhcGUsICcjNjY2JywgJyMwMDAnLCBbeUZyb20sIHgsIHlGcm9tLCB4ICsgMTVdKTtcbn1cblxuLy8gRHJhdyB0aGUgc2lkZXMgZmlyc3QuXG54U2lkZShjYW52YXMsIDYzLjUsIDAsIDEwMCk7XG54U2lkZShjYW52YXMsIDEwMCwgMzYuNSwgNjMuNSk7XG55U2lkZShjYW52YXMsIDYzLjUsIDAsIDM2LjUpO1xueVNpZGUoY2FudmFzLCA2My41LCA2My41LCAxMDApO1xueVNpZGUoY2FudmFzLCAxMDAsIDM2LjUsIDYzLjUpO1xuXG4vLyBEcmF3IHRoZSBELXBhZC5cbnZhciBwbHVzID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICBbMCwgMzYuNV0sXG4gIFszNi41LCAzNi41XSxcbiAgWzM2LjUsIDBdLFxuICBbNjMuNSwgMF0sXG4gIFs2My41LCAzNi41XSxcbiAgWzEwMCwgMzYuNV0sXG4gIFsxMDAsIDYzLjVdLFxuICBbNjMuNSwgNjMuNV0sXG4gIFs2My41LCAxMDBdLFxuICBbMzYuNSwgMTAwXSxcbiAgWzM2LjUsIDYzXSxcbiAgWzAsIDYzLjVdXG5dKTtcblxucGx1cy5maWxsU3R5bGUgPSAnIzFhMWExYSc7XG5wbHVzLnNoYWRvd0NvbG9yID0gJ3JnYmEoMCwwLDAsLjYpJztcbnBsdXMuc2hhZG93Qmx1ciA9IDE1O1xucGx1cy5zaGFkb3dPZmZzZXRYID0gMjA7XG5wbHVzLnNoYWRvd09mZnNldFkgPSAxMDtcbnBsdXMuZmlsbCgpO1xuIiwiZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBpbnMoKSB7XG4gIHZhciBwaW4gPSAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoJy5odG1sJykgP1xuICAgIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XG5cbiAgdmFyIHBpbnMgPSB7XG4gICAgaG9zdDogcGluLFxuICAgIGNvbnRyb2xsZXI6IHBpblxuICB9O1xuXG4gIGlmICghcGluKSB7XG4gICAgcmV0dXJuIHBpbnM7XG4gIH1cblxuICAvLyBQcmVwZW5kIGBob3N0X2AgdG8gaG9zdCdzIElELlxuICBpZiAocGluLnN1YnN0cigwLCAxMSkgIT09ICdob3N0XycpIHtcbiAgICBwaW5zLmhvc3QgPSAnaG9zdF8nICsgcGlucy5ob3N0O1xuICB9XG5cbiAgLy8gUHJlcGVuZCBgY29udHJvbGxlcl9gIHRvIGNvbnRyb2xsZXIncyBJRC5cbiAgaWYgKHBpbi5zdWJzdHIoMCwgMTEpICE9PSAnY29udHJvbGxlcl8nKSB7XG4gICAgcGlucy5jb250cm9sbGVyID0gJ2NvbnRyb2xsZXJfJyArIHBpbnMuY29udHJvbGxlcjsgXG4gIH1cblxuICByZXR1cm4gcGlucztcbn1cblxubW9kdWxlLmV4cG9ydHMudHJhY2UgPSB0cmFjZTtcbm1vZHVsZS5leHBvcnRzLmVycm9yID0gZXJyb3I7XG5tb2R1bGUuZXhwb3J0cy53YXJuID0gd2Fybjtcbm1vZHVsZS5leHBvcnRzLmdldFBpbnMgPSBnZXRQaW5zO1xuIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSX0tFWTogJ2ZjZGM0cTJrbGpjcTVtaScsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbmZvciAodmFyIGtleSBpbiBzZXR0aW5nc19sb2NhbCkge1xuICBzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAvLyBERUJVRzogdHJ1ZSxcbiAgUEVFUl9LRVk6ICdyMWtmZTV6ZTIxaXc5dWRpJ1xufTtcbiJdfQ==
