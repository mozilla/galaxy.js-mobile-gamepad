(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    var plink = Plink.create();

    // Get the key (from the path or query string).
    var peerKey = utils.getPeerKey();
    trace('Peer key: ' + peerKey);

    trace('Attempting to connect to host');

    // Connect to `plink-server` and await connection using the peer ID.
    var link = plink.connect(settings.WS_URL);

    // Set a key. Other peers can use to connect to this browser using this
    // key via the connected `plink-server`.
    // (This returns a Promise on whether the operation succeeded.)
    link.useKey(peerKey);

    link.on('connection', function (peer) {
      trace('[' + peer.address + '] Connected');

      peer.on('message', function (msg) {
        trace('[' + peer.address + '] Received message: ' +
          (typeof msg === 'object' ? JSON.stringify(msg) : msg));
      });

      peer.on('open', function () {
        trace('[' + peer.address + '] Opened');
        resolve(peer);
      });

      peer.on('close', function () {
        // Connection lost with host.
        // TODO: Reconnect to host (#61).
        trace('[' + peer.address + '] Closed');
      });

      peer.on('error', function (err) {
        error('[' + peer.address + '] Error: ' +
          (typeof err === 'object' ? JSON.stringify(err) : err));
        reject(err);
      });

    }).on('close', function () {
      // TODO: Reconnect to signalling server (#60).
      warn('Connection lost with signalling server');
    }).on('error', function (err) {
      error('Could not connect to `plink-server`: ' +
        JSON.stringify(err));
      reject(err);
    });
  });
}

connect().then(function (peer) {
  // Swap out the `send` function with one that does actual sending.
  send = function send(msg) {
    trace('[' + peer.address + '] Sent message: ' +
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

},{"./lib/utils":17,"./settings":18,"plink":13}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = require('./lib/P.js');
},{"./lib/P.js":8}],5:[function(require,module,exports){
var JSONProtocol = require('./JSONProtocol.js'),
	its = require('its'),
	Emitter = require('events').EventEmitter;
	
function notImplemented(){
	throw new Error('This method is not implemented');
}

function Connection(address, peers, options){
	its.string(address);
	its.defined(peers);

	this.address = address;
	this.peers = peers;

	if(options){
		if(options.emitter) this.emitter = options.emitter;
		if(options.firewall) this.acceptRTCConnection = options.firewall;
	}

	if(!this.emitter) this.emitter = new Connection.Emitter();
}

// Circular dependency solved in WebRTCConnection.js
Connection.createWebRTCConnection = null;
Connection.Emitter = Emitter;

Connection.prototype = Object.create(JSONProtocol.prototype);

Connection.prototype.on = function(){
	this.emitter.on.apply(this.emitter, arguments);
	return this;
};

Connection.prototype.removeListener = function(){
	this.emitter.removeListener.apply(this.emitter, arguments);
	return this;
};

Connection.prototype.send = JSONProtocol.prototype.writeMessage;

Connection.prototype.getPeer = function(address){
	return this.peers.get(address);
};

Connection.prototype.addPeer = function(peer){
	return this.peers.add(peer);
};

Connection.prototype.getPeers = function() {
	return this.peers.get();
};

function isString(candidate){
	return Object.prototype.toString.call(candidate) === '[object String]';
}

Connection.prototype.connect = function(config){
	if(isString(config)){
		config = {address: config};
	}

	var self = this,
		firewall = config.firewall || this.firewall,
		peer = Connection.createWebRTCConnection(config, this.peers, this, {firewall: firewall});
	
	peer.writeOffer(config);
	
	this.peers.add(peer);

	peer.on('close', function(){
		self.peers.remove(peer);
		self.emitter.emit('disconnection', peer);
	});

	this.emitter.emit('connection', peer);

	return peer;
};

Connection.prototype.readMessage = function(message){
	this.emitter.emit('message', message);
};

Connection.prototype.readArrayBuffer = function(message){
	this.emitter.emit('arraybuffer', message);
};

Connection.prototype.acceptRTCConnection = function(description, data){
	return true;
};

Connection.prototype.readRelay = function(peerAddress, message){
	var peer = this.getPeer(peerAddress);

	if(!peer){
		this.emitter.emit('error', new Error("Unknown peer at address: " + peerAddress));
		return;
	}
	
	peer.writeRelayedMessage(this.address, message);
};

Connection.prototype.readRelayedIceCandidate = function(peerAddress, candidate){
	var peer = this.getPeer(peerAddress);

	if(!peer){
		this.emitter.emit('error', new Error("Unknown peer at address: " + peerAddress));
		return;
	}

	peer.readIceCandidate(candidate);
};

Connection.prototype.readRelayedOffer = function(peerAddress, description, data){
	if(!this.acceptRTCConnection(description, data)) return false;

	var self = this,
		peer = Connection.createWebRTCConnection({address:peerAddress}, this.peers, this, {firewall: this.firewall});
	
	this.addPeer(peer);

	peer.on('close', function(){
		self.peers.remove(peer);
		self.emitter.emit('disconnection', peer);
	});

	peer.readOffer(description);
	peer.writeAnswer();

	this.emitter.emit('connection', peer);
};

Connection.prototype.readRelayedAnswer = function(peerAddress, description){
	var peer = this.getPeer(peerAddress);

	if(!peer){
		this.emitter.emit('error', new Error("Unknown peer at address: " + peerAddress));
		return;
	}

	peer.readAnswer(description);
};

Connection.prototype.close = notImplemented; // implemented higher up
Connection.prototype.getReadyState = notImplemented; // implemented higher up

Connection.prototype.isOpen = function(){
	return this.getReadyState() === 'open';
};

module.exports = Connection;

},{"./JSONProtocol.js":7,"events":2,"its":11}],6:[function(require,module,exports){
var its = require('its');

function noop(){}

function ConnectionManager(){
	this.connectionMap = {};
	this.connectionList = [];
}

ConnectionManager.prototype.get = function(address){
	if(address === undefined) return this.connectionList.slice();

	return this.connectionMap[address];
};

ConnectionManager.prototype.add = function(connection) {
	its.defined(connection);

	var address = connection.address;
	its.string(address);

	if(address in this.connectionMap) return false;
	
	this.connectionMap[address] = connection;
	this.connectionList.push(connection);

	this.onAdd(connection);
	return true;
};
ConnectionManager.prototype.onAdd = noop;

ConnectionManager.prototype.remove = function(connection){
	its.defined(connection);

	var address = connection.address;
	its.string(address);

	var mappedConnection = this.connectionMap[address];
	if(!mappedConnection || mappedConnection !== connection) return false;

	delete this.connectionMap[address];
	
	var index = this.connectionList.indexOf(connection);
	this.connectionList.splice(index, 1);

	this.onRemove(connection);
	return true;
};
ConnectionManager.prototype.onRemove = noop;

module.exports = ConnectionManager;
},{"its":11}],7:[function(require,module,exports){
function notImplemented(){
	throw new Error('This method is not implemented');
}

function JSONProtocol(){}

JSONProtocol.prototype.PROTOCOL_NAME = 'p';

JSONProtocol.prototype.MESSAGE_TYPE = {
	DIRECT: 0, // [0, message]

	RTC_OFFER: 3, // [3, description, data]
	RTC_ANSWER: 4, // [4, description]
	RTC_ICE_CANDIDATE: 5, // [5, candidate]

	RELAY: 6, // [6, address, message]
	RELAYED: 7 // [7, address, message]
};

JSONProtocol.prototype.readRaw = function(message){
	if(message instanceof ArrayBuffer){
		this.readArrayBuffer(message);
	} else {
		this.readProtocolMessage(JSON.parse(message));
	}	
};

JSONProtocol.prototype.readProtocolMessage = function(message){
	var MESSAGE_TYPE = this.MESSAGE_TYPE,
		messageType = message[0];
	
	switch(messageType){
		// This is a message from the remote node to this one.
		case MESSAGE_TYPE.DIRECT:
			this.readMessage(message[1]);
			break;

		// The message was relayed by the peer on behalf of
		// a third party peer, identified by "thirdPartyPeerId".
		// This means that the peer is acting as a signalling
		// channel on behalf of the third party peer.
		case MESSAGE_TYPE.RELAYED:
			this.readRelayedMessage(message[1], message[2]);
			break;

		// The message is intended for another peer, identified
		// by "peerId", which is also connected to this node.
		// This means that the peer is using this connection
		// as a signalling channel in order to establish a connection
		// to the other peer identified "peerId".
		case MESSAGE_TYPE.RELAY:
			this.readRelay(message[1], message[2]);
			break;

		default:
			throw new Error('Unknown message type: ' + messageType);
	}
};

JSONProtocol.prototype.readRelayedMessage = function(origin, message){
	var MESSAGE_TYPE = this.MESSAGE_TYPE,
		messageType = message[0];

	switch(messageType){
		// An initial connection request from a third party peer
		case MESSAGE_TYPE.RTC_OFFER:
			this.readRelayedOffer(origin, message[1], message[2]);
			break;
		
		// An answer to an RTC offer sent from this node
		case MESSAGE_TYPE.RTC_ANSWER:
			this.readRelayedAnswer(origin, message[1]);
			break;
		
		// An ICE candidate from the source node
		case MESSAGE_TYPE.RTC_ICE_CANDIDATE:
			this.readRelayedIceCandidate(origin, message[1]);
			break;

		default:
			throw new Error('Unknown message type: ' + messageType);
	}		
};

JSONProtocol.prototype.readMessage = notImplemented;
JSONProtocol.prototype.readArrayBuffer = notImplemented;
JSONProtocol.prototype.readRelay = notImplemented;

JSONProtocol.prototype.readRelayedOffer = notImplemented;
JSONProtocol.prototype.readRelayedAnswer = notImplemented;
JSONProtocol.prototype.readRelayedIceCandidate = notImplemented;

JSONProtocol.prototype.writeRaw = notImplemented;

JSONProtocol.prototype.writeProtocolMessage = function(message){
	var serializedMessage = JSON.stringify(message);
	this.writeRaw(serializedMessage);
};

JSONProtocol.prototype.writeMessage = function(message){
	if(message instanceof ArrayBuffer){
		this.writeRaw(message);
	} else {
		this.writeStringMessage(message);
	}
};

JSONProtocol.prototype.writeStringMessage = function(message){
	this.writeProtocolMessage([
		this.MESSAGE_TYPE.DIRECT,
		message
	]);
};

JSONProtocol.prototype.writeRelayedMessage = function(origin, message){
	this.writeProtocolMessage([
		this.MESSAGE_TYPE.RELAYED,
		origin,
		message
	]);
};

JSONProtocol.prototype.writeRelayMessage = function(destination, message){
	this.writeProtocolMessage([
		this.MESSAGE_TYPE.RELAY,
		destination,
		message
	]);
};

JSONProtocol.prototype.writeRelayAnswer = function(destination, description){
	this.writeRelayMessage(destination, [
		this.MESSAGE_TYPE.RTC_ANSWER,
		description
	]);
};

JSONProtocol.prototype.writeRelayIceCandidate = function(destination, candidate){
	this.writeRelayMessage(destination, [
		this.MESSAGE_TYPE.RTC_ICE_CANDIDATE,
		candidate
	]);
};

JSONProtocol.prototype.writeRelayOffer = function(destination, description, data){
	this.writeRelayMessage(destination, [
		this.MESSAGE_TYPE.RTC_OFFER,
		description,
		data
	]);
};

module.exports = JSONProtocol;
},{}],8:[function(require,module,exports){
var Emitter = require('events').EventEmitter,
	ConnectionManager = require('./ConnectionManager.js'),
	WebSocketConnection = require('./WebSocketConnection.js'),
	WebRTCConnection = require('./WebRTCConnection.js'),
	its = require('its');

function P(emitter, connectionManager, options){
	its.defined(emitter);
	its.defined(connectionManager);

	this.emitter = emitter;
	this.peers = connectionManager;

	this.peers.onAdd = function(peer){
		emitter.emit('connection', peer);
	};

	this.peers.onRemove = function(peer){
		emitter.emit('disconnection', peer);
	};

	if(options && options.firewall) this.firewall = options.firewall;
}

P.create = function(options){
	var emitter = new Emitter(),
		connectionManager = new ConnectionManager();

	return new P(emitter, connectionManager, options);
};

P.prototype.getPeers = function(){
	return this.peers.get();
};

P.prototype.connect = function(address){
	its.string(address);

	var peers = this.peers,
		peer = WebSocketConnection.create(address, this.peers, {firewall: this.firewall});

	peers.add(peer);

	peer.on('close', function(){
		peers.remove(peer);
	});

	return peer;
};

P.prototype.on = function(){
	this.emitter.on.apply(this.emitter, arguments);
	return this;
};

P.prototype.removeListener = function(){
	this.emitter.removeListener.apply(this.emitter, arguments);
	return this;
};

module.exports = P;
},{"./ConnectionManager.js":6,"./WebRTCConnection.js":9,"./WebSocketConnection.js":10,"events":2,"its":11}],9:[function(require,module,exports){
var Connection = require('./Connection.js'),
	its = require('its');

var nativeRTCPeerConnection = (typeof RTCPeerConnection !== 'undefined')? RTCPeerConnection :
							  (typeof webkitRTCPeerConnection !== 'undefined')? webkitRTCPeerConnection :
							  (typeof mozRTCPeerConnection !== 'undefined')? mozRTCPeerConnection :
							  undefined;

var nativeRTCSessionDescription = (typeof RTCSessionDescription !== 'undefined')? RTCSessionDescription :
								  (typeof mozRTCSessionDescription !== 'undefined')? mozRTCSessionDescription :
								  undefined;
var nativeRTCIceCandidate = (typeof RTCIceCandidate !== 'undefined')? RTCIceCandidate :
							(typeof mozRTCIceCandidate !== 'undefined')? mozRTCIceCandidate :
							undefined;

function WebRTCConnection(address, peers, rtcConnection, signalingChannel, options){
	var self = this;

	its.string(address);
	its.defined(peers);
	its.defined(rtcConnection);
	its.defined(signalingChannel);

	Connection.call(this, address, peers, options);

	this.signalingChannel = signalingChannel;
	this.rtcConnection = rtcConnection;
	this.rtcDataChannel = rtcConnection.createDataChannel(this.PROTOCOL_NAME, {reliable: false});

	this.close = rtcConnection.close.bind(rtcConnection);

	this.rtcConnection.addEventListener('icecandidate', function(event){
		if(!event.candidate) return;

		self.signalingChannel.writeRelayIceCandidate(address, event.candidate);
	});

	this.rtcDataChannel.addEventListener('message', function(message){
		self.readRaw(message.data);
	});

	this.rtcDataChannel.addEventListener('open', function(event){
		self.emitter.emit('open', event);
	});

	this.rtcDataChannel.addEventListener('error', function(event){
		self.emitter.emit('error', event);
	});

	this.rtcDataChannel.addEventListener('close', function(event){
		self.emitter.emit('close', event);
	});
}

var DEFAULT_RTC_CONFIGURATION = null;
var DEFAULT_MEDIA_CONSTRAINTS = {
	optional: [{RtpDataChannels: true}],
    mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
    }
};

WebRTCConnection.create = function(config, peers, signalingChannel, options){
	var rtcConfiguration = config.rtcConfiguration || DEFAULT_RTC_CONFIGURATION,
		mediaConstraints = config.mediaConstraints || DEFAULT_MEDIA_CONSTRAINTS,
		rtcConnection = new nativeRTCPeerConnection(rtcConfiguration, mediaConstraints);

	return new WebRTCConnection(config.address, peers, rtcConnection, signalingChannel, options);
};

WebRTCConnection.prototype = Object.create(Connection.prototype);

WebRTCConnection.prototype.writeRaw = function(message){
	switch(this.rtcDataChannel.readyState){
		case 'connecting':
			throw new Error('Can\'t send a message while RTCDataChannel connecting');
		case 'open':
			this.rtcDataChannel.send(message);
			break;
		case 'closing':
		case 'closed':
			throw new Error('Can\'t send a message while RTCDataChannel is closing or closed');
	}
};

WebRTCConnection.prototype.readAnswer = function(description){
	var rtcSessionDescription = new nativeRTCSessionDescription(description);
	
	this.rtcConnection.setRemoteDescription(rtcSessionDescription);
};

WebRTCConnection.prototype.readOffer = function(description){
	var rtcSessionDescription = new nativeRTCSessionDescription(description);
	
	this.rtcConnection.setRemoteDescription(rtcSessionDescription);
};

WebRTCConnection.prototype.readIceCandidate = function(candidate){
	var emitter = this.emitter;
	this.rtcConnection.addIceCandidate(new nativeRTCIceCandidate(candidate));
};

WebRTCConnection.prototype.writeAnswer = function(){
	var emitter = this.emitter,
		address = this.address,
		rtcConnection = this.rtcConnection,
		signalingChannel = this.signalingChannel;

	function onError(err){ emitter.emit('error', err); }

	rtcConnection.createAnswer(function(description){
		rtcConnection.setLocalDescription(description, function(){
			signalingChannel.writeRelayAnswer(address, description);
		}, onError);
	}, onError);
};

WebRTCConnection.prototype.writeOffer = function(config){
	var emitter = this.emitter,
		address = this.address,
		rtcConnection = this.rtcConnection,
		signalingChannel = this.signalingChannel;

	function onError(err){ emitter.emit('error', err); }

	rtcConnection.createOffer(function(description){
		rtcConnection.setLocalDescription(description, function(){
			signalingChannel.writeRelayOffer(address, description, config.offerData);
		}, onError);
	}, onError, config.mediaConstraints || DEFAULT_MEDIA_CONSTRAINTS);
};

WebRTCConnection.prototype.getReadyState = function(){
	return this.rtcDataChannel.readyState;
};


// Solves the circular dependency with Connection.js
Connection.createWebRTCConnection = WebRTCConnection.create;

module.exports = WebRTCConnection;
},{"./Connection.js":5,"its":11}],10:[function(require,module,exports){
var Connection = require('./Connection.js');

function WebSocketConnection(address, peers, webSocket, options){
	var self = this;

	Connection.call(this, address, peers, options);

	this.webSocket = webSocket;
	
	this.close = webSocket.close.bind(webSocket);

	this.webSocket.addEventListener('message', function(message){
		self.readRaw(message.data);
	});

	this.webSocket.addEventListener('open', function(event){
		self.emitter.emit('open', event);
	});

	this.webSocket.addEventListener('error', function(event){
		self.emitter.emit('error', event);
	});

	this.webSocket.addEventListener('close', function(event){
		self.emitter.emit('close', event);
	});
}

WebSocketConnection.create = function(address, peers, options){
	var webSocket = new WebSocket(address, WebSocketConnection.prototype.PROTOCOL_NAME);
	return new WebSocketConnection(address, peers, webSocket, options);
};

WebSocketConnection.prototype = Object.create(Connection.prototype);
WebSocketConnection.prototype.writeRaw = function(message){
	switch(this.webSocket.readyState){
		case WebSocket.CONNECTING:
			throw new Error("Can't send a message while WebSocket connecting");

		case WebSocket.OPEN:
			this.webSocket.send(message);
			break;

		case WebSocket.CLOSING:
		case WebSocket.CLOSED:
			throw new Error("Can't send a message while WebSocket is closing or closed");
	}
};

WebSocketConnection.prototype.getReadyState = function(){
	switch(this.webSocket.readyState){
		case WebSocket.CONNECTING:
			return 'connecting';
		case WebSocket.OPEN:
			return 'open';
		case WebSocket.CLOSING:
			return 'closing';
		case WebSocket.CLOSED:
			return 'closed';
	}
};

module.exports = WebSocketConnection;
},{"./Connection.js":5}],11:[function(require,module,exports){
module.exports = require('./lib/its.js');
},{"./lib/its.js":12}],12:[function(require,module,exports){
// Helpers
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

var templateRegEx = /%s/; // The template placeholder, used to split message templates

/** A basic templating function. 
	
	Takes a string with 0 or more '%s' placeholders and an array to populate it with.

	@param {String} messageTemplate A string which may or may not have 0 or more '%s' to denote argument placement
	@param {Array} [messageArguments] Items to populate the template with

	@example
		templatedMessage("Hello"); // returns "Hello"
		templatedMessage("Hello, %s", ["world"]); // returns "Hello, world"
		templatedMessage("Hello, %s. It's %s degrees outside.", ["world", 72]); // returns "Hello, world. It's 72 degrees outside"

	@returns {String} The resolved message
*/
var templatedMessage = function(messageTemplate, messageArguments){
	var result = [],
		messageArray = messageTemplate.split(templateRegEx),
		index = 0,
		length = messageArray.length;

	for(; index < length; index++){
		result.push(messageArray[index]);
		result.push(messageArguments[index]);
	}

	return result.join('');
};


/** Generic check function which throws an error if a given expression is false
*
*	The params list is a bit confusing, check the examples to see the available ways of calling this function
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String|Object} [messageOrErrorType] A message or an ErrorType object to throw if expression is false
*   @param {String|Object} [messageOrMessageArgs] A message, message template, or a message argument
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {Error}
*
*	@example
*		its(0 < 10); // returns true
*		its(0 > 10); // throws Error with no message
*		its(0 > 10, "Something went wrong!"); // throws Error with message: "Something went wrong!"
*		its(0 > 10, "%s went %s!", "something", "wrong"); // throws Error with message: "Something went wrong!"
*		its(0 > 10, RangeError, "%s went %s!", "something", "wrong"); // throws RangeError with message: "Something went wrong!"
*		its(0 > 10, RangeError); // throws RangeError with no message
*/
var its = module.exports = function(expression, messageOrErrorType){
	if(expression === false){
		if(messageOrErrorType && typeof messageOrErrorType !== "string"){ // Check if custom error object passed
			throw messageOrErrorType(arguments.length > 3 ? templatedMessage(arguments[2], slice.call(arguments,3)) : arguments[2]);	
		} else {
			throw new Error(arguments.length > 2 ? templatedMessage(messageOrErrorType, slice.call(arguments,2)) : messageOrErrorType);	
		}
	}
	return expression;
};

/** Throws a TypeError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {TypeError}
*
*	@example
*		its.type(typeof "Team" === "string"); // returns true
*		its.type(typeof "Team" === "number"); // throws TypeError with no message
*		its.type(void 0, "Something went wrong!"); // throws TypeError with message: "Something went wrong!"
*		its.type(void 0, "%s went %s!", "something", "wrong"); // throws TypeError with message: "Something went wrong!"
*/
its.type = function(expression, message){
	if(expression === false){
		throw new TypeError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}
	return expression;
};

// Helpers
its.undefined = function(expression){
	return its.type.apply(null, [expression === void 0].concat(slice.call(arguments, 1)));
};

its.null = function(expression){
	return its.type.apply(null, [expression === null].concat(slice.call(arguments, 1)));
};

its.boolean = function(expression){
	return its.type.apply(null, [expression === true || expression === false || toString.call(expression) === "[object Boolean]"].concat(slice.call(arguments, 1)));
};

its.array = function(expression){
	return its.type.apply(null, [toString.call(expression) === "[object Array]"].concat(slice.call(arguments, 1)));
};

its.object = function(expression){
	return its.type.apply(null, [expression === Object(expression)].concat(slice.call(arguments, 1)));
};

/** This block creates 
*	its.function
*	its.string
*	its.number
*	its.date
*	its.regexp
*/
(function(){
	var types = [
			['args','Arguments'],
			['func', 'Function'], 
			['string', 'String'], 
			['number', 'Number'], 
			['date', 'Date'], 
			['regexp', 'RegExp']
		],
		index = 0,
		length = types.length;

	for(; index < length; index++){
		(function(){
			var theType = types[index];
			its[theType[0]] = function(expression){
				return its.type.apply(null, [toString.call(expression) === '[object ' + theType[1] + ']'].concat(slice.call(arguments, 1)));
			};
		}());
	}
}());

// optimization from underscore.js by documentcloud -- underscorejs.org
if (typeof (/./) !== 'function') {
	its.func = function(expression) {
		return its.type.apply(null, [typeof expression === "function"].concat(slice.call(arguments, 1)));
	};
}

/** Throws a ReferenceError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Object} Returns the expression passed  
*	@throws {ReferenceError}
*
*	@example
*		its.defined("Something"); // returns true
*		its.defined(void 0); // throws ReferenceError with no message
*		its.defined(void 0, "Something went wrong!"); // throws ReferenceError with message: "Something went wrong!"
*		its.defined(void 0, "%s went %s!", "something", "wrong"); // throws ReferenceError with message: "Something went wrong!"
*/
its.defined = function(expression, message){
	if(expression === void 0){
		throw new ReferenceError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}

	return expression;
};

/** Throws a RangeError if a given expression is false
*
*	@param {Boolean} expression The determinant of whether an exception is thrown
*	@param {String} [message] A message or message template for the error (if it gets thrown)
*	@param {...Object} [messageArgs] Arguments for a provided message template
*
*	@returns {Boolean} Returns the expression passed  
*	@throws {RangeError}
*
*	@example
*		its.range(1 > 0); // returns true
*		its.range(1 < 2); // throws RangeError with no message
*		its.range(1 < 2 && 1 > 2, "Something went wrong!"); // throws RangeError with message: "Something went wrong!"
*		its.range(1 < 2 && 1 > 2, "%s went %s!", "something", "wrong"); // throws RangeError with message: "Something went wrong!"
*/
its.range = function(expression, message){
	if(expression === false){
		throw new RangeError(arguments.length > 2 ? templatedMessage(message, slice.call(arguments,2)) : message);
	}

	return expression;
};
},{}],13:[function(require,module,exports){
module.exports = require('./lib/Plink.js');
},{"./lib/Plink.js":14}],14:[function(require,module,exports){
var P = require('internet');
var PlinkServer = require('./PlinkServer.js');

function Plink(options){
	this.p = P.create(options);
}

Plink.create = function(options){
	return new Plink(options);
};

module.exports = Plink;

Plink.prototype.connect = function(address){
	var onramp = this.p.connect(address);
	return PlinkServer.create(onramp);
};

},{"./PlinkServer.js":15,"internet":4}],15:[function(require,module,exports){
var when = require('when');

function PlinkServer(onramp){
	this.promises = {};
	this.onramp = onramp;
	this.waitForOpenQueue = [];

	this.onramp.on('message', this.messageHandler.bind(this));
	this.onramp.on('open', this.openHandler.bind(this));
}

PlinkServer.create = function(onramp){
	return new PlinkServer(onramp);
};

module.exports = PlinkServer;

PlinkServer.prototype.on = function(){
	this.onramp.on.apply(this.onramp, arguments);
	return this;
};

PlinkServer.prototype.removeListener = function(){
	this.onramp.removeListener.apply(this.onramp, arguments);
	return this;
};

PlinkServer.prototype.openHandler = function(){
	var self = this;
	this.waitForOpenQueue.forEach(function(call){
		call();
	});

	this.waitForOpenQueue = [];
};

PlinkServer.prototype.setKey = function(key, timeout){
	var self = this,
		deferred = this.promises['set' + key];

	if(!deferred){
		deferred = this.promises['set' + key] = when.defer();
	}

	if(this.onramp.isOpen()){
		this.onramp.send({
			type: 'set key',
			key: key,
			timeout: timeout
		});
	} else {
		this.waitForOpenQueue.push(function(){
			self.onramp.send({
				type: 'set key',
				key: key,
				timeout: timeout
			});
		});
	}

	return deferred.promise;
};

PlinkServer.prototype.revokeKey = function(key){
	var deferred = this.promises['revoke' + key];

	if(!deferred){
		deferred = this.promises['revoke' + key] = when.defer();
	}
	
	this.onramp.send({
		type: 'revoke key',
		key: key
	});

	return deferred.promise;
};

PlinkServer.prototype.useKey = function(key){
	var self = this,
		deferred = this.promises['use' + key];

	if(!deferred){
		deferred = this.promises['use' + key] = when.defer();
	}
	
	if(this.onramp.isOpen()){
		this.onramp.send({
			type: 'use key',
			key: key
		});
	} else {
		this.waitForOpenQueue.push(function(){
			self.onramp.send({
				type: 'use key',
				key: key
			});
		});		
	}
	
	return deferred.promise;
};

PlinkServer.prototype.messageHandler = function(message){
	if(message.type){
		var key = message.key,
			promise;

		switch(message.type){
			case 'address':
				var peer = this.onramp.connect(message.address);
				promise = this.promises['use' + key];
				promise.resolve(peer);
				delete this.promises['use' + key];
				break;
		
			case 'invalid key':
				promise = this.promises['use' + key];
				promise.reject(new Error('invalid key: ' + message.key));
				delete this.promises['use' + key];
				break;
		
			case 'key set':
				promise = this.promises['set' + key];
				promise.resolve(message.key);
				delete this.promises['set' + key];
				break;
		
			case 'key not set':
				promise = this.promises['set' + key];
				promise.reject(new Error('key not set: ' + message.key));
				delete this.promises['set' + key];
				break;
		
			case 'key revoked':
				promise = this.promises['revoke' + key];
				promise.resolve(message.key);
				delete this.promises['revoke' + key];
				break;

			case 'key revoked':
				promise = this.promises['revoke' + key];
				promise.resolve(new Error('key not revoked: ' + message.key));
				delete this.promises['revoke' + key];
				break;
		}
	}
};
},{"when":16}],16:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 * @version 2.7.1
 */
(function(define) { 'use strict';
define(function (require) {

	// Public API

	when.promise   = promise;    // Create a pending promise
	when.resolve   = resolve;    // Create a resolved promise
	when.reject    = reject;     // Create a rejected promise
	when.defer     = defer;      // Create a {promise, resolver} pair

	when.join      = join;       // Join 2 or more promises

	when.all       = all;        // Resolve a list of promises
	when.map       = map;        // Array.map() for promises
	when.reduce    = reduce;     // Array.reduce() for promises
	when.settle    = settle;     // Settle a list of promises

	when.any       = any;        // One-winner race
	when.some      = some;       // Multi-winner race

	when.isPromise = isPromiseLike;  // DEPRECATED: use isPromiseLike
	when.isPromiseLike = isPromiseLike; // Is something promise-like, aka thenable

	/**
	 * Register an observer for a promise or immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @param {function?} [onFulfilled] callback to be called when promiseOrValue is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} [onRejected] callback to be called when promiseOrValue is
	 *   rejected.
	 * @param {function?} [onProgress] callback to be called when progress updates
	 *   are issued for promiseOrValue.
	 * @returns {Promise} a new {@link Promise} that will complete with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
		// Get a trusted promise for the input promiseOrValue, and then
		// register promise handlers
		return cast(promiseOrValue).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver,
			monitorApi.PromiseStatus && monitorApi.PromiseStatus());
	}

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @returns {Promise} promise whose fate is determine by resolver
	 * @name Promise
	 */
	function Promise(resolver, status) {
		var self, value, consumers = [];

		self = this;
		this._status = status;
		this.inspect = inspect;
		this._when = _when;

		// Call the provider resolver to seal the promise's fate
		try {
			resolver(promiseResolve, promiseReject, promiseNotify);
		} catch(e) {
			promiseReject(e);
		}

		/**
		 * Returns a snapshot of this promise's current status at the instant of call
		 * @returns {{state:String}}
		 */
		function inspect() {
			return value ? value.inspect() : toPendingState();
		}

		/**
		 * Private message delivery. Queues and delivers messages to
		 * the promise's ultimate fulfillment value or rejection reason.
		 * @private
		 */
		function _when(resolve, notify, onFulfilled, onRejected, onProgress) {
			consumers ? consumers.push(deliver) : enqueue(function() { deliver(value); });

			function deliver(p) {
				p._when(resolve, notify, onFulfilled, onRejected, onProgress);
			}
		}

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the ultimate fulfillment or rejection
		 * @param {*} val resolution value
		 */
		function promiseResolve(val) {
			if(!consumers) {
				return;
			}

			var queue = consumers;
			consumers = undef;

			enqueue(function () {
				value = coerce(self, val);
				if(status) {
					updateStatus(value, status);
				}
				runHandlers(queue, value);
			});
		}

		/**
		 * Reject this promise with the supplied reason, which will be used verbatim.
		 * @param {*} reason reason for the rejection
		 */
		function promiseReject(reason) {
			promiseResolve(new RejectedPromise(reason));
		}

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @param {*} update progress event payload to pass to all listeners
		 */
		function promiseNotify(update) {
			if(consumers) {
				var queue = consumers;
				enqueue(function () {
					runHandlers(queue, new ProgressingPromise(update));
				});
			}
		}
	}

	promisePrototype = Promise.prototype;

	/**
	 * Register handlers for this promise.
	 * @param [onFulfilled] {Function} fulfillment handler
	 * @param [onRejected] {Function} rejection handler
	 * @param [onProgress] {Function} progress handler
	 * @return {Promise} new Promise
	 */
	promisePrototype.then = function(onFulfilled, onRejected, onProgress) {
		var self = this;

		return new Promise(function(resolve, reject, notify) {
			self._when(resolve, notify, onFulfilled, onRejected, onProgress);
		}, this._status && this._status.observed());
	};

	/**
	 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
	 * @param {function?} onRejected
	 * @return {Promise}
	 */
	promisePrototype['catch'] = promisePrototype.otherwise = function(onRejected) {
		return this.then(undef, onRejected);
	};

	/**
	 * Ensures that onFulfilledOrRejected will be called regardless of whether
	 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
	 * receive the promises' value or reason.  Any returned value will be disregarded.
	 * onFulfilledOrRejected may throw or return a rejected promise to signal
	 * an additional error.
	 * @param {function} onFulfilledOrRejected handler to be called regardless of
	 *  fulfillment or rejection
	 * @returns {Promise}
	 */
	promisePrototype['finally'] = promisePrototype.ensure = function(onFulfilledOrRejected) {
		return typeof onFulfilledOrRejected === 'function'
			? this.then(injectHandler, injectHandler)['yield'](this)
			: this;

		function injectHandler() {
			return resolve(onFulfilledOrRejected());
		}
	};

	/**
	 * Terminate a promise chain by handling the ultimate fulfillment value or
	 * rejection reason, and assuming responsibility for all errors.  if an
	 * error propagates out of handleResult or handleFatalError, it will be
	 * rethrown to the host, resulting in a loud stack track on most platforms
	 * and a crash on some.
	 * @param {function?} handleResult
	 * @param {function?} handleError
	 * @returns {undefined}
	 */
	promisePrototype.done = function(handleResult, handleError) {
		this.then(handleResult, handleError)['catch'](crash);
	};

	/**
	 * Shortcut for .then(function() { return value; })
	 * @param  {*} value
	 * @return {Promise} a promise that:
	 *  - is fulfilled if value is not a promise, or
	 *  - if value is a promise, will fulfill with its value, or reject
	 *    with its reason.
	 */
	promisePrototype['yield'] = function(value) {
		return this.then(function() {
			return value;
		});
	};

	/**
	 * Runs a side effect when this promise fulfills, without changing the
	 * fulfillment value.
	 * @param {function} onFulfilledSideEffect
	 * @returns {Promise}
	 */
	promisePrototype.tap = function(onFulfilledSideEffect) {
		return this.then(onFulfilledSideEffect)['yield'](this);
	};

	/**
	 * Assumes that this promise will fulfill with an array, and arranges
	 * for the onFulfilled to be called with the array as its argument list
	 * i.e. onFulfilled.apply(undefined, array).
	 * @param {function} onFulfilled function to receive spread arguments
	 * @return {Promise}
	 */
	promisePrototype.spread = function(onFulfilled) {
		return this.then(function(array) {
			// array may contain promises, so resolve its contents.
			return all(array, function(array) {
				return onFulfilled.apply(undef, array);
			});
		});
	};

	/**
	 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected)
	 * @deprecated
	 */
	promisePrototype.always = function(onFulfilledOrRejected, onProgress) {
		return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
	};

	/**
	 * Casts x to a trusted promise. If x is already a trusted promise, it is
	 * returned, otherwise a new trusted Promise which follows x is returned.
	 * @param {*} x
	 * @returns {Promise}
	 */
	function cast(x) {
		return x instanceof Promise ? x : resolve(x);
	}

	/**
	 * Returns a resolved promise. The returned promise will be
	 *  - fulfilled with promiseOrValue if it is a value, or
	 *  - if promiseOrValue is a promise
	 *    - fulfilled with promiseOrValue's value after it is fulfilled
	 *    - rejected with promiseOrValue's reason after it is rejected
	 * In contract to cast(x), this always creates a new Promise
	 * @param  {*} value
	 * @return {Promise}
	 */
	function resolve(value) {
		return promise(function(resolve) {
			resolve(value);
		});
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @param {*} promiseOrValue the rejected value of the returned {@link Promise}
	 * @return {Promise} rejected {@link Promise}
	 */
	function reject(promiseOrValue) {
		return when(promiseOrValue, function(e) {
			return new RejectedPromise(e);
		});
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * The resolver has resolve, reject, and progress.  The promise
	 * has then plus extended promise API.
	 *
	 * @return {{
	 * promise: Promise,
	 * resolve: function:Promise,
	 * reject: function:Promise,
	 * notify: function:Promise
	 * resolver: {
	 *	resolve: function:Promise,
	 *	reject: function:Promise,
	 *	notify: function:Promise
	 * }}}
	 */
	function defer() {
		var deferred, pending, resolved;

		// Optimize object shape
		deferred = {
			promise: undef, resolve: undef, reject: undef, notify: undef,
			resolver: { resolve: undef, reject: undef, notify: undef }
		};

		deferred.promise = pending = promise(makeDeferred);

		return deferred;

		function makeDeferred(resolvePending, rejectPending, notifyPending) {
			deferred.resolve = deferred.resolver.resolve = function(value) {
				if(resolved) {
					return resolve(value);
				}
				resolved = true;
				resolvePending(value);
				return pending;
			};

			deferred.reject  = deferred.resolver.reject  = function(reason) {
				if(resolved) {
					return resolve(new RejectedPromise(reason));
				}
				resolved = true;
				rejectPending(reason);
				return pending;
			};

			deferred.notify  = deferred.resolver.notify  = function(update) {
				notifyPending(update);
				return update;
			};
		}
	}

	/**
	 * Run a queue of functions as quickly as possible, passing
	 * value to each.
	 */
	function runHandlers(queue, value) {
		for (var i = 0; i < queue.length; i++) {
			queue[i](value);
		}
	}

	/**
	 * Coerces x to a trusted Promise
	 * @param {*} x thing to coerce
	 * @returns {*} Guaranteed to return a trusted Promise.  If x
	 *   is trusted, returns x, otherwise, returns a new, trusted, already-resolved
	 *   Promise whose resolution value is:
	 *   * the resolution value of x if it's a foreign promise, or
	 *   * x if it's a value
	 */
	function coerce(self, x) {
		if (x === self) {
			return new RejectedPromise(new TypeError());
		}

		if (x instanceof Promise) {
			return x;
		}

		try {
			var untrustedThen = x === Object(x) && x.then;

			return typeof untrustedThen === 'function'
				? assimilate(untrustedThen, x)
				: new FulfilledPromise(x);
		} catch(e) {
			return new RejectedPromise(e);
		}
	}

	/**
	 * Safely assimilates a foreign thenable by wrapping it in a trusted promise
	 * @param {function} untrustedThen x's then() method
	 * @param {object|function} x thenable
	 * @returns {Promise}
	 */
	function assimilate(untrustedThen, x) {
		return promise(function (resolve, reject) {
			fcall(untrustedThen, x, resolve, reject);
		});
	}

	makePromisePrototype = Object.create ||
		function(o) {
			function PromisePrototype() {}
			PromisePrototype.prototype = o;
			return new PromisePrototype();
		};

	/**
	 * Creates a fulfilled, local promise as a proxy for a value
	 * NOTE: must never be exposed
	 * @private
	 * @param {*} value fulfillment value
	 * @returns {Promise}
	 */
	function FulfilledPromise(value) {
		this.value = value;
	}

	FulfilledPromise.prototype = makePromisePrototype(promisePrototype);

	FulfilledPromise.prototype.inspect = function() {
		return toFulfilledState(this.value);
	};

	FulfilledPromise.prototype._when = function(resolve, _, onFulfilled) {
		try {
			resolve(typeof onFulfilled === 'function' ? onFulfilled(this.value) : this.value);
		} catch(e) {
			resolve(new RejectedPromise(e));
		}
	};

	/**
	 * Creates a rejected, local promise as a proxy for a value
	 * NOTE: must never be exposed
	 * @private
	 * @param {*} reason rejection reason
	 * @returns {Promise}
	 */
	function RejectedPromise(reason) {
		this.value = reason;
	}

	RejectedPromise.prototype = makePromisePrototype(promisePrototype);

	RejectedPromise.prototype.inspect = function() {
		return toRejectedState(this.value);
	};

	RejectedPromise.prototype._when = function(resolve, _, __, onRejected) {
		try {
			resolve(typeof onRejected === 'function' ? onRejected(this.value) : this);
		} catch(e) {
			resolve(new RejectedPromise(e));
		}
	};

	/**
	 * Create a progress promise with the supplied update.
	 * @private
	 * @param {*} value progress update value
	 * @return {Promise} progress promise
	 */
	function ProgressingPromise(value) {
		this.value = value;
	}

	ProgressingPromise.prototype = makePromisePrototype(promisePrototype);

	ProgressingPromise.prototype._when = function(_, notify, f, r, u) {
		try {
			notify(typeof u === 'function' ? u(this.value) : this.value);
		} catch(e) {
			notify(e);
		}
	};

	/**
	 * Update a PromiseStatus monitor object with the outcome
	 * of the supplied value promise.
	 * @param {Promise} value
	 * @param {PromiseStatus} status
	 */
	function updateStatus(value, status) {
		value.then(statusFulfilled, statusRejected);

		function statusFulfilled() { status.fulfilled(); }
		function statusRejected(r) { status.rejected(r); }
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * howMany of the supplied promisesOrValues have resolved, or will reject when
	 * it becomes impossible for howMany to resolve, for example, when
	 * (promisesOrValues.length - howMany) + 1 input promises reject.
	 *
	 * @param {Array} promisesOrValues array of anything, may contain a mix
	 *      of promises and values
	 * @param howMany {number} number of promisesOrValues to resolve
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to an array of howMany values that
	 *  resolved first, or will reject with an array of
	 *  (promisesOrValues.length - howMany) + 1 rejection reasons.
	 */
	function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

		return when(promisesOrValues, function(promisesOrValues) {

			return promise(resolveSome).then(onFulfilled, onRejected, onProgress);

			function resolveSome(resolve, reject, notify) {
				var toResolve, toReject, values, reasons, fulfillOne, rejectOne, len, i;

				len = promisesOrValues.length >>> 0;

				toResolve = Math.max(0, Math.min(howMany, len));
				values = [];

				toReject = (len - toResolve) + 1;
				reasons = [];

				// No items in the input, resolve immediately
				if (!toResolve) {
					resolve(values);

				} else {
					rejectOne = function(reason) {
						reasons.push(reason);
						if(!--toReject) {
							fulfillOne = rejectOne = identity;
							reject(reasons);
						}
					};

					fulfillOne = function(val) {
						// This orders the values based on promise resolution order
						values.push(val);
						if (!--toResolve) {
							fulfillOne = rejectOne = identity;
							resolve(values);
						}
					};

					for(i = 0; i < len; ++i) {
						if(i in promisesOrValues) {
							when(promisesOrValues[i], fulfiller, rejecter, notify);
						}
					}
				}

				function rejecter(reason) {
					rejectOne(reason);
				}

				function fulfiller(val) {
					fulfillOne(val);
				}
			}
		});
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * any one of the supplied promisesOrValues has resolved or will reject when
	 * *all* promisesOrValues have rejected.
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to the value that resolved first, or
	 * will reject with an array of all rejected inputs.
	 */
	function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

		function unwrapSingleResult(val) {
			return onFulfilled ? onFulfilled(val[0]) : val[0];
		}

		return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
	}

	/**
	 * Return a promise that will resolve only once all the supplied promisesOrValues
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the promisesOrValues.
	 * @memberOf when
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise}
	 */
	function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
		return _map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Joins multiple promises into a single returned promise.
	 * @return {Promise} a promise that will fulfill when *all* the input promises
	 * have fulfilled, or will reject when *any one* of the input promises rejects.
	 */
	function join(/* ...promises */) {
		return _map(arguments, identity);
	}

	/**
	 * Settles all input promises such that they are guaranteed not to
	 * be pending once the returned promise fulfills. The returned promise
	 * will always fulfill, except in the case where `array` is a promise
	 * that rejects.
	 * @param {Array|Promise} array or promise for array of promises to settle
	 * @returns {Promise} promise that always fulfills with an array of
	 *  outcome snapshots for each input promise.
	 */
	function settle(array) {
		return _map(array, toFulfilledState, toRejectedState);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(array, mapFunc) {
		return _map(array, mapFunc);
	}

	/**
	 * Internal map that allows a fallback to handle rejections
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @param {function?} fallback function to handle rejected promises
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function _map(array, mapFunc, fallback) {
		return when(array, function(array) {

			return new Promise(resolveMap);

			function resolveMap(resolve, reject, notify) {
				var results, len, toResolve, i;

				// Since we know the resulting length, we can preallocate the results
				// array to avoid array expansions.
				toResolve = len = array.length >>> 0;
				results = [];

				if(!toResolve) {
					resolve(results);
					return;
				}

				// Since mapFunc may be async, get all invocations of it into flight
				for(i = 0; i < len; i++) {
					if(i in array) {
						resolveOne(array[i], i);
					} else {
						--toResolve;
					}
				}

				function resolveOne(item, i) {
					when(item, mapFunc, fallback).then(function(mapped) {
						results[i] = mapped;

						if(!--toResolve) {
							resolve(results);
						}
					}, reject, notify);
				}
			}
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promise array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),
	 *      where total is the total number of items being reduced, and will be the same
	 *      in each call to reduceFunc.
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promise, reduceFunc /*, initialValue */) {
		var args = fcall(slice, arguments, 1);

		return when(promise, function(array) {
			var total;

			total = array.length;

			// Wrap the supplied reduceFunc with one that handles promises and then
			// delegates to the supplied.
			args[0] = function (current, val, i) {
				return when(current, function (c) {
					return when(val, function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};

			return reduceArray.apply(array, args);
		});
	}

	// Snapshot states

	/**
	 * Creates a fulfilled state snapshot
	 * @private
	 * @param {*} x any value
	 * @returns {{state:'fulfilled',value:*}}
	 */
	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	/**
	 * Creates a rejected state snapshot
	 * @private
	 * @param {*} x any reason
	 * @returns {{state:'rejected',reason:*}}
	 */
	function toRejectedState(x) {
		return { state: 'rejected', reason: x };
	}

	/**
	 * Creates a pending state snapshot
	 * @private
	 * @returns {{state:'pending'}}
	 */
	function toPendingState() {
		return { state: 'pending' };
	}

	//
	// Internals, utilities, etc.
	//

	var promisePrototype, makePromisePrototype, reduceArray, slice, fcall, nextTick, handlerQueue,
		funcProto, call, arrayProto, monitorApi,
		capturedSetTimeout, cjsRequire, MutationObs, undef;

	cjsRequire = require;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	handlerQueue = [];

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	function enqueue(task) {
		if(handlerQueue.push(task) === 1) {
			nextTick(drainQueue);
		}
	}

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	function drainQueue() {
		runHandlers(handlerQueue);
		handlerQueue = [];
	}

	// Allow attaching the monitor to when() if env has no console
	monitorApi = typeof console !== 'undefined' ? console : when;

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout
	/*global process,document,setTimeout,MutationObserver,WebKitMutationObserver*/
	if (typeof process === 'object' && process.nextTick) {
		nextTick = process.nextTick;
	} else if(MutationObs =
		(typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver)) {
		nextTick = (function(document, MutationObserver, drainQueue) {
			var el = document.createElement('div');
			new MutationObserver(drainQueue).observe(el, { attributes: true });

			return function() {
				el.setAttribute('x', 'x');
			};
		}(document, MutationObs, drainQueue));
	} else {
		try {
			// vert.x 1.x || 2.x
			nextTick = cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
		} catch(ignore) {
			// capture setTimeout to avoid being caught by fake timers
			// used in time based tests
			capturedSetTimeout = setTimeout;
			nextTick = function(t) { capturedSetTimeout(t, 0); };
		}
	}

	//
	// Capture/polyfill function and array utils
	//

	// Safe function calls
	funcProto = Function.prototype;
	call = funcProto.call;
	fcall = funcProto.bind
		? call.bind(call)
		: function(f, context) {
			return f.apply(context, slice.call(arguments, 2));
		};

	// Safe array ops
	arrayProto = [];
	slice = arrayProto.slice;

	// ES5 reduce implementation if native not available
	// See: http://es5.github.com/#x15.4.4.21 as there are many
	// specifics and edge cases.  ES5 dictates that reduce.length === 1
	// This implementation deviates from ES5 spec in the following ways:
	// 1. It does not check if reduceFunc is a Callable
	reduceArray = arrayProto.reduce ||
		function(reduceFunc /*, initialValue */) {
			/*jshint maxcomplexity: 7*/
			var arr, args, reduced, len, i;

			i = 0;
			arr = Object(this);
			len = arr.length >>> 0;
			args = arguments;

			// If no initialValue, use first item of array (we know length !== 0 here)
			// and adjust i to start at second item
			if(args.length <= 1) {
				// Skip to the first real element in the array
				for(;;) {
					if(i in arr) {
						reduced = arr[i++];
						break;
					}

					// If we reached the end of the array without finding any real
					// elements, it's a TypeError
					if(++i >= len) {
						throw new TypeError();
					}
				}
			} else {
				// If initialValue provided, use it
				reduced = args[1];
			}

			// Do the actual reduce
			for(;i < len; ++i) {
				if(i in arr) {
					reduced = reduceFunc(reduced, arr[i], i, arr);
				}
			}

			return reduced;
		};

	function identity(x) {
		return x;
	}

	function crash(fatalError) {
		if(typeof monitorApi.reportUnhandled === 'function') {
			monitorApi.reportUnhandled();
		} else {
			enqueue(function() {
				throw fatalError;
			});
		}

		throw fatalError;
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

}).call(this,require('_process'))
},{"_process":3}],17:[function(require,module,exports){
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

  if (!('origin' in window.location)) {
    window.location.origin = (window.location.protocol + '//' +
      window.location.host);
  }
}


function getPeerKey() {
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

function escape_(text) {
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
  getPeerKey: getPeerKey,
  fieldFocused: fieldFocused,
  hasTouchEvents: hasTouchEvents,
  injectCSS: injectCSS,
  escape: escape_,
  isFullScreen: isFullScreen,
  toggleFullScreen: toggleFullScreen,
  lockOrientation: lockOrientation,
  triggerEvent: triggerEvent
};

};

},{}],18:[function(require,module,exports){
'use strict';

var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}

var utils = require('./lib/utils')(window, document);


utils.polyfill();


var settings = {
  // Origin of Galaxy server hosting the gamepad files
  // (e.g., iframe, controller, etc.).
  // No trailing slash.
  GAMEPAD_ORIGIN: window.location.origin,

  // Signalling server API. (Protocol should be `wss://` in prod.)
  WS_URL: 'ws://' + location.hostname + ':20500/',

  // Debug mode (verbose logging, etc.). (Should be `false` in prod.)
  DEBUG: false,

  // Version of the `gamepad.js` script
  VERSION: '0.0.1'
};

// Override each default setting with user-defined setting.
Object.keys(settings_local).forEach(function (key) {
  settings[key] = settings_local[key];
});


module.exports = settings;

},{"./lib/utils":17,"./settings_local.js":19}],19:[function(require,module,exports){
module.exports = {
  DEBUG: true
};

},{}]},{},[1]);
