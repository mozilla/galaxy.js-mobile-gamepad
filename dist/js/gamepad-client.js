(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (window, document) {
'use strict';

// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


utils.polyfill(window);


utils.lockOrientation('landscape-primary');
function wantsAutoFullScreen() {
  return !('disableAutoFullScreen' in localStorage);
}


document.addEventListener('keyup', function (e) {
  if (utils.fieldFocused(e)) {
    return;
  }

  switch (e.keyCode) {
    case 70:  // Pressing F should toggle full-screen mode.
      trace('User pressed "F"; entering/exiting fullscreen');
      return utils.toggleFullScreen();
    case 78:  // Pressing NF (really just N) should toggle full-screen mode.
      trace('User pressed "NF"; exiting fullscreen and will not automatically ' +
        'open next time');
      localStorage.disableAutoFullScreen = '1';
      return utils.toggleFullScreen();
  }
});


document.addEventListener('click', function (e) {
  if (utils.fieldFocused(e) || !wantsAutoFullScreen()) {
    return;
  }
  trace('Automatically entering fullscreen');
  utils.toggleFullScreen();
});


// if there's not a pin, tell the user to open the game on another device
// first. instead of relegating mobile to be always a controller, allow the
// game to mirror the desktop (à la WiiU).

var peerId = utils.getPeerId();

var peer = new Peer('controller_' + peerId, {
  key: settings.PEERJS_KEY,
  debug: settings.DEBUG ? 3 : 0
});

window.addEventListener('beforeunload', function () {
  peer.destroy();
});

var conn = peer.connect(peerId);

conn.on('open', function () {
  trace('My peer ID: ' + peer.id);
  trace('My connection ID: ' + conn.id);

  conn.on('data', function (data) {
    trace('Received: ' + data);
  });

  conn.on('error', function (err) {
    error(err.message);
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


function bindPress(button, eventName, isPressed) {
  document.querySelector('#' + button).addEventListener(eventName, function (e) {
    // Handle D-pad presses.
    if (e.target && e.target.parentNode === dpad) {
      dpad.classList.toggle(this.id);
    }

    gamepadState[button] = isPressed;
    send({type: 'state', data: gamepadState});
  });
}


function bindKeyPresses(eventName, isPressed) {
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
    bindPress(button, 'touchstart', true);
    bindPress(button, 'touchend', false);
  } else {
    bindPress(button, 'mousedown', true);
    bindPress(button, 'mouseup', false);
  }
});


bindKeyPresses('keydown', true);
bindKeyPresses('keyup', false);


})(window, document);

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


function polyfill(win) {
  if (!('performance' in win)) {
    win.performance = {
      now: function () {
        return +new Date();
      }
    };
  }

  if (('origin' in win.location)) {
    win.location.origin = win.location.protocol + '//' + win.location.host;
  }
}


function getPeerId() {
  return (window.location.pathname.indexOf('.html') ?
    window.location.search.substr(1) : window.location.pathname.substr(1));
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

function injectCSS(opts) {
  var link = document.createElement('link');
  link.href = opts.href;
  link.media = 'all';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  Object.keys(opts || {}).forEach(function (prop) {
    link[prop] = opts[prop];
  });
  document.querySelector('head').appendChild(link);
}

function escape(text) {
  if (!text) {
    return text;
  }
  return text.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/'/g, '&#39;')
             .replace(/"/g, '&#34;');
}

function isFullScreen() {
  return (!document.fullscreenElement &&  // standard method
    !document.mozFullScreenElement &&
    !document.webkitFullscreenElement &&
    !document.msFullscreenElement);  // vendor-prefixed methods
}

function toggleFullScreen() {
  if (isFullScreen()) {
    trace('Entering full screen');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  } else {
    trace('Exiting full screen');
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}


function lockOrientation() {
  var lo = (screen.LockOrientation ||
    screen.mozLockOrientation ||
    screen.webkitLockOrientation ||
    screen.msLockOrientation);
  if (!lo) {
    return warn('Orientation could not be locked');
  }

  lo(orientation);
}


function triggerEvent(type) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.eventName = type;
  (document.body || window).dispatchEvent(event);
}


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.polyfill = polyfill;
module.exports.getPeerId = getPeerId;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;
module.exports.injectCSS = injectCSS;
module.exports.escape = escape;
module.exports.isFullScreen = isFullScreen;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.lockOrientation = lockOrientation;
module.exports.triggerEvent = triggerEvent;

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
  PEERJS_KEY: 'rovu5xmqo69wwmi'
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCkge1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMCcpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG51dGlscy5wb2x5ZmlsbCh3aW5kb3cpO1xuXG5cbnV0aWxzLmxvY2tPcmllbnRhdGlvbignbGFuZHNjYXBlLXByaW1hcnknKTtcbmZ1bmN0aW9uIHdhbnRzQXV0b0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAhKCdkaXNhYmxlQXV0b0Z1bGxTY3JlZW4nIGluIGxvY2FsU3RvcmFnZSk7XG59XG5cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbiAoZSkge1xuICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICBjYXNlIDcwOiAgLy8gUHJlc3NpbmcgRiBzaG91bGQgdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICB0cmFjZSgnVXNlciBwcmVzc2VkIFwiRlwiOyBlbnRlcmluZy9leGl0aW5nIGZ1bGxzY3JlZW4nKTtcbiAgICAgIHJldHVybiB1dGlscy50b2dnbGVGdWxsU2NyZWVuKCk7XG4gICAgY2FzZSA3ODogIC8vIFByZXNzaW5nIE5GIChyZWFsbHkganVzdCBOKSBzaG91bGQgdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICB0cmFjZSgnVXNlciBwcmVzc2VkIFwiTkZcIjsgZXhpdGluZyBmdWxsc2NyZWVuIGFuZCB3aWxsIG5vdCBhdXRvbWF0aWNhbGx5ICcgK1xuICAgICAgICAnb3BlbiBuZXh0IHRpbWUnKTtcbiAgICAgIGxvY2FsU3RvcmFnZS5kaXNhYmxlQXV0b0Z1bGxTY3JlZW4gPSAnMSc7XG4gICAgICByZXR1cm4gdXRpbHMudG9nZ2xlRnVsbFNjcmVlbigpO1xuICB9XG59KTtcblxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gIGlmICh1dGlscy5maWVsZEZvY3VzZWQoZSkgfHwgIXdhbnRzQXV0b0Z1bGxTY3JlZW4oKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cmFjZSgnQXV0b21hdGljYWxseSBlbnRlcmluZyBmdWxsc2NyZWVuJyk7XG4gIHV0aWxzLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbn0pO1xuXG5cbi8vIGlmIHRoZXJlJ3Mgbm90IGEgcGluLCB0ZWxsIHRoZSB1c2VyIHRvIG9wZW4gdGhlIGdhbWUgb24gYW5vdGhlciBkZXZpY2Vcbi8vIGZpcnN0LiBpbnN0ZWFkIG9mIHJlbGVnYXRpbmcgbW9iaWxlIHRvIGJlIGFsd2F5cyBhIGNvbnRyb2xsZXIsIGFsbG93IHRoZVxuLy8gZ2FtZSB0byBtaXJyb3IgdGhlIGRlc2t0b3AgKMOgIGxhIFdpaVUpLlxuXG52YXIgcGVlcklkID0gdXRpbHMuZ2V0UGVlcklkKCk7XG5cbnZhciBwZWVyID0gbmV3IFBlZXIoJ2NvbnRyb2xsZXJfJyArIHBlZXJJZCwge1xuICBrZXk6IHNldHRpbmdzLlBFRVJKU19LRVksXG4gIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgcGVlci5kZXN0cm95KCk7XG59KTtcblxudmFyIGNvbm4gPSBwZWVyLmNvbm5lY3QocGVlcklkKTtcblxuY29ubi5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgdHJhY2UoJ015IGNvbm5lY3Rpb24gSUQ6ICcgKyBjb25uLmlkKTtcblxuICBjb25uLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyBkYXRhKTtcbiAgfSk7XG5cbiAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICB9KTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHNlbmQobXNnKSB7XG4gIGlmIChzZXR0aW5ncy5ERUJVRykge1xuICAgIGNvbnNvbGUubG9nKCdTZW50OiAnICsgKHR5cGVvZiBtc2cgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkobXNnKSA6IG1zZykpO1xuICB9XG4gIGNvbm4uc2VuZChtc2cpO1xufVxuXG5cbi8qKlxuICogVHJhZGl0aW9uYWwsIE5FUy1pbnNwaXJlZCBnYW1lcGFkLlxuICovXG52YXIgZHBhZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkcGFkJyk7XG52YXIgc2VsZWN0QnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlbGVjdCcpO1xudmFyIHN0YXJ0QnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3N0YXJ0Jyk7XG52YXIgYkJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNiJyk7XG52YXIgYUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNhJyk7XG5cblxuLyoqXG4gKiBEcmF3IEQtcGFkLlxuICovXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RwYWQtYm9keScpO1xuXG5mdW5jdGlvbiBhbmd1bGFyU2hhcGUoY2FudmFzLCBjb29yZHMpIHtcbiAgdmFyIHNoYXBlID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIHZhciBpID0gMDtcbiAgc2hhcGUuYmVnaW5QYXRoKCk7XG4gIHNoYXBlLm1vdmVUbyhjb29yZHNbMF1bMF0sIGNvb3Jkc1swXVsxXSk7XG4gIGNvb3Jkcy5zbGljZSgxKTtcblxuICBmb3IgKDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgIHNoYXBlLmxpbmVUbyhjb29yZHNbaV1bMF0sIGNvb3Jkc1tpXVsxXSk7XG4gIH1cblxuICBzaGFwZS5jbG9zZVBhdGgoKTtcbiAgcmV0dXJuIHNoYXBlO1xufVxuXG5mdW5jdGlvbiBsaW5lYXJGaWxsKHNoYXBlLCBjb2xvcjEsIGNvbG9yMiwgY29vcmRzKSB7XG4gIHZhciBiZyA9IHNoYXBlLmNyZWF0ZUxpbmVhckdyYWRpZW50KGNvb3Jkc1swXSwgY29vcmRzWzFdLCBjb29yZHNbMl0sIGNvb3Jkc1szXSk7XG4gIGJnLmFkZENvbG9yU3RvcCgwLCBjb2xvcjEpO1xuICBiZy5hZGRDb2xvclN0b3AoMSwgY29sb3IyKTtcbiAgc2hhcGUuZmlsbFN0eWxlID0gYmc7XG4gIHNoYXBlLmZpbGwoKTtcbn1cblxuZnVuY3Rpb24geVNpZGUoY2FudmFzLCB5LCB4RnJvbSwgeFRvKSB7XG4gIHZhciBzaGFwZSA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgICBbeSwgeEZyb21dLFxuICAgIFt5ICsgNSwgeEZyb20gKyAzLjVdLFxuICAgIFt5ICsgNSwgeFRvICsgMy41XSxcbiAgICBbeSwgeFRvXVxuICBdKTtcbiAgbGluZWFyRmlsbChzaGFwZSwgJyM2NjYnLCAnIzAwMCcsIFt5LCB4RnJvbSwgeSArIDE1LCB4RnJvbV0pO1xufVxuXG5mdW5jdGlvbiB4U2lkZShjYW52YXMsIHgsIHlGcm9tLCB5VG8pIHtcbiAgdmFyIHNoYXBlID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICAgIFt5RnJvbSwgeF0sXG4gICAgW3lGcm9tICsgNSwgeCArIDMuNV0sXG4gICAgW3lUbyArIDUsIHggKyAzLjVdLFxuICAgIFt5VG8sIHhdXG4gIF0pO1xuICBsaW5lYXJGaWxsKHNoYXBlLCAnIzY2NicsICcjMDAwJywgW3lGcm9tLCB4LCB5RnJvbSwgeCArIDE1XSk7XG59XG5cbi8vIERyYXcgdGhlIHNpZGVzIGZpcnN0LlxueFNpZGUoY2FudmFzLCA2My41LCAwLCAxMDApO1xueFNpZGUoY2FudmFzLCAxMDAsIDM2LjUsIDYzLjUpO1xueVNpZGUoY2FudmFzLCA2My41LCAwLCAzNi41KTtcbnlTaWRlKGNhbnZhcywgNjMuNSwgNjMuNSwgMTAwKTtcbnlTaWRlKGNhbnZhcywgMTAwLCAzNi41LCA2My41KTtcblxuLy8gRHJhdyB0aGUgRC1wYWQuXG52YXIgcGx1cyA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgWzAsIDM2LjVdLFxuICBbMzYuNSwgMzYuNV0sXG4gIFszNi41LCAwXSxcbiAgWzYzLjUsIDBdLFxuICBbNjMuNSwgMzYuNV0sXG4gIFsxMDAsIDM2LjVdLFxuICBbMTAwLCA2My41XSxcbiAgWzYzLjUsIDYzLjVdLFxuICBbNjMuNSwgMTAwXSxcbiAgWzM2LjUsIDEwMF0sXG4gIFszNi41LCA2M10sXG4gIFswLCA2My41XVxuXSk7XG5cbnBsdXMuZmlsbFN0eWxlID0gJyMxYTFhMWEnO1xucGx1cy5zaGFkb3dDb2xvciA9ICdyZ2JhKDAsMCwwLC42KSc7XG5wbHVzLnNoYWRvd0JsdXIgPSAxNTtcbnBsdXMuc2hhZG93T2Zmc2V0WCA9IDIwO1xucGx1cy5zaGFkb3dPZmZzZXRZID0gMTA7XG5wbHVzLmZpbGwoKTtcblxuXG52YXIgZ2FtZXBhZFN0YXRlID0ge1xuICB1cDogZmFsc2UsXG4gIHJpZ2h0OiBmYWxzZSxcbiAgZG93bjogZmFsc2UsXG4gIGxlZnQ6IGZhbHNlLFxuICBzZWxlY3Q6IGZhbHNlLFxuICBzdGFydDogZmFsc2UsXG4gIGI6IGZhbHNlLFxuICBhOiBmYWxzZVxufTtcblxuXG5mdW5jdGlvbiBiaW5kUHJlc3MoYnV0dG9uLCBldmVudE5hbWUsIGlzUHJlc3NlZCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJyArIGJ1dHRvbikuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uIChlKSB7XG4gICAgLy8gSGFuZGxlIEQtcGFkIHByZXNzZXMuXG4gICAgaWYgKGUudGFyZ2V0ICYmIGUudGFyZ2V0LnBhcmVudE5vZGUgPT09IGRwYWQpIHtcbiAgICAgIGRwYWQuY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLmlkKTtcbiAgICB9XG5cbiAgICBnYW1lcGFkU3RhdGVbYnV0dG9uXSA9IGlzUHJlc3NlZDtcbiAgICBzZW5kKHt0eXBlOiAnc3RhdGUnLCBkYXRhOiBnYW1lcGFkU3RhdGV9KTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gYmluZEtleVByZXNzZXMoZXZlbnROYW1lLCBpc1ByZXNzZWQpIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAoZS5rZXlDb2RlKSB7XG4gICAgICBjYXNlIDM4OlxuICAgICAgICAvLyBTZW5kIGV2ZW50IG9ubHkgb25jZS5cbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUudXApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLnVwID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICd1cCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM5OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5yaWdodCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUucmlnaHQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3JpZ2h0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDA6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmRvd24pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmRvd24gPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ2Rvd24nIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzNzpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUubGVmdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUubGVmdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnbGVmdCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDEzOlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zdGFydCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuc3RhcnQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIHN0YXJ0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NTpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYSA9IGlzUHJlc3NlZDtcbiAgICAgICAgYUJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNjY6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmIgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGJCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoZS5zaGlmdEtleSB8fCAoIWlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuc2VsZWN0KSkge1xuICAgICAgICAgIC8vIElmIHRoZSBTaGlmdCBrZXkgd2FzIHByZXNzZWQgb3IgdW5wcmVzc2VkLCB0b2dnbGUgaXRzIHN0YXRlLlxuICAgICAgICAgIGdhbWVwYWRTdGF0ZS5zZWxlY3QgPSBpc1ByZXNzZWQ7XG4gICAgICAgICAgc2VsZWN0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIChpLmUuLCBhbnkgb3RoZXIga2V5IHdhcyBwcmVzc2VkKSwgYmFpbC5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZW5kKGdhbWVwYWRTdGF0ZSk7XG4gIH0pO1xufVxuXG5cbk9iamVjdC5rZXlzKGdhbWVwYWRTdGF0ZSkuZm9yRWFjaChmdW5jdGlvbiAoYnV0dG9uKSB7XG4gIGlmICh1dGlscy5oYXNUb3VjaEV2ZW50cygpKSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ3RvdWNoc3RhcnQnLCB0cnVlKTtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAndG91Y2hlbmQnLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ21vdXNlZG93bicsIHRydWUpO1xuICAgIGJpbmRQcmVzcyhidXR0b24sICdtb3VzZXVwJywgZmFsc2UpO1xuICB9XG59KTtcblxuXG5iaW5kS2V5UHJlc3Nlcygna2V5ZG93bicsIHRydWUpO1xuYmluZEtleVByZXNzZXMoJ2tleXVwJywgZmFsc2UpO1xuXG5cbn0pKHdpbmRvdywgZG9jdW1lbnQpO1xuIiwiZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIHBvbHlmaWxsKHdpbikge1xuICBpZiAoISgncGVyZm9ybWFuY2UnIGluIHdpbikpIHtcbiAgICB3aW4ucGVyZm9ybWFuY2UgPSB7XG4gICAgICBub3c6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAoKCdvcmlnaW4nIGluIHdpbi5sb2NhdGlvbikpIHtcbiAgICB3aW4ubG9jYXRpb24ub3JpZ2luID0gd2luLmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbi5sb2NhdGlvbi5ob3N0O1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0UGVlcklkKCkge1xuICByZXR1cm4gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xufVxuXG5cbnZhciBGSUVMRF9GT0NVU0VEX1RBR1MgPSBbXG4gICdpbnB1dCcsXG4gICdrZXlnZW4nLFxuICAnbWV0ZXInLFxuICAnb3B0aW9uJyxcbiAgJ291dHB1dCcsXG4gICdwcm9ncmVzcycsXG4gICdzZWxlY3QnLFxuICAndGV4dGFyZWEnXG5dO1xuZnVuY3Rpb24gZmllbGRGb2N1c2VkKGUpIHtcbiAgcmV0dXJuIEZJRUxEX0ZPQ1VTRURfVEFHUy5pbmRleE9mKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbn1cblxuXG5mdW5jdGlvbiBoYXNUb3VjaEV2ZW50cygpIHtcbiAgcmV0dXJuICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcbiAgICB3aW5kb3cuRG9jdW1lbnRUb3VjaCAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIERvY3VtZW50VG91Y2gpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RDU1Mob3B0cykge1xuICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgbGluay5ocmVmID0gb3B0cy5ocmVmO1xuICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xuICBPYmplY3Qua2V5cyhvcHRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgbGlua1twcm9wXSA9IG9wdHNbcHJvcF07XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJykuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZSh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmIzM0OycpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmICAvLyBzdGFuZGFyZCBtZXRob2RcbiAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCk7ICAvLyB2ZW5kb3ItcHJlZml4ZWQgbWV0aG9kc1xufVxuXG5mdW5jdGlvbiB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICBpZiAoaXNGdWxsU2NyZWVuKCkpIHtcbiAgICB0cmFjZSgnRW50ZXJpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cmFjZSgnRXhpdGluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5leGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1vekNhbmNlbEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubXNFeGl0RnVsbHNjcmVlbigpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvY2tPcmllbnRhdGlvbigpIHtcbiAgdmFyIGxvID0gKHNjcmVlbi5Mb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubW96TG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLndlYmtpdExvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi5tc0xvY2tPcmllbnRhdGlvbik7XG4gIGlmICghbG8pIHtcbiAgICByZXR1cm4gd2FybignT3JpZW50YXRpb24gY291bGQgbm90IGJlIGxvY2tlZCcpO1xuICB9XG5cbiAgbG8ob3JpZW50YXRpb24pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudCh0eXBlKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gIGV2ZW50LmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZXZlbnQuZXZlbnROYW1lID0gdHlwZTtcbiAgKGRvY3VtZW50LmJvZHkgfHwgd2luZG93KS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMucG9seWZpbGwgPSBwb2x5ZmlsbDtcbm1vZHVsZS5leHBvcnRzLmdldFBlZXJJZCA9IGdldFBlZXJJZDtcbm1vZHVsZS5leHBvcnRzLmZpZWxkRm9jdXNlZCA9IGZpZWxkRm9jdXNlZDtcbm1vZHVsZS5leHBvcnRzLmhhc1RvdWNoRXZlbnRzID0gaGFzVG91Y2hFdmVudHM7XG5tb2R1bGUuZXhwb3J0cy5pbmplY3RDU1MgPSBpbmplY3RDU1M7XG5tb2R1bGUuZXhwb3J0cy5lc2NhcGUgPSBlc2NhcGU7XG5tb2R1bGUuZXhwb3J0cy5pc0Z1bGxTY3JlZW4gPSBpc0Z1bGxTY3JlZW47XG5tb2R1bGUuZXhwb3J0cy50b2dnbGVGdWxsU2NyZWVuID0gdG9nZ2xlRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLmxvY2tPcmllbnRhdGlvbiA9IGxvY2tPcmllbnRhdGlvbjtcbm1vZHVsZS5leHBvcnRzLnRyaWdnZXJFdmVudCA9IHRyaWdnZXJFdmVudDtcbiIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUkpTX0tFWTogJycsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbmZvciAodmFyIGtleSBpbiBzZXR0aW5nc19sb2NhbCkge1xuICBzZXR0aW5nc1trZXldID0gc2V0dGluZ3NfbG9jYWxba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBERUJVRzogdHJ1ZSxcbiAgUEVFUkpTX0tFWTogJ3JvdnU1eG1xbzY5d3dtaSdcbn07XG4iXX0=
