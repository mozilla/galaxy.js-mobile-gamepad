(function (window, document) {
'use strict';

var Plink = require('plink');
// var Promise = require('./external/promise-1.0.0');  // jshint ignore:line

var settings = require('./settings');
var utils = require('./lib/utils')(window, document);
var error = utils.error;
var trace = utils.trace;
var warn = utils.warn;


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
      delete localStorage.disableAutoFullScreen;
      return utils.toggleFullScreen();
    case 78:  // Pressing NF (really just N) should toggle full-screen mode.
      trace('User pressed "NF"; exiting fullscreen and will not ' +
        'automatically open next time');
      localStorage.disableAutoFullScreen = '1';
      return utils.toggleFullScreen();
  }
});


document.addEventListener('click', function (e) {
  // Bail if input is focussed, if we have autofocus disabled, or
  // if we're already fullscreen.
  if (utils.fieldFocused(e) || !wantsAutoFullScreen() ||
      utils.isFullScreen()) {
    return;
  }
  trace('Automatically entering fullscreen');
  utils.toggleFullScreen();
});


// TODO: if there's not a pin, tell the user to open the game on another device
// first. instead of relegating mobile to be always a controller, allow the
// game to mirror the desktop (à la WiiU).


// Create a root `plink` instance.
function connect() {
  return new Promise(function (resolve, reject) {
    // Get the key (from the path or query string).
    var peerKey = utils.getPeerKey();
    trace('Peer key: ' + peerKey);

    // 1. Create a root `plink` instance.
    var plink = Plink.create();  // Returns a new `Plink` instance.

    trace('Attempting to connect to host');

    // 2. Connect to signalling server (`plink-server`).
    var link = plink.connect(settings.WS_URL);

    // This opens a connection via `P` to the signalling server
    // (`plink-server`), which locally creates a `WebSocketConnection`,
    // adds itself as a peer, and adds an event listener for `close`.
    //
    // It then passes that connection to a new `PlinkServer` instance, and
    // that's what `link` is. `PlinkServer`, behind the scenes, sets event
    // listeners for `message` and `open`.

    // 3. Send this message containing our peer key *to* the signalling server:
    //
    //    {
    //       "type": "use key",
    //       "key": "1234"
    //    }
    //
    // Or "set key" if we are online but the host is not.
    link.on('open', function () {
      trace('Connected to signalling server');

      link.useKey(peerKey).then(function () {
        trace('Sent message to signalling server: ' +
          JSON.stringify({type: 'use key', key: peerKey}));
      }).catch(function (err) {
        warn('Host is offline; "use key" message rejected by signalling ' +
          'server: ' + err);

        link.setKey(peerKey).then(function () {
          trace('Sent message to signalling server: ' +
            JSON.stringify({type: 'set key', key: peerKey}));
        }).catch(function (err) {
          error('Failed to send "set key" mesage to signalling server: ' +
            err);
        });
      });
    });

    // 4. `link` emits this `message` *from* signalling server containing a
    // unique identifier (specifically, a UUID) for this peer:
    //
    //    {
    //       "type": "address",
    //       "key": "1234",
    //       "address": "8b14862d-9894-2131-433a-ae2cbef85698"
    //    }
    //

    // 5. WebRTC takes over and we do the offer/answer dance. And that's
    // where `RTCPeerConnection` data channels come from.

    // 6. `RTCPeerConnection` emits `open` event when the peer has connected.

    // Event listeners for the signalling server.
    link.on('connection', function (peer) {
      trace('[' + peer.address + '] Found peer via signalling server');

      // Event listeners for `RTCPeerConnection`.
      peer.on('open', function () {
        trace('[' + peer.address + '] Opened peer connection to game');
        resolve(peer);
      }).on('message', function (msg) {
        if (msg.type === 'bye') {
          warn('[' + peer.address + '] Lost peer connection to game');
          return;
        }

        trace('[' + peer.address + '] Received peer message: ' +
          (typeof msg === 'object' ? JSON.stringify(msg) : msg));
      }).on('error', function (err) {
        error('[' + peer.address + '] Peer error: ' +
          (typeof err === 'object' ? JSON.stringify(err) : err));
        reject(err);
      }).on('close', function () {
        // Peer connection lost to host. (Unfortunately, a few browser bugs
        // prevent this from firing; see below.)
        trace('[' + peer.address + '] Peer closed');
      });

    }).on('message', function (msg) {
      trace('Received message from signalling server: ' +
        JSON.stringify(msg));
    }).on('error', function (err) {
      error('Could not connect to signalling server' +
        settings.DEBUG ? (': ' + JSON.stringify(err)) : '');
      reject(err);
    }).on('close', function () {
      // TODO: Reconnect to signalling server (#60).
      warn('Connection to signalling server lost');  // Not peer connection
    });

    // Workaround because `RTCPeerConnection.onclose` ain't work in browsers:
    // * https://code.google.com/p/webrtc/issues/detail?id=1676
    // * https://bugzilla.mozilla.org/show_bug.cgi?id=881337
    // * https://bugzilla.mozilla.org/show_bug.cgi?id=1009124
    window.addEventListener('beforeunload', function () {
      send({type: 'bye'});
    });
  });
}

connect().then(function (peer) {
  trace('[' + peer.address + '] Paired to game');

  // Swap out the `send` function with one that does actual sending.
  send = function send(msg) {
    trace('[' + peer.address + '] Sent peer message: ' +
      (typeof msg === 'object' ? JSON.stringify(msg) : msg));
    peer.send(msg);
  };

  // Send any queued messages.
  while (queue.length) {
    send(queue.pop());
  }

  // TODO: Queue messages again if we later lose connection to host (#65).
}).catch(function (err) {
  console.trace(err.stack ? err.stack : err);
});

var queue = [];  // A queue for messages to send once we connect to host.

function send(msg) {
  // Turn a single message into an array of messages.
  if (!Array.isArray(msg)) {
    msg = [msg];
  }

  // Queueing messages if we are not yet connected to host.
  msg.forEach(function (msg) {
    trace('Queued message: ' +
      (typeof msg === 'object' ? JSON.stringify(msg) : msg));
    // Prepend each message so we can treat the array like a queue.
    queue.unshift(msg);
  });
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

    send({type: 'state', data: gamepadState});
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
