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
  key: settings.PEERJS_KEY,
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

  send({
    status: 'ready'
  });
});


function send(msg) {
  if (settings.DEBUG) {
    console.log('Sent: ' + (typeof msg === 'object' ? JSON.stringify(msg) : msg));
  }
  conn.send(msg);
}


/**
 * Traditional, NES-inspired gamepad.
 */
var dpad = document.querySelector('#dpad');
var selectButton = document.querySelector('#select');
var startButton = document.querySelector('#start');
var bButton = document.querySelector('#b');
var aButton = document.querySelector('#a');

(function () {
  'use strict';
  var i = 0;
  var padbuttons = dpad.getElementsByClassName('button');
  var click = function () {
    dpad.className = this.id;
    document.onmouseup = function () {
      dpad.className = '';
    };
  };

  for (; i < padbuttons.length; i++) {
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

  for (; i < coords.length; i++) {
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


var gamepadState = {
  up: false,
  right: false,
  down: false,
  left: false,
  select: false,
  start: false,
  b: false,
  a: false
};


function bindButtonPress(button, eventName, isPressed) {
  document.querySelector('#' + button).addEventListener(eventName, function () {
    gamepadState[button] = isPressed;
    send(gamepadState);
  });
}


function bindButtonKeyPresses(eventName, isPressed) {
  document.addEventListener(eventName, function (e) {
    if (utils.fieldFocused(e)) {
      return;
    }

    switch (e.keyCode) {
      case 38:
        // Send event only once.
        if (isPressed && gamepadState.up) {
          return;
        }
        gamepadState.up = isPressed;
        dpad.className = isPressed ? 'up' : '';
        break;
      case 39:
        if (isPressed && gamepadState.right) {
          return;
        }
        gamepadState.right = isPressed;
        dpad.className = isPressed ? 'right' : '';
        break;
      case 40:
        if (isPressed && gamepadState.down) {
          return;
        }
        gamepadState.down = isPressed;
        dpad.className = isPressed ? 'down' : '';
        break;
      case 37:
        if (isPressed && gamepadState.left) {
          return;
        }
        gamepadState.left = isPressed;
        dpad.className = isPressed ? 'left' : '';
        break;
      case 13:
        if (isPressed && gamepadState.start) {
          return;
        }
        gamepadState.start = isPressed;
        startButton.dataset.pressed = +isPressed;
        break;
      case 65:
        if (isPressed && gamepadState.a) {
          return;
        }
        gamepadState.a = isPressed;
        aButton.dataset.pressed = +isPressed;
        break;
      case 66:
        if (isPressed && gamepadState.b) {
          return;
        }
        gamepadState.b = isPressed;
        bButton.dataset.pressed = +isPressed;
        break;
      default:
        if (e.shiftKey || (!isPressed && gamepadState.select)) {
          // If the Shift key was pressed or unpressed, toggle its state.
          gamepadState.select = isPressed;
          selectButton.dataset.pressed = +isPressed;
        } else {
          // Otherwise (i.e., any other key was pressed), bail.
          return;
        }
    }

    send(gamepadState);
  });
}


Object.keys(gamepadState).forEach(function (button) {
  if (utils.hasTouchEvents()) {
    bindButtonPress(button, 'touchstart', true);
    bindButtonPress(button, 'touchend', false);
  } else {
    bindButtonPress(button, 'mousedown', true);
    bindButtonPress(button, 'mouseup', false);
  }
});


bindButtonKeyPresses('keydown', true);
bindButtonKeyPresses('keyup', false);

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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbi8vIGlmIHRoZXJlJ3Mgbm90IGEgcGluLCB0ZWxsIHRoZSB1c2VyIHRvIG9wZW4gdGhlIGdhbWUgb24gYW5vdGhlciBkZXZpY2Vcbi8vIGZpcnN0LiBpbnN0ZWFkIG9mIHJlbGVnYXRpbmcgbW9iaWxlIHRvIGJlIGFsd2F5cyBhIGNvbnRyb2xsZXIsIGFsbG93IHRoZVxuLy8gZ2FtZSB0byBtaXJyb3IgdGhlIGRlc2t0b3AgKMOgIGxhIFdpaVUpLlxuXG52YXIgcGlucyA9IHV0aWxzLmdldFBpbnMoKTtcblxudmFyIHBlZXIgPSBuZXcgUGVlcihwaW5zLmNvbnRyb2xsZXIsIHtcbiAga2V5OiBzZXR0aW5ncy5QRUVSSlNfS0VZLFxuICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gIHBlZXIuZGVzdHJveSgpO1xufSk7XG5cbnZhciBjb25uID0gcGVlci5jb25uZWN0KHBpbnMuaG9zdCk7XG5cbmNvbm4ub24oJ29wZW4nLCBmdW5jdGlvbiAoKSB7XG4gIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gIHRyYWNlKCdNeSBjb25uZWN0aW9uIElEOiAnICsgY29ubi5pZCk7XG5cbiAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdHJhY2UoJ1JlY2VpdmVkOiAnICsgZGF0YSk7XG4gIH0pO1xuXG4gIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgfSk7XG5cbiAgc2VuZCh7XG4gICAgc3RhdHVzOiAncmVhZHknXG4gIH0pO1xufSk7XG5cblxuZnVuY3Rpb24gc2VuZChtc2cpIHtcbiAgaWYgKHNldHRpbmdzLkRFQlVHKSB7XG4gICAgY29uc29sZS5sb2coJ1NlbnQ6ICcgKyAodHlwZW9mIG1zZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShtc2cpIDogbXNnKSk7XG4gIH1cbiAgY29ubi5zZW5kKG1zZyk7XG59XG5cblxuLyoqXG4gKiBUcmFkaXRpb25hbCwgTkVTLWluc3BpcmVkIGdhbWVwYWQuXG4gKi9cbnZhciBkcGFkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RwYWQnKTtcbnZhciBzZWxlY3RCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0Jyk7XG52YXIgc3RhcnRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc3RhcnQnKTtcbnZhciBiQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2InKTtcbnZhciBhQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2EnKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgaSA9IDA7XG4gIHZhciBwYWRidXR0b25zID0gZHBhZC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdidXR0b24nKTtcbiAgdmFyIGNsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgIGRwYWQuY2xhc3NOYW1lID0gdGhpcy5pZDtcbiAgICBkb2N1bWVudC5vbm1vdXNldXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBkcGFkLmNsYXNzTmFtZSA9ICcnO1xuICAgIH07XG4gIH07XG5cbiAgZm9yICg7IGkgPCBwYWRidXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFkYnV0dG9uc1tpXS5vbm1vdXNlZG93biA9IGNsaWNrO1xuICB9XG59KCkpO1xuXG5cbi8qKlxuICogRHJhdyBELXBhZC5cbiAqL1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcGFkLWJvZHknKTtcblxuZnVuY3Rpb24gYW5ndWxhclNoYXBlKGNhbnZhcywgY29vcmRzKSB7XG4gIHZhciBzaGFwZSA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICB2YXIgaSA9IDA7XG4gIHNoYXBlLmJlZ2luUGF0aCgpO1xuICBzaGFwZS5tb3ZlVG8oY29vcmRzWzBdWzBdLCBjb29yZHNbMF1bMV0pO1xuICBjb29yZHMuc2xpY2UoMSk7XG5cbiAgZm9yICg7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICBzaGFwZS5saW5lVG8oY29vcmRzW2ldWzBdLCBjb29yZHNbaV1bMV0pO1xuICB9XG5cbiAgc2hhcGUuY2xvc2VQYXRoKCk7XG4gIHJldHVybiBzaGFwZTtcbn1cblxuZnVuY3Rpb24gbGluZWFyRmlsbChzaGFwZSwgY29sb3IxLCBjb2xvcjIsIGNvb3Jkcykge1xuICB2YXIgYmcgPSBzaGFwZS5jcmVhdGVMaW5lYXJHcmFkaWVudChjb29yZHNbMF0sIGNvb3Jkc1sxXSwgY29vcmRzWzJdLCBjb29yZHNbM10pO1xuICBiZy5hZGRDb2xvclN0b3AoMCwgY29sb3IxKTtcbiAgYmcuYWRkQ29sb3JTdG9wKDEsIGNvbG9yMik7XG4gIHNoYXBlLmZpbGxTdHlsZSA9IGJnO1xuICBzaGFwZS5maWxsKCk7XG59XG5cbmZ1bmN0aW9uIHlTaWRlKGNhbnZhcywgeSwgeEZyb20sIHhUbykge1xuICB2YXIgc2hhcGUgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gICAgW3ksIHhGcm9tXSxcbiAgICBbeSArIDUsIHhGcm9tICsgMy41XSxcbiAgICBbeSArIDUsIHhUbyArIDMuNV0sXG4gICAgW3ksIHhUb11cbiAgXSk7XG4gIGxpbmVhckZpbGwoc2hhcGUsICcjNjY2JywgJyMwMDAnLCBbeSwgeEZyb20sIHkgKyAxNSwgeEZyb21dKTtcbn1cblxuZnVuY3Rpb24geFNpZGUoY2FudmFzLCB4LCB5RnJvbSwgeVRvKSB7XG4gIHZhciBzaGFwZSA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgICBbeUZyb20sIHhdLFxuICAgIFt5RnJvbSArIDUsIHggKyAzLjVdLFxuICAgIFt5VG8gKyA1LCB4ICsgMy41XSxcbiAgICBbeVRvLCB4XVxuICBdKTtcbiAgbGluZWFyRmlsbChzaGFwZSwgJyM2NjYnLCAnIzAwMCcsIFt5RnJvbSwgeCwgeUZyb20sIHggKyAxNV0pO1xufVxuXG4vLyBEcmF3IHRoZSBzaWRlcyBmaXJzdC5cbnhTaWRlKGNhbnZhcywgNjMuNSwgMCwgMTAwKTtcbnhTaWRlKGNhbnZhcywgMTAwLCAzNi41LCA2My41KTtcbnlTaWRlKGNhbnZhcywgNjMuNSwgMCwgMzYuNSk7XG55U2lkZShjYW52YXMsIDYzLjUsIDYzLjUsIDEwMCk7XG55U2lkZShjYW52YXMsIDEwMCwgMzYuNSwgNjMuNSk7XG5cbi8vIERyYXcgdGhlIEQtcGFkLlxudmFyIHBsdXMgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gIFswLCAzNi41XSxcbiAgWzM2LjUsIDM2LjVdLFxuICBbMzYuNSwgMF0sXG4gIFs2My41LCAwXSxcbiAgWzYzLjUsIDM2LjVdLFxuICBbMTAwLCAzNi41XSxcbiAgWzEwMCwgNjMuNV0sXG4gIFs2My41LCA2My41XSxcbiAgWzYzLjUsIDEwMF0sXG4gIFszNi41LCAxMDBdLFxuICBbMzYuNSwgNjNdLFxuICBbMCwgNjMuNV1cbl0pO1xuXG5wbHVzLmZpbGxTdHlsZSA9ICcjMWExYTFhJztcbnBsdXMuc2hhZG93Q29sb3IgPSAncmdiYSgwLDAsMCwuNiknO1xucGx1cy5zaGFkb3dCbHVyID0gMTU7XG5wbHVzLnNoYWRvd09mZnNldFggPSAyMDtcbnBsdXMuc2hhZG93T2Zmc2V0WSA9IDEwO1xucGx1cy5maWxsKCk7XG5cblxudmFyIGdhbWVwYWRTdGF0ZSA9IHtcbiAgdXA6IGZhbHNlLFxuICByaWdodDogZmFsc2UsXG4gIGRvd246IGZhbHNlLFxuICBsZWZ0OiBmYWxzZSxcbiAgc2VsZWN0OiBmYWxzZSxcbiAgc3RhcnQ6IGZhbHNlLFxuICBiOiBmYWxzZSxcbiAgYTogZmFsc2Vcbn07XG5cblxuZnVuY3Rpb24gYmluZEJ1dHRvblByZXNzKGJ1dHRvbiwgZXZlbnROYW1lLCBpc1ByZXNzZWQpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycgKyBidXR0b24pLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgZ2FtZXBhZFN0YXRlW2J1dHRvbl0gPSBpc1ByZXNzZWQ7XG4gICAgc2VuZChnYW1lcGFkU3RhdGUpO1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBiaW5kQnV0dG9uS2V5UHJlc3NlcyhldmVudE5hbWUsIGlzUHJlc3NlZCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICAgIGNhc2UgMzg6XG4gICAgICAgIC8vIFNlbmQgZXZlbnQgb25seSBvbmNlLlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS51cCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUudXAgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3VwJyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzk6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnJpZ2h0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5yaWdodCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAncmlnaHQnIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA0MDpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuZG93bikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuZG93biA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnZG93bicgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM3OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5sZWZ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5sZWZ0ID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICdsZWZ0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTM6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnN0YXJ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5zdGFydCA9IGlzUHJlc3NlZDtcbiAgICAgICAgc3RhcnRCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDY1OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5hKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5hID0gaXNQcmVzc2VkO1xuICAgICAgICBhQnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NjpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYiA9IGlzUHJlc3NlZDtcbiAgICAgICAgYkJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChlLnNoaWZ0S2V5IHx8ICghaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zZWxlY3QpKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIFNoaWZ0IGtleSB3YXMgcHJlc3NlZCBvciB1bnByZXNzZWQsIHRvZ2dsZSBpdHMgc3RhdGUuXG4gICAgICAgICAgZ2FtZXBhZFN0YXRlLnNlbGVjdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgICBzZWxlY3RCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgKGkuZS4sIGFueSBvdGhlciBrZXkgd2FzIHByZXNzZWQpLCBiYWlsLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQoZ2FtZXBhZFN0YXRlKTtcbiAgfSk7XG59XG5cblxuT2JqZWN0LmtleXMoZ2FtZXBhZFN0YXRlKS5mb3JFYWNoKGZ1bmN0aW9uIChidXR0b24pIHtcbiAgaWYgKHV0aWxzLmhhc1RvdWNoRXZlbnRzKCkpIHtcbiAgICBiaW5kQnV0dG9uUHJlc3MoYnV0dG9uLCAndG91Y2hzdGFydCcsIHRydWUpO1xuICAgIGJpbmRCdXR0b25QcmVzcyhidXR0b24sICd0b3VjaGVuZCcsIGZhbHNlKTtcbiAgfSBlbHNlIHtcbiAgICBiaW5kQnV0dG9uUHJlc3MoYnV0dG9uLCAnbW91c2Vkb3duJywgdHJ1ZSk7XG4gICAgYmluZEJ1dHRvblByZXNzKGJ1dHRvbiwgJ21vdXNldXAnLCBmYWxzZSk7XG4gIH1cbn0pO1xuXG5cbmJpbmRCdXR0b25LZXlQcmVzc2VzKCdrZXlkb3duJywgdHJ1ZSk7XG5iaW5kQnV0dG9uS2V5UHJlc3Nlcygna2V5dXAnLCBmYWxzZSk7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UGlucygpIHtcbiAgdmFyIHBpbiA9ICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcblxuICB2YXIgcGlucyA9IHtcbiAgICBob3N0OiBwaW4sXG4gICAgY29udHJvbGxlcjogcGluXG4gIH07XG5cbiAgaWYgKCFwaW4pIHtcbiAgICByZXR1cm4gcGlucztcbiAgfVxuXG4gIC8vIFByZXBlbmQgYGhvc3RfYCB0byBob3N0J3MgSUQuXG4gIGlmIChwaW4uc3Vic3RyKDAsIDExKSAhPT0gJ2hvc3RfJykge1xuICAgIHBpbnMuaG9zdCA9ICdob3N0XycgKyBwaW5zLmhvc3Q7XG4gIH1cblxuICAvLyBQcmVwZW5kIGBjb250cm9sbGVyX2AgdG8gY29udHJvbGxlcidzIElELlxuICBpZiAocGluLnN1YnN0cigwLCAxMSkgIT09ICdjb250cm9sbGVyXycpIHtcbiAgICBwaW5zLmNvbnRyb2xsZXIgPSAnY29udHJvbGxlcl8nICsgcGlucy5jb250cm9sbGVyO1xuICB9XG5cbiAgcmV0dXJuIHBpbnM7XG59XG5cblxudmFyIEZJRUxEX0ZPQ1VTRURfVEFHUyA9IFtcbiAgJ2lucHV0JyxcbiAgJ2tleWdlbicsXG4gICdtZXRlcicsXG4gICdvcHRpb24nLFxuICAnb3V0cHV0JyxcbiAgJ3Byb2dyZXNzJyxcbiAgJ3NlbGVjdCcsXG4gICd0ZXh0YXJlYSdcbl07XG5mdW5jdGlvbiBmaWVsZEZvY3VzZWQoZSkge1xuICByZXR1cm4gRklFTERfRk9DVVNFRF9UQUdTLmluZGV4T2YoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xufVxuXG5cbmZ1bmN0aW9uIGhhc1RvdWNoRXZlbnRzKCkge1xuICByZXR1cm4gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fFxuICAgIHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMudHJhY2UgPSB0cmFjZTtcbm1vZHVsZS5leHBvcnRzLmVycm9yID0gZXJyb3I7XG5tb2R1bGUuZXhwb3J0cy53YXJuID0gd2Fybjtcbm1vZHVsZS5leHBvcnRzLmdldFBpbnMgPSBnZXRQaW5zO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbiIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUkpTX0tFWTogJycsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbmZvciAodmFyIGtleSBpbiBzZXR0aW5nc19sb2NhbCkge1xuICBzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBERUJVRzogdHJ1ZSxcbiAgUEVFUkpTX0tFWTogJ3Ixa2ZlNXplMjFpdzl1ZGknXG59O1xuIl19
