(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (window, document) {
'use strict';

// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils')(window, document);
var error = utils.error;
var trace = utils.trace;


utils.polyfill();


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
      trace('User pressed "NF"; exiting fullscreen and will not ' +
        'automatically open next time');
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

var peer = new window.Peer('controller_' + peerId, {
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
    console.log('Sent: ' +
      (typeof msg === 'object' ? JSON.stringify(msg) : msg));
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
  var bg = shape.createLinearGradient(coords[0], coords[1], coords[2],
    coords[3]);
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
  document.querySelector('#' + button)
    .addEventListener(eventName, function (e) {
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
module.exports = function (window, document) {
'use strict';

if (!window) {
  throw new Error('window required');
}
if (!document) {
  throw new Error('document required');
}

function trace(text, level) {
  console[level || 'log'](
    (window.performance.now() / 1000).toFixed(3) + ': ' + text);
}


function error(text) {
  return trace(text, 'error');
}


function warn(text) {
  return trace(text, 'warn');
}


function polyfill() {
  if (!('performance' in window)) {
    window.performance = {
      now: function () {
        return +new Date();
      }
    };
  }

  if (('origin' in window.location)) {
    window.location.origin = (window.location.protocol + '//' +
      window.location.host);
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
    window.DocumentTouch && document instanceof window.DocumentTouch);
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
      document.documentElement.webkitRequestFullscreen(
        Element.ALLOW_KEYBOARD_INPUT);
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


function lockOrientation(orientation) {
  var lo = (window.screen.LockOrientation ||
    window.screen.mozLockOrientation ||
    window.screen.webkitLockOrientation ||
    window.screen.msLockOrientation);
  if (!lo) {
    return warn('Orientation could not be locked');
  }

  return lo(orientation);
}


function triggerEvent(type) {
  var event = document.createEvent('HTMLEvents');
  event.initEvent(type, true, true);
  event.eventName = type;
  (document.body || window).dispatchEvent(event);
}


return {
  trace: trace,
  error: error,
  warn: warn,
  polyfill: polyfill,
  getPeerId: getPeerId,
  fieldFocused: fieldFocused,
  hasTouchEvents: hasTouchEvents,
  injectCSS: injectCSS,
  escape: escape,
  isFullScreen: isFullScreen,
  toggleFullScreen: toggleFullScreen,
  lockOrientation: lockOrientation,
  triggerEvent: triggerEvent
};

};

},{}],3:[function(require,module,exports){
'use strict';

var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}


var settings = {
  API_URL: 'http://localhost:5000',  // Galaxy API URL. No trailing slash.
  DEBUG: false,
  PEERJS_KEY: '',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

// Override each default setting with user-defined setting.
Object.keys(settings_local).forEach(function (key) {
	settings[key] = settings_local[key];
});


module.exports = settings;

},{"./settings_local.js":4}],4:[function(require,module,exports){
module.exports = {
  DEBUG: true,
  PEERJS_KEY: 'rovu5xmqo69wwmi'
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG4ndXNlIHN0cmljdCc7XG5cbi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJykod2luZG93LCBkb2N1bWVudCk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbnV0aWxzLnBvbHlmaWxsKCk7XG5cblxudXRpbHMubG9ja09yaWVudGF0aW9uKCdsYW5kc2NhcGUtcHJpbWFyeScpO1xuZnVuY3Rpb24gd2FudHNBdXRvRnVsbFNjcmVlbigpIHtcbiAgcmV0dXJuICEoJ2Rpc2FibGVBdXRvRnVsbFNjcmVlbicgaW4gbG9jYWxTdG9yYWdlKTtcbn1cblxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uIChlKSB7XG4gIGlmICh1dGlscy5maWVsZEZvY3VzZWQoZSkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBzd2l0Y2ggKGUua2V5Q29kZSkge1xuICAgIGNhc2UgNzA6ICAvLyBQcmVzc2luZyBGIHNob3VsZCB0b2dnbGUgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgIHRyYWNlKCdVc2VyIHByZXNzZWQgXCJGXCI7IGVudGVyaW5nL2V4aXRpbmcgZnVsbHNjcmVlbicpO1xuICAgICAgcmV0dXJuIHV0aWxzLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbiAgICBjYXNlIDc4OiAgLy8gUHJlc3NpbmcgTkYgKHJlYWxseSBqdXN0IE4pIHNob3VsZCB0b2dnbGUgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgIHRyYWNlKCdVc2VyIHByZXNzZWQgXCJORlwiOyBleGl0aW5nIGZ1bGxzY3JlZW4gYW5kIHdpbGwgbm90ICcgK1xuICAgICAgICAnYXV0b21hdGljYWxseSBvcGVuIG5leHQgdGltZScpO1xuICAgICAgbG9jYWxTdG9yYWdlLmRpc2FibGVBdXRvRnVsbFNjcmVlbiA9ICcxJztcbiAgICAgIHJldHVybiB1dGlscy50b2dnbGVGdWxsU2NyZWVuKCk7XG4gIH1cbn0pO1xuXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSB8fCAhd2FudHNBdXRvRnVsbFNjcmVlbigpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyYWNlKCdBdXRvbWF0aWNhbGx5IGVudGVyaW5nIGZ1bGxzY3JlZW4nKTtcbiAgdXRpbHMudG9nZ2xlRnVsbFNjcmVlbigpO1xufSk7XG5cblxuLy8gaWYgdGhlcmUncyBub3QgYSBwaW4sIHRlbGwgdGhlIHVzZXIgdG8gb3BlbiB0aGUgZ2FtZSBvbiBhbm90aGVyIGRldmljZVxuLy8gZmlyc3QuIGluc3RlYWQgb2YgcmVsZWdhdGluZyBtb2JpbGUgdG8gYmUgYWx3YXlzIGEgY29udHJvbGxlciwgYWxsb3cgdGhlXG4vLyBnYW1lIHRvIG1pcnJvciB0aGUgZGVza3RvcCAow6AgbGEgV2lpVSkuXG5cbnZhciBwZWVySWQgPSB1dGlscy5nZXRQZWVySWQoKTtcblxudmFyIHBlZXIgPSBuZXcgd2luZG93LlBlZXIoJ2NvbnRyb2xsZXJfJyArIHBlZXJJZCwge1xuICBrZXk6IHNldHRpbmdzLlBFRVJKU19LRVksXG4gIGRlYnVnOiBzZXR0aW5ncy5ERUJVRyA/IDMgOiAwXG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgcGVlci5kZXN0cm95KCk7XG59KTtcblxudmFyIGNvbm4gPSBwZWVyLmNvbm5lY3QocGVlcklkKTtcblxuY29ubi5vbignb3BlbicsIGZ1bmN0aW9uICgpIHtcbiAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBwZWVyLmlkKTtcbiAgdHJhY2UoJ015IGNvbm5lY3Rpb24gSUQ6ICcgKyBjb25uLmlkKTtcblxuICBjb25uLm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0cmFjZSgnUmVjZWl2ZWQ6ICcgKyBkYXRhKTtcbiAgfSk7XG5cbiAgY29ubi5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgZXJyb3IoZXJyLm1lc3NhZ2UpO1xuICB9KTtcbn0pO1xuXG5cbmZ1bmN0aW9uIHNlbmQobXNnKSB7XG4gIGlmIChzZXR0aW5ncy5ERUJVRykge1xuICAgIGNvbnNvbGUubG9nKCdTZW50OiAnICtcbiAgICAgICh0eXBlb2YgbXNnID09PSAnb2JqZWN0JyA/IEpTT04uc3RyaW5naWZ5KG1zZykgOiBtc2cpKTtcbiAgfVxuICBjb25uLnNlbmQobXNnKTtcbn1cblxuXG4vKipcbiAqIFRyYWRpdGlvbmFsLCBORVMtaW5zcGlyZWQgZ2FtZXBhZC5cbiAqL1xudmFyIGRwYWQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZHBhZCcpO1xudmFyIHNlbGVjdEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWxlY3QnKTtcbnZhciBzdGFydEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzdGFydCcpO1xudmFyIGJCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYicpO1xudmFyIGFCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYScpO1xuXG5cbi8qKlxuICogRHJhdyBELXBhZC5cbiAqL1xudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcGFkLWJvZHknKTtcblxuZnVuY3Rpb24gYW5ndWxhclNoYXBlKGNhbnZhcywgY29vcmRzKSB7XG4gIHZhciBzaGFwZSA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICB2YXIgaSA9IDA7XG4gIHNoYXBlLmJlZ2luUGF0aCgpO1xuICBzaGFwZS5tb3ZlVG8oY29vcmRzWzBdWzBdLCBjb29yZHNbMF1bMV0pO1xuICBjb29yZHMuc2xpY2UoMSk7XG5cbiAgZm9yICg7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICBzaGFwZS5saW5lVG8oY29vcmRzW2ldWzBdLCBjb29yZHNbaV1bMV0pO1xuICB9XG5cbiAgc2hhcGUuY2xvc2VQYXRoKCk7XG4gIHJldHVybiBzaGFwZTtcbn1cblxuZnVuY3Rpb24gbGluZWFyRmlsbChzaGFwZSwgY29sb3IxLCBjb2xvcjIsIGNvb3Jkcykge1xuICB2YXIgYmcgPSBzaGFwZS5jcmVhdGVMaW5lYXJHcmFkaWVudChjb29yZHNbMF0sIGNvb3Jkc1sxXSwgY29vcmRzWzJdLFxuICAgIGNvb3Jkc1szXSk7XG4gIGJnLmFkZENvbG9yU3RvcCgwLCBjb2xvcjEpO1xuICBiZy5hZGRDb2xvclN0b3AoMSwgY29sb3IyKTtcbiAgc2hhcGUuZmlsbFN0eWxlID0gYmc7XG4gIHNoYXBlLmZpbGwoKTtcbn1cblxuZnVuY3Rpb24geVNpZGUoY2FudmFzLCB5LCB4RnJvbSwgeFRvKSB7XG4gIHZhciBzaGFwZSA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgICBbeSwgeEZyb21dLFxuICAgIFt5ICsgNSwgeEZyb20gKyAzLjVdLFxuICAgIFt5ICsgNSwgeFRvICsgMy41XSxcbiAgICBbeSwgeFRvXVxuICBdKTtcbiAgbGluZWFyRmlsbChzaGFwZSwgJyM2NjYnLCAnIzAwMCcsIFt5LCB4RnJvbSwgeSArIDE1LCB4RnJvbV0pO1xufVxuXG5mdW5jdGlvbiB4U2lkZShjYW52YXMsIHgsIHlGcm9tLCB5VG8pIHtcbiAgdmFyIHNoYXBlID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICAgIFt5RnJvbSwgeF0sXG4gICAgW3lGcm9tICsgNSwgeCArIDMuNV0sXG4gICAgW3lUbyArIDUsIHggKyAzLjVdLFxuICAgIFt5VG8sIHhdXG4gIF0pO1xuICBsaW5lYXJGaWxsKHNoYXBlLCAnIzY2NicsICcjMDAwJywgW3lGcm9tLCB4LCB5RnJvbSwgeCArIDE1XSk7XG59XG5cbi8vIERyYXcgdGhlIHNpZGVzIGZpcnN0LlxueFNpZGUoY2FudmFzLCA2My41LCAwLCAxMDApO1xueFNpZGUoY2FudmFzLCAxMDAsIDM2LjUsIDYzLjUpO1xueVNpZGUoY2FudmFzLCA2My41LCAwLCAzNi41KTtcbnlTaWRlKGNhbnZhcywgNjMuNSwgNjMuNSwgMTAwKTtcbnlTaWRlKGNhbnZhcywgMTAwLCAzNi41LCA2My41KTtcblxuLy8gRHJhdyB0aGUgRC1wYWQuXG52YXIgcGx1cyA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgWzAsIDM2LjVdLFxuICBbMzYuNSwgMzYuNV0sXG4gIFszNi41LCAwXSxcbiAgWzYzLjUsIDBdLFxuICBbNjMuNSwgMzYuNV0sXG4gIFsxMDAsIDM2LjVdLFxuICBbMTAwLCA2My41XSxcbiAgWzYzLjUsIDYzLjVdLFxuICBbNjMuNSwgMTAwXSxcbiAgWzM2LjUsIDEwMF0sXG4gIFszNi41LCA2M10sXG4gIFswLCA2My41XVxuXSk7XG5cbnBsdXMuZmlsbFN0eWxlID0gJyMxYTFhMWEnO1xucGx1cy5zaGFkb3dDb2xvciA9ICdyZ2JhKDAsMCwwLC42KSc7XG5wbHVzLnNoYWRvd0JsdXIgPSAxNTtcbnBsdXMuc2hhZG93T2Zmc2V0WCA9IDIwO1xucGx1cy5zaGFkb3dPZmZzZXRZID0gMTA7XG5wbHVzLmZpbGwoKTtcblxuXG52YXIgZ2FtZXBhZFN0YXRlID0ge1xuICB1cDogZmFsc2UsXG4gIHJpZ2h0OiBmYWxzZSxcbiAgZG93bjogZmFsc2UsXG4gIGxlZnQ6IGZhbHNlLFxuICBzZWxlY3Q6IGZhbHNlLFxuICBzdGFydDogZmFsc2UsXG4gIGI6IGZhbHNlLFxuICBhOiBmYWxzZVxufTtcblxuXG5mdW5jdGlvbiBiaW5kUHJlc3MoYnV0dG9uLCBldmVudE5hbWUsIGlzUHJlc3NlZCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjJyArIGJ1dHRvbilcbiAgICAuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAvLyBIYW5kbGUgRC1wYWQgcHJlc3Nlcy5cbiAgICAgIGlmIChlLnRhcmdldCAmJiBlLnRhcmdldC5wYXJlbnROb2RlID09PSBkcGFkKSB7XG4gICAgICAgIGRwYWQuY2xhc3NMaXN0LnRvZ2dsZSh0aGlzLmlkKTtcbiAgICAgIH1cblxuICAgICAgZ2FtZXBhZFN0YXRlW2J1dHRvbl0gPSBpc1ByZXNzZWQ7XG4gICAgICBzZW5kKHt0eXBlOiAnc3RhdGUnLCBkYXRhOiBnYW1lcGFkU3RhdGV9KTtcbiAgICB9KTtcbn1cblxuXG5mdW5jdGlvbiBiaW5kS2V5UHJlc3NlcyhldmVudE5hbWUsIGlzUHJlc3NlZCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICAgIGNhc2UgMzg6XG4gICAgICAgIC8vIFNlbmQgZXZlbnQgb25seSBvbmNlLlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS51cCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUudXAgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3VwJyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzk6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnJpZ2h0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5yaWdodCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAncmlnaHQnIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA0MDpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuZG93bikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuZG93biA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnZG93bicgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM3OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5sZWZ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5sZWZ0ID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICdsZWZ0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTM6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnN0YXJ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5zdGFydCA9IGlzUHJlc3NlZDtcbiAgICAgICAgc3RhcnRCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDY1OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5hKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5hID0gaXNQcmVzc2VkO1xuICAgICAgICBhQnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NjpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYiA9IGlzUHJlc3NlZDtcbiAgICAgICAgYkJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChlLnNoaWZ0S2V5IHx8ICghaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zZWxlY3QpKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIFNoaWZ0IGtleSB3YXMgcHJlc3NlZCBvciB1bnByZXNzZWQsIHRvZ2dsZSBpdHMgc3RhdGUuXG4gICAgICAgICAgZ2FtZXBhZFN0YXRlLnNlbGVjdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgICBzZWxlY3RCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgKGkuZS4sIGFueSBvdGhlciBrZXkgd2FzIHByZXNzZWQpLCBiYWlsLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQoZ2FtZXBhZFN0YXRlKTtcbiAgfSk7XG59XG5cblxuT2JqZWN0LmtleXMoZ2FtZXBhZFN0YXRlKS5mb3JFYWNoKGZ1bmN0aW9uIChidXR0b24pIHtcbiAgaWYgKHV0aWxzLmhhc1RvdWNoRXZlbnRzKCkpIHtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAndG91Y2hzdGFydCcsIHRydWUpO1xuICAgIGJpbmRQcmVzcyhidXR0b24sICd0b3VjaGVuZCcsIGZhbHNlKTtcbiAgfSBlbHNlIHtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAnbW91c2Vkb3duJywgdHJ1ZSk7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ21vdXNldXAnLCBmYWxzZSk7XG4gIH1cbn0pO1xuXG5cbmJpbmRLZXlQcmVzc2VzKCdrZXlkb3duJywgdHJ1ZSk7XG5iaW5kS2V5UHJlc3Nlcygna2V5dXAnLCBmYWxzZSk7XG5cblxufSkod2luZG93LCBkb2N1bWVudCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh3aW5kb3csIGRvY3VtZW50KSB7XG4ndXNlIHN0cmljdCc7XG5cbmlmICghd2luZG93KSB7XG4gIHRocm93IG5ldyBFcnJvcignd2luZG93IHJlcXVpcmVkJyk7XG59XG5pZiAoIWRvY3VtZW50KSB7XG4gIHRocm93IG5ldyBFcnJvcignZG9jdW1lbnQgcmVxdWlyZWQnKTtcbn1cblxuZnVuY3Rpb24gdHJhY2UodGV4dCwgbGV2ZWwpIHtcbiAgY29uc29sZVtsZXZlbCB8fCAnbG9nJ10oXG4gICAgKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnICsgdGV4dCk7XG59XG5cblxuZnVuY3Rpb24gZXJyb3IodGV4dCkge1xuICByZXR1cm4gdHJhY2UodGV4dCwgJ2Vycm9yJyk7XG59XG5cblxuZnVuY3Rpb24gd2Fybih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnd2FybicpO1xufVxuXG5cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICBpZiAoISgncGVyZm9ybWFuY2UnIGluIHdpbmRvdykpIHtcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgICBub3c6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICtuZXcgRGF0ZSgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAoKCdvcmlnaW4nIGluIHdpbmRvdy5sb2NhdGlvbikpIHtcbiAgICB3aW5kb3cubG9jYXRpb24ub3JpZ2luID0gKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgK1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3QpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0UGVlcklkKCkge1xuICByZXR1cm4gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xufVxuXG5cbnZhciBGSUVMRF9GT0NVU0VEX1RBR1MgPSBbXG4gICdpbnB1dCcsXG4gICdrZXlnZW4nLFxuICAnbWV0ZXInLFxuICAnb3B0aW9uJyxcbiAgJ291dHB1dCcsXG4gICdwcm9ncmVzcycsXG4gICdzZWxlY3QnLFxuICAndGV4dGFyZWEnXG5dO1xuZnVuY3Rpb24gZmllbGRGb2N1c2VkKGUpIHtcbiAgcmV0dXJuIEZJRUxEX0ZPQ1VTRURfVEFHUy5pbmRleE9mKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbn1cblxuXG5mdW5jdGlvbiBoYXNUb3VjaEV2ZW50cygpIHtcbiAgcmV0dXJuICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgfHxcbiAgICB3aW5kb3cuRG9jdW1lbnRUb3VjaCAmJiBkb2N1bWVudCBpbnN0YW5jZW9mIHdpbmRvdy5Eb2N1bWVudFRvdWNoKTtcbn1cblxuZnVuY3Rpb24gaW5qZWN0Q1NTKG9wdHMpIHtcbiAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gIGxpbmsuaHJlZiA9IG9wdHMuaHJlZjtcbiAgbGluay5tZWRpYSA9ICdhbGwnO1xuICBsaW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcbiAgbGluay50eXBlID0gJ3RleHQvY3NzJztcbiAgT2JqZWN0LmtleXMob3B0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIGxpbmtbcHJvcF0gPSBvcHRzW3Byb3BdO1xuICB9KTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmFwcGVuZENoaWxkKGxpbmspO1xufVxuXG5mdW5jdGlvbiBlc2NhcGUodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuICByZXR1cm4gdGV4dC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJiMzNDsnKTtcbn1cblxuZnVuY3Rpb24gaXNGdWxsU2NyZWVuKCkge1xuICByZXR1cm4gKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCAmJiAgLy8gc3RhbmRhcmQgbWV0aG9kXG4gICAgIWRvY3VtZW50Lm1vekZ1bGxTY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50LndlYmtpdEZ1bGxzY3JlZW5FbGVtZW50ICYmXG4gICAgIWRvY3VtZW50Lm1zRnVsbHNjcmVlbkVsZW1lbnQpOyAgLy8gdmVuZG9yLXByZWZpeGVkIG1ldGhvZHNcbn1cblxuZnVuY3Rpb24gdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgaWYgKGlzRnVsbFNjcmVlbigpKSB7XG4gICAgdHJhY2UoJ0VudGVyaW5nIGZ1bGwgc2NyZWVuJyk7XG4gICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oXG4gICAgICAgIEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRyYWNlKCdFeGl0aW5nIGZ1bGwgc2NyZWVuJyk7XG4gICAgaWYgKGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgfVxuICB9XG59XG5cblxuZnVuY3Rpb24gbG9ja09yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gIHZhciBsbyA9ICh3aW5kb3cuc2NyZWVuLkxvY2tPcmllbnRhdGlvbiB8fFxuICAgIHdpbmRvdy5zY3JlZW4ubW96TG9ja09yaWVudGF0aW9uIHx8XG4gICAgd2luZG93LnNjcmVlbi53ZWJraXRMb2NrT3JpZW50YXRpb24gfHxcbiAgICB3aW5kb3cuc2NyZWVuLm1zTG9ja09yaWVudGF0aW9uKTtcbiAgaWYgKCFsbykge1xuICAgIHJldHVybiB3YXJuKCdPcmllbnRhdGlvbiBjb3VsZCBub3QgYmUgbG9ja2VkJyk7XG4gIH1cblxuICByZXR1cm4gbG8ob3JpZW50YXRpb24pO1xufVxuXG5cbmZ1bmN0aW9uIHRyaWdnZXJFdmVudCh0eXBlKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gIGV2ZW50LmluaXRFdmVudCh0eXBlLCB0cnVlLCB0cnVlKTtcbiAgZXZlbnQuZXZlbnROYW1lID0gdHlwZTtcbiAgKGRvY3VtZW50LmJvZHkgfHwgd2luZG93KS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG5yZXR1cm4ge1xuICB0cmFjZTogdHJhY2UsXG4gIGVycm9yOiBlcnJvcixcbiAgd2Fybjogd2FybixcbiAgcG9seWZpbGw6IHBvbHlmaWxsLFxuICBnZXRQZWVySWQ6IGdldFBlZXJJZCxcbiAgZmllbGRGb2N1c2VkOiBmaWVsZEZvY3VzZWQsXG4gIGhhc1RvdWNoRXZlbnRzOiBoYXNUb3VjaEV2ZW50cyxcbiAgaW5qZWN0Q1NTOiBpbmplY3RDU1MsXG4gIGVzY2FwZTogZXNjYXBlLFxuICBpc0Z1bGxTY3JlZW46IGlzRnVsbFNjcmVlbixcbiAgdG9nZ2xlRnVsbFNjcmVlbjogdG9nZ2xlRnVsbFNjcmVlbixcbiAgbG9ja09yaWVudGF0aW9uOiBsb2NrT3JpZW50YXRpb24sXG4gIHRyaWdnZXJFdmVudDogdHJpZ2dlckV2ZW50XG59O1xuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2V0dGluZ3NfbG9jYWwgPSB7fTtcbnRyeSB7XG4gIHNldHRpbmdzX2xvY2FsID0gcmVxdWlyZSgnLi9zZXR0aW5nc19sb2NhbC5qcycpO1xufSBjYXRjaCAoZSkge1xufVxuXG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBHYWxheHkgQVBJIFVSTC4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIERFQlVHOiBmYWxzZSxcbiAgUEVFUkpTX0tFWTogJycsICAvLyBTaWduIHVwIGZvciBhIGtleSBhdCBodHRwOi8vcGVlcmpzLmNvbS9wZWVyc2VydmVyXG4gIFZFUlNJT046ICcwLjAuMScgIC8vIFZlcnNpb24gb2YgdGhlIGBnYW1lcGFkLmpzYCBzY3JpcHRcbn07XG5cbi8vIE92ZXJyaWRlIGVhY2ggZGVmYXVsdCBzZXR0aW5nIHdpdGggdXNlci1kZWZpbmVkIHNldHRpbmcuXG5PYmplY3Qua2V5cyhzZXR0aW5nc19sb2NhbCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG5cdHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5ncztcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBERUJVRzogdHJ1ZSxcbiAgUEVFUkpTX0tFWTogJ3JvdnU1eG1xbzY5d3dtaSdcbn07XG4iXX0=
