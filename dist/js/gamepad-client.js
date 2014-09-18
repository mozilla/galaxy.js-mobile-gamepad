(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils');
var error = utils.error;
var trace = utils.trace;


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
    send(gamepadState);
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


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.getPeerId = getPeerId;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;
module.exports.injectCSS = injectCSS;
module.exports.escape = escape;
module.exports.isFullScreen = isFullScreen;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.lockOrientation = lockOrientation;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAnKTsgIC8vIGpzaGludCBpZ25vcmU6bGluZVxudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKTtcbnZhciBlcnJvciA9IHV0aWxzLmVycm9yO1xudmFyIHRyYWNlID0gdXRpbHMudHJhY2U7XG5cblxudXRpbHMubG9ja09yaWVudGF0aW9uKCdsYW5kc2NhcGUtcHJpbWFyeScpO1xuXG5mdW5jdGlvbiB3YW50c0F1dG9GdWxsU2NyZWVuKCkge1xuICByZXR1cm4gISgnZGlzYWJsZUF1dG9GdWxsU2NyZWVuJyBpbiBsb2NhbFN0b3JhZ2UpO1xufVxuXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHN3aXRjaCAoZS5rZXlDb2RlKSB7XG4gICAgY2FzZSA3MDogIC8vIFByZXNzaW5nIEYgc2hvdWxkIHRvZ2dsZSBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAgdHJhY2UoJ1VzZXIgcHJlc3NlZCBcIkZcIjsgZW50ZXJpbmcvZXhpdGluZyBmdWxsc2NyZWVuJyk7XG4gICAgICByZXR1cm4gdXRpbHMudG9nZ2xlRnVsbFNjcmVlbigpO1xuICAgIGNhc2UgNzg6ICAvLyBQcmVzc2luZyBORiAocmVhbGx5IGp1c3QgTikgc2hvdWxkIHRvZ2dsZSBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAgdHJhY2UoJ1VzZXIgcHJlc3NlZCBcIk5GXCI7IGV4aXRpbmcgZnVsbHNjcmVlbiBhbmQgd2lsbCBub3QgYXV0b21hdGljYWxseSAnICtcbiAgICAgICAgJ29wZW4gbmV4dCB0aW1lJyk7XG4gICAgICBsb2NhbFN0b3JhZ2UuZGlzYWJsZUF1dG9GdWxsU2NyZWVuID0gJzEnO1xuICAgICAgcmV0dXJuIHV0aWxzLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbiAgfVxufSk7XG5cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpIHx8ICF3YW50c0F1dG9GdWxsU2NyZWVuKCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJhY2UoJ0F1dG9tYXRpY2FsbHkgZW50ZXJpbmcgZnVsbHNjcmVlbicpO1xuICB1dGlscy50b2dnbGVGdWxsU2NyZWVuKCk7XG59KTtcblxuXG4vLyBpZiB0aGVyZSdzIG5vdCBhIHBpbiwgdGVsbCB0aGUgdXNlciB0byBvcGVuIHRoZSBnYW1lIG9uIGFub3RoZXIgZGV2aWNlXG4vLyBmaXJzdC4gaW5zdGVhZCBvZiByZWxlZ2F0aW5nIG1vYmlsZSB0byBiZSBhbHdheXMgYSBjb250cm9sbGVyLCBhbGxvdyB0aGVcbi8vIGdhbWUgdG8gbWlycm9yIHRoZSBkZXNrdG9wICjDoCBsYSBXaWlVKS5cblxudmFyIHBlZXJJZCA9IHV0aWxzLmdldFBlZXJJZCgpO1xuXG52YXIgcGVlciA9IG5ldyBQZWVyKCdjb250cm9sbGVyXycgKyBwZWVySWQsIHtcbiAga2V5OiBzZXR0aW5ncy5QRUVSSlNfS0VZLFxuICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gIHBlZXIuZGVzdHJveSgpO1xufSk7XG5cbnZhciBjb25uID0gcGVlci5jb25uZWN0KHBlZXJJZCk7XG5cbmNvbm4ub24oJ29wZW4nLCBmdW5jdGlvbiAoKSB7XG4gIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gIHRyYWNlKCdNeSBjb25uZWN0aW9uIElEOiAnICsgY29ubi5pZCk7XG5cbiAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdHJhY2UoJ1JlY2VpdmVkOiAnICsgZGF0YSk7XG4gIH0pO1xuXG4gIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgfSk7XG5cbiAgc2VuZCh7XG4gICAgc3RhdHVzOiAncmVhZHknXG4gIH0pO1xufSk7XG5cblxuZnVuY3Rpb24gc2VuZChtc2cpIHtcbiAgaWYgKHNldHRpbmdzLkRFQlVHKSB7XG4gICAgY29uc29sZS5sb2coJ1NlbnQ6ICcgKyAodHlwZW9mIG1zZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShtc2cpIDogbXNnKSk7XG4gIH1cbiAgY29ubi5zZW5kKG1zZyk7XG59XG5cblxuLyoqXG4gKiBUcmFkaXRpb25hbCwgTkVTLWluc3BpcmVkIGdhbWVwYWQuXG4gKi9cbnZhciBkcGFkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RwYWQnKTtcbnZhciBzZWxlY3RCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0Jyk7XG52YXIgc3RhcnRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc3RhcnQnKTtcbnZhciBiQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2InKTtcbnZhciBhQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2EnKTtcblxuXG4vKipcbiAqIERyYXcgRC1wYWQuXG4gKi9cbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHBhZC1ib2R5Jyk7XG5cbmZ1bmN0aW9uIGFuZ3VsYXJTaGFwZShjYW52YXMsIGNvb3Jkcykge1xuICB2YXIgc2hhcGUgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdmFyIGkgPSAwO1xuICBzaGFwZS5iZWdpblBhdGgoKTtcbiAgc2hhcGUubW92ZVRvKGNvb3Jkc1swXVswXSwgY29vcmRzWzBdWzFdKTtcbiAgY29vcmRzLnNsaWNlKDEpO1xuXG4gIGZvciAoOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgc2hhcGUubGluZVRvKGNvb3Jkc1tpXVswXSwgY29vcmRzW2ldWzFdKTtcbiAgfVxuXG4gIHNoYXBlLmNsb3NlUGF0aCgpO1xuICByZXR1cm4gc2hhcGU7XG59XG5cbmZ1bmN0aW9uIGxpbmVhckZpbGwoc2hhcGUsIGNvbG9yMSwgY29sb3IyLCBjb29yZHMpIHtcbiAgdmFyIGJnID0gc2hhcGUuY3JlYXRlTGluZWFyR3JhZGllbnQoY29vcmRzWzBdLCBjb29yZHNbMV0sIGNvb3Jkc1syXSwgY29vcmRzWzNdKTtcbiAgYmcuYWRkQ29sb3JTdG9wKDAsIGNvbG9yMSk7XG4gIGJnLmFkZENvbG9yU3RvcCgxLCBjb2xvcjIpO1xuICBzaGFwZS5maWxsU3R5bGUgPSBiZztcbiAgc2hhcGUuZmlsbCgpO1xufVxuXG5mdW5jdGlvbiB5U2lkZShjYW52YXMsIHksIHhGcm9tLCB4VG8pIHtcbiAgdmFyIHNoYXBlID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICAgIFt5LCB4RnJvbV0sXG4gICAgW3kgKyA1LCB4RnJvbSArIDMuNV0sXG4gICAgW3kgKyA1LCB4VG8gKyAzLjVdLFxuICAgIFt5LCB4VG9dXG4gIF0pO1xuICBsaW5lYXJGaWxsKHNoYXBlLCAnIzY2NicsICcjMDAwJywgW3ksIHhGcm9tLCB5ICsgMTUsIHhGcm9tXSk7XG59XG5cbmZ1bmN0aW9uIHhTaWRlKGNhbnZhcywgeCwgeUZyb20sIHlUbykge1xuICB2YXIgc2hhcGUgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gICAgW3lGcm9tLCB4XSxcbiAgICBbeUZyb20gKyA1LCB4ICsgMy41XSxcbiAgICBbeVRvICsgNSwgeCArIDMuNV0sXG4gICAgW3lUbywgeF1cbiAgXSk7XG4gIGxpbmVhckZpbGwoc2hhcGUsICcjNjY2JywgJyMwMDAnLCBbeUZyb20sIHgsIHlGcm9tLCB4ICsgMTVdKTtcbn1cblxuLy8gRHJhdyB0aGUgc2lkZXMgZmlyc3QuXG54U2lkZShjYW52YXMsIDYzLjUsIDAsIDEwMCk7XG54U2lkZShjYW52YXMsIDEwMCwgMzYuNSwgNjMuNSk7XG55U2lkZShjYW52YXMsIDYzLjUsIDAsIDM2LjUpO1xueVNpZGUoY2FudmFzLCA2My41LCA2My41LCAxMDApO1xueVNpZGUoY2FudmFzLCAxMDAsIDM2LjUsIDYzLjUpO1xuXG4vLyBEcmF3IHRoZSBELXBhZC5cbnZhciBwbHVzID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICBbMCwgMzYuNV0sXG4gIFszNi41LCAzNi41XSxcbiAgWzM2LjUsIDBdLFxuICBbNjMuNSwgMF0sXG4gIFs2My41LCAzNi41XSxcbiAgWzEwMCwgMzYuNV0sXG4gIFsxMDAsIDYzLjVdLFxuICBbNjMuNSwgNjMuNV0sXG4gIFs2My41LCAxMDBdLFxuICBbMzYuNSwgMTAwXSxcbiAgWzM2LjUsIDYzXSxcbiAgWzAsIDYzLjVdXG5dKTtcblxucGx1cy5maWxsU3R5bGUgPSAnIzFhMWExYSc7XG5wbHVzLnNoYWRvd0NvbG9yID0gJ3JnYmEoMCwwLDAsLjYpJztcbnBsdXMuc2hhZG93Qmx1ciA9IDE1O1xucGx1cy5zaGFkb3dPZmZzZXRYID0gMjA7XG5wbHVzLnNoYWRvd09mZnNldFkgPSAxMDtcbnBsdXMuZmlsbCgpO1xuXG5cbnZhciBnYW1lcGFkU3RhdGUgPSB7XG4gIHVwOiBmYWxzZSxcbiAgcmlnaHQ6IGZhbHNlLFxuICBkb3duOiBmYWxzZSxcbiAgbGVmdDogZmFsc2UsXG4gIHNlbGVjdDogZmFsc2UsXG4gIHN0YXJ0OiBmYWxzZSxcbiAgYjogZmFsc2UsXG4gIGE6IGZhbHNlXG59O1xuXG5cbmZ1bmN0aW9uIGJpbmRQcmVzcyhidXR0b24sIGV2ZW50TmFtZSwgaXNQcmVzc2VkKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgYnV0dG9uKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24gKGUpIHtcbiAgICAvLyBIYW5kbGUgRC1wYWQgcHJlc3Nlcy5cbiAgICBpZiAoZS50YXJnZXQgJiYgZS50YXJnZXQucGFyZW50Tm9kZSA9PT0gZHBhZCkge1xuICAgICAgZHBhZC5jbGFzc0xpc3QudG9nZ2xlKHRoaXMuaWQpO1xuICAgIH1cblxuICAgIGdhbWVwYWRTdGF0ZVtidXR0b25dID0gaXNQcmVzc2VkO1xuICAgIHNlbmQoZ2FtZXBhZFN0YXRlKTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gYmluZEtleVByZXNzZXMoZXZlbnROYW1lLCBpc1ByZXNzZWQpIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAoZS5rZXlDb2RlKSB7XG4gICAgICBjYXNlIDM4OlxuICAgICAgICAvLyBTZW5kIGV2ZW50IG9ubHkgb25jZS5cbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUudXApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLnVwID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICd1cCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM5OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5yaWdodCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUucmlnaHQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3JpZ2h0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDA6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmRvd24pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmRvd24gPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ2Rvd24nIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzNzpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUubGVmdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUubGVmdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnbGVmdCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDEzOlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zdGFydCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuc3RhcnQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIHN0YXJ0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NTpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYSA9IGlzUHJlc3NlZDtcbiAgICAgICAgYUJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNjY6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmIgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGJCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoZS5zaGlmdEtleSB8fCAoIWlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuc2VsZWN0KSkge1xuICAgICAgICAgIC8vIElmIHRoZSBTaGlmdCBrZXkgd2FzIHByZXNzZWQgb3IgdW5wcmVzc2VkLCB0b2dnbGUgaXRzIHN0YXRlLlxuICAgICAgICAgIGdhbWVwYWRTdGF0ZS5zZWxlY3QgPSBpc1ByZXNzZWQ7XG4gICAgICAgICAgc2VsZWN0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIChpLmUuLCBhbnkgb3RoZXIga2V5IHdhcyBwcmVzc2VkKSwgYmFpbC5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZW5kKGdhbWVwYWRTdGF0ZSk7XG4gIH0pO1xufVxuXG5cbk9iamVjdC5rZXlzKGdhbWVwYWRTdGF0ZSkuZm9yRWFjaChmdW5jdGlvbiAoYnV0dG9uKSB7XG4gIGlmICh1dGlscy5oYXNUb3VjaEV2ZW50cygpKSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ3RvdWNoc3RhcnQnLCB0cnVlKTtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAndG91Y2hlbmQnLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ21vdXNlZG93bicsIHRydWUpO1xuICAgIGJpbmRQcmVzcyhidXR0b24sICdtb3VzZXVwJywgZmFsc2UpO1xuICB9XG59KTtcblxuXG5iaW5kS2V5UHJlc3Nlcygna2V5ZG93bicsIHRydWUpO1xuYmluZEtleVByZXNzZXMoJ2tleXVwJywgZmFsc2UpO1xuIiwiZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBlZXJJZCgpIHtcbiAgcmV0dXJuICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignLmh0bWwnKSA/XG4gICAgd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkgOiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3Vic3RyKDEpKTtcbn1cblxuXG52YXIgRklFTERfRk9DVVNFRF9UQUdTID0gW1xuICAnaW5wdXQnLFxuICAna2V5Z2VuJyxcbiAgJ21ldGVyJyxcbiAgJ29wdGlvbicsXG4gICdvdXRwdXQnLFxuICAncHJvZ3Jlc3MnLFxuICAnc2VsZWN0JyxcbiAgJ3RleHRhcmVhJ1xuXTtcbmZ1bmN0aW9uIGZpZWxkRm9jdXNlZChlKSB7XG4gIHJldHVybiBGSUVMRF9GT0NVU0VEX1RBR1MuaW5kZXhPZihlLnRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG59XG5cblxuZnVuY3Rpb24gaGFzVG91Y2hFdmVudHMoKSB7XG4gIHJldHVybiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8XG4gICAgd2luZG93LkRvY3VtZW50VG91Y2ggJiYgZG9jdW1lbnQgaW5zdGFuY2VvZiBEb2N1bWVudFRvdWNoKTtcbn1cblxuZnVuY3Rpb24gaW5qZWN0Q1NTKG9wdHMpIHtcbiAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gIGxpbmsuaHJlZiA9IG9wdHMuaHJlZjtcbiAgbGluay5tZWRpYSA9ICdhbGwnO1xuICBsaW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcbiAgbGluay50eXBlID0gJ3RleHQvY3NzJztcbiAgT2JqZWN0LmtleXMob3B0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIGxpbmtbcHJvcF0gPSBvcHRzW3Byb3BdO1xuICB9KTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmFwcGVuZENoaWxkKGxpbmspO1xufVxuXG5mdW5jdGlvbiBlc2NhcGUodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICByZXR1cm4gdGV4dC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJiMzNDsnKTtcbn1cblxuZnVuY3Rpb24gaXNGdWxsU2NyZWVuKCkge1xuICByZXR1cm4gKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJiAgLy8gc3RhbmRhcmQgbWV0aG9kXG4gICAgIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50Lm1zRnVsbHNjcmVlbkVsZW1lbnQpOyAgLy8gdmVuZG9yLXByZWZpeGVkIG1ldGhvZHNcbn1cblxuZnVuY3Rpb24gdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgaWYgKGlzRnVsbFNjcmVlbigpKSB7XG4gICAgdHJhY2UoJ0VudGVyaW5nIGZ1bGwgc2NyZWVuJyk7XG4gICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdHJhY2UoJ0V4aXRpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2NrT3JpZW50YXRpb24oKSB7XG4gIHZhciBsbyA9IChzY3JlZW4uTG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLm1vekxvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi53ZWJraXRMb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ubXNMb2NrT3JpZW50YXRpb24pO1xuICBpZiAoIWxvKSB7XG4gICAgcmV0dXJuIHdhcm4oJ09yaWVudGF0aW9uIGNvdWxkIG5vdCBiZSBsb2NrZWQnKTtcbiAgfVxuXG4gIGxvKG9yaWVudGF0aW9uKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy50cmFjZSA9IHRyYWNlO1xubW9kdWxlLmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbm1vZHVsZS5leHBvcnRzLndhcm4gPSB3YXJuO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGVlcklkID0gZ2V0UGVlcklkO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluamVjdENTUyA9IGluamVjdENTUztcbm1vZHVsZS5leHBvcnRzLmVzY2FwZSA9IGVzY2FwZTtcbm1vZHVsZS5leHBvcnRzLmlzRnVsbFNjcmVlbiA9IGlzRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLnRvZ2dsZUZ1bGxTY3JlZW4gPSB0b2dnbGVGdWxsU2NyZWVuO1xubW9kdWxlLmV4cG9ydHMubG9ja09yaWVudGF0aW9uID0gbG9ja09yaWVudGF0aW9uO1xuIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSSlNfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSSlNfS0VZOiAncm92dTV4bXFvNjl3d21pJ1xufTtcbiJdfQ==
