!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gamepad=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var peer = require('./lib/peer');
var Promise = require('./lib/promise-1.0.0');  // jshint ignore:line

var settings = require('./settings');


if (!('performance' in window)) {
  window.performance = {
    now: function() {
      return +new Date();
    }
  };
}

function trace(text) {
  console.log((window.performance.now() / 1000).toFixed(3) + ": " + text);
}


/**
 * A library for controlling an HTML5 game using WebRTC.
 *
 * @exports gamepad
 * @namespace gamepad
 */
function gamepad() {
}

/*

1. Your PC connects to the server.
2. The server gives your PC a randomly generated number and remembers the combination of number and PC.
3. From your mobile device, specify a number and connect to the server.
4. If the number specified is the same as from a connected PC, your mobile device is paired with that PC.
5. If there is no designated PC, an error occurs.
6. When data comes in from your mobile device, it is sent to the PC with which it is paired, and vice versa.

*/

/**
 * Authenticates a user.
 *
 * Opens a modal that overlays the game, prompting the user to sign in.
 * Returns a Promise that resolves with a `User` object for the user.
 *
 * @returns {Promise}
 * @memberOf galaxy
 */
gamepad.connectToPeer = function () {
  var pin = (window.location.pathname.indexOf('.html') ?
    window.location.search.substr(1) : window.location.pathname.substr(1));

  var p = new Peer(pin, {key: settings.PEER_KEY});
  p.on('open', function (id) {
    trace('My peer ID: ' + id);
  });
};

gamepad.version = settings.VERSION;


module.exports = gamepad;

},{"./lib/peer":3,"./lib/promise-1.0.0":4,"./settings":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
/*! peerjs.js build:0.3.9, development. Copyright(c) 2013 Michelle Bu <michelle@michellebu.com> */
(function(exports){
var binaryFeatures = {};
binaryFeatures.useBlobBuilder = (function(){
  try {
    new Blob([]);
    return false;
  } catch (e) {
    return true;
  }
})();

binaryFeatures.useArrayBufferView = !binaryFeatures.useBlobBuilder && (function(){
  try {
    return (new Blob([new Uint8Array([])])).size === 0;
  } catch (e) {
    return true;
  }
})();

exports.binaryFeatures = binaryFeatures;
exports.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;

function BufferBuilder(){
  this._pieces = [];
  this._parts = [];
}

BufferBuilder.prototype.append = function(data) {
  if(typeof data === 'number') {
    this._pieces.push(data);
  } else {
    this.flush();
    this._parts.push(data);
  }
};

BufferBuilder.prototype.flush = function() {
  if (this._pieces.length > 0) {
    var buf = new Uint8Array(this._pieces);
    if(!binaryFeatures.useArrayBufferView) {
      buf = buf.buffer;
    }
    this._parts.push(buf);
    this._pieces = [];
  }
};

BufferBuilder.prototype.getBuffer = function() {
  this.flush();
  if(binaryFeatures.useBlobBuilder) {
    var builder = new BlobBuilder();
    for(var i = 0, ii = this._parts.length; i < ii; i++) {
      builder.append(this._parts[i]);
    }
    return builder.getBlob();
  } else {
    return new Blob(this._parts);
  }
};
exports.BinaryPack = {
  unpack: function(data){
    var unpacker = new Unpacker(data);
    return unpacker.unpack();
  },
  pack: function(data){
    var packer = new Packer();
    packer.pack(data);
    var buffer = packer.getBuffer();
    return buffer;
  }
};

function Unpacker (data){
  // Data is ArrayBuffer
  this.index = 0;
  this.dataBuffer = data;
  this.dataView = new Uint8Array(this.dataBuffer);
  this.length = this.dataBuffer.byteLength;
}


Unpacker.prototype.unpack = function(){
  var type = this.unpack_uint8();
  if (type < 0x80){
    var positive_fixnum = type;
    return positive_fixnum;
  } else if ((type ^ 0xe0) < 0x20){
    var negative_fixnum = (type ^ 0xe0) - 0x20;
    return negative_fixnum;
  }
  var size;
  if ((size = type ^ 0xa0) <= 0x0f){
    return this.unpack_raw(size);
  } else if ((size = type ^ 0xb0) <= 0x0f){
    return this.unpack_string(size);
  } else if ((size = type ^ 0x90) <= 0x0f){
    return this.unpack_array(size);
  } else if ((size = type ^ 0x80) <= 0x0f){
    return this.unpack_map(size);
  }
  switch(type){
    case 0xc0:
      return null;
    case 0xc1:
      return undefined;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xca:
      return this.unpack_float();
    case 0xcb:
      return this.unpack_double();
    case 0xcc:
      return this.unpack_uint8();
    case 0xcd:
      return this.unpack_uint16();
    case 0xce:
      return this.unpack_uint32();
    case 0xcf:
      return this.unpack_uint64();
    case 0xd0:
      return this.unpack_int8();
    case 0xd1:
      return this.unpack_int16();
    case 0xd2:
      return this.unpack_int32();
    case 0xd3:
      return this.unpack_int64();
    case 0xd4:
      return undefined;
    case 0xd5:
      return undefined;
    case 0xd6:
      return undefined;
    case 0xd7:
      return undefined;
    case 0xd8:
      size = this.unpack_uint16();
      return this.unpack_string(size);
    case 0xd9:
      size = this.unpack_uint32();
      return this.unpack_string(size);
    case 0xda:
      size = this.unpack_uint16();
      return this.unpack_raw(size);
    case 0xdb:
      size = this.unpack_uint32();
      return this.unpack_raw(size);
    case 0xdc:
      size = this.unpack_uint16();
      return this.unpack_array(size);
    case 0xdd:
      size = this.unpack_uint32();
      return this.unpack_array(size);
    case 0xde:
      size = this.unpack_uint16();
      return this.unpack_map(size);
    case 0xdf:
      size = this.unpack_uint32();
      return this.unpack_map(size);
  }
}

Unpacker.prototype.unpack_uint8 = function(){
  var byte = this.dataView[this.index] & 0xff;
  this.index++;
  return byte;
};

Unpacker.prototype.unpack_uint16 = function(){
  var bytes = this.read(2);
  var uint16 =
    ((bytes[0] & 0xff) * 256) + (bytes[1] & 0xff);
  this.index += 2;
  return uint16;
}

Unpacker.prototype.unpack_uint32 = function(){
  var bytes = this.read(4);
  var uint32 =
     ((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3];
  this.index += 4;
  return uint32;
}

Unpacker.prototype.unpack_uint64 = function(){
  var bytes = this.read(8);
  var uint64 =
   ((((((bytes[0]  * 256 +
       bytes[1]) * 256 +
       bytes[2]) * 256 +
       bytes[3]) * 256 +
       bytes[4]) * 256 +
       bytes[5]) * 256 +
       bytes[6]) * 256 +
       bytes[7];
  this.index += 8;
  return uint64;
}


Unpacker.prototype.unpack_int8 = function(){
  var uint8 = this.unpack_uint8();
  return (uint8 < 0x80 ) ? uint8 : uint8 - (1 << 8);
};

Unpacker.prototype.unpack_int16 = function(){
  var uint16 = this.unpack_uint16();
  return (uint16 < 0x8000 ) ? uint16 : uint16 - (1 << 16);
}

Unpacker.prototype.unpack_int32 = function(){
  var uint32 = this.unpack_uint32();
  return (uint32 < Math.pow(2, 31) ) ? uint32 :
    uint32 - Math.pow(2, 32);
}

Unpacker.prototype.unpack_int64 = function(){
  var uint64 = this.unpack_uint64();
  return (uint64 < Math.pow(2, 63) ) ? uint64 :
    uint64 - Math.pow(2, 64);
}

Unpacker.prototype.unpack_raw = function(size){
  if ( this.length < this.index + size){
    throw new Error('BinaryPackFailure: index is out of range'
      + ' ' + this.index + ' ' + size + ' ' + this.length);
  }
  var buf = this.dataBuffer.slice(this.index, this.index + size);
  this.index += size;

    //buf = util.bufferToString(buf);

  return buf;
}

Unpacker.prototype.unpack_string = function(size){
  var bytes = this.read(size);
  var i = 0, str = '', c, code;
  while(i < size){
    c = bytes[i];
    if ( c < 128){
      str += String.fromCharCode(c);
      i++;
    } else if ((c ^ 0xc0) < 32){
      code = ((c ^ 0xc0) << 6) | (bytes[i+1] & 63);
      str += String.fromCharCode(code);
      i += 2;
    } else {
      code = ((c & 15) << 12) | ((bytes[i+1] & 63) << 6) |
        (bytes[i+2] & 63);
      str += String.fromCharCode(code);
      i += 3;
    }
  }
  this.index += size;
  return str;
}

Unpacker.prototype.unpack_array = function(size){
  var objects = new Array(size);
  for(var i = 0; i < size ; i++){
    objects[i] = this.unpack();
  }
  return objects;
}

Unpacker.prototype.unpack_map = function(size){
  var map = {};
  for(var i = 0; i < size ; i++){
    var key  = this.unpack();
    var value = this.unpack();
    map[key] = value;
  }
  return map;
}

Unpacker.prototype.unpack_float = function(){
  var uint32 = this.unpack_uint32();
  var sign = uint32 >> 31;
  var exp  = ((uint32 >> 23) & 0xff) - 127;
  var fraction = ( uint32 & 0x7fffff ) | 0x800000;
  return (sign == 0 ? 1 : -1) *
    fraction * Math.pow(2, exp - 23);
}

Unpacker.prototype.unpack_double = function(){
  var h32 = this.unpack_uint32();
  var l32 = this.unpack_uint32();
  var sign = h32 >> 31;
  var exp  = ((h32 >> 20) & 0x7ff) - 1023;
  var hfrac = ( h32 & 0xfffff ) | 0x100000;
  var frac = hfrac * Math.pow(2, exp - 20) +
    l32   * Math.pow(2, exp - 52);
  return (sign == 0 ? 1 : -1) * frac;
}

Unpacker.prototype.read = function(length){
  var j = this.index;
  if (j + length <= this.length) {
    return this.dataView.subarray(j, j + length);
  } else {
    throw new Error('BinaryPackFailure: read index out of range');
  }
}

function Packer(){
  this.bufferBuilder = new BufferBuilder();
}

Packer.prototype.getBuffer = function(){
  return this.bufferBuilder.getBuffer();
}

Packer.prototype.pack = function(value){
  var type = typeof(value);
  if (type == 'string'){
    this.pack_string(value);
  } else if (type == 'number'){
    if (Math.floor(value) === value){
      this.pack_integer(value);
    } else{
      this.pack_double(value);
    }
  } else if (type == 'boolean'){
    if (value === true){
      this.bufferBuilder.append(0xc3);
    } else if (value === false){
      this.bufferBuilder.append(0xc2);
    }
  } else if (type == 'undefined'){
    this.bufferBuilder.append(0xc0);
  } else if (type == 'object'){
    if (value === null){
      this.bufferBuilder.append(0xc0);
    } else {
      var constructor = value.constructor;
      if (constructor == Array){
        this.pack_array(value);
      } else if (constructor == Blob || constructor == File) {
        this.pack_bin(value);
      } else if (constructor == ArrayBuffer) {
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(new Uint8Array(value));
        } else {
          this.pack_bin(value);
        }
      } else if ('BYTES_PER_ELEMENT' in value){
        if(binaryFeatures.useArrayBufferView) {
          this.pack_bin(new Uint8Array(value.buffer));
        } else {
          this.pack_bin(value.buffer);
        }
      } else if (constructor == Object){
        this.pack_object(value);
      } else if (constructor == Date){
        this.pack_string(value.toString());
      } else if (typeof value.toBinaryPack == 'function'){
        this.bufferBuilder.append(value.toBinaryPack());
      } else {
        throw new Error('Type "' + constructor.toString() + '" not yet supported');
      }
    }
  } else {
    throw new Error('Type "' + type + '" not yet supported');
  }
  this.bufferBuilder.flush();
}


Packer.prototype.pack_bin = function(blob){
  var length = blob.length || blob.byteLength || blob.size;
  if (length <= 0x0f){
    this.pack_uint8(0xa0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xda) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdb);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(blob);
}

Packer.prototype.pack_string = function(str){
  var length = utf8Length(str);

  if (length <= 0x0f){
    this.pack_uint8(0xb0 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xd8) ;
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xd9);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
    return;
  }
  this.bufferBuilder.append(str);
}

Packer.prototype.pack_array = function(ary){
  var length = ary.length;
  if (length <= 0x0f){
    this.pack_uint8(0x90 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xdc)
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdd);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var i = 0; i < length ; i++){
    this.pack(ary[i]);
  }
}

Packer.prototype.pack_integer = function(num){
  if ( -0x20 <= num && num <= 0x7f){
    this.bufferBuilder.append(num & 0xff);
  } else if (0x00 <= num && num <= 0xff){
    this.bufferBuilder.append(0xcc);
    this.pack_uint8(num);
  } else if (-0x80 <= num && num <= 0x7f){
    this.bufferBuilder.append(0xd0);
    this.pack_int8(num);
  } else if ( 0x0000 <= num && num <= 0xffff){
    this.bufferBuilder.append(0xcd);
    this.pack_uint16(num);
  } else if (-0x8000 <= num && num <= 0x7fff){
    this.bufferBuilder.append(0xd1);
    this.pack_int16(num);
  } else if ( 0x00000000 <= num && num <= 0xffffffff){
    this.bufferBuilder.append(0xce);
    this.pack_uint32(num);
  } else if (-0x80000000 <= num && num <= 0x7fffffff){
    this.bufferBuilder.append(0xd2);
    this.pack_int32(num);
  } else if (-0x8000000000000000 <= num && num <= 0x7FFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xd3);
    this.pack_int64(num);
  } else if (0x0000000000000000 <= num && num <= 0xFFFFFFFFFFFFFFFF){
    this.bufferBuilder.append(0xcf);
    this.pack_uint64(num);
  } else{
    throw new Error('Invalid integer');
  }
}

Packer.prototype.pack_double = function(num){
  var sign = 0;
  if (num < 0){
    sign = 1;
    num = -num;
  }
  var exp  = Math.floor(Math.log(num) / Math.LN2);
  var frac0 = num / Math.pow(2, exp) - 1;
  var frac1 = Math.floor(frac0 * Math.pow(2, 52));
  var b32   = Math.pow(2, 32);
  var h32 = (sign << 31) | ((exp+1023) << 20) |
      (frac1 / b32) & 0x0fffff;
  var l32 = frac1 % b32;
  this.bufferBuilder.append(0xcb);
  this.pack_int32(h32);
  this.pack_int32(l32);
}

Packer.prototype.pack_object = function(obj){
  var keys = Object.keys(obj);
  var length = keys.length;
  if (length <= 0x0f){
    this.pack_uint8(0x80 + length);
  } else if (length <= 0xffff){
    this.bufferBuilder.append(0xde);
    this.pack_uint16(length);
  } else if (length <= 0xffffffff){
    this.bufferBuilder.append(0xdf);
    this.pack_uint32(length);
  } else{
    throw new Error('Invalid length');
  }
  for(var prop in obj){
    if (obj.hasOwnProperty(prop)){
      this.pack(prop);
      this.pack(obj[prop]);
    }
  }
}

Packer.prototype.pack_uint8 = function(num){
  this.bufferBuilder.append(num);
}

Packer.prototype.pack_uint16 = function(num){
  this.bufferBuilder.append(num >> 8);
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_uint32 = function(num){
  var n = num & 0xffffffff;
  this.bufferBuilder.append((n & 0xff000000) >>> 24);
  this.bufferBuilder.append((n & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((n & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((n & 0x000000ff));
}

Packer.prototype.pack_uint64 = function(num){
  var high = num / Math.pow(2, 32);
  var low  = num % Math.pow(2, 32);
  this.bufferBuilder.append((high & 0xff000000) >>> 24);
  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((high & 0x000000ff));
  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((low  & 0x000000ff));
}

Packer.prototype.pack_int8 = function(num){
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_int16 = function(num){
  this.bufferBuilder.append((num & 0xff00) >> 8);
  this.bufferBuilder.append(num & 0xff);
}

Packer.prototype.pack_int32 = function(num){
  this.bufferBuilder.append((num >>> 24) & 0xff);
  this.bufferBuilder.append((num & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((num & 0x0000ff00) >>> 8);
  this.bufferBuilder.append((num & 0x000000ff));
}

Packer.prototype.pack_int64 = function(num){
  var high = Math.floor(num / Math.pow(2, 32));
  var low  = num % Math.pow(2, 32);
  this.bufferBuilder.append((high & 0xff000000) >>> 24);
  this.bufferBuilder.append((high & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((high & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((high & 0x000000ff));
  this.bufferBuilder.append((low  & 0xff000000) >>> 24);
  this.bufferBuilder.append((low  & 0x00ff0000) >>> 16);
  this.bufferBuilder.append((low  & 0x0000ff00) >>>  8);
  this.bufferBuilder.append((low  & 0x000000ff));
}

function _utf8Replace(m){
  var code = m.charCodeAt(0);

  if(code <= 0x7ff) return '00';
  if(code <= 0xffff) return '000';
  if(code <= 0x1fffff) return '0000';
  if(code <= 0x3ffffff) return '00000';
  return '000000';
}

function utf8Length(str){
  if (str.length > 600) {
    // Blob method faster for large strings
    return (new Blob([str])).size;
  } else {
    return str.replace(/[^\u0000-\u007F]/g, _utf8Replace).length;
  }
}
/**
 * Light EventEmitter. Ported from Node.js/events.js
 * Eric Zhang
 */

/**
 * EventEmitter class
 * Creates an object with event registering and firing methods
 */
function EventEmitter() {
  // Initialise required storage variables
  this._events = {};
}

var isArray = Array.isArray;


EventEmitter.prototype.addListener = function(type, listener, scope, once) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, typeof listener.listener === 'function' ?
            listener.listener : listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // If we've already got an array, just append.
    this._events[type].push(listener);

  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }
  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener, scope) {
  if ('function' !== typeof listener) {
    throw new Error('.once only takes instances of Function');
  }

  var self = this;
  function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  };

  g.listener = listener;
  self.on(type, g);

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener, scope) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var position = -1;
    for (var i = 0, length = list.length; i < length; i++) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener))
      {
        position = i;
        break;
      }
    }

    if (position < 0) return this;
    list.splice(position, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (list === listener ||
             (list.listener && list.listener === listener))
  {
    delete this._events[type];
  }

  return this;
};


EventEmitter.prototype.off = EventEmitter.prototype.removeListener;


EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

EventEmitter.prototype.emit = function(type) {
  var type = arguments[0];
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
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
        var l = arguments.length;
        var args = new Array(l - 1);
        for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var l = arguments.length;
    var args = new Array(l - 1);
    for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;
  } else {
    return false;
  }
};



/**
 * Reliable transfer for Chrome Canary DataChannel impl.
 * Author: @michellebu
 */
function Reliable(dc, debug) {
  if (!(this instanceof Reliable)) return new Reliable(dc);
  this._dc = dc;

  util.debug = debug;

  // Messages sent/received so far.
  // id: { ack: n, chunks: [...] }
  this._outgoing = {};
  // id: { ack: ['ack', id, n], chunks: [...] }
  this._incoming = {};
  this._received = {};

  // Window size.
  this._window = 1000;
  // MTU.
  this._mtu = 500;
  // Interval for setInterval. In ms.
  this._interval = 0;

  // Messages sent.
  this._count = 0;

  // Outgoing message queue.
  this._queue = [];

  this._setupDC();
};

// Send a message reliably.
Reliable.prototype.send = function(msg) {
  // Determine if chunking is necessary.
  var bl = util.pack(msg);
  if (bl.size < this._mtu) {
    this._handleSend(['no', bl]);
    return;
  }

  this._outgoing[this._count] = {
    ack: 0,
    chunks: this._chunk(bl)
  };

  if (util.debug) {
    this._outgoing[this._count].timer = new Date();
  }

  // Send prelim window.
  this._sendWindowedChunks(this._count);
  this._count += 1;
};

// Set up interval for processing queue.
Reliable.prototype._setupInterval = function() {
  // TODO: fail gracefully.

  var self = this;
  this._timeout = setInterval(function() {
    // FIXME: String stuff makes things terribly async.
    var msg = self._queue.shift();
    if (msg._multiple) {
      for (var i = 0, ii = msg.length; i < ii; i += 1) {
        self._intervalSend(msg[i]);
      }
    } else {
      self._intervalSend(msg);
    }
  }, this._interval);
};

Reliable.prototype._intervalSend = function(msg) {
  var self = this;
  msg = util.pack(msg);
  util.blobToBinaryString(msg, function(str) {
    self._dc.send(str);
  });
  if (self._queue.length === 0) {
    clearTimeout(self._timeout);
    self._timeout = null;
    //self._processAcks();
  }
};

// Go through ACKs to send missing pieces.
Reliable.prototype._processAcks = function() {
  for (var id in this._outgoing) {
    if (this._outgoing.hasOwnProperty(id)) {
      this._sendWindowedChunks(id);
    }
  }
};

// Handle sending a message.
// FIXME: Don't wait for interval time for all messages...
Reliable.prototype._handleSend = function(msg) {
  var push = true;
  for (var i = 0, ii = this._queue.length; i < ii; i += 1) {
    var item = this._queue[i];
    if (item === msg) {
      push = false;
    } else if (item._multiple && item.indexOf(msg) !== -1) {
      push = false;
    }
  }
  if (push) {
    this._queue.push(msg);
    if (!this._timeout) {
      this._setupInterval();
    }
  }
};

// Set up DataChannel handlers.
Reliable.prototype._setupDC = function() {
  // Handle various message types.
  var self = this;
  this._dc.onmessage = function(e) {
    var msg = e.data;
    var datatype = msg.constructor;
    // FIXME: msg is String until binary is supported.
    // Once that happens, this will have to be smarter.
    if (datatype === String) {
      var ab = util.binaryStringToArrayBuffer(msg);
      msg = util.unpack(ab);
      self._handleMessage(msg);
    }
  };
};

// Handles an incoming message.
Reliable.prototype._handleMessage = function(msg) {
  var id = msg[1];
  var idata = this._incoming[id];
  var odata = this._outgoing[id];
  var data;
  switch (msg[0]) {
    // No chunking was done.
    case 'no':
      var message = id;
      if (!!message) {
        this.onmessage(util.unpack(message));
      }
      break;
    // Reached the end of the message.
    case 'end':
      data = idata;

      // In case end comes first.
      this._received[id] = msg[2];

      if (!data) {
        break;
      }

      this._ack(id);
      break;
    case 'ack':
      data = odata;
      if (!!data) {
        var ack = msg[2];
        // Take the larger ACK, for out of order messages.
        data.ack = Math.max(ack, data.ack);

        // Clean up when all chunks are ACKed.
        if (data.ack >= data.chunks.length) {
          util.log('Time: ', new Date() - data.timer);
          delete this._outgoing[id];
        } else {
          this._processAcks();
        }
      }
      // If !data, just ignore.
      break;
    // Received a chunk of data.
    case 'chunk':
      // Create a new entry if none exists.
      data = idata;
      if (!data) {
        var end = this._received[id];
        if (end === true) {
          break;
        }
        data = {
          ack: ['ack', id, 0],
          chunks: []
        };
        this._incoming[id] = data;
      }

      var n = msg[2];
      var chunk = msg[3];
      data.chunks[n] = new Uint8Array(chunk);

      // If we get the chunk we're looking for, ACK for next missing.
      // Otherwise, ACK the same N again.
      if (n === data.ack[2]) {
        this._calculateNextAck(id);
      }
      this._ack(id);
      break;
    default:
      // Shouldn't happen, but would make sense for message to just go
      // through as is.
      this._handleSend(msg);
      break;
  }
};

// Chunks BL into smaller messages.
Reliable.prototype._chunk = function(bl) {
  var chunks = [];
  var size = bl.size;
  var start = 0;
  while (start < size) {
    var end = Math.min(size, start + this._mtu);
    var b = bl.slice(start, end);
    var chunk = {
      payload: b
    }
    chunks.push(chunk);
    start = end;
  }
  util.log('Created', chunks.length, 'chunks.');
  return chunks;
};

// Sends ACK N, expecting Nth blob chunk for message ID.
Reliable.prototype._ack = function(id) {
  var ack = this._incoming[id].ack;

  // if ack is the end value, then call _complete.
  if (this._received[id] === ack[2]) {
    this._complete(id);
    this._received[id] = true;
  }

  this._handleSend(ack);
};

// Calculates the next ACK number, given chunks.
Reliable.prototype._calculateNextAck = function(id) {
  var data = this._incoming[id];
  var chunks = data.chunks;
  for (var i = 0, ii = chunks.length; i < ii; i += 1) {
    // This chunk is missing!!! Better ACK for it.
    if (chunks[i] === undefined) {
      data.ack[2] = i;
      return;
    }
  }
  data.ack[2] = chunks.length;
};

// Sends the next window of chunks.
Reliable.prototype._sendWindowedChunks = function(id) {
  util.log('sendWindowedChunks for: ', id);
  var data = this._outgoing[id];
  var ch = data.chunks;
  var chunks = [];
  var limit = Math.min(data.ack + this._window, ch.length);
  for (var i = data.ack; i < limit; i += 1) {
    if (!ch[i].sent || i === data.ack) {
      ch[i].sent = true;
      chunks.push(['chunk', id, i, ch[i].payload]);
    }
  }
  if (data.ack + this._window >= ch.length) {
    chunks.push(['end', id, ch.length])
  }
  chunks._multiple = true;
  this._handleSend(chunks);
};

// Puts together a message from chunks.
Reliable.prototype._complete = function(id) {
  util.log('Completed called for', id);
  var self = this;
  var chunks = this._incoming[id].chunks;
  var bl = new Blob(chunks);
  util.blobToArrayBuffer(bl, function(ab) {
    self.onmessage(util.unpack(ab));
  });
  delete this._incoming[id];
};

// Ups bandwidth limit on SDP. Meant to be called during offer/answer.
Reliable.higherBandwidthSDP = function(sdp) {
  // AS stands for Application-Specific Maximum.
  // Bandwidth number is in kilobits / sec.
  // See RFC for more info: http://www.ietf.org/rfc/rfc2327.txt

  // Chrome 31+ doesn't want us munging the SDP, so we'll let them have their
  // way.
  var version = navigator.appVersion.match(/Chrome\/(.*?) /);
  if (version) {
    version = parseInt(version[1].split('.').shift());
    if (version < 31) {
      var parts = sdp.split('b=AS:30');
      var replace = 'b=AS:102400'; // 100 Mbps
      if (parts.length > 1) {
        return parts[0] + replace + parts[1];
      }
    }
  }

  return sdp;
};

// Overwritten, typically.
Reliable.prototype.onmessage = function(msg) {};

exports.Reliable = Reliable;
exports.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
exports.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
exports.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
var defaultConfig = {'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]};
var dataCount = 1;

var util = {
  noop: function() {},

  CLOUD_HOST: '0.peerjs.com',
  CLOUD_PORT: 9000,

  // Browsers that need chunking:
  chunkedBrowsers: {'Chrome': 1},
  chunkedMTU: 16300, // The original 60000 bytes setting does not work when sending data from Firefox to Chrome, which is "cut off" after 16384 bytes and delivered individually.

  // Logging logic
  logLevel: 0,
  setLogLevel: function(level) {
    var debugLevel = parseInt(level, 10);
    if (!isNaN(parseInt(level, 10))) {
      util.logLevel = debugLevel;
    } else {
      // If they are using truthy/falsy values for debug
      util.logLevel = level ? 3 : 0;
    }
    util.log = util.warn = util.error = util.noop;
    if (util.logLevel > 0) {
      util.error = util._printWith('ERROR');
    }
    if (util.logLevel > 1) {
      util.warn = util._printWith('WARNING');
    }
    if (util.logLevel > 2) {
      util.log = util._print;
    }
  },
  setLogFunction: function(fn) {
    if (fn.constructor !== Function) {
      util.warn('The log function you passed in is not a function. Defaulting to regular logs.');
    } else {
      util._print = fn;
    }
  },

  _printWith: function(prefix) {
    return function() {
      var copy = Array.prototype.slice.call(arguments);
      copy.unshift(prefix);
      util._print.apply(util, copy);
    };
  },
  _print: function () {
    var err = false;
    var copy = Array.prototype.slice.call(arguments);
    copy.unshift('PeerJS: ');
    for (var i = 0, l = copy.length; i < l; i++){
      if (copy[i] instanceof Error) {
        copy[i] = '(' + copy[i].name + ') ' + copy[i].message;
        err = true;
      }
    }
    err ? console.error.apply(console, copy) : console.log.apply(console, copy);
  },
  //

  // Returns browser-agnostic default config
  defaultConfig: defaultConfig,
  //

  // Returns the current browser.
  browser: (function() {
    if (window.mozRTCPeerConnection) {
      return 'Firefox';
    } else if (window.webkitRTCPeerConnection) {
      return 'Chrome';
    } else if (window.RTCPeerConnection) {
      return 'Supported';
    } else {
      return 'Unsupported';
    }
  })(),
  //

  // Lists which features are supported
  supports: (function() {
    if (typeof RTCPeerConnection === 'undefined') {
      return {};
    }

    var data = true;
    var audioVideo = true;

    var binaryBlob = false;
    var sctp = false;
    var onnegotiationneeded = !!window.webkitRTCPeerConnection;

    var pc, dc;
    try {
      pc = new RTCPeerConnection(defaultConfig, {optional: [{RtpDataChannels: true}]});
    } catch (e) {
      data = false;
      audioVideo = false;
    }

    if (data) {
      try {
        dc = pc.createDataChannel('_PEERJSTEST');
      } catch (e) {
        data = false;
      }
    }

    if (data) {
      // Binary test
      try {
        dc.binaryType = 'blob';
        binaryBlob = true;
      } catch (e) {
      }

      // Reliable test.
      // Unfortunately Chrome is a bit unreliable about whether or not they
      // support reliable.
      var reliablePC = new RTCPeerConnection(defaultConfig, {});
      try {
        var reliableDC = reliablePC.createDataChannel('_PEERJSRELIABLETEST', {});
        sctp = reliableDC.reliable;
      } catch (e) {
      }
      reliablePC.close();
    }

    // FIXME: not really the best check...
    if (audioVideo) {
      audioVideo = !!pc.addStream;
    }

    // FIXME: this is not great because in theory it doesn't work for
    // av-only browsers (?).
    if (!onnegotiationneeded && data) {
      // sync default check.
      var negotiationPC = new RTCPeerConnection(defaultConfig, {optional: [{RtpDataChannels: true}]});
      negotiationPC.onnegotiationneeded = function() {
        onnegotiationneeded = true;
        // async check.
        if (util && util.supports) {
          util.supports.onnegotiationneeded = true;
        }
      };
      var negotiationDC = negotiationPC.createDataChannel('_PEERJSNEGOTIATIONTEST');

      setTimeout(function() {
        negotiationPC.close();
      }, 1000);
    }

    if (pc) {
      pc.close();
    }

    return {
      audioVideo: audioVideo,
      data: data,
      binaryBlob: binaryBlob,
      binary: sctp, // deprecated; sctp implies binary support.
      reliable: sctp, // deprecated; sctp implies reliable data.
      sctp: sctp,
      onnegotiationneeded: onnegotiationneeded
    };
  }()),
  //

  // Ensure alphanumeric ids
  validateId: function(id) {
    // Allow empty ids
    return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(id);
  },

  validateKey: function(key) {
    // Allow empty keys
    return !key || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(key);
  },


  debug: false,

  inherits: function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  },
  extend: function(dest, source) {
    for(var key in source) {
      if(source.hasOwnProperty(key)) {
        dest[key] = source[key];
      }
    }
    return dest;
  },
  pack: BinaryPack.pack,
  unpack: BinaryPack.unpack,

  log: function () {
    if (util.debug) {
      var err = false;
      var copy = Array.prototype.slice.call(arguments);
      copy.unshift('PeerJS: ');
      for (var i = 0, l = copy.length; i < l; i++){
        if (copy[i] instanceof Error) {
          copy[i] = '(' + copy[i].name + ') ' + copy[i].message;
          err = true;
        }
      }
      err ? console.error.apply(console, copy) : console.log.apply(console, copy);
    }
  },

  setZeroTimeout: (function(global) {
    var timeouts = [];
    var messageName = 'zero-timeout-message';

    // Like setTimeout, but only takes a function argument.  There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function setZeroTimeoutPostMessage(fn) {
      timeouts.push(fn);
      global.postMessage(messageName, '*');
    }

    function handleMessage(event) {
      if (event.source == global && event.data == messageName) {
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        if (timeouts.length) {
          timeouts.shift()();
        }
      }
    }
    if (global.addEventListener) {
      global.addEventListener('message', handleMessage, true);
    } else if (global.attachEvent) {
      global.attachEvent('onmessage', handleMessage);
    }
    return setZeroTimeoutPostMessage;
  }(this)),

  // Binary stuff

  // chunks a blob.
  chunk: function(bl) {
    var chunks = [];
    var size = bl.size;
    var start = index = 0;
    var total = Math.ceil(size / util.chunkedMTU);
    while (start < size) {
      var end = Math.min(size, start + util.chunkedMTU);
      var b = bl.slice(start, end);

      var chunk = {
        __peerData: dataCount,
        n: index,
        data: b,
        total: total
      };

      chunks.push(chunk);

      start = end;
      index += 1;
    }
    dataCount += 1;
    return chunks;
  },

  blobToArrayBuffer: function(blob, cb){
    var fr = new FileReader();
    fr.onload = function(evt) {
      cb(evt.target.result);
    };
    fr.readAsArrayBuffer(blob);
  },
  blobToBinaryString: function(blob, cb){
    var fr = new FileReader();
    fr.onload = function(evt) {
      cb(evt.target.result);
    };
    fr.readAsBinaryString(blob);
  },
  binaryStringToArrayBuffer: function(binary) {
    var byteArray = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      byteArray[i] = binary.charCodeAt(i) & 0xff;
    }
    return byteArray.buffer;
  },
  randomToken: function () {
    return Math.random().toString(36).substr(2);
  },
  //

  isSecure: function() {
    return location.protocol === 'https:';
  }
};

exports.util = util;
/**
 * A peer who can initiate connections with other peers.
 */
function Peer(id, options) {
  if (!(this instanceof Peer)) return new Peer(id, options);
  EventEmitter.call(this);

  // Deal with overloading
  if (id && id.constructor == Object) {
    options = id;
    id = undefined;
  } else if (id) {
    // Ensure id is a string
    id = id.toString();
  }
  //

  // Configurize options
  options = util.extend({
    debug: 0, // 1: Errors, 2: Warnings, 3: All logs
    host: util.CLOUD_HOST,
    port: util.CLOUD_PORT,
    key: 'peerjs',
    path: '/',
    token: util.randomToken(),
    config: util.defaultConfig
  }, options);
  this.options = options;
  // Detect relative URL host.
  if (options.host === '/') {
    options.host = window.location.hostname;
  }
  // Set path correctly.
  if (options.path[0] !== '/') {
    options.path = '/' + options.path;
  }
  if (options.path[options.path.length - 1] !== '/') {
    options.path += '/';
  }

  // Set whether we use SSL to same as current host
  if (options.secure === undefined && options.host !== util.CLOUD_HOST) {
    options.secure = util.isSecure();
  }
  // Set a custom log function if present
  if (options.logFunction) {
    util.setLogFunction(options.logFunction);
  }
  util.setLogLevel(options.debug);
  //

  // Sanity checks
  // Ensure WebRTC supported
  if (!util.supports.audioVideo && !util.supports.data ) {
    this._delayedAbort('browser-incompatible', 'The current browser does not support WebRTC');
    return;
  }
  // Ensure alphanumeric id
  if (!util.validateId(id)) {
    this._delayedAbort('invalid-id', 'ID "' + id + '" is invalid');
    return;
  }
  // Ensure valid key
  if (!util.validateKey(options.key)) {
    this._delayedAbort('invalid-key', 'API KEY "' + options.key + '" is invalid');
    return;
  }
  // Ensure not using unsecure cloud server on SSL page
  if (options.secure && options.host === '0.peerjs.com') {
    this._delayedAbort('ssl-unavailable',
      'The cloud server currently does not support HTTPS. Please run your own PeerServer to use HTTPS.');
    return;
  }
  //

  // States.
  this.destroyed = false; // Connections have been killed
  this.disconnected = false; // Connection to PeerServer killed but P2P connections still active
  this.open = false; // Sockets and such are not yet open.
  //

  // References
  this.connections = {}; // DataConnections for this peer.
  this._lostMessages = {}; // src => [list of messages]
  //

  // Start the server connection
  this._initializeServerConnection();
  if (id) {
    this._initialize(id);
  } else {
    this._retrieveId();
  }
  //
};

util.inherits(Peer, EventEmitter);

// Initialize the 'socket' (which is actually a mix of XHR streaming and
// websockets.)
Peer.prototype._initializeServerConnection = function() {
  var self = this;
  this.socket = new Socket(this.options.secure, this.options.host, this.options.port, this.options.path, this.options.key);
  this.socket.on('message', function(data) {
    self._handleMessage(data);
  });
  this.socket.on('error', function(error) {
    self._abort('socket-error', error);
  });
  this.socket.on('disconnected', function() {
    // If we haven't explicitly disconnected, emit error and disconnect.
    if (!self.disconnected) {
      self.emitError('network', 'Lost connection to server.')
      self.disconnect();
    }
  });
  this.socket.on('close', function() {
    // If we haven't explicitly disconnected, emit error.
    if (!self.disconnected) {
      self._abort('socket-closed', 'Underlying socket is already closed.');
    }
  });
};

/** Get a unique ID from the server via XHR. */
Peer.prototype._retrieveId = function(cb) {
  var self = this;
  var http = new XMLHttpRequest();
  var protocol = this.options.secure ? 'https://' : 'http://';
  var url = protocol + this.options.host + ':' + this.options.port
    + this.options.path + this.options.key + '/id';
  var queryString = '?ts=' + new Date().getTime() + '' + Math.random();
  url += queryString;

  // If there's no ID we need to wait for one before trying to init socket.
  http.open('get', url, true);
  http.onerror = function(e) {
    util.error('Error retrieving ID', e);
    var pathError = '';
    if (self.options.path === '/' && self.options.host !== util.CLOUD_HOST) {
      pathError = ' If you passed in a `path` to your self-hosted PeerServer, '
        + 'you\'ll also need to pass in that same path when creating a new'
        + ' Peer.';
    }
    self._abort('server-error', 'Could not get an ID from the server.' + pathError);
  }
  http.onreadystatechange = function() {
    if (http.readyState !== 4) {
      return;
    }
    if (http.status !== 200) {
      http.onerror();
      return;
    }
    self._initialize(http.responseText);
  };
  http.send(null);
};

/** Initialize a connection with the server. */
Peer.prototype._initialize = function(id) {
  this.id = id;
  this.socket.start(this.id, this.options.token);
}

/** Handles messages from the server. */
Peer.prototype._handleMessage = function(message) {
  var type = message.type;
  var payload = message.payload;
  var peer = message.src;

  switch (type) {
    case 'OPEN': // The connection to the server is open.
      this.emit('open', this.id);
      this.open = true;
      break;
    case 'ERROR': // Server error.
      this._abort('server-error', payload.msg);
      break;
    case 'ID-TAKEN': // The selected ID is taken.
      this._abort('unavailable-id', 'ID `' + this.id + '` is taken');
      break;
    case 'INVALID-KEY': // The given API key cannot be found.
      this._abort('invalid-key', 'API KEY "' + this.options.key + '" is invalid');
      break;

    //
    case 'LEAVE': // Another peer has closed its connection to this peer.
      util.log('Received leave message from', peer);
      this._cleanupPeer(peer);
      break;

    case 'EXPIRE': // The offer sent to a peer has expired without response.
      this.emitError('peer-unavailable', 'Could not connect to peer ' + peer);
      break;
    case 'OFFER': // we should consider switching this to CALL/CONNECT, but this is the least breaking option.
      var connectionId = payload.connectionId;
      var connection = this.getConnection(peer, connectionId);

      if (connection) {
        util.warn('Offer received for existing Connection ID:', connectionId);
        //connection.handleMessage(message);
      } else {
        // Create a new connection.
        if (payload.type === 'media') {
          var connection = new MediaConnection(peer, this, {
            connectionId: connectionId,
            _payload: payload,
            metadata: payload.metadata
          });
          this._addConnection(peer, connection);
          this.emit('call', connection);
        } else if (payload.type === 'data') {
          connection = new DataConnection(peer, this, {
            connectionId: connectionId,
            _payload: payload,
            metadata: payload.metadata,
            label: payload.label,
            serialization: payload.serialization,
            reliable: payload.reliable
          });
          this._addConnection(peer, connection);
          this.emit('connection', connection);
        } else {
          util.warn('Received malformed connection type:', payload.type);
          return;
        }
        // Find messages.
        var messages = this._getMessages(connectionId);
        for (var i = 0, ii = messages.length; i < ii; i += 1) {
          connection.handleMessage(messages[i]);
        }
      }
      break;
    default:
      if (!payload) {
        util.warn('You received a malformed message from ' + peer + ' of type ' + type);
        return;
      }

      var id = payload.connectionId;
      var connection = this.getConnection(peer, id);

      if (connection && connection.pc) {
        // Pass it on.
        connection.handleMessage(message);
      } else if (id) {
        // Store for possible later use
        this._storeMessage(id, message);
      } else {
        util.warn('You received an unrecognized message:', message);
      }
      break;
  }
}

/** Stores messages without a set up connection, to be claimed later. */
Peer.prototype._storeMessage = function(connectionId, message) {
  if (!this._lostMessages[connectionId]) {
    this._lostMessages[connectionId] = [];
  }
  this._lostMessages[connectionId].push(message);
}

/** Retrieve messages from lost message store */
Peer.prototype._getMessages = function(connectionId) {
  var messages = this._lostMessages[connectionId];
  if (messages) {
    delete this._lostMessages[connectionId];
    return messages;
  } else {
    return [];
  }
}

/**
 * Returns a DataConnection to the specified peer. See documentation for a
 * complete list of options.
 */
Peer.prototype.connect = function(peer, options) {
  if (this.disconnected) {
    util.warn('You cannot connect to a new Peer because you called '
        + '.disconnect() on this Peer and ended your connection with the'
        + ' server. You can create a new Peer to reconnect, or call reconnect'
        + ' on this peer if you believe its ID to still be available.');
    this.emitError('disconnected', 'Cannot connect to new Peer after disconnecting from server.');
    return;
  }
  var connection = new DataConnection(peer, this, options);
  this._addConnection(peer, connection);
  return connection;
}

/**
 * Returns a MediaConnection to the specified peer. See documentation for a
 * complete list of options.
 */
Peer.prototype.call = function(peer, stream, options) {
  if (this.disconnected) {
    util.warn('You cannot connect to a new Peer because you called '
        + '.disconnect() on this Peer and ended your connection with the'
        + ' server. You can create a new Peer to reconnect.');
    this.emitError('disconnected', 'Cannot connect to new Peer after disconnecting from server.');
    return;
  }
  if (!stream) {
    util.error('To call a peer, you must provide a stream from your browser\'s `getUserMedia`.');
    return;
  }
  options = options || {};
  options._stream = stream;
  var call = new MediaConnection(peer, this, options);
  this._addConnection(peer, call);
  return call;
}

/** Add a data/media connection to this peer. */
Peer.prototype._addConnection = function(peer, connection) {
  if (!this.connections[peer]) {
    this.connections[peer] = [];
  }
  this.connections[peer].push(connection);
}

/** Retrieve a data/media connection for this peer. */
Peer.prototype.getConnection = function(peer, id) {
  var connections = this.connections[peer];
  if (!connections) {
    return null;
  }
  for (var i = 0, ii = connections.length; i < ii; i++) {
    if (connections[i].id === id) {
      return connections[i];
    }
  }
  return null;
}

Peer.prototype._delayedAbort = function(type, message) {
  var self = this;
  util.setZeroTimeout(function(){
    self._abort(type, message);
  });
}

/**
 * Destroys the Peer and emits an error message.
 * The Peer is not destroyed if it's in a disconnected state, in which case
 * it retains its disconnected state and its existing connections.
 */
Peer.prototype._abort = function(type, message) {
  util.error('Aborting!');
  if (!this._lastServerId) {
    this.destroy();
  } else {
    this.disconnect();
  }
  this.emitError(type, message);
};

/** Emits a typed error message. */
Peer.prototype.emitError = function(type, err) {
  util.error('Error:', err);
  if (typeof err === 'string') {
    err = new Error(err);
  }
  err.type = type;
  this.emit('error', err);
};

/**
 * Destroys the Peer: closes all active connections as well as the connection
 *  to the server.
 * Warning: The peer can no longer create or accept connections after being
 *  destroyed.
 */
Peer.prototype.destroy = function() {
  if (!this.destroyed) {
    this._cleanup();
    this.disconnect();
    this.destroyed = true;
  }
}


/** Disconnects every connection on this peer. */
Peer.prototype._cleanup = function() {
  if (this.connections) {
    var peers = Object.keys(this.connections);
    for (var i = 0, ii = peers.length; i < ii; i++) {
      this._cleanupPeer(peers[i]);
    }
  }
  this.emit('close');
}

/** Closes all connections to this peer. */
Peer.prototype._cleanupPeer = function(peer) {
  var connections = this.connections[peer];
  for (var j = 0, jj = connections.length; j < jj; j += 1) {
    connections[j].close();
  }
}

/**
 * Disconnects the Peer's connection to the PeerServer. Does not close any
 *  active connections.
 * Warning: The peer can no longer create or accept connections after being
 *  disconnected. It also cannot reconnect to the server.
 */
Peer.prototype.disconnect = function() {
  var self = this;
  util.setZeroTimeout(function(){
    if (!self.disconnected) {
      self.disconnected = true;
      self.open = false;
      if (self.socket) {
        self.socket.close();
      }
      self.emit('disconnected', self.id);
      self._lastServerId = self.id;
      self.id = null;
    }
  });
}

/** Attempts to reconnect with the same ID. */
Peer.prototype.reconnect = function() {
  if (this.disconnected && !this.destroyed) {
    util.log('Attempting reconnection to server with ID ' + this._lastServerId);
    this.disconnected = false;
    this._initializeServerConnection();
    this._initialize(this._lastServerId);
  } else if (this.destroyed) {
    throw new Error('This peer cannot reconnect to the server. It has already been destroyed.');
  } else if (!this.disconnected && !this.open) {
    // Do nothing. We're still connecting the first time.
    util.error('In a hurry? We\'re still trying to make the initial connection!');
  } else {
    throw new Error('Peer ' + this.id + ' cannot reconnect because it is not disconnected from the server!');
  }
};

/**
 * Get a list of available peer IDs. If you're running your own server, you'll
 * want to set allow_discovery: true in the PeerServer options. If you're using
 * the cloud server, email team@peerjs.com to get the functionality enabled for
 * your key.
 */
Peer.prototype.listAllPeers = function(cb) {
  cb = cb || function() {};
  var self = this;
  var http = new XMLHttpRequest();
  var protocol = this.options.secure ? 'https://' : 'http://';
  var url = protocol + this.options.host + ':' + this.options.port
    + this.options.path + this.options.key + '/peers';
  var queryString = '?ts=' + new Date().getTime() + '' + Math.random();
  url += queryString;

  // If there's no ID we need to wait for one before trying to init socket.
  http.open('get', url, true);
  http.onerror = function(e) {
    self._abort('server-error', 'Could not get peers from the server.');
    cb([]);
  }
  http.onreadystatechange = function() {
    if (http.readyState !== 4) {
      return;
    }
    if (http.status === 401) {
      var helpfulError = '';
      if (self.options.host !== util.CLOUD_HOST) {
        helpfulError = 'It looks like you\'re using the cloud server. You can email '
          + 'team@peerjs.com to enable peer listing for your API key.';
      } else {
        helpfulError = 'You need to enable `allow_discovery` on your self-hosted'
          + ' PeerServer to use this feature.';
      }
      throw new Error('It doesn\'t look like you have permission to list peers IDs. ' + helpfulError);
      cb([]);
    } else if (http.status !== 200) {
      cb([]);
    } else {
      cb(JSON.parse(http.responseText));
    }
  };
  http.send(null);
}

exports.Peer = Peer;
/**
 * Wraps a DataChannel between two Peers.
 */
function DataConnection(peer, provider, options) {
  if (!(this instanceof DataConnection)) return new DataConnection(peer, provider, options);
  EventEmitter.call(this);

  this.options = util.extend({
    serialization: 'binary',
    reliable: false
  }, options);

  // Connection is not open yet.
  this.open = false;
  this.type = 'data';
  this.peer = peer;
  this.provider = provider;

  this.id = this.options.connectionId || DataConnection._idPrefix + util.randomToken();

  this.label = this.options.label || this.id;
  this.metadata = this.options.metadata;
  this.serialization = this.options.serialization;
  this.reliable = this.options.reliable;

  // Data channel buffering.
  this._buffer = [];
  this._buffering = false;
  this.bufferSize = 0;

  // For storing large data.
  this._chunkedData = {};

  if (this.options._payload) {
    this._peerBrowser = this.options._payload.browser;
  }

  Negotiator.startConnection(
    this,
    this.options._payload || {
      originator: true
    }
  );
}

util.inherits(DataConnection, EventEmitter);

DataConnection._idPrefix = 'dc_';

/** Called by the Negotiator when the DataChannel is ready. */
DataConnection.prototype.initialize = function(dc) {
  this._dc = this.dataChannel = dc;
  this._configureDataChannel();
}

DataConnection.prototype._configureDataChannel = function() {
  var self = this;
  if (util.supports.sctp) {
    this._dc.binaryType = 'arraybuffer';
  }
  this._dc.onopen = function() {
    util.log('Data channel connection success');
    self.open = true;
    self.emit('open');
  }

  // Use the Reliable shim for non Firefox browsers
  if (!util.supports.sctp && this.reliable) {
    this._reliable = new Reliable(this._dc, util.debug);
  }

  if (this._reliable) {
    this._reliable.onmessage = function(msg) {
      self.emit('data', msg);
    };
  } else {
    this._dc.onmessage = function(e) {
      self._handleDataMessage(e);
    };
  }
  this._dc.onclose = function(e) {
    util.log('DataChannel closed for:', self.peer);
    self.close();
  };
}

// Handles a DataChannel message.
DataConnection.prototype._handleDataMessage = function(e) {
  var self = this;
  var data = e.data;
  var datatype = data.constructor;
  if (this.serialization === 'binary' || this.serialization === 'binary-utf8') {
    if (datatype === Blob) {
      // Datatype should never be blob
      util.blobToArrayBuffer(data, function(ab) {
        data = util.unpack(ab);
        self.emit('data', data);
      });
      return;
    } else if (datatype === ArrayBuffer) {
      data = util.unpack(data);
    } else if (datatype === String) {
      // String fallback for binary data for browsers that don't support binary yet
      var ab = util.binaryStringToArrayBuffer(data);
      data = util.unpack(ab);
    }
  } else if (this.serialization === 'json') {
    data = JSON.parse(data);
  }

  // Check if we've chunked--if so, piece things back together.
  // We're guaranteed that this isn't 0.
  if (data.__peerData) {
    var id = data.__peerData;
    var chunkInfo = this._chunkedData[id] || {data: [], count: 0, total: data.total};

    chunkInfo.data[data.n] = data.data;
    chunkInfo.count += 1;

    if (chunkInfo.total === chunkInfo.count) {
      // Clean up before making the recursive call to `_handleDataMessage`.
      delete this._chunkedData[id];

      // We've received all the chunks--time to construct the complete data.
      data = new Blob(chunkInfo.data);
      this._handleDataMessage({data: data});
    }

    this._chunkedData[id] = chunkInfo;
    return;
  }

  this.emit('data', data);
}

/**
 * Exposed functionality for users.
 */

/** Allows user to close connection. */
DataConnection.prototype.close = function() {
  if (!this.open) {
    return;
  }
  this.open = false;
  Negotiator.cleanup(this);
  this.emit('close');
}

/** Allows user to send data. */
DataConnection.prototype.send = function(data, chunked) {
  if (!this.open) {
    this.emit('error', new Error('Connection is not open. You should listen for the `open` event before sending messages.'));
    return;
  }
  if (this._reliable) {
    // Note: reliable shim sending will make it so that you cannot customize
    // serialization.
    this._reliable.send(data);
    return;
  }
  var self = this;
  if (this.serialization === 'json') {
    this._bufferedSend(JSON.stringify(data));
  } else if (this.serialization === 'binary' || this.serialization === 'binary-utf8') {
    var blob = util.pack(data);

    // For Chrome-Firefox interoperability, we need to make Firefox "chunk"
    // the data it sends out.
    var needsChunking = util.chunkedBrowsers[this._peerBrowser] || util.chunkedBrowsers[util.browser];
    if (needsChunking && !chunked && blob.size > util.chunkedMTU) {
      this._sendChunks(blob);
      return;
    }

    // DataChannel currently only supports strings.
    if (!util.supports.sctp) {
      util.blobToBinaryString(blob, function(str) {
        self._bufferedSend(str);
      });
    } else if (!util.supports.binaryBlob) {
      // We only do this if we really need to (e.g. blobs are not supported),
      // because this conversion is costly.
      util.blobToArrayBuffer(blob, function(ab) {
        self._bufferedSend(ab);
      });
    } else {
      this._bufferedSend(blob);
    }
  } else {
    this._bufferedSend(data);
  }
}

DataConnection.prototype._bufferedSend = function(msg) {
  if (this._buffering || !this._trySend(msg)) {
    this._buffer.push(msg);
    this.bufferSize = this._buffer.length;
  }
}

// Returns true if the send succeeds.
DataConnection.prototype._trySend = function(msg) {
  try {
    this._dc.send(msg);
  } catch (e) {
    this._buffering = true;

    var self = this;
    setTimeout(function() {
      // Try again.
      self._buffering = false;
      self._tryBuffer();
    }, 100);
    return false;
  }
  return true;
}

// Try to send the first message in the buffer.
DataConnection.prototype._tryBuffer = function() {
  if (this._buffer.length === 0) {
    return;
  }

  var msg = this._buffer[0];

  if (this._trySend(msg)) {
    this._buffer.shift();
    this.bufferSize = this._buffer.length;
    this._tryBuffer();
  }
}

DataConnection.prototype._sendChunks = function(blob) {
  var blobs = util.chunk(blob);
  for (var i = 0, ii = blobs.length; i < ii; i += 1) {
    var blob = blobs[i];
    this.send(blob, true);
  }
}

DataConnection.prototype.handleMessage = function(message) {
  var payload = message.payload;

  switch (message.type) {
    case 'ANSWER':
      this._peerBrowser = payload.browser;

      // Forward to negotiator
      Negotiator.handleSDP(message.type, this, payload.sdp);
      break;
    case 'CANDIDATE':
      Negotiator.handleCandidate(this, payload.candidate);
      break;
    default:
      util.warn('Unrecognized message type:', message.type, 'from peer:', this.peer);
      break;
  }
}
/**
 * Wraps the streaming interface between two Peers.
 */
function MediaConnection(peer, provider, options) {
  if (!(this instanceof MediaConnection)) return new MediaConnection(peer, provider, options);
  EventEmitter.call(this);

  this.options = util.extend({}, options);

  this.open = false;
  this.type = 'media';
  this.peer = peer;
  this.provider = provider;
  this.metadata = this.options.metadata;
  this.localStream = this.options._stream;

  this.id = this.options.connectionId || MediaConnection._idPrefix + util.randomToken();
  if (this.localStream) {
    Negotiator.startConnection(
      this,
      {_stream: this.localStream, originator: true}
    );
  }
};

util.inherits(MediaConnection, EventEmitter);

MediaConnection._idPrefix = 'mc_';

MediaConnection.prototype.addStream = function(remoteStream) {
  util.log('Receiving stream', remoteStream);

  this.remoteStream = remoteStream;
  this.emit('stream', remoteStream); // Should we call this `open`?

};

MediaConnection.prototype.handleMessage = function(message) {
  var payload = message.payload;

  switch (message.type) {
    case 'ANSWER':
      // Forward to negotiator
      Negotiator.handleSDP(message.type, this, payload.sdp);
      this.open = true;
      break;
    case 'CANDIDATE':
      Negotiator.handleCandidate(this, payload.candidate);
      break;
    default:
      util.warn('Unrecognized message type:', message.type, 'from peer:', this.peer);
      break;
  }
}

MediaConnection.prototype.answer = function(stream) {
  if (this.localStream) {
    util.warn('Local stream already exists on this MediaConnection. Are you answering a call twice?');
    return;
  }

  this.options._payload._stream = stream;

  this.localStream = stream;
  Negotiator.startConnection(
    this,
    this.options._payload
  )
  // Retrieve lost messages stored because PeerConnection not set up.
  var messages = this.provider._getMessages(this.id);
  for (var i = 0, ii = messages.length; i < ii; i += 1) {
    this.handleMessage(messages[i]);
  }
  this.open = true;
};

/**
 * Exposed functionality for users.
 */

/** Allows user to close connection. */
MediaConnection.prototype.close = function() {
  if (!this.open) {
    return;
  }
  this.open = false;
  Negotiator.cleanup(this);
  this.emit('close')
};
/**
 * Manages all negotiations between Peers.
 */
var Negotiator = {
  pcs: {
    data: {},
    media: {}
  }, // type => {peerId: {pc_id: pc}}.
  //providers: {}, // provider's id => providers (there may be multiple providers/client.
  queue: [] // connections that are delayed due to a PC being in use.
}

Negotiator._idPrefix = 'pc_';

/** Returns a PeerConnection object set up correctly (for data, media). */
Negotiator.startConnection = function(connection, options) {
  var pc = Negotiator._getPeerConnection(connection, options);

  if (connection.type === 'media' && options._stream) {
    // Add the stream.
    pc.addStream(options._stream);
  }

  // Set the connection's PC.
  connection.pc = connection.peerConnection = pc;
  // What do we need to do now?
  if (options.originator) {
    if (connection.type === 'data') {
      // Create the datachannel.
      var config = {};
      // Dropping reliable:false support, since it seems to be crashing
      // Chrome.
      /*if (util.supports.sctp && !options.reliable) {
        // If we have canonical reliable support...
        config = {maxRetransmits: 0};
      }*/
      // Fallback to ensure older browsers don't crash.
      if (!util.supports.sctp) {
        config = {reliable: options.reliable};
      }
      var dc = pc.createDataChannel(connection.label, config);
      connection.initialize(dc);
    }

    if (!util.supports.onnegotiationneeded) {
      Negotiator._makeOffer(connection);
    }
  } else {
    Negotiator.handleSDP('OFFER', connection, options.sdp);
  }
}

Negotiator._getPeerConnection = function(connection, options) {
  if (!Negotiator.pcs[connection.type]) {
    util.error(connection.type + ' is not a valid connection type. Maybe you overrode the `type` property somewhere.');
  }

  if (!Negotiator.pcs[connection.type][connection.peer]) {
    Negotiator.pcs[connection.type][connection.peer] = {};
  }
  var peerConnections = Negotiator.pcs[connection.type][connection.peer];

  var pc;
  // Not multiplexing while FF and Chrome have not-great support for it.
  /*if (options.multiplex) {
    ids = Object.keys(peerConnections);
    for (var i = 0, ii = ids.length; i < ii; i += 1) {
      pc = peerConnections[ids[i]];
      if (pc.signalingState === 'stable') {
        break; // We can go ahead and use this PC.
      }
    }
  } else */
  if (options.pc) { // Simplest case: PC id already provided for us.
    pc = Negotiator.pcs[connection.type][connection.peer][options.pc];
  }

  if (!pc || pc.signalingState !== 'stable') {
    pc = Negotiator._startPeerConnection(connection);
  }
  return pc;
}

/*
Negotiator._addProvider = function(provider) {
  if ((!provider.id && !provider.disconnected) || !provider.socket.open) {
    // Wait for provider to obtain an ID.
    provider.on('open', function(id) {
      Negotiator._addProvider(provider);
    });
  } else {
    Negotiator.providers[provider.id] = provider;
  }
}*/


/** Start a PC. */
Negotiator._startPeerConnection = function(connection) {
  util.log('Creating RTCPeerConnection.');

  var id = Negotiator._idPrefix + util.randomToken();
  var optional = {};

  if (connection.type === 'data' && !util.supports.sctp) {
    optional = {optional: [{RtpDataChannels: true}]};
  } else if (connection.type === 'media') {
    // Interop req for chrome.
    optional = {optional: [{DtlsSrtpKeyAgreement: true}]};
  }

  var pc = new RTCPeerConnection(connection.provider.options.config, optional);
  Negotiator.pcs[connection.type][connection.peer][id] = pc;

  Negotiator._setupListeners(connection, pc, id);

  return pc;
}

/** Set up various WebRTC listeners. */
Negotiator._setupListeners = function(connection, pc, pc_id) {
  var peerId = connection.peer;
  var connectionId = connection.id;
  var provider = connection.provider;

  // ICE CANDIDATES.
  util.log('Listening for ICE candidates.');
  pc.onicecandidate = function(evt) {
    if (evt.candidate) {
      util.log('Received ICE candidates for:', connection.peer);
      provider.socket.send({
        type: 'CANDIDATE',
        payload: {
          candidate: evt.candidate,
          type: connection.type,
          connectionId: connection.id
        },
        dst: peerId
      });
    }
  };

  pc.oniceconnectionstatechange = function() {
    switch (pc.iceConnectionState) {
      case 'disconnected':
      case 'failed':
        util.log('iceConnectionState is disconnected, closing connections to ' + peerId);
        connection.close();
        break;
      case 'completed':
        pc.onicecandidate = util.noop;
        break;
    }
  };

  // Fallback for older Chrome impls.
  pc.onicechange = pc.oniceconnectionstatechange;

  // ONNEGOTIATIONNEEDED (Chrome)
  util.log('Listening for `negotiationneeded`');
  pc.onnegotiationneeded = function() {
    util.log('`negotiationneeded` triggered');
    if (pc.signalingState == 'stable') {
      Negotiator._makeOffer(connection);
    } else {
      util.log('onnegotiationneeded triggered when not stable. Is another connection being established?');
    }
  };

  // DATACONNECTION.
  util.log('Listening for data channel');
  // Fired between offer and answer, so options should already be saved
  // in the options hash.
  pc.ondatachannel = function(evt) {
    util.log('Received data channel');
    var dc = evt.channel;
    var connection = provider.getConnection(peerId, connectionId);
    connection.initialize(dc);
  };

  // MEDIACONNECTION.
  util.log('Listening for remote stream');
  pc.onaddstream = function(evt) {
    util.log('Received remote stream');
    var stream = evt.stream;
    provider.getConnection(peerId, connectionId).addStream(stream);
  };
}

Negotiator.cleanup = function(connection) {
  util.log('Cleaning up PeerConnection to ' + connection.peer);

  var pc = connection.pc;

  if (!!pc && (pc.readyState !== 'closed' || pc.signalingState !== 'closed')) {
    pc.close();
    connection.pc = null;
  }
}

Negotiator._makeOffer = function(connection) {
  var pc = connection.pc;
  pc.createOffer(function(offer) {
    util.log('Created offer.');

    if (!util.supports.sctp && connection.type === 'data' && connection.reliable) {
      offer.sdp = Reliable.higherBandwidthSDP(offer.sdp);
    }

    pc.setLocalDescription(offer, function() {
      util.log('Set localDescription: offer', 'for:', connection.peer);
      connection.provider.socket.send({
        type: 'OFFER',
        payload: {
          sdp: offer,
          type: connection.type,
          label: connection.label,
          connectionId: connection.id,
          reliable: connection.reliable,
          serialization: connection.serialization,
          metadata: connection.metadata,
          browser: util.browser
        },
        dst: connection.peer
      });
    }, function(err) {
      connection.provider.emitError('webrtc', err);
      util.log('Failed to setLocalDescription, ', err);
    });
  }, function(err) {
    connection.provider.emitError('webrtc', err);
    util.log('Failed to createOffer, ', err);
  }, connection.options.constraints);
}

Negotiator._makeAnswer = function(connection) {
  var pc = connection.pc;

  pc.createAnswer(function(answer) {
    util.log('Created answer.');

    if (!util.supports.sctp && connection.type === 'data' && connection.reliable) {
      answer.sdp = Reliable.higherBandwidthSDP(answer.sdp);
    }

    pc.setLocalDescription(answer, function() {
      util.log('Set localDescription: answer', 'for:', connection.peer);
      connection.provider.socket.send({
        type: 'ANSWER',
        payload: {
          sdp: answer,
          type: connection.type,
          connectionId: connection.id,
          browser: util.browser
        },
        dst: connection.peer
      });
    }, function(err) {
      connection.provider.emitError('webrtc', err);
      util.log('Failed to setLocalDescription, ', err);
    });
  }, function(err) {
    connection.provider.emitError('webrtc', err);
    util.log('Failed to create answer, ', err);
  });
}

/** Handle an SDP. */
Negotiator.handleSDP = function(type, connection, sdp) {
  sdp = new RTCSessionDescription(sdp);
  var pc = connection.pc;

  util.log('Setting remote description', sdp);
  pc.setRemoteDescription(sdp, function() {
    util.log('Set remoteDescription:', type, 'for:', connection.peer);

    if (type === 'OFFER') {
      Negotiator._makeAnswer(connection);
    }
  }, function(err) {
    connection.provider.emitError('webrtc', err);
    util.log('Failed to setRemoteDescription, ', err);
  });
}

/** Handle a candidate. */
Negotiator.handleCandidate = function(connection, ice) {
  var candidate = ice.candidate;
  var sdpMLineIndex = ice.sdpMLineIndex;
  connection.pc.addIceCandidate(new RTCIceCandidate({
    sdpMLineIndex: sdpMLineIndex,
    candidate: candidate
  }));
  util.log('Added ICE candidate for:', connection.peer);
}
/**
 * An abstraction on top of WebSockets and XHR streaming to provide fastest
 * possible connection for peers.
 */
function Socket(secure, host, port, path, key) {
  if (!(this instanceof Socket)) return new Socket(secure, host, port, path, key);

  EventEmitter.call(this);

  // Disconnected manually.
  this.disconnected = false;
  this._queue = [];

  var httpProtocol = secure ? 'https://' : 'http://';
  var wsProtocol = secure ? 'wss://' : 'ws://';
  this._httpUrl = httpProtocol + host + ':' + port + path + key;
  this._wsUrl = wsProtocol + host + ':' + port + path + 'peerjs?key=' + key;
}

util.inherits(Socket, EventEmitter);


/** Check in with ID or get one from server. */
Socket.prototype.start = function(id, token) {
  this.id = id;

  this._httpUrl += '/' + id + '/' + token;
  this._wsUrl += '&id=' + id + '&token=' + token;

  this._startXhrStream();
  this._startWebSocket();
}


/** Start up websocket communications. */
Socket.prototype._startWebSocket = function(id) {
  var self = this;

  if (this._socket) {
    return;
  }

  this._socket = new WebSocket(this._wsUrl);

  this._socket.onmessage = function(event) {
    try {
      var data = JSON.parse(event.data);
      self.emit('message', data);
    } catch(e) {
      util.log('Invalid server message', event.data);
      return;
    }
  };

  this._socket.onclose = function(event) {
    util.log('Socket closed.');
    self.disconnected = true;
    self.emit('disconnected');
  };

  // Take care of the queue of connections if necessary and make sure Peer knows
  // socket is open.
  this._socket.onopen = function() {
    if (self._timeout) {
      clearTimeout(self._timeout);
      setTimeout(function(){
        self._http.abort();
        self._http = null;
      }, 5000);
    }
    self._sendQueuedMessages();
    util.log('Socket open');
  };
}

/** Start XHR streaming. */
Socket.prototype._startXhrStream = function(n) {
  try {
    var self = this;
    this._http = new XMLHttpRequest();
    this._http._index = 1;
    this._http._streamIndex = n || 0;
    this._http.open('post', this._httpUrl + '/id?i=' + this._http._streamIndex, true);
    this._http.onerror = function() {
      // If we get an error, likely something went wrong.
      // Stop streaming.
      clearTimeout(self._timeout);
      self.emit('disconnected');
    }
    this._http.onreadystatechange = function() {
      if (this.readyState == 2 && this.old) {
        this.old.abort();
        delete this.old;
      } else if (this.readyState > 2 && this.status === 200 && this.responseText) {
        self._handleStream(this);
      }
    };
    this._http.send(null);
    this._setHTTPTimeout();
  } catch(e) {
    util.log('XMLHttpRequest not available; defaulting to WebSockets');
  }
}


/** Handles onreadystatechange response as a stream. */
Socket.prototype._handleStream = function(http) {
  // 3 and 4 are loading/done state. All others are not relevant.
  var messages = http.responseText.split('\n');

  // Check to see if anything needs to be processed on buffer.
  if (http._buffer) {
    while (http._buffer.length > 0) {
      var index = http._buffer.shift();
      var bufferedMessage = messages[index];
      try {
        bufferedMessage = JSON.parse(bufferedMessage);
      } catch(e) {
        http._buffer.shift(index);
        break;
      }
      this.emit('message', bufferedMessage);
    }
  }

  var message = messages[http._index];
  if (message) {
    http._index += 1;
    // Buffering--this message is incomplete and we'll get to it next time.
    // This checks if the httpResponse ended in a `\n`, in which case the last
    // element of messages should be the empty string.
    if (http._index === messages.length) {
      if (!http._buffer) {
        http._buffer = [];
      }
      http._buffer.push(http._index - 1);
    } else {
      try {
        message = JSON.parse(message);
      } catch(e) {
        util.log('Invalid server message', message);
        return;
      }
      this.emit('message', message);
    }
  }
}

Socket.prototype._setHTTPTimeout = function() {
  var self = this;
  this._timeout = setTimeout(function() {
    var old = self._http;
    if (!self._wsOpen()) {
      self._startXhrStream(old._streamIndex + 1);
      self._http.old = old;
    } else {
      old.abort();
    }
  }, 25000);
}

/** Is the websocket currently open? */
Socket.prototype._wsOpen = function() {
  return this._socket && this._socket.readyState == 1;
}

/** Send queued messages. */
Socket.prototype._sendQueuedMessages = function() {
  for (var i = 0, ii = this._queue.length; i < ii; i += 1) {
    this.send(this._queue[i]);
  }
}

/** Exposed send for DC & Peer. */
Socket.prototype.send = function(data) {
  if (this.disconnected) {
    return;
  }

  // If we didn't get an ID yet, we can't yet send anything so we should queue
  // up these messages.
  if (!this.id) {
    this._queue.push(data);
    return;
  }

  if (!data.type) {
    this.emit('error', 'Invalid message');
    return;
  }

  var message = JSON.stringify(data);
  if (this._wsOpen()) {
    this._socket.send(message);
  } else {
    var http = new XMLHttpRequest();
    var url = this._httpUrl + '/' + data.type.toLowerCase();
    http.open('post', url, true);
    http.setRequestHeader('Content-Type', 'application/json');
    http.send(message);
  }
}

Socket.prototype.close = function() {
  if (!this.disconnected && this._wsOpen()) {
    this._socket.close();
    this.disconnected = true;
  }
}

})(this);

},{}],4:[function(require,module,exports){
(function (process,global){
(function() {
var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requirejs = require = requireModule = function(name) {
  requirejs._eak_seen = registry;

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("promise/all", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */

    var isArray = __dependency1__.isArray;
    var isFunction = __dependency1__.isFunction;

    /**
      Returns a promise that is fulfilled when all the given promises have been
      fulfilled, or rejected if any of them become rejected. The return promise
      is fulfilled with an array that gives all the values in the order they were
      passed in the `promises` array argument.

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.resolve(2);
      var promise3 = RSVP.resolve(3);
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `RSVP.all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.reject(new Error("2"));
      var promise3 = RSVP.reject(new Error("3"));
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @for RSVP
      @param {Array} promises
      @param {String} label
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
    */
    function all(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && isFunction(promise.then)) {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }

    __exports__.all = all;
  });
define("promise/asap", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function asap(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }

    __exports__.asap = asap;
  });
define("promise/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var config = {
      instrument: false
    };

    function configure(name, value) {
      if (arguments.length === 2) {
        config[name] = value;
      } else {
        return config[name];
      }
    }

    __exports__.config = config;
    __exports__.configure = configure;
  });
define("promise/polyfill", 
  ["./promise","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global self*/
    var RSVPPromise = __dependency1__.Promise;
    var isFunction = __dependency2__.isFunction;

    function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport = 
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = RSVPPromise;
      }
    }

    __exports__.polyfill = polyfill;
  });
define("promise/promise", 
  ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var configure = __dependency1__.configure;
    var objectOrFunction = __dependency2__.objectOrFunction;
    var isFunction = __dependency2__.isFunction;
    var now = __dependency2__.now;
    var all = __dependency3__.all;
    var race = __dependency4__.race;
    var staticResolve = __dependency5__.resolve;
    var staticReject = __dependency6__.reject;
    var asap = __dependency7__.asap;

    var counter = 0;

    config.async = asap; // default async is asap;

    function Promise(resolver) {
      if (!isFunction(resolver)) {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }

      if (!(this instanceof Promise)) {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }

      this._subscribers = [];

      invokeResolver(resolver, this);
    }

    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }

      function rejectPromise(reason) {
        reject(promise, reason);
      }

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (settled === FULFILLED) {
        resolve(promise, value);
      } else if (settled === REJECTED) {
        reject(promise, value);
      }
    }

    var PENDING   = void 0;
    var SEALED    = 0;
    var FULFILLED = 1;
    var REJECTED  = 2;

    function subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      subscribers[length] = child;
      subscribers[length + FULFILLED] = onFulfillment;
      subscribers[length + REJECTED]  = onRejection;
    }

    function publish(promise, settled) {
      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        invokeCallback(settled, child, callback, detail);
      }

      promise._subscribers = null;
    }

    Promise.prototype = {
      constructor: Promise,

      _state: undefined,
      _detail: undefined,
      _subscribers: undefined,

      then: function(onFulfillment, onRejection) {
        var promise = this;

        var thenPromise = new this.constructor(function() {});

        if (this._state) {
          var callbacks = arguments;
          config.async(function invokePromiseCallback() {
            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
          });
        } else {
          subscribe(this, thenPromise, onFulfillment, onRejection);
        }

        return thenPromise;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    Promise.all = all;
    Promise.race = race;
    Promise.resolve = staticResolve;
    Promise.reject = staticReject;

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        if (resolved) { return true; }
        reject(promise, error);
        return true;
      }

      return false;
    }

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = value;

      config.async(publishFulfillment, promise);
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = reason;

      config.async(publishRejection, promise);
    }

    function publishFulfillment(promise) {
      publish(promise, promise._state = FULFILLED);
    }

    function publishRejection(promise) {
      publish(promise, promise._state = REJECTED);
    }

    __exports__.Promise = Promise;
  });
define("promise/race", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */
    var isArray = __dependency1__.isArray;

    /**
      `RSVP.race` allows you to watch a series of promises and act as soon as the
      first promise given to the `promises` argument fulfills or rejects.

      Example:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 2");
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // result === "promise 2" because it was resolved before promise1
        // was resolved.
      });
      ```

      `RSVP.race` is deterministic in that only the state of the first completed
      promise matters. For example, even if other promises given to the `promises`
      array argument are resolved, but the first completed promise has become
      rejected before the other promises became fulfilled, the returned promise
      will become rejected:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error("promise 2"));
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // Code here never runs because there are rejected promises!
      }, function(reason){
        // reason.message === "promise2" because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      @method race
      @for RSVP
      @param {Array} promises array of promises to observe
      @param {String} label optional string for describing the promise returned.
      Useful for tooling.
      @return {Promise} a promise that becomes fulfilled with the value the first
      completed promises is resolved with if the first completed promise was
      fulfilled, or rejected with the reason that the first completed promise
      was rejected with.
    */
    function race(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to race.');
      }
      return new Promise(function(resolve, reject) {
        var results = [], promise;

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolve, reject);
          } else {
            resolve(promise);
          }
        }
      });
    }

    __exports__.race = race;
  });
define("promise/reject", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.reject` returns a promise that will become rejected with the passed
      `reason`. `RSVP.reject` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @for RSVP
      @param {Any} reason value that the returned promise will be rejected with.
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become rejected with the given
      `reason`.
    */
    function reject(reason) {
      /*jshint validthis:true */
      var Promise = this;

      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    __exports__.reject = reject;
  });
define("promise/resolve", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function resolve(value) {
      /*jshint validthis:true */
      if (value && typeof value === 'object' && value.constructor === this) {
        return value;
      }

      var Promise = this;

      return new Promise(function(resolve) {
        resolve(value);
      });
    }

    __exports__.resolve = resolve;
  });
define("promise/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x) {
      return typeof x === "function";
    }

    function isArray(x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    }

    // Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };


    __exports__.objectOrFunction = objectOrFunction;
    __exports__.isFunction = isFunction;
    __exports__.isArray = isArray;
    __exports__.now = now;
  });
requireModule('promise/polyfill').polyfill();
}());
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":2}],5:[function(require,module,exports){
var settings_local = {};
try {
  settings_local = require('./settings_local.js');
} catch (e) {
}

var settings = {
  API_URL: 'http://localhost:5000',  // This URL to the Galaxy API. No trailing slash.
  PEER_KEY: 'fcdc4q2kljcq5mi',  // Sign up for a key at http://peerjs.com/peerserver
  VERSION: '0.0.1'  // Version of the `gamepad.js` script
};

for (var key in settings_local) {
  settings[key] = settings_local[key];
}

module.exports = settings;

},{"./settings_local.js":6}],6:[function(require,module,exports){
module.exports = {
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9tYWluLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvcGVlci5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvcHJvbWlzZS0xLjAuMC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5nc19sb2NhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3cUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBwZWVyID0gcmVxdWlyZSgnLi9saWIvcGVlcicpO1xudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLTEuMC4wJyk7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcblxudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xuXG5cbmlmICghKCdwZXJmb3JtYW5jZScgaW4gd2luZG93KSkge1xuICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgbm93OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiArbmV3IERhdGUoKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRyYWNlKHRleHQpIHtcbiAgY29uc29sZS5sb2coKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyBcIjogXCIgKyB0ZXh0KTtcbn1cblxuXG4vKipcbiAqIEEgbGlicmFyeSBmb3IgY29udHJvbGxpbmcgYW4gSFRNTDUgZ2FtZSB1c2luZyBXZWJSVEMuXG4gKlxuICogQGV4cG9ydHMgZ2FtZXBhZFxuICogQG5hbWVzcGFjZSBnYW1lcGFkXG4gKi9cbmZ1bmN0aW9uIGdhbWVwYWQoKSB7XG59XG5cbi8qXG5cbjEuIFlvdXIgUEMgY29ubmVjdHMgdG8gdGhlIHNlcnZlci5cbjIuIFRoZSBzZXJ2ZXIgZ2l2ZXMgeW91ciBQQyBhIHJhbmRvbWx5IGdlbmVyYXRlZCBudW1iZXIgYW5kIHJlbWVtYmVycyB0aGUgY29tYmluYXRpb24gb2YgbnVtYmVyIGFuZCBQQy5cbjMuIEZyb20geW91ciBtb2JpbGUgZGV2aWNlLCBzcGVjaWZ5IGEgbnVtYmVyIGFuZCBjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuXG40LiBJZiB0aGUgbnVtYmVyIHNwZWNpZmllZCBpcyB0aGUgc2FtZSBhcyBmcm9tIGEgY29ubmVjdGVkIFBDLCB5b3VyIG1vYmlsZSBkZXZpY2UgaXMgcGFpcmVkIHdpdGggdGhhdCBQQy5cbjUuIElmIHRoZXJlIGlzIG5vIGRlc2lnbmF0ZWQgUEMsIGFuIGVycm9yIG9jY3Vycy5cbjYuIFdoZW4gZGF0YSBjb21lcyBpbiBmcm9tIHlvdXIgbW9iaWxlIGRldmljZSwgaXQgaXMgc2VudCB0byB0aGUgUEMgd2l0aCB3aGljaCBpdCBpcyBwYWlyZWQsIGFuZCB2aWNlIHZlcnNhLlxuXG4qL1xuXG4vKipcbiAqIEF1dGhlbnRpY2F0ZXMgYSB1c2VyLlxuICpcbiAqIE9wZW5zIGEgbW9kYWwgdGhhdCBvdmVybGF5cyB0aGUgZ2FtZSwgcHJvbXB0aW5nIHRoZSB1c2VyIHRvIHNpZ24gaW4uXG4gKiBSZXR1cm5zIGEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggYSBgVXNlcmAgb2JqZWN0IGZvciB0aGUgdXNlci5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqIEBtZW1iZXJPZiBnYWxheHlcbiAqL1xuZ2FtZXBhZC5jb25uZWN0VG9QZWVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGluID0gKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcuaHRtbCcpID9cbiAgICB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKSA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdWJzdHIoMSkpO1xuXG4gIHZhciBwID0gbmV3IFBlZXIocGluLCB7a2V5OiBzZXR0aW5ncy5QRUVSX0tFWX0pO1xuICBwLm9uKCdvcGVuJywgZnVuY3Rpb24gKGlkKSB7XG4gICAgdHJhY2UoJ015IHBlZXIgSUQ6ICcgKyBpZCk7XG4gIH0pO1xufTtcblxuZ2FtZXBhZC52ZXJzaW9uID0gc2V0dGluZ3MuVkVSU0lPTjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWVwYWQ7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIi8qISBwZWVyanMuanMgYnVpbGQ6MC4zLjksIGRldmVsb3BtZW50LiBDb3B5cmlnaHQoYykgMjAxMyBNaWNoZWxsZSBCdSA8bWljaGVsbGVAbWljaGVsbGVidS5jb20+ICovXG4oZnVuY3Rpb24oZXhwb3J0cyl7XG52YXIgYmluYXJ5RmVhdHVyZXMgPSB7fTtcbmJpbmFyeUZlYXR1cmVzLnVzZUJsb2JCdWlsZGVyID0gKGZ1bmN0aW9uKCl7XG4gIHRyeSB7XG4gICAgbmV3IEJsb2IoW10pO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59KSgpO1xuXG5iaW5hcnlGZWF0dXJlcy51c2VBcnJheUJ1ZmZlclZpZXcgPSAhYmluYXJ5RmVhdHVyZXMudXNlQmxvYkJ1aWxkZXIgJiYgKGZ1bmN0aW9uKCl7XG4gIHRyeSB7XG4gICAgcmV0dXJuIChuZXcgQmxvYihbbmV3IFVpbnQ4QXJyYXkoW10pXSkpLnNpemUgPT09IDA7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSkoKTtcblxuZXhwb3J0cy5iaW5hcnlGZWF0dXJlcyA9IGJpbmFyeUZlYXR1cmVzO1xuZXhwb3J0cy5CbG9iQnVpbGRlciA9IHdpbmRvdy5XZWJLaXRCbG9iQnVpbGRlciB8fCB3aW5kb3cuTW96QmxvYkJ1aWxkZXIgfHwgd2luZG93Lk1TQmxvYkJ1aWxkZXIgfHwgd2luZG93LkJsb2JCdWlsZGVyO1xuXG5mdW5jdGlvbiBCdWZmZXJCdWlsZGVyKCl7XG4gIHRoaXMuX3BpZWNlcyA9IFtdO1xuICB0aGlzLl9wYXJ0cyA9IFtdO1xufVxuXG5CdWZmZXJCdWlsZGVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihkYXRhKSB7XG4gIGlmKHR5cGVvZiBkYXRhID09PSAnbnVtYmVyJykge1xuICAgIHRoaXMuX3BpZWNlcy5wdXNoKGRhdGEpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZmx1c2goKTtcbiAgICB0aGlzLl9wYXJ0cy5wdXNoKGRhdGEpO1xuICB9XG59O1xuXG5CdWZmZXJCdWlsZGVyLnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fcGllY2VzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5fcGllY2VzKTtcbiAgICBpZighYmluYXJ5RmVhdHVyZXMudXNlQXJyYXlCdWZmZXJWaWV3KSB7XG4gICAgICBidWYgPSBidWYuYnVmZmVyO1xuICAgIH1cbiAgICB0aGlzLl9wYXJ0cy5wdXNoKGJ1Zik7XG4gICAgdGhpcy5fcGllY2VzID0gW107XG4gIH1cbn07XG5cbkJ1ZmZlckJ1aWxkZXIucHJvdG90eXBlLmdldEJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmZsdXNoKCk7XG4gIGlmKGJpbmFyeUZlYXR1cmVzLnVzZUJsb2JCdWlsZGVyKSB7XG4gICAgdmFyIGJ1aWxkZXIgPSBuZXcgQmxvYkJ1aWxkZXIoKTtcbiAgICBmb3IodmFyIGkgPSAwLCBpaSA9IHRoaXMuX3BhcnRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgIGJ1aWxkZXIuYXBwZW5kKHRoaXMuX3BhcnRzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIGJ1aWxkZXIuZ2V0QmxvYigpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQmxvYih0aGlzLl9wYXJ0cyk7XG4gIH1cbn07XG5leHBvcnRzLkJpbmFyeVBhY2sgPSB7XG4gIHVucGFjazogZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIHVucGFja2VyID0gbmV3IFVucGFja2VyKGRhdGEpO1xuICAgIHJldHVybiB1bnBhY2tlci51bnBhY2soKTtcbiAgfSxcbiAgcGFjazogZnVuY3Rpb24oZGF0YSl7XG4gICAgdmFyIHBhY2tlciA9IG5ldyBQYWNrZXIoKTtcbiAgICBwYWNrZXIucGFjayhkYXRhKTtcbiAgICB2YXIgYnVmZmVyID0gcGFja2VyLmdldEJ1ZmZlcigpO1xuICAgIHJldHVybiBidWZmZXI7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIFVucGFja2VyIChkYXRhKXtcbiAgLy8gRGF0YSBpcyBBcnJheUJ1ZmZlclxuICB0aGlzLmluZGV4ID0gMDtcbiAgdGhpcy5kYXRhQnVmZmVyID0gZGF0YTtcbiAgdGhpcy5kYXRhVmlldyA9IG5ldyBVaW50OEFycmF5KHRoaXMuZGF0YUJ1ZmZlcik7XG4gIHRoaXMubGVuZ3RoID0gdGhpcy5kYXRhQnVmZmVyLmJ5dGVMZW5ndGg7XG59XG5cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFjayA9IGZ1bmN0aW9uKCl7XG4gIHZhciB0eXBlID0gdGhpcy51bnBhY2tfdWludDgoKTtcbiAgaWYgKHR5cGUgPCAweDgwKXtcbiAgICB2YXIgcG9zaXRpdmVfZml4bnVtID0gdHlwZTtcbiAgICByZXR1cm4gcG9zaXRpdmVfZml4bnVtO1xuICB9IGVsc2UgaWYgKCh0eXBlIF4gMHhlMCkgPCAweDIwKXtcbiAgICB2YXIgbmVnYXRpdmVfZml4bnVtID0gKHR5cGUgXiAweGUwKSAtIDB4MjA7XG4gICAgcmV0dXJuIG5lZ2F0aXZlX2ZpeG51bTtcbiAgfVxuICB2YXIgc2l6ZTtcbiAgaWYgKChzaXplID0gdHlwZSBeIDB4YTApIDw9IDB4MGYpe1xuICAgIHJldHVybiB0aGlzLnVucGFja19yYXcoc2l6ZSk7XG4gIH0gZWxzZSBpZiAoKHNpemUgPSB0eXBlIF4gMHhiMCkgPD0gMHgwZil7XG4gICAgcmV0dXJuIHRoaXMudW5wYWNrX3N0cmluZyhzaXplKTtcbiAgfSBlbHNlIGlmICgoc2l6ZSA9IHR5cGUgXiAweDkwKSA8PSAweDBmKXtcbiAgICByZXR1cm4gdGhpcy51bnBhY2tfYXJyYXkoc2l6ZSk7XG4gIH0gZWxzZSBpZiAoKHNpemUgPSB0eXBlIF4gMHg4MCkgPD0gMHgwZil7XG4gICAgcmV0dXJuIHRoaXMudW5wYWNrX21hcChzaXplKTtcbiAgfVxuICBzd2l0Y2godHlwZSl7XG4gICAgY2FzZSAweGMwOlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgY2FzZSAweGMxOlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjYXNlIDB4YzI6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY2FzZSAweGMzOlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY2FzZSAweGNhOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2Zsb2F0KCk7XG4gICAgY2FzZSAweGNiOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2RvdWJsZSgpO1xuICAgIGNhc2UgMHhjYzpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja191aW50OCgpO1xuICAgIGNhc2UgMHhjZDpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja191aW50MTYoKTtcbiAgICBjYXNlIDB4Y2U6XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gICAgY2FzZSAweGNmOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX3VpbnQ2NCgpO1xuICAgIGNhc2UgMHhkMDpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19pbnQ4KCk7XG4gICAgY2FzZSAweGQxOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2ludDE2KCk7XG4gICAgY2FzZSAweGQyOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2ludDMyKCk7XG4gICAgY2FzZSAweGQzOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2ludDY0KCk7XG4gICAgY2FzZSAweGQ0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjYXNlIDB4ZDU6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNhc2UgMHhkNjpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY2FzZSAweGQ3OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjYXNlIDB4ZDg6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDE2KCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfc3RyaW5nKHNpemUpO1xuICAgIGNhc2UgMHhkOTpcbiAgICAgIHNpemUgPSB0aGlzLnVucGFja191aW50MzIoKTtcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19zdHJpbmcoc2l6ZSk7XG4gICAgY2FzZSAweGRhOlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQxNigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX3JhdyhzaXplKTtcbiAgICBjYXNlIDB4ZGI6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfcmF3KHNpemUpO1xuICAgIGNhc2UgMHhkYzpcbiAgICAgIHNpemUgPSB0aGlzLnVucGFja191aW50MTYoKTtcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19hcnJheShzaXplKTtcbiAgICBjYXNlIDB4ZGQ6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfYXJyYXkoc2l6ZSk7XG4gICAgY2FzZSAweGRlOlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQxNigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX21hcChzaXplKTtcbiAgICBjYXNlIDB4ZGY6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfbWFwKHNpemUpO1xuICB9XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfdWludDggPSBmdW5jdGlvbigpe1xuICB2YXIgYnl0ZSA9IHRoaXMuZGF0YVZpZXdbdGhpcy5pbmRleF0gJiAweGZmO1xuICB0aGlzLmluZGV4Kys7XG4gIHJldHVybiBieXRlO1xufTtcblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja191aW50MTYgPSBmdW5jdGlvbigpe1xuICB2YXIgYnl0ZXMgPSB0aGlzLnJlYWQoMik7XG4gIHZhciB1aW50MTYgPVxuICAgICgoYnl0ZXNbMF0gJiAweGZmKSAqIDI1NikgKyAoYnl0ZXNbMV0gJiAweGZmKTtcbiAgdGhpcy5pbmRleCArPSAyO1xuICByZXR1cm4gdWludDE2O1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX3VpbnQzMiA9IGZ1bmN0aW9uKCl7XG4gIHZhciBieXRlcyA9IHRoaXMucmVhZCg0KTtcbiAgdmFyIHVpbnQzMiA9XG4gICAgICgoYnl0ZXNbMF0gICogMjU2ICtcbiAgICAgICBieXRlc1sxXSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzJdKSAqIDI1NiArXG4gICAgICAgYnl0ZXNbM107XG4gIHRoaXMuaW5kZXggKz0gNDtcbiAgcmV0dXJuIHVpbnQzMjtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja191aW50NjQgPSBmdW5jdGlvbigpe1xuICB2YXIgYnl0ZXMgPSB0aGlzLnJlYWQoOCk7XG4gIHZhciB1aW50NjQgPVxuICAgKCgoKCgoYnl0ZXNbMF0gICogMjU2ICtcbiAgICAgICBieXRlc1sxXSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzJdKSAqIDI1NiArXG4gICAgICAgYnl0ZXNbM10pICogMjU2ICtcbiAgICAgICBieXRlc1s0XSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzVdKSAqIDI1NiArXG4gICAgICAgYnl0ZXNbNl0pICogMjU2ICtcbiAgICAgICBieXRlc1s3XTtcbiAgdGhpcy5pbmRleCArPSA4O1xuICByZXR1cm4gdWludDY0O1xufVxuXG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfaW50OCA9IGZ1bmN0aW9uKCl7XG4gIHZhciB1aW50OCA9IHRoaXMudW5wYWNrX3VpbnQ4KCk7XG4gIHJldHVybiAodWludDggPCAweDgwICkgPyB1aW50OCA6IHVpbnQ4IC0gKDEgPDwgOCk7XG59O1xuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2ludDE2ID0gZnVuY3Rpb24oKXtcbiAgdmFyIHVpbnQxNiA9IHRoaXMudW5wYWNrX3VpbnQxNigpO1xuICByZXR1cm4gKHVpbnQxNiA8IDB4ODAwMCApID8gdWludDE2IDogdWludDE2IC0gKDEgPDwgMTYpO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2ludDMyID0gZnVuY3Rpb24oKXtcbiAgdmFyIHVpbnQzMiA9IHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICByZXR1cm4gKHVpbnQzMiA8IE1hdGgucG93KDIsIDMxKSApID8gdWludDMyIDpcbiAgICB1aW50MzIgLSBNYXRoLnBvdygyLCAzMik7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfaW50NjQgPSBmdW5jdGlvbigpe1xuICB2YXIgdWludDY0ID0gdGhpcy51bnBhY2tfdWludDY0KCk7XG4gIHJldHVybiAodWludDY0IDwgTWF0aC5wb3coMiwgNjMpICkgPyB1aW50NjQgOlxuICAgIHVpbnQ2NCAtIE1hdGgucG93KDIsIDY0KTtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19yYXcgPSBmdW5jdGlvbihzaXplKXtcbiAgaWYgKCB0aGlzLmxlbmd0aCA8IHRoaXMuaW5kZXggKyBzaXplKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0JpbmFyeVBhY2tGYWlsdXJlOiBpbmRleCBpcyBvdXQgb2YgcmFuZ2UnXG4gICAgICArICcgJyArIHRoaXMuaW5kZXggKyAnICcgKyBzaXplICsgJyAnICsgdGhpcy5sZW5ndGgpO1xuICB9XG4gIHZhciBidWYgPSB0aGlzLmRhdGFCdWZmZXIuc2xpY2UodGhpcy5pbmRleCwgdGhpcy5pbmRleCArIHNpemUpO1xuICB0aGlzLmluZGV4ICs9IHNpemU7XG5cbiAgICAvL2J1ZiA9IHV0aWwuYnVmZmVyVG9TdHJpbmcoYnVmKTtcblxuICByZXR1cm4gYnVmO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX3N0cmluZyA9IGZ1bmN0aW9uKHNpemUpe1xuICB2YXIgYnl0ZXMgPSB0aGlzLnJlYWQoc2l6ZSk7XG4gIHZhciBpID0gMCwgc3RyID0gJycsIGMsIGNvZGU7XG4gIHdoaWxlKGkgPCBzaXplKXtcbiAgICBjID0gYnl0ZXNbaV07XG4gICAgaWYgKCBjIDwgMTI4KXtcbiAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICAgICAgaSsrO1xuICAgIH0gZWxzZSBpZiAoKGMgXiAweGMwKSA8IDMyKXtcbiAgICAgIGNvZGUgPSAoKGMgXiAweGMwKSA8PCA2KSB8IChieXRlc1tpKzFdICYgNjMpO1xuICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICBpICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvZGUgPSAoKGMgJiAxNSkgPDwgMTIpIHwgKChieXRlc1tpKzFdICYgNjMpIDw8IDYpIHxcbiAgICAgICAgKGJ5dGVzW2krMl0gJiA2Myk7XG4gICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgIGkgKz0gMztcbiAgICB9XG4gIH1cbiAgdGhpcy5pbmRleCArPSBzaXplO1xuICByZXR1cm4gc3RyO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2FycmF5ID0gZnVuY3Rpb24oc2l6ZSl7XG4gIHZhciBvYmplY3RzID0gbmV3IEFycmF5KHNpemUpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgc2l6ZSA7IGkrKyl7XG4gICAgb2JqZWN0c1tpXSA9IHRoaXMudW5wYWNrKCk7XG4gIH1cbiAgcmV0dXJuIG9iamVjdHM7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfbWFwID0gZnVuY3Rpb24oc2l6ZSl7XG4gIHZhciBtYXAgPSB7fTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHNpemUgOyBpKyspe1xuICAgIHZhciBrZXkgID0gdGhpcy51bnBhY2soKTtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnVucGFjaygpO1xuICAgIG1hcFtrZXldID0gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19mbG9hdCA9IGZ1bmN0aW9uKCl7XG4gIHZhciB1aW50MzIgPSB0aGlzLnVucGFja191aW50MzIoKTtcbiAgdmFyIHNpZ24gPSB1aW50MzIgPj4gMzE7XG4gIHZhciBleHAgID0gKCh1aW50MzIgPj4gMjMpICYgMHhmZikgLSAxMjc7XG4gIHZhciBmcmFjdGlvbiA9ICggdWludDMyICYgMHg3ZmZmZmYgKSB8IDB4ODAwMDAwO1xuICByZXR1cm4gKHNpZ24gPT0gMCA/IDEgOiAtMSkgKlxuICAgIGZyYWN0aW9uICogTWF0aC5wb3coMiwgZXhwIC0gMjMpO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2RvdWJsZSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBoMzIgPSB0aGlzLnVucGFja191aW50MzIoKTtcbiAgdmFyIGwzMiA9IHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICB2YXIgc2lnbiA9IGgzMiA+PiAzMTtcbiAgdmFyIGV4cCAgPSAoKGgzMiA+PiAyMCkgJiAweDdmZikgLSAxMDIzO1xuICB2YXIgaGZyYWMgPSAoIGgzMiAmIDB4ZmZmZmYgKSB8IDB4MTAwMDAwO1xuICB2YXIgZnJhYyA9IGhmcmFjICogTWF0aC5wb3coMiwgZXhwIC0gMjApICtcbiAgICBsMzIgICAqIE1hdGgucG93KDIsIGV4cCAtIDUyKTtcbiAgcmV0dXJuIChzaWduID09IDAgPyAxIDogLTEpICogZnJhYztcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbihsZW5ndGgpe1xuICB2YXIgaiA9IHRoaXMuaW5kZXg7XG4gIGlmIChqICsgbGVuZ3RoIDw9IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVZpZXcuc3ViYXJyYXkoaiwgaiArIGxlbmd0aCk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCaW5hcnlQYWNrRmFpbHVyZTogcmVhZCBpbmRleCBvdXQgb2YgcmFuZ2UnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBQYWNrZXIoKXtcbiAgdGhpcy5idWZmZXJCdWlsZGVyID0gbmV3IEJ1ZmZlckJ1aWxkZXIoKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5nZXRCdWZmZXIgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5idWZmZXJCdWlsZGVyLmdldEJ1ZmZlcigpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2sgPSBmdW5jdGlvbih2YWx1ZSl7XG4gIHZhciB0eXBlID0gdHlwZW9mKHZhbHVlKTtcbiAgaWYgKHR5cGUgPT0gJ3N0cmluZycpe1xuICAgIHRoaXMucGFja19zdHJpbmcodmFsdWUpO1xuICB9IGVsc2UgaWYgKHR5cGUgPT0gJ251bWJlcicpe1xuICAgIGlmIChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUpe1xuICAgICAgdGhpcy5wYWNrX2ludGVnZXIodmFsdWUpO1xuICAgIH0gZWxzZXtcbiAgICAgIHRoaXMucGFja19kb3VibGUodmFsdWUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09ICdib29sZWFuJyl7XG4gICAgaWYgKHZhbHVlID09PSB0cnVlKXtcbiAgICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjMyk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gZmFsc2Upe1xuICAgICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGMyKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PSAndW5kZWZpbmVkJyl7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGMwKTtcbiAgfSBlbHNlIGlmICh0eXBlID09ICdvYmplY3QnKXtcbiAgICBpZiAodmFsdWUgPT09IG51bGwpe1xuICAgICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGMwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdmFsdWUuY29uc3RydWN0b3I7XG4gICAgICBpZiAoY29uc3RydWN0b3IgPT0gQXJyYXkpe1xuICAgICAgICB0aGlzLnBhY2tfYXJyYXkodmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PSBCbG9iIHx8IGNvbnN0cnVjdG9yID09IEZpbGUpIHtcbiAgICAgICAgdGhpcy5wYWNrX2Jpbih2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09IEFycmF5QnVmZmVyKSB7XG4gICAgICAgIGlmKGJpbmFyeUZlYXR1cmVzLnVzZUFycmF5QnVmZmVyVmlldykge1xuICAgICAgICAgIHRoaXMucGFja19iaW4obmV3IFVpbnQ4QXJyYXkodmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBhY2tfYmluKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgnQllURVNfUEVSX0VMRU1FTlQnIGluIHZhbHVlKXtcbiAgICAgICAgaWYoYmluYXJ5RmVhdHVyZXMudXNlQXJyYXlCdWZmZXJWaWV3KSB7XG4gICAgICAgICAgdGhpcy5wYWNrX2JpbihuZXcgVWludDhBcnJheSh2YWx1ZS5idWZmZXIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBhY2tfYmluKHZhbHVlLmJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29uc3RydWN0b3IgPT0gT2JqZWN0KXtcbiAgICAgICAgdGhpcy5wYWNrX29iamVjdCh2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09IERhdGUpe1xuICAgICAgICB0aGlzLnBhY2tfc3RyaW5nKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9CaW5hcnlQYWNrID09ICdmdW5jdGlvbicpe1xuICAgICAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKHZhbHVlLnRvQmluYXJ5UGFjaygpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVHlwZSBcIicgKyBjb25zdHJ1Y3Rvci50b1N0cmluZygpICsgJ1wiIG5vdCB5ZXQgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignVHlwZSBcIicgKyB0eXBlICsgJ1wiIG5vdCB5ZXQgc3VwcG9ydGVkJyk7XG4gIH1cbiAgdGhpcy5idWZmZXJCdWlsZGVyLmZsdXNoKCk7XG59XG5cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2JpbiA9IGZ1bmN0aW9uKGJsb2Ipe1xuICB2YXIgbGVuZ3RoID0gYmxvYi5sZW5ndGggfHwgYmxvYi5ieXRlTGVuZ3RoIHx8IGJsb2Iuc2l6ZTtcbiAgaWYgKGxlbmd0aCA8PSAweDBmKXtcbiAgICB0aGlzLnBhY2tfdWludDgoMHhhMCArIGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGRhKSA7XG4gICAgdGhpcy5wYWNrX3VpbnQxNihsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmZmZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZGIpO1xuICAgIHRoaXMucGFja191aW50MzIobGVuZ3RoKTtcbiAgfSBlbHNle1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBsZW5ndGgnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZChibG9iKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX3N0cmluZyA9IGZ1bmN0aW9uKHN0cil7XG4gIHZhciBsZW5ndGggPSB1dGY4TGVuZ3RoKHN0cik7XG5cbiAgaWYgKGxlbmd0aCA8PSAweDBmKXtcbiAgICB0aGlzLnBhY2tfdWludDgoMHhiMCArIGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGQ4KSA7XG4gICAgdGhpcy5wYWNrX3VpbnQxNihsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmZmZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZDkpO1xuICAgIHRoaXMucGFja191aW50MzIobGVuZ3RoKTtcbiAgfSBlbHNle1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBsZW5ndGgnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZChzdHIpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfYXJyYXkgPSBmdW5jdGlvbihhcnkpe1xuICB2YXIgbGVuZ3RoID0gYXJ5Lmxlbmd0aDtcbiAgaWYgKGxlbmd0aCA8PSAweDBmKXtcbiAgICB0aGlzLnBhY2tfdWludDgoMHg5MCArIGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGRjKVxuICAgIHRoaXMucGFja191aW50MTYobGVuZ3RoKTtcbiAgfSBlbHNlIGlmIChsZW5ndGggPD0gMHhmZmZmZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGRkKTtcbiAgICB0aGlzLnBhY2tfdWludDMyKGxlbmd0aCk7XG4gIH0gZWxzZXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbGVuZ3RoJyk7XG4gIH1cbiAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aCA7IGkrKyl7XG4gICAgdGhpcy5wYWNrKGFyeVtpXSk7XG4gIH1cbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2ludGVnZXIgPSBmdW5jdGlvbihudW0pe1xuICBpZiAoIC0weDIwIDw9IG51bSAmJiBudW0gPD0gMHg3Zil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZChudW0gJiAweGZmKTtcbiAgfSBlbHNlIGlmICgweDAwIDw9IG51bSAmJiBudW0gPD0gMHhmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGNjKTtcbiAgICB0aGlzLnBhY2tfdWludDgobnVtKTtcbiAgfSBlbHNlIGlmICgtMHg4MCA8PSBudW0gJiYgbnVtIDw9IDB4N2Ype1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkMCk7XG4gICAgdGhpcy5wYWNrX2ludDgobnVtKTtcbiAgfSBlbHNlIGlmICggMHgwMDAwIDw9IG51bSAmJiBudW0gPD0gMHhmZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4Y2QpO1xuICAgIHRoaXMucGFja191aW50MTYobnVtKTtcbiAgfSBlbHNlIGlmICgtMHg4MDAwIDw9IG51bSAmJiBudW0gPD0gMHg3ZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZDEpO1xuICAgIHRoaXMucGFja19pbnQxNihudW0pO1xuICB9IGVsc2UgaWYgKCAweDAwMDAwMDAwIDw9IG51bSAmJiBudW0gPD0gMHhmZmZmZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGNlKTtcbiAgICB0aGlzLnBhY2tfdWludDMyKG51bSk7XG4gIH0gZWxzZSBpZiAoLTB4ODAwMDAwMDAgPD0gbnVtICYmIG51bSA8PSAweDdmZmZmZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZDIpO1xuICAgIHRoaXMucGFja19pbnQzMihudW0pO1xuICB9IGVsc2UgaWYgKC0weDgwMDAwMDAwMDAwMDAwMDAgPD0gbnVtICYmIG51bSA8PSAweDdGRkZGRkZGRkZGRkZGRkYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkMyk7XG4gICAgdGhpcy5wYWNrX2ludDY0KG51bSk7XG4gIH0gZWxzZSBpZiAoMHgwMDAwMDAwMDAwMDAwMDAwIDw9IG51bSAmJiBudW0gPD0gMHhGRkZGRkZGRkZGRkZGRkZGKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4Y2YpO1xuICAgIHRoaXMucGFja191aW50NjQobnVtKTtcbiAgfSBlbHNle1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBpbnRlZ2VyJyk7XG4gIH1cbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2RvdWJsZSA9IGZ1bmN0aW9uKG51bSl7XG4gIHZhciBzaWduID0gMDtcbiAgaWYgKG51bSA8IDApe1xuICAgIHNpZ24gPSAxO1xuICAgIG51bSA9IC1udW07XG4gIH1cbiAgdmFyIGV4cCAgPSBNYXRoLmZsb29yKE1hdGgubG9nKG51bSkgLyBNYXRoLkxOMik7XG4gIHZhciBmcmFjMCA9IG51bSAvIE1hdGgucG93KDIsIGV4cCkgLSAxO1xuICB2YXIgZnJhYzEgPSBNYXRoLmZsb29yKGZyYWMwICogTWF0aC5wb3coMiwgNTIpKTtcbiAgdmFyIGIzMiAgID0gTWF0aC5wb3coMiwgMzIpO1xuICB2YXIgaDMyID0gKHNpZ24gPDwgMzEpIHwgKChleHArMTAyMykgPDwgMjApIHxcbiAgICAgIChmcmFjMSAvIGIzMikgJiAweDBmZmZmZjtcbiAgdmFyIGwzMiA9IGZyYWMxICUgYjMyO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4Y2IpO1xuICB0aGlzLnBhY2tfaW50MzIoaDMyKTtcbiAgdGhpcy5wYWNrX2ludDMyKGwzMik7XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19vYmplY3QgPSBmdW5jdGlvbihvYmope1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgaWYgKGxlbmd0aCA8PSAweDBmKXtcbiAgICB0aGlzLnBhY2tfdWludDgoMHg4MCArIGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGRlKTtcbiAgICB0aGlzLnBhY2tfdWludDE2KGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZmZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkZik7XG4gICAgdGhpcy5wYWNrX3VpbnQzMihsZW5ndGgpO1xuICB9IGVsc2V7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGxlbmd0aCcpO1xuICB9XG4gIGZvcih2YXIgcHJvcCBpbiBvYmope1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpe1xuICAgICAgdGhpcy5wYWNrKHByb3ApO1xuICAgICAgdGhpcy5wYWNrKG9ialtwcm9wXSk7XG4gICAgfVxuICB9XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja191aW50OCA9IGZ1bmN0aW9uKG51bSl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQobnVtKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX3VpbnQxNiA9IGZ1bmN0aW9uKG51bSl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQobnVtID4+IDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKG51bSAmIDB4ZmYpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfdWludDMyID0gZnVuY3Rpb24obnVtKXtcbiAgdmFyIG4gPSBudW0gJiAweGZmZmZmZmZmO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChuICYgMHhmZjAwMDAwMCkgPj4+IDI0KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobiAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG4gJiAweDAwMDBmZjAwKSA+Pj4gIDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChuICYgMHgwMDAwMDBmZikpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfdWludDY0ID0gZnVuY3Rpb24obnVtKXtcbiAgdmFyIGhpZ2ggPSBudW0gLyBNYXRoLnBvdygyLCAzMik7XG4gIHZhciBsb3cgID0gbnVtICUgTWF0aC5wb3coMiwgMzIpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHhmZjAwMDAwMCkgPj4+IDI0KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgoaGlnaCAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGhpZ2ggJiAweDAwMDBmZjAwKSA+Pj4gIDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHgwMDAwMDBmZikpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHhmZjAwMDAwMCkgPj4+IDI0KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobG93ICAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGxvdyAgJiAweDAwMDBmZjAwKSA+Pj4gIDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHgwMDAwMDBmZikpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfaW50OCA9IGZ1bmN0aW9uKG51bSl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQobnVtICYgMHhmZik7XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19pbnQxNiA9IGZ1bmN0aW9uKG51bSl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG51bSAmIDB4ZmYwMCkgPj4gOCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQobnVtICYgMHhmZik7XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19pbnQzMiA9IGZ1bmN0aW9uKG51bSl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG51bSA+Pj4gMjQpICYgMHhmZik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG51bSAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG51bSAmIDB4MDAwMGZmMDApID4+PiA4KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobnVtICYgMHgwMDAwMDBmZikpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfaW50NjQgPSBmdW5jdGlvbihudW0pe1xuICB2YXIgaGlnaCA9IE1hdGguZmxvb3IobnVtIC8gTWF0aC5wb3coMiwgMzIpKTtcbiAgdmFyIGxvdyAgPSBudW0gJSBNYXRoLnBvdygyLCAzMik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGhpZ2ggJiAweGZmMDAwMDAwKSA+Pj4gMjQpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHgwMGZmMDAwMCkgPj4+IDE2KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgoaGlnaCAmIDB4MDAwMGZmMDApID4+PiAgOCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGhpZ2ggJiAweDAwMDAwMGZmKSk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGxvdyAgJiAweGZmMDAwMDAwKSA+Pj4gMjQpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHgwMGZmMDAwMCkgPj4+IDE2KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobG93ICAmIDB4MDAwMGZmMDApID4+PiAgOCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGxvdyAgJiAweDAwMDAwMGZmKSk7XG59XG5cbmZ1bmN0aW9uIF91dGY4UmVwbGFjZShtKXtcbiAgdmFyIGNvZGUgPSBtLmNoYXJDb2RlQXQoMCk7XG5cbiAgaWYoY29kZSA8PSAweDdmZikgcmV0dXJuICcwMCc7XG4gIGlmKGNvZGUgPD0gMHhmZmZmKSByZXR1cm4gJzAwMCc7XG4gIGlmKGNvZGUgPD0gMHgxZmZmZmYpIHJldHVybiAnMDAwMCc7XG4gIGlmKGNvZGUgPD0gMHgzZmZmZmZmKSByZXR1cm4gJzAwMDAwJztcbiAgcmV0dXJuICcwMDAwMDAnO1xufVxuXG5mdW5jdGlvbiB1dGY4TGVuZ3RoKHN0cil7XG4gIGlmIChzdHIubGVuZ3RoID4gNjAwKSB7XG4gICAgLy8gQmxvYiBtZXRob2QgZmFzdGVyIGZvciBsYXJnZSBzdHJpbmdzXG4gICAgcmV0dXJuIChuZXcgQmxvYihbc3RyXSkpLnNpemU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXlxcdTAwMDAtXFx1MDA3Rl0vZywgX3V0ZjhSZXBsYWNlKS5sZW5ndGg7XG4gIH1cbn1cbi8qKlxuICogTGlnaHQgRXZlbnRFbWl0dGVyLiBQb3J0ZWQgZnJvbSBOb2RlLmpzL2V2ZW50cy5qc1xuICogRXJpYyBaaGFuZ1xuICovXG5cbi8qKlxuICogRXZlbnRFbWl0dGVyIGNsYXNzXG4gKiBDcmVhdGVzIGFuIG9iamVjdCB3aXRoIGV2ZW50IHJlZ2lzdGVyaW5nIGFuZCBmaXJpbmcgbWV0aG9kc1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIC8vIEluaXRpYWxpc2UgcmVxdWlyZWQgc3RvcmFnZSB2YXJpYWJsZXNcbiAgdGhpcy5fZXZlbnRzID0ge307XG59XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHNjb3BlLCBvbmNlKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FkZExpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgdHlwZW9mIGxpc3RlbmVyLmxpc3RlbmVyID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG5cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuXG4gIH0gZWxzZSB7XG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBzY29wZSkge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcub25jZSBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBmdW5jdGlvbiBnKCkge1xuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG4gICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHNlbGYub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHNjb3BlKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0FycmF5KGxpc3QpKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSlcbiAgICAgIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKSByZXR1cm4gdGhpcztcbiAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9IGVsc2UgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAgKGxpc3QubGlzdGVuZXIgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKVxuICB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKHR5cGUgJiYgdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICB9XG4gIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuICB2YXIgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChpc0FycmF5KGhhbmRsZXIpKSB7XG4gICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cblxuXG4vKipcbiAqIFJlbGlhYmxlIHRyYW5zZmVyIGZvciBDaHJvbWUgQ2FuYXJ5IERhdGFDaGFubmVsIGltcGwuXG4gKiBBdXRob3I6IEBtaWNoZWxsZWJ1XG4gKi9cbmZ1bmN0aW9uIFJlbGlhYmxlKGRjLCBkZWJ1Zykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVsaWFibGUpKSByZXR1cm4gbmV3IFJlbGlhYmxlKGRjKTtcbiAgdGhpcy5fZGMgPSBkYztcblxuICB1dGlsLmRlYnVnID0gZGVidWc7XG5cbiAgLy8gTWVzc2FnZXMgc2VudC9yZWNlaXZlZCBzbyBmYXIuXG4gIC8vIGlkOiB7IGFjazogbiwgY2h1bmtzOiBbLi4uXSB9XG4gIHRoaXMuX291dGdvaW5nID0ge307XG4gIC8vIGlkOiB7IGFjazogWydhY2snLCBpZCwgbl0sIGNodW5rczogWy4uLl0gfVxuICB0aGlzLl9pbmNvbWluZyA9IHt9O1xuICB0aGlzLl9yZWNlaXZlZCA9IHt9O1xuXG4gIC8vIFdpbmRvdyBzaXplLlxuICB0aGlzLl93aW5kb3cgPSAxMDAwO1xuICAvLyBNVFUuXG4gIHRoaXMuX210dSA9IDUwMDtcbiAgLy8gSW50ZXJ2YWwgZm9yIHNldEludGVydmFsLiBJbiBtcy5cbiAgdGhpcy5faW50ZXJ2YWwgPSAwO1xuXG4gIC8vIE1lc3NhZ2VzIHNlbnQuXG4gIHRoaXMuX2NvdW50ID0gMDtcblxuICAvLyBPdXRnb2luZyBtZXNzYWdlIHF1ZXVlLlxuICB0aGlzLl9xdWV1ZSA9IFtdO1xuXG4gIHRoaXMuX3NldHVwREMoKTtcbn07XG5cbi8vIFNlbmQgYSBtZXNzYWdlIHJlbGlhYmx5LlxuUmVsaWFibGUucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihtc2cpIHtcbiAgLy8gRGV0ZXJtaW5lIGlmIGNodW5raW5nIGlzIG5lY2Vzc2FyeS5cbiAgdmFyIGJsID0gdXRpbC5wYWNrKG1zZyk7XG4gIGlmIChibC5zaXplIDwgdGhpcy5fbXR1KSB7XG4gICAgdGhpcy5faGFuZGxlU2VuZChbJ25vJywgYmxdKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLl9vdXRnb2luZ1t0aGlzLl9jb3VudF0gPSB7XG4gICAgYWNrOiAwLFxuICAgIGNodW5rczogdGhpcy5fY2h1bmsoYmwpXG4gIH07XG5cbiAgaWYgKHV0aWwuZGVidWcpIHtcbiAgICB0aGlzLl9vdXRnb2luZ1t0aGlzLl9jb3VudF0udGltZXIgPSBuZXcgRGF0ZSgpO1xuICB9XG5cbiAgLy8gU2VuZCBwcmVsaW0gd2luZG93LlxuICB0aGlzLl9zZW5kV2luZG93ZWRDaHVua3ModGhpcy5fY291bnQpO1xuICB0aGlzLl9jb3VudCArPSAxO1xufTtcblxuLy8gU2V0IHVwIGludGVydmFsIGZvciBwcm9jZXNzaW5nIHF1ZXVlLlxuUmVsaWFibGUucHJvdG90eXBlLl9zZXR1cEludGVydmFsID0gZnVuY3Rpb24oKSB7XG4gIC8vIFRPRE86IGZhaWwgZ3JhY2VmdWxseS5cblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3RpbWVvdXQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAvLyBGSVhNRTogU3RyaW5nIHN0dWZmIG1ha2VzIHRoaW5ncyB0ZXJyaWJseSBhc3luYy5cbiAgICB2YXIgbXNnID0gc2VsZi5fcXVldWUuc2hpZnQoKTtcbiAgICBpZiAobXNnLl9tdWx0aXBsZSkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbXNnLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICAgICAgc2VsZi5faW50ZXJ2YWxTZW5kKG1zZ1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX2ludGVydmFsU2VuZChtc2cpO1xuICAgIH1cbiAgfSwgdGhpcy5faW50ZXJ2YWwpO1xufTtcblxuUmVsaWFibGUucHJvdG90eXBlLl9pbnRlcnZhbFNlbmQgPSBmdW5jdGlvbihtc2cpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBtc2cgPSB1dGlsLnBhY2sobXNnKTtcbiAgdXRpbC5ibG9iVG9CaW5hcnlTdHJpbmcobXNnLCBmdW5jdGlvbihzdHIpIHtcbiAgICBzZWxmLl9kYy5zZW5kKHN0cik7XG4gIH0pO1xuICBpZiAoc2VsZi5fcXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgY2xlYXJUaW1lb3V0KHNlbGYuX3RpbWVvdXQpO1xuICAgIHNlbGYuX3RpbWVvdXQgPSBudWxsO1xuICAgIC8vc2VsZi5fcHJvY2Vzc0Fja3MoKTtcbiAgfVxufTtcblxuLy8gR28gdGhyb3VnaCBBQ0tzIHRvIHNlbmQgbWlzc2luZyBwaWVjZXMuXG5SZWxpYWJsZS5wcm90b3R5cGUuX3Byb2Nlc3NBY2tzID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGlkIGluIHRoaXMuX291dGdvaW5nKSB7XG4gICAgaWYgKHRoaXMuX291dGdvaW5nLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgdGhpcy5fc2VuZFdpbmRvd2VkQ2h1bmtzKGlkKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEhhbmRsZSBzZW5kaW5nIGEgbWVzc2FnZS5cbi8vIEZJWE1FOiBEb24ndCB3YWl0IGZvciBpbnRlcnZhbCB0aW1lIGZvciBhbGwgbWVzc2FnZXMuLi5cblJlbGlhYmxlLnByb3RvdHlwZS5faGFuZGxlU2VuZCA9IGZ1bmN0aW9uKG1zZykge1xuICB2YXIgcHVzaCA9IHRydWU7XG4gIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMuX3F1ZXVlLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuX3F1ZXVlW2ldO1xuICAgIGlmIChpdGVtID09PSBtc2cpIHtcbiAgICAgIHB1c2ggPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGl0ZW0uX211bHRpcGxlICYmIGl0ZW0uaW5kZXhPZihtc2cpICE9PSAtMSkge1xuICAgICAgcHVzaCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuICBpZiAocHVzaCkge1xuICAgIHRoaXMuX3F1ZXVlLnB1c2gobXNnKTtcbiAgICBpZiAoIXRoaXMuX3RpbWVvdXQpIHtcbiAgICAgIHRoaXMuX3NldHVwSW50ZXJ2YWwoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIFNldCB1cCBEYXRhQ2hhbm5lbCBoYW5kbGVycy5cblJlbGlhYmxlLnByb3RvdHlwZS5fc2V0dXBEQyA9IGZ1bmN0aW9uKCkge1xuICAvLyBIYW5kbGUgdmFyaW91cyBtZXNzYWdlIHR5cGVzLlxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX2RjLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgbXNnID0gZS5kYXRhO1xuICAgIHZhciBkYXRhdHlwZSA9IG1zZy5jb25zdHJ1Y3RvcjtcbiAgICAvLyBGSVhNRTogbXNnIGlzIFN0cmluZyB1bnRpbCBiaW5hcnkgaXMgc3VwcG9ydGVkLlxuICAgIC8vIE9uY2UgdGhhdCBoYXBwZW5zLCB0aGlzIHdpbGwgaGF2ZSB0byBiZSBzbWFydGVyLlxuICAgIGlmIChkYXRhdHlwZSA9PT0gU3RyaW5nKSB7XG4gICAgICB2YXIgYWIgPSB1dGlsLmJpbmFyeVN0cmluZ1RvQXJyYXlCdWZmZXIobXNnKTtcbiAgICAgIG1zZyA9IHV0aWwudW5wYWNrKGFiKTtcbiAgICAgIHNlbGYuX2hhbmRsZU1lc3NhZ2UobXNnKTtcbiAgICB9XG4gIH07XG59O1xuXG4vLyBIYW5kbGVzIGFuIGluY29taW5nIG1lc3NhZ2UuXG5SZWxpYWJsZS5wcm90b3R5cGUuX2hhbmRsZU1lc3NhZ2UgPSBmdW5jdGlvbihtc2cpIHtcbiAgdmFyIGlkID0gbXNnWzFdO1xuICB2YXIgaWRhdGEgPSB0aGlzLl9pbmNvbWluZ1tpZF07XG4gIHZhciBvZGF0YSA9IHRoaXMuX291dGdvaW5nW2lkXTtcbiAgdmFyIGRhdGE7XG4gIHN3aXRjaCAobXNnWzBdKSB7XG4gICAgLy8gTm8gY2h1bmtpbmcgd2FzIGRvbmUuXG4gICAgY2FzZSAnbm8nOlxuICAgICAgdmFyIG1lc3NhZ2UgPSBpZDtcbiAgICAgIGlmICghIW1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5vbm1lc3NhZ2UodXRpbC51bnBhY2sobWVzc2FnZSkpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgLy8gUmVhY2hlZCB0aGUgZW5kIG9mIHRoZSBtZXNzYWdlLlxuICAgIGNhc2UgJ2VuZCc6XG4gICAgICBkYXRhID0gaWRhdGE7XG5cbiAgICAgIC8vIEluIGNhc2UgZW5kIGNvbWVzIGZpcnN0LlxuICAgICAgdGhpcy5fcmVjZWl2ZWRbaWRdID0gbXNnWzJdO1xuXG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2FjayhpZCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdhY2snOlxuICAgICAgZGF0YSA9IG9kYXRhO1xuICAgICAgaWYgKCEhZGF0YSkge1xuICAgICAgICB2YXIgYWNrID0gbXNnWzJdO1xuICAgICAgICAvLyBUYWtlIHRoZSBsYXJnZXIgQUNLLCBmb3Igb3V0IG9mIG9yZGVyIG1lc3NhZ2VzLlxuICAgICAgICBkYXRhLmFjayA9IE1hdGgubWF4KGFjaywgZGF0YS5hY2spO1xuXG4gICAgICAgIC8vIENsZWFuIHVwIHdoZW4gYWxsIGNodW5rcyBhcmUgQUNLZWQuXG4gICAgICAgIGlmIChkYXRhLmFjayA+PSBkYXRhLmNodW5rcy5sZW5ndGgpIHtcbiAgICAgICAgICB1dGlsLmxvZygnVGltZTogJywgbmV3IERhdGUoKSAtIGRhdGEudGltZXIpO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9vdXRnb2luZ1tpZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fcHJvY2Vzc0Fja3MoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gSWYgIWRhdGEsIGp1c3QgaWdub3JlLlxuICAgICAgYnJlYWs7XG4gICAgLy8gUmVjZWl2ZWQgYSBjaHVuayBvZiBkYXRhLlxuICAgIGNhc2UgJ2NodW5rJzpcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBlbnRyeSBpZiBub25lIGV4aXN0cy5cbiAgICAgIGRhdGEgPSBpZGF0YTtcbiAgICAgIGlmICghZGF0YSkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5fcmVjZWl2ZWRbaWRdO1xuICAgICAgICBpZiAoZW5kID09PSB0cnVlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICBhY2s6IFsnYWNrJywgaWQsIDBdLFxuICAgICAgICAgIGNodW5rczogW11cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5faW5jb21pbmdbaWRdID0gZGF0YTtcbiAgICAgIH1cblxuICAgICAgdmFyIG4gPSBtc2dbMl07XG4gICAgICB2YXIgY2h1bmsgPSBtc2dbM107XG4gICAgICBkYXRhLmNodW5rc1tuXSA9IG5ldyBVaW50OEFycmF5KGNodW5rKTtcblxuICAgICAgLy8gSWYgd2UgZ2V0IHRoZSBjaHVuayB3ZSdyZSBsb29raW5nIGZvciwgQUNLIGZvciBuZXh0IG1pc3NpbmcuXG4gICAgICAvLyBPdGhlcndpc2UsIEFDSyB0aGUgc2FtZSBOIGFnYWluLlxuICAgICAgaWYgKG4gPT09IGRhdGEuYWNrWzJdKSB7XG4gICAgICAgIHRoaXMuX2NhbGN1bGF0ZU5leHRBY2soaWQpO1xuICAgICAgfVxuICAgICAgdGhpcy5fYWNrKGlkKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBTaG91bGRuJ3QgaGFwcGVuLCBidXQgd291bGQgbWFrZSBzZW5zZSBmb3IgbWVzc2FnZSB0byBqdXN0IGdvXG4gICAgICAvLyB0aHJvdWdoIGFzIGlzLlxuICAgICAgdGhpcy5faGFuZGxlU2VuZChtc2cpO1xuICAgICAgYnJlYWs7XG4gIH1cbn07XG5cbi8vIENodW5rcyBCTCBpbnRvIHNtYWxsZXIgbWVzc2FnZXMuXG5SZWxpYWJsZS5wcm90b3R5cGUuX2NodW5rID0gZnVuY3Rpb24oYmwpIHtcbiAgdmFyIGNodW5rcyA9IFtdO1xuICB2YXIgc2l6ZSA9IGJsLnNpemU7XG4gIHZhciBzdGFydCA9IDA7XG4gIHdoaWxlIChzdGFydCA8IHNpemUpIHtcbiAgICB2YXIgZW5kID0gTWF0aC5taW4oc2l6ZSwgc3RhcnQgKyB0aGlzLl9tdHUpO1xuICAgIHZhciBiID0gYmwuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgdmFyIGNodW5rID0ge1xuICAgICAgcGF5bG9hZDogYlxuICAgIH1cbiAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgc3RhcnQgPSBlbmQ7XG4gIH1cbiAgdXRpbC5sb2coJ0NyZWF0ZWQnLCBjaHVua3MubGVuZ3RoLCAnY2h1bmtzLicpO1xuICByZXR1cm4gY2h1bmtzO1xufTtcblxuLy8gU2VuZHMgQUNLIE4sIGV4cGVjdGluZyBOdGggYmxvYiBjaHVuayBmb3IgbWVzc2FnZSBJRC5cblJlbGlhYmxlLnByb3RvdHlwZS5fYWNrID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIGFjayA9IHRoaXMuX2luY29taW5nW2lkXS5hY2s7XG5cbiAgLy8gaWYgYWNrIGlzIHRoZSBlbmQgdmFsdWUsIHRoZW4gY2FsbCBfY29tcGxldGUuXG4gIGlmICh0aGlzLl9yZWNlaXZlZFtpZF0gPT09IGFja1syXSkge1xuICAgIHRoaXMuX2NvbXBsZXRlKGlkKTtcbiAgICB0aGlzLl9yZWNlaXZlZFtpZF0gPSB0cnVlO1xuICB9XG5cbiAgdGhpcy5faGFuZGxlU2VuZChhY2spO1xufTtcblxuLy8gQ2FsY3VsYXRlcyB0aGUgbmV4dCBBQ0sgbnVtYmVyLCBnaXZlbiBjaHVua3MuXG5SZWxpYWJsZS5wcm90b3R5cGUuX2NhbGN1bGF0ZU5leHRBY2sgPSBmdW5jdGlvbihpZCkge1xuICB2YXIgZGF0YSA9IHRoaXMuX2luY29taW5nW2lkXTtcbiAgdmFyIGNodW5rcyA9IGRhdGEuY2h1bmtzO1xuICBmb3IgKHZhciBpID0gMCwgaWkgPSBjaHVua3MubGVuZ3RoOyBpIDwgaWk7IGkgKz0gMSkge1xuICAgIC8vIFRoaXMgY2h1bmsgaXMgbWlzc2luZyEhISBCZXR0ZXIgQUNLIGZvciBpdC5cbiAgICBpZiAoY2h1bmtzW2ldID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRhdGEuYWNrWzJdID0gaTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgZGF0YS5hY2tbMl0gPSBjaHVua3MubGVuZ3RoO1xufTtcblxuLy8gU2VuZHMgdGhlIG5leHQgd2luZG93IG9mIGNodW5rcy5cblJlbGlhYmxlLnByb3RvdHlwZS5fc2VuZFdpbmRvd2VkQ2h1bmtzID0gZnVuY3Rpb24oaWQpIHtcbiAgdXRpbC5sb2coJ3NlbmRXaW5kb3dlZENodW5rcyBmb3I6ICcsIGlkKTtcbiAgdmFyIGRhdGEgPSB0aGlzLl9vdXRnb2luZ1tpZF07XG4gIHZhciBjaCA9IGRhdGEuY2h1bmtzO1xuICB2YXIgY2h1bmtzID0gW107XG4gIHZhciBsaW1pdCA9IE1hdGgubWluKGRhdGEuYWNrICsgdGhpcy5fd2luZG93LCBjaC5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gZGF0YS5hY2s7IGkgPCBsaW1pdDsgaSArPSAxKSB7XG4gICAgaWYgKCFjaFtpXS5zZW50IHx8IGkgPT09IGRhdGEuYWNrKSB7XG4gICAgICBjaFtpXS5zZW50ID0gdHJ1ZTtcbiAgICAgIGNodW5rcy5wdXNoKFsnY2h1bmsnLCBpZCwgaSwgY2hbaV0ucGF5bG9hZF0pO1xuICAgIH1cbiAgfVxuICBpZiAoZGF0YS5hY2sgKyB0aGlzLl93aW5kb3cgPj0gY2gubGVuZ3RoKSB7XG4gICAgY2h1bmtzLnB1c2goWydlbmQnLCBpZCwgY2gubGVuZ3RoXSlcbiAgfVxuICBjaHVua3MuX211bHRpcGxlID0gdHJ1ZTtcbiAgdGhpcy5faGFuZGxlU2VuZChjaHVua3MpO1xufTtcblxuLy8gUHV0cyB0b2dldGhlciBhIG1lc3NhZ2UgZnJvbSBjaHVua3MuXG5SZWxpYWJsZS5wcm90b3R5cGUuX2NvbXBsZXRlID0gZnVuY3Rpb24oaWQpIHtcbiAgdXRpbC5sb2coJ0NvbXBsZXRlZCBjYWxsZWQgZm9yJywgaWQpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBjaHVua3MgPSB0aGlzLl9pbmNvbWluZ1tpZF0uY2h1bmtzO1xuICB2YXIgYmwgPSBuZXcgQmxvYihjaHVua3MpO1xuICB1dGlsLmJsb2JUb0FycmF5QnVmZmVyKGJsLCBmdW5jdGlvbihhYikge1xuICAgIHNlbGYub25tZXNzYWdlKHV0aWwudW5wYWNrKGFiKSk7XG4gIH0pO1xuICBkZWxldGUgdGhpcy5faW5jb21pbmdbaWRdO1xufTtcblxuLy8gVXBzIGJhbmR3aWR0aCBsaW1pdCBvbiBTRFAuIE1lYW50IHRvIGJlIGNhbGxlZCBkdXJpbmcgb2ZmZXIvYW5zd2VyLlxuUmVsaWFibGUuaGlnaGVyQmFuZHdpZHRoU0RQID0gZnVuY3Rpb24oc2RwKSB7XG4gIC8vIEFTIHN0YW5kcyBmb3IgQXBwbGljYXRpb24tU3BlY2lmaWMgTWF4aW11bS5cbiAgLy8gQmFuZHdpZHRoIG51bWJlciBpcyBpbiBraWxvYml0cyAvIHNlYy5cbiAgLy8gU2VlIFJGQyBmb3IgbW9yZSBpbmZvOiBodHRwOi8vd3d3LmlldGYub3JnL3JmYy9yZmMyMzI3LnR4dFxuXG4gIC8vIENocm9tZSAzMSsgZG9lc24ndCB3YW50IHVzIG11bmdpbmcgdGhlIFNEUCwgc28gd2UnbGwgbGV0IHRoZW0gaGF2ZSB0aGVpclxuICAvLyB3YXkuXG4gIHZhciB2ZXJzaW9uID0gbmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goL0Nocm9tZVxcLyguKj8pIC8pO1xuICBpZiAodmVyc2lvbikge1xuICAgIHZlcnNpb24gPSBwYXJzZUludCh2ZXJzaW9uWzFdLnNwbGl0KCcuJykuc2hpZnQoKSk7XG4gICAgaWYgKHZlcnNpb24gPCAzMSkge1xuICAgICAgdmFyIHBhcnRzID0gc2RwLnNwbGl0KCdiPUFTOjMwJyk7XG4gICAgICB2YXIgcmVwbGFjZSA9ICdiPUFTOjEwMjQwMCc7IC8vIDEwMCBNYnBzXG4gICAgICBpZiAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4gcGFydHNbMF0gKyByZXBsYWNlICsgcGFydHNbMV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNkcDtcbn07XG5cbi8vIE92ZXJ3cml0dGVuLCB0eXBpY2FsbHkuXG5SZWxpYWJsZS5wcm90b3R5cGUub25tZXNzYWdlID0gZnVuY3Rpb24obXNnKSB7fTtcblxuZXhwb3J0cy5SZWxpYWJsZSA9IFJlbGlhYmxlO1xuZXhwb3J0cy5SVENTZXNzaW9uRGVzY3JpcHRpb24gPSB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8IHdpbmRvdy5tb3pSVENTZXNzaW9uRGVzY3JpcHRpb247XG5leHBvcnRzLlJUQ1BlZXJDb25uZWN0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8IHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbiB8fCB3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG5leHBvcnRzLlJUQ0ljZUNhbmRpZGF0ZSA9IHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgfHwgd2luZG93Lm1velJUQ0ljZUNhbmRpZGF0ZTtcbnZhciBkZWZhdWx0Q29uZmlnID0geydpY2VTZXJ2ZXJzJzogW3sgJ3VybCc6ICdzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyJyB9XX07XG52YXIgZGF0YUNvdW50ID0gMTtcblxudmFyIHV0aWwgPSB7XG4gIG5vb3A6IGZ1bmN0aW9uKCkge30sXG5cbiAgQ0xPVURfSE9TVDogJzAucGVlcmpzLmNvbScsXG4gIENMT1VEX1BPUlQ6IDkwMDAsXG5cbiAgLy8gQnJvd3NlcnMgdGhhdCBuZWVkIGNodW5raW5nOlxuICBjaHVua2VkQnJvd3NlcnM6IHsnQ2hyb21lJzogMX0sXG4gIGNodW5rZWRNVFU6IDE2MzAwLCAvLyBUaGUgb3JpZ2luYWwgNjAwMDAgYnl0ZXMgc2V0dGluZyBkb2VzIG5vdCB3b3JrIHdoZW4gc2VuZGluZyBkYXRhIGZyb20gRmlyZWZveCB0byBDaHJvbWUsIHdoaWNoIGlzIFwiY3V0IG9mZlwiIGFmdGVyIDE2Mzg0IGJ5dGVzIGFuZCBkZWxpdmVyZWQgaW5kaXZpZHVhbGx5LlxuXG4gIC8vIExvZ2dpbmcgbG9naWNcbiAgbG9nTGV2ZWw6IDAsXG4gIHNldExvZ0xldmVsOiBmdW5jdGlvbihsZXZlbCkge1xuICAgIHZhciBkZWJ1Z0xldmVsID0gcGFyc2VJbnQobGV2ZWwsIDEwKTtcbiAgICBpZiAoIWlzTmFOKHBhcnNlSW50KGxldmVsLCAxMCkpKSB7XG4gICAgICB1dGlsLmxvZ0xldmVsID0gZGVidWdMZXZlbDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhleSBhcmUgdXNpbmcgdHJ1dGh5L2ZhbHN5IHZhbHVlcyBmb3IgZGVidWdcbiAgICAgIHV0aWwubG9nTGV2ZWwgPSBsZXZlbCA/IDMgOiAwO1xuICAgIH1cbiAgICB1dGlsLmxvZyA9IHV0aWwud2FybiA9IHV0aWwuZXJyb3IgPSB1dGlsLm5vb3A7XG4gICAgaWYgKHV0aWwubG9nTGV2ZWwgPiAwKSB7XG4gICAgICB1dGlsLmVycm9yID0gdXRpbC5fcHJpbnRXaXRoKCdFUlJPUicpO1xuICAgIH1cbiAgICBpZiAodXRpbC5sb2dMZXZlbCA+IDEpIHtcbiAgICAgIHV0aWwud2FybiA9IHV0aWwuX3ByaW50V2l0aCgnV0FSTklORycpO1xuICAgIH1cbiAgICBpZiAodXRpbC5sb2dMZXZlbCA+IDIpIHtcbiAgICAgIHV0aWwubG9nID0gdXRpbC5fcHJpbnQ7XG4gICAgfVxuICB9LFxuICBzZXRMb2dGdW5jdGlvbjogZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAoZm4uY29uc3RydWN0b3IgIT09IEZ1bmN0aW9uKSB7XG4gICAgICB1dGlsLndhcm4oJ1RoZSBsb2cgZnVuY3Rpb24geW91IHBhc3NlZCBpbiBpcyBub3QgYSBmdW5jdGlvbi4gRGVmYXVsdGluZyB0byByZWd1bGFyIGxvZ3MuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHV0aWwuX3ByaW50ID0gZm47XG4gICAgfVxuICB9LFxuXG4gIF9wcmludFdpdGg6IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb3B5ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGNvcHkudW5zaGlmdChwcmVmaXgpO1xuICAgICAgdXRpbC5fcHJpbnQuYXBwbHkodXRpbCwgY29weSk7XG4gICAgfTtcbiAgfSxcbiAgX3ByaW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVyciA9IGZhbHNlO1xuICAgIHZhciBjb3B5ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBjb3B5LnVuc2hpZnQoJ1BlZXJKUzogJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjb3B5Lmxlbmd0aDsgaSA8IGw7IGkrKyl7XG4gICAgICBpZiAoY29weVtpXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIGNvcHlbaV0gPSAnKCcgKyBjb3B5W2ldLm5hbWUgKyAnKSAnICsgY29weVtpXS5tZXNzYWdlO1xuICAgICAgICBlcnIgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBlcnIgPyBjb25zb2xlLmVycm9yLmFwcGx5KGNvbnNvbGUsIGNvcHkpIDogY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgY29weSk7XG4gIH0sXG4gIC8vXG5cbiAgLy8gUmV0dXJucyBicm93c2VyLWFnbm9zdGljIGRlZmF1bHQgY29uZmlnXG4gIGRlZmF1bHRDb25maWc6IGRlZmF1bHRDb25maWcsXG4gIC8vXG5cbiAgLy8gUmV0dXJucyB0aGUgY3VycmVudCBicm93c2VyLlxuICBicm93c2VyOiAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbikge1xuICAgICAgcmV0dXJuICdGaXJlZm94JztcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbikge1xuICAgICAgcmV0dXJuICdDaHJvbWUnO1xuICAgIH0gZWxzZSBpZiAod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ1N1cHBvcnRlZCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnVW5zdXBwb3J0ZWQnO1xuICAgIH1cbiAgfSkoKSxcbiAgLy9cblxuICAvLyBMaXN0cyB3aGljaCBmZWF0dXJlcyBhcmUgc3VwcG9ydGVkXG4gIHN1cHBvcnRzOiAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKHR5cGVvZiBSVENQZWVyQ29ubmVjdGlvbiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICB2YXIgZGF0YSA9IHRydWU7XG4gICAgdmFyIGF1ZGlvVmlkZW8gPSB0cnVlO1xuXG4gICAgdmFyIGJpbmFyeUJsb2IgPSBmYWxzZTtcbiAgICB2YXIgc2N0cCA9IGZhbHNlO1xuICAgIHZhciBvbm5lZ290aWF0aW9ubmVlZGVkID0gISF3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG5cbiAgICB2YXIgcGMsIGRjO1xuICAgIHRyeSB7XG4gICAgICBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihkZWZhdWx0Q29uZmlnLCB7b3B0aW9uYWw6IFt7UnRwRGF0YUNoYW5uZWxzOiB0cnVlfV19KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBkYXRhID0gZmFsc2U7XG4gICAgICBhdWRpb1ZpZGVvID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRjID0gcGMuY3JlYXRlRGF0YUNoYW5uZWwoJ19QRUVSSlNURVNUJyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRhdGEgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgLy8gQmluYXJ5IHRlc3RcbiAgICAgIHRyeSB7XG4gICAgICAgIGRjLmJpbmFyeVR5cGUgPSAnYmxvYic7XG4gICAgICAgIGJpbmFyeUJsb2IgPSB0cnVlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgfVxuXG4gICAgICAvLyBSZWxpYWJsZSB0ZXN0LlxuICAgICAgLy8gVW5mb3J0dW5hdGVseSBDaHJvbWUgaXMgYSBiaXQgdW5yZWxpYWJsZSBhYm91dCB3aGV0aGVyIG9yIG5vdCB0aGV5XG4gICAgICAvLyBzdXBwb3J0IHJlbGlhYmxlLlxuICAgICAgdmFyIHJlbGlhYmxlUEMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZGVmYXVsdENvbmZpZywge30pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlbGlhYmxlREMgPSByZWxpYWJsZVBDLmNyZWF0ZURhdGFDaGFubmVsKCdfUEVFUkpTUkVMSUFCTEVURVNUJywge30pO1xuICAgICAgICBzY3RwID0gcmVsaWFibGVEQy5yZWxpYWJsZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIH1cbiAgICAgIHJlbGlhYmxlUEMuY2xvc2UoKTtcbiAgICB9XG5cbiAgICAvLyBGSVhNRTogbm90IHJlYWxseSB0aGUgYmVzdCBjaGVjay4uLlxuICAgIGlmIChhdWRpb1ZpZGVvKSB7XG4gICAgICBhdWRpb1ZpZGVvID0gISFwYy5hZGRTdHJlYW07XG4gICAgfVxuXG4gICAgLy8gRklYTUU6IHRoaXMgaXMgbm90IGdyZWF0IGJlY2F1c2UgaW4gdGhlb3J5IGl0IGRvZXNuJ3Qgd29yayBmb3JcbiAgICAvLyBhdi1vbmx5IGJyb3dzZXJzICg/KS5cbiAgICBpZiAoIW9ubmVnb3RpYXRpb25uZWVkZWQgJiYgZGF0YSkge1xuICAgICAgLy8gc3luYyBkZWZhdWx0IGNoZWNrLlxuICAgICAgdmFyIG5lZ290aWF0aW9uUEMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZGVmYXVsdENvbmZpZywge29wdGlvbmFsOiBbe1J0cERhdGFDaGFubmVsczogdHJ1ZX1dfSk7XG4gICAgICBuZWdvdGlhdGlvblBDLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgb25uZWdvdGlhdGlvbm5lZWRlZCA9IHRydWU7XG4gICAgICAgIC8vIGFzeW5jIGNoZWNrLlxuICAgICAgICBpZiAodXRpbCAmJiB1dGlsLnN1cHBvcnRzKSB7XG4gICAgICAgICAgdXRpbC5zdXBwb3J0cy5vbm5lZ290aWF0aW9ubmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZhciBuZWdvdGlhdGlvbkRDID0gbmVnb3RpYXRpb25QQy5jcmVhdGVEYXRhQ2hhbm5lbCgnX1BFRVJKU05FR09USUFUSU9OVEVTVCcpO1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBuZWdvdGlhdGlvblBDLmNsb3NlKCk7XG4gICAgICB9LCAxMDAwKTtcbiAgICB9XG5cbiAgICBpZiAocGMpIHtcbiAgICAgIHBjLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGF1ZGlvVmlkZW86IGF1ZGlvVmlkZW8sXG4gICAgICBkYXRhOiBkYXRhLFxuICAgICAgYmluYXJ5QmxvYjogYmluYXJ5QmxvYixcbiAgICAgIGJpbmFyeTogc2N0cCwgLy8gZGVwcmVjYXRlZDsgc2N0cCBpbXBsaWVzIGJpbmFyeSBzdXBwb3J0LlxuICAgICAgcmVsaWFibGU6IHNjdHAsIC8vIGRlcHJlY2F0ZWQ7IHNjdHAgaW1wbGllcyByZWxpYWJsZSBkYXRhLlxuICAgICAgc2N0cDogc2N0cCxcbiAgICAgIG9ubmVnb3RpYXRpb25uZWVkZWQ6IG9ubmVnb3RpYXRpb25uZWVkZWRcbiAgICB9O1xuICB9KCkpLFxuICAvL1xuXG4gIC8vIEVuc3VyZSBhbHBoYW51bWVyaWMgaWRzXG4gIHZhbGlkYXRlSWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgLy8gQWxsb3cgZW1wdHkgaWRzXG4gICAgcmV0dXJuICFpZCB8fCAvXltBLVphLXowLTldKyg/OlsgXy1dW0EtWmEtejAtOV0rKSokLy5leGVjKGlkKTtcbiAgfSxcblxuICB2YWxpZGF0ZUtleTogZnVuY3Rpb24oa2V5KSB7XG4gICAgLy8gQWxsb3cgZW1wdHkga2V5c1xuICAgIHJldHVybiAha2V5IHx8IC9eW0EtWmEtejAtOV0rKD86WyBfLV1bQS1aYS16MC05XSspKiQvLmV4ZWMoa2V5KTtcbiAgfSxcblxuXG4gIGRlYnVnOiBmYWxzZSxcblxuICBpbmhlcml0czogZnVuY3Rpb24oY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3I7XG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZSkge1xuICAgIGZvcih2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgaWYoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXN0O1xuICB9LFxuICBwYWNrOiBCaW5hcnlQYWNrLnBhY2ssXG4gIHVucGFjazogQmluYXJ5UGFjay51bnBhY2ssXG5cbiAgbG9nOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHV0aWwuZGVidWcpIHtcbiAgICAgIHZhciBlcnIgPSBmYWxzZTtcbiAgICAgIHZhciBjb3B5ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGNvcHkudW5zaGlmdCgnUGVlckpTOiAnKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gY29weS5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICBpZiAoY29weVtpXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgY29weVtpXSA9ICcoJyArIGNvcHlbaV0ubmFtZSArICcpICcgKyBjb3B5W2ldLm1lc3NhZ2U7XG4gICAgICAgICAgZXJyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZXJyID8gY29uc29sZS5lcnJvci5hcHBseShjb25zb2xlLCBjb3B5KSA6IGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGNvcHkpO1xuICAgIH1cbiAgfSxcblxuICBzZXRaZXJvVGltZW91dDogKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAgIHZhciB0aW1lb3V0cyA9IFtdO1xuICAgIHZhciBtZXNzYWdlTmFtZSA9ICd6ZXJvLXRpbWVvdXQtbWVzc2FnZSc7XG5cbiAgICAvLyBMaWtlIHNldFRpbWVvdXQsIGJ1dCBvbmx5IHRha2VzIGEgZnVuY3Rpb24gYXJndW1lbnQuICBUaGVyZSdzXG4gICAgLy8gbm8gdGltZSBhcmd1bWVudCAoYWx3YXlzIHplcm8pIGFuZCBubyBhcmd1bWVudHMgKHlvdSBoYXZlIHRvXG4gICAgLy8gdXNlIGEgY2xvc3VyZSkuXG4gICAgZnVuY3Rpb24gc2V0WmVyb1RpbWVvdXRQb3N0TWVzc2FnZShmbikge1xuICAgICAgdGltZW91dHMucHVzaChmbik7XG4gICAgICBnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZU5hbWUsICcqJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlTWVzc2FnZShldmVudCkge1xuICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PSBnbG9iYWwgJiYgZXZlbnQuZGF0YSA9PSBtZXNzYWdlTmFtZSkge1xuICAgICAgICBpZiAoZXZlbnQuc3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRpbWVvdXRzLmxlbmd0aCkge1xuICAgICAgICAgIHRpbWVvdXRzLnNoaWZ0KCkoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgaGFuZGxlTWVzc2FnZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChnbG9iYWwuYXR0YWNoRXZlbnQpIHtcbiAgICAgIGdsb2JhbC5hdHRhY2hFdmVudCgnb25tZXNzYWdlJywgaGFuZGxlTWVzc2FnZSk7XG4gICAgfVxuICAgIHJldHVybiBzZXRaZXJvVGltZW91dFBvc3RNZXNzYWdlO1xuICB9KHRoaXMpKSxcblxuICAvLyBCaW5hcnkgc3R1ZmZcblxuICAvLyBjaHVua3MgYSBibG9iLlxuICBjaHVuazogZnVuY3Rpb24oYmwpIHtcbiAgICB2YXIgY2h1bmtzID0gW107XG4gICAgdmFyIHNpemUgPSBibC5zaXplO1xuICAgIHZhciBzdGFydCA9IGluZGV4ID0gMDtcbiAgICB2YXIgdG90YWwgPSBNYXRoLmNlaWwoc2l6ZSAvIHV0aWwuY2h1bmtlZE1UVSk7XG4gICAgd2hpbGUgKHN0YXJ0IDwgc2l6ZSkge1xuICAgICAgdmFyIGVuZCA9IE1hdGgubWluKHNpemUsIHN0YXJ0ICsgdXRpbC5jaHVua2VkTVRVKTtcbiAgICAgIHZhciBiID0gYmwuc2xpY2Uoc3RhcnQsIGVuZCk7XG5cbiAgICAgIHZhciBjaHVuayA9IHtcbiAgICAgICAgX19wZWVyRGF0YTogZGF0YUNvdW50LFxuICAgICAgICBuOiBpbmRleCxcbiAgICAgICAgZGF0YTogYixcbiAgICAgICAgdG90YWw6IHRvdGFsXG4gICAgICB9O1xuXG4gICAgICBjaHVua3MucHVzaChjaHVuayk7XG5cbiAgICAgIHN0YXJ0ID0gZW5kO1xuICAgICAgaW5kZXggKz0gMTtcbiAgICB9XG4gICAgZGF0YUNvdW50ICs9IDE7XG4gICAgcmV0dXJuIGNodW5rcztcbiAgfSxcblxuICBibG9iVG9BcnJheUJ1ZmZlcjogZnVuY3Rpb24oYmxvYiwgY2Ipe1xuICAgIHZhciBmciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgZnIub25sb2FkID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBjYihldnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgfTtcbiAgICBmci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKTtcbiAgfSxcbiAgYmxvYlRvQmluYXJ5U3RyaW5nOiBmdW5jdGlvbihibG9iLCBjYil7XG4gICAgdmFyIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICBmci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgIGNiKGV2dC50YXJnZXQucmVzdWx0KTtcbiAgICB9O1xuICAgIGZyLnJlYWRBc0JpbmFyeVN0cmluZyhibG9iKTtcbiAgfSxcbiAgYmluYXJ5U3RyaW5nVG9BcnJheUJ1ZmZlcjogZnVuY3Rpb24oYmluYXJ5KSB7XG4gICAgdmFyIGJ5dGVBcnJheSA9IG5ldyBVaW50OEFycmF5KGJpbmFyeS5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYmluYXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBieXRlQXJyYXlbaV0gPSBiaW5hcnkuY2hhckNvZGVBdChpKSAmIDB4ZmY7XG4gICAgfVxuICAgIHJldHVybiBieXRlQXJyYXkuYnVmZmVyO1xuICB9LFxuICByYW5kb21Ub2tlbjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMik7XG4gIH0sXG4gIC8vXG5cbiAgaXNTZWN1cmU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOic7XG4gIH1cbn07XG5cbmV4cG9ydHMudXRpbCA9IHV0aWw7XG4vKipcbiAqIEEgcGVlciB3aG8gY2FuIGluaXRpYXRlIGNvbm5lY3Rpb25zIHdpdGggb3RoZXIgcGVlcnMuXG4gKi9cbmZ1bmN0aW9uIFBlZXIoaWQsIG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBlZXIpKSByZXR1cm4gbmV3IFBlZXIoaWQsIG9wdGlvbnMpO1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBEZWFsIHdpdGggb3ZlcmxvYWRpbmdcbiAgaWYgKGlkICYmIGlkLmNvbnN0cnVjdG9yID09IE9iamVjdCkge1xuICAgIG9wdGlvbnMgPSBpZDtcbiAgICBpZCA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChpZCkge1xuICAgIC8vIEVuc3VyZSBpZCBpcyBhIHN0cmluZ1xuICAgIGlkID0gaWQudG9TdHJpbmcoKTtcbiAgfVxuICAvL1xuXG4gIC8vIENvbmZpZ3VyaXplIG9wdGlvbnNcbiAgb3B0aW9ucyA9IHV0aWwuZXh0ZW5kKHtcbiAgICBkZWJ1ZzogMCwgLy8gMTogRXJyb3JzLCAyOiBXYXJuaW5ncywgMzogQWxsIGxvZ3NcbiAgICBob3N0OiB1dGlsLkNMT1VEX0hPU1QsXG4gICAgcG9ydDogdXRpbC5DTE9VRF9QT1JULFxuICAgIGtleTogJ3BlZXJqcycsXG4gICAgcGF0aDogJy8nLFxuICAgIHRva2VuOiB1dGlsLnJhbmRvbVRva2VuKCksXG4gICAgY29uZmlnOiB1dGlsLmRlZmF1bHRDb25maWdcbiAgfSwgb3B0aW9ucyk7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIC8vIERldGVjdCByZWxhdGl2ZSBVUkwgaG9zdC5cbiAgaWYgKG9wdGlvbnMuaG9zdCA9PT0gJy8nKSB7XG4gICAgb3B0aW9ucy5ob3N0ID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lO1xuICB9XG4gIC8vIFNldCBwYXRoIGNvcnJlY3RseS5cbiAgaWYgKG9wdGlvbnMucGF0aFswXSAhPT0gJy8nKSB7XG4gICAgb3B0aW9ucy5wYXRoID0gJy8nICsgb3B0aW9ucy5wYXRoO1xuICB9XG4gIGlmIChvcHRpb25zLnBhdGhbb3B0aW9ucy5wYXRoLmxlbmd0aCAtIDFdICE9PSAnLycpIHtcbiAgICBvcHRpb25zLnBhdGggKz0gJy8nO1xuICB9XG5cbiAgLy8gU2V0IHdoZXRoZXIgd2UgdXNlIFNTTCB0byBzYW1lIGFzIGN1cnJlbnQgaG9zdFxuICBpZiAob3B0aW9ucy5zZWN1cmUgPT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLmhvc3QgIT09IHV0aWwuQ0xPVURfSE9TVCkge1xuICAgIG9wdGlvbnMuc2VjdXJlID0gdXRpbC5pc1NlY3VyZSgpO1xuICB9XG4gIC8vIFNldCBhIGN1c3RvbSBsb2cgZnVuY3Rpb24gaWYgcHJlc2VudFxuICBpZiAob3B0aW9ucy5sb2dGdW5jdGlvbikge1xuICAgIHV0aWwuc2V0TG9nRnVuY3Rpb24ob3B0aW9ucy5sb2dGdW5jdGlvbik7XG4gIH1cbiAgdXRpbC5zZXRMb2dMZXZlbChvcHRpb25zLmRlYnVnKTtcbiAgLy9cblxuICAvLyBTYW5pdHkgY2hlY2tzXG4gIC8vIEVuc3VyZSBXZWJSVEMgc3VwcG9ydGVkXG4gIGlmICghdXRpbC5zdXBwb3J0cy5hdWRpb1ZpZGVvICYmICF1dGlsLnN1cHBvcnRzLmRhdGEgKSB7XG4gICAgdGhpcy5fZGVsYXllZEFib3J0KCdicm93c2VyLWluY29tcGF0aWJsZScsICdUaGUgY3VycmVudCBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViUlRDJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIEVuc3VyZSBhbHBoYW51bWVyaWMgaWRcbiAgaWYgKCF1dGlsLnZhbGlkYXRlSWQoaWQpKSB7XG4gICAgdGhpcy5fZGVsYXllZEFib3J0KCdpbnZhbGlkLWlkJywgJ0lEIFwiJyArIGlkICsgJ1wiIGlzIGludmFsaWQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gRW5zdXJlIHZhbGlkIGtleVxuICBpZiAoIXV0aWwudmFsaWRhdGVLZXkob3B0aW9ucy5rZXkpKSB7XG4gICAgdGhpcy5fZGVsYXllZEFib3J0KCdpbnZhbGlkLWtleScsICdBUEkgS0VZIFwiJyArIG9wdGlvbnMua2V5ICsgJ1wiIGlzIGludmFsaWQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gRW5zdXJlIG5vdCB1c2luZyB1bnNlY3VyZSBjbG91ZCBzZXJ2ZXIgb24gU1NMIHBhZ2VcbiAgaWYgKG9wdGlvbnMuc2VjdXJlICYmIG9wdGlvbnMuaG9zdCA9PT0gJzAucGVlcmpzLmNvbScpIHtcbiAgICB0aGlzLl9kZWxheWVkQWJvcnQoJ3NzbC11bmF2YWlsYWJsZScsXG4gICAgICAnVGhlIGNsb3VkIHNlcnZlciBjdXJyZW50bHkgZG9lcyBub3Qgc3VwcG9ydCBIVFRQUy4gUGxlYXNlIHJ1biB5b3VyIG93biBQZWVyU2VydmVyIHRvIHVzZSBIVFRQUy4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy9cblxuICAvLyBTdGF0ZXMuXG4gIHRoaXMuZGVzdHJveWVkID0gZmFsc2U7IC8vIENvbm5lY3Rpb25zIGhhdmUgYmVlbiBraWxsZWRcbiAgdGhpcy5kaXNjb25uZWN0ZWQgPSBmYWxzZTsgLy8gQ29ubmVjdGlvbiB0byBQZWVyU2VydmVyIGtpbGxlZCBidXQgUDJQIGNvbm5lY3Rpb25zIHN0aWxsIGFjdGl2ZVxuICB0aGlzLm9wZW4gPSBmYWxzZTsgLy8gU29ja2V0cyBhbmQgc3VjaCBhcmUgbm90IHlldCBvcGVuLlxuICAvL1xuXG4gIC8vIFJlZmVyZW5jZXNcbiAgdGhpcy5jb25uZWN0aW9ucyA9IHt9OyAvLyBEYXRhQ29ubmVjdGlvbnMgZm9yIHRoaXMgcGVlci5cbiAgdGhpcy5fbG9zdE1lc3NhZ2VzID0ge307IC8vIHNyYyA9PiBbbGlzdCBvZiBtZXNzYWdlc11cbiAgLy9cblxuICAvLyBTdGFydCB0aGUgc2VydmVyIGNvbm5lY3Rpb25cbiAgdGhpcy5faW5pdGlhbGl6ZVNlcnZlckNvbm5lY3Rpb24oKTtcbiAgaWYgKGlkKSB7XG4gICAgdGhpcy5faW5pdGlhbGl6ZShpZCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fcmV0cmlldmVJZCgpO1xuICB9XG4gIC8vXG59O1xuXG51dGlsLmluaGVyaXRzKFBlZXIsIEV2ZW50RW1pdHRlcik7XG5cbi8vIEluaXRpYWxpemUgdGhlICdzb2NrZXQnICh3aGljaCBpcyBhY3R1YWxseSBhIG1peCBvZiBYSFIgc3RyZWFtaW5nIGFuZFxuLy8gd2Vic29ja2V0cy4pXG5QZWVyLnByb3RvdHlwZS5faW5pdGlhbGl6ZVNlcnZlckNvbm5lY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNvY2tldCA9IG5ldyBTb2NrZXQodGhpcy5vcHRpb25zLnNlY3VyZSwgdGhpcy5vcHRpb25zLmhvc3QsIHRoaXMub3B0aW9ucy5wb3J0LCB0aGlzLm9wdGlvbnMucGF0aCwgdGhpcy5vcHRpb25zLmtleSk7XG4gIHRoaXMuc29ja2V0Lm9uKCdtZXNzYWdlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIHNlbGYuX2hhbmRsZU1lc3NhZ2UoZGF0YSk7XG4gIH0pO1xuICB0aGlzLnNvY2tldC5vbignZXJyb3InLCBmdW5jdGlvbihlcnJvcikge1xuICAgIHNlbGYuX2Fib3J0KCdzb2NrZXQtZXJyb3InLCBlcnJvcik7XG4gIH0pO1xuICB0aGlzLnNvY2tldC5vbignZGlzY29ubmVjdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgd2UgaGF2ZW4ndCBleHBsaWNpdGx5IGRpc2Nvbm5lY3RlZCwgZW1pdCBlcnJvciBhbmQgZGlzY29ubmVjdC5cbiAgICBpZiAoIXNlbGYuZGlzY29ubmVjdGVkKSB7XG4gICAgICBzZWxmLmVtaXRFcnJvcignbmV0d29yaycsICdMb3N0IGNvbm5lY3Rpb24gdG8gc2VydmVyLicpXG4gICAgICBzZWxmLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLnNvY2tldC5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiB3ZSBoYXZlbid0IGV4cGxpY2l0bHkgZGlzY29ubmVjdGVkLCBlbWl0IGVycm9yLlxuICAgIGlmICghc2VsZi5kaXNjb25uZWN0ZWQpIHtcbiAgICAgIHNlbGYuX2Fib3J0KCdzb2NrZXQtY2xvc2VkJywgJ1VuZGVybHlpbmcgc29ja2V0IGlzIGFscmVhZHkgY2xvc2VkLicpO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKiogR2V0IGEgdW5pcXVlIElEIGZyb20gdGhlIHNlcnZlciB2aWEgWEhSLiAqL1xuUGVlci5wcm90b3R5cGUuX3JldHJpZXZlSWQgPSBmdW5jdGlvbihjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHZhciBwcm90b2NvbCA9IHRoaXMub3B0aW9ucy5zZWN1cmUgPyAnaHR0cHM6Ly8nIDogJ2h0dHA6Ly8nO1xuICB2YXIgdXJsID0gcHJvdG9jb2wgKyB0aGlzLm9wdGlvbnMuaG9zdCArICc6JyArIHRoaXMub3B0aW9ucy5wb3J0XG4gICAgKyB0aGlzLm9wdGlvbnMucGF0aCArIHRoaXMub3B0aW9ucy5rZXkgKyAnL2lkJztcbiAgdmFyIHF1ZXJ5U3RyaW5nID0gJz90cz0nICsgbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnJyArIE1hdGgucmFuZG9tKCk7XG4gIHVybCArPSBxdWVyeVN0cmluZztcblxuICAvLyBJZiB0aGVyZSdzIG5vIElEIHdlIG5lZWQgdG8gd2FpdCBmb3Igb25lIGJlZm9yZSB0cnlpbmcgdG8gaW5pdCBzb2NrZXQuXG4gIGh0dHAub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgaHR0cC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgIHV0aWwuZXJyb3IoJ0Vycm9yIHJldHJpZXZpbmcgSUQnLCBlKTtcbiAgICB2YXIgcGF0aEVycm9yID0gJyc7XG4gICAgaWYgKHNlbGYub3B0aW9ucy5wYXRoID09PSAnLycgJiYgc2VsZi5vcHRpb25zLmhvc3QgIT09IHV0aWwuQ0xPVURfSE9TVCkge1xuICAgICAgcGF0aEVycm9yID0gJyBJZiB5b3UgcGFzc2VkIGluIGEgYHBhdGhgIHRvIHlvdXIgc2VsZi1ob3N0ZWQgUGVlclNlcnZlciwgJ1xuICAgICAgICArICd5b3VcXCdsbCBhbHNvIG5lZWQgdG8gcGFzcyBpbiB0aGF0IHNhbWUgcGF0aCB3aGVuIGNyZWF0aW5nIGEgbmV3J1xuICAgICAgICArICcgUGVlci4nO1xuICAgIH1cbiAgICBzZWxmLl9hYm9ydCgnc2VydmVyLWVycm9yJywgJ0NvdWxkIG5vdCBnZXQgYW4gSUQgZnJvbSB0aGUgc2VydmVyLicgKyBwYXRoRXJyb3IpO1xuICB9XG4gIGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaHR0cC5zdGF0dXMgIT09IDIwMCkge1xuICAgICAgaHR0cC5vbmVycm9yKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNlbGYuX2luaXRpYWxpemUoaHR0cC5yZXNwb25zZVRleHQpO1xuICB9O1xuICBodHRwLnNlbmQobnVsbCk7XG59O1xuXG4vKiogSW5pdGlhbGl6ZSBhIGNvbm5lY3Rpb24gd2l0aCB0aGUgc2VydmVyLiAqL1xuUGVlci5wcm90b3R5cGUuX2luaXRpYWxpemUgPSBmdW5jdGlvbihpZCkge1xuICB0aGlzLmlkID0gaWQ7XG4gIHRoaXMuc29ja2V0LnN0YXJ0KHRoaXMuaWQsIHRoaXMub3B0aW9ucy50b2tlbik7XG59XG5cbi8qKiBIYW5kbGVzIG1lc3NhZ2VzIGZyb20gdGhlIHNlcnZlci4gKi9cblBlZXIucHJvdG90eXBlLl9oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdHlwZSA9IG1lc3NhZ2UudHlwZTtcbiAgdmFyIHBheWxvYWQgPSBtZXNzYWdlLnBheWxvYWQ7XG4gIHZhciBwZWVyID0gbWVzc2FnZS5zcmM7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnT1BFTic6IC8vIFRoZSBjb25uZWN0aW9uIHRvIHRoZSBzZXJ2ZXIgaXMgb3Blbi5cbiAgICAgIHRoaXMuZW1pdCgnb3BlbicsIHRoaXMuaWQpO1xuICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0VSUk9SJzogLy8gU2VydmVyIGVycm9yLlxuICAgICAgdGhpcy5fYWJvcnQoJ3NlcnZlci1lcnJvcicsIHBheWxvYWQubXNnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0lELVRBS0VOJzogLy8gVGhlIHNlbGVjdGVkIElEIGlzIHRha2VuLlxuICAgICAgdGhpcy5fYWJvcnQoJ3VuYXZhaWxhYmxlLWlkJywgJ0lEIGAnICsgdGhpcy5pZCArICdgIGlzIHRha2VuJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdJTlZBTElELUtFWSc6IC8vIFRoZSBnaXZlbiBBUEkga2V5IGNhbm5vdCBiZSBmb3VuZC5cbiAgICAgIHRoaXMuX2Fib3J0KCdpbnZhbGlkLWtleScsICdBUEkgS0VZIFwiJyArIHRoaXMub3B0aW9ucy5rZXkgKyAnXCIgaXMgaW52YWxpZCcpO1xuICAgICAgYnJlYWs7XG5cbiAgICAvL1xuICAgIGNhc2UgJ0xFQVZFJzogLy8gQW5vdGhlciBwZWVyIGhhcyBjbG9zZWQgaXRzIGNvbm5lY3Rpb24gdG8gdGhpcyBwZWVyLlxuICAgICAgdXRpbC5sb2coJ1JlY2VpdmVkIGxlYXZlIG1lc3NhZ2UgZnJvbScsIHBlZXIpO1xuICAgICAgdGhpcy5fY2xlYW51cFBlZXIocGVlcik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0VYUElSRSc6IC8vIFRoZSBvZmZlciBzZW50IHRvIGEgcGVlciBoYXMgZXhwaXJlZCB3aXRob3V0IHJlc3BvbnNlLlxuICAgICAgdGhpcy5lbWl0RXJyb3IoJ3BlZXItdW5hdmFpbGFibGUnLCAnQ291bGQgbm90IGNvbm5lY3QgdG8gcGVlciAnICsgcGVlcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdPRkZFUic6IC8vIHdlIHNob3VsZCBjb25zaWRlciBzd2l0Y2hpbmcgdGhpcyB0byBDQUxML0NPTk5FQ1QsIGJ1dCB0aGlzIGlzIHRoZSBsZWFzdCBicmVha2luZyBvcHRpb24uXG4gICAgICB2YXIgY29ubmVjdGlvbklkID0gcGF5bG9hZC5jb25uZWN0aW9uSWQ7XG4gICAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuZ2V0Q29ubmVjdGlvbihwZWVyLCBjb25uZWN0aW9uSWQpO1xuXG4gICAgICBpZiAoY29ubmVjdGlvbikge1xuICAgICAgICB1dGlsLndhcm4oJ09mZmVyIHJlY2VpdmVkIGZvciBleGlzdGluZyBDb25uZWN0aW9uIElEOicsIGNvbm5lY3Rpb25JZCk7XG4gICAgICAgIC8vY29ubmVjdGlvbi5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChwYXlsb2FkLnR5cGUgPT09ICdtZWRpYScpIHtcbiAgICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBNZWRpYUNvbm5lY3Rpb24ocGVlciwgdGhpcywge1xuICAgICAgICAgICAgY29ubmVjdGlvbklkOiBjb25uZWN0aW9uSWQsXG4gICAgICAgICAgICBfcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIG1ldGFkYXRhOiBwYXlsb2FkLm1ldGFkYXRhXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5fYWRkQ29ubmVjdGlvbihwZWVyLCBjb25uZWN0aW9uKTtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2NhbGwnLCBjb25uZWN0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXlsb2FkLnR5cGUgPT09ICdkYXRhJykge1xuICAgICAgICAgIGNvbm5lY3Rpb24gPSBuZXcgRGF0YUNvbm5lY3Rpb24ocGVlciwgdGhpcywge1xuICAgICAgICAgICAgY29ubmVjdGlvbklkOiBjb25uZWN0aW9uSWQsXG4gICAgICAgICAgICBfcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIG1ldGFkYXRhOiBwYXlsb2FkLm1ldGFkYXRhLFxuICAgICAgICAgICAgbGFiZWw6IHBheWxvYWQubGFiZWwsXG4gICAgICAgICAgICBzZXJpYWxpemF0aW9uOiBwYXlsb2FkLnNlcmlhbGl6YXRpb24sXG4gICAgICAgICAgICByZWxpYWJsZTogcGF5bG9hZC5yZWxpYWJsZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuX2FkZENvbm5lY3Rpb24ocGVlciwgY29ubmVjdGlvbik7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0aW9uJywgY29ubmVjdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdXRpbC53YXJuKCdSZWNlaXZlZCBtYWxmb3JtZWQgY29ubmVjdGlvbiB0eXBlOicsIHBheWxvYWQudHlwZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZpbmQgbWVzc2FnZXMuXG4gICAgICAgIHZhciBtZXNzYWdlcyA9IHRoaXMuX2dldE1lc3NhZ2VzKGNvbm5lY3Rpb25JZCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG1lc3NhZ2VzLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICAgICAgICBjb25uZWN0aW9uLmhhbmRsZU1lc3NhZ2UobWVzc2FnZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKCFwYXlsb2FkKSB7XG4gICAgICAgIHV0aWwud2FybignWW91IHJlY2VpdmVkIGEgbWFsZm9ybWVkIG1lc3NhZ2UgZnJvbSAnICsgcGVlciArICcgb2YgdHlwZSAnICsgdHlwZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGlkID0gcGF5bG9hZC5jb25uZWN0aW9uSWQ7XG4gICAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuZ2V0Q29ubmVjdGlvbihwZWVyLCBpZCk7XG5cbiAgICAgIGlmIChjb25uZWN0aW9uICYmIGNvbm5lY3Rpb24ucGMpIHtcbiAgICAgICAgLy8gUGFzcyBpdCBvbi5cbiAgICAgICAgY29ubmVjdGlvbi5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIGlmIChpZCkge1xuICAgICAgICAvLyBTdG9yZSBmb3IgcG9zc2libGUgbGF0ZXIgdXNlXG4gICAgICAgIHRoaXMuX3N0b3JlTWVzc2FnZShpZCwgbWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1dGlsLndhcm4oJ1lvdSByZWNlaXZlZCBhbiB1bnJlY29nbml6ZWQgbWVzc2FnZTonLCBtZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbi8qKiBTdG9yZXMgbWVzc2FnZXMgd2l0aG91dCBhIHNldCB1cCBjb25uZWN0aW9uLCB0byBiZSBjbGFpbWVkIGxhdGVyLiAqL1xuUGVlci5wcm90b3R5cGUuX3N0b3JlTWVzc2FnZSA9IGZ1bmN0aW9uKGNvbm5lY3Rpb25JZCwgbWVzc2FnZSkge1xuICBpZiAoIXRoaXMuX2xvc3RNZXNzYWdlc1tjb25uZWN0aW9uSWRdKSB7XG4gICAgdGhpcy5fbG9zdE1lc3NhZ2VzW2Nvbm5lY3Rpb25JZF0gPSBbXTtcbiAgfVxuICB0aGlzLl9sb3N0TWVzc2FnZXNbY29ubmVjdGlvbklkXS5wdXNoKG1lc3NhZ2UpO1xufVxuXG4vKiogUmV0cmlldmUgbWVzc2FnZXMgZnJvbSBsb3N0IG1lc3NhZ2Ugc3RvcmUgKi9cblBlZXIucHJvdG90eXBlLl9nZXRNZXNzYWdlcyA9IGZ1bmN0aW9uKGNvbm5lY3Rpb25JZCkge1xuICB2YXIgbWVzc2FnZXMgPSB0aGlzLl9sb3N0TWVzc2FnZXNbY29ubmVjdGlvbklkXTtcbiAgaWYgKG1lc3NhZ2VzKSB7XG4gICAgZGVsZXRlIHRoaXMuX2xvc3RNZXNzYWdlc1tjb25uZWN0aW9uSWRdO1xuICAgIHJldHVybiBtZXNzYWdlcztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgRGF0YUNvbm5lY3Rpb24gdG8gdGhlIHNwZWNpZmllZCBwZWVyLiBTZWUgZG9jdW1lbnRhdGlvbiBmb3IgYVxuICogY29tcGxldGUgbGlzdCBvZiBvcHRpb25zLlxuICovXG5QZWVyLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24ocGVlciwgb3B0aW9ucykge1xuICBpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcbiAgICB1dGlsLndhcm4oJ1lvdSBjYW5ub3QgY29ubmVjdCB0byBhIG5ldyBQZWVyIGJlY2F1c2UgeW91IGNhbGxlZCAnXG4gICAgICAgICsgJy5kaXNjb25uZWN0KCkgb24gdGhpcyBQZWVyIGFuZCBlbmRlZCB5b3VyIGNvbm5lY3Rpb24gd2l0aCB0aGUnXG4gICAgICAgICsgJyBzZXJ2ZXIuIFlvdSBjYW4gY3JlYXRlIGEgbmV3IFBlZXIgdG8gcmVjb25uZWN0LCBvciBjYWxsIHJlY29ubmVjdCdcbiAgICAgICAgKyAnIG9uIHRoaXMgcGVlciBpZiB5b3UgYmVsaWV2ZSBpdHMgSUQgdG8gc3RpbGwgYmUgYXZhaWxhYmxlLicpO1xuICAgIHRoaXMuZW1pdEVycm9yKCdkaXNjb25uZWN0ZWQnLCAnQ2Fubm90IGNvbm5lY3QgdG8gbmV3IFBlZXIgYWZ0ZXIgZGlzY29ubmVjdGluZyBmcm9tIHNlcnZlci4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgRGF0YUNvbm5lY3Rpb24ocGVlciwgdGhpcywgb3B0aW9ucyk7XG4gIHRoaXMuX2FkZENvbm5lY3Rpb24ocGVlciwgY29ubmVjdGlvbik7XG4gIHJldHVybiBjb25uZWN0aW9uO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBNZWRpYUNvbm5lY3Rpb24gdG8gdGhlIHNwZWNpZmllZCBwZWVyLiBTZWUgZG9jdW1lbnRhdGlvbiBmb3IgYVxuICogY29tcGxldGUgbGlzdCBvZiBvcHRpb25zLlxuICovXG5QZWVyLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24ocGVlciwgc3RyZWFtLCBvcHRpb25zKSB7XG4gIGlmICh0aGlzLmRpc2Nvbm5lY3RlZCkge1xuICAgIHV0aWwud2FybignWW91IGNhbm5vdCBjb25uZWN0IHRvIGEgbmV3IFBlZXIgYmVjYXVzZSB5b3UgY2FsbGVkICdcbiAgICAgICAgKyAnLmRpc2Nvbm5lY3QoKSBvbiB0aGlzIFBlZXIgYW5kIGVuZGVkIHlvdXIgY29ubmVjdGlvbiB3aXRoIHRoZSdcbiAgICAgICAgKyAnIHNlcnZlci4gWW91IGNhbiBjcmVhdGUgYSBuZXcgUGVlciB0byByZWNvbm5lY3QuJyk7XG4gICAgdGhpcy5lbWl0RXJyb3IoJ2Rpc2Nvbm5lY3RlZCcsICdDYW5ub3QgY29ubmVjdCB0byBuZXcgUGVlciBhZnRlciBkaXNjb25uZWN0aW5nIGZyb20gc2VydmVyLicpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIXN0cmVhbSkge1xuICAgIHV0aWwuZXJyb3IoJ1RvIGNhbGwgYSBwZWVyLCB5b3UgbXVzdCBwcm92aWRlIGEgc3RyZWFtIGZyb20geW91ciBicm93c2VyXFwncyBgZ2V0VXNlck1lZGlhYC4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuX3N0cmVhbSA9IHN0cmVhbTtcbiAgdmFyIGNhbGwgPSBuZXcgTWVkaWFDb25uZWN0aW9uKHBlZXIsIHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLl9hZGRDb25uZWN0aW9uKHBlZXIsIGNhbGwpO1xuICByZXR1cm4gY2FsbDtcbn1cblxuLyoqIEFkZCBhIGRhdGEvbWVkaWEgY29ubmVjdGlvbiB0byB0aGlzIHBlZXIuICovXG5QZWVyLnByb3RvdHlwZS5fYWRkQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKHBlZXIsIGNvbm5lY3Rpb24pIHtcbiAgaWYgKCF0aGlzLmNvbm5lY3Rpb25zW3BlZXJdKSB7XG4gICAgdGhpcy5jb25uZWN0aW9uc1twZWVyXSA9IFtdO1xuICB9XG4gIHRoaXMuY29ubmVjdGlvbnNbcGVlcl0ucHVzaChjb25uZWN0aW9uKTtcbn1cblxuLyoqIFJldHJpZXZlIGEgZGF0YS9tZWRpYSBjb25uZWN0aW9uIGZvciB0aGlzIHBlZXIuICovXG5QZWVyLnByb3RvdHlwZS5nZXRDb25uZWN0aW9uID0gZnVuY3Rpb24ocGVlciwgaWQpIHtcbiAgdmFyIGNvbm5lY3Rpb25zID0gdGhpcy5jb25uZWN0aW9uc1twZWVyXTtcbiAgaWYgKCFjb25uZWN0aW9ucykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGZvciAodmFyIGkgPSAwLCBpaSA9IGNvbm5lY3Rpb25zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICBpZiAoY29ubmVjdGlvbnNbaV0uaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gY29ubmVjdGlvbnNbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5QZWVyLnByb3RvdHlwZS5fZGVsYXllZEFib3J0ID0gZnVuY3Rpb24odHlwZSwgbWVzc2FnZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHV0aWwuc2V0WmVyb1RpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICBzZWxmLl9hYm9ydCh0eXBlLCBtZXNzYWdlKTtcbiAgfSk7XG59XG5cbi8qKlxuICogRGVzdHJveXMgdGhlIFBlZXIgYW5kIGVtaXRzIGFuIGVycm9yIG1lc3NhZ2UuXG4gKiBUaGUgUGVlciBpcyBub3QgZGVzdHJveWVkIGlmIGl0J3MgaW4gYSBkaXNjb25uZWN0ZWQgc3RhdGUsIGluIHdoaWNoIGNhc2VcbiAqIGl0IHJldGFpbnMgaXRzIGRpc2Nvbm5lY3RlZCBzdGF0ZSBhbmQgaXRzIGV4aXN0aW5nIGNvbm5lY3Rpb25zLlxuICovXG5QZWVyLnByb3RvdHlwZS5fYWJvcnQgPSBmdW5jdGlvbih0eXBlLCBtZXNzYWdlKSB7XG4gIHV0aWwuZXJyb3IoJ0Fib3J0aW5nIScpO1xuICBpZiAoIXRoaXMuX2xhc3RTZXJ2ZXJJZCkge1xuICAgIHRoaXMuZGVzdHJveSgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICB9XG4gIHRoaXMuZW1pdEVycm9yKHR5cGUsIG1lc3NhZ2UpO1xufTtcblxuLyoqIEVtaXRzIGEgdHlwZWQgZXJyb3IgbWVzc2FnZS4gKi9cblBlZXIucHJvdG90eXBlLmVtaXRFcnJvciA9IGZ1bmN0aW9uKHR5cGUsIGVycikge1xuICB1dGlsLmVycm9yKCdFcnJvcjonLCBlcnIpO1xuICBpZiAodHlwZW9mIGVyciA9PT0gJ3N0cmluZycpIHtcbiAgICBlcnIgPSBuZXcgRXJyb3IoZXJyKTtcbiAgfVxuICBlcnIudHlwZSA9IHR5cGU7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xufTtcblxuLyoqXG4gKiBEZXN0cm95cyB0aGUgUGVlcjogY2xvc2VzIGFsbCBhY3RpdmUgY29ubmVjdGlvbnMgYXMgd2VsbCBhcyB0aGUgY29ubmVjdGlvblxuICogIHRvIHRoZSBzZXJ2ZXIuXG4gKiBXYXJuaW5nOiBUaGUgcGVlciBjYW4gbm8gbG9uZ2VyIGNyZWF0ZSBvciBhY2NlcHQgY29ubmVjdGlvbnMgYWZ0ZXIgYmVpbmdcbiAqICBkZXN0cm95ZWQuXG4gKi9cblBlZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmRlc3Ryb3llZCkge1xuICAgIHRoaXMuX2NsZWFudXAoKTtcbiAgICB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIH1cbn1cblxuXG4vKiogRGlzY29ubmVjdHMgZXZlcnkgY29ubmVjdGlvbiBvbiB0aGlzIHBlZXIuICovXG5QZWVyLnByb3RvdHlwZS5fY2xlYW51cCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jb25uZWN0aW9ucykge1xuICAgIHZhciBwZWVycyA9IE9iamVjdC5rZXlzKHRoaXMuY29ubmVjdGlvbnMpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBlZXJzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgIHRoaXMuX2NsZWFudXBQZWVyKHBlZXJzW2ldKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5lbWl0KCdjbG9zZScpO1xufVxuXG4vKiogQ2xvc2VzIGFsbCBjb25uZWN0aW9ucyB0byB0aGlzIHBlZXIuICovXG5QZWVyLnByb3RvdHlwZS5fY2xlYW51cFBlZXIgPSBmdW5jdGlvbihwZWVyKSB7XG4gIHZhciBjb25uZWN0aW9ucyA9IHRoaXMuY29ubmVjdGlvbnNbcGVlcl07XG4gIGZvciAodmFyIGogPSAwLCBqaiA9IGNvbm5lY3Rpb25zLmxlbmd0aDsgaiA8IGpqOyBqICs9IDEpIHtcbiAgICBjb25uZWN0aW9uc1tqXS5jbG9zZSgpO1xuICB9XG59XG5cbi8qKlxuICogRGlzY29ubmVjdHMgdGhlIFBlZXIncyBjb25uZWN0aW9uIHRvIHRoZSBQZWVyU2VydmVyLiBEb2VzIG5vdCBjbG9zZSBhbnlcbiAqICBhY3RpdmUgY29ubmVjdGlvbnMuXG4gKiBXYXJuaW5nOiBUaGUgcGVlciBjYW4gbm8gbG9uZ2VyIGNyZWF0ZSBvciBhY2NlcHQgY29ubmVjdGlvbnMgYWZ0ZXIgYmVpbmdcbiAqICBkaXNjb25uZWN0ZWQuIEl0IGFsc28gY2Fubm90IHJlY29ubmVjdCB0byB0aGUgc2VydmVyLlxuICovXG5QZWVyLnByb3RvdHlwZS5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdXRpbC5zZXRaZXJvVGltZW91dChmdW5jdGlvbigpe1xuICAgIGlmICghc2VsZi5kaXNjb25uZWN0ZWQpIHtcbiAgICAgIHNlbGYuZGlzY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgIHNlbGYub3BlbiA9IGZhbHNlO1xuICAgICAgaWYgKHNlbGYuc29ja2V0KSB7XG4gICAgICAgIHNlbGYuc29ja2V0LmNsb3NlKCk7XG4gICAgICB9XG4gICAgICBzZWxmLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcsIHNlbGYuaWQpO1xuICAgICAgc2VsZi5fbGFzdFNlcnZlcklkID0gc2VsZi5pZDtcbiAgICAgIHNlbGYuaWQgPSBudWxsO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKiBBdHRlbXB0cyB0byByZWNvbm5lY3Qgd2l0aCB0aGUgc2FtZSBJRC4gKi9cblBlZXIucHJvdG90eXBlLnJlY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kaXNjb25uZWN0ZWQgJiYgIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgdXRpbC5sb2coJ0F0dGVtcHRpbmcgcmVjb25uZWN0aW9uIHRvIHNlcnZlciB3aXRoIElEICcgKyB0aGlzLl9sYXN0U2VydmVySWQpO1xuICAgIHRoaXMuZGlzY29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdGlhbGl6ZVNlcnZlckNvbm5lY3Rpb24oKTtcbiAgICB0aGlzLl9pbml0aWFsaXplKHRoaXMuX2xhc3RTZXJ2ZXJJZCk7XG4gIH0gZWxzZSBpZiAodGhpcy5kZXN0cm95ZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgcGVlciBjYW5ub3QgcmVjb25uZWN0IHRvIHRoZSBzZXJ2ZXIuIEl0IGhhcyBhbHJlYWR5IGJlZW4gZGVzdHJveWVkLicpO1xuICB9IGVsc2UgaWYgKCF0aGlzLmRpc2Nvbm5lY3RlZCAmJiAhdGhpcy5vcGVuKSB7XG4gICAgLy8gRG8gbm90aGluZy4gV2UncmUgc3RpbGwgY29ubmVjdGluZyB0aGUgZmlyc3QgdGltZS5cbiAgICB1dGlsLmVycm9yKCdJbiBhIGh1cnJ5PyBXZVxcJ3JlIHN0aWxsIHRyeWluZyB0byBtYWtlIHRoZSBpbml0aWFsIGNvbm5lY3Rpb24hJyk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQZWVyICcgKyB0aGlzLmlkICsgJyBjYW5ub3QgcmVjb25uZWN0IGJlY2F1c2UgaXQgaXMgbm90IGRpc2Nvbm5lY3RlZCBmcm9tIHRoZSBzZXJ2ZXIhJyk7XG4gIH1cbn07XG5cbi8qKlxuICogR2V0IGEgbGlzdCBvZiBhdmFpbGFibGUgcGVlciBJRHMuIElmIHlvdSdyZSBydW5uaW5nIHlvdXIgb3duIHNlcnZlciwgeW91J2xsXG4gKiB3YW50IHRvIHNldCBhbGxvd19kaXNjb3Zlcnk6IHRydWUgaW4gdGhlIFBlZXJTZXJ2ZXIgb3B0aW9ucy4gSWYgeW91J3JlIHVzaW5nXG4gKiB0aGUgY2xvdWQgc2VydmVyLCBlbWFpbCB0ZWFtQHBlZXJqcy5jb20gdG8gZ2V0IHRoZSBmdW5jdGlvbmFsaXR5IGVuYWJsZWQgZm9yXG4gKiB5b3VyIGtleS5cbiAqL1xuUGVlci5wcm90b3R5cGUubGlzdEFsbFBlZXJzID0gZnVuY3Rpb24oY2IpIHtcbiAgY2IgPSBjYiB8fCBmdW5jdGlvbigpIHt9O1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHZhciBwcm90b2NvbCA9IHRoaXMub3B0aW9ucy5zZWN1cmUgPyAnaHR0cHM6Ly8nIDogJ2h0dHA6Ly8nO1xuICB2YXIgdXJsID0gcHJvdG9jb2wgKyB0aGlzLm9wdGlvbnMuaG9zdCArICc6JyArIHRoaXMub3B0aW9ucy5wb3J0XG4gICAgKyB0aGlzLm9wdGlvbnMucGF0aCArIHRoaXMub3B0aW9ucy5rZXkgKyAnL3BlZXJzJztcbiAgdmFyIHF1ZXJ5U3RyaW5nID0gJz90cz0nICsgbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnJyArIE1hdGgucmFuZG9tKCk7XG4gIHVybCArPSBxdWVyeVN0cmluZztcblxuICAvLyBJZiB0aGVyZSdzIG5vIElEIHdlIG5lZWQgdG8gd2FpdCBmb3Igb25lIGJlZm9yZSB0cnlpbmcgdG8gaW5pdCBzb2NrZXQuXG4gIGh0dHAub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgaHR0cC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgIHNlbGYuX2Fib3J0KCdzZXJ2ZXItZXJyb3InLCAnQ291bGQgbm90IGdldCBwZWVycyBmcm9tIHRoZSBzZXJ2ZXIuJyk7XG4gICAgY2IoW10pO1xuICB9XG4gIGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaHR0cC5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgdmFyIGhlbHBmdWxFcnJvciA9ICcnO1xuICAgICAgaWYgKHNlbGYub3B0aW9ucy5ob3N0ICE9PSB1dGlsLkNMT1VEX0hPU1QpIHtcbiAgICAgICAgaGVscGZ1bEVycm9yID0gJ0l0IGxvb2tzIGxpa2UgeW91XFwncmUgdXNpbmcgdGhlIGNsb3VkIHNlcnZlci4gWW91IGNhbiBlbWFpbCAnXG4gICAgICAgICAgKyAndGVhbUBwZWVyanMuY29tIHRvIGVuYWJsZSBwZWVyIGxpc3RpbmcgZm9yIHlvdXIgQVBJIGtleS4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGVscGZ1bEVycm9yID0gJ1lvdSBuZWVkIHRvIGVuYWJsZSBgYWxsb3dfZGlzY292ZXJ5YCBvbiB5b3VyIHNlbGYtaG9zdGVkJ1xuICAgICAgICAgICsgJyBQZWVyU2VydmVyIHRvIHVzZSB0aGlzIGZlYXR1cmUuJztcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcignSXQgZG9lc25cXCd0IGxvb2sgbGlrZSB5b3UgaGF2ZSBwZXJtaXNzaW9uIHRvIGxpc3QgcGVlcnMgSURzLiAnICsgaGVscGZ1bEVycm9yKTtcbiAgICAgIGNiKFtdKTtcbiAgICB9IGVsc2UgaWYgKGh0dHAuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgIGNiKFtdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2IoSlNPTi5wYXJzZShodHRwLnJlc3BvbnNlVGV4dCkpO1xuICAgIH1cbiAgfTtcbiAgaHR0cC5zZW5kKG51bGwpO1xufVxuXG5leHBvcnRzLlBlZXIgPSBQZWVyO1xuLyoqXG4gKiBXcmFwcyBhIERhdGFDaGFubmVsIGJldHdlZW4gdHdvIFBlZXJzLlxuICovXG5mdW5jdGlvbiBEYXRhQ29ubmVjdGlvbihwZWVyLCBwcm92aWRlciwgb3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRGF0YUNvbm5lY3Rpb24pKSByZXR1cm4gbmV3IERhdGFDb25uZWN0aW9uKHBlZXIsIHByb3ZpZGVyLCBvcHRpb25zKTtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5vcHRpb25zID0gdXRpbC5leHRlbmQoe1xuICAgIHNlcmlhbGl6YXRpb246ICdiaW5hcnknLFxuICAgIHJlbGlhYmxlOiBmYWxzZVxuICB9LCBvcHRpb25zKTtcblxuICAvLyBDb25uZWN0aW9uIGlzIG5vdCBvcGVuIHlldC5cbiAgdGhpcy5vcGVuID0gZmFsc2U7XG4gIHRoaXMudHlwZSA9ICdkYXRhJztcbiAgdGhpcy5wZWVyID0gcGVlcjtcbiAgdGhpcy5wcm92aWRlciA9IHByb3ZpZGVyO1xuXG4gIHRoaXMuaWQgPSB0aGlzLm9wdGlvbnMuY29ubmVjdGlvbklkIHx8IERhdGFDb25uZWN0aW9uLl9pZFByZWZpeCArIHV0aWwucmFuZG9tVG9rZW4oKTtcblxuICB0aGlzLmxhYmVsID0gdGhpcy5vcHRpb25zLmxhYmVsIHx8IHRoaXMuaWQ7XG4gIHRoaXMubWV0YWRhdGEgPSB0aGlzLm9wdGlvbnMubWV0YWRhdGE7XG4gIHRoaXMuc2VyaWFsaXphdGlvbiA9IHRoaXMub3B0aW9ucy5zZXJpYWxpemF0aW9uO1xuICB0aGlzLnJlbGlhYmxlID0gdGhpcy5vcHRpb25zLnJlbGlhYmxlO1xuXG4gIC8vIERhdGEgY2hhbm5lbCBidWZmZXJpbmcuXG4gIHRoaXMuX2J1ZmZlciA9IFtdO1xuICB0aGlzLl9idWZmZXJpbmcgPSBmYWxzZTtcbiAgdGhpcy5idWZmZXJTaXplID0gMDtcblxuICAvLyBGb3Igc3RvcmluZyBsYXJnZSBkYXRhLlxuICB0aGlzLl9jaHVua2VkRGF0YSA9IHt9O1xuXG4gIGlmICh0aGlzLm9wdGlvbnMuX3BheWxvYWQpIHtcbiAgICB0aGlzLl9wZWVyQnJvd3NlciA9IHRoaXMub3B0aW9ucy5fcGF5bG9hZC5icm93c2VyO1xuICB9XG5cbiAgTmVnb3RpYXRvci5zdGFydENvbm5lY3Rpb24oXG4gICAgdGhpcyxcbiAgICB0aGlzLm9wdGlvbnMuX3BheWxvYWQgfHwge1xuICAgICAgb3JpZ2luYXRvcjogdHJ1ZVxuICAgIH1cbiAgKTtcbn1cblxudXRpbC5pbmhlcml0cyhEYXRhQ29ubmVjdGlvbiwgRXZlbnRFbWl0dGVyKTtcblxuRGF0YUNvbm5lY3Rpb24uX2lkUHJlZml4ID0gJ2RjXyc7XG5cbi8qKiBDYWxsZWQgYnkgdGhlIE5lZ290aWF0b3Igd2hlbiB0aGUgRGF0YUNoYW5uZWwgaXMgcmVhZHkuICovXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGRjKSB7XG4gIHRoaXMuX2RjID0gdGhpcy5kYXRhQ2hhbm5lbCA9IGRjO1xuICB0aGlzLl9jb25maWd1cmVEYXRhQ2hhbm5lbCgpO1xufVxuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NvbmZpZ3VyZURhdGFDaGFubmVsID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHV0aWwuc3VwcG9ydHMuc2N0cCkge1xuICAgIHRoaXMuX2RjLmJpbmFyeVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICB9XG4gIHRoaXMuX2RjLm9ub3BlbiA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWwubG9nKCdEYXRhIGNoYW5uZWwgY29ubmVjdGlvbiBzdWNjZXNzJyk7XG4gICAgc2VsZi5vcGVuID0gdHJ1ZTtcbiAgICBzZWxmLmVtaXQoJ29wZW4nKTtcbiAgfVxuXG4gIC8vIFVzZSB0aGUgUmVsaWFibGUgc2hpbSBmb3Igbm9uIEZpcmVmb3ggYnJvd3NlcnNcbiAgaWYgKCF1dGlsLnN1cHBvcnRzLnNjdHAgJiYgdGhpcy5yZWxpYWJsZSkge1xuICAgIHRoaXMuX3JlbGlhYmxlID0gbmV3IFJlbGlhYmxlKHRoaXMuX2RjLCB1dGlsLmRlYnVnKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9yZWxpYWJsZSkge1xuICAgIHRoaXMuX3JlbGlhYmxlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG1zZykge1xuICAgICAgc2VsZi5lbWl0KCdkYXRhJywgbXNnKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX2RjLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYuX2hhbmRsZURhdGFNZXNzYWdlKGUpO1xuICAgIH07XG4gIH1cbiAgdGhpcy5fZGMub25jbG9zZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB1dGlsLmxvZygnRGF0YUNoYW5uZWwgY2xvc2VkIGZvcjonLCBzZWxmLnBlZXIpO1xuICAgIHNlbGYuY2xvc2UoKTtcbiAgfTtcbn1cblxuLy8gSGFuZGxlcyBhIERhdGFDaGFubmVsIG1lc3NhZ2UuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuX2hhbmRsZURhdGFNZXNzYWdlID0gZnVuY3Rpb24oZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkYXRhID0gZS5kYXRhO1xuICB2YXIgZGF0YXR5cGUgPSBkYXRhLmNvbnN0cnVjdG9yO1xuICBpZiAodGhpcy5zZXJpYWxpemF0aW9uID09PSAnYmluYXJ5JyB8fCB0aGlzLnNlcmlhbGl6YXRpb24gPT09ICdiaW5hcnktdXRmOCcpIHtcbiAgICBpZiAoZGF0YXR5cGUgPT09IEJsb2IpIHtcbiAgICAgIC8vIERhdGF0eXBlIHNob3VsZCBuZXZlciBiZSBibG9iXG4gICAgICB1dGlsLmJsb2JUb0FycmF5QnVmZmVyKGRhdGEsIGZ1bmN0aW9uKGFiKSB7XG4gICAgICAgIGRhdGEgPSB1dGlsLnVucGFjayhhYik7XG4gICAgICAgIHNlbGYuZW1pdCgnZGF0YScsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChkYXRhdHlwZSA9PT0gQXJyYXlCdWZmZXIpIHtcbiAgICAgIGRhdGEgPSB1dGlsLnVucGFjayhkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGF0eXBlID09PSBTdHJpbmcpIHtcbiAgICAgIC8vIFN0cmluZyBmYWxsYmFjayBmb3IgYmluYXJ5IGRhdGEgZm9yIGJyb3dzZXJzIHRoYXQgZG9uJ3Qgc3VwcG9ydCBiaW5hcnkgeWV0XG4gICAgICB2YXIgYWIgPSB1dGlsLmJpbmFyeVN0cmluZ1RvQXJyYXlCdWZmZXIoZGF0YSk7XG4gICAgICBkYXRhID0gdXRpbC51bnBhY2soYWIpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0aGlzLnNlcmlhbGl6YXRpb24gPT09ICdqc29uJykge1xuICAgIGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICB9XG5cbiAgLy8gQ2hlY2sgaWYgd2UndmUgY2h1bmtlZC0taWYgc28sIHBpZWNlIHRoaW5ncyBiYWNrIHRvZ2V0aGVyLlxuICAvLyBXZSdyZSBndWFyYW50ZWVkIHRoYXQgdGhpcyBpc24ndCAwLlxuICBpZiAoZGF0YS5fX3BlZXJEYXRhKSB7XG4gICAgdmFyIGlkID0gZGF0YS5fX3BlZXJEYXRhO1xuICAgIHZhciBjaHVua0luZm8gPSB0aGlzLl9jaHVua2VkRGF0YVtpZF0gfHwge2RhdGE6IFtdLCBjb3VudDogMCwgdG90YWw6IGRhdGEudG90YWx9O1xuXG4gICAgY2h1bmtJbmZvLmRhdGFbZGF0YS5uXSA9IGRhdGEuZGF0YTtcbiAgICBjaHVua0luZm8uY291bnQgKz0gMTtcblxuICAgIGlmIChjaHVua0luZm8udG90YWwgPT09IGNodW5rSW5mby5jb3VudCkge1xuICAgICAgLy8gQ2xlYW4gdXAgYmVmb3JlIG1ha2luZyB0aGUgcmVjdXJzaXZlIGNhbGwgdG8gYF9oYW5kbGVEYXRhTWVzc2FnZWAuXG4gICAgICBkZWxldGUgdGhpcy5fY2h1bmtlZERhdGFbaWRdO1xuXG4gICAgICAvLyBXZSd2ZSByZWNlaXZlZCBhbGwgdGhlIGNodW5rcy0tdGltZSB0byBjb25zdHJ1Y3QgdGhlIGNvbXBsZXRlIGRhdGEuXG4gICAgICBkYXRhID0gbmV3IEJsb2IoY2h1bmtJbmZvLmRhdGEpO1xuICAgICAgdGhpcy5faGFuZGxlRGF0YU1lc3NhZ2Uoe2RhdGE6IGRhdGF9KTtcbiAgICB9XG5cbiAgICB0aGlzLl9jaHVua2VkRGF0YVtpZF0gPSBjaHVua0luZm87XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5lbWl0KCdkYXRhJywgZGF0YSk7XG59XG5cbi8qKlxuICogRXhwb3NlZCBmdW5jdGlvbmFsaXR5IGZvciB1c2Vycy5cbiAqL1xuXG4vKiogQWxsb3dzIHVzZXIgdG8gY2xvc2UgY29ubmVjdGlvbi4gKi9cbkRhdGFDb25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMub3Blbikge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLm9wZW4gPSBmYWxzZTtcbiAgTmVnb3RpYXRvci5jbGVhbnVwKHRoaXMpO1xuICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG59XG5cbi8qKiBBbGxvd3MgdXNlciB0byBzZW5kIGRhdGEuICovXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKGRhdGEsIGNodW5rZWQpIHtcbiAgaWYgKCF0aGlzLm9wZW4pIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDb25uZWN0aW9uIGlzIG5vdCBvcGVuLiBZb3Ugc2hvdWxkIGxpc3RlbiBmb3IgdGhlIGBvcGVuYCBldmVudCBiZWZvcmUgc2VuZGluZyBtZXNzYWdlcy4nKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0aGlzLl9yZWxpYWJsZSkge1xuICAgIC8vIE5vdGU6IHJlbGlhYmxlIHNoaW0gc2VuZGluZyB3aWxsIG1ha2UgaXQgc28gdGhhdCB5b3UgY2Fubm90IGN1c3RvbWl6ZVxuICAgIC8vIHNlcmlhbGl6YXRpb24uXG4gICAgdGhpcy5fcmVsaWFibGUuc2VuZChkYXRhKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5zZXJpYWxpemF0aW9uID09PSAnanNvbicpIHtcbiAgICB0aGlzLl9idWZmZXJlZFNlbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICB9IGVsc2UgaWYgKHRoaXMuc2VyaWFsaXphdGlvbiA9PT0gJ2JpbmFyeScgfHwgdGhpcy5zZXJpYWxpemF0aW9uID09PSAnYmluYXJ5LXV0ZjgnKSB7XG4gICAgdmFyIGJsb2IgPSB1dGlsLnBhY2soZGF0YSk7XG5cbiAgICAvLyBGb3IgQ2hyb21lLUZpcmVmb3ggaW50ZXJvcGVyYWJpbGl0eSwgd2UgbmVlZCB0byBtYWtlIEZpcmVmb3ggXCJjaHVua1wiXG4gICAgLy8gdGhlIGRhdGEgaXQgc2VuZHMgb3V0LlxuICAgIHZhciBuZWVkc0NodW5raW5nID0gdXRpbC5jaHVua2VkQnJvd3NlcnNbdGhpcy5fcGVlckJyb3dzZXJdIHx8IHV0aWwuY2h1bmtlZEJyb3dzZXJzW3V0aWwuYnJvd3Nlcl07XG4gICAgaWYgKG5lZWRzQ2h1bmtpbmcgJiYgIWNodW5rZWQgJiYgYmxvYi5zaXplID4gdXRpbC5jaHVua2VkTVRVKSB7XG4gICAgICB0aGlzLl9zZW5kQ2h1bmtzKGJsb2IpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIERhdGFDaGFubmVsIGN1cnJlbnRseSBvbmx5IHN1cHBvcnRzIHN0cmluZ3MuXG4gICAgaWYgKCF1dGlsLnN1cHBvcnRzLnNjdHApIHtcbiAgICAgIHV0aWwuYmxvYlRvQmluYXJ5U3RyaW5nKGJsb2IsIGZ1bmN0aW9uKHN0cikge1xuICAgICAgICBzZWxmLl9idWZmZXJlZFNlbmQoc3RyKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoIXV0aWwuc3VwcG9ydHMuYmluYXJ5QmxvYikge1xuICAgICAgLy8gV2Ugb25seSBkbyB0aGlzIGlmIHdlIHJlYWxseSBuZWVkIHRvIChlLmcuIGJsb2JzIGFyZSBub3Qgc3VwcG9ydGVkKSxcbiAgICAgIC8vIGJlY2F1c2UgdGhpcyBjb252ZXJzaW9uIGlzIGNvc3RseS5cbiAgICAgIHV0aWwuYmxvYlRvQXJyYXlCdWZmZXIoYmxvYiwgZnVuY3Rpb24oYWIpIHtcbiAgICAgICAgc2VsZi5fYnVmZmVyZWRTZW5kKGFiKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9idWZmZXJlZFNlbmQoYmxvYik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2J1ZmZlcmVkU2VuZChkYXRhKTtcbiAgfVxufVxuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuX2J1ZmZlcmVkU2VuZCA9IGZ1bmN0aW9uKG1zZykge1xuICBpZiAodGhpcy5fYnVmZmVyaW5nIHx8ICF0aGlzLl90cnlTZW5kKG1zZykpIHtcbiAgICB0aGlzLl9idWZmZXIucHVzaChtc2cpO1xuICAgIHRoaXMuYnVmZmVyU2l6ZSA9IHRoaXMuX2J1ZmZlci5sZW5ndGg7XG4gIH1cbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBzZW5kIHN1Y2NlZWRzLlxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLl90cnlTZW5kID0gZnVuY3Rpb24obXNnKSB7XG4gIHRyeSB7XG4gICAgdGhpcy5fZGMuc2VuZChtc2cpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhpcy5fYnVmZmVyaW5nID0gdHJ1ZTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgLy8gVHJ5IGFnYWluLlxuICAgICAgc2VsZi5fYnVmZmVyaW5nID0gZmFsc2U7XG4gICAgICBzZWxmLl90cnlCdWZmZXIoKTtcbiAgICB9LCAxMDApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gVHJ5IHRvIHNlbmQgdGhlIGZpcnN0IG1lc3NhZ2UgaW4gdGhlIGJ1ZmZlci5cbkRhdGFDb25uZWN0aW9uLnByb3RvdHlwZS5fdHJ5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9idWZmZXIubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG1zZyA9IHRoaXMuX2J1ZmZlclswXTtcblxuICBpZiAodGhpcy5fdHJ5U2VuZChtc2cpKSB7XG4gICAgdGhpcy5fYnVmZmVyLnNoaWZ0KCk7XG4gICAgdGhpcy5idWZmZXJTaXplID0gdGhpcy5fYnVmZmVyLmxlbmd0aDtcbiAgICB0aGlzLl90cnlCdWZmZXIoKTtcbiAgfVxufVxuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuX3NlbmRDaHVua3MgPSBmdW5jdGlvbihibG9iKSB7XG4gIHZhciBibG9icyA9IHV0aWwuY2h1bmsoYmxvYik7XG4gIGZvciAodmFyIGkgPSAwLCBpaSA9IGJsb2JzLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICB2YXIgYmxvYiA9IGJsb2JzW2ldO1xuICAgIHRoaXMuc2VuZChibG9iLCB0cnVlKTtcbiAgfVxufVxuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuaGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHBheWxvYWQgPSBtZXNzYWdlLnBheWxvYWQ7XG5cbiAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcbiAgICBjYXNlICdBTlNXRVInOlxuICAgICAgdGhpcy5fcGVlckJyb3dzZXIgPSBwYXlsb2FkLmJyb3dzZXI7XG5cbiAgICAgIC8vIEZvcndhcmQgdG8gbmVnb3RpYXRvclxuICAgICAgTmVnb3RpYXRvci5oYW5kbGVTRFAobWVzc2FnZS50eXBlLCB0aGlzLCBwYXlsb2FkLnNkcCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdDQU5ESURBVEUnOlxuICAgICAgTmVnb3RpYXRvci5oYW5kbGVDYW5kaWRhdGUodGhpcywgcGF5bG9hZC5jYW5kaWRhdGUpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHV0aWwud2FybignVW5yZWNvZ25pemVkIG1lc3NhZ2UgdHlwZTonLCBtZXNzYWdlLnR5cGUsICdmcm9tIHBlZXI6JywgdGhpcy5wZWVyKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG4vKipcbiAqIFdyYXBzIHRoZSBzdHJlYW1pbmcgaW50ZXJmYWNlIGJldHdlZW4gdHdvIFBlZXJzLlxuICovXG5mdW5jdGlvbiBNZWRpYUNvbm5lY3Rpb24ocGVlciwgcHJvdmlkZXIsIG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1lZGlhQ29ubmVjdGlvbikpIHJldHVybiBuZXcgTWVkaWFDb25uZWN0aW9uKHBlZXIsIHByb3ZpZGVyLCBvcHRpb25zKTtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5vcHRpb25zID0gdXRpbC5leHRlbmQoe30sIG9wdGlvbnMpO1xuXG4gIHRoaXMub3BlbiA9IGZhbHNlO1xuICB0aGlzLnR5cGUgPSAnbWVkaWEnO1xuICB0aGlzLnBlZXIgPSBwZWVyO1xuICB0aGlzLnByb3ZpZGVyID0gcHJvdmlkZXI7XG4gIHRoaXMubWV0YWRhdGEgPSB0aGlzLm9wdGlvbnMubWV0YWRhdGE7XG4gIHRoaXMubG9jYWxTdHJlYW0gPSB0aGlzLm9wdGlvbnMuX3N0cmVhbTtcblxuICB0aGlzLmlkID0gdGhpcy5vcHRpb25zLmNvbm5lY3Rpb25JZCB8fCBNZWRpYUNvbm5lY3Rpb24uX2lkUHJlZml4ICsgdXRpbC5yYW5kb21Ub2tlbigpO1xuICBpZiAodGhpcy5sb2NhbFN0cmVhbSkge1xuICAgIE5lZ290aWF0b3Iuc3RhcnRDb25uZWN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgIHtfc3RyZWFtOiB0aGlzLmxvY2FsU3RyZWFtLCBvcmlnaW5hdG9yOiB0cnVlfVxuICAgICk7XG4gIH1cbn07XG5cbnV0aWwuaW5oZXJpdHMoTWVkaWFDb25uZWN0aW9uLCBFdmVudEVtaXR0ZXIpO1xuXG5NZWRpYUNvbm5lY3Rpb24uX2lkUHJlZml4ID0gJ21jXyc7XG5cbk1lZGlhQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24ocmVtb3RlU3RyZWFtKSB7XG4gIHV0aWwubG9nKCdSZWNlaXZpbmcgc3RyZWFtJywgcmVtb3RlU3RyZWFtKTtcblxuICB0aGlzLnJlbW90ZVN0cmVhbSA9IHJlbW90ZVN0cmVhbTtcbiAgdGhpcy5lbWl0KCdzdHJlYW0nLCByZW1vdGVTdHJlYW0pOyAvLyBTaG91bGQgd2UgY2FsbCB0aGlzIGBvcGVuYD9cblxufTtcblxuTWVkaWFDb25uZWN0aW9uLnByb3RvdHlwZS5oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgcGF5bG9hZCA9IG1lc3NhZ2UucGF5bG9hZDtcblxuICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xuICAgIGNhc2UgJ0FOU1dFUic6XG4gICAgICAvLyBGb3J3YXJkIHRvIG5lZ290aWF0b3JcbiAgICAgIE5lZ290aWF0b3IuaGFuZGxlU0RQKG1lc3NhZ2UudHlwZSwgdGhpcywgcGF5bG9hZC5zZHApO1xuICAgICAgdGhpcy5vcGVuID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0NBTkRJREFURSc6XG4gICAgICBOZWdvdGlhdG9yLmhhbmRsZUNhbmRpZGF0ZSh0aGlzLCBwYXlsb2FkLmNhbmRpZGF0ZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdXRpbC53YXJuKCdVbnJlY29nbml6ZWQgbWVzc2FnZSB0eXBlOicsIG1lc3NhZ2UudHlwZSwgJ2Zyb20gcGVlcjonLCB0aGlzLnBlZXIpO1xuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuTWVkaWFDb25uZWN0aW9uLnByb3RvdHlwZS5hbnN3ZXIgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgaWYgKHRoaXMubG9jYWxTdHJlYW0pIHtcbiAgICB1dGlsLndhcm4oJ0xvY2FsIHN0cmVhbSBhbHJlYWR5IGV4aXN0cyBvbiB0aGlzIE1lZGlhQ29ubmVjdGlvbi4gQXJlIHlvdSBhbnN3ZXJpbmcgYSBjYWxsIHR3aWNlPycpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMub3B0aW9ucy5fcGF5bG9hZC5fc3RyZWFtID0gc3RyZWFtO1xuXG4gIHRoaXMubG9jYWxTdHJlYW0gPSBzdHJlYW07XG4gIE5lZ290aWF0b3Iuc3RhcnRDb25uZWN0aW9uKFxuICAgIHRoaXMsXG4gICAgdGhpcy5vcHRpb25zLl9wYXlsb2FkXG4gIClcbiAgLy8gUmV0cmlldmUgbG9zdCBtZXNzYWdlcyBzdG9yZWQgYmVjYXVzZSBQZWVyQ29ubmVjdGlvbiBub3Qgc2V0IHVwLlxuICB2YXIgbWVzc2FnZXMgPSB0aGlzLnByb3ZpZGVyLl9nZXRNZXNzYWdlcyh0aGlzLmlkKTtcbiAgZm9yICh2YXIgaSA9IDAsIGlpID0gbWVzc2FnZXMubGVuZ3RoOyBpIDwgaWk7IGkgKz0gMSkge1xuICAgIHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlc1tpXSk7XG4gIH1cbiAgdGhpcy5vcGVuID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogRXhwb3NlZCBmdW5jdGlvbmFsaXR5IGZvciB1c2Vycy5cbiAqL1xuXG4vKiogQWxsb3dzIHVzZXIgdG8gY2xvc2UgY29ubmVjdGlvbi4gKi9cbk1lZGlhQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLm9wZW4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5vcGVuID0gZmFsc2U7XG4gIE5lZ290aWF0b3IuY2xlYW51cCh0aGlzKTtcbiAgdGhpcy5lbWl0KCdjbG9zZScpXG59O1xuLyoqXG4gKiBNYW5hZ2VzIGFsbCBuZWdvdGlhdGlvbnMgYmV0d2VlbiBQZWVycy5cbiAqL1xudmFyIE5lZ290aWF0b3IgPSB7XG4gIHBjczoge1xuICAgIGRhdGE6IHt9LFxuICAgIG1lZGlhOiB7fVxuICB9LCAvLyB0eXBlID0+IHtwZWVySWQ6IHtwY19pZDogcGN9fS5cbiAgLy9wcm92aWRlcnM6IHt9LCAvLyBwcm92aWRlcidzIGlkID0+IHByb3ZpZGVycyAodGhlcmUgbWF5IGJlIG11bHRpcGxlIHByb3ZpZGVycy9jbGllbnQuXG4gIHF1ZXVlOiBbXSAvLyBjb25uZWN0aW9ucyB0aGF0IGFyZSBkZWxheWVkIGR1ZSB0byBhIFBDIGJlaW5nIGluIHVzZS5cbn1cblxuTmVnb3RpYXRvci5faWRQcmVmaXggPSAncGNfJztcblxuLyoqIFJldHVybnMgYSBQZWVyQ29ubmVjdGlvbiBvYmplY3Qgc2V0IHVwIGNvcnJlY3RseSAoZm9yIGRhdGEsIG1lZGlhKS4gKi9cbk5lZ290aWF0b3Iuc3RhcnRDb25uZWN0aW9uID0gZnVuY3Rpb24oY29ubmVjdGlvbiwgb3B0aW9ucykge1xuICB2YXIgcGMgPSBOZWdvdGlhdG9yLl9nZXRQZWVyQ29ubmVjdGlvbihjb25uZWN0aW9uLCBvcHRpb25zKTtcblxuICBpZiAoY29ubmVjdGlvbi50eXBlID09PSAnbWVkaWEnICYmIG9wdGlvbnMuX3N0cmVhbSkge1xuICAgIC8vIEFkZCB0aGUgc3RyZWFtLlxuICAgIHBjLmFkZFN0cmVhbShvcHRpb25zLl9zdHJlYW0pO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBjb25uZWN0aW9uJ3MgUEMuXG4gIGNvbm5lY3Rpb24ucGMgPSBjb25uZWN0aW9uLnBlZXJDb25uZWN0aW9uID0gcGM7XG4gIC8vIFdoYXQgZG8gd2UgbmVlZCB0byBkbyBub3c/XG4gIGlmIChvcHRpb25zLm9yaWdpbmF0b3IpIHtcbiAgICBpZiAoY29ubmVjdGlvbi50eXBlID09PSAnZGF0YScpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgZGF0YWNoYW5uZWwuXG4gICAgICB2YXIgY29uZmlnID0ge307XG4gICAgICAvLyBEcm9wcGluZyByZWxpYWJsZTpmYWxzZSBzdXBwb3J0LCBzaW5jZSBpdCBzZWVtcyB0byBiZSBjcmFzaGluZ1xuICAgICAgLy8gQ2hyb21lLlxuICAgICAgLyppZiAodXRpbC5zdXBwb3J0cy5zY3RwICYmICFvcHRpb25zLnJlbGlhYmxlKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgY2Fub25pY2FsIHJlbGlhYmxlIHN1cHBvcnQuLi5cbiAgICAgICAgY29uZmlnID0ge21heFJldHJhbnNtaXRzOiAwfTtcbiAgICAgIH0qL1xuICAgICAgLy8gRmFsbGJhY2sgdG8gZW5zdXJlIG9sZGVyIGJyb3dzZXJzIGRvbid0IGNyYXNoLlxuICAgICAgaWYgKCF1dGlsLnN1cHBvcnRzLnNjdHApIHtcbiAgICAgICAgY29uZmlnID0ge3JlbGlhYmxlOiBvcHRpb25zLnJlbGlhYmxlfTtcbiAgICAgIH1cbiAgICAgIHZhciBkYyA9IHBjLmNyZWF0ZURhdGFDaGFubmVsKGNvbm5lY3Rpb24ubGFiZWwsIGNvbmZpZyk7XG4gICAgICBjb25uZWN0aW9uLmluaXRpYWxpemUoZGMpO1xuICAgIH1cblxuICAgIGlmICghdXRpbC5zdXBwb3J0cy5vbm5lZ290aWF0aW9ubmVlZGVkKSB7XG4gICAgICBOZWdvdGlhdG9yLl9tYWtlT2ZmZXIoY29ubmVjdGlvbik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIE5lZ290aWF0b3IuaGFuZGxlU0RQKCdPRkZFUicsIGNvbm5lY3Rpb24sIG9wdGlvbnMuc2RwKTtcbiAgfVxufVxuXG5OZWdvdGlhdG9yLl9nZXRQZWVyQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24sIG9wdGlvbnMpIHtcbiAgaWYgKCFOZWdvdGlhdG9yLnBjc1tjb25uZWN0aW9uLnR5cGVdKSB7XG4gICAgdXRpbC5lcnJvcihjb25uZWN0aW9uLnR5cGUgKyAnIGlzIG5vdCBhIHZhbGlkIGNvbm5lY3Rpb24gdHlwZS4gTWF5YmUgeW91IG92ZXJyb2RlIHRoZSBgdHlwZWAgcHJvcGVydHkgc29tZXdoZXJlLicpO1xuICB9XG5cbiAgaWYgKCFOZWdvdGlhdG9yLnBjc1tjb25uZWN0aW9uLnR5cGVdW2Nvbm5lY3Rpb24ucGVlcl0pIHtcbiAgICBOZWdvdGlhdG9yLnBjc1tjb25uZWN0aW9uLnR5cGVdW2Nvbm5lY3Rpb24ucGVlcl0gPSB7fTtcbiAgfVxuICB2YXIgcGVlckNvbm5lY3Rpb25zID0gTmVnb3RpYXRvci5wY3NbY29ubmVjdGlvbi50eXBlXVtjb25uZWN0aW9uLnBlZXJdO1xuXG4gIHZhciBwYztcbiAgLy8gTm90IG11bHRpcGxleGluZyB3aGlsZSBGRiBhbmQgQ2hyb21lIGhhdmUgbm90LWdyZWF0IHN1cHBvcnQgZm9yIGl0LlxuICAvKmlmIChvcHRpb25zLm11bHRpcGxleCkge1xuICAgIGlkcyA9IE9iamVjdC5rZXlzKHBlZXJDb25uZWN0aW9ucyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlpID0gaWRzLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICAgIHBjID0gcGVlckNvbm5lY3Rpb25zW2lkc1tpXV07XG4gICAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgICAgIGJyZWFrOyAvLyBXZSBjYW4gZ28gYWhlYWQgYW5kIHVzZSB0aGlzIFBDLlxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlICovXG4gIGlmIChvcHRpb25zLnBjKSB7IC8vIFNpbXBsZXN0IGNhc2U6IFBDIGlkIGFscmVhZHkgcHJvdmlkZWQgZm9yIHVzLlxuICAgIHBjID0gTmVnb3RpYXRvci5wY3NbY29ubmVjdGlvbi50eXBlXVtjb25uZWN0aW9uLnBlZXJdW29wdGlvbnMucGNdO1xuICB9XG5cbiAgaWYgKCFwYyB8fCBwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ3N0YWJsZScpIHtcbiAgICBwYyA9IE5lZ290aWF0b3IuX3N0YXJ0UGVlckNvbm5lY3Rpb24oY29ubmVjdGlvbik7XG4gIH1cbiAgcmV0dXJuIHBjO1xufVxuXG4vKlxuTmVnb3RpYXRvci5fYWRkUHJvdmlkZXIgPSBmdW5jdGlvbihwcm92aWRlcikge1xuICBpZiAoKCFwcm92aWRlci5pZCAmJiAhcHJvdmlkZXIuZGlzY29ubmVjdGVkKSB8fCAhcHJvdmlkZXIuc29ja2V0Lm9wZW4pIHtcbiAgICAvLyBXYWl0IGZvciBwcm92aWRlciB0byBvYnRhaW4gYW4gSUQuXG4gICAgcHJvdmlkZXIub24oJ29wZW4nLCBmdW5jdGlvbihpZCkge1xuICAgICAgTmVnb3RpYXRvci5fYWRkUHJvdmlkZXIocHJvdmlkZXIpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIE5lZ290aWF0b3IucHJvdmlkZXJzW3Byb3ZpZGVyLmlkXSA9IHByb3ZpZGVyO1xuICB9XG59Ki9cblxuXG4vKiogU3RhcnQgYSBQQy4gKi9cbk5lZ290aWF0b3IuX3N0YXJ0UGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbihjb25uZWN0aW9uKSB7XG4gIHV0aWwubG9nKCdDcmVhdGluZyBSVENQZWVyQ29ubmVjdGlvbi4nKTtcblxuICB2YXIgaWQgPSBOZWdvdGlhdG9yLl9pZFByZWZpeCArIHV0aWwucmFuZG9tVG9rZW4oKTtcbiAgdmFyIG9wdGlvbmFsID0ge307XG5cbiAgaWYgKGNvbm5lY3Rpb24udHlwZSA9PT0gJ2RhdGEnICYmICF1dGlsLnN1cHBvcnRzLnNjdHApIHtcbiAgICBvcHRpb25hbCA9IHtvcHRpb25hbDogW3tSdHBEYXRhQ2hhbm5lbHM6IHRydWV9XX07XG4gIH0gZWxzZSBpZiAoY29ubmVjdGlvbi50eXBlID09PSAnbWVkaWEnKSB7XG4gICAgLy8gSW50ZXJvcCByZXEgZm9yIGNocm9tZS5cbiAgICBvcHRpb25hbCA9IHtvcHRpb25hbDogW3tEdGxzU3J0cEtleUFncmVlbWVudDogdHJ1ZX1dfTtcbiAgfVxuXG4gIHZhciBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihjb25uZWN0aW9uLnByb3ZpZGVyLm9wdGlvbnMuY29uZmlnLCBvcHRpb25hbCk7XG4gIE5lZ290aWF0b3IucGNzW2Nvbm5lY3Rpb24udHlwZV1bY29ubmVjdGlvbi5wZWVyXVtpZF0gPSBwYztcblxuICBOZWdvdGlhdG9yLl9zZXR1cExpc3RlbmVycyhjb25uZWN0aW9uLCBwYywgaWQpO1xuXG4gIHJldHVybiBwYztcbn1cblxuLyoqIFNldCB1cCB2YXJpb3VzIFdlYlJUQyBsaXN0ZW5lcnMuICovXG5OZWdvdGlhdG9yLl9zZXR1cExpc3RlbmVycyA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24sIHBjLCBwY19pZCkge1xuICB2YXIgcGVlcklkID0gY29ubmVjdGlvbi5wZWVyO1xuICB2YXIgY29ubmVjdGlvbklkID0gY29ubmVjdGlvbi5pZDtcbiAgdmFyIHByb3ZpZGVyID0gY29ubmVjdGlvbi5wcm92aWRlcjtcblxuICAvLyBJQ0UgQ0FORElEQVRFUy5cbiAgdXRpbC5sb2coJ0xpc3RlbmluZyBmb3IgSUNFIGNhbmRpZGF0ZXMuJyk7XG4gIHBjLm9uaWNlY2FuZGlkYXRlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgaWYgKGV2dC5jYW5kaWRhdGUpIHtcbiAgICAgIHV0aWwubG9nKCdSZWNlaXZlZCBJQ0UgY2FuZGlkYXRlcyBmb3I6JywgY29ubmVjdGlvbi5wZWVyKTtcbiAgICAgIHByb3ZpZGVyLnNvY2tldC5zZW5kKHtcbiAgICAgICAgdHlwZTogJ0NBTkRJREFURScsXG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBjYW5kaWRhdGU6IGV2dC5jYW5kaWRhdGUsXG4gICAgICAgICAgdHlwZTogY29ubmVjdGlvbi50eXBlLFxuICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbi5pZFxuICAgICAgICB9LFxuICAgICAgICBkc3Q6IHBlZXJJZFxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIHBjLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoIChwYy5pY2VDb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgIGNhc2UgJ2Rpc2Nvbm5lY3RlZCc6XG4gICAgICBjYXNlICdmYWlsZWQnOlxuICAgICAgICB1dGlsLmxvZygnaWNlQ29ubmVjdGlvblN0YXRlIGlzIGRpc2Nvbm5lY3RlZCwgY2xvc2luZyBjb25uZWN0aW9ucyB0byAnICsgcGVlcklkKTtcbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvbXBsZXRlZCc6XG4gICAgICAgIHBjLm9uaWNlY2FuZGlkYXRlID0gdXRpbC5ub29wO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH07XG5cbiAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIENocm9tZSBpbXBscy5cbiAgcGMub25pY2VjaGFuZ2UgPSBwYy5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZTtcblxuICAvLyBPTk5FR09USUFUSU9OTkVFREVEIChDaHJvbWUpXG4gIHV0aWwubG9nKCdMaXN0ZW5pbmcgZm9yIGBuZWdvdGlhdGlvbm5lZWRlZGAnKTtcbiAgcGMub25uZWdvdGlhdGlvbm5lZWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWwubG9nKCdgbmVnb3RpYXRpb25uZWVkZWRgIHRyaWdnZXJlZCcpO1xuICAgIGlmIChwYy5zaWduYWxpbmdTdGF0ZSA9PSAnc3RhYmxlJykge1xuICAgICAgTmVnb3RpYXRvci5fbWFrZU9mZmVyKGNvbm5lY3Rpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1dGlsLmxvZygnb25uZWdvdGlhdGlvbm5lZWRlZCB0cmlnZ2VyZWQgd2hlbiBub3Qgc3RhYmxlLiBJcyBhbm90aGVyIGNvbm5lY3Rpb24gYmVpbmcgZXN0YWJsaXNoZWQ/Jyk7XG4gICAgfVxuICB9O1xuXG4gIC8vIERBVEFDT05ORUNUSU9OLlxuICB1dGlsLmxvZygnTGlzdGVuaW5nIGZvciBkYXRhIGNoYW5uZWwnKTtcbiAgLy8gRmlyZWQgYmV0d2VlbiBvZmZlciBhbmQgYW5zd2VyLCBzbyBvcHRpb25zIHNob3VsZCBhbHJlYWR5IGJlIHNhdmVkXG4gIC8vIGluIHRoZSBvcHRpb25zIGhhc2guXG4gIHBjLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbihldnQpIHtcbiAgICB1dGlsLmxvZygnUmVjZWl2ZWQgZGF0YSBjaGFubmVsJyk7XG4gICAgdmFyIGRjID0gZXZ0LmNoYW5uZWw7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBwcm92aWRlci5nZXRDb25uZWN0aW9uKHBlZXJJZCwgY29ubmVjdGlvbklkKTtcbiAgICBjb25uZWN0aW9uLmluaXRpYWxpemUoZGMpO1xuICB9O1xuXG4gIC8vIE1FRElBQ09OTkVDVElPTi5cbiAgdXRpbC5sb2coJ0xpc3RlbmluZyBmb3IgcmVtb3RlIHN0cmVhbScpO1xuICBwYy5vbmFkZHN0cmVhbSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgIHV0aWwubG9nKCdSZWNlaXZlZCByZW1vdGUgc3RyZWFtJyk7XG4gICAgdmFyIHN0cmVhbSA9IGV2dC5zdHJlYW07XG4gICAgcHJvdmlkZXIuZ2V0Q29ubmVjdGlvbihwZWVySWQsIGNvbm5lY3Rpb25JZCkuYWRkU3RyZWFtKHN0cmVhbSk7XG4gIH07XG59XG5cbk5lZ290aWF0b3IuY2xlYW51cCA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24pIHtcbiAgdXRpbC5sb2coJ0NsZWFuaW5nIHVwIFBlZXJDb25uZWN0aW9uIHRvICcgKyBjb25uZWN0aW9uLnBlZXIpO1xuXG4gIHZhciBwYyA9IGNvbm5lY3Rpb24ucGM7XG5cbiAgaWYgKCEhcGMgJiYgKHBjLnJlYWR5U3RhdGUgIT09ICdjbG9zZWQnIHx8IHBjLnNpZ25hbGluZ1N0YXRlICE9PSAnY2xvc2VkJykpIHtcbiAgICBwYy5jbG9zZSgpO1xuICAgIGNvbm5lY3Rpb24ucGMgPSBudWxsO1xuICB9XG59XG5cbk5lZ290aWF0b3IuX21ha2VPZmZlciA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24pIHtcbiAgdmFyIHBjID0gY29ubmVjdGlvbi5wYztcbiAgcGMuY3JlYXRlT2ZmZXIoZnVuY3Rpb24ob2ZmZXIpIHtcbiAgICB1dGlsLmxvZygnQ3JlYXRlZCBvZmZlci4nKTtcblxuICAgIGlmICghdXRpbC5zdXBwb3J0cy5zY3RwICYmIGNvbm5lY3Rpb24udHlwZSA9PT0gJ2RhdGEnICYmIGNvbm5lY3Rpb24ucmVsaWFibGUpIHtcbiAgICAgIG9mZmVyLnNkcCA9IFJlbGlhYmxlLmhpZ2hlckJhbmR3aWR0aFNEUChvZmZlci5zZHApO1xuICAgIH1cblxuICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24ob2ZmZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgdXRpbC5sb2coJ1NldCBsb2NhbERlc2NyaXB0aW9uOiBvZmZlcicsICdmb3I6JywgY29ubmVjdGlvbi5wZWVyKTtcbiAgICAgIGNvbm5lY3Rpb24ucHJvdmlkZXIuc29ja2V0LnNlbmQoe1xuICAgICAgICB0eXBlOiAnT0ZGRVInLFxuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgc2RwOiBvZmZlcixcbiAgICAgICAgICB0eXBlOiBjb25uZWN0aW9uLnR5cGUsXG4gICAgICAgICAgbGFiZWw6IGNvbm5lY3Rpb24ubGFiZWwsXG4gICAgICAgICAgY29ubmVjdGlvbklkOiBjb25uZWN0aW9uLmlkLFxuICAgICAgICAgIHJlbGlhYmxlOiBjb25uZWN0aW9uLnJlbGlhYmxlLFxuICAgICAgICAgIHNlcmlhbGl6YXRpb246IGNvbm5lY3Rpb24uc2VyaWFsaXphdGlvbixcbiAgICAgICAgICBtZXRhZGF0YTogY29ubmVjdGlvbi5tZXRhZGF0YSxcbiAgICAgICAgICBicm93c2VyOiB1dGlsLmJyb3dzZXJcbiAgICAgICAgfSxcbiAgICAgICAgZHN0OiBjb25uZWN0aW9uLnBlZXJcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgY29ubmVjdGlvbi5wcm92aWRlci5lbWl0RXJyb3IoJ3dlYnJ0YycsIGVycik7XG4gICAgICB1dGlsLmxvZygnRmFpbGVkIHRvIHNldExvY2FsRGVzY3JpcHRpb24sICcsIGVycik7XG4gICAgfSk7XG4gIH0sIGZ1bmN0aW9uKGVycikge1xuICAgIGNvbm5lY3Rpb24ucHJvdmlkZXIuZW1pdEVycm9yKCd3ZWJydGMnLCBlcnIpO1xuICAgIHV0aWwubG9nKCdGYWlsZWQgdG8gY3JlYXRlT2ZmZXIsICcsIGVycik7XG4gIH0sIGNvbm5lY3Rpb24ub3B0aW9ucy5jb25zdHJhaW50cyk7XG59XG5cbk5lZ290aWF0b3IuX21ha2VBbnN3ZXIgPSBmdW5jdGlvbihjb25uZWN0aW9uKSB7XG4gIHZhciBwYyA9IGNvbm5lY3Rpb24ucGM7XG5cbiAgcGMuY3JlYXRlQW5zd2VyKGZ1bmN0aW9uKGFuc3dlcikge1xuICAgIHV0aWwubG9nKCdDcmVhdGVkIGFuc3dlci4nKTtcblxuICAgIGlmICghdXRpbC5zdXBwb3J0cy5zY3RwICYmIGNvbm5lY3Rpb24udHlwZSA9PT0gJ2RhdGEnICYmIGNvbm5lY3Rpb24ucmVsaWFibGUpIHtcbiAgICAgIGFuc3dlci5zZHAgPSBSZWxpYWJsZS5oaWdoZXJCYW5kd2lkdGhTRFAoYW5zd2VyLnNkcCk7XG4gICAgfVxuXG4gICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihhbnN3ZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgdXRpbC5sb2coJ1NldCBsb2NhbERlc2NyaXB0aW9uOiBhbnN3ZXInLCAnZm9yOicsIGNvbm5lY3Rpb24ucGVlcik7XG4gICAgICBjb25uZWN0aW9uLnByb3ZpZGVyLnNvY2tldC5zZW5kKHtcbiAgICAgICAgdHlwZTogJ0FOU1dFUicsXG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICBzZHA6IGFuc3dlcixcbiAgICAgICAgICB0eXBlOiBjb25uZWN0aW9uLnR5cGUsXG4gICAgICAgICAgY29ubmVjdGlvbklkOiBjb25uZWN0aW9uLmlkLFxuICAgICAgICAgIGJyb3dzZXI6IHV0aWwuYnJvd3NlclxuICAgICAgICB9LFxuICAgICAgICBkc3Q6IGNvbm5lY3Rpb24ucGVlclxuICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBjb25uZWN0aW9uLnByb3ZpZGVyLmVtaXRFcnJvcignd2VicnRjJywgZXJyKTtcbiAgICAgIHV0aWwubG9nKCdGYWlsZWQgdG8gc2V0TG9jYWxEZXNjcmlwdGlvbiwgJywgZXJyKTtcbiAgICB9KTtcbiAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgY29ubmVjdGlvbi5wcm92aWRlci5lbWl0RXJyb3IoJ3dlYnJ0YycsIGVycik7XG4gICAgdXRpbC5sb2coJ0ZhaWxlZCB0byBjcmVhdGUgYW5zd2VyLCAnLCBlcnIpO1xuICB9KTtcbn1cblxuLyoqIEhhbmRsZSBhbiBTRFAuICovXG5OZWdvdGlhdG9yLmhhbmRsZVNEUCA9IGZ1bmN0aW9uKHR5cGUsIGNvbm5lY3Rpb24sIHNkcCkge1xuICBzZHAgPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHNkcCk7XG4gIHZhciBwYyA9IGNvbm5lY3Rpb24ucGM7XG5cbiAgdXRpbC5sb2coJ1NldHRpbmcgcmVtb3RlIGRlc2NyaXB0aW9uJywgc2RwKTtcbiAgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oc2RwLCBmdW5jdGlvbigpIHtcbiAgICB1dGlsLmxvZygnU2V0IHJlbW90ZURlc2NyaXB0aW9uOicsIHR5cGUsICdmb3I6JywgY29ubmVjdGlvbi5wZWVyKTtcblxuICAgIGlmICh0eXBlID09PSAnT0ZGRVInKSB7XG4gICAgICBOZWdvdGlhdG9yLl9tYWtlQW5zd2VyKGNvbm5lY3Rpb24pO1xuICAgIH1cbiAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgY29ubmVjdGlvbi5wcm92aWRlci5lbWl0RXJyb3IoJ3dlYnJ0YycsIGVycik7XG4gICAgdXRpbC5sb2coJ0ZhaWxlZCB0byBzZXRSZW1vdGVEZXNjcmlwdGlvbiwgJywgZXJyKTtcbiAgfSk7XG59XG5cbi8qKiBIYW5kbGUgYSBjYW5kaWRhdGUuICovXG5OZWdvdGlhdG9yLmhhbmRsZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24sIGljZSkge1xuICB2YXIgY2FuZGlkYXRlID0gaWNlLmNhbmRpZGF0ZTtcbiAgdmFyIHNkcE1MaW5lSW5kZXggPSBpY2Uuc2RwTUxpbmVJbmRleDtcbiAgY29ubmVjdGlvbi5wYy5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZSh7XG4gICAgc2RwTUxpbmVJbmRleDogc2RwTUxpbmVJbmRleCxcbiAgICBjYW5kaWRhdGU6IGNhbmRpZGF0ZVxuICB9KSk7XG4gIHV0aWwubG9nKCdBZGRlZCBJQ0UgY2FuZGlkYXRlIGZvcjonLCBjb25uZWN0aW9uLnBlZXIpO1xufVxuLyoqXG4gKiBBbiBhYnN0cmFjdGlvbiBvbiB0b3Agb2YgV2ViU29ja2V0cyBhbmQgWEhSIHN0cmVhbWluZyB0byBwcm92aWRlIGZhc3Rlc3RcbiAqIHBvc3NpYmxlIGNvbm5lY3Rpb24gZm9yIHBlZXJzLlxuICovXG5mdW5jdGlvbiBTb2NrZXQoc2VjdXJlLCBob3N0LCBwb3J0LCBwYXRoLCBrZXkpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNvY2tldCkpIHJldHVybiBuZXcgU29ja2V0KHNlY3VyZSwgaG9zdCwgcG9ydCwgcGF0aCwga2V5KTtcblxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBEaXNjb25uZWN0ZWQgbWFudWFsbHkuXG4gIHRoaXMuZGlzY29ubmVjdGVkID0gZmFsc2U7XG4gIHRoaXMuX3F1ZXVlID0gW107XG5cbiAgdmFyIGh0dHBQcm90b2NvbCA9IHNlY3VyZSA/ICdodHRwczovLycgOiAnaHR0cDovLyc7XG4gIHZhciB3c1Byb3RvY29sID0gc2VjdXJlID8gJ3dzczovLycgOiAnd3M6Ly8nO1xuICB0aGlzLl9odHRwVXJsID0gaHR0cFByb3RvY29sICsgaG9zdCArICc6JyArIHBvcnQgKyBwYXRoICsga2V5O1xuICB0aGlzLl93c1VybCA9IHdzUHJvdG9jb2wgKyBob3N0ICsgJzonICsgcG9ydCArIHBhdGggKyAncGVlcmpzP2tleT0nICsga2V5O1xufVxuXG51dGlsLmluaGVyaXRzKFNvY2tldCwgRXZlbnRFbWl0dGVyKTtcblxuXG4vKiogQ2hlY2sgaW4gd2l0aCBJRCBvciBnZXQgb25lIGZyb20gc2VydmVyLiAqL1xuU29ja2V0LnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKGlkLCB0b2tlbikge1xuICB0aGlzLmlkID0gaWQ7XG5cbiAgdGhpcy5faHR0cFVybCArPSAnLycgKyBpZCArICcvJyArIHRva2VuO1xuICB0aGlzLl93c1VybCArPSAnJmlkPScgKyBpZCArICcmdG9rZW49JyArIHRva2VuO1xuXG4gIHRoaXMuX3N0YXJ0WGhyU3RyZWFtKCk7XG4gIHRoaXMuX3N0YXJ0V2ViU29ja2V0KCk7XG59XG5cblxuLyoqIFN0YXJ0IHVwIHdlYnNvY2tldCBjb21tdW5pY2F0aW9ucy4gKi9cblNvY2tldC5wcm90b3R5cGUuX3N0YXJ0V2ViU29ja2V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0aGlzLl9zb2NrZXQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLl9zb2NrZXQgPSBuZXcgV2ViU29ja2V0KHRoaXMuX3dzVXJsKTtcblxuICB0aGlzLl9zb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGRhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgc2VsZi5lbWl0KCdtZXNzYWdlJywgZGF0YSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICB1dGlsLmxvZygnSW52YWxpZCBzZXJ2ZXIgbWVzc2FnZScsIGV2ZW50LmRhdGEpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLl9zb2NrZXQub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdXRpbC5sb2coJ1NvY2tldCBjbG9zZWQuJyk7XG4gICAgc2VsZi5kaXNjb25uZWN0ZWQgPSB0cnVlO1xuICAgIHNlbGYuZW1pdCgnZGlzY29ubmVjdGVkJyk7XG4gIH07XG5cbiAgLy8gVGFrZSBjYXJlIG9mIHRoZSBxdWV1ZSBvZiBjb25uZWN0aW9ucyBpZiBuZWNlc3NhcnkgYW5kIG1ha2Ugc3VyZSBQZWVyIGtub3dzXG4gIC8vIHNvY2tldCBpcyBvcGVuLlxuICB0aGlzLl9zb2NrZXQub25vcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHNlbGYuX3RpbWVvdXQpIHtcbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl90aW1lb3V0KTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5faHR0cC5hYm9ydCgpO1xuICAgICAgICBzZWxmLl9odHRwID0gbnVsbDtcbiAgICAgIH0sIDUwMDApO1xuICAgIH1cbiAgICBzZWxmLl9zZW5kUXVldWVkTWVzc2FnZXMoKTtcbiAgICB1dGlsLmxvZygnU29ja2V0IG9wZW4nKTtcbiAgfTtcbn1cblxuLyoqIFN0YXJ0IFhIUiBzdHJlYW1pbmcuICovXG5Tb2NrZXQucHJvdG90eXBlLl9zdGFydFhoclN0cmVhbSA9IGZ1bmN0aW9uKG4pIHtcbiAgdHJ5IHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5faHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHRoaXMuX2h0dHAuX2luZGV4ID0gMTtcbiAgICB0aGlzLl9odHRwLl9zdHJlYW1JbmRleCA9IG4gfHwgMDtcbiAgICB0aGlzLl9odHRwLm9wZW4oJ3Bvc3QnLCB0aGlzLl9odHRwVXJsICsgJy9pZD9pPScgKyB0aGlzLl9odHRwLl9zdHJlYW1JbmRleCwgdHJ1ZSk7XG4gICAgdGhpcy5faHR0cC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBJZiB3ZSBnZXQgYW4gZXJyb3IsIGxpa2VseSBzb21ldGhpbmcgd2VudCB3cm9uZy5cbiAgICAgIC8vIFN0b3Agc3RyZWFtaW5nLlxuICAgICAgY2xlYXJUaW1lb3V0KHNlbGYuX3RpbWVvdXQpO1xuICAgICAgc2VsZi5lbWl0KCdkaXNjb25uZWN0ZWQnKTtcbiAgICB9XG4gICAgdGhpcy5faHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gMiAmJiB0aGlzLm9sZCkge1xuICAgICAgICB0aGlzLm9sZC5hYm9ydCgpO1xuICAgICAgICBkZWxldGUgdGhpcy5vbGQ7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucmVhZHlTdGF0ZSA+IDIgJiYgdGhpcy5zdGF0dXMgPT09IDIwMCAmJiB0aGlzLnJlc3BvbnNlVGV4dCkge1xuICAgICAgICBzZWxmLl9oYW5kbGVTdHJlYW0odGhpcyk7XG4gICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9odHRwLnNlbmQobnVsbCk7XG4gICAgdGhpcy5fc2V0SFRUUFRpbWVvdXQoKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgdXRpbC5sb2coJ1hNTEh0dHBSZXF1ZXN0IG5vdCBhdmFpbGFibGU7IGRlZmF1bHRpbmcgdG8gV2ViU29ja2V0cycpO1xuICB9XG59XG5cblxuLyoqIEhhbmRsZXMgb25yZWFkeXN0YXRlY2hhbmdlIHJlc3BvbnNlIGFzIGEgc3RyZWFtLiAqL1xuU29ja2V0LnByb3RvdHlwZS5faGFuZGxlU3RyZWFtID0gZnVuY3Rpb24oaHR0cCkge1xuICAvLyAzIGFuZCA0IGFyZSBsb2FkaW5nL2RvbmUgc3RhdGUuIEFsbCBvdGhlcnMgYXJlIG5vdCByZWxldmFudC5cbiAgdmFyIG1lc3NhZ2VzID0gaHR0cC5yZXNwb25zZVRleHQuc3BsaXQoJ1xcbicpO1xuXG4gIC8vIENoZWNrIHRvIHNlZSBpZiBhbnl0aGluZyBuZWVkcyB0byBiZSBwcm9jZXNzZWQgb24gYnVmZmVyLlxuICBpZiAoaHR0cC5fYnVmZmVyKSB7XG4gICAgd2hpbGUgKGh0dHAuX2J1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgaW5kZXggPSBodHRwLl9idWZmZXIuc2hpZnQoKTtcbiAgICAgIHZhciBidWZmZXJlZE1lc3NhZ2UgPSBtZXNzYWdlc1tpbmRleF07XG4gICAgICB0cnkge1xuICAgICAgICBidWZmZXJlZE1lc3NhZ2UgPSBKU09OLnBhcnNlKGJ1ZmZlcmVkTWVzc2FnZSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgaHR0cC5fYnVmZmVyLnNoaWZ0KGluZGV4KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLmVtaXQoJ21lc3NhZ2UnLCBidWZmZXJlZE1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBtZXNzYWdlID0gbWVzc2FnZXNbaHR0cC5faW5kZXhdO1xuICBpZiAobWVzc2FnZSkge1xuICAgIGh0dHAuX2luZGV4ICs9IDE7XG4gICAgLy8gQnVmZmVyaW5nLS10aGlzIG1lc3NhZ2UgaXMgaW5jb21wbGV0ZSBhbmQgd2UnbGwgZ2V0IHRvIGl0IG5leHQgdGltZS5cbiAgICAvLyBUaGlzIGNoZWNrcyBpZiB0aGUgaHR0cFJlc3BvbnNlIGVuZGVkIGluIGEgYFxcbmAsIGluIHdoaWNoIGNhc2UgdGhlIGxhc3RcbiAgICAvLyBlbGVtZW50IG9mIG1lc3NhZ2VzIHNob3VsZCBiZSB0aGUgZW1wdHkgc3RyaW5nLlxuICAgIGlmIChodHRwLl9pbmRleCA9PT0gbWVzc2FnZXMubGVuZ3RoKSB7XG4gICAgICBpZiAoIWh0dHAuX2J1ZmZlcikge1xuICAgICAgICBodHRwLl9idWZmZXIgPSBbXTtcbiAgICAgIH1cbiAgICAgIGh0dHAuX2J1ZmZlci5wdXNoKGh0dHAuX2luZGV4IC0gMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHV0aWwubG9nKCdJbnZhbGlkIHNlcnZlciBtZXNzYWdlJywgbWVzc2FnZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZW1pdCgnbWVzc2FnZScsIG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxufVxuXG5Tb2NrZXQucHJvdG90eXBlLl9zZXRIVFRQVGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbGQgPSBzZWxmLl9odHRwO1xuICAgIGlmICghc2VsZi5fd3NPcGVuKCkpIHtcbiAgICAgIHNlbGYuX3N0YXJ0WGhyU3RyZWFtKG9sZC5fc3RyZWFtSW5kZXggKyAxKTtcbiAgICAgIHNlbGYuX2h0dHAub2xkID0gb2xkO1xuICAgIH0gZWxzZSB7XG4gICAgICBvbGQuYWJvcnQoKTtcbiAgICB9XG4gIH0sIDI1MDAwKTtcbn1cblxuLyoqIElzIHRoZSB3ZWJzb2NrZXQgY3VycmVudGx5IG9wZW4/ICovXG5Tb2NrZXQucHJvdG90eXBlLl93c09wZW4gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3NvY2tldCAmJiB0aGlzLl9zb2NrZXQucmVhZHlTdGF0ZSA9PSAxO1xufVxuXG4vKiogU2VuZCBxdWV1ZWQgbWVzc2FnZXMuICovXG5Tb2NrZXQucHJvdG90eXBlLl9zZW5kUXVldWVkTWVzc2FnZXMgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGlpID0gdGhpcy5fcXVldWUubGVuZ3RoOyBpIDwgaWk7IGkgKz0gMSkge1xuICAgIHRoaXMuc2VuZCh0aGlzLl9xdWV1ZVtpXSk7XG4gIH1cbn1cblxuLyoqIEV4cG9zZWQgc2VuZCBmb3IgREMgJiBQZWVyLiAqL1xuU29ja2V0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICBpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiB3ZSBkaWRuJ3QgZ2V0IGFuIElEIHlldCwgd2UgY2FuJ3QgeWV0IHNlbmQgYW55dGhpbmcgc28gd2Ugc2hvdWxkIHF1ZXVlXG4gIC8vIHVwIHRoZXNlIG1lc3NhZ2VzLlxuICBpZiAoIXRoaXMuaWQpIHtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKGRhdGEpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghZGF0YS50eXBlKSB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsICdJbnZhbGlkIG1lc3NhZ2UnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICBpZiAodGhpcy5fd3NPcGVuKCkpIHtcbiAgICB0aGlzLl9zb2NrZXQuc2VuZChtZXNzYWdlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHZhciB1cmwgPSB0aGlzLl9odHRwVXJsICsgJy8nICsgZGF0YS50eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgaHR0cC5vcGVuKCdwb3N0JywgdXJsLCB0cnVlKTtcbiAgICBodHRwLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgaHR0cC5zZW5kKG1lc3NhZ2UpO1xuICB9XG59XG5cblNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmRpc2Nvbm5lY3RlZCAmJiB0aGlzLl93c09wZW4oKSkge1xuICAgIHRoaXMuX3NvY2tldC5jbG9zZSgpO1xuICAgIHRoaXMuZGlzY29ubmVjdGVkID0gdHJ1ZTtcbiAgfVxufVxuXG59KSh0aGlzKTtcbiIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuKGZ1bmN0aW9uKCkge1xudmFyIGRlZmluZSwgcmVxdWlyZU1vZHVsZSwgcmVxdWlyZSwgcmVxdWlyZWpzO1xuXG4oZnVuY3Rpb24oKSB7XG4gIHZhciByZWdpc3RyeSA9IHt9LCBzZWVuID0ge307XG5cbiAgZGVmaW5lID0gZnVuY3Rpb24obmFtZSwgZGVwcywgY2FsbGJhY2spIHtcbiAgICByZWdpc3RyeVtuYW1lXSA9IHsgZGVwczogZGVwcywgY2FsbGJhY2s6IGNhbGxiYWNrIH07XG4gIH07XG5cbiAgcmVxdWlyZWpzID0gcmVxdWlyZSA9IHJlcXVpcmVNb2R1bGUgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJlcXVpcmVqcy5fZWFrX3NlZW4gPSByZWdpc3RyeTtcblxuICAgIGlmIChzZWVuW25hbWVdKSB7IHJldHVybiBzZWVuW25hbWVdOyB9XG4gICAgc2VlbltuYW1lXSA9IHt9O1xuXG4gICAgaWYgKCFyZWdpc3RyeVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGZpbmQgbW9kdWxlIFwiICsgbmFtZSk7XG4gICAgfVxuXG4gICAgdmFyIG1vZCA9IHJlZ2lzdHJ5W25hbWVdLFxuICAgICAgICBkZXBzID0gbW9kLmRlcHMsXG4gICAgICAgIGNhbGxiYWNrID0gbW9kLmNhbGxiYWNrLFxuICAgICAgICByZWlmaWVkID0gW10sXG4gICAgICAgIGV4cG9ydHM7XG5cbiAgICBmb3IgKHZhciBpPTAsIGw9ZGVwcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBpZiAoZGVwc1tpXSA9PT0gJ2V4cG9ydHMnKSB7XG4gICAgICAgIHJlaWZpZWQucHVzaChleHBvcnRzID0ge30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVpZmllZC5wdXNoKHJlcXVpcmVNb2R1bGUocmVzb2x2ZShkZXBzW2ldKSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGNhbGxiYWNrLmFwcGx5KHRoaXMsIHJlaWZpZWQpO1xuICAgIHJldHVybiBzZWVuW25hbWVdID0gZXhwb3J0cyB8fCB2YWx1ZTtcblxuICAgIGZ1bmN0aW9uIHJlc29sdmUoY2hpbGQpIHtcbiAgICAgIGlmIChjaGlsZC5jaGFyQXQoMCkgIT09ICcuJykgeyByZXR1cm4gY2hpbGQ7IH1cbiAgICAgIHZhciBwYXJ0cyA9IGNoaWxkLnNwbGl0KFwiL1wiKTtcbiAgICAgIHZhciBwYXJlbnRCYXNlID0gbmFtZS5zcGxpdChcIi9cIikuc2xpY2UoMCwgLTEpO1xuXG4gICAgICBmb3IgKHZhciBpPTAsIGw9cGFydHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuXG4gICAgICAgIGlmIChwYXJ0ID09PSAnLi4nKSB7IHBhcmVudEJhc2UucG9wKCk7IH1cbiAgICAgICAgZWxzZSBpZiAocGFydCA9PT0gJy4nKSB7IGNvbnRpbnVlOyB9XG4gICAgICAgIGVsc2UgeyBwYXJlbnRCYXNlLnB1c2gocGFydCk7IH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudEJhc2Uuam9pbihcIi9cIik7XG4gICAgfVxuICB9O1xufSkoKTtcblxuZGVmaW5lKFwicHJvbWlzZS9hbGxcIiwgXG4gIFtcIi4vdXRpbHNcIixcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKiBnbG9iYWwgdG9TdHJpbmcgKi9cblxuICAgIHZhciBpc0FycmF5ID0gX19kZXBlbmRlbmN5MV9fLmlzQXJyYXk7XG4gICAgdmFyIGlzRnVuY3Rpb24gPSBfX2RlcGVuZGVuY3kxX18uaXNGdW5jdGlvbjtcblxuICAgIC8qKlxuICAgICAgUmV0dXJucyBhIHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgdGhlIGdpdmVuIHByb21pc2VzIGhhdmUgYmVlblxuICAgICAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuIFRoZSByZXR1cm4gcHJvbWlzZVxuICAgICAgaXMgZnVsZmlsbGVkIHdpdGggYW4gYXJyYXkgdGhhdCBnaXZlcyBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlXG4gICAgICBwYXNzZWQgaW4gdGhlIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQuXG5cbiAgICAgIEV4YW1wbGU6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgICAgIHZhciBwcm9taXNlMiA9IFJTVlAucmVzb2x2ZSgyKTtcbiAgICAgIHZhciBwcm9taXNlMyA9IFJTVlAucmVzb2x2ZSgzKTtcbiAgICAgIHZhciBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gICAgICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBSU1ZQLmFsbGAgYXJlIHJlamVjdGVkLCB0aGUgZmlyc3QgcHJvbWlzZVxuICAgICAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gICAgICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgICAgIEV4YW1wbGU6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgICAgIHZhciBwcm9taXNlMiA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICAgICAgdmFyIHByb21pc2UzID0gUlNWUC5yZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICAgICAgUlNWUC5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIC8vIGVycm9yLm1lc3NhZ2UgPT09IFwiMlwiXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGFsbFxuICAgICAgQGZvciBSU1ZQXG4gICAgICBAcGFyYW0ge0FycmF5fSBwcm9taXNlc1xuICAgICAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsXG4gICAgICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gICAgICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIGFsbC4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdLCByZW1haW5pbmcgPSBwcm9taXNlcy5sZW5ndGgsXG4gICAgICAgIHByb21pc2U7XG5cbiAgICAgICAgaWYgKHJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIHJlc29sdmUoW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZXIoaW5kZXgpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHJlc29sdmVBbGwoaW5kZXgsIHZhbHVlKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZUFsbChpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICByZXN1bHRzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICAgICAgaWYgKHByb21pc2UgJiYgaXNGdW5jdGlvbihwcm9taXNlLnRoZW4pKSB7XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4ocmVzb2x2ZXIoaSksIHJlamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVBbGwoaSwgcHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5hbGwgPSBhbGw7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9hc2FwXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICAgIHZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGxvY2FsID0gKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSA/IGdsb2JhbCA6ICh0aGlzID09PSB1bmRlZmluZWQ/IHdpbmRvdzp0aGlzKTtcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhbC5zZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0dXBsZSA9IHF1ZXVlW2ldO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0dXBsZVswXSwgYXJnID0gdHVwbGVbMV07XG4gICAgICAgIGNhbGxiYWNrKGFyZyk7XG4gICAgICB9XG4gICAgICBxdWV1ZSA9IFtdO1xuICAgIH1cblxuICAgIHZhciBzY2hlZHVsZUZsdXNoO1xuXG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICAgIHZhciBsZW5ndGggPSBxdWV1ZS5wdXNoKFtjYWxsYmFjaywgYXJnXSk7XG4gICAgICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIElmIGxlbmd0aCBpcyAxLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAgICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAgICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18uYXNhcCA9IGFzYXA7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9jb25maWdcIiwgXG4gIFtcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZXhwb3J0c19fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgIGluc3RydW1lbnQ6IGZhbHNlXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZShuYW1lLCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgY29uZmlnW25hbWVdID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY29uZmlnW25hbWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9fZXhwb3J0c19fLmNvbmZpZyA9IGNvbmZpZztcbiAgICBfX2V4cG9ydHNfXy5jb25maWd1cmUgPSBjb25maWd1cmU7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9wb2x5ZmlsbFwiLCBcbiAgW1wiLi9wcm9taXNlXCIsXCIuL3V0aWxzXCIsXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18sIF9fZGVwZW5kZW5jeTJfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKmdsb2JhbCBzZWxmKi9cbiAgICB2YXIgUlNWUFByb21pc2UgPSBfX2RlcGVuZGVuY3kxX18uUHJvbWlzZTtcbiAgICB2YXIgaXNGdW5jdGlvbiA9IF9fZGVwZW5kZW5jeTJfXy5pc0Z1bmN0aW9uO1xuXG4gICAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgICB2YXIgbG9jYWw7XG5cbiAgICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgICAgIGxvY2FsID0gd2luZG93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfVxuXG4gICAgICB2YXIgZXM2UHJvbWlzZVN1cHBvcnQgPSBcbiAgICAgICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAgICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAgICAgLy8gRmlyZWZveC9DaHJvbWUgZXhwZXJpbWVudGFsIGltcGxlbWVudGF0aW9uc1xuICAgICAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcImFsbFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgICAgICAvLyBhcyB0aGUgYXJnIHJhdGhlciB0aGFuIGEgZnVuY3Rpb25cbiAgICAgICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZXNvbHZlO1xuICAgICAgICAgIG5ldyBsb2NhbC5Qcm9taXNlKGZ1bmN0aW9uKHIpIHsgcmVzb2x2ZSA9IHI7IH0pO1xuICAgICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgICAgICB9KCkpO1xuXG4gICAgICBpZiAoIWVzNlByb21pc2VTdXBwb3J0KSB7XG4gICAgICAgIGxvY2FsLlByb21pc2UgPSBSU1ZQUHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcHJvbWlzZVwiLCBcbiAgW1wiLi9jb25maWdcIixcIi4vdXRpbHNcIixcIi4vYWxsXCIsXCIuL3JhY2VcIixcIi4vcmVzb2x2ZVwiLFwiLi9yZWplY3RcIixcIi4vYXNhcFwiLFwiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZGVwZW5kZW5jeTNfXywgX19kZXBlbmRlbmN5NF9fLCBfX2RlcGVuZGVuY3k1X18sIF9fZGVwZW5kZW5jeTZfXywgX19kZXBlbmRlbmN5N19fLCBfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBjb25maWcgPSBfX2RlcGVuZGVuY3kxX18uY29uZmlnO1xuICAgIHZhciBjb25maWd1cmUgPSBfX2RlcGVuZGVuY3kxX18uY29uZmlndXJlO1xuICAgIHZhciBvYmplY3RPckZ1bmN0aW9uID0gX19kZXBlbmRlbmN5Ml9fLm9iamVjdE9yRnVuY3Rpb247XG4gICAgdmFyIGlzRnVuY3Rpb24gPSBfX2RlcGVuZGVuY3kyX18uaXNGdW5jdGlvbjtcbiAgICB2YXIgbm93ID0gX19kZXBlbmRlbmN5Ml9fLm5vdztcbiAgICB2YXIgYWxsID0gX19kZXBlbmRlbmN5M19fLmFsbDtcbiAgICB2YXIgcmFjZSA9IF9fZGVwZW5kZW5jeTRfXy5yYWNlO1xuICAgIHZhciBzdGF0aWNSZXNvbHZlID0gX19kZXBlbmRlbmN5NV9fLnJlc29sdmU7XG4gICAgdmFyIHN0YXRpY1JlamVjdCA9IF9fZGVwZW5kZW5jeTZfXy5yZWplY3Q7XG4gICAgdmFyIGFzYXAgPSBfX2RlcGVuZGVuY3k3X18uYXNhcDtcblxuICAgIHZhciBjb3VudGVyID0gMDtcblxuICAgIGNvbmZpZy5hc3luYyA9IGFzYXA7IC8vIGRlZmF1bHQgYXN5bmMgaXMgYXNhcDtcblxuICAgIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihyZXNvbHZlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaW52b2tlUmVzb2x2ZXIocmVzb2x2ZXIsIHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCBwcm9taXNlKSB7XG4gICAgICBmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSkge1xuICAgICAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKHJlc29sdmVQcm9taXNlLCByZWplY3RQcm9taXNlKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZWplY3RQcm9taXNlKGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgICAgIHZhbHVlLCBlcnJvciwgc3VjY2VlZGVkLCBmYWlsZWQ7XG5cbiAgICAgIGlmIChoYXNDYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBGVUxGSUxMRUQpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgU0VBTEVEICAgID0gMDtcbiAgICB2YXIgRlVMRklMTEVEID0gMTtcbiAgICB2YXIgUkVKRUNURUQgID0gMjtcblxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHB1Ymxpc2gocHJvbWlzZSwgc2V0dGxlZCkge1xuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycywgZGV0YWlsID0gcHJvbWlzZS5fZGV0YWlsO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBudWxsO1xuICAgIH1cblxuICAgIFByb21pc2UucHJvdG90eXBlID0ge1xuICAgICAgY29uc3RydWN0b3I6IFByb21pc2UsXG5cbiAgICAgIF9zdGF0ZTogdW5kZWZpbmVkLFxuICAgICAgX2RldGFpbDogdW5kZWZpbmVkLFxuICAgICAgX3N1YnNjcmliZXJzOiB1bmRlZmluZWQsXG5cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcztcblxuICAgICAgICB2YXIgdGhlblByb21pc2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbigpIHt9KTtcblxuICAgICAgICBpZiAodGhpcy5fc3RhdGUpIHtcbiAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gYXJndW1lbnRzO1xuICAgICAgICAgIGNvbmZpZy5hc3luYyhmdW5jdGlvbiBpbnZva2VQcm9taXNlQ2FsbGJhY2soKSB7XG4gICAgICAgICAgICBpbnZva2VDYWxsYmFjayhwcm9taXNlLl9zdGF0ZSwgdGhlblByb21pc2UsIGNhbGxiYWNrc1twcm9taXNlLl9zdGF0ZSAtIDFdLCBwcm9taXNlLl9kZXRhaWwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1YnNjcmliZSh0aGlzLCB0aGVuUHJvbWlzZSwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoZW5Qcm9taXNlO1xuICAgICAgfSxcblxuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIFByb21pc2UuYWxsID0gYWxsO1xuICAgIFByb21pc2UucmFjZSA9IHJhY2U7XG4gICAgUHJvbWlzZS5yZXNvbHZlID0gc3RhdGljUmVzb2x2ZTtcbiAgICBQcm9taXNlLnJlamVjdCA9IHN0YXRpY1JlamVjdDtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICB2YXIgdGhlbiA9IG51bGwsXG4gICAgICByZXNvbHZlZDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkEgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICB0aGVuID0gdmFsdWUudGhlbjtcblxuICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWwpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgIGlmIChyZXNvbHZlZCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKCFoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gICAgICBwcm9taXNlLl9kZXRhaWwgPSB2YWx1ZTtcblxuICAgICAgY29uZmlnLmFzeW5jKHB1Ymxpc2hGdWxmaWxsbWVudCwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gICAgICBwcm9taXNlLl9kZXRhaWwgPSByZWFzb247XG5cbiAgICAgIGNvbmZpZy5hc3luYyhwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwdWJsaXNoRnVsZmlsbG1lbnQocHJvbWlzZSkge1xuICAgICAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBwdWJsaXNoKHByb21pc2UsIHByb21pc2UuX3N0YXRlID0gUkVKRUNURUQpO1xuICAgIH1cblxuICAgIF9fZXhwb3J0c19fLlByb21pc2UgPSBQcm9taXNlO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcmFjZVwiLCBcbiAgW1wiLi91dGlsc1wiLFwiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIC8qIGdsb2JhbCB0b1N0cmluZyAqL1xuICAgIHZhciBpc0FycmF5ID0gX19kZXBlbmRlbmN5MV9fLmlzQXJyYXk7XG5cbiAgICAvKipcbiAgICAgIGBSU1ZQLnJhY2VgIGFsbG93cyB5b3UgdG8gd2F0Y2ggYSBzZXJpZXMgb2YgcHJvbWlzZXMgYW5kIGFjdCBhcyBzb29uIGFzIHRoZVxuICAgICAgZmlyc3QgcHJvbWlzZSBnaXZlbiB0byB0aGUgYHByb21pc2VzYCBhcmd1bWVudCBmdWxmaWxscyBvciByZWplY3RzLlxuXG4gICAgICBFeGFtcGxlOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZTEgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXNvbHZlKFwicHJvbWlzZSAxXCIpO1xuICAgICAgICB9LCAyMDApO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBwcm9taXNlMiA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIHJlc29sdmUoXCJwcm9taXNlIDJcIik7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHJlc3VsdCA9PT0gXCJwcm9taXNlIDJcIiBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAgICAgLy8gd2FzIHJlc29sdmVkLlxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgYFJTVlAucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdCBjb21wbGV0ZWRcbiAgICAgIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2BcbiAgICAgIGFycmF5IGFyZ3VtZW50IGFyZSByZXNvbHZlZCwgYnV0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZSBoYXMgYmVjb21lXG4gICAgICByZWplY3RlZCBiZWZvcmUgdGhlIG90aGVyIHByb21pc2VzIGJlY2FtZSBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZCBwcm9taXNlXG4gICAgICB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmVzb2x2ZShcInByb21pc2UgMVwiKTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcHJvbWlzZTIgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwicHJvbWlzZSAyXCIpKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0pO1xuXG4gICAgICBSU1ZQLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAgICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gXCJwcm9taXNlMlwiIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAgICAgLy8gcHJvbWlzZSAxIGJlY2FtZSBmdWxmaWxsZWRcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgcmFjZVxuICAgICAgQGZvciBSU1ZQXG4gICAgICBAcGFyYW0ge0FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byBvYnNlcnZlXG4gICAgICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBkZXNjcmliaW5nIHRoZSBwcm9taXNlIHJldHVybmVkLlxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgYmVjb21lcyBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgdGhlIGZpcnN0XG4gICAgICBjb21wbGV0ZWQgcHJvbWlzZXMgaXMgcmVzb2x2ZWQgd2l0aCBpZiB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2Ugd2FzXG4gICAgICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiB0aGF0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZVxuICAgICAgd2FzIHJlamVjdGVkIHdpdGguXG4gICAgKi9cbiAgICBmdW5jdGlvbiByYWNlKHByb21pc2VzKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gICAgICBpZiAoIWlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXSwgcHJvbWlzZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICAgICAgaWYgKHByb21pc2UgJiYgdHlwZW9mIHByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmUocHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yYWNlID0gcmFjZTtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3JlamVjdFwiLCBcbiAgW1wiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKipcbiAgICAgIGBSU1ZQLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWRcbiAgICAgIGByZWFzb25gLiBgUlNWUC5yZWplY3RgIGlzIGVzc2VudGlhbGx5IHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZSA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCByZWplY3RcbiAgICAgIEBmb3IgUlNWUFxuICAgICAgQHBhcmFtIHtBbnl9IHJlYXNvbiB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aC5cbiAgICAgIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGlkZW50aWZ5aW5nIHRoZSByZXR1cm5lZCBwcm9taXNlLlxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgICAgIGByZWFzb25gLlxuICAgICovXG4gICAgZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KHJlYXNvbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yZWplY3QgPSByZWplY3Q7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9yZXNvbHZlXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIHJlc29sdmUodmFsdWUpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZS5jb25zdHJ1Y3RvciA9PT0gdGhpcykge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3V0aWxzXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oeCkgfHwgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBcnJheSh4KSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gICAgfVxuXG4gICAgLy8gRGF0ZS5ub3cgaXMgbm90IGF2YWlsYWJsZSBpbiBicm93c2VycyA8IElFOVxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0NvbXBhdGliaWxpdHlcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuXG4gICAgX19leHBvcnRzX18ub2JqZWN0T3JGdW5jdGlvbiA9IG9iamVjdE9yRnVuY3Rpb247XG4gICAgX19leHBvcnRzX18uaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG4gICAgX19leHBvcnRzX18uaXNBcnJheSA9IGlzQXJyYXk7XG4gICAgX19leHBvcnRzX18ubm93ID0gbm93O1xuICB9KTtcbnJlcXVpcmVNb2R1bGUoJ3Byb21pc2UvcG9seWZpbGwnKS5wb2x5ZmlsbCgpO1xufSgpKTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIHNldHRpbmdzX2xvY2FsID0ge307XG50cnkge1xuICBzZXR0aW5nc19sb2NhbCA9IHJlcXVpcmUoJy4vc2V0dGluZ3NfbG9jYWwuanMnKTtcbn0gY2F0Y2ggKGUpIHtcbn1cblxudmFyIHNldHRpbmdzID0ge1xuICBBUElfVVJMOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgIC8vIFRoaXMgVVJMIHRvIHRoZSBHYWxheHkgQVBJLiBObyB0cmFpbGluZyBzbGFzaC5cbiAgUEVFUl9LRVk6ICdmY2RjNHEya2xqY3E1bWknLCAgLy8gU2lnbiB1cCBmb3IgYSBrZXkgYXQgaHR0cDovL3BlZXJqcy5jb20vcGVlcnNlcnZlclxuICBWRVJTSU9OOiAnMC4wLjEnICAvLyBWZXJzaW9uIG9mIHRoZSBgZ2FtZXBhZC5qc2Agc2NyaXB0XG59O1xuXG5mb3IgKHZhciBrZXkgaW4gc2V0dGluZ3NfbG9jYWwpIHtcbiAgc2V0dGluZ3Nba2V5XSA9IHNldHRpbmdzX2xvY2FsW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3M7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbn07XG4iXX0=
