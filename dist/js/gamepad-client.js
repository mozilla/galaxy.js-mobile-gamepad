(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9jbGllbnQuanMiLCIvb3B0L2dhbGF4eS5qcy1tb2JpbGUtZ2FtZXBhZC9zcmMvanMvbGliL3V0aWxzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvc3JjL2pzL3NldHRpbmdzX2xvY2FsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xuLy8gdmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbnZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzJyk7XG52YXIgZXJyb3IgPSB1dGlscy5lcnJvcjtcbnZhciB0cmFjZSA9IHV0aWxzLnRyYWNlO1xuXG5cbnV0aWxzLnBvbHlmaWxsKHdpbmRvdyk7XG5cblxudXRpbHMubG9ja09yaWVudGF0aW9uKCdsYW5kc2NhcGUtcHJpbWFyeScpO1xuZnVuY3Rpb24gd2FudHNBdXRvRnVsbFNjcmVlbigpIHtcbiAgcmV0dXJuICEoJ2Rpc2FibGVBdXRvRnVsbFNjcmVlbicgaW4gbG9jYWxTdG9yYWdlKTtcbn1cblxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uIChlKSB7XG4gIGlmICh1dGlscy5maWVsZEZvY3VzZWQoZSkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBzd2l0Y2ggKGUua2V5Q29kZSkge1xuICAgIGNhc2UgNzA6ICAvLyBQcmVzc2luZyBGIHNob3VsZCB0b2dnbGUgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgIHRyYWNlKCdVc2VyIHByZXNzZWQgXCJGXCI7IGVudGVyaW5nL2V4aXRpbmcgZnVsbHNjcmVlbicpO1xuICAgICAgcmV0dXJuIHV0aWxzLnRvZ2dsZUZ1bGxTY3JlZW4oKTtcbiAgICBjYXNlIDc4OiAgLy8gUHJlc3NpbmcgTkYgKHJlYWxseSBqdXN0IE4pIHNob3VsZCB0b2dnbGUgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgIHRyYWNlKCdVc2VyIHByZXNzZWQgXCJORlwiOyBleGl0aW5nIGZ1bGxzY3JlZW4gYW5kIHdpbGwgbm90IGF1dG9tYXRpY2FsbHkgJyArXG4gICAgICAgICdvcGVuIG5leHQgdGltZScpO1xuICAgICAgbG9jYWxTdG9yYWdlLmRpc2FibGVBdXRvRnVsbFNjcmVlbiA9ICcxJztcbiAgICAgIHJldHVybiB1dGlscy50b2dnbGVGdWxsU2NyZWVuKCk7XG4gIH1cbn0pO1xuXG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgaWYgKHV0aWxzLmZpZWxkRm9jdXNlZChlKSB8fCAhd2FudHNBdXRvRnVsbFNjcmVlbigpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyYWNlKCdBdXRvbWF0aWNhbGx5IGVudGVyaW5nIGZ1bGxzY3JlZW4nKTtcbiAgdXRpbHMudG9nZ2xlRnVsbFNjcmVlbigpO1xufSk7XG5cblxuLy8gaWYgdGhlcmUncyBub3QgYSBwaW4sIHRlbGwgdGhlIHVzZXIgdG8gb3BlbiB0aGUgZ2FtZSBvbiBhbm90aGVyIGRldmljZVxuLy8gZmlyc3QuIGluc3RlYWQgb2YgcmVsZWdhdGluZyBtb2JpbGUgdG8gYmUgYWx3YXlzIGEgY29udHJvbGxlciwgYWxsb3cgdGhlXG4vLyBnYW1lIHRvIG1pcnJvciB0aGUgZGVza3RvcCAow6AgbGEgV2lpVSkuXG5cbnZhciBwZWVySWQgPSB1dGlscy5nZXRQZWVySWQoKTtcblxudmFyIHBlZXIgPSBuZXcgUGVlcignY29udHJvbGxlcl8nICsgcGVlcklkLCB7XG4gIGtleTogc2V0dGluZ3MuUEVFUkpTX0tFWSxcbiAgZGVidWc6IHNldHRpbmdzLkRFQlVHID8gMyA6IDBcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICBwZWVyLmRlc3Ryb3koKTtcbn0pO1xuXG52YXIgY29ubiA9IHBlZXIuY29ubmVjdChwZWVySWQpO1xuXG5jb25uLm9uKCdvcGVuJywgZnVuY3Rpb24gKCkge1xuICB0cmFjZSgnTXkgcGVlciBJRDogJyArIHBlZXIuaWQpO1xuICB0cmFjZSgnTXkgY29ubmVjdGlvbiBJRDogJyArIGNvbm4uaWQpO1xuXG4gIGNvbm4ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHRyYWNlKCdSZWNlaXZlZDogJyArIGRhdGEpO1xuICB9KTtcblxuICBjb25uLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBlcnJvcihlcnIubWVzc2FnZSk7XG4gIH0pO1xufSk7XG5cblxuZnVuY3Rpb24gc2VuZChtc2cpIHtcbiAgaWYgKHNldHRpbmdzLkRFQlVHKSB7XG4gICAgY29uc29sZS5sb2coJ1NlbnQ6ICcgKyAodHlwZW9mIG1zZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShtc2cpIDogbXNnKSk7XG4gIH1cbiAgY29ubi5zZW5kKG1zZyk7XG59XG5cblxuLyoqXG4gKiBUcmFkaXRpb25hbCwgTkVTLWluc3BpcmVkIGdhbWVwYWQuXG4gKi9cbnZhciBkcGFkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2RwYWQnKTtcbnZhciBzZWxlY3RCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VsZWN0Jyk7XG52YXIgc3RhcnRCdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc3RhcnQnKTtcbnZhciBiQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2InKTtcbnZhciBhQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2EnKTtcblxuXG4vKipcbiAqIERyYXcgRC1wYWQuXG4gKi9cbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHBhZC1ib2R5Jyk7XG5cbmZ1bmN0aW9uIGFuZ3VsYXJTaGFwZShjYW52YXMsIGNvb3Jkcykge1xuICB2YXIgc2hhcGUgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdmFyIGkgPSAwO1xuICBzaGFwZS5iZWdpblBhdGgoKTtcbiAgc2hhcGUubW92ZVRvKGNvb3Jkc1swXVswXSwgY29vcmRzWzBdWzFdKTtcbiAgY29vcmRzLnNsaWNlKDEpO1xuXG4gIGZvciAoOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgc2hhcGUubGluZVRvKGNvb3Jkc1tpXVswXSwgY29vcmRzW2ldWzFdKTtcbiAgfVxuXG4gIHNoYXBlLmNsb3NlUGF0aCgpO1xuICByZXR1cm4gc2hhcGU7XG59XG5cbmZ1bmN0aW9uIGxpbmVhckZpbGwoc2hhcGUsIGNvbG9yMSwgY29sb3IyLCBjb29yZHMpIHtcbiAgdmFyIGJnID0gc2hhcGUuY3JlYXRlTGluZWFyR3JhZGllbnQoY29vcmRzWzBdLCBjb29yZHNbMV0sIGNvb3Jkc1syXSwgY29vcmRzWzNdKTtcbiAgYmcuYWRkQ29sb3JTdG9wKDAsIGNvbG9yMSk7XG4gIGJnLmFkZENvbG9yU3RvcCgxLCBjb2xvcjIpO1xuICBzaGFwZS5maWxsU3R5bGUgPSBiZztcbiAgc2hhcGUuZmlsbCgpO1xufVxuXG5mdW5jdGlvbiB5U2lkZShjYW52YXMsIHksIHhGcm9tLCB4VG8pIHtcbiAgdmFyIHNoYXBlID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICAgIFt5LCB4RnJvbV0sXG4gICAgW3kgKyA1LCB4RnJvbSArIDMuNV0sXG4gICAgW3kgKyA1LCB4VG8gKyAzLjVdLFxuICAgIFt5LCB4VG9dXG4gIF0pO1xuICBsaW5lYXJGaWxsKHNoYXBlLCAnIzY2NicsICcjMDAwJywgW3ksIHhGcm9tLCB5ICsgMTUsIHhGcm9tXSk7XG59XG5cbmZ1bmN0aW9uIHhTaWRlKGNhbnZhcywgeCwgeUZyb20sIHlUbykge1xuICB2YXIgc2hhcGUgPSBhbmd1bGFyU2hhcGUoY2FudmFzLCBbXG4gICAgW3lGcm9tLCB4XSxcbiAgICBbeUZyb20gKyA1LCB4ICsgMy41XSxcbiAgICBbeVRvICsgNSwgeCArIDMuNV0sXG4gICAgW3lUbywgeF1cbiAgXSk7XG4gIGxpbmVhckZpbGwoc2hhcGUsICcjNjY2JywgJyMwMDAnLCBbeUZyb20sIHgsIHlGcm9tLCB4ICsgMTVdKTtcbn1cblxuLy8gRHJhdyB0aGUgc2lkZXMgZmlyc3QuXG54U2lkZShjYW52YXMsIDYzLjUsIDAsIDEwMCk7XG54U2lkZShjYW52YXMsIDEwMCwgMzYuNSwgNjMuNSk7XG55U2lkZShjYW52YXMsIDYzLjUsIDAsIDM2LjUpO1xueVNpZGUoY2FudmFzLCA2My41LCA2My41LCAxMDApO1xueVNpZGUoY2FudmFzLCAxMDAsIDM2LjUsIDYzLjUpO1xuXG4vLyBEcmF3IHRoZSBELXBhZC5cbnZhciBwbHVzID0gYW5ndWxhclNoYXBlKGNhbnZhcywgW1xuICBbMCwgMzYuNV0sXG4gIFszNi41LCAzNi41XSxcbiAgWzM2LjUsIDBdLFxuICBbNjMuNSwgMF0sXG4gIFs2My41LCAzNi41XSxcbiAgWzEwMCwgMzYuNV0sXG4gIFsxMDAsIDYzLjVdLFxuICBbNjMuNSwgNjMuNV0sXG4gIFs2My41LCAxMDBdLFxuICBbMzYuNSwgMTAwXSxcbiAgWzM2LjUsIDYzXSxcbiAgWzAsIDYzLjVdXG5dKTtcblxucGx1cy5maWxsU3R5bGUgPSAnIzFhMWExYSc7XG5wbHVzLnNoYWRvd0NvbG9yID0gJ3JnYmEoMCwwLDAsLjYpJztcbnBsdXMuc2hhZG93Qmx1ciA9IDE1O1xucGx1cy5zaGFkb3dPZmZzZXRYID0gMjA7XG5wbHVzLnNoYWRvd09mZnNldFkgPSAxMDtcbnBsdXMuZmlsbCgpO1xuXG5cbnZhciBnYW1lcGFkU3RhdGUgPSB7XG4gIHVwOiBmYWxzZSxcbiAgcmlnaHQ6IGZhbHNlLFxuICBkb3duOiBmYWxzZSxcbiAgbGVmdDogZmFsc2UsXG4gIHNlbGVjdDogZmFsc2UsXG4gIHN0YXJ0OiBmYWxzZSxcbiAgYjogZmFsc2UsXG4gIGE6IGZhbHNlXG59O1xuXG5cbmZ1bmN0aW9uIGJpbmRQcmVzcyhidXR0b24sIGV2ZW50TmFtZSwgaXNQcmVzc2VkKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyMnICsgYnV0dG9uKS5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24gKGUpIHtcbiAgICAvLyBIYW5kbGUgRC1wYWQgcHJlc3Nlcy5cbiAgICBpZiAoZS50YXJnZXQgJiYgZS50YXJnZXQucGFyZW50Tm9kZSA9PT0gZHBhZCkge1xuICAgICAgZHBhZC5jbGFzc0xpc3QudG9nZ2xlKHRoaXMuaWQpO1xuICAgIH1cblxuICAgIGdhbWVwYWRTdGF0ZVtidXR0b25dID0gaXNQcmVzc2VkO1xuICAgIHNlbmQoe3R5cGU6ICdzdGF0ZScsIGRhdGE6IGdhbWVwYWRTdGF0ZX0pO1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBiaW5kS2V5UHJlc3NlcyhldmVudE5hbWUsIGlzUHJlc3NlZCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAodXRpbHMuZmllbGRGb2N1c2VkKGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoIChlLmtleUNvZGUpIHtcbiAgICAgIGNhc2UgMzg6XG4gICAgICAgIC8vIFNlbmQgZXZlbnQgb25seSBvbmNlLlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS51cCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUudXAgPSBpc1ByZXNzZWQ7XG4gICAgICAgIGRwYWQuY2xhc3NOYW1lID0gaXNQcmVzc2VkID8gJ3VwJyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzk6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnJpZ2h0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5yaWdodCA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAncmlnaHQnIDogJyc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA0MDpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuZG93bikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuZG93biA9IGlzUHJlc3NlZDtcbiAgICAgICAgZHBhZC5jbGFzc05hbWUgPSBpc1ByZXNzZWQgPyAnZG93bicgOiAnJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM3OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5sZWZ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5sZWZ0ID0gaXNQcmVzc2VkO1xuICAgICAgICBkcGFkLmNsYXNzTmFtZSA9IGlzUHJlc3NlZCA/ICdsZWZ0JyA6ICcnO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTM6XG4gICAgICAgIGlmIChpc1ByZXNzZWQgJiYgZ2FtZXBhZFN0YXRlLnN0YXJ0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5zdGFydCA9IGlzUHJlc3NlZDtcbiAgICAgICAgc3RhcnRCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDY1OlxuICAgICAgICBpZiAoaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5hKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGdhbWVwYWRTdGF0ZS5hID0gaXNQcmVzc2VkO1xuICAgICAgICBhQnV0dG9uLmRhdGFzZXQucHJlc3NlZCA9ICtpc1ByZXNzZWQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2NjpcbiAgICAgICAgaWYgKGlzUHJlc3NlZCAmJiBnYW1lcGFkU3RhdGUuYikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBnYW1lcGFkU3RhdGUuYiA9IGlzUHJlc3NlZDtcbiAgICAgICAgYkJ1dHRvbi5kYXRhc2V0LnByZXNzZWQgPSAraXNQcmVzc2VkO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChlLnNoaWZ0S2V5IHx8ICghaXNQcmVzc2VkICYmIGdhbWVwYWRTdGF0ZS5zZWxlY3QpKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIFNoaWZ0IGtleSB3YXMgcHJlc3NlZCBvciB1bnByZXNzZWQsIHRvZ2dsZSBpdHMgc3RhdGUuXG4gICAgICAgICAgZ2FtZXBhZFN0YXRlLnNlbGVjdCA9IGlzUHJlc3NlZDtcbiAgICAgICAgICBzZWxlY3RCdXR0b24uZGF0YXNldC5wcmVzc2VkID0gK2lzUHJlc3NlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgKGkuZS4sIGFueSBvdGhlciBrZXkgd2FzIHByZXNzZWQpLCBiYWlsLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNlbmQoZ2FtZXBhZFN0YXRlKTtcbiAgfSk7XG59XG5cblxuT2JqZWN0LmtleXMoZ2FtZXBhZFN0YXRlKS5mb3JFYWNoKGZ1bmN0aW9uIChidXR0b24pIHtcbiAgaWYgKHV0aWxzLmhhc1RvdWNoRXZlbnRzKCkpIHtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAndG91Y2hzdGFydCcsIHRydWUpO1xuICAgIGJpbmRQcmVzcyhidXR0b24sICd0b3VjaGVuZCcsIGZhbHNlKTtcbiAgfSBlbHNlIHtcbiAgICBiaW5kUHJlc3MoYnV0dG9uLCAnbW91c2Vkb3duJywgdHJ1ZSk7XG4gICAgYmluZFByZXNzKGJ1dHRvbiwgJ21vdXNldXAnLCBmYWxzZSk7XG4gIH1cbn0pO1xuXG5cbmJpbmRLZXlQcmVzc2VzKCdrZXlkb3duJywgdHJ1ZSk7XG5iaW5kS2V5UHJlc3Nlcygna2V5dXAnLCBmYWxzZSk7XG4iLCJmdW5jdGlvbiB0cmFjZSh0ZXh0LCBsZXZlbCkge1xuICBjb25zb2xlW2xldmVsIHx8ICdsb2cnXSgod2luZG93LnBlcmZvcm1hbmNlLm5vdygpIC8gMTAwMCkudG9GaXhlZCgzKSArICc6ICcgKyB0ZXh0KTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvcih0ZXh0KSB7XG4gIHJldHVybiB0cmFjZSh0ZXh0LCAnZXJyb3InKTtcbn1cblxuXG5mdW5jdGlvbiB3YXJuKHRleHQpIHtcbiAgcmV0dXJuIHRyYWNlKHRleHQsICd3YXJuJyk7XG59XG5cblxuZnVuY3Rpb24gcG9seWZpbGwod2luKSB7XG4gIGlmICghKCdwZXJmb3JtYW5jZScgaW4gd2luKSkge1xuICAgIHdpbi5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIG5vdzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gK25ldyBEYXRlKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICgoJ29yaWdpbicgaW4gd2luLmxvY2F0aW9uKSkge1xuICAgIHdpbi5sb2NhdGlvbi5vcmlnaW4gPSB3aW4ubG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgd2luLmxvY2F0aW9uLmhvc3Q7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRQZWVySWQoKSB7XG4gIHJldHVybiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluZGV4T2YoJy5odG1sJykgP1xuICAgIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnN1YnN0cigxKSk7XG59XG5cblxudmFyIEZJRUxEX0ZPQ1VTRURfVEFHUyA9IFtcbiAgJ2lucHV0JyxcbiAgJ2tleWdlbicsXG4gICdtZXRlcicsXG4gICdvcHRpb24nLFxuICAnb3V0cHV0JyxcbiAgJ3Byb2dyZXNzJyxcbiAgJ3NlbGVjdCcsXG4gICd0ZXh0YXJlYSdcbl07XG5mdW5jdGlvbiBmaWVsZEZvY3VzZWQoZSkge1xuICByZXR1cm4gRklFTERfRk9DVVNFRF9UQUdTLmluZGV4T2YoZS50YXJnZXQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xO1xufVxuXG5cbmZ1bmN0aW9uIGhhc1RvdWNoRXZlbnRzKCkge1xuICByZXR1cm4gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyB8fFxuICAgIHdpbmRvdy5Eb2N1bWVudFRvdWNoICYmIGRvY3VtZW50IGluc3RhbmNlb2YgRG9jdW1lbnRUb3VjaCk7XG59XG5cbmZ1bmN0aW9uIGluamVjdENTUyhvcHRzKSB7XG4gIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuICBsaW5rLmhyZWYgPSBvcHRzLmhyZWY7XG4gIGxpbmsubWVkaWEgPSAnYWxsJztcbiAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG4gIGxpbmsudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gIE9iamVjdC5rZXlzKG9wdHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICBsaW5rW3Byb3BdID0gb3B0c1twcm9wXTtcbiAgfSk7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hlYWQnKS5hcHBlbmRDaGlsZChsaW5rKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlKHRleHQpIHtcbiAgaWYgKCF0ZXh0KSB7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyYjMzQ7Jyk7XG59XG5cbmZ1bmN0aW9uIGlzRnVsbFNjcmVlbigpIHtcbiAgcmV0dXJuICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQgJiYgIC8vIHN0YW5kYXJkIG1ldGhvZFxuICAgICFkb2N1bWVudC5tb3pGdWxsU2NyZWVuRWxlbWVudCAmJlxuICAgICFkb2N1bWVudC53ZWJraXRGdWxsc2NyZWVuRWxlbWVudCAmJlxuICAgICFkb2N1bWVudC5tc0Z1bGxzY3JlZW5FbGVtZW50KTsgIC8vIHZlbmRvci1wcmVmaXhlZCBtZXRob2RzXG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUZ1bGxTY3JlZW4oKSB7XG4gIGlmIChpc0Z1bGxTY3JlZW4oKSkge1xuICAgIHRyYWNlKCdFbnRlcmluZyBmdWxsIHNjcmVlbicpO1xuICAgIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZXF1ZXN0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQubW96UmVxdWVzdEZ1bGxTY3JlZW4oKTtcbiAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKEVsZW1lbnQuQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRyYWNlKCdFeGl0aW5nIGZ1bGwgc2NyZWVuJyk7XG4gICAgaWYgKGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbikge1xuICAgICAgZG9jdW1lbnQubW96Q2FuY2VsRnVsbFNjcmVlbigpO1xuICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcbiAgICAgIGRvY3VtZW50LndlYmtpdEV4aXRGdWxsc2NyZWVuKCk7XG4gICAgfSBlbHNlIGlmIChkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKSB7XG4gICAgICBkb2N1bWVudC5tc0V4aXRGdWxsc2NyZWVuKCk7XG4gICAgfVxuICB9XG59XG5cblxuZnVuY3Rpb24gbG9ja09yaWVudGF0aW9uKCkge1xuICB2YXIgbG8gPSAoc2NyZWVuLkxvY2tPcmllbnRhdGlvbiB8fFxuICAgIHNjcmVlbi5tb3pMb2NrT3JpZW50YXRpb24gfHxcbiAgICBzY3JlZW4ud2Via2l0TG9ja09yaWVudGF0aW9uIHx8XG4gICAgc2NyZWVuLm1zTG9ja09yaWVudGF0aW9uKTtcbiAgaWYgKCFsbykge1xuICAgIHJldHVybiB3YXJuKCdPcmllbnRhdGlvbiBjb3VsZCBub3QgYmUgbG9ja2VkJyk7XG4gIH1cblxuICBsbyhvcmllbnRhdGlvbik7XG59XG5cblxuZnVuY3Rpb24gdHJpZ2dlckV2ZW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0hUTUxFdmVudHMnKTtcbiAgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIHRydWUsIHRydWUpO1xuICBldmVudC5ldmVudE5hbWUgPSB0eXBlO1xuICAoZG9jdW1lbnQuYm9keSB8fCB3aW5kb3cpLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzLnRyYWNlID0gdHJhY2U7XG5tb2R1bGUuZXhwb3J0cy5lcnJvciA9IGVycm9yO1xubW9kdWxlLmV4cG9ydHMud2FybiA9IHdhcm47XG5tb2R1bGUuZXhwb3J0cy5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xubW9kdWxlLmV4cG9ydHMuZ2V0UGVlcklkID0gZ2V0UGVlcklkO1xubW9kdWxlLmV4cG9ydHMuZmllbGRGb2N1c2VkID0gZmllbGRGb2N1c2VkO1xubW9kdWxlLmV4cG9ydHMuaGFzVG91Y2hFdmVudHMgPSBoYXNUb3VjaEV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluamVjdENTUyA9IGluamVjdENTUztcbm1vZHVsZS5leHBvcnRzLmVzY2FwZSA9IGVzY2FwZTtcbm1vZHVsZS5leHBvcnRzLmlzRnVsbFNjcmVlbiA9IGlzRnVsbFNjcmVlbjtcbm1vZHVsZS5leHBvcnRzLnRvZ2dsZUZ1bGxTY3JlZW4gPSB0b2dnbGVGdWxsU2NyZWVuO1xubW9kdWxlLmV4cG9ydHMubG9ja09yaWVudGF0aW9uID0gbG9ja09yaWVudGF0aW9uO1xubW9kdWxlLmV4cG9ydHMudHJpZ2dlckV2ZW50ID0gdHJpZ2dlckV2ZW50O1xuIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgREVCVUc6IGZhbHNlLFxuICBQRUVSSlNfS0VZOiAnJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIERFQlVHOiB0cnVlLFxuICBQRUVSSlNfS0VZOiAncm92dTV4bXFvNjl3d21pJ1xufTtcbiJdfQ==
