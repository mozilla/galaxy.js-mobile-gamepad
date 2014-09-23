(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (window, document) {
'use strict';

// var peer = require('./lib/peer');
// var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line
var settings = require('./settings');
var utils = require('./lib/utils');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCkge1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyB2YXIgcGVlciA9IHJlcXVpcmUoJy4vbGliL3BlZXInKTtcbi8vIHZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9saWIvcHJvbWlzZS0xLjAuMCcpOyAgLy8ganNoaW50IGlnbm9yZTpsaW5lXG52YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xudmFyIGVycm9yID0gdXRpbHMuZXJyb3I7XG52YXIgdHJhY2UgPSB1dGlscy50cmFjZTtcblxuXG51dGlscy5wb2x5ZmlsbCgpO1xuXG5cbnV0aWxzLmxvY2tPcmllbnRhdGlvbignbGFuZHNjYXBlLXByaW1hcnknKTtcbmZ1bmN0aW9uIHdhbnRzQXV0b0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAhKCdkaXNhYmxlQXV0b0Z1bGxTY3JlZW4nIGluIGxvY2FsU3RvcmFnZSk7XG59XG5cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbiAoZSkge1xuICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICBjYXNlIDcwOiAgLy8gUHJlc3NpbmcgRiBzaG91bGQgdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICB0cmFjZSgnVXNlciBwcmVzc2VkIFwiRlwiOyBlbnRlcmluZy9leGl0aW5nIGZ1bGxzY3JlZW4nKTtcbiAgICAgIHJldHVybiB1dGlscy50b2dnbGVGdWxsU2NyZWVuKCk7XG4gICAgY2FzZSA3ODogIC8vIFByZXNzaW5nIE5GIChyZWFsbHkganVzdCBOKSBzaG91bGQgdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICB0cmFjZSgnVXNlciBwcmVzc2VkIFwiTkZcIjsgZXhpdGluZyBmdWxsc2NyZWVuIGFuZCB3aWxsIG5vdCAnICtcbiAgICAgICAgJ2F1dG9tYXRpY2FsbHkgb3BlbiBuZXh0IHRpbWUnKTtcbiAgICAgIGxvY2FsU3RvcmFnZS5kaXNhYmxlQXV0b0Z1bGxTY3JlZW4gPSAnMSc7XG4gICAgICByZXR1cm4gdXRpbHMudG9nZ2xlRnVsbFNjcmVlbigpO1xuICB9XG59KTtcblxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gIGlmICh1dGlscy5maWVsZEZvY3VzZWQoZSkgfHwgIXdhbnRzQXV0b0Z1bGxTY3JlZW4oKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cmFjZSgnQXV0b21hdGljYWxseSBlbnRlcmluZyBmdWxsc2NyZWVuJyk7XG4gIHV0aWxzLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbn0pO1xuXG5cbi8vIGlmIHRoZXJlJ3Mgbm90IGEgcGluLCB0ZWxsIHRoZSB1c2VyIHRvIG9wZW4gdGhlIGdhbWUgb24gYW5vdGhlciBkZXZpY2Vcbi8vIGZpcnN0LiBpbnN0ZWFkIG9mIHJlbGVnYXRpbmcgbW9iaWxlIHRvIGJlIGFsd2F5cyBhIGNvbnRyb2xsZXIsIGFsbG93IHRoZVxuLy8gZ2FtZSB0byBtaXJyb3IgdGhlIGRlc2t0b3AgKMOgIGxhIFdpaVUpLlxuXG52YXIgcGVlcklkID0gdXRpbHMuZ2V0UGVlcklkKCk7XG5cbnZhciBwZWVyID0gbmV3IHdpbmRvdy5QZWVyKCdjb250cm9sbGVyXycgKyBwZWVySWQsIHtcbiAga2V5OiBzZXR0aW5ncy5QRUVSSlNfS0VZLFxuICBkZWJ1Zzogc2V0dGluZ3MuREVCVUcgPyAzIDogMFxufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBmdW5jdGlvbiAoKSB7XG4gIHBlZXIuZGVzdHJveSgpO1xufSk7XG5cbnZhciBjb25uID0gcGVlci5jb25uZWN0KHBlZXJJZCk7XG5cbmNvbm4ub24oJ29wZW4nLCBmdW5jdGlvbiAoKSB7XG4gIHRyYWNlKCdNeSBwZWVyIElEOiAnICsgcGVlci5pZCk7XG4gIHRyYWNlKCdNeSBjb25uZWN0aW9uIElEOiAnICsgY29ubi5pZCk7XG5cbiAgY29ubi5vbignZGF0YScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdHJhY2UoJ1JlY2VpdmVkOiAnICsgZGF0YSk7XG4gIH0pO1xuXG4gIGNvbm4ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIGVycm9yKGVyci5tZXNzYWdlKTtcbiAgfSk7XG59KTtcblxuXG5mdW5jdGlvbiBzZW5kKG1zZykge1xuICBpZiAoc2V0dGluZ3MuREVCVUcpIHtcbiAgICBjb25zb2xlLmxvZygnU2VudDogJyArXG4gICAgICAodHlwZW9mIG1zZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShtc2cpIDogbXNnKSk7XG4gIH1cbiAgY29ubi5zZW5kKG1zZyk7XG59XG5cblxuLyoqXG4gKiBUcmFkaXRpb25hbCwgTkVTLWluc3BpcmVkIGdhbWVwYWQuXG4gKi9cbnZhciBkcGFkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RwYWQnKTtcbnZhciBzZWxlY3RCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0Jyk7XG52YXIgc3RhcnRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc3RhcnQnKTtcbnZhciBiQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2InKTtcbnZhciBhQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2EnKTtcblxuXG4vKipcbiAqIERyYXcgRC1wYWQuXG4gKi9cbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHBhZC1ib2R5Jyk7XG5cbmZ1bmN0aW9uIGFuZ3VsYXJTaGFwZShjYW52YXMsIGNvb3Jkcykge1xuICB2YXIgc2hhcGUgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdmFyIGkgPSAwO1xuICBzaGFwZS5iZWdpblBhdGgoKTtcbiAgc2hhcGUubW92ZVRvKGNvb3Jkc1swXVswXSwgY29vcmRzWzBdWzFdKTtcbiAgY29vcmRzLnNsaWNlKDEpO1xuXG4gIGZvciAoOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgc2hhcGUubGluZVRvKGNvb3Jkc1tpXVswXSwgY29vcmRzW2ldWzFdKTtcbiAgfVxuXG4gIHNoYXBlLmNsb3NlUGF0aCgpO1xuICByZXR1cm4gc2hhcGU7XG59XG5cbmZ1bmN0aW9uIGxpbmVhckZpbGwoc2hhcGUsIGNvbG9yMSwgY29sb3IyLCBjb29yZHMpIHtcbiAgdmFyIGJnID0gc2hhcGUuY3JlYXRlTGluZWFyR3JhZGllbnQoY29vcmRzWzBdLCBjb29yZHNbMV0sIGNvb3Jkc1syXSxcbiAgICBjb29yZHNbM10pO1xuICBiZy5hZGRDb2xvclN0b3AoMCwgY29sb3IxKTtcbiAgYmcuYWRkQ29sb3JTdG9wKDEsIGNvbG9yMik7XG4gIHNoYXBlLmZpbGxTdHlsZSA9IGJnO1xuICBzaGFwZS5maWxsKCk7XG59XG5cbmZ1bmN0aW9uIHlTaWRlKGNhbnZhcywgeSwgeEZyb20sIHhUbykge1xuICB2YXIgc2hhcGUgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gICAgW3ksIHhGcm9tXSxcbiAgICBbeSArIDUsIHhGcm9tICsgMy41XSxcbiAgICBbeSArIDUsIHhUbyArIDMuNV0sXG4gICAgW3ksIHhUb11cbiAgXSk7XG4gIGxpbmVhckZpbGwoc2hhcGUsICcjNjY2JywgJyMwMDAnLCBbeSwgeEZyb20sIHkgKyAxNSwgeEZyb21dKTtcbn1cblxuZnVuY3Rpb24geFNpZGUoY2FudmFzLCB4LCB5RnJvbSwgeVRvKSB7XG4gIHZhciBzaGFwZSA9IGFuZ3VsYXJTaGFwZShjYW52YXMsIFtcbiAgICBbeUZyb20sIHhdLFxuICAgIFt5RnJvbSArIDUsIHggKyAzLjVdLFxuICAgIFt5VG8gKyA1LCB4ICsgMy41XSxcbiAgICBbeVRvLCB4XVxuICBdKTtcbiAgbGluZWFyRmlsbChzaGFwZSwgJyM2NjYnLCAnIzAwMCcsIFt5RnJvbSwgeCwgeUZyb20sIHggKyAxNV0pO1xufVxuXG4vLyBEcmF3IHRoZSBzaWRlcyBmaXJzdC5cbnhTaWRlKGNhbnZhcywgNjMuNSwgMCwgMTAwKTtcbnhTaWRlKGNhbnZhcywgMTAwLCAzNi41LCA2My41KTtcbnlTaWRlKGNhbnZhcywgNjMuNSwgMCwgMzYuNSk7XG55U2lkZShjYW52YXMsIDYzLjUsIDYzLjUsIDEwMCk7XG55U2lkZShjYW52YXMsIDEwMCwgMzYuNSwgNjMuNSk7XG5cbi8vIERyYXcgdGhlIEQtcGFkLlxudmFyIHBsdXMgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gIFswLCAzNi41XSxcbiAgWzM2LjUsIDM2LjVdLFxuICBbMzYuNSwgMF0sXG4gIFs2My41LCAwXSxcbiAgWzYzLjUsIDM2LjVdLFxuICBbMTAwLCAzNi41XSxcbiAgWzEwMCwgNjMuNV0sXG4gIFs2My41LCA2My41XSxcbiAgWzYzLjUsIDEwMF0sXG4gIFszNi41LCAxMDBdLFxuICBbMzYuNSwgNjNdLFxuICBbMCwgNjMuNV1cbl0pO1xuXG5wbHVzLmZpbGxTdHlsZSA9ICcjMWExYTFhJztcbnBsdXMuc2hhZG93Q29sb3IgPSAncmdiYSgwLDAsMCwuNiknO1xucGx1cy5zaGFkb3dCbHVyID0gMTU7XG5wbHVzLnNoYWRvd09mZnNldFggPSAyMDtcbnBsdXMuc2hhZG93T2Zmc2V0WSA9IDEwO1xucGx1cy5maWxsKCk7XG5cblxudmFyIGdhbWVwYWRTdGF0ZSA9IHtcbiAgdXA6IGZhbHNlLFxuICByaWdodDogZmFsc2UsXG4gIGRvd246IGZhbHNlLFxuICBsZWZ0OiBmYWxzZSxcbiAgc2VsZWN0OiBmYWxzZSxcbiAgc3RhcnQ6IGZhbHNlLFxuICBiOiBmYWxzZSxcbiAgYTogZmFsc2Vcbn07XG5cblxuZnVuY3Rpb24gYmluZFByZXNzKGJ1dHRvbiwgZXZlbnROYW1lLCBpc1ByZXNzZWQpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignIycgKyBidXR0b24pXG4gICAgLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmdW5jdGlvbiAoZSkge1xuICAgICAgLy8gSGFuZGxlIEQtcGFkIHByZXNzZXMuXG4gICAgICBpZiAoZS50YXJnZXQgJiYgZS50YXJnZXQucGFyZW50Tm9kZSA9PT0gZHBhZCkge1xuICAgICAgICBkcGFkLmNsYXNzTGlzdC50b2dnbGUodGhpcy5pZCk7XG4gICAgICB9XG5cbiAgICAgIGdhbWVwYWRTdGF0ZVtidXR0b25dID0gaXNQcmVzc2VkO1xuICAgICAgc2VuZCh7dHlwZTogJ3N0YXRlJywgZGF0YTogZ2FtZXBhZFN0YXRlfSk7XG4gICAgfSk7XG59XG5cblxuZnVuY3Rpb24gYmluZEtleVByZXNzZXMoZXZlbnROYW1lLCBpc1ByZXNzZWQpIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAoZS5rZXlDb2RlKSB7XG4gICAgICBjYXNlIDM4OlxuICAgICAgICAvLyBTZW5kIGV2ZW50IG9ubHkgb25jZS5cbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUudXApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLnVwID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICd1cCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM5OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5yaWdodCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUucmlnaHQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3JpZ2h0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDA6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmRvd24pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmRvd24gPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ2Rvd24nIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzNzpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUubGVmdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUubGVmdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnbGVmdCcgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDEzOlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zdGFydCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuc3RhcnQgPSBpc1ByZXNzZWQ7XG4gICAgICAgIHN0YXJ0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NTpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYSA9IGlzUHJlc3NlZDtcbiAgICAgICAgYUJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNjY6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLmIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZXBhZFN0YXRlLmIgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGJCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoZS5zaGlmdEtleSB8fCAoIWlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuc2VsZWN0KSkge1xuICAgICAgICAgIC8vIElmIHRoZSBTaGlmdCBrZXkgd2FzIHByZXNzZWQgb3IgdW5wcmVzc2VkLCB0b2dnbGUgaXRzIHN0YXRlLlxuICAgICAgICAgIGdhbWVwYWRTdGF0ZS5zZWxlY3QgPSBpc1ByZXNzZWQ7XG4gICAgICAgICAgc2VsZWN0QnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIChpLmUuLCBhbnkgb3RoZXIga2V5IHdhcyBwcmVzc2VkKSwgYmFpbC5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZW5kKGdhbWVwYWRTdGF0ZSk7XG4gIH0pO1xufVxuXG5cbk9iamVjdC5rZXlzKGdhbWVwYWRTdGF0ZSkuZm9yRWFjaChmdW5jdGlvbiAoYnV0dG9uKSB7XG4gIGlmICh1dGlscy5oYXNUb3VjaEV2ZW50cygpKSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ3RvdWNoc3RhcnQnLCB0cnVlKTtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAndG91Y2hlbmQnLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ21vdXNlZG93bicsIHRydWUpO1xuICAgIGJpbmRQcmVzcyhidXR0b24sICdtb3VzZXVwJywgZmFsc2UpO1xuICB9XG59KTtcblxuXG5iaW5kS2V5UHJlc3Nlcygna2V5ZG93bicsIHRydWUpO1xuYmluZEtleVByZXNzZXMoJ2tleXVwJywgZmFsc2UpO1xuXG5cbn0pKHdpbmRvdywgZG9jdW1lbnQpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAod2luZG93LCBkb2N1bWVudCkge1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXShcbiAgICAod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gIGlmICghKCdwZXJmb3JtYW5jZScgaW4gd2luZG93KSkge1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIG5vdzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gK25ldyBEYXRlKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICgoJ29yaWdpbicgaW4gd2luZG93LmxvY2F0aW9uKSkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gPSAod2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArXG4gICAgICB3aW5kb3cubG9jYXRpb24uaG9zdCk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRQZWVySWQoKSB7XG4gIHJldHVybiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoJy5odG1sJykgP1xuICAgIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XG59XG5cblxudmFyIEZJRUxEX0ZPQ1VTRURfVEFHUyA9IFtcbiAgJ2lucHV0JyxcbiAgJ2tleWdlbicsXG4gICdtZXRlcicsXG4gICdvcHRpb24nLFxuICAnb3V0cHV0JyxcbiAgJ3Byb2dyZXNzJyxcbiAgJ3NlbGVjdCcsXG4gICd0ZXh0YXJlYSdcbl07XG5mdW5jdGlvbiBmaWVsZEZvY3VzZWQoZSkge1xuICByZXR1cm4gRklFTERfRk9DVVNFRF9UQUdTLmluZGV4T2YoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xufVxuXG5cbmZ1bmN0aW9uIGhhc1RvdWNoRXZlbnRzKCkge1xuICByZXR1cm4gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fFxuICAgIHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2Ygd2luZG93LkRvY3VtZW50VG91Y2gpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RDU1Mob3B0cykge1xuICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgbGluay5ocmVmID0gb3B0cy5ocmVmO1xuICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICBsaW5rLnR5cGUgPSAndGV4dC9jc3MnO1xuICBPYmplY3Qua2V5cyhvcHRzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgbGlua1twcm9wXSA9IG9wdHNbcHJvcF07XG4gIH0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJykuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZSh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybiB0ZXh0O1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmIzM0OycpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bGxTY3JlZW4oKSB7XG4gIHJldHVybiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50ICYmICAvLyBzdGFuZGFyZCBtZXRob2RcbiAgICAhZG9jdW1lbnQubW96RnVsbFNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgJiZcbiAgICAhZG9jdW1lbnQubXNGdWxsc2NyZWVuRWxlbWVudCk7ICAvLyB2ZW5kb3ItcHJlZml4ZWQgbWV0aG9kc1xufVxuXG5mdW5jdGlvbiB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICBpZiAoaXNGdWxsU2NyZWVuKCkpIHtcbiAgICB0cmFjZSgnRW50ZXJpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlcXVlc3RGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tb3pSZXF1ZXN0RnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbihcbiAgICAgICAgRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubXNSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdHJhY2UoJ0V4aXRpbmcgZnVsbCBzY3JlZW4nKTtcbiAgICBpZiAoZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC53ZWJraXRFeGl0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50Lm1zRXhpdEZ1bGxzY3JlZW4oKTtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2NrT3JpZW50YXRpb24ob3JpZW50YXRpb24pIHtcbiAgdmFyIGxvID0gKHdpbmRvdy5zY3JlZW4uTG9ja09yaWVudGF0aW9uIHx8XG4gICAgd2luZG93LnNjcmVlbi5tb3pMb2NrT3JpZW50YXRpb24gfHxcbiAgICB3aW5kb3cuc2NyZWVuLndlYmtpdExvY2tPcmllbnRhdGlvbiB8fFxuICAgIHdpbmRvdy5zY3JlZW4ubXNMb2NrT3JpZW50YXRpb24pO1xuICBpZiAoIWxvKSB7XG4gICAgcmV0dXJuIHdhcm4oJ09yaWVudGF0aW9uIGNvdWxkIG5vdCBiZSBsb2NrZWQnKTtcbiAgfVxuXG4gIHJldHVybiBsbyhvcmllbnRhdGlvbik7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckV2ZW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0hUTUxFdmVudHMnKTtcbiAgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIHRydWUsIHRydWUpO1xuICBldmVudC5ldmVudE5hbWUgPSB0eXBlO1xuICAoZG9jdW1lbnQuYm9keSB8fCB3aW5kb3cpLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufVxuXG5cbnJldHVybiB7XG4gIHRyYWNlOiB0cmFjZSxcbiAgZXJyb3I6IGVycm9yLFxuICB3YXJuOiB3YXJuLFxuICBwb2x5ZmlsbDogcG9seWZpbGwsXG4gIGdldFBlZXJJZDogZ2V0UGVlcklkLFxuICBmaWVsZEZvY3VzZWQ6IGZpZWxkRm9jdXNlZCxcbiAgaGFzVG91Y2hFdmVudHM6IGhhc1RvdWNoRXZlbnRzLFxuICBpbmplY3RDU1M6IGluamVjdENTUyxcbiAgZXNjYXBlOiBlc2NhcGUsXG4gIGlzRnVsbFNjcmVlbjogaXNGdWxsU2NyZWVuLFxuICB0b2dnbGVGdWxsU2NyZWVuOiB0b2dnbGVGdWxsU2NyZWVuLFxuICBsb2NrT3JpZW50YXRpb246IGxvY2tPcmllbnRhdGlvbixcbiAgdHJpZ2dlckV2ZW50OiB0cmlnZ2VyRXZlbnRcbn07XG5cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIEdhbGF4eSBBUEkgVVJMLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSSlNfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuLy8gT3ZlcnJpZGUgZWFjaCBkZWZhdWx0IHNldHRpbmcgd2l0aCB1c2VyLWRlZmluZWQgc2V0dGluZy5cbk9iamVjdC5rZXlzKHNldHRpbmdzX2xvY2FsKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0c2V0dGluZ3Nba2V5XSA9IHNldHRpbmdzX2xvY2FsW2tleV07XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSSlNfS0VZOiAncm92dTV4bXFvNjl3d21pJ1xufTtcbiJdfQ==
