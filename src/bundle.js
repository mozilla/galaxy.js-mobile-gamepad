(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {

var peer = require('./lib/peer');
var Promise = require('./lib/promise-1.0.0');

var settings = require('./settings');


var gum = navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.msGetUserMedia;


/**
 * A library for controlling an HTML5 game using WebRTC.
 *
 * @exports gamepad
 * @namespace gamepad
 */
function gamepad() {
}


/**
 * Authenticates a user.
 *
 * Opens a modal that overlays the game, prompting the user to sign in.
 * Returns a Promise that resolves with a `User` object for the user.
 *
 * @returns {Promise}
 * @memberOf galaxy
 */
gamepad.getPeer = function () {
  return new Peer({key: settings.PEER_KEY});
};

gamepad.version = settings.VERSION;


/**
 * Export the module via AMD, CommonJS, or as a browser global.
 */
if (typeof define === 'function' && define.amd) {
  define(function () {
    return gamepad;
  });
} else if (typeof module === 'object' && module.exports) {
  module.exports = gamepad;
} else {
  this.gamepad = gamepad;
}

})();

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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9qcy9tYWluLmpzIiwiL29wdC9nYWxheHkuanMtbW9iaWxlLWdhbWVwYWQvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvcGVlci5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9saWIvcHJvbWlzZS0xLjAuMC5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5ncy5qcyIsIi9vcHQvZ2FsYXh5LmpzLW1vYmlsZS1nYW1lcGFkL3NyYy9qcy9zZXR0aW5nc19sb2NhbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHBGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uICgpIHtcblxudmFyIHBlZXIgPSByZXF1aXJlKCcuL2xpYi9wZWVyJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtMS4wLjAnKTtcblxudmFyIHNldHRpbmdzID0gcmVxdWlyZSgnLi9zZXR0aW5ncycpO1xuXG5cbnZhciBndW0gPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWE7XG5cblxuLyoqXG4gKiBBIGxpYnJhcnkgZm9yIGNvbnRyb2xsaW5nIGFuIEhUTUw1IGdhbWUgdXNpbmcgV2ViUlRDLlxuICpcbiAqIEBleHBvcnRzIGdhbWVwYWRcbiAqIEBuYW1lc3BhY2UgZ2FtZXBhZFxuICovXG5mdW5jdGlvbiBnYW1lcGFkKCkge1xufVxuXG5cbi8qKlxuICogQXV0aGVudGljYXRlcyBhIHVzZXIuXG4gKlxuICogT3BlbnMgYSBtb2RhbCB0aGF0IG92ZXJsYXlzIHRoZSBnYW1lLCBwcm9tcHRpbmcgdGhlIHVzZXIgdG8gc2lnbiBpbi5cbiAqIFJldHVybnMgYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIGBVc2VyYCBvYmplY3QgZm9yIHRoZSB1c2VyLlxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICogQG1lbWJlck9mIGdhbGF4eVxuICovXG5nYW1lcGFkLmdldFBlZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBuZXcgUGVlcih7a2V5OiBzZXR0aW5ncy5QRUVSX0tFWX0pO1xufTtcblxuZ2FtZXBhZC52ZXJzaW9uID0gc2V0dGluZ3MuVkVSU0lPTjtcblxuXG4vKipcbiAqIEV4cG9ydCB0aGUgbW9kdWxlIHZpYSBBTUQsIENvbW1vbkpTLCBvciBhcyBhIGJyb3dzZXIgZ2xvYmFsLlxuICovXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdhbWVwYWQ7XG4gIH0pO1xufSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IGdhbWVwYWQ7XG59IGVsc2Uge1xuICB0aGlzLmdhbWVwYWQgPSBnYW1lcGFkO1xufVxuXG59KSgpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvKiEgcGVlcmpzLmpzIGJ1aWxkOjAuMy45LCBkZXZlbG9wbWVudC4gQ29weXJpZ2h0KGMpIDIwMTMgTWljaGVsbGUgQnUgPG1pY2hlbGxlQG1pY2hlbGxlYnUuY29tPiAqL1xuKGZ1bmN0aW9uKGV4cG9ydHMpe1xudmFyIGJpbmFyeUZlYXR1cmVzID0ge307XG5iaW5hcnlGZWF0dXJlcy51c2VCbG9iQnVpbGRlciA9IChmdW5jdGlvbigpe1xuICB0cnkge1xuICAgIG5ldyBCbG9iKFtdKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSkoKTtcblxuYmluYXJ5RmVhdHVyZXMudXNlQXJyYXlCdWZmZXJWaWV3ID0gIWJpbmFyeUZlYXR1cmVzLnVzZUJsb2JCdWlsZGVyICYmIChmdW5jdGlvbigpe1xuICB0cnkge1xuICAgIHJldHVybiAobmV3IEJsb2IoW25ldyBVaW50OEFycmF5KFtdKV0pKS5zaXplID09PSAwO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pKCk7XG5cbmV4cG9ydHMuYmluYXJ5RmVhdHVyZXMgPSBiaW5hcnlGZWF0dXJlcztcbmV4cG9ydHMuQmxvYkJ1aWxkZXIgPSB3aW5kb3cuV2ViS2l0QmxvYkJ1aWxkZXIgfHwgd2luZG93Lk1vekJsb2JCdWlsZGVyIHx8IHdpbmRvdy5NU0Jsb2JCdWlsZGVyIHx8IHdpbmRvdy5CbG9iQnVpbGRlcjtcblxuZnVuY3Rpb24gQnVmZmVyQnVpbGRlcigpe1xuICB0aGlzLl9waWVjZXMgPSBbXTtcbiAgdGhpcy5fcGFydHMgPSBbXTtcbn1cblxuQnVmZmVyQnVpbGRlci5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICBpZih0eXBlb2YgZGF0YSA9PT0gJ251bWJlcicpIHtcbiAgICB0aGlzLl9waWVjZXMucHVzaChkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmZsdXNoKCk7XG4gICAgdGhpcy5fcGFydHMucHVzaChkYXRhKTtcbiAgfVxufTtcblxuQnVmZmVyQnVpbGRlci5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3BpZWNlcy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMuX3BpZWNlcyk7XG4gICAgaWYoIWJpbmFyeUZlYXR1cmVzLnVzZUFycmF5QnVmZmVyVmlldykge1xuICAgICAgYnVmID0gYnVmLmJ1ZmZlcjtcbiAgICB9XG4gICAgdGhpcy5fcGFydHMucHVzaChidWYpO1xuICAgIHRoaXMuX3BpZWNlcyA9IFtdO1xuICB9XG59O1xuXG5CdWZmZXJCdWlsZGVyLnByb3RvdHlwZS5nZXRCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5mbHVzaCgpO1xuICBpZihiaW5hcnlGZWF0dXJlcy51c2VCbG9iQnVpbGRlcikge1xuICAgIHZhciBidWlsZGVyID0gbmV3IEJsb2JCdWlsZGVyKCk7XG4gICAgZm9yKHZhciBpID0gMCwgaWkgPSB0aGlzLl9wYXJ0cy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICBidWlsZGVyLmFwcGVuZCh0aGlzLl9wYXJ0c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBidWlsZGVyLmdldEJsb2IoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IEJsb2IodGhpcy5fcGFydHMpO1xuICB9XG59O1xuZXhwb3J0cy5CaW5hcnlQYWNrID0ge1xuICB1bnBhY2s6IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciB1bnBhY2tlciA9IG5ldyBVbnBhY2tlcihkYXRhKTtcbiAgICByZXR1cm4gdW5wYWNrZXIudW5wYWNrKCk7XG4gIH0sXG4gIHBhY2s6IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHZhciBwYWNrZXIgPSBuZXcgUGFja2VyKCk7XG4gICAgcGFja2VyLnBhY2soZGF0YSk7XG4gICAgdmFyIGJ1ZmZlciA9IHBhY2tlci5nZXRCdWZmZXIoKTtcbiAgICByZXR1cm4gYnVmZmVyO1xuICB9XG59O1xuXG5mdW5jdGlvbiBVbnBhY2tlciAoZGF0YSl7XG4gIC8vIERhdGEgaXMgQXJyYXlCdWZmZXJcbiAgdGhpcy5pbmRleCA9IDA7XG4gIHRoaXMuZGF0YUJ1ZmZlciA9IGRhdGE7XG4gIHRoaXMuZGF0YVZpZXcgPSBuZXcgVWludDhBcnJheSh0aGlzLmRhdGFCdWZmZXIpO1xuICB0aGlzLmxlbmd0aCA9IHRoaXMuZGF0YUJ1ZmZlci5ieXRlTGVuZ3RoO1xufVxuXG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2sgPSBmdW5jdGlvbigpe1xuICB2YXIgdHlwZSA9IHRoaXMudW5wYWNrX3VpbnQ4KCk7XG4gIGlmICh0eXBlIDwgMHg4MCl7XG4gICAgdmFyIHBvc2l0aXZlX2ZpeG51bSA9IHR5cGU7XG4gICAgcmV0dXJuIHBvc2l0aXZlX2ZpeG51bTtcbiAgfSBlbHNlIGlmICgodHlwZSBeIDB4ZTApIDwgMHgyMCl7XG4gICAgdmFyIG5lZ2F0aXZlX2ZpeG51bSA9ICh0eXBlIF4gMHhlMCkgLSAweDIwO1xuICAgIHJldHVybiBuZWdhdGl2ZV9maXhudW07XG4gIH1cbiAgdmFyIHNpemU7XG4gIGlmICgoc2l6ZSA9IHR5cGUgXiAweGEwKSA8PSAweDBmKXtcbiAgICByZXR1cm4gdGhpcy51bnBhY2tfcmF3KHNpemUpO1xuICB9IGVsc2UgaWYgKChzaXplID0gdHlwZSBeIDB4YjApIDw9IDB4MGYpe1xuICAgIHJldHVybiB0aGlzLnVucGFja19zdHJpbmcoc2l6ZSk7XG4gIH0gZWxzZSBpZiAoKHNpemUgPSB0eXBlIF4gMHg5MCkgPD0gMHgwZil7XG4gICAgcmV0dXJuIHRoaXMudW5wYWNrX2FycmF5KHNpemUpO1xuICB9IGVsc2UgaWYgKChzaXplID0gdHlwZSBeIDB4ODApIDw9IDB4MGYpe1xuICAgIHJldHVybiB0aGlzLnVucGFja19tYXAoc2l6ZSk7XG4gIH1cbiAgc3dpdGNoKHR5cGUpe1xuICAgIGNhc2UgMHhjMDpcbiAgICAgIHJldHVybiBudWxsO1xuICAgIGNhc2UgMHhjMTpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY2FzZSAweGMyOlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNhc2UgMHhjMzpcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNhc2UgMHhjYTpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19mbG9hdCgpO1xuICAgIGNhc2UgMHhjYjpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19kb3VibGUoKTtcbiAgICBjYXNlIDB4Y2M6XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfdWludDgoKTtcbiAgICBjYXNlIDB4Y2Q6XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfdWludDE2KCk7XG4gICAgY2FzZSAweGNlOlxuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICAgIGNhc2UgMHhjZjpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja191aW50NjQoKTtcbiAgICBjYXNlIDB4ZDA6XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfaW50OCgpO1xuICAgIGNhc2UgMHhkMTpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19pbnQxNigpO1xuICAgIGNhc2UgMHhkMjpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19pbnQzMigpO1xuICAgIGNhc2UgMHhkMzpcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19pbnQ2NCgpO1xuICAgIGNhc2UgMHhkNDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY2FzZSAweGQ1OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjYXNlIDB4ZDY6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNhc2UgMHhkNzpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY2FzZSAweGQ4OlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQxNigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX3N0cmluZyhzaXplKTtcbiAgICBjYXNlIDB4ZDk6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfc3RyaW5nKHNpemUpO1xuICAgIGNhc2UgMHhkYTpcbiAgICAgIHNpemUgPSB0aGlzLnVucGFja191aW50MTYoKTtcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19yYXcoc2l6ZSk7XG4gICAgY2FzZSAweGRiOlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX3JhdyhzaXplKTtcbiAgICBjYXNlIDB4ZGM6XG4gICAgICBzaXplID0gdGhpcy51bnBhY2tfdWludDE2KCk7XG4gICAgICByZXR1cm4gdGhpcy51bnBhY2tfYXJyYXkoc2l6ZSk7XG4gICAgY2FzZSAweGRkOlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX2FycmF5KHNpemUpO1xuICAgIGNhc2UgMHhkZTpcbiAgICAgIHNpemUgPSB0aGlzLnVucGFja191aW50MTYoKTtcbiAgICAgIHJldHVybiB0aGlzLnVucGFja19tYXAoc2l6ZSk7XG4gICAgY2FzZSAweGRmOlxuICAgICAgc2l6ZSA9IHRoaXMudW5wYWNrX3VpbnQzMigpO1xuICAgICAgcmV0dXJuIHRoaXMudW5wYWNrX21hcChzaXplKTtcbiAgfVxufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX3VpbnQ4ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGJ5dGUgPSB0aGlzLmRhdGFWaWV3W3RoaXMuaW5kZXhdICYgMHhmZjtcbiAgdGhpcy5pbmRleCsrO1xuICByZXR1cm4gYnl0ZTtcbn07XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfdWludDE2ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGJ5dGVzID0gdGhpcy5yZWFkKDIpO1xuICB2YXIgdWludDE2ID1cbiAgICAoKGJ5dGVzWzBdICYgMHhmZikgKiAyNTYpICsgKGJ5dGVzWzFdICYgMHhmZik7XG4gIHRoaXMuaW5kZXggKz0gMjtcbiAgcmV0dXJuIHVpbnQxNjtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja191aW50MzIgPSBmdW5jdGlvbigpe1xuICB2YXIgYnl0ZXMgPSB0aGlzLnJlYWQoNCk7XG4gIHZhciB1aW50MzIgPVxuICAgICAoKGJ5dGVzWzBdICAqIDI1NiArXG4gICAgICAgYnl0ZXNbMV0pICogMjU2ICtcbiAgICAgICBieXRlc1syXSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzNdO1xuICB0aGlzLmluZGV4ICs9IDQ7XG4gIHJldHVybiB1aW50MzI7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfdWludDY0ID0gZnVuY3Rpb24oKXtcbiAgdmFyIGJ5dGVzID0gdGhpcy5yZWFkKDgpO1xuICB2YXIgdWludDY0ID1cbiAgICgoKCgoKGJ5dGVzWzBdICAqIDI1NiArXG4gICAgICAgYnl0ZXNbMV0pICogMjU2ICtcbiAgICAgICBieXRlc1syXSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzNdKSAqIDI1NiArXG4gICAgICAgYnl0ZXNbNF0pICogMjU2ICtcbiAgICAgICBieXRlc1s1XSkgKiAyNTYgK1xuICAgICAgIGJ5dGVzWzZdKSAqIDI1NiArXG4gICAgICAgYnl0ZXNbN107XG4gIHRoaXMuaW5kZXggKz0gODtcbiAgcmV0dXJuIHVpbnQ2NDtcbn1cblxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2ludDggPSBmdW5jdGlvbigpe1xuICB2YXIgdWludDggPSB0aGlzLnVucGFja191aW50OCgpO1xuICByZXR1cm4gKHVpbnQ4IDwgMHg4MCApID8gdWludDggOiB1aW50OCAtICgxIDw8IDgpO1xufTtcblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19pbnQxNiA9IGZ1bmN0aW9uKCl7XG4gIHZhciB1aW50MTYgPSB0aGlzLnVucGFja191aW50MTYoKTtcbiAgcmV0dXJuICh1aW50MTYgPCAweDgwMDAgKSA/IHVpbnQxNiA6IHVpbnQxNiAtICgxIDw8IDE2KTtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19pbnQzMiA9IGZ1bmN0aW9uKCl7XG4gIHZhciB1aW50MzIgPSB0aGlzLnVucGFja191aW50MzIoKTtcbiAgcmV0dXJuICh1aW50MzIgPCBNYXRoLnBvdygyLCAzMSkgKSA/IHVpbnQzMiA6XG4gICAgdWludDMyIC0gTWF0aC5wb3coMiwgMzIpO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX2ludDY0ID0gZnVuY3Rpb24oKXtcbiAgdmFyIHVpbnQ2NCA9IHRoaXMudW5wYWNrX3VpbnQ2NCgpO1xuICByZXR1cm4gKHVpbnQ2NCA8IE1hdGgucG93KDIsIDYzKSApID8gdWludDY0IDpcbiAgICB1aW50NjQgLSBNYXRoLnBvdygyLCA2NCk7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfcmF3ID0gZnVuY3Rpb24oc2l6ZSl7XG4gIGlmICggdGhpcy5sZW5ndGggPCB0aGlzLmluZGV4ICsgc2l6ZSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCaW5hcnlQYWNrRmFpbHVyZTogaW5kZXggaXMgb3V0IG9mIHJhbmdlJ1xuICAgICAgKyAnICcgKyB0aGlzLmluZGV4ICsgJyAnICsgc2l6ZSArICcgJyArIHRoaXMubGVuZ3RoKTtcbiAgfVxuICB2YXIgYnVmID0gdGhpcy5kYXRhQnVmZmVyLnNsaWNlKHRoaXMuaW5kZXgsIHRoaXMuaW5kZXggKyBzaXplKTtcbiAgdGhpcy5pbmRleCArPSBzaXplO1xuXG4gICAgLy9idWYgPSB1dGlsLmJ1ZmZlclRvU3RyaW5nKGJ1Zik7XG5cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19zdHJpbmcgPSBmdW5jdGlvbihzaXplKXtcbiAgdmFyIGJ5dGVzID0gdGhpcy5yZWFkKHNpemUpO1xuICB2YXIgaSA9IDAsIHN0ciA9ICcnLCBjLCBjb2RlO1xuICB3aGlsZShpIDwgc2l6ZSl7XG4gICAgYyA9IGJ5dGVzW2ldO1xuICAgIGlmICggYyA8IDEyOCl7XG4gICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgIGkrKztcbiAgICB9IGVsc2UgaWYgKChjIF4gMHhjMCkgPCAzMil7XG4gICAgICBjb2RlID0gKChjIF4gMHhjMCkgPDwgNikgfCAoYnl0ZXNbaSsxXSAmIDYzKTtcbiAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgaSArPSAyO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2RlID0gKChjICYgMTUpIDw8IDEyKSB8ICgoYnl0ZXNbaSsxXSAmIDYzKSA8PCA2KSB8XG4gICAgICAgIChieXRlc1tpKzJdICYgNjMpO1xuICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICBpICs9IDM7XG4gICAgfVxuICB9XG4gIHRoaXMuaW5kZXggKz0gc2l6ZTtcbiAgcmV0dXJuIHN0cjtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19hcnJheSA9IGZ1bmN0aW9uKHNpemUpe1xuICB2YXIgb2JqZWN0cyA9IG5ldyBBcnJheShzaXplKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHNpemUgOyBpKyspe1xuICAgIG9iamVjdHNbaV0gPSB0aGlzLnVucGFjaygpO1xuICB9XG4gIHJldHVybiBvYmplY3RzO1xufVxuXG5VbnBhY2tlci5wcm90b3R5cGUudW5wYWNrX21hcCA9IGZ1bmN0aW9uKHNpemUpe1xuICB2YXIgbWFwID0ge307XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBzaXplIDsgaSsrKXtcbiAgICB2YXIga2V5ICA9IHRoaXMudW5wYWNrKCk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy51bnBhY2soKTtcbiAgICBtYXBba2V5XSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS51bnBhY2tfZmxvYXQgPSBmdW5jdGlvbigpe1xuICB2YXIgdWludDMyID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gIHZhciBzaWduID0gdWludDMyID4+IDMxO1xuICB2YXIgZXhwICA9ICgodWludDMyID4+IDIzKSAmIDB4ZmYpIC0gMTI3O1xuICB2YXIgZnJhY3Rpb24gPSAoIHVpbnQzMiAmIDB4N2ZmZmZmICkgfCAweDgwMDAwMDtcbiAgcmV0dXJuIChzaWduID09IDAgPyAxIDogLTEpICpcbiAgICBmcmFjdGlvbiAqIE1hdGgucG93KDIsIGV4cCAtIDIzKTtcbn1cblxuVW5wYWNrZXIucHJvdG90eXBlLnVucGFja19kb3VibGUgPSBmdW5jdGlvbigpe1xuICB2YXIgaDMyID0gdGhpcy51bnBhY2tfdWludDMyKCk7XG4gIHZhciBsMzIgPSB0aGlzLnVucGFja191aW50MzIoKTtcbiAgdmFyIHNpZ24gPSBoMzIgPj4gMzE7XG4gIHZhciBleHAgID0gKChoMzIgPj4gMjApICYgMHg3ZmYpIC0gMTAyMztcbiAgdmFyIGhmcmFjID0gKCBoMzIgJiAweGZmZmZmICkgfCAweDEwMDAwMDtcbiAgdmFyIGZyYWMgPSBoZnJhYyAqIE1hdGgucG93KDIsIGV4cCAtIDIwKSArXG4gICAgbDMyICAgKiBNYXRoLnBvdygyLCBleHAgLSA1Mik7XG4gIHJldHVybiAoc2lnbiA9PSAwID8gMSA6IC0xKSAqIGZyYWM7XG59XG5cblVucGFja2VyLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24obGVuZ3RoKXtcbiAgdmFyIGogPSB0aGlzLmluZGV4O1xuICBpZiAoaiArIGxlbmd0aCA8PSB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzLmRhdGFWaWV3LnN1YmFycmF5KGosIGogKyBsZW5ndGgpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignQmluYXJ5UGFja0ZhaWx1cmU6IHJlYWQgaW5kZXggb3V0IG9mIHJhbmdlJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gUGFja2VyKCl7XG4gIHRoaXMuYnVmZmVyQnVpbGRlciA9IG5ldyBCdWZmZXJCdWlsZGVyKCk7XG59XG5cblBhY2tlci5wcm90b3R5cGUuZ2V0QnVmZmVyID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuYnVmZmVyQnVpbGRlci5nZXRCdWZmZXIoKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrID0gZnVuY3Rpb24odmFsdWUpe1xuICB2YXIgdHlwZSA9IHR5cGVvZih2YWx1ZSk7XG4gIGlmICh0eXBlID09ICdzdHJpbmcnKXtcbiAgICB0aGlzLnBhY2tfc3RyaW5nKHZhbHVlKTtcbiAgfSBlbHNlIGlmICh0eXBlID09ICdudW1iZXInKXtcbiAgICBpZiAoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlKXtcbiAgICAgIHRoaXMucGFja19pbnRlZ2VyKHZhbHVlKTtcbiAgICB9IGVsc2V7XG4gICAgICB0aGlzLnBhY2tfZG91YmxlKHZhbHVlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PSAnYm9vbGVhbicpe1xuICAgIGlmICh2YWx1ZSA9PT0gdHJ1ZSl7XG4gICAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4YzMpO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IGZhbHNlKXtcbiAgICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjMik7XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT0gJ3VuZGVmaW5lZCcpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjMCk7XG4gIH0gZWxzZSBpZiAodHlwZSA9PSAnb2JqZWN0Jyl7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKXtcbiAgICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHZhbHVlLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGNvbnN0cnVjdG9yID09IEFycmF5KXtcbiAgICAgICAgdGhpcy5wYWNrX2FycmF5KHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoY29uc3RydWN0b3IgPT0gQmxvYiB8fCBjb25zdHJ1Y3RvciA9PSBGaWxlKSB7XG4gICAgICAgIHRoaXMucGFja19iaW4odmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PSBBcnJheUJ1ZmZlcikge1xuICAgICAgICBpZihiaW5hcnlGZWF0dXJlcy51c2VBcnJheUJ1ZmZlclZpZXcpIHtcbiAgICAgICAgICB0aGlzLnBhY2tfYmluKG5ldyBVaW50OEFycmF5KHZhbHVlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYWNrX2Jpbih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJ0JZVEVTX1BFUl9FTEVNRU5UJyBpbiB2YWx1ZSl7XG4gICAgICAgIGlmKGJpbmFyeUZlYXR1cmVzLnVzZUFycmF5QnVmZmVyVmlldykge1xuICAgICAgICAgIHRoaXMucGFja19iaW4obmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wYWNrX2Jpbih2YWx1ZS5idWZmZXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbnN0cnVjdG9yID09IE9iamVjdCl7XG4gICAgICAgIHRoaXMucGFja19vYmplY3QodmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChjb25zdHJ1Y3RvciA9PSBEYXRlKXtcbiAgICAgICAgdGhpcy5wYWNrX3N0cmluZyh2YWx1ZS50b1N0cmluZygpKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlLnRvQmluYXJ5UGFjayA9PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCh2YWx1ZS50b0JpbmFyeVBhY2soKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGUgXCInICsgY29uc3RydWN0b3IudG9TdHJpbmcoKSArICdcIiBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1R5cGUgXCInICsgdHlwZSArICdcIiBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICB9XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5mbHVzaCgpO1xufVxuXG5cblBhY2tlci5wcm90b3R5cGUucGFja19iaW4gPSBmdW5jdGlvbihibG9iKXtcbiAgdmFyIGxlbmd0aCA9IGJsb2IubGVuZ3RoIHx8IGJsb2IuYnl0ZUxlbmd0aCB8fCBibG9iLnNpemU7XG4gIGlmIChsZW5ndGggPD0gMHgwZil7XG4gICAgdGhpcy5wYWNrX3VpbnQ4KDB4YTAgKyBsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkYSkgO1xuICAgIHRoaXMucGFja191aW50MTYobGVuZ3RoKTtcbiAgfSBlbHNlIGlmIChsZW5ndGggPD0gMHhmZmZmZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGRiKTtcbiAgICB0aGlzLnBhY2tfdWludDMyKGxlbmd0aCk7XG4gIH0gZWxzZXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbGVuZ3RoJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoYmxvYik7XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19zdHJpbmcgPSBmdW5jdGlvbihzdHIpe1xuICB2YXIgbGVuZ3RoID0gdXRmOExlbmd0aChzdHIpO1xuXG4gIGlmIChsZW5ndGggPD0gMHgwZil7XG4gICAgdGhpcy5wYWNrX3VpbnQ4KDB4YjAgKyBsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkOCkgO1xuICAgIHRoaXMucGFja191aW50MTYobGVuZ3RoKTtcbiAgfSBlbHNlIGlmIChsZW5ndGggPD0gMHhmZmZmZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGQ5KTtcbiAgICB0aGlzLnBhY2tfdWludDMyKGxlbmd0aCk7XG4gIH0gZWxzZXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbGVuZ3RoJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoc3RyKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2FycmF5ID0gZnVuY3Rpb24oYXJ5KXtcbiAgdmFyIGxlbmd0aCA9IGFyeS5sZW5ndGg7XG4gIGlmIChsZW5ndGggPD0gMHgwZil7XG4gICAgdGhpcy5wYWNrX3VpbnQ4KDB4OTAgKyBsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkYylcbiAgICB0aGlzLnBhY2tfdWludDE2KGxlbmd0aCk7XG4gIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZmZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkZCk7XG4gICAgdGhpcy5wYWNrX3VpbnQzMihsZW5ndGgpO1xuICB9IGVsc2V7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGxlbmd0aCcpO1xuICB9XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGggOyBpKyspe1xuICAgIHRoaXMucGFjayhhcnlbaV0pO1xuICB9XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19pbnRlZ2VyID0gZnVuY3Rpb24obnVtKXtcbiAgaWYgKCAtMHgyMCA8PSBudW0gJiYgbnVtIDw9IDB4N2Ype1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQobnVtICYgMHhmZik7XG4gIH0gZWxzZSBpZiAoMHgwMCA8PSBudW0gJiYgbnVtIDw9IDB4ZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjYyk7XG4gICAgdGhpcy5wYWNrX3VpbnQ4KG51bSk7XG4gIH0gZWxzZSBpZiAoLTB4ODAgPD0gbnVtICYmIG51bSA8PSAweDdmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZDApO1xuICAgIHRoaXMucGFja19pbnQ4KG51bSk7XG4gIH0gZWxzZSBpZiAoIDB4MDAwMCA8PSBudW0gJiYgbnVtIDw9IDB4ZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGNkKTtcbiAgICB0aGlzLnBhY2tfdWludDE2KG51bSk7XG4gIH0gZWxzZSBpZiAoLTB4ODAwMCA8PSBudW0gJiYgbnVtIDw9IDB4N2ZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGQxKTtcbiAgICB0aGlzLnBhY2tfaW50MTYobnVtKTtcbiAgfSBlbHNlIGlmICggMHgwMDAwMDAwMCA8PSBudW0gJiYgbnVtIDw9IDB4ZmZmZmZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhjZSk7XG4gICAgdGhpcy5wYWNrX3VpbnQzMihudW0pO1xuICB9IGVsc2UgaWYgKC0weDgwMDAwMDAwIDw9IG51bSAmJiBudW0gPD0gMHg3ZmZmZmZmZil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGQyKTtcbiAgICB0aGlzLnBhY2tfaW50MzIobnVtKTtcbiAgfSBlbHNlIGlmICgtMHg4MDAwMDAwMDAwMDAwMDAwIDw9IG51bSAmJiBudW0gPD0gMHg3RkZGRkZGRkZGRkZGRkZGKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZDMpO1xuICAgIHRoaXMucGFja19pbnQ2NChudW0pO1xuICB9IGVsc2UgaWYgKDB4MDAwMDAwMDAwMDAwMDAwMCA8PSBudW0gJiYgbnVtIDw9IDB4RkZGRkZGRkZGRkZGRkZGRil7XG4gICAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGNmKTtcbiAgICB0aGlzLnBhY2tfdWludDY0KG51bSk7XG4gIH0gZWxzZXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaW50ZWdlcicpO1xuICB9XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja19kb3VibGUgPSBmdW5jdGlvbihudW0pe1xuICB2YXIgc2lnbiA9IDA7XG4gIGlmIChudW0gPCAwKXtcbiAgICBzaWduID0gMTtcbiAgICBudW0gPSAtbnVtO1xuICB9XG4gIHZhciBleHAgID0gTWF0aC5mbG9vcihNYXRoLmxvZyhudW0pIC8gTWF0aC5MTjIpO1xuICB2YXIgZnJhYzAgPSBudW0gLyBNYXRoLnBvdygyLCBleHApIC0gMTtcbiAgdmFyIGZyYWMxID0gTWF0aC5mbG9vcihmcmFjMCAqIE1hdGgucG93KDIsIDUyKSk7XG4gIHZhciBiMzIgICA9IE1hdGgucG93KDIsIDMyKTtcbiAgdmFyIGgzMiA9IChzaWduIDw8IDMxKSB8ICgoZXhwKzEwMjMpIDw8IDIwKSB8XG4gICAgICAoZnJhYzEgLyBiMzIpICYgMHgwZmZmZmY7XG4gIHZhciBsMzIgPSBmcmFjMSAlIGIzMjtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgweGNiKTtcbiAgdGhpcy5wYWNrX2ludDMyKGgzMik7XG4gIHRoaXMucGFja19pbnQzMihsMzIpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfb2JqZWN0ID0gZnVuY3Rpb24ob2JqKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gIGlmIChsZW5ndGggPD0gMHgwZil7XG4gICAgdGhpcy5wYWNrX3VpbnQ4KDB4ODAgKyBsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmYpe1xuICAgIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoMHhkZSk7XG4gICAgdGhpcy5wYWNrX3VpbnQxNihsZW5ndGgpO1xuICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmZmZmZmKXtcbiAgICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKDB4ZGYpO1xuICAgIHRoaXMucGFja191aW50MzIobGVuZ3RoKTtcbiAgfSBlbHNle1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBsZW5ndGgnKTtcbiAgfVxuICBmb3IodmFyIHByb3AgaW4gb2JqKXtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKXtcbiAgICAgIHRoaXMucGFjayhwcm9wKTtcbiAgICAgIHRoaXMucGFjayhvYmpbcHJvcF0pO1xuICAgIH1cbiAgfVxufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfdWludDggPSBmdW5jdGlvbihudW0pe1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKG51bSk7XG59XG5cblBhY2tlci5wcm90b3R5cGUucGFja191aW50MTYgPSBmdW5jdGlvbihudW0pe1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKG51bSA+PiA4KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZChudW0gJiAweGZmKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX3VpbnQzMiA9IGZ1bmN0aW9uKG51bSl7XG4gIHZhciBuID0gbnVtICYgMHhmZmZmZmZmZjtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobiAmIDB4ZmYwMDAwMDApID4+PiAyNCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG4gJiAweDAwZmYwMDAwKSA+Pj4gMTYpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChuICYgMHgwMDAwZmYwMCkgPj4+ICA4KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobiAmIDB4MDAwMDAwZmYpKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX3VpbnQ2NCA9IGZ1bmN0aW9uKG51bSl7XG4gIHZhciBoaWdoID0gbnVtIC8gTWF0aC5wb3coMiwgMzIpO1xuICB2YXIgbG93ICA9IG51bSAlIE1hdGgucG93KDIsIDMyKTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgoaGlnaCAmIDB4ZmYwMDAwMDApID4+PiAyNCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGhpZ2ggJiAweDAwZmYwMDAwKSA+Pj4gMTYpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHgwMDAwZmYwMCkgPj4+ICA4KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgoaGlnaCAmIDB4MDAwMDAwZmYpKTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobG93ICAmIDB4ZmYwMDAwMDApID4+PiAyNCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGxvdyAgJiAweDAwZmYwMDAwKSA+Pj4gMTYpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHgwMDAwZmYwMCkgPj4+ICA4KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobG93ICAmIDB4MDAwMDAwZmYpKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2ludDggPSBmdW5jdGlvbihudW0pe1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKG51bSAmIDB4ZmYpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfaW50MTYgPSBmdW5jdGlvbihudW0pe1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChudW0gJiAweGZmMDApID4+IDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKG51bSAmIDB4ZmYpO1xufVxuXG5QYWNrZXIucHJvdG90eXBlLnBhY2tfaW50MzIgPSBmdW5jdGlvbihudW0pe1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChudW0gPj4+IDI0KSAmIDB4ZmYpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChudW0gJiAweDAwZmYwMDAwKSA+Pj4gMTYpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChudW0gJiAweDAwMDBmZjAwKSA+Pj4gOCk7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKG51bSAmIDB4MDAwMDAwZmYpKTtcbn1cblxuUGFja2VyLnByb3RvdHlwZS5wYWNrX2ludDY0ID0gZnVuY3Rpb24obnVtKXtcbiAgdmFyIGhpZ2ggPSBNYXRoLmZsb29yKG51bSAvIE1hdGgucG93KDIsIDMyKSk7XG4gIHZhciBsb3cgID0gbnVtICUgTWF0aC5wb3coMiwgMzIpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHhmZjAwMDAwMCkgPj4+IDI0KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgoaGlnaCAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGhpZ2ggJiAweDAwMDBmZjAwKSA+Pj4gIDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChoaWdoICYgMHgwMDAwMDBmZikpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHhmZjAwMDAwMCkgPj4+IDI0KTtcbiAgdGhpcy5idWZmZXJCdWlsZGVyLmFwcGVuZCgobG93ICAmIDB4MDBmZjAwMDApID4+PiAxNik7XG4gIHRoaXMuYnVmZmVyQnVpbGRlci5hcHBlbmQoKGxvdyAgJiAweDAwMDBmZjAwKSA+Pj4gIDgpO1xuICB0aGlzLmJ1ZmZlckJ1aWxkZXIuYXBwZW5kKChsb3cgICYgMHgwMDAwMDBmZikpO1xufVxuXG5mdW5jdGlvbiBfdXRmOFJlcGxhY2UobSl7XG4gIHZhciBjb2RlID0gbS5jaGFyQ29kZUF0KDApO1xuXG4gIGlmKGNvZGUgPD0gMHg3ZmYpIHJldHVybiAnMDAnO1xuICBpZihjb2RlIDw9IDB4ZmZmZikgcmV0dXJuICcwMDAnO1xuICBpZihjb2RlIDw9IDB4MWZmZmZmKSByZXR1cm4gJzAwMDAnO1xuICBpZihjb2RlIDw9IDB4M2ZmZmZmZikgcmV0dXJuICcwMDAwMCc7XG4gIHJldHVybiAnMDAwMDAwJztcbn1cblxuZnVuY3Rpb24gdXRmOExlbmd0aChzdHIpe1xuICBpZiAoc3RyLmxlbmd0aCA+IDYwMCkge1xuICAgIC8vIEJsb2IgbWV0aG9kIGZhc3RlciBmb3IgbGFyZ2Ugc3RyaW5nc1xuICAgIHJldHVybiAobmV3IEJsb2IoW3N0cl0pKS5zaXplO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvW15cXHUwMDAwLVxcdTAwN0ZdL2csIF91dGY4UmVwbGFjZSkubGVuZ3RoO1xuICB9XG59XG4vKipcbiAqIExpZ2h0IEV2ZW50RW1pdHRlci4gUG9ydGVkIGZyb20gTm9kZS5qcy9ldmVudHMuanNcbiAqIEVyaWMgWmhhbmdcbiAqL1xuXG4vKipcbiAqIEV2ZW50RW1pdHRlciBjbGFzc1xuICogQ3JlYXRlcyBhbiBvYmplY3Qgd2l0aCBldmVudCByZWdpc3RlcmluZyBhbmQgZmlyaW5nIG1ldGhvZHNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICAvLyBJbml0aWFsaXNlIHJlcXVpcmVkIHN0b3JhZ2UgdmFyaWFibGVzXG4gIHRoaXMuX2V2ZW50cyA9IHt9O1xufVxuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBzY29wZSwgb25jZSkge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdhZGRMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIHR5cGVvZiBsaXN0ZW5lci5saXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblxuICB9IGVsc2Uge1xuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgc2NvcGUpIHtcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xuICAgIHRocm93IG5ldyBFcnJvcignLm9uY2Ugb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgZnVuY3Rpb24gZygpIHtcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICBzZWxmLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyLCBzY29wZSkge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNBcnJheShsaXN0KSkge1xuICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpXG4gICAgICB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMCkgcmV0dXJuIHRoaXM7XG4gICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfSBlbHNlIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgICAgIChsaXN0Lmxpc3RlbmVyICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSlcbiAge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuXG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gIGlmICh0eXBlICYmIHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXTtcbiAgdmFyIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGlmICghaGFuZGxlcikgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoaXNBcnJheShoYW5kbGVyKSkge1xuICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5cblxuLyoqXG4gKiBSZWxpYWJsZSB0cmFuc2ZlciBmb3IgQ2hyb21lIENhbmFyeSBEYXRhQ2hhbm5lbCBpbXBsLlxuICogQXV0aG9yOiBAbWljaGVsbGVidVxuICovXG5mdW5jdGlvbiBSZWxpYWJsZShkYywgZGVidWcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlbGlhYmxlKSkgcmV0dXJuIG5ldyBSZWxpYWJsZShkYyk7XG4gIHRoaXMuX2RjID0gZGM7XG5cbiAgdXRpbC5kZWJ1ZyA9IGRlYnVnO1xuXG4gIC8vIE1lc3NhZ2VzIHNlbnQvcmVjZWl2ZWQgc28gZmFyLlxuICAvLyBpZDogeyBhY2s6IG4sIGNodW5rczogWy4uLl0gfVxuICB0aGlzLl9vdXRnb2luZyA9IHt9O1xuICAvLyBpZDogeyBhY2s6IFsnYWNrJywgaWQsIG5dLCBjaHVua3M6IFsuLi5dIH1cbiAgdGhpcy5faW5jb21pbmcgPSB7fTtcbiAgdGhpcy5fcmVjZWl2ZWQgPSB7fTtcblxuICAvLyBXaW5kb3cgc2l6ZS5cbiAgdGhpcy5fd2luZG93ID0gMTAwMDtcbiAgLy8gTVRVLlxuICB0aGlzLl9tdHUgPSA1MDA7XG4gIC8vIEludGVydmFsIGZvciBzZXRJbnRlcnZhbC4gSW4gbXMuXG4gIHRoaXMuX2ludGVydmFsID0gMDtcblxuICAvLyBNZXNzYWdlcyBzZW50LlxuICB0aGlzLl9jb3VudCA9IDA7XG5cbiAgLy8gT3V0Z29pbmcgbWVzc2FnZSBxdWV1ZS5cbiAgdGhpcy5fcXVldWUgPSBbXTtcblxuICB0aGlzLl9zZXR1cERDKCk7XG59O1xuXG4vLyBTZW5kIGEgbWVzc2FnZSByZWxpYWJseS5cblJlbGlhYmxlLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obXNnKSB7XG4gIC8vIERldGVybWluZSBpZiBjaHVua2luZyBpcyBuZWNlc3NhcnkuXG4gIHZhciBibCA9IHV0aWwucGFjayhtc2cpO1xuICBpZiAoYmwuc2l6ZSA8IHRoaXMuX210dSkge1xuICAgIHRoaXMuX2hhbmRsZVNlbmQoWydubycsIGJsXSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fb3V0Z29pbmdbdGhpcy5fY291bnRdID0ge1xuICAgIGFjazogMCxcbiAgICBjaHVua3M6IHRoaXMuX2NodW5rKGJsKVxuICB9O1xuXG4gIGlmICh1dGlsLmRlYnVnKSB7XG4gICAgdGhpcy5fb3V0Z29pbmdbdGhpcy5fY291bnRdLnRpbWVyID0gbmV3IERhdGUoKTtcbiAgfVxuXG4gIC8vIFNlbmQgcHJlbGltIHdpbmRvdy5cbiAgdGhpcy5fc2VuZFdpbmRvd2VkQ2h1bmtzKHRoaXMuX2NvdW50KTtcbiAgdGhpcy5fY291bnQgKz0gMTtcbn07XG5cbi8vIFNldCB1cCBpbnRlcnZhbCBmb3IgcHJvY2Vzc2luZyBxdWV1ZS5cblJlbGlhYmxlLnByb3RvdHlwZS5fc2V0dXBJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICAvLyBUT0RPOiBmYWlsIGdyYWNlZnVsbHkuXG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl90aW1lb3V0ID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgLy8gRklYTUU6IFN0cmluZyBzdHVmZiBtYWtlcyB0aGluZ3MgdGVycmlibHkgYXN5bmMuXG4gICAgdmFyIG1zZyA9IHNlbGYuX3F1ZXVlLnNoaWZ0KCk7XG4gICAgaWYgKG1zZy5fbXVsdGlwbGUpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG1zZy5sZW5ndGg7IGkgPCBpaTsgaSArPSAxKSB7XG4gICAgICAgIHNlbGYuX2ludGVydmFsU2VuZChtc2dbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLl9pbnRlcnZhbFNlbmQobXNnKTtcbiAgICB9XG4gIH0sIHRoaXMuX2ludGVydmFsKTtcbn07XG5cblJlbGlhYmxlLnByb3RvdHlwZS5faW50ZXJ2YWxTZW5kID0gZnVuY3Rpb24obXNnKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgbXNnID0gdXRpbC5wYWNrKG1zZyk7XG4gIHV0aWwuYmxvYlRvQmluYXJ5U3RyaW5nKG1zZywgZnVuY3Rpb24oc3RyKSB7XG4gICAgc2VsZi5fZGMuc2VuZChzdHIpO1xuICB9KTtcbiAgaWYgKHNlbGYuX3F1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgIGNsZWFyVGltZW91dChzZWxmLl90aW1lb3V0KTtcbiAgICBzZWxmLl90aW1lb3V0ID0gbnVsbDtcbiAgICAvL3NlbGYuX3Byb2Nlc3NBY2tzKCk7XG4gIH1cbn07XG5cbi8vIEdvIHRocm91Z2ggQUNLcyB0byBzZW5kIG1pc3NpbmcgcGllY2VzLlxuUmVsaWFibGUucHJvdG90eXBlLl9wcm9jZXNzQWNrcyA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpZCBpbiB0aGlzLl9vdXRnb2luZykge1xuICAgIGlmICh0aGlzLl9vdXRnb2luZy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgIHRoaXMuX3NlbmRXaW5kb3dlZENodW5rcyhpZCk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBIYW5kbGUgc2VuZGluZyBhIG1lc3NhZ2UuXG4vLyBGSVhNRTogRG9uJ3Qgd2FpdCBmb3IgaW50ZXJ2YWwgdGltZSBmb3IgYWxsIG1lc3NhZ2VzLi4uXG5SZWxpYWJsZS5wcm90b3R5cGUuX2hhbmRsZVNlbmQgPSBmdW5jdGlvbihtc2cpIHtcbiAgdmFyIHB1c2ggPSB0cnVlO1xuICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLl9xdWV1ZS5sZW5ndGg7IGkgPCBpaTsgaSArPSAxKSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLl9xdWV1ZVtpXTtcbiAgICBpZiAoaXRlbSA9PT0gbXNnKSB7XG4gICAgICBwdXNoID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChpdGVtLl9tdWx0aXBsZSAmJiBpdGVtLmluZGV4T2YobXNnKSAhPT0gLTEpIHtcbiAgICAgIHB1c2ggPSBmYWxzZTtcbiAgICB9XG4gIH1cbiAgaWYgKHB1c2gpIHtcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKG1zZyk7XG4gICAgaWYgKCF0aGlzLl90aW1lb3V0KSB7XG4gICAgICB0aGlzLl9zZXR1cEludGVydmFsKCk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBTZXQgdXAgRGF0YUNoYW5uZWwgaGFuZGxlcnMuXG5SZWxpYWJsZS5wcm90b3R5cGUuX3NldHVwREMgPSBmdW5jdGlvbigpIHtcbiAgLy8gSGFuZGxlIHZhcmlvdXMgbWVzc2FnZSB0eXBlcy5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9kYy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIG1zZyA9IGUuZGF0YTtcbiAgICB2YXIgZGF0YXR5cGUgPSBtc2cuY29uc3RydWN0b3I7XG4gICAgLy8gRklYTUU6IG1zZyBpcyBTdHJpbmcgdW50aWwgYmluYXJ5IGlzIHN1cHBvcnRlZC5cbiAgICAvLyBPbmNlIHRoYXQgaGFwcGVucywgdGhpcyB3aWxsIGhhdmUgdG8gYmUgc21hcnRlci5cbiAgICBpZiAoZGF0YXR5cGUgPT09IFN0cmluZykge1xuICAgICAgdmFyIGFiID0gdXRpbC5iaW5hcnlTdHJpbmdUb0FycmF5QnVmZmVyKG1zZyk7XG4gICAgICBtc2cgPSB1dGlsLnVucGFjayhhYik7XG4gICAgICBzZWxmLl9oYW5kbGVNZXNzYWdlKG1zZyk7XG4gICAgfVxuICB9O1xufTtcblxuLy8gSGFuZGxlcyBhbiBpbmNvbWluZyBtZXNzYWdlLlxuUmVsaWFibGUucHJvdG90eXBlLl9oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24obXNnKSB7XG4gIHZhciBpZCA9IG1zZ1sxXTtcbiAgdmFyIGlkYXRhID0gdGhpcy5faW5jb21pbmdbaWRdO1xuICB2YXIgb2RhdGEgPSB0aGlzLl9vdXRnb2luZ1tpZF07XG4gIHZhciBkYXRhO1xuICBzd2l0Y2ggKG1zZ1swXSkge1xuICAgIC8vIE5vIGNodW5raW5nIHdhcyBkb25lLlxuICAgIGNhc2UgJ25vJzpcbiAgICAgIHZhciBtZXNzYWdlID0gaWQ7XG4gICAgICBpZiAoISFtZXNzYWdlKSB7XG4gICAgICAgIHRoaXMub25tZXNzYWdlKHV0aWwudW5wYWNrKG1lc3NhZ2UpKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIC8vIFJlYWNoZWQgdGhlIGVuZCBvZiB0aGUgbWVzc2FnZS5cbiAgICBjYXNlICdlbmQnOlxuICAgICAgZGF0YSA9IGlkYXRhO1xuXG4gICAgICAvLyBJbiBjYXNlIGVuZCBjb21lcyBmaXJzdC5cbiAgICAgIHRoaXMuX3JlY2VpdmVkW2lkXSA9IG1zZ1syXTtcblxuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hY2soaWQpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYWNrJzpcbiAgICAgIGRhdGEgPSBvZGF0YTtcbiAgICAgIGlmICghIWRhdGEpIHtcbiAgICAgICAgdmFyIGFjayA9IG1zZ1syXTtcbiAgICAgICAgLy8gVGFrZSB0aGUgbGFyZ2VyIEFDSywgZm9yIG91dCBvZiBvcmRlciBtZXNzYWdlcy5cbiAgICAgICAgZGF0YS5hY2sgPSBNYXRoLm1heChhY2ssIGRhdGEuYWNrKTtcblxuICAgICAgICAvLyBDbGVhbiB1cCB3aGVuIGFsbCBjaHVua3MgYXJlIEFDS2VkLlxuICAgICAgICBpZiAoZGF0YS5hY2sgPj0gZGF0YS5jaHVua3MubGVuZ3RoKSB7XG4gICAgICAgICAgdXRpbC5sb2coJ1RpbWU6ICcsIG5ldyBEYXRlKCkgLSBkYXRhLnRpbWVyKTtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fb3V0Z29pbmdbaWRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3Byb2Nlc3NBY2tzKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIElmICFkYXRhLCBqdXN0IGlnbm9yZS5cbiAgICAgIGJyZWFrO1xuICAgIC8vIFJlY2VpdmVkIGEgY2h1bmsgb2YgZGF0YS5cbiAgICBjYXNlICdjaHVuayc6XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgZW50cnkgaWYgbm9uZSBleGlzdHMuXG4gICAgICBkYXRhID0gaWRhdGE7XG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMuX3JlY2VpdmVkW2lkXTtcbiAgICAgICAgaWYgKGVuZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgYWNrOiBbJ2FjaycsIGlkLCAwXSxcbiAgICAgICAgICBjaHVua3M6IFtdXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2luY29taW5nW2lkXSA9IGRhdGE7XG4gICAgICB9XG5cbiAgICAgIHZhciBuID0gbXNnWzJdO1xuICAgICAgdmFyIGNodW5rID0gbXNnWzNdO1xuICAgICAgZGF0YS5jaHVua3Nbbl0gPSBuZXcgVWludDhBcnJheShjaHVuayk7XG5cbiAgICAgIC8vIElmIHdlIGdldCB0aGUgY2h1bmsgd2UncmUgbG9va2luZyBmb3IsIEFDSyBmb3IgbmV4dCBtaXNzaW5nLlxuICAgICAgLy8gT3RoZXJ3aXNlLCBBQ0sgdGhlIHNhbWUgTiBhZ2Fpbi5cbiAgICAgIGlmIChuID09PSBkYXRhLmFja1syXSkge1xuICAgICAgICB0aGlzLl9jYWxjdWxhdGVOZXh0QWNrKGlkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2FjayhpZCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gU2hvdWxkbid0IGhhcHBlbiwgYnV0IHdvdWxkIG1ha2Ugc2Vuc2UgZm9yIG1lc3NhZ2UgdG8ganVzdCBnb1xuICAgICAgLy8gdGhyb3VnaCBhcyBpcy5cbiAgICAgIHRoaXMuX2hhbmRsZVNlbmQobXNnKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuXG4vLyBDaHVua3MgQkwgaW50byBzbWFsbGVyIG1lc3NhZ2VzLlxuUmVsaWFibGUucHJvdG90eXBlLl9jaHVuayA9IGZ1bmN0aW9uKGJsKSB7XG4gIHZhciBjaHVua3MgPSBbXTtcbiAgdmFyIHNpemUgPSBibC5zaXplO1xuICB2YXIgc3RhcnQgPSAwO1xuICB3aGlsZSAoc3RhcnQgPCBzaXplKSB7XG4gICAgdmFyIGVuZCA9IE1hdGgubWluKHNpemUsIHN0YXJ0ICsgdGhpcy5fbXR1KTtcbiAgICB2YXIgYiA9IGJsLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIHZhciBjaHVuayA9IHtcbiAgICAgIHBheWxvYWQ6IGJcbiAgICB9XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgIHN0YXJ0ID0gZW5kO1xuICB9XG4gIHV0aWwubG9nKCdDcmVhdGVkJywgY2h1bmtzLmxlbmd0aCwgJ2NodW5rcy4nKTtcbiAgcmV0dXJuIGNodW5rcztcbn07XG5cbi8vIFNlbmRzIEFDSyBOLCBleHBlY3RpbmcgTnRoIGJsb2IgY2h1bmsgZm9yIG1lc3NhZ2UgSUQuXG5SZWxpYWJsZS5wcm90b3R5cGUuX2FjayA9IGZ1bmN0aW9uKGlkKSB7XG4gIHZhciBhY2sgPSB0aGlzLl9pbmNvbWluZ1tpZF0uYWNrO1xuXG4gIC8vIGlmIGFjayBpcyB0aGUgZW5kIHZhbHVlLCB0aGVuIGNhbGwgX2NvbXBsZXRlLlxuICBpZiAodGhpcy5fcmVjZWl2ZWRbaWRdID09PSBhY2tbMl0pIHtcbiAgICB0aGlzLl9jb21wbGV0ZShpZCk7XG4gICAgdGhpcy5fcmVjZWl2ZWRbaWRdID0gdHJ1ZTtcbiAgfVxuXG4gIHRoaXMuX2hhbmRsZVNlbmQoYWNrKTtcbn07XG5cbi8vIENhbGN1bGF0ZXMgdGhlIG5leHQgQUNLIG51bWJlciwgZ2l2ZW4gY2h1bmtzLlxuUmVsaWFibGUucHJvdG90eXBlLl9jYWxjdWxhdGVOZXh0QWNrID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIGRhdGEgPSB0aGlzLl9pbmNvbWluZ1tpZF07XG4gIHZhciBjaHVua3MgPSBkYXRhLmNodW5rcztcbiAgZm9yICh2YXIgaSA9IDAsIGlpID0gY2h1bmtzLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICAvLyBUaGlzIGNodW5rIGlzIG1pc3NpbmchISEgQmV0dGVyIEFDSyBmb3IgaXQuXG4gICAgaWYgKGNodW5rc1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkYXRhLmFja1syXSA9IGk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGRhdGEuYWNrWzJdID0gY2h1bmtzLmxlbmd0aDtcbn07XG5cbi8vIFNlbmRzIHRoZSBuZXh0IHdpbmRvdyBvZiBjaHVua3MuXG5SZWxpYWJsZS5wcm90b3R5cGUuX3NlbmRXaW5kb3dlZENodW5rcyA9IGZ1bmN0aW9uKGlkKSB7XG4gIHV0aWwubG9nKCdzZW5kV2luZG93ZWRDaHVua3MgZm9yOiAnLCBpZCk7XG4gIHZhciBkYXRhID0gdGhpcy5fb3V0Z29pbmdbaWRdO1xuICB2YXIgY2ggPSBkYXRhLmNodW5rcztcbiAgdmFyIGNodW5rcyA9IFtdO1xuICB2YXIgbGltaXQgPSBNYXRoLm1pbihkYXRhLmFjayArIHRoaXMuX3dpbmRvdywgY2gubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IGRhdGEuYWNrOyBpIDwgbGltaXQ7IGkgKz0gMSkge1xuICAgIGlmICghY2hbaV0uc2VudCB8fCBpID09PSBkYXRhLmFjaykge1xuICAgICAgY2hbaV0uc2VudCA9IHRydWU7XG4gICAgICBjaHVua3MucHVzaChbJ2NodW5rJywgaWQsIGksIGNoW2ldLnBheWxvYWRdKTtcbiAgICB9XG4gIH1cbiAgaWYgKGRhdGEuYWNrICsgdGhpcy5fd2luZG93ID49IGNoLmxlbmd0aCkge1xuICAgIGNodW5rcy5wdXNoKFsnZW5kJywgaWQsIGNoLmxlbmd0aF0pXG4gIH1cbiAgY2h1bmtzLl9tdWx0aXBsZSA9IHRydWU7XG4gIHRoaXMuX2hhbmRsZVNlbmQoY2h1bmtzKTtcbn07XG5cbi8vIFB1dHMgdG9nZXRoZXIgYSBtZXNzYWdlIGZyb20gY2h1bmtzLlxuUmVsaWFibGUucHJvdG90eXBlLl9jb21wbGV0ZSA9IGZ1bmN0aW9uKGlkKSB7XG4gIHV0aWwubG9nKCdDb21wbGV0ZWQgY2FsbGVkIGZvcicsIGlkKTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgY2h1bmtzID0gdGhpcy5faW5jb21pbmdbaWRdLmNodW5rcztcbiAgdmFyIGJsID0gbmV3IEJsb2IoY2h1bmtzKTtcbiAgdXRpbC5ibG9iVG9BcnJheUJ1ZmZlcihibCwgZnVuY3Rpb24oYWIpIHtcbiAgICBzZWxmLm9ubWVzc2FnZSh1dGlsLnVucGFjayhhYikpO1xuICB9KTtcbiAgZGVsZXRlIHRoaXMuX2luY29taW5nW2lkXTtcbn07XG5cbi8vIFVwcyBiYW5kd2lkdGggbGltaXQgb24gU0RQLiBNZWFudCB0byBiZSBjYWxsZWQgZHVyaW5nIG9mZmVyL2Fuc3dlci5cblJlbGlhYmxlLmhpZ2hlckJhbmR3aWR0aFNEUCA9IGZ1bmN0aW9uKHNkcCkge1xuICAvLyBBUyBzdGFuZHMgZm9yIEFwcGxpY2F0aW9uLVNwZWNpZmljIE1heGltdW0uXG4gIC8vIEJhbmR3aWR0aCBudW1iZXIgaXMgaW4ga2lsb2JpdHMgLyBzZWMuXG4gIC8vIFNlZSBSRkMgZm9yIG1vcmUgaW5mbzogaHR0cDovL3d3dy5pZXRmLm9yZy9yZmMvcmZjMjMyNy50eHRcblxuICAvLyBDaHJvbWUgMzErIGRvZXNuJ3Qgd2FudCB1cyBtdW5naW5nIHRoZSBTRFAsIHNvIHdlJ2xsIGxldCB0aGVtIGhhdmUgdGhlaXJcbiAgLy8gd2F5LlxuICB2YXIgdmVyc2lvbiA9IG5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9DaHJvbWVcXC8oLio/KSAvKTtcbiAgaWYgKHZlcnNpb24pIHtcbiAgICB2ZXJzaW9uID0gcGFyc2VJbnQodmVyc2lvblsxXS5zcGxpdCgnLicpLnNoaWZ0KCkpO1xuICAgIGlmICh2ZXJzaW9uIDwgMzEpIHtcbiAgICAgIHZhciBwYXJ0cyA9IHNkcC5zcGxpdCgnYj1BUzozMCcpO1xuICAgICAgdmFyIHJlcGxhY2UgPSAnYj1BUzoxMDI0MDAnOyAvLyAxMDAgTWJwc1xuICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmV0dXJuIHBhcnRzWzBdICsgcmVwbGFjZSArIHBhcnRzWzFdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzZHA7XG59O1xuXG4vLyBPdmVyd3JpdHRlbiwgdHlwaWNhbGx5LlxuUmVsaWFibGUucHJvdG90eXBlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG1zZykge307XG5cbmV4cG9ydHMuUmVsaWFibGUgPSBSZWxpYWJsZTtcbmV4cG9ydHMuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fCB3aW5kb3cubW96UlRDU2Vzc2lvbkRlc2NyaXB0aW9uO1xuZXhwb3J0cy5SVENQZWVyQ29ubmVjdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiB8fCB3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24gfHwgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuZXhwb3J0cy5SVENJY2VDYW5kaWRhdGUgPSB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlIHx8IHdpbmRvdy5tb3pSVENJY2VDYW5kaWRhdGU7XG52YXIgZGVmYXVsdENvbmZpZyA9IHsnaWNlU2VydmVycyc6IFt7ICd1cmwnOiAnc3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMicgfV19O1xudmFyIGRhdGFDb3VudCA9IDE7XG5cbnZhciB1dGlsID0ge1xuICBub29wOiBmdW5jdGlvbigpIHt9LFxuXG4gIENMT1VEX0hPU1Q6ICcwLnBlZXJqcy5jb20nLFxuICBDTE9VRF9QT1JUOiA5MDAwLFxuXG4gIC8vIEJyb3dzZXJzIHRoYXQgbmVlZCBjaHVua2luZzpcbiAgY2h1bmtlZEJyb3dzZXJzOiB7J0Nocm9tZSc6IDF9LFxuICBjaHVua2VkTVRVOiAxNjMwMCwgLy8gVGhlIG9yaWdpbmFsIDYwMDAwIGJ5dGVzIHNldHRpbmcgZG9lcyBub3Qgd29yayB3aGVuIHNlbmRpbmcgZGF0YSBmcm9tIEZpcmVmb3ggdG8gQ2hyb21lLCB3aGljaCBpcyBcImN1dCBvZmZcIiBhZnRlciAxNjM4NCBieXRlcyBhbmQgZGVsaXZlcmVkIGluZGl2aWR1YWxseS5cblxuICAvLyBMb2dnaW5nIGxvZ2ljXG4gIGxvZ0xldmVsOiAwLFxuICBzZXRMb2dMZXZlbDogZnVuY3Rpb24obGV2ZWwpIHtcbiAgICB2YXIgZGVidWdMZXZlbCA9IHBhcnNlSW50KGxldmVsLCAxMCk7XG4gICAgaWYgKCFpc05hTihwYXJzZUludChsZXZlbCwgMTApKSkge1xuICAgICAgdXRpbC5sb2dMZXZlbCA9IGRlYnVnTGV2ZWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXkgYXJlIHVzaW5nIHRydXRoeS9mYWxzeSB2YWx1ZXMgZm9yIGRlYnVnXG4gICAgICB1dGlsLmxvZ0xldmVsID0gbGV2ZWwgPyAzIDogMDtcbiAgICB9XG4gICAgdXRpbC5sb2cgPSB1dGlsLndhcm4gPSB1dGlsLmVycm9yID0gdXRpbC5ub29wO1xuICAgIGlmICh1dGlsLmxvZ0xldmVsID4gMCkge1xuICAgICAgdXRpbC5lcnJvciA9IHV0aWwuX3ByaW50V2l0aCgnRVJST1InKTtcbiAgICB9XG4gICAgaWYgKHV0aWwubG9nTGV2ZWwgPiAxKSB7XG4gICAgICB1dGlsLndhcm4gPSB1dGlsLl9wcmludFdpdGgoJ1dBUk5JTkcnKTtcbiAgICB9XG4gICAgaWYgKHV0aWwubG9nTGV2ZWwgPiAyKSB7XG4gICAgICB1dGlsLmxvZyA9IHV0aWwuX3ByaW50O1xuICAgIH1cbiAgfSxcbiAgc2V0TG9nRnVuY3Rpb246IGZ1bmN0aW9uKGZuKSB7XG4gICAgaWYgKGZuLmNvbnN0cnVjdG9yICE9PSBGdW5jdGlvbikge1xuICAgICAgdXRpbC53YXJuKCdUaGUgbG9nIGZ1bmN0aW9uIHlvdSBwYXNzZWQgaW4gaXMgbm90IGEgZnVuY3Rpb24uIERlZmF1bHRpbmcgdG8gcmVndWxhciBsb2dzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB1dGlsLl9wcmludCA9IGZuO1xuICAgIH1cbiAgfSxcblxuICBfcHJpbnRXaXRoOiBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29weSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBjb3B5LnVuc2hpZnQocHJlZml4KTtcbiAgICAgIHV0aWwuX3ByaW50LmFwcGx5KHV0aWwsIGNvcHkpO1xuICAgIH07XG4gIH0sXG4gIF9wcmludDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBlcnIgPSBmYWxzZTtcbiAgICB2YXIgY29weSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgY29weS51bnNoaWZ0KCdQZWVySlM6ICcpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY29weS5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgaWYgKGNvcHlbaV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBjb3B5W2ldID0gJygnICsgY29weVtpXS5uYW1lICsgJykgJyArIGNvcHlbaV0ubWVzc2FnZTtcbiAgICAgICAgZXJyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgZXJyID8gY29uc29sZS5lcnJvci5hcHBseShjb25zb2xlLCBjb3B5KSA6IGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGNvcHkpO1xuICB9LFxuICAvL1xuXG4gIC8vIFJldHVybnMgYnJvd3Nlci1hZ25vc3RpYyBkZWZhdWx0IGNvbmZpZ1xuICBkZWZhdWx0Q29uZmlnOiBkZWZhdWx0Q29uZmlnLFxuICAvL1xuXG4gIC8vIFJldHVybnMgdGhlIGN1cnJlbnQgYnJvd3Nlci5cbiAgYnJvd3NlcjogKGZ1bmN0aW9uKCkge1xuICAgIGlmICh3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAgIHJldHVybiAnRmlyZWZveCc7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAgIHJldHVybiAnQ2hyb21lJztcbiAgICB9IGVsc2UgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgICAgcmV0dXJuICdTdXBwb3J0ZWQnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ1Vuc3VwcG9ydGVkJztcbiAgICB9XG4gIH0pKCksXG4gIC8vXG5cbiAgLy8gTGlzdHMgd2hpY2ggZmVhdHVyZXMgYXJlIHN1cHBvcnRlZFxuICBzdXBwb3J0czogKGZ1bmN0aW9uKCkge1xuICAgIGlmICh0eXBlb2YgUlRDUGVlckNvbm5lY3Rpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdmFyIGRhdGEgPSB0cnVlO1xuICAgIHZhciBhdWRpb1ZpZGVvID0gdHJ1ZTtcblxuICAgIHZhciBiaW5hcnlCbG9iID0gZmFsc2U7XG4gICAgdmFyIHNjdHAgPSBmYWxzZTtcbiAgICB2YXIgb25uZWdvdGlhdGlvbm5lZWRlZCA9ICEhd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuXG4gICAgdmFyIHBjLCBkYztcbiAgICB0cnkge1xuICAgICAgcGMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZGVmYXVsdENvbmZpZywge29wdGlvbmFsOiBbe1J0cERhdGFDaGFubmVsczogdHJ1ZX1dfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZGF0YSA9IGZhbHNlO1xuICAgICAgYXVkaW9WaWRlbyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkYyA9IHBjLmNyZWF0ZURhdGFDaGFubmVsKCdfUEVFUkpTVEVTVCcpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkYXRhID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIC8vIEJpbmFyeSB0ZXN0XG4gICAgICB0cnkge1xuICAgICAgICBkYy5iaW5hcnlUeXBlID0gJ2Jsb2InO1xuICAgICAgICBiaW5hcnlCbG9iID0gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIH1cblxuICAgICAgLy8gUmVsaWFibGUgdGVzdC5cbiAgICAgIC8vIFVuZm9ydHVuYXRlbHkgQ2hyb21lIGlzIGEgYml0IHVucmVsaWFibGUgYWJvdXQgd2hldGhlciBvciBub3QgdGhleVxuICAgICAgLy8gc3VwcG9ydCByZWxpYWJsZS5cbiAgICAgIHZhciByZWxpYWJsZVBDID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGRlZmF1bHRDb25maWcsIHt9KTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZWxpYWJsZURDID0gcmVsaWFibGVQQy5jcmVhdGVEYXRhQ2hhbm5lbCgnX1BFRVJKU1JFTElBQkxFVEVTVCcsIHt9KTtcbiAgICAgICAgc2N0cCA9IHJlbGlhYmxlREMucmVsaWFibGU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICB9XG4gICAgICByZWxpYWJsZVBDLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgLy8gRklYTUU6IG5vdCByZWFsbHkgdGhlIGJlc3QgY2hlY2suLi5cbiAgICBpZiAoYXVkaW9WaWRlbykge1xuICAgICAgYXVkaW9WaWRlbyA9ICEhcGMuYWRkU3RyZWFtO1xuICAgIH1cblxuICAgIC8vIEZJWE1FOiB0aGlzIGlzIG5vdCBncmVhdCBiZWNhdXNlIGluIHRoZW9yeSBpdCBkb2Vzbid0IHdvcmsgZm9yXG4gICAgLy8gYXYtb25seSBicm93c2VycyAoPykuXG4gICAgaWYgKCFvbm5lZ290aWF0aW9ubmVlZGVkICYmIGRhdGEpIHtcbiAgICAgIC8vIHN5bmMgZGVmYXVsdCBjaGVjay5cbiAgICAgIHZhciBuZWdvdGlhdGlvblBDID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGRlZmF1bHRDb25maWcsIHtvcHRpb25hbDogW3tSdHBEYXRhQ2hhbm5lbHM6IHRydWV9XX0pO1xuICAgICAgbmVnb3RpYXRpb25QQy5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG9ubmVnb3RpYXRpb25uZWVkZWQgPSB0cnVlO1xuICAgICAgICAvLyBhc3luYyBjaGVjay5cbiAgICAgICAgaWYgKHV0aWwgJiYgdXRpbC5zdXBwb3J0cykge1xuICAgICAgICAgIHV0aWwuc3VwcG9ydHMub25uZWdvdGlhdGlvbm5lZWRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2YXIgbmVnb3RpYXRpb25EQyA9IG5lZ290aWF0aW9uUEMuY3JlYXRlRGF0YUNoYW5uZWwoJ19QRUVSSlNORUdPVElBVElPTlRFU1QnKTtcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgbmVnb3RpYXRpb25QQy5jbG9zZSgpO1xuICAgICAgfSwgMTAwMCk7XG4gICAgfVxuXG4gICAgaWYgKHBjKSB7XG4gICAgICBwYy5jbG9zZSgpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhdWRpb1ZpZGVvOiBhdWRpb1ZpZGVvLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIGJpbmFyeUJsb2I6IGJpbmFyeUJsb2IsXG4gICAgICBiaW5hcnk6IHNjdHAsIC8vIGRlcHJlY2F0ZWQ7IHNjdHAgaW1wbGllcyBiaW5hcnkgc3VwcG9ydC5cbiAgICAgIHJlbGlhYmxlOiBzY3RwLCAvLyBkZXByZWNhdGVkOyBzY3RwIGltcGxpZXMgcmVsaWFibGUgZGF0YS5cbiAgICAgIHNjdHA6IHNjdHAsXG4gICAgICBvbm5lZ290aWF0aW9ubmVlZGVkOiBvbm5lZ290aWF0aW9ubmVlZGVkXG4gICAgfTtcbiAgfSgpKSxcbiAgLy9cblxuICAvLyBFbnN1cmUgYWxwaGFudW1lcmljIGlkc1xuICB2YWxpZGF0ZUlkOiBmdW5jdGlvbihpZCkge1xuICAgIC8vIEFsbG93IGVtcHR5IGlkc1xuICAgIHJldHVybiAhaWQgfHwgL15bQS1aYS16MC05XSsoPzpbIF8tXVtBLVphLXowLTldKykqJC8uZXhlYyhpZCk7XG4gIH0sXG5cbiAgdmFsaWRhdGVLZXk6IGZ1bmN0aW9uKGtleSkge1xuICAgIC8vIEFsbG93IGVtcHR5IGtleXNcbiAgICByZXR1cm4gIWtleSB8fCAvXltBLVphLXowLTldKyg/OlsgXy1dW0EtWmEtejAtOV0rKSokLy5leGVjKGtleSk7XG4gIH0sXG5cblxuICBkZWJ1ZzogZmFsc2UsXG5cbiAgaW5oZXJpdHM6IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2UpIHtcbiAgICBmb3IodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgIGlmKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzdDtcbiAgfSxcbiAgcGFjazogQmluYXJ5UGFjay5wYWNrLFxuICB1bnBhY2s6IEJpbmFyeVBhY2sudW5wYWNrLFxuXG4gIGxvZzogZnVuY3Rpb24gKCkge1xuICAgIGlmICh1dGlsLmRlYnVnKSB7XG4gICAgICB2YXIgZXJyID0gZmFsc2U7XG4gICAgICB2YXIgY29weSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICBjb3B5LnVuc2hpZnQoJ1BlZXJKUzogJyk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvcHkubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgaWYgKGNvcHlbaV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgIGNvcHlbaV0gPSAnKCcgKyBjb3B5W2ldLm5hbWUgKyAnKSAnICsgY29weVtpXS5tZXNzYWdlO1xuICAgICAgICAgIGVyciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVyciA/IGNvbnNvbGUuZXJyb3IuYXBwbHkoY29uc29sZSwgY29weSkgOiBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBjb3B5KTtcbiAgICB9XG4gIH0sXG5cbiAgc2V0WmVyb1RpbWVvdXQ6IChmdW5jdGlvbihnbG9iYWwpIHtcbiAgICB2YXIgdGltZW91dHMgPSBbXTtcbiAgICB2YXIgbWVzc2FnZU5hbWUgPSAnemVyby10aW1lb3V0LW1lc3NhZ2UnO1xuXG4gICAgLy8gTGlrZSBzZXRUaW1lb3V0LCBidXQgb25seSB0YWtlcyBhIGZ1bmN0aW9uIGFyZ3VtZW50LiAgVGhlcmUnc1xuICAgIC8vIG5vIHRpbWUgYXJndW1lbnQgKGFsd2F5cyB6ZXJvKSBhbmQgbm8gYXJndW1lbnRzICh5b3UgaGF2ZSB0b1xuICAgIC8vIHVzZSBhIGNsb3N1cmUpLlxuICAgIGZ1bmN0aW9uIHNldFplcm9UaW1lb3V0UG9zdE1lc3NhZ2UoZm4pIHtcbiAgICAgIHRpbWVvdXRzLnB1c2goZm4pO1xuICAgICAgZ2xvYmFsLnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZU1lc3NhZ2UoZXZlbnQpIHtcbiAgICAgIGlmIChldmVudC5zb3VyY2UgPT0gZ2xvYmFsICYmIGV2ZW50LmRhdGEgPT0gbWVzc2FnZU5hbWUpIHtcbiAgICAgICAgaWYgKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aW1lb3V0cy5sZW5ndGgpIHtcbiAgICAgICAgICB0aW1lb3V0cy5zaGlmdCgpKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGhhbmRsZU1lc3NhZ2UsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZ2xvYmFsLmF0dGFjaEV2ZW50KSB7XG4gICAgICBnbG9iYWwuYXR0YWNoRXZlbnQoJ29ubWVzc2FnZScsIGhhbmRsZU1lc3NhZ2UpO1xuICAgIH1cbiAgICByZXR1cm4gc2V0WmVyb1RpbWVvdXRQb3N0TWVzc2FnZTtcbiAgfSh0aGlzKSksXG5cbiAgLy8gQmluYXJ5IHN0dWZmXG5cbiAgLy8gY2h1bmtzIGEgYmxvYi5cbiAgY2h1bms6IGZ1bmN0aW9uKGJsKSB7XG4gICAgdmFyIGNodW5rcyA9IFtdO1xuICAgIHZhciBzaXplID0gYmwuc2l6ZTtcbiAgICB2YXIgc3RhcnQgPSBpbmRleCA9IDA7XG4gICAgdmFyIHRvdGFsID0gTWF0aC5jZWlsKHNpemUgLyB1dGlsLmNodW5rZWRNVFUpO1xuICAgIHdoaWxlIChzdGFydCA8IHNpemUpIHtcbiAgICAgIHZhciBlbmQgPSBNYXRoLm1pbihzaXplLCBzdGFydCArIHV0aWwuY2h1bmtlZE1UVSk7XG4gICAgICB2YXIgYiA9IGJsLnNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgICB2YXIgY2h1bmsgPSB7XG4gICAgICAgIF9fcGVlckRhdGE6IGRhdGFDb3VudCxcbiAgICAgICAgbjogaW5kZXgsXG4gICAgICAgIGRhdGE6IGIsXG4gICAgICAgIHRvdGFsOiB0b3RhbFxuICAgICAgfTtcblxuICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuXG4gICAgICBzdGFydCA9IGVuZDtcbiAgICAgIGluZGV4ICs9IDE7XG4gICAgfVxuICAgIGRhdGFDb3VudCArPSAxO1xuICAgIHJldHVybiBjaHVua3M7XG4gIH0sXG5cbiAgYmxvYlRvQXJyYXlCdWZmZXI6IGZ1bmN0aW9uKGJsb2IsIGNiKXtcbiAgICB2YXIgZnIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIGZyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgY2IoZXZ0LnRhcmdldC5yZXN1bHQpO1xuICAgIH07XG4gICAgZnIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYik7XG4gIH0sXG4gIGJsb2JUb0JpbmFyeVN0cmluZzogZnVuY3Rpb24oYmxvYiwgY2Ipe1xuICAgIHZhciBmciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgZnIub25sb2FkID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBjYihldnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgfTtcbiAgICBmci5yZWFkQXNCaW5hcnlTdHJpbmcoYmxvYik7XG4gIH0sXG4gIGJpbmFyeVN0cmluZ1RvQXJyYXlCdWZmZXI6IGZ1bmN0aW9uKGJpbmFyeSkge1xuICAgIHZhciBieXRlQXJyYXkgPSBuZXcgVWludDhBcnJheShiaW5hcnkubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJpbmFyeS5sZW5ndGg7IGkrKykge1xuICAgICAgYnl0ZUFycmF5W2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSkgJiAweGZmO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZUFycmF5LmJ1ZmZlcjtcbiAgfSxcbiAgcmFuZG9tVG9rZW46IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIpO1xuICB9LFxuICAvL1xuXG4gIGlzU2VjdXJlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonO1xuICB9XG59O1xuXG5leHBvcnRzLnV0aWwgPSB1dGlsO1xuLyoqXG4gKiBBIHBlZXIgd2hvIGNhbiBpbml0aWF0ZSBjb25uZWN0aW9ucyB3aXRoIG90aGVyIHBlZXJzLlxuICovXG5mdW5jdGlvbiBQZWVyKGlkLCBvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQZWVyKSkgcmV0dXJuIG5ldyBQZWVyKGlkLCBvcHRpb25zKTtcbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgLy8gRGVhbCB3aXRoIG92ZXJsb2FkaW5nXG4gIGlmIChpZCAmJiBpZC5jb25zdHJ1Y3RvciA9PSBPYmplY3QpIHtcbiAgICBvcHRpb25zID0gaWQ7XG4gICAgaWQgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoaWQpIHtcbiAgICAvLyBFbnN1cmUgaWQgaXMgYSBzdHJpbmdcbiAgICBpZCA9IGlkLnRvU3RyaW5nKCk7XG4gIH1cbiAgLy9cblxuICAvLyBDb25maWd1cml6ZSBvcHRpb25zXG4gIG9wdGlvbnMgPSB1dGlsLmV4dGVuZCh7XG4gICAgZGVidWc6IDAsIC8vIDE6IEVycm9ycywgMjogV2FybmluZ3MsIDM6IEFsbCBsb2dzXG4gICAgaG9zdDogdXRpbC5DTE9VRF9IT1NULFxuICAgIHBvcnQ6IHV0aWwuQ0xPVURfUE9SVCxcbiAgICBrZXk6ICdwZWVyanMnLFxuICAgIHBhdGg6ICcvJyxcbiAgICB0b2tlbjogdXRpbC5yYW5kb21Ub2tlbigpLFxuICAgIGNvbmZpZzogdXRpbC5kZWZhdWx0Q29uZmlnXG4gIH0sIG9wdGlvbnMpO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAvLyBEZXRlY3QgcmVsYXRpdmUgVVJMIGhvc3QuXG4gIGlmIChvcHRpb25zLmhvc3QgPT09ICcvJykge1xuICAgIG9wdGlvbnMuaG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZTtcbiAgfVxuICAvLyBTZXQgcGF0aCBjb3JyZWN0bHkuXG4gIGlmIChvcHRpb25zLnBhdGhbMF0gIT09ICcvJykge1xuICAgIG9wdGlvbnMucGF0aCA9ICcvJyArIG9wdGlvbnMucGF0aDtcbiAgfVxuICBpZiAob3B0aW9ucy5wYXRoW29wdGlvbnMucGF0aC5sZW5ndGggLSAxXSAhPT0gJy8nKSB7XG4gICAgb3B0aW9ucy5wYXRoICs9ICcvJztcbiAgfVxuXG4gIC8vIFNldCB3aGV0aGVyIHdlIHVzZSBTU0wgdG8gc2FtZSBhcyBjdXJyZW50IGhvc3RcbiAgaWYgKG9wdGlvbnMuc2VjdXJlID09PSB1bmRlZmluZWQgJiYgb3B0aW9ucy5ob3N0ICE9PSB1dGlsLkNMT1VEX0hPU1QpIHtcbiAgICBvcHRpb25zLnNlY3VyZSA9IHV0aWwuaXNTZWN1cmUoKTtcbiAgfVxuICAvLyBTZXQgYSBjdXN0b20gbG9nIGZ1bmN0aW9uIGlmIHByZXNlbnRcbiAgaWYgKG9wdGlvbnMubG9nRnVuY3Rpb24pIHtcbiAgICB1dGlsLnNldExvZ0Z1bmN0aW9uKG9wdGlvbnMubG9nRnVuY3Rpb24pO1xuICB9XG4gIHV0aWwuc2V0TG9nTGV2ZWwob3B0aW9ucy5kZWJ1Zyk7XG4gIC8vXG5cbiAgLy8gU2FuaXR5IGNoZWNrc1xuICAvLyBFbnN1cmUgV2ViUlRDIHN1cHBvcnRlZFxuICBpZiAoIXV0aWwuc3VwcG9ydHMuYXVkaW9WaWRlbyAmJiAhdXRpbC5zdXBwb3J0cy5kYXRhICkge1xuICAgIHRoaXMuX2RlbGF5ZWRBYm9ydCgnYnJvd3Nlci1pbmNvbXBhdGlibGUnLCAnVGhlIGN1cnJlbnQgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFdlYlJUQycpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBFbnN1cmUgYWxwaGFudW1lcmljIGlkXG4gIGlmICghdXRpbC52YWxpZGF0ZUlkKGlkKSkge1xuICAgIHRoaXMuX2RlbGF5ZWRBYm9ydCgnaW52YWxpZC1pZCcsICdJRCBcIicgKyBpZCArICdcIiBpcyBpbnZhbGlkJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIEVuc3VyZSB2YWxpZCBrZXlcbiAgaWYgKCF1dGlsLnZhbGlkYXRlS2V5KG9wdGlvbnMua2V5KSkge1xuICAgIHRoaXMuX2RlbGF5ZWRBYm9ydCgnaW52YWxpZC1rZXknLCAnQVBJIEtFWSBcIicgKyBvcHRpb25zLmtleSArICdcIiBpcyBpbnZhbGlkJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIEVuc3VyZSBub3QgdXNpbmcgdW5zZWN1cmUgY2xvdWQgc2VydmVyIG9uIFNTTCBwYWdlXG4gIGlmIChvcHRpb25zLnNlY3VyZSAmJiBvcHRpb25zLmhvc3QgPT09ICcwLnBlZXJqcy5jb20nKSB7XG4gICAgdGhpcy5fZGVsYXllZEFib3J0KCdzc2wtdW5hdmFpbGFibGUnLFxuICAgICAgJ1RoZSBjbG91ZCBzZXJ2ZXIgY3VycmVudGx5IGRvZXMgbm90IHN1cHBvcnQgSFRUUFMuIFBsZWFzZSBydW4geW91ciBvd24gUGVlclNlcnZlciB0byB1c2UgSFRUUFMuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vXG5cbiAgLy8gU3RhdGVzLlxuICB0aGlzLmRlc3Ryb3llZCA9IGZhbHNlOyAvLyBDb25uZWN0aW9ucyBoYXZlIGJlZW4ga2lsbGVkXG4gIHRoaXMuZGlzY29ubmVjdGVkID0gZmFsc2U7IC8vIENvbm5lY3Rpb24gdG8gUGVlclNlcnZlciBraWxsZWQgYnV0IFAyUCBjb25uZWN0aW9ucyBzdGlsbCBhY3RpdmVcbiAgdGhpcy5vcGVuID0gZmFsc2U7IC8vIFNvY2tldHMgYW5kIHN1Y2ggYXJlIG5vdCB5ZXQgb3Blbi5cbiAgLy9cblxuICAvLyBSZWZlcmVuY2VzXG4gIHRoaXMuY29ubmVjdGlvbnMgPSB7fTsgLy8gRGF0YUNvbm5lY3Rpb25zIGZvciB0aGlzIHBlZXIuXG4gIHRoaXMuX2xvc3RNZXNzYWdlcyA9IHt9OyAvLyBzcmMgPT4gW2xpc3Qgb2YgbWVzc2FnZXNdXG4gIC8vXG5cbiAgLy8gU3RhcnQgdGhlIHNlcnZlciBjb25uZWN0aW9uXG4gIHRoaXMuX2luaXRpYWxpemVTZXJ2ZXJDb25uZWN0aW9uKCk7XG4gIGlmIChpZCkge1xuICAgIHRoaXMuX2luaXRpYWxpemUoaWQpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuX3JldHJpZXZlSWQoKTtcbiAgfVxuICAvL1xufTtcblxudXRpbC5pbmhlcml0cyhQZWVyLCBFdmVudEVtaXR0ZXIpO1xuXG4vLyBJbml0aWFsaXplIHRoZSAnc29ja2V0JyAod2hpY2ggaXMgYWN0dWFsbHkgYSBtaXggb2YgWEhSIHN0cmVhbWluZyBhbmRcbi8vIHdlYnNvY2tldHMuKVxuUGVlci5wcm90b3R5cGUuX2luaXRpYWxpemVTZXJ2ZXJDb25uZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5zb2NrZXQgPSBuZXcgU29ja2V0KHRoaXMub3B0aW9ucy5zZWN1cmUsIHRoaXMub3B0aW9ucy5ob3N0LCB0aGlzLm9wdGlvbnMucG9ydCwgdGhpcy5vcHRpb25zLnBhdGgsIHRoaXMub3B0aW9ucy5rZXkpO1xuICB0aGlzLnNvY2tldC5vbignbWVzc2FnZScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBzZWxmLl9oYW5kbGVNZXNzYWdlKGRhdGEpO1xuICB9KTtcbiAgdGhpcy5zb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICBzZWxmLl9hYm9ydCgnc29ja2V0LWVycm9yJywgZXJyb3IpO1xuICB9KTtcbiAgdGhpcy5zb2NrZXQub24oJ2Rpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKCkge1xuICAgIC8vIElmIHdlIGhhdmVuJ3QgZXhwbGljaXRseSBkaXNjb25uZWN0ZWQsIGVtaXQgZXJyb3IgYW5kIGRpc2Nvbm5lY3QuXG4gICAgaWYgKCFzZWxmLmRpc2Nvbm5lY3RlZCkge1xuICAgICAgc2VsZi5lbWl0RXJyb3IoJ25ldHdvcmsnLCAnTG9zdCBjb25uZWN0aW9uIHRvIHNlcnZlci4nKVxuICAgICAgc2VsZi5kaXNjb25uZWN0KCk7XG4gICAgfVxuICB9KTtcbiAgdGhpcy5zb2NrZXQub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgd2UgaGF2ZW4ndCBleHBsaWNpdGx5IGRpc2Nvbm5lY3RlZCwgZW1pdCBlcnJvci5cbiAgICBpZiAoIXNlbGYuZGlzY29ubmVjdGVkKSB7XG4gICAgICBzZWxmLl9hYm9ydCgnc29ja2V0LWNsb3NlZCcsICdVbmRlcmx5aW5nIHNvY2tldCBpcyBhbHJlYWR5IGNsb3NlZC4nKTtcbiAgICB9XG4gIH0pO1xufTtcblxuLyoqIEdldCBhIHVuaXF1ZSBJRCBmcm9tIHRoZSBzZXJ2ZXIgdmlhIFhIUi4gKi9cblBlZXIucHJvdG90eXBlLl9yZXRyaWV2ZUlkID0gZnVuY3Rpb24oY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgaHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB2YXIgcHJvdG9jb2wgPSB0aGlzLm9wdGlvbnMuc2VjdXJlID8gJ2h0dHBzOi8vJyA6ICdodHRwOi8vJztcbiAgdmFyIHVybCA9IHByb3RvY29sICsgdGhpcy5vcHRpb25zLmhvc3QgKyAnOicgKyB0aGlzLm9wdGlvbnMucG9ydFxuICAgICsgdGhpcy5vcHRpb25zLnBhdGggKyB0aGlzLm9wdGlvbnMua2V5ICsgJy9pZCc7XG4gIHZhciBxdWVyeVN0cmluZyA9ICc/dHM9JyArIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJycgKyBNYXRoLnJhbmRvbSgpO1xuICB1cmwgKz0gcXVlcnlTdHJpbmc7XG5cbiAgLy8gSWYgdGhlcmUncyBubyBJRCB3ZSBuZWVkIHRvIHdhaXQgZm9yIG9uZSBiZWZvcmUgdHJ5aW5nIHRvIGluaXQgc29ja2V0LlxuICBodHRwLm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gIGh0dHAub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICB1dGlsLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIElEJywgZSk7XG4gICAgdmFyIHBhdGhFcnJvciA9ICcnO1xuICAgIGlmIChzZWxmLm9wdGlvbnMucGF0aCA9PT0gJy8nICYmIHNlbGYub3B0aW9ucy5ob3N0ICE9PSB1dGlsLkNMT1VEX0hPU1QpIHtcbiAgICAgIHBhdGhFcnJvciA9ICcgSWYgeW91IHBhc3NlZCBpbiBhIGBwYXRoYCB0byB5b3VyIHNlbGYtaG9zdGVkIFBlZXJTZXJ2ZXIsICdcbiAgICAgICAgKyAneW91XFwnbGwgYWxzbyBuZWVkIHRvIHBhc3MgaW4gdGhhdCBzYW1lIHBhdGggd2hlbiBjcmVhdGluZyBhIG5ldydcbiAgICAgICAgKyAnIFBlZXIuJztcbiAgICB9XG4gICAgc2VsZi5fYWJvcnQoJ3NlcnZlci1lcnJvcicsICdDb3VsZCBub3QgZ2V0IGFuIElEIGZyb20gdGhlIHNlcnZlci4nICsgcGF0aEVycm9yKTtcbiAgfVxuICBodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChodHRwLnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGh0dHAuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgIGh0dHAub25lcnJvcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZWxmLl9pbml0aWFsaXplKGh0dHAucmVzcG9uc2VUZXh0KTtcbiAgfTtcbiAgaHR0cC5zZW5kKG51bGwpO1xufTtcblxuLyoqIEluaXRpYWxpemUgYSBjb25uZWN0aW9uIHdpdGggdGhlIHNlcnZlci4gKi9cblBlZXIucHJvdG90eXBlLl9pbml0aWFsaXplID0gZnVuY3Rpb24oaWQpIHtcbiAgdGhpcy5pZCA9IGlkO1xuICB0aGlzLnNvY2tldC5zdGFydCh0aGlzLmlkLCB0aGlzLm9wdGlvbnMudG9rZW4pO1xufVxuXG4vKiogSGFuZGxlcyBtZXNzYWdlcyBmcm9tIHRoZSBzZXJ2ZXIuICovXG5QZWVyLnByb3RvdHlwZS5faGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHR5cGUgPSBtZXNzYWdlLnR5cGU7XG4gIHZhciBwYXlsb2FkID0gbWVzc2FnZS5wYXlsb2FkO1xuICB2YXIgcGVlciA9IG1lc3NhZ2Uuc3JjO1xuXG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ09QRU4nOiAvLyBUaGUgY29ubmVjdGlvbiB0byB0aGUgc2VydmVyIGlzIG9wZW4uXG4gICAgICB0aGlzLmVtaXQoJ29wZW4nLCB0aGlzLmlkKTtcbiAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdFUlJPUic6IC8vIFNlcnZlciBlcnJvci5cbiAgICAgIHRoaXMuX2Fib3J0KCdzZXJ2ZXItZXJyb3InLCBwYXlsb2FkLm1zZyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdJRC1UQUtFTic6IC8vIFRoZSBzZWxlY3RlZCBJRCBpcyB0YWtlbi5cbiAgICAgIHRoaXMuX2Fib3J0KCd1bmF2YWlsYWJsZS1pZCcsICdJRCBgJyArIHRoaXMuaWQgKyAnYCBpcyB0YWtlbicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnSU5WQUxJRC1LRVknOiAvLyBUaGUgZ2l2ZW4gQVBJIGtleSBjYW5ub3QgYmUgZm91bmQuXG4gICAgICB0aGlzLl9hYm9ydCgnaW52YWxpZC1rZXknLCAnQVBJIEtFWSBcIicgKyB0aGlzLm9wdGlvbnMua2V5ICsgJ1wiIGlzIGludmFsaWQnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgLy9cbiAgICBjYXNlICdMRUFWRSc6IC8vIEFub3RoZXIgcGVlciBoYXMgY2xvc2VkIGl0cyBjb25uZWN0aW9uIHRvIHRoaXMgcGVlci5cbiAgICAgIHV0aWwubG9nKCdSZWNlaXZlZCBsZWF2ZSBtZXNzYWdlIGZyb20nLCBwZWVyKTtcbiAgICAgIHRoaXMuX2NsZWFudXBQZWVyKHBlZXIpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdFWFBJUkUnOiAvLyBUaGUgb2ZmZXIgc2VudCB0byBhIHBlZXIgaGFzIGV4cGlyZWQgd2l0aG91dCByZXNwb25zZS5cbiAgICAgIHRoaXMuZW1pdEVycm9yKCdwZWVyLXVuYXZhaWxhYmxlJywgJ0NvdWxkIG5vdCBjb25uZWN0IHRvIHBlZXIgJyArIHBlZXIpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnT0ZGRVInOiAvLyB3ZSBzaG91bGQgY29uc2lkZXIgc3dpdGNoaW5nIHRoaXMgdG8gQ0FMTC9DT05ORUNULCBidXQgdGhpcyBpcyB0aGUgbGVhc3QgYnJlYWtpbmcgb3B0aW9uLlxuICAgICAgdmFyIGNvbm5lY3Rpb25JZCA9IHBheWxvYWQuY29ubmVjdGlvbklkO1xuICAgICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLmdldENvbm5lY3Rpb24ocGVlciwgY29ubmVjdGlvbklkKTtcblxuICAgICAgaWYgKGNvbm5lY3Rpb24pIHtcbiAgICAgICAgdXRpbC53YXJuKCdPZmZlciByZWNlaXZlZCBmb3IgZXhpc3RpbmcgQ29ubmVjdGlvbiBJRDonLCBjb25uZWN0aW9uSWQpO1xuICAgICAgICAvL2Nvbm5lY3Rpb24uaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBjb25uZWN0aW9uLlxuICAgICAgICBpZiAocGF5bG9hZC50eXBlID09PSAnbWVkaWEnKSB7XG4gICAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgTWVkaWFDb25uZWN0aW9uKHBlZXIsIHRoaXMsIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbklkLFxuICAgICAgICAgICAgX3BheWxvYWQ6IHBheWxvYWQsXG4gICAgICAgICAgICBtZXRhZGF0YTogcGF5bG9hZC5tZXRhZGF0YVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuX2FkZENvbm5lY3Rpb24ocGVlciwgY29ubmVjdGlvbik7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjYWxsJywgY29ubmVjdGlvbik7XG4gICAgICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSAnZGF0YScpIHtcbiAgICAgICAgICBjb25uZWN0aW9uID0gbmV3IERhdGFDb25uZWN0aW9uKHBlZXIsIHRoaXMsIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbklkLFxuICAgICAgICAgICAgX3BheWxvYWQ6IHBheWxvYWQsXG4gICAgICAgICAgICBtZXRhZGF0YTogcGF5bG9hZC5tZXRhZGF0YSxcbiAgICAgICAgICAgIGxhYmVsOiBwYXlsb2FkLmxhYmVsLFxuICAgICAgICAgICAgc2VyaWFsaXphdGlvbjogcGF5bG9hZC5zZXJpYWxpemF0aW9uLFxuICAgICAgICAgICAgcmVsaWFibGU6IHBheWxvYWQucmVsaWFibGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLl9hZGRDb25uZWN0aW9uKHBlZXIsIGNvbm5lY3Rpb24pO1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHV0aWwud2FybignUmVjZWl2ZWQgbWFsZm9ybWVkIGNvbm5lY3Rpb24gdHlwZTonLCBwYXlsb2FkLnR5cGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBGaW5kIG1lc3NhZ2VzLlxuICAgICAgICB2YXIgbWVzc2FnZXMgPSB0aGlzLl9nZXRNZXNzYWdlcyhjb25uZWN0aW9uSWQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBtZXNzYWdlcy5sZW5ndGg7IGkgPCBpaTsgaSArPSAxKSB7XG4gICAgICAgICAgY29ubmVjdGlvbi5oYW5kbGVNZXNzYWdlKG1lc3NhZ2VzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmICghcGF5bG9hZCkge1xuICAgICAgICB1dGlsLndhcm4oJ1lvdSByZWNlaXZlZCBhIG1hbGZvcm1lZCBtZXNzYWdlIGZyb20gJyArIHBlZXIgKyAnIG9mIHR5cGUgJyArIHR5cGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBpZCA9IHBheWxvYWQuY29ubmVjdGlvbklkO1xuICAgICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLmdldENvbm5lY3Rpb24ocGVlciwgaWQpO1xuXG4gICAgICBpZiAoY29ubmVjdGlvbiAmJiBjb25uZWN0aW9uLnBjKSB7XG4gICAgICAgIC8vIFBhc3MgaXQgb24uXG4gICAgICAgIGNvbm5lY3Rpb24uaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgIH0gZWxzZSBpZiAoaWQpIHtcbiAgICAgICAgLy8gU3RvcmUgZm9yIHBvc3NpYmxlIGxhdGVyIHVzZVxuICAgICAgICB0aGlzLl9zdG9yZU1lc3NhZ2UoaWQsIG1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXRpbC53YXJuKCdZb3UgcmVjZWl2ZWQgYW4gdW5yZWNvZ25pemVkIG1lc3NhZ2U6JywgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgfVxufVxuXG4vKiogU3RvcmVzIG1lc3NhZ2VzIHdpdGhvdXQgYSBzZXQgdXAgY29ubmVjdGlvbiwgdG8gYmUgY2xhaW1lZCBsYXRlci4gKi9cblBlZXIucHJvdG90eXBlLl9zdG9yZU1lc3NhZ2UgPSBmdW5jdGlvbihjb25uZWN0aW9uSWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0aGlzLl9sb3N0TWVzc2FnZXNbY29ubmVjdGlvbklkXSkge1xuICAgIHRoaXMuX2xvc3RNZXNzYWdlc1tjb25uZWN0aW9uSWRdID0gW107XG4gIH1cbiAgdGhpcy5fbG9zdE1lc3NhZ2VzW2Nvbm5lY3Rpb25JZF0ucHVzaChtZXNzYWdlKTtcbn1cblxuLyoqIFJldHJpZXZlIG1lc3NhZ2VzIGZyb20gbG9zdCBtZXNzYWdlIHN0b3JlICovXG5QZWVyLnByb3RvdHlwZS5fZ2V0TWVzc2FnZXMgPSBmdW5jdGlvbihjb25uZWN0aW9uSWQpIHtcbiAgdmFyIG1lc3NhZ2VzID0gdGhpcy5fbG9zdE1lc3NhZ2VzW2Nvbm5lY3Rpb25JZF07XG4gIGlmIChtZXNzYWdlcykge1xuICAgIGRlbGV0ZSB0aGlzLl9sb3N0TWVzc2FnZXNbY29ubmVjdGlvbklkXTtcbiAgICByZXR1cm4gbWVzc2FnZXM7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIERhdGFDb25uZWN0aW9uIHRvIHRoZSBzcGVjaWZpZWQgcGVlci4gU2VlIGRvY3VtZW50YXRpb24gZm9yIGFcbiAqIGNvbXBsZXRlIGxpc3Qgb2Ygb3B0aW9ucy5cbiAqL1xuUGVlci5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKHBlZXIsIG9wdGlvbnMpIHtcbiAgaWYgKHRoaXMuZGlzY29ubmVjdGVkKSB7XG4gICAgdXRpbC53YXJuKCdZb3UgY2Fubm90IGNvbm5lY3QgdG8gYSBuZXcgUGVlciBiZWNhdXNlIHlvdSBjYWxsZWQgJ1xuICAgICAgICArICcuZGlzY29ubmVjdCgpIG9uIHRoaXMgUGVlciBhbmQgZW5kZWQgeW91ciBjb25uZWN0aW9uIHdpdGggdGhlJ1xuICAgICAgICArICcgc2VydmVyLiBZb3UgY2FuIGNyZWF0ZSBhIG5ldyBQZWVyIHRvIHJlY29ubmVjdCwgb3IgY2FsbCByZWNvbm5lY3QnXG4gICAgICAgICsgJyBvbiB0aGlzIHBlZXIgaWYgeW91IGJlbGlldmUgaXRzIElEIHRvIHN0aWxsIGJlIGF2YWlsYWJsZS4nKTtcbiAgICB0aGlzLmVtaXRFcnJvcignZGlzY29ubmVjdGVkJywgJ0Nhbm5vdCBjb25uZWN0IHRvIG5ldyBQZWVyIGFmdGVyIGRpc2Nvbm5lY3RpbmcgZnJvbSBzZXJ2ZXIuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBjb25uZWN0aW9uID0gbmV3IERhdGFDb25uZWN0aW9uKHBlZXIsIHRoaXMsIG9wdGlvbnMpO1xuICB0aGlzLl9hZGRDb25uZWN0aW9uKHBlZXIsIGNvbm5lY3Rpb24pO1xuICByZXR1cm4gY29ubmVjdGlvbjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgTWVkaWFDb25uZWN0aW9uIHRvIHRoZSBzcGVjaWZpZWQgcGVlci4gU2VlIGRvY3VtZW50YXRpb24gZm9yIGFcbiAqIGNvbXBsZXRlIGxpc3Qgb2Ygb3B0aW9ucy5cbiAqL1xuUGVlci5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uKHBlZXIsIHN0cmVhbSwgb3B0aW9ucykge1xuICBpZiAodGhpcy5kaXNjb25uZWN0ZWQpIHtcbiAgICB1dGlsLndhcm4oJ1lvdSBjYW5ub3QgY29ubmVjdCB0byBhIG5ldyBQZWVyIGJlY2F1c2UgeW91IGNhbGxlZCAnXG4gICAgICAgICsgJy5kaXNjb25uZWN0KCkgb24gdGhpcyBQZWVyIGFuZCBlbmRlZCB5b3VyIGNvbm5lY3Rpb24gd2l0aCB0aGUnXG4gICAgICAgICsgJyBzZXJ2ZXIuIFlvdSBjYW4gY3JlYXRlIGEgbmV3IFBlZXIgdG8gcmVjb25uZWN0LicpO1xuICAgIHRoaXMuZW1pdEVycm9yKCdkaXNjb25uZWN0ZWQnLCAnQ2Fubm90IGNvbm5lY3QgdG8gbmV3IFBlZXIgYWZ0ZXIgZGlzY29ubmVjdGluZyBmcm9tIHNlcnZlci4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFzdHJlYW0pIHtcbiAgICB1dGlsLmVycm9yKCdUbyBjYWxsIGEgcGVlciwgeW91IG11c3QgcHJvdmlkZSBhIHN0cmVhbSBmcm9tIHlvdXIgYnJvd3NlclxcJ3MgYGdldFVzZXJNZWRpYWAuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLl9zdHJlYW0gPSBzdHJlYW07XG4gIHZhciBjYWxsID0gbmV3IE1lZGlhQ29ubmVjdGlvbihwZWVyLCB0aGlzLCBvcHRpb25zKTtcbiAgdGhpcy5fYWRkQ29ubmVjdGlvbihwZWVyLCBjYWxsKTtcbiAgcmV0dXJuIGNhbGw7XG59XG5cbi8qKiBBZGQgYSBkYXRhL21lZGlhIGNvbm5lY3Rpb24gdG8gdGhpcyBwZWVyLiAqL1xuUGVlci5wcm90b3R5cGUuX2FkZENvbm5lY3Rpb24gPSBmdW5jdGlvbihwZWVyLCBjb25uZWN0aW9uKSB7XG4gIGlmICghdGhpcy5jb25uZWN0aW9uc1twZWVyXSkge1xuICAgIHRoaXMuY29ubmVjdGlvbnNbcGVlcl0gPSBbXTtcbiAgfVxuICB0aGlzLmNvbm5lY3Rpb25zW3BlZXJdLnB1c2goY29ubmVjdGlvbik7XG59XG5cbi8qKiBSZXRyaWV2ZSBhIGRhdGEvbWVkaWEgY29ubmVjdGlvbiBmb3IgdGhpcyBwZWVyLiAqL1xuUGVlci5wcm90b3R5cGUuZ2V0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uKHBlZXIsIGlkKSB7XG4gIHZhciBjb25uZWN0aW9ucyA9IHRoaXMuY29ubmVjdGlvbnNbcGVlcl07XG4gIGlmICghY29ubmVjdGlvbnMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBmb3IgKHZhciBpID0gMCwgaWkgPSBjb25uZWN0aW9ucy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgaWYgKGNvbm5lY3Rpb25zW2ldLmlkID09PSBpZCkge1xuICAgICAgcmV0dXJuIGNvbm5lY3Rpb25zW2ldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuUGVlci5wcm90b3R5cGUuX2RlbGF5ZWRBYm9ydCA9IGZ1bmN0aW9uKHR5cGUsIG1lc3NhZ2UpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB1dGlsLnNldFplcm9UaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5fYWJvcnQodHlwZSwgbWVzc2FnZSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIERlc3Ryb3lzIHRoZSBQZWVyIGFuZCBlbWl0cyBhbiBlcnJvciBtZXNzYWdlLlxuICogVGhlIFBlZXIgaXMgbm90IGRlc3Ryb3llZCBpZiBpdCdzIGluIGEgZGlzY29ubmVjdGVkIHN0YXRlLCBpbiB3aGljaCBjYXNlXG4gKiBpdCByZXRhaW5zIGl0cyBkaXNjb25uZWN0ZWQgc3RhdGUgYW5kIGl0cyBleGlzdGluZyBjb25uZWN0aW9ucy5cbiAqL1xuUGVlci5wcm90b3R5cGUuX2Fib3J0ID0gZnVuY3Rpb24odHlwZSwgbWVzc2FnZSkge1xuICB1dGlsLmVycm9yKCdBYm9ydGluZyEnKTtcbiAgaWYgKCF0aGlzLl9sYXN0U2VydmVySWQpIHtcbiAgICB0aGlzLmRlc3Ryb3koKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgfVxuICB0aGlzLmVtaXRFcnJvcih0eXBlLCBtZXNzYWdlKTtcbn07XG5cbi8qKiBFbWl0cyBhIHR5cGVkIGVycm9yIG1lc3NhZ2UuICovXG5QZWVyLnByb3RvdHlwZS5lbWl0RXJyb3IgPSBmdW5jdGlvbih0eXBlLCBlcnIpIHtcbiAgdXRpbC5lcnJvcignRXJyb3I6JywgZXJyKTtcbiAgaWYgKHR5cGVvZiBlcnIgPT09ICdzdHJpbmcnKSB7XG4gICAgZXJyID0gbmV3IEVycm9yKGVycik7XG4gIH1cbiAgZXJyLnR5cGUgPSB0eXBlO1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbn07XG5cbi8qKlxuICogRGVzdHJveXMgdGhlIFBlZXI6IGNsb3NlcyBhbGwgYWN0aXZlIGNvbm5lY3Rpb25zIGFzIHdlbGwgYXMgdGhlIGNvbm5lY3Rpb25cbiAqICB0byB0aGUgc2VydmVyLlxuICogV2FybmluZzogVGhlIHBlZXIgY2FuIG5vIGxvbmdlciBjcmVhdGUgb3IgYWNjZXB0IGNvbm5lY3Rpb25zIGFmdGVyIGJlaW5nXG4gKiAgZGVzdHJveWVkLlxuICovXG5QZWVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5kZXN0cm95ZWQpIHtcbiAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICB9XG59XG5cblxuLyoqIERpc2Nvbm5lY3RzIGV2ZXJ5IGNvbm5lY3Rpb24gb24gdGhpcyBwZWVyLiAqL1xuUGVlci5wcm90b3R5cGUuX2NsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY29ubmVjdGlvbnMpIHtcbiAgICB2YXIgcGVlcnMgPSBPYmplY3Qua2V5cyh0aGlzLmNvbm5lY3Rpb25zKTtcbiAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBwZWVycy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICB0aGlzLl9jbGVhbnVwUGVlcihwZWVyc1tpXSk7XG4gICAgfVxuICB9XG4gIHRoaXMuZW1pdCgnY2xvc2UnKTtcbn1cblxuLyoqIENsb3NlcyBhbGwgY29ubmVjdGlvbnMgdG8gdGhpcyBwZWVyLiAqL1xuUGVlci5wcm90b3R5cGUuX2NsZWFudXBQZWVyID0gZnVuY3Rpb24ocGVlcikge1xuICB2YXIgY29ubmVjdGlvbnMgPSB0aGlzLmNvbm5lY3Rpb25zW3BlZXJdO1xuICBmb3IgKHZhciBqID0gMCwgamogPSBjb25uZWN0aW9ucy5sZW5ndGg7IGogPCBqajsgaiArPSAxKSB7XG4gICAgY29ubmVjdGlvbnNbal0uY2xvc2UoKTtcbiAgfVxufVxuXG4vKipcbiAqIERpc2Nvbm5lY3RzIHRoZSBQZWVyJ3MgY29ubmVjdGlvbiB0byB0aGUgUGVlclNlcnZlci4gRG9lcyBub3QgY2xvc2UgYW55XG4gKiAgYWN0aXZlIGNvbm5lY3Rpb25zLlxuICogV2FybmluZzogVGhlIHBlZXIgY2FuIG5vIGxvbmdlciBjcmVhdGUgb3IgYWNjZXB0IGNvbm5lY3Rpb25zIGFmdGVyIGJlaW5nXG4gKiAgZGlzY29ubmVjdGVkLiBJdCBhbHNvIGNhbm5vdCByZWNvbm5lY3QgdG8gdGhlIHNlcnZlci5cbiAqL1xuUGVlci5wcm90b3R5cGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHV0aWwuc2V0WmVyb1RpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICBpZiAoIXNlbGYuZGlzY29ubmVjdGVkKSB7XG4gICAgICBzZWxmLmRpc2Nvbm5lY3RlZCA9IHRydWU7XG4gICAgICBzZWxmLm9wZW4gPSBmYWxzZTtcbiAgICAgIGlmIChzZWxmLnNvY2tldCkge1xuICAgICAgICBzZWxmLnNvY2tldC5jbG9zZSgpO1xuICAgICAgfVxuICAgICAgc2VsZi5lbWl0KCdkaXNjb25uZWN0ZWQnLCBzZWxmLmlkKTtcbiAgICAgIHNlbGYuX2xhc3RTZXJ2ZXJJZCA9IHNlbGYuaWQ7XG4gICAgICBzZWxmLmlkID0gbnVsbDtcbiAgICB9XG4gIH0pO1xufVxuXG4vKiogQXR0ZW1wdHMgdG8gcmVjb25uZWN0IHdpdGggdGhlIHNhbWUgSUQuICovXG5QZWVyLnByb3RvdHlwZS5yZWNvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGlzY29ubmVjdGVkICYmICF0aGlzLmRlc3Ryb3llZCkge1xuICAgIHV0aWwubG9nKCdBdHRlbXB0aW5nIHJlY29ubmVjdGlvbiB0byBzZXJ2ZXIgd2l0aCBJRCAnICsgdGhpcy5fbGFzdFNlcnZlcklkKTtcbiAgICB0aGlzLmRpc2Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXRpYWxpemVTZXJ2ZXJDb25uZWN0aW9uKCk7XG4gICAgdGhpcy5faW5pdGlhbGl6ZSh0aGlzLl9sYXN0U2VydmVySWQpO1xuICB9IGVsc2UgaWYgKHRoaXMuZGVzdHJveWVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIHBlZXIgY2Fubm90IHJlY29ubmVjdCB0byB0aGUgc2VydmVyLiBJdCBoYXMgYWxyZWFkeSBiZWVuIGRlc3Ryb3llZC4nKTtcbiAgfSBlbHNlIGlmICghdGhpcy5kaXNjb25uZWN0ZWQgJiYgIXRoaXMub3Blbikge1xuICAgIC8vIERvIG5vdGhpbmcuIFdlJ3JlIHN0aWxsIGNvbm5lY3RpbmcgdGhlIGZpcnN0IHRpbWUuXG4gICAgdXRpbC5lcnJvcignSW4gYSBodXJyeT8gV2VcXCdyZSBzdGlsbCB0cnlpbmcgdG8gbWFrZSB0aGUgaW5pdGlhbCBjb25uZWN0aW9uIScpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignUGVlciAnICsgdGhpcy5pZCArICcgY2Fubm90IHJlY29ubmVjdCBiZWNhdXNlIGl0IGlzIG5vdCBkaXNjb25uZWN0ZWQgZnJvbSB0aGUgc2VydmVyIScpO1xuICB9XG59O1xuXG4vKipcbiAqIEdldCBhIGxpc3Qgb2YgYXZhaWxhYmxlIHBlZXIgSURzLiBJZiB5b3UncmUgcnVubmluZyB5b3VyIG93biBzZXJ2ZXIsIHlvdSdsbFxuICogd2FudCB0byBzZXQgYWxsb3dfZGlzY292ZXJ5OiB0cnVlIGluIHRoZSBQZWVyU2VydmVyIG9wdGlvbnMuIElmIHlvdSdyZSB1c2luZ1xuICogdGhlIGNsb3VkIHNlcnZlciwgZW1haWwgdGVhbUBwZWVyanMuY29tIHRvIGdldCB0aGUgZnVuY3Rpb25hbGl0eSBlbmFibGVkIGZvclxuICogeW91ciBrZXkuXG4gKi9cblBlZXIucHJvdG90eXBlLmxpc3RBbGxQZWVycyA9IGZ1bmN0aW9uKGNiKSB7XG4gIGNiID0gY2IgfHwgZnVuY3Rpb24oKSB7fTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgaHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB2YXIgcHJvdG9jb2wgPSB0aGlzLm9wdGlvbnMuc2VjdXJlID8gJ2h0dHBzOi8vJyA6ICdodHRwOi8vJztcbiAgdmFyIHVybCA9IHByb3RvY29sICsgdGhpcy5vcHRpb25zLmhvc3QgKyAnOicgKyB0aGlzLm9wdGlvbnMucG9ydFxuICAgICsgdGhpcy5vcHRpb25zLnBhdGggKyB0aGlzLm9wdGlvbnMua2V5ICsgJy9wZWVycyc7XG4gIHZhciBxdWVyeVN0cmluZyA9ICc/dHM9JyArIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJycgKyBNYXRoLnJhbmRvbSgpO1xuICB1cmwgKz0gcXVlcnlTdHJpbmc7XG5cbiAgLy8gSWYgdGhlcmUncyBubyBJRCB3ZSBuZWVkIHRvIHdhaXQgZm9yIG9uZSBiZWZvcmUgdHJ5aW5nIHRvIGluaXQgc29ja2V0LlxuICBodHRwLm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gIGh0dHAub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICBzZWxmLl9hYm9ydCgnc2VydmVyLWVycm9yJywgJ0NvdWxkIG5vdCBnZXQgcGVlcnMgZnJvbSB0aGUgc2VydmVyLicpO1xuICAgIGNiKFtdKTtcbiAgfVxuICBodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChodHRwLnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGh0dHAuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgIHZhciBoZWxwZnVsRXJyb3IgPSAnJztcbiAgICAgIGlmIChzZWxmLm9wdGlvbnMuaG9zdCAhPT0gdXRpbC5DTE9VRF9IT1NUKSB7XG4gICAgICAgIGhlbHBmdWxFcnJvciA9ICdJdCBsb29rcyBsaWtlIHlvdVxcJ3JlIHVzaW5nIHRoZSBjbG91ZCBzZXJ2ZXIuIFlvdSBjYW4gZW1haWwgJ1xuICAgICAgICAgICsgJ3RlYW1AcGVlcmpzLmNvbSB0byBlbmFibGUgcGVlciBsaXN0aW5nIGZvciB5b3VyIEFQSSBrZXkuJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhlbHBmdWxFcnJvciA9ICdZb3UgbmVlZCB0byBlbmFibGUgYGFsbG93X2Rpc2NvdmVyeWAgb24geW91ciBzZWxmLWhvc3RlZCdcbiAgICAgICAgICArICcgUGVlclNlcnZlciB0byB1c2UgdGhpcyBmZWF0dXJlLic7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0l0IGRvZXNuXFwndCBsb29rIGxpa2UgeW91IGhhdmUgcGVybWlzc2lvbiB0byBsaXN0IHBlZXJzIElEcy4gJyArIGhlbHBmdWxFcnJvcik7XG4gICAgICBjYihbXSk7XG4gICAgfSBlbHNlIGlmIChodHRwLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICBjYihbXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNiKEpTT04ucGFyc2UoaHR0cC5yZXNwb25zZVRleHQpKTtcbiAgICB9XG4gIH07XG4gIGh0dHAuc2VuZChudWxsKTtcbn1cblxuZXhwb3J0cy5QZWVyID0gUGVlcjtcbi8qKlxuICogV3JhcHMgYSBEYXRhQ2hhbm5lbCBiZXR3ZWVuIHR3byBQZWVycy5cbiAqL1xuZnVuY3Rpb24gRGF0YUNvbm5lY3Rpb24ocGVlciwgcHJvdmlkZXIsIG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERhdGFDb25uZWN0aW9uKSkgcmV0dXJuIG5ldyBEYXRhQ29ubmVjdGlvbihwZWVyLCBwcm92aWRlciwgb3B0aW9ucyk7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIHRoaXMub3B0aW9ucyA9IHV0aWwuZXh0ZW5kKHtcbiAgICBzZXJpYWxpemF0aW9uOiAnYmluYXJ5JyxcbiAgICByZWxpYWJsZTogZmFsc2VcbiAgfSwgb3B0aW9ucyk7XG5cbiAgLy8gQ29ubmVjdGlvbiBpcyBub3Qgb3BlbiB5ZXQuXG4gIHRoaXMub3BlbiA9IGZhbHNlO1xuICB0aGlzLnR5cGUgPSAnZGF0YSc7XG4gIHRoaXMucGVlciA9IHBlZXI7XG4gIHRoaXMucHJvdmlkZXIgPSBwcm92aWRlcjtcblxuICB0aGlzLmlkID0gdGhpcy5vcHRpb25zLmNvbm5lY3Rpb25JZCB8fCBEYXRhQ29ubmVjdGlvbi5faWRQcmVmaXggKyB1dGlsLnJhbmRvbVRva2VuKCk7XG5cbiAgdGhpcy5sYWJlbCA9IHRoaXMub3B0aW9ucy5sYWJlbCB8fCB0aGlzLmlkO1xuICB0aGlzLm1ldGFkYXRhID0gdGhpcy5vcHRpb25zLm1ldGFkYXRhO1xuICB0aGlzLnNlcmlhbGl6YXRpb24gPSB0aGlzLm9wdGlvbnMuc2VyaWFsaXphdGlvbjtcbiAgdGhpcy5yZWxpYWJsZSA9IHRoaXMub3B0aW9ucy5yZWxpYWJsZTtcblxuICAvLyBEYXRhIGNoYW5uZWwgYnVmZmVyaW5nLlxuICB0aGlzLl9idWZmZXIgPSBbXTtcbiAgdGhpcy5fYnVmZmVyaW5nID0gZmFsc2U7XG4gIHRoaXMuYnVmZmVyU2l6ZSA9IDA7XG5cbiAgLy8gRm9yIHN0b3JpbmcgbGFyZ2UgZGF0YS5cbiAgdGhpcy5fY2h1bmtlZERhdGEgPSB7fTtcblxuICBpZiAodGhpcy5vcHRpb25zLl9wYXlsb2FkKSB7XG4gICAgdGhpcy5fcGVlckJyb3dzZXIgPSB0aGlzLm9wdGlvbnMuX3BheWxvYWQuYnJvd3NlcjtcbiAgfVxuXG4gIE5lZ290aWF0b3Iuc3RhcnRDb25uZWN0aW9uKFxuICAgIHRoaXMsXG4gICAgdGhpcy5vcHRpb25zLl9wYXlsb2FkIHx8IHtcbiAgICAgIG9yaWdpbmF0b3I6IHRydWVcbiAgICB9XG4gICk7XG59XG5cbnV0aWwuaW5oZXJpdHMoRGF0YUNvbm5lY3Rpb24sIEV2ZW50RW1pdHRlcik7XG5cbkRhdGFDb25uZWN0aW9uLl9pZFByZWZpeCA9ICdkY18nO1xuXG4vKiogQ2FsbGVkIGJ5IHRoZSBOZWdvdGlhdG9yIHdoZW4gdGhlIERhdGFDaGFubmVsIGlzIHJlYWR5LiAqL1xuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihkYykge1xuICB0aGlzLl9kYyA9IHRoaXMuZGF0YUNoYW5uZWwgPSBkYztcbiAgdGhpcy5fY29uZmlndXJlRGF0YUNoYW5uZWwoKTtcbn1cblxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLl9jb25maWd1cmVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh1dGlsLnN1cHBvcnRzLnNjdHApIHtcbiAgICB0aGlzLl9kYy5iaW5hcnlUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgfVxuICB0aGlzLl9kYy5vbm9wZW4gPSBmdW5jdGlvbigpIHtcbiAgICB1dGlsLmxvZygnRGF0YSBjaGFubmVsIGNvbm5lY3Rpb24gc3VjY2VzcycpO1xuICAgIHNlbGYub3BlbiA9IHRydWU7XG4gICAgc2VsZi5lbWl0KCdvcGVuJyk7XG4gIH1cblxuICAvLyBVc2UgdGhlIFJlbGlhYmxlIHNoaW0gZm9yIG5vbiBGaXJlZm94IGJyb3dzZXJzXG4gIGlmICghdXRpbC5zdXBwb3J0cy5zY3RwICYmIHRoaXMucmVsaWFibGUpIHtcbiAgICB0aGlzLl9yZWxpYWJsZSA9IG5ldyBSZWxpYWJsZSh0aGlzLl9kYywgdXRpbC5kZWJ1Zyk7XG4gIH1cblxuICBpZiAodGhpcy5fcmVsaWFibGUpIHtcbiAgICB0aGlzLl9yZWxpYWJsZS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihtc2cpIHtcbiAgICAgIHNlbGYuZW1pdCgnZGF0YScsIG1zZyk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9kYy5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9oYW5kbGVEYXRhTWVzc2FnZShlKTtcbiAgICB9O1xuICB9XG4gIHRoaXMuX2RjLm9uY2xvc2UgPSBmdW5jdGlvbihlKSB7XG4gICAgdXRpbC5sb2coJ0RhdGFDaGFubmVsIGNsb3NlZCBmb3I6Jywgc2VsZi5wZWVyKTtcbiAgICBzZWxmLmNsb3NlKCk7XG4gIH07XG59XG5cbi8vIEhhbmRsZXMgYSBEYXRhQ2hhbm5lbCBtZXNzYWdlLlxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLl9oYW5kbGVEYXRhTWVzc2FnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZGF0YSA9IGUuZGF0YTtcbiAgdmFyIGRhdGF0eXBlID0gZGF0YS5jb25zdHJ1Y3RvcjtcbiAgaWYgKHRoaXMuc2VyaWFsaXphdGlvbiA9PT0gJ2JpbmFyeScgfHwgdGhpcy5zZXJpYWxpemF0aW9uID09PSAnYmluYXJ5LXV0ZjgnKSB7XG4gICAgaWYgKGRhdGF0eXBlID09PSBCbG9iKSB7XG4gICAgICAvLyBEYXRhdHlwZSBzaG91bGQgbmV2ZXIgYmUgYmxvYlxuICAgICAgdXRpbC5ibG9iVG9BcnJheUJ1ZmZlcihkYXRhLCBmdW5jdGlvbihhYikge1xuICAgICAgICBkYXRhID0gdXRpbC51bnBhY2soYWIpO1xuICAgICAgICBzZWxmLmVtaXQoJ2RhdGEnLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoZGF0YXR5cGUgPT09IEFycmF5QnVmZmVyKSB7XG4gICAgICBkYXRhID0gdXRpbC51bnBhY2soZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhdHlwZSA9PT0gU3RyaW5nKSB7XG4gICAgICAvLyBTdHJpbmcgZmFsbGJhY2sgZm9yIGJpbmFyeSBkYXRhIGZvciBicm93c2VycyB0aGF0IGRvbid0IHN1cHBvcnQgYmluYXJ5IHlldFxuICAgICAgdmFyIGFiID0gdXRpbC5iaW5hcnlTdHJpbmdUb0FycmF5QnVmZmVyKGRhdGEpO1xuICAgICAgZGF0YSA9IHV0aWwudW5wYWNrKGFiKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodGhpcy5zZXJpYWxpemF0aW9uID09PSAnanNvbicpIHtcbiAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHdlJ3ZlIGNodW5rZWQtLWlmIHNvLCBwaWVjZSB0aGluZ3MgYmFjayB0b2dldGhlci5cbiAgLy8gV2UncmUgZ3VhcmFudGVlZCB0aGF0IHRoaXMgaXNuJ3QgMC5cbiAgaWYgKGRhdGEuX19wZWVyRGF0YSkge1xuICAgIHZhciBpZCA9IGRhdGEuX19wZWVyRGF0YTtcbiAgICB2YXIgY2h1bmtJbmZvID0gdGhpcy5fY2h1bmtlZERhdGFbaWRdIHx8IHtkYXRhOiBbXSwgY291bnQ6IDAsIHRvdGFsOiBkYXRhLnRvdGFsfTtcblxuICAgIGNodW5rSW5mby5kYXRhW2RhdGEubl0gPSBkYXRhLmRhdGE7XG4gICAgY2h1bmtJbmZvLmNvdW50ICs9IDE7XG5cbiAgICBpZiAoY2h1bmtJbmZvLnRvdGFsID09PSBjaHVua0luZm8uY291bnQpIHtcbiAgICAgIC8vIENsZWFuIHVwIGJlZm9yZSBtYWtpbmcgdGhlIHJlY3Vyc2l2ZSBjYWxsIHRvIGBfaGFuZGxlRGF0YU1lc3NhZ2VgLlxuICAgICAgZGVsZXRlIHRoaXMuX2NodW5rZWREYXRhW2lkXTtcblxuICAgICAgLy8gV2UndmUgcmVjZWl2ZWQgYWxsIHRoZSBjaHVua3MtLXRpbWUgdG8gY29uc3RydWN0IHRoZSBjb21wbGV0ZSBkYXRhLlxuICAgICAgZGF0YSA9IG5ldyBCbG9iKGNodW5rSW5mby5kYXRhKTtcbiAgICAgIHRoaXMuX2hhbmRsZURhdGFNZXNzYWdlKHtkYXRhOiBkYXRhfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2h1bmtlZERhdGFbaWRdID0gY2h1bmtJbmZvO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMuZW1pdCgnZGF0YScsIGRhdGEpO1xufVxuXG4vKipcbiAqIEV4cG9zZWQgZnVuY3Rpb25hbGl0eSBmb3IgdXNlcnMuXG4gKi9cblxuLyoqIEFsbG93cyB1c2VyIHRvIGNsb3NlIGNvbm5lY3Rpb24uICovXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLm9wZW4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5vcGVuID0gZmFsc2U7XG4gIE5lZ290aWF0b3IuY2xlYW51cCh0aGlzKTtcbiAgdGhpcy5lbWl0KCdjbG9zZScpO1xufVxuXG4vKiogQWxsb3dzIHVzZXIgdG8gc2VuZCBkYXRhLiAqL1xuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihkYXRhLCBjaHVua2VkKSB7XG4gIGlmICghdGhpcy5vcGVuKSB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignQ29ubmVjdGlvbiBpcyBub3Qgb3Blbi4gWW91IHNob3VsZCBsaXN0ZW4gZm9yIHRoZSBgb3BlbmAgZXZlbnQgYmVmb3JlIHNlbmRpbmcgbWVzc2FnZXMuJykpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodGhpcy5fcmVsaWFibGUpIHtcbiAgICAvLyBOb3RlOiByZWxpYWJsZSBzaGltIHNlbmRpbmcgd2lsbCBtYWtlIGl0IHNvIHRoYXQgeW91IGNhbm5vdCBjdXN0b21pemVcbiAgICAvLyBzZXJpYWxpemF0aW9uLlxuICAgIHRoaXMuX3JlbGlhYmxlLnNlbmQoZGF0YSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHRoaXMuc2VyaWFsaXphdGlvbiA9PT0gJ2pzb24nKSB7XG4gICAgdGhpcy5fYnVmZmVyZWRTZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgfSBlbHNlIGlmICh0aGlzLnNlcmlhbGl6YXRpb24gPT09ICdiaW5hcnknIHx8IHRoaXMuc2VyaWFsaXphdGlvbiA9PT0gJ2JpbmFyeS11dGY4Jykge1xuICAgIHZhciBibG9iID0gdXRpbC5wYWNrKGRhdGEpO1xuXG4gICAgLy8gRm9yIENocm9tZS1GaXJlZm94IGludGVyb3BlcmFiaWxpdHksIHdlIG5lZWQgdG8gbWFrZSBGaXJlZm94IFwiY2h1bmtcIlxuICAgIC8vIHRoZSBkYXRhIGl0IHNlbmRzIG91dC5cbiAgICB2YXIgbmVlZHNDaHVua2luZyA9IHV0aWwuY2h1bmtlZEJyb3dzZXJzW3RoaXMuX3BlZXJCcm93c2VyXSB8fCB1dGlsLmNodW5rZWRCcm93c2Vyc1t1dGlsLmJyb3dzZXJdO1xuICAgIGlmIChuZWVkc0NodW5raW5nICYmICFjaHVua2VkICYmIGJsb2Iuc2l6ZSA+IHV0aWwuY2h1bmtlZE1UVSkge1xuICAgICAgdGhpcy5fc2VuZENodW5rcyhibG9iKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBEYXRhQ2hhbm5lbCBjdXJyZW50bHkgb25seSBzdXBwb3J0cyBzdHJpbmdzLlxuICAgIGlmICghdXRpbC5zdXBwb3J0cy5zY3RwKSB7XG4gICAgICB1dGlsLmJsb2JUb0JpbmFyeVN0cmluZyhibG9iLCBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgc2VsZi5fYnVmZmVyZWRTZW5kKHN0cik7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKCF1dGlsLnN1cHBvcnRzLmJpbmFyeUJsb2IpIHtcbiAgICAgIC8vIFdlIG9ubHkgZG8gdGhpcyBpZiB3ZSByZWFsbHkgbmVlZCB0byAoZS5nLiBibG9icyBhcmUgbm90IHN1cHBvcnRlZCksXG4gICAgICAvLyBiZWNhdXNlIHRoaXMgY29udmVyc2lvbiBpcyBjb3N0bHkuXG4gICAgICB1dGlsLmJsb2JUb0FycmF5QnVmZmVyKGJsb2IsIGZ1bmN0aW9uKGFiKSB7XG4gICAgICAgIHNlbGYuX2J1ZmZlcmVkU2VuZChhYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYnVmZmVyZWRTZW5kKGJsb2IpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9idWZmZXJlZFNlbmQoZGF0YSk7XG4gIH1cbn1cblxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLl9idWZmZXJlZFNlbmQgPSBmdW5jdGlvbihtc2cpIHtcbiAgaWYgKHRoaXMuX2J1ZmZlcmluZyB8fCAhdGhpcy5fdHJ5U2VuZChtc2cpKSB7XG4gICAgdGhpcy5fYnVmZmVyLnB1c2gobXNnKTtcbiAgICB0aGlzLmJ1ZmZlclNpemUgPSB0aGlzLl9idWZmZXIubGVuZ3RoO1xuICB9XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgc2VuZCBzdWNjZWVkcy5cbkRhdGFDb25uZWN0aW9uLnByb3RvdHlwZS5fdHJ5U2VuZCA9IGZ1bmN0aW9uKG1zZykge1xuICB0cnkge1xuICAgIHRoaXMuX2RjLnNlbmQobXNnKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRoaXMuX2J1ZmZlcmluZyA9IHRydWU7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIC8vIFRyeSBhZ2Fpbi5cbiAgICAgIHNlbGYuX2J1ZmZlcmluZyA9IGZhbHNlO1xuICAgICAgc2VsZi5fdHJ5QnVmZmVyKCk7XG4gICAgfSwgMTAwKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIFRyeSB0byBzZW5kIHRoZSBmaXJzdCBtZXNzYWdlIGluIHRoZSBidWZmZXIuXG5EYXRhQ29ubmVjdGlvbi5wcm90b3R5cGUuX3RyeUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBtc2cgPSB0aGlzLl9idWZmZXJbMF07XG5cbiAgaWYgKHRoaXMuX3RyeVNlbmQobXNnKSkge1xuICAgIHRoaXMuX2J1ZmZlci5zaGlmdCgpO1xuICAgIHRoaXMuYnVmZmVyU2l6ZSA9IHRoaXMuX2J1ZmZlci5sZW5ndGg7XG4gICAgdGhpcy5fdHJ5QnVmZmVyKCk7XG4gIH1cbn1cblxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLl9zZW5kQ2h1bmtzID0gZnVuY3Rpb24oYmxvYikge1xuICB2YXIgYmxvYnMgPSB1dGlsLmNodW5rKGJsb2IpO1xuICBmb3IgKHZhciBpID0gMCwgaWkgPSBibG9icy5sZW5ndGg7IGkgPCBpaTsgaSArPSAxKSB7XG4gICAgdmFyIGJsb2IgPSBibG9ic1tpXTtcbiAgICB0aGlzLnNlbmQoYmxvYiwgdHJ1ZSk7XG4gIH1cbn1cblxuRGF0YUNvbm5lY3Rpb24ucHJvdG90eXBlLmhhbmRsZU1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciBwYXlsb2FkID0gbWVzc2FnZS5wYXlsb2FkO1xuXG4gIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgY2FzZSAnQU5TV0VSJzpcbiAgICAgIHRoaXMuX3BlZXJCcm93c2VyID0gcGF5bG9hZC5icm93c2VyO1xuXG4gICAgICAvLyBGb3J3YXJkIHRvIG5lZ290aWF0b3JcbiAgICAgIE5lZ290aWF0b3IuaGFuZGxlU0RQKG1lc3NhZ2UudHlwZSwgdGhpcywgcGF5bG9hZC5zZHApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQ0FORElEQVRFJzpcbiAgICAgIE5lZ290aWF0b3IuaGFuZGxlQ2FuZGlkYXRlKHRoaXMsIHBheWxvYWQuY2FuZGlkYXRlKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB1dGlsLndhcm4oJ1VucmVjb2duaXplZCBtZXNzYWdlIHR5cGU6JywgbWVzc2FnZS50eXBlLCAnZnJvbSBwZWVyOicsIHRoaXMucGVlcik7XG4gICAgICBicmVhaztcbiAgfVxufVxuLyoqXG4gKiBXcmFwcyB0aGUgc3RyZWFtaW5nIGludGVyZmFjZSBiZXR3ZWVuIHR3byBQZWVycy5cbiAqL1xuZnVuY3Rpb24gTWVkaWFDb25uZWN0aW9uKHBlZXIsIHByb3ZpZGVyLCBvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNZWRpYUNvbm5lY3Rpb24pKSByZXR1cm4gbmV3IE1lZGlhQ29ubmVjdGlvbihwZWVyLCBwcm92aWRlciwgb3B0aW9ucyk7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIHRoaXMub3B0aW9ucyA9IHV0aWwuZXh0ZW5kKHt9LCBvcHRpb25zKTtcblxuICB0aGlzLm9wZW4gPSBmYWxzZTtcbiAgdGhpcy50eXBlID0gJ21lZGlhJztcbiAgdGhpcy5wZWVyID0gcGVlcjtcbiAgdGhpcy5wcm92aWRlciA9IHByb3ZpZGVyO1xuICB0aGlzLm1ldGFkYXRhID0gdGhpcy5vcHRpb25zLm1ldGFkYXRhO1xuICB0aGlzLmxvY2FsU3RyZWFtID0gdGhpcy5vcHRpb25zLl9zdHJlYW07XG5cbiAgdGhpcy5pZCA9IHRoaXMub3B0aW9ucy5jb25uZWN0aW9uSWQgfHwgTWVkaWFDb25uZWN0aW9uLl9pZFByZWZpeCArIHV0aWwucmFuZG9tVG9rZW4oKTtcbiAgaWYgKHRoaXMubG9jYWxTdHJlYW0pIHtcbiAgICBOZWdvdGlhdG9yLnN0YXJ0Q29ubmVjdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICB7X3N0cmVhbTogdGhpcy5sb2NhbFN0cmVhbSwgb3JpZ2luYXRvcjogdHJ1ZX1cbiAgICApO1xuICB9XG59O1xuXG51dGlsLmluaGVyaXRzKE1lZGlhQ29ubmVjdGlvbiwgRXZlbnRFbWl0dGVyKTtcblxuTWVkaWFDb25uZWN0aW9uLl9pZFByZWZpeCA9ICdtY18nO1xuXG5NZWRpYUNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uKHJlbW90ZVN0cmVhbSkge1xuICB1dGlsLmxvZygnUmVjZWl2aW5nIHN0cmVhbScsIHJlbW90ZVN0cmVhbSk7XG5cbiAgdGhpcy5yZW1vdGVTdHJlYW0gPSByZW1vdGVTdHJlYW07XG4gIHRoaXMuZW1pdCgnc3RyZWFtJywgcmVtb3RlU3RyZWFtKTsgLy8gU2hvdWxkIHdlIGNhbGwgdGhpcyBgb3BlbmA/XG5cbn07XG5cbk1lZGlhQ29ubmVjdGlvbi5wcm90b3R5cGUuaGFuZGxlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHBheWxvYWQgPSBtZXNzYWdlLnBheWxvYWQ7XG5cbiAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcbiAgICBjYXNlICdBTlNXRVInOlxuICAgICAgLy8gRm9yd2FyZCB0byBuZWdvdGlhdG9yXG4gICAgICBOZWdvdGlhdG9yLmhhbmRsZVNEUChtZXNzYWdlLnR5cGUsIHRoaXMsIHBheWxvYWQuc2RwKTtcbiAgICAgIHRoaXMub3BlbiA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdDQU5ESURBVEUnOlxuICAgICAgTmVnb3RpYXRvci5oYW5kbGVDYW5kaWRhdGUodGhpcywgcGF5bG9hZC5jYW5kaWRhdGUpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHV0aWwud2FybignVW5yZWNvZ25pemVkIG1lc3NhZ2UgdHlwZTonLCBtZXNzYWdlLnR5cGUsICdmcm9tIHBlZXI6JywgdGhpcy5wZWVyKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbk1lZGlhQ29ubmVjdGlvbi5wcm90b3R5cGUuYW5zd2VyID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIGlmICh0aGlzLmxvY2FsU3RyZWFtKSB7XG4gICAgdXRpbC53YXJuKCdMb2NhbCBzdHJlYW0gYWxyZWFkeSBleGlzdHMgb24gdGhpcyBNZWRpYUNvbm5lY3Rpb24uIEFyZSB5b3UgYW5zd2VyaW5nIGEgY2FsbCB0d2ljZT8nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLm9wdGlvbnMuX3BheWxvYWQuX3N0cmVhbSA9IHN0cmVhbTtcblxuICB0aGlzLmxvY2FsU3RyZWFtID0gc3RyZWFtO1xuICBOZWdvdGlhdG9yLnN0YXJ0Q29ubmVjdGlvbihcbiAgICB0aGlzLFxuICAgIHRoaXMub3B0aW9ucy5fcGF5bG9hZFxuICApXG4gIC8vIFJldHJpZXZlIGxvc3QgbWVzc2FnZXMgc3RvcmVkIGJlY2F1c2UgUGVlckNvbm5lY3Rpb24gbm90IHNldCB1cC5cbiAgdmFyIG1lc3NhZ2VzID0gdGhpcy5wcm92aWRlci5fZ2V0TWVzc2FnZXModGhpcy5pZCk7XG4gIGZvciAodmFyIGkgPSAwLCBpaSA9IG1lc3NhZ2VzLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZXNbaV0pO1xuICB9XG4gIHRoaXMub3BlbiA9IHRydWU7XG59O1xuXG4vKipcbiAqIEV4cG9zZWQgZnVuY3Rpb25hbGl0eSBmb3IgdXNlcnMuXG4gKi9cblxuLyoqIEFsbG93cyB1c2VyIHRvIGNsb3NlIGNvbm5lY3Rpb24uICovXG5NZWRpYUNvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5vcGVuKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMub3BlbiA9IGZhbHNlO1xuICBOZWdvdGlhdG9yLmNsZWFudXAodGhpcyk7XG4gIHRoaXMuZW1pdCgnY2xvc2UnKVxufTtcbi8qKlxuICogTWFuYWdlcyBhbGwgbmVnb3RpYXRpb25zIGJldHdlZW4gUGVlcnMuXG4gKi9cbnZhciBOZWdvdGlhdG9yID0ge1xuICBwY3M6IHtcbiAgICBkYXRhOiB7fSxcbiAgICBtZWRpYToge31cbiAgfSwgLy8gdHlwZSA9PiB7cGVlcklkOiB7cGNfaWQ6IHBjfX0uXG4gIC8vcHJvdmlkZXJzOiB7fSwgLy8gcHJvdmlkZXIncyBpZCA9PiBwcm92aWRlcnMgKHRoZXJlIG1heSBiZSBtdWx0aXBsZSBwcm92aWRlcnMvY2xpZW50LlxuICBxdWV1ZTogW10gLy8gY29ubmVjdGlvbnMgdGhhdCBhcmUgZGVsYXllZCBkdWUgdG8gYSBQQyBiZWluZyBpbiB1c2UuXG59XG5cbk5lZ290aWF0b3IuX2lkUHJlZml4ID0gJ3BjXyc7XG5cbi8qKiBSZXR1cm5zIGEgUGVlckNvbm5lY3Rpb24gb2JqZWN0IHNldCB1cCBjb3JyZWN0bHkgKGZvciBkYXRhLCBtZWRpYSkuICovXG5OZWdvdGlhdG9yLnN0YXJ0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uKGNvbm5lY3Rpb24sIG9wdGlvbnMpIHtcbiAgdmFyIHBjID0gTmVnb3RpYXRvci5fZ2V0UGVlckNvbm5lY3Rpb24oY29ubmVjdGlvbiwgb3B0aW9ucyk7XG5cbiAgaWYgKGNvbm5lY3Rpb24udHlwZSA9PT0gJ21lZGlhJyAmJiBvcHRpb25zLl9zdHJlYW0pIHtcbiAgICAvLyBBZGQgdGhlIHN0cmVhbS5cbiAgICBwYy5hZGRTdHJlYW0ob3B0aW9ucy5fc3RyZWFtKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgY29ubmVjdGlvbidzIFBDLlxuICBjb25uZWN0aW9uLnBjID0gY29ubmVjdGlvbi5wZWVyQ29ubmVjdGlvbiA9IHBjO1xuICAvLyBXaGF0IGRvIHdlIG5lZWQgdG8gZG8gbm93P1xuICBpZiAob3B0aW9ucy5vcmlnaW5hdG9yKSB7XG4gICAgaWYgKGNvbm5lY3Rpb24udHlwZSA9PT0gJ2RhdGEnKSB7XG4gICAgICAvLyBDcmVhdGUgdGhlIGRhdGFjaGFubmVsLlxuICAgICAgdmFyIGNvbmZpZyA9IHt9O1xuICAgICAgLy8gRHJvcHBpbmcgcmVsaWFibGU6ZmFsc2Ugc3VwcG9ydCwgc2luY2UgaXQgc2VlbXMgdG8gYmUgY3Jhc2hpbmdcbiAgICAgIC8vIENocm9tZS5cbiAgICAgIC8qaWYgKHV0aWwuc3VwcG9ydHMuc2N0cCAmJiAhb3B0aW9ucy5yZWxpYWJsZSkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGNhbm9uaWNhbCByZWxpYWJsZSBzdXBwb3J0Li4uXG4gICAgICAgIGNvbmZpZyA9IHttYXhSZXRyYW5zbWl0czogMH07XG4gICAgICB9Ki9cbiAgICAgIC8vIEZhbGxiYWNrIHRvIGVuc3VyZSBvbGRlciBicm93c2VycyBkb24ndCBjcmFzaC5cbiAgICAgIGlmICghdXRpbC5zdXBwb3J0cy5zY3RwKSB7XG4gICAgICAgIGNvbmZpZyA9IHtyZWxpYWJsZTogb3B0aW9ucy5yZWxpYWJsZX07XG4gICAgICB9XG4gICAgICB2YXIgZGMgPSBwYy5jcmVhdGVEYXRhQ2hhbm5lbChjb25uZWN0aW9uLmxhYmVsLCBjb25maWcpO1xuICAgICAgY29ubmVjdGlvbi5pbml0aWFsaXplKGRjKTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWwuc3VwcG9ydHMub25uZWdvdGlhdGlvbm5lZWRlZCkge1xuICAgICAgTmVnb3RpYXRvci5fbWFrZU9mZmVyKGNvbm5lY3Rpb24pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBOZWdvdGlhdG9yLmhhbmRsZVNEUCgnT0ZGRVInLCBjb25uZWN0aW9uLCBvcHRpb25zLnNkcCk7XG4gIH1cbn1cblxuTmVnb3RpYXRvci5fZ2V0UGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbihjb25uZWN0aW9uLCBvcHRpb25zKSB7XG4gIGlmICghTmVnb3RpYXRvci5wY3NbY29ubmVjdGlvbi50eXBlXSkge1xuICAgIHV0aWwuZXJyb3IoY29ubmVjdGlvbi50eXBlICsgJyBpcyBub3QgYSB2YWxpZCBjb25uZWN0aW9uIHR5cGUuIE1heWJlIHlvdSBvdmVycm9kZSB0aGUgYHR5cGVgIHByb3BlcnR5IHNvbWV3aGVyZS4nKTtcbiAgfVxuXG4gIGlmICghTmVnb3RpYXRvci5wY3NbY29ubmVjdGlvbi50eXBlXVtjb25uZWN0aW9uLnBlZXJdKSB7XG4gICAgTmVnb3RpYXRvci5wY3NbY29ubmVjdGlvbi50eXBlXVtjb25uZWN0aW9uLnBlZXJdID0ge307XG4gIH1cbiAgdmFyIHBlZXJDb25uZWN0aW9ucyA9IE5lZ290aWF0b3IucGNzW2Nvbm5lY3Rpb24udHlwZV1bY29ubmVjdGlvbi5wZWVyXTtcblxuICB2YXIgcGM7XG4gIC8vIE5vdCBtdWx0aXBsZXhpbmcgd2hpbGUgRkYgYW5kIENocm9tZSBoYXZlIG5vdC1ncmVhdCBzdXBwb3J0IGZvciBpdC5cbiAgLyppZiAob3B0aW9ucy5tdWx0aXBsZXgpIHtcbiAgICBpZHMgPSBPYmplY3Qua2V5cyhwZWVyQ29ubmVjdGlvbnMpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGlkcy5sZW5ndGg7IGkgPCBpaTsgaSArPSAxKSB7XG4gICAgICBwYyA9IHBlZXJDb25uZWN0aW9uc1tpZHNbaV1dO1xuICAgICAgaWYgKHBjLnNpZ25hbGluZ1N0YXRlID09PSAnc3RhYmxlJykge1xuICAgICAgICBicmVhazsgLy8gV2UgY2FuIGdvIGFoZWFkIGFuZCB1c2UgdGhpcyBQQy5cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSAqL1xuICBpZiAob3B0aW9ucy5wYykgeyAvLyBTaW1wbGVzdCBjYXNlOiBQQyBpZCBhbHJlYWR5IHByb3ZpZGVkIGZvciB1cy5cbiAgICBwYyA9IE5lZ290aWF0b3IucGNzW2Nvbm5lY3Rpb24udHlwZV1bY29ubmVjdGlvbi5wZWVyXVtvcHRpb25zLnBjXTtcbiAgfVxuXG4gIGlmICghcGMgfHwgcGMuc2lnbmFsaW5nU3RhdGUgIT09ICdzdGFibGUnKSB7XG4gICAgcGMgPSBOZWdvdGlhdG9yLl9zdGFydFBlZXJDb25uZWN0aW9uKGNvbm5lY3Rpb24pO1xuICB9XG4gIHJldHVybiBwYztcbn1cblxuLypcbk5lZ290aWF0b3IuX2FkZFByb3ZpZGVyID0gZnVuY3Rpb24ocHJvdmlkZXIpIHtcbiAgaWYgKCghcHJvdmlkZXIuaWQgJiYgIXByb3ZpZGVyLmRpc2Nvbm5lY3RlZCkgfHwgIXByb3ZpZGVyLnNvY2tldC5vcGVuKSB7XG4gICAgLy8gV2FpdCBmb3IgcHJvdmlkZXIgdG8gb2J0YWluIGFuIElELlxuICAgIHByb3ZpZGVyLm9uKCdvcGVuJywgZnVuY3Rpb24oaWQpIHtcbiAgICAgIE5lZ290aWF0b3IuX2FkZFByb3ZpZGVyKHByb3ZpZGVyKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBOZWdvdGlhdG9yLnByb3ZpZGVyc1twcm92aWRlci5pZF0gPSBwcm92aWRlcjtcbiAgfVxufSovXG5cblxuLyoqIFN0YXJ0IGEgUEMuICovXG5OZWdvdGlhdG9yLl9zdGFydFBlZXJDb25uZWN0aW9uID0gZnVuY3Rpb24oY29ubmVjdGlvbikge1xuICB1dGlsLmxvZygnQ3JlYXRpbmcgUlRDUGVlckNvbm5lY3Rpb24uJyk7XG5cbiAgdmFyIGlkID0gTmVnb3RpYXRvci5faWRQcmVmaXggKyB1dGlsLnJhbmRvbVRva2VuKCk7XG4gIHZhciBvcHRpb25hbCA9IHt9O1xuXG4gIGlmIChjb25uZWN0aW9uLnR5cGUgPT09ICdkYXRhJyAmJiAhdXRpbC5zdXBwb3J0cy5zY3RwKSB7XG4gICAgb3B0aW9uYWwgPSB7b3B0aW9uYWw6IFt7UnRwRGF0YUNoYW5uZWxzOiB0cnVlfV19O1xuICB9IGVsc2UgaWYgKGNvbm5lY3Rpb24udHlwZSA9PT0gJ21lZGlhJykge1xuICAgIC8vIEludGVyb3AgcmVxIGZvciBjaHJvbWUuXG4gICAgb3B0aW9uYWwgPSB7b3B0aW9uYWw6IFt7RHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWV9XX07XG4gIH1cblxuICB2YXIgcGMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oY29ubmVjdGlvbi5wcm92aWRlci5vcHRpb25zLmNvbmZpZywgb3B0aW9uYWwpO1xuICBOZWdvdGlhdG9yLnBjc1tjb25uZWN0aW9uLnR5cGVdW2Nvbm5lY3Rpb24ucGVlcl1baWRdID0gcGM7XG5cbiAgTmVnb3RpYXRvci5fc2V0dXBMaXN0ZW5lcnMoY29ubmVjdGlvbiwgcGMsIGlkKTtcblxuICByZXR1cm4gcGM7XG59XG5cbi8qKiBTZXQgdXAgdmFyaW91cyBXZWJSVEMgbGlzdGVuZXJzLiAqL1xuTmVnb3RpYXRvci5fc2V0dXBMaXN0ZW5lcnMgPSBmdW5jdGlvbihjb25uZWN0aW9uLCBwYywgcGNfaWQpIHtcbiAgdmFyIHBlZXJJZCA9IGNvbm5lY3Rpb24ucGVlcjtcbiAgdmFyIGNvbm5lY3Rpb25JZCA9IGNvbm5lY3Rpb24uaWQ7XG4gIHZhciBwcm92aWRlciA9IGNvbm5lY3Rpb24ucHJvdmlkZXI7XG5cbiAgLy8gSUNFIENBTkRJREFURVMuXG4gIHV0aWwubG9nKCdMaXN0ZW5pbmcgZm9yIElDRSBjYW5kaWRhdGVzLicpO1xuICBwYy5vbmljZWNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgIGlmIChldnQuY2FuZGlkYXRlKSB7XG4gICAgICB1dGlsLmxvZygnUmVjZWl2ZWQgSUNFIGNhbmRpZGF0ZXMgZm9yOicsIGNvbm5lY3Rpb24ucGVlcik7XG4gICAgICBwcm92aWRlci5zb2NrZXQuc2VuZCh7XG4gICAgICAgIHR5cGU6ICdDQU5ESURBVEUnLFxuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgY2FuZGlkYXRlOiBldnQuY2FuZGlkYXRlLFxuICAgICAgICAgIHR5cGU6IGNvbm5lY3Rpb24udHlwZSxcbiAgICAgICAgICBjb25uZWN0aW9uSWQ6IGNvbm5lY3Rpb24uaWRcbiAgICAgICAgfSxcbiAgICAgICAgZHN0OiBwZWVySWRcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBwYy5vbmljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAocGMuaWNlQ29ubmVjdGlvblN0YXRlKSB7XG4gICAgICBjYXNlICdkaXNjb25uZWN0ZWQnOlxuICAgICAgY2FzZSAnZmFpbGVkJzpcbiAgICAgICAgdXRpbC5sb2coJ2ljZUNvbm5lY3Rpb25TdGF0ZSBpcyBkaXNjb25uZWN0ZWQsIGNsb3NpbmcgY29ubmVjdGlvbnMgdG8gJyArIHBlZXJJZCk7XG4gICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjb21wbGV0ZWQnOlxuICAgICAgICBwYy5vbmljZWNhbmRpZGF0ZSA9IHV0aWwubm9vcDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9O1xuXG4gIC8vIEZhbGxiYWNrIGZvciBvbGRlciBDaHJvbWUgaW1wbHMuXG4gIHBjLm9uaWNlY2hhbmdlID0gcGMub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2U7XG5cbiAgLy8gT05ORUdPVElBVElPTk5FRURFRCAoQ2hyb21lKVxuICB1dGlsLmxvZygnTGlzdGVuaW5nIGZvciBgbmVnb3RpYXRpb25uZWVkZWRgJyk7XG4gIHBjLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlsLmxvZygnYG5lZ290aWF0aW9ubmVlZGVkYCB0cmlnZ2VyZWQnKTtcbiAgICBpZiAocGMuc2lnbmFsaW5nU3RhdGUgPT0gJ3N0YWJsZScpIHtcbiAgICAgIE5lZ290aWF0b3IuX21ha2VPZmZlcihjb25uZWN0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXRpbC5sb2coJ29ubmVnb3RpYXRpb25uZWVkZWQgdHJpZ2dlcmVkIHdoZW4gbm90IHN0YWJsZS4gSXMgYW5vdGhlciBjb25uZWN0aW9uIGJlaW5nIGVzdGFibGlzaGVkPycpO1xuICAgIH1cbiAgfTtcblxuICAvLyBEQVRBQ09OTkVDVElPTi5cbiAgdXRpbC5sb2coJ0xpc3RlbmluZyBmb3IgZGF0YSBjaGFubmVsJyk7XG4gIC8vIEZpcmVkIGJldHdlZW4gb2ZmZXIgYW5kIGFuc3dlciwgc28gb3B0aW9ucyBzaG91bGQgYWxyZWFkeSBiZSBzYXZlZFxuICAvLyBpbiB0aGUgb3B0aW9ucyBoYXNoLlxuICBwYy5vbmRhdGFjaGFubmVsID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgdXRpbC5sb2coJ1JlY2VpdmVkIGRhdGEgY2hhbm5lbCcpO1xuICAgIHZhciBkYyA9IGV2dC5jaGFubmVsO1xuICAgIHZhciBjb25uZWN0aW9uID0gcHJvdmlkZXIuZ2V0Q29ubmVjdGlvbihwZWVySWQsIGNvbm5lY3Rpb25JZCk7XG4gICAgY29ubmVjdGlvbi5pbml0aWFsaXplKGRjKTtcbiAgfTtcblxuICAvLyBNRURJQUNPTk5FQ1RJT04uXG4gIHV0aWwubG9nKCdMaXN0ZW5pbmcgZm9yIHJlbW90ZSBzdHJlYW0nKTtcbiAgcGMub25hZGRzdHJlYW0gPSBmdW5jdGlvbihldnQpIHtcbiAgICB1dGlsLmxvZygnUmVjZWl2ZWQgcmVtb3RlIHN0cmVhbScpO1xuICAgIHZhciBzdHJlYW0gPSBldnQuc3RyZWFtO1xuICAgIHByb3ZpZGVyLmdldENvbm5lY3Rpb24ocGVlcklkLCBjb25uZWN0aW9uSWQpLmFkZFN0cmVhbShzdHJlYW0pO1xuICB9O1xufVxuXG5OZWdvdGlhdG9yLmNsZWFudXAgPSBmdW5jdGlvbihjb25uZWN0aW9uKSB7XG4gIHV0aWwubG9nKCdDbGVhbmluZyB1cCBQZWVyQ29ubmVjdGlvbiB0byAnICsgY29ubmVjdGlvbi5wZWVyKTtcblxuICB2YXIgcGMgPSBjb25uZWN0aW9uLnBjO1xuXG4gIGlmICghIXBjICYmIChwYy5yZWFkeVN0YXRlICE9PSAnY2xvc2VkJyB8fCBwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ2Nsb3NlZCcpKSB7XG4gICAgcGMuY2xvc2UoKTtcbiAgICBjb25uZWN0aW9uLnBjID0gbnVsbDtcbiAgfVxufVxuXG5OZWdvdGlhdG9yLl9tYWtlT2ZmZXIgPSBmdW5jdGlvbihjb25uZWN0aW9uKSB7XG4gIHZhciBwYyA9IGNvbm5lY3Rpb24ucGM7XG4gIHBjLmNyZWF0ZU9mZmVyKGZ1bmN0aW9uKG9mZmVyKSB7XG4gICAgdXRpbC5sb2coJ0NyZWF0ZWQgb2ZmZXIuJyk7XG5cbiAgICBpZiAoIXV0aWwuc3VwcG9ydHMuc2N0cCAmJiBjb25uZWN0aW9uLnR5cGUgPT09ICdkYXRhJyAmJiBjb25uZWN0aW9uLnJlbGlhYmxlKSB7XG4gICAgICBvZmZlci5zZHAgPSBSZWxpYWJsZS5oaWdoZXJCYW5kd2lkdGhTRFAob2ZmZXIuc2RwKTtcbiAgICB9XG5cbiAgICBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKG9mZmVyLCBmdW5jdGlvbigpIHtcbiAgICAgIHV0aWwubG9nKCdTZXQgbG9jYWxEZXNjcmlwdGlvbjogb2ZmZXInLCAnZm9yOicsIGNvbm5lY3Rpb24ucGVlcik7XG4gICAgICBjb25uZWN0aW9uLnByb3ZpZGVyLnNvY2tldC5zZW5kKHtcbiAgICAgICAgdHlwZTogJ09GRkVSJyxcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIHNkcDogb2ZmZXIsXG4gICAgICAgICAgdHlwZTogY29ubmVjdGlvbi50eXBlLFxuICAgICAgICAgIGxhYmVsOiBjb25uZWN0aW9uLmxhYmVsLFxuICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbi5pZCxcbiAgICAgICAgICByZWxpYWJsZTogY29ubmVjdGlvbi5yZWxpYWJsZSxcbiAgICAgICAgICBzZXJpYWxpemF0aW9uOiBjb25uZWN0aW9uLnNlcmlhbGl6YXRpb24sXG4gICAgICAgICAgbWV0YWRhdGE6IGNvbm5lY3Rpb24ubWV0YWRhdGEsXG4gICAgICAgICAgYnJvd3NlcjogdXRpbC5icm93c2VyXG4gICAgICAgIH0sXG4gICAgICAgIGRzdDogY29ubmVjdGlvbi5wZWVyXG4gICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbm5lY3Rpb24ucHJvdmlkZXIuZW1pdEVycm9yKCd3ZWJydGMnLCBlcnIpO1xuICAgICAgdXRpbC5sb2coJ0ZhaWxlZCB0byBzZXRMb2NhbERlc2NyaXB0aW9uLCAnLCBlcnIpO1xuICAgIH0pO1xuICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICBjb25uZWN0aW9uLnByb3ZpZGVyLmVtaXRFcnJvcignd2VicnRjJywgZXJyKTtcbiAgICB1dGlsLmxvZygnRmFpbGVkIHRvIGNyZWF0ZU9mZmVyLCAnLCBlcnIpO1xuICB9LCBjb25uZWN0aW9uLm9wdGlvbnMuY29uc3RyYWludHMpO1xufVxuXG5OZWdvdGlhdG9yLl9tYWtlQW5zd2VyID0gZnVuY3Rpb24oY29ubmVjdGlvbikge1xuICB2YXIgcGMgPSBjb25uZWN0aW9uLnBjO1xuXG4gIHBjLmNyZWF0ZUFuc3dlcihmdW5jdGlvbihhbnN3ZXIpIHtcbiAgICB1dGlsLmxvZygnQ3JlYXRlZCBhbnN3ZXIuJyk7XG5cbiAgICBpZiAoIXV0aWwuc3VwcG9ydHMuc2N0cCAmJiBjb25uZWN0aW9uLnR5cGUgPT09ICdkYXRhJyAmJiBjb25uZWN0aW9uLnJlbGlhYmxlKSB7XG4gICAgICBhbnN3ZXIuc2RwID0gUmVsaWFibGUuaGlnaGVyQmFuZHdpZHRoU0RQKGFuc3dlci5zZHApO1xuICAgIH1cblxuICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oYW5zd2VyLCBmdW5jdGlvbigpIHtcbiAgICAgIHV0aWwubG9nKCdTZXQgbG9jYWxEZXNjcmlwdGlvbjogYW5zd2VyJywgJ2ZvcjonLCBjb25uZWN0aW9uLnBlZXIpO1xuICAgICAgY29ubmVjdGlvbi5wcm92aWRlci5zb2NrZXQuc2VuZCh7XG4gICAgICAgIHR5cGU6ICdBTlNXRVInLFxuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgc2RwOiBhbnN3ZXIsXG4gICAgICAgICAgdHlwZTogY29ubmVjdGlvbi50eXBlLFxuICAgICAgICAgIGNvbm5lY3Rpb25JZDogY29ubmVjdGlvbi5pZCxcbiAgICAgICAgICBicm93c2VyOiB1dGlsLmJyb3dzZXJcbiAgICAgICAgfSxcbiAgICAgICAgZHN0OiBjb25uZWN0aW9uLnBlZXJcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgY29ubmVjdGlvbi5wcm92aWRlci5lbWl0RXJyb3IoJ3dlYnJ0YycsIGVycik7XG4gICAgICB1dGlsLmxvZygnRmFpbGVkIHRvIHNldExvY2FsRGVzY3JpcHRpb24sICcsIGVycik7XG4gICAgfSk7XG4gIH0sIGZ1bmN0aW9uKGVycikge1xuICAgIGNvbm5lY3Rpb24ucHJvdmlkZXIuZW1pdEVycm9yKCd3ZWJydGMnLCBlcnIpO1xuICAgIHV0aWwubG9nKCdGYWlsZWQgdG8gY3JlYXRlIGFuc3dlciwgJywgZXJyKTtcbiAgfSk7XG59XG5cbi8qKiBIYW5kbGUgYW4gU0RQLiAqL1xuTmVnb3RpYXRvci5oYW5kbGVTRFAgPSBmdW5jdGlvbih0eXBlLCBjb25uZWN0aW9uLCBzZHApIHtcbiAgc2RwID0gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihzZHApO1xuICB2YXIgcGMgPSBjb25uZWN0aW9uLnBjO1xuXG4gIHV0aWwubG9nKCdTZXR0aW5nIHJlbW90ZSBkZXNjcmlwdGlvbicsIHNkcCk7XG4gIHBjLnNldFJlbW90ZURlc2NyaXB0aW9uKHNkcCwgZnVuY3Rpb24oKSB7XG4gICAgdXRpbC5sb2coJ1NldCByZW1vdGVEZXNjcmlwdGlvbjonLCB0eXBlLCAnZm9yOicsIGNvbm5lY3Rpb24ucGVlcik7XG5cbiAgICBpZiAodHlwZSA9PT0gJ09GRkVSJykge1xuICAgICAgTmVnb3RpYXRvci5fbWFrZUFuc3dlcihjb25uZWN0aW9uKTtcbiAgICB9XG4gIH0sIGZ1bmN0aW9uKGVycikge1xuICAgIGNvbm5lY3Rpb24ucHJvdmlkZXIuZW1pdEVycm9yKCd3ZWJydGMnLCBlcnIpO1xuICAgIHV0aWwubG9nKCdGYWlsZWQgdG8gc2V0UmVtb3RlRGVzY3JpcHRpb24sICcsIGVycik7XG4gIH0pO1xufVxuXG4vKiogSGFuZGxlIGEgY2FuZGlkYXRlLiAqL1xuTmVnb3RpYXRvci5oYW5kbGVDYW5kaWRhdGUgPSBmdW5jdGlvbihjb25uZWN0aW9uLCBpY2UpIHtcbiAgdmFyIGNhbmRpZGF0ZSA9IGljZS5jYW5kaWRhdGU7XG4gIHZhciBzZHBNTGluZUluZGV4ID0gaWNlLnNkcE1MaW5lSW5kZXg7XG4gIGNvbm5lY3Rpb24ucGMuYWRkSWNlQ2FuZGlkYXRlKG5ldyBSVENJY2VDYW5kaWRhdGUoe1xuICAgIHNkcE1MaW5lSW5kZXg6IHNkcE1MaW5lSW5kZXgsXG4gICAgY2FuZGlkYXRlOiBjYW5kaWRhdGVcbiAgfSkpO1xuICB1dGlsLmxvZygnQWRkZWQgSUNFIGNhbmRpZGF0ZSBmb3I6JywgY29ubmVjdGlvbi5wZWVyKTtcbn1cbi8qKlxuICogQW4gYWJzdHJhY3Rpb24gb24gdG9wIG9mIFdlYlNvY2tldHMgYW5kIFhIUiBzdHJlYW1pbmcgdG8gcHJvdmlkZSBmYXN0ZXN0XG4gKiBwb3NzaWJsZSBjb25uZWN0aW9uIGZvciBwZWVycy5cbiAqL1xuZnVuY3Rpb24gU29ja2V0KHNlY3VyZSwgaG9zdCwgcG9ydCwgcGF0aCwga2V5KSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTb2NrZXQpKSByZXR1cm4gbmV3IFNvY2tldChzZWN1cmUsIGhvc3QsIHBvcnQsIHBhdGgsIGtleSk7XG5cbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgLy8gRGlzY29ubmVjdGVkIG1hbnVhbGx5LlxuICB0aGlzLmRpc2Nvbm5lY3RlZCA9IGZhbHNlO1xuICB0aGlzLl9xdWV1ZSA9IFtdO1xuXG4gIHZhciBodHRwUHJvdG9jb2wgPSBzZWN1cmUgPyAnaHR0cHM6Ly8nIDogJ2h0dHA6Ly8nO1xuICB2YXIgd3NQcm90b2NvbCA9IHNlY3VyZSA/ICd3c3M6Ly8nIDogJ3dzOi8vJztcbiAgdGhpcy5faHR0cFVybCA9IGh0dHBQcm90b2NvbCArIGhvc3QgKyAnOicgKyBwb3J0ICsgcGF0aCArIGtleTtcbiAgdGhpcy5fd3NVcmwgPSB3c1Byb3RvY29sICsgaG9zdCArICc6JyArIHBvcnQgKyBwYXRoICsgJ3BlZXJqcz9rZXk9JyArIGtleTtcbn1cblxudXRpbC5pbmhlcml0cyhTb2NrZXQsIEV2ZW50RW1pdHRlcik7XG5cblxuLyoqIENoZWNrIGluIHdpdGggSUQgb3IgZ2V0IG9uZSBmcm9tIHNlcnZlci4gKi9cblNvY2tldC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbihpZCwgdG9rZW4pIHtcbiAgdGhpcy5pZCA9IGlkO1xuXG4gIHRoaXMuX2h0dHBVcmwgKz0gJy8nICsgaWQgKyAnLycgKyB0b2tlbjtcbiAgdGhpcy5fd3NVcmwgKz0gJyZpZD0nICsgaWQgKyAnJnRva2VuPScgKyB0b2tlbjtcblxuICB0aGlzLl9zdGFydFhoclN0cmVhbSgpO1xuICB0aGlzLl9zdGFydFdlYlNvY2tldCgpO1xufVxuXG5cbi8qKiBTdGFydCB1cCB3ZWJzb2NrZXQgY29tbXVuaWNhdGlvbnMuICovXG5Tb2NrZXQucHJvdG90eXBlLl9zdGFydFdlYlNvY2tldCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodGhpcy5fc29ja2V0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fc29ja2V0ID0gbmV3IFdlYlNvY2tldCh0aGlzLl93c1VybCk7XG5cbiAgdGhpcy5fc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgIHNlbGYuZW1pdCgnbWVzc2FnZScsIGRhdGEpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgdXRpbC5sb2coJ0ludmFsaWQgc2VydmVyIG1lc3NhZ2UnLCBldmVudC5kYXRhKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5fc29ja2V0Lm9uY2xvc2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHV0aWwubG9nKCdTb2NrZXQgY2xvc2VkLicpO1xuICAgIHNlbGYuZGlzY29ubmVjdGVkID0gdHJ1ZTtcbiAgICBzZWxmLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcpO1xuICB9O1xuXG4gIC8vIFRha2UgY2FyZSBvZiB0aGUgcXVldWUgb2YgY29ubmVjdGlvbnMgaWYgbmVjZXNzYXJ5IGFuZCBtYWtlIHN1cmUgUGVlciBrbm93c1xuICAvLyBzb2NrZXQgaXMgb3Blbi5cbiAgdGhpcy5fc29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChzZWxmLl90aW1lb3V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fdGltZW91dCk7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYuX2h0dHAuYWJvcnQoKTtcbiAgICAgICAgc2VsZi5faHR0cCA9IG51bGw7XG4gICAgICB9LCA1MDAwKTtcbiAgICB9XG4gICAgc2VsZi5fc2VuZFF1ZXVlZE1lc3NhZ2VzKCk7XG4gICAgdXRpbC5sb2coJ1NvY2tldCBvcGVuJyk7XG4gIH07XG59XG5cbi8qKiBTdGFydCBYSFIgc3RyZWFtaW5nLiAqL1xuU29ja2V0LnByb3RvdHlwZS5fc3RhcnRYaHJTdHJlYW0gPSBmdW5jdGlvbihuKSB7XG4gIHRyeSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX2h0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB0aGlzLl9odHRwLl9pbmRleCA9IDE7XG4gICAgdGhpcy5faHR0cC5fc3RyZWFtSW5kZXggPSBuIHx8IDA7XG4gICAgdGhpcy5faHR0cC5vcGVuKCdwb3N0JywgdGhpcy5faHR0cFVybCArICcvaWQ/aT0nICsgdGhpcy5faHR0cC5fc3RyZWFtSW5kZXgsIHRydWUpO1xuICAgIHRoaXMuX2h0dHAub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gSWYgd2UgZ2V0IGFuIGVycm9yLCBsaWtlbHkgc29tZXRoaW5nIHdlbnQgd3JvbmcuXG4gICAgICAvLyBTdG9wIHN0cmVhbWluZy5cbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl90aW1lb3V0KTtcbiAgICAgIHNlbGYuZW1pdCgnZGlzY29ubmVjdGVkJyk7XG4gICAgfVxuICAgIHRoaXMuX2h0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDIgJiYgdGhpcy5vbGQpIHtcbiAgICAgICAgdGhpcy5vbGQuYWJvcnQoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMub2xkO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnJlYWR5U3RhdGUgPiAyICYmIHRoaXMuc3RhdHVzID09PSAyMDAgJiYgdGhpcy5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgc2VsZi5faGFuZGxlU3RyZWFtKHRoaXMpO1xuICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5faHR0cC5zZW5kKG51bGwpO1xuICAgIHRoaXMuX3NldEhUVFBUaW1lb3V0KCk7XG4gIH0gY2F0Y2goZSkge1xuICAgIHV0aWwubG9nKCdYTUxIdHRwUmVxdWVzdCBub3QgYXZhaWxhYmxlOyBkZWZhdWx0aW5nIHRvIFdlYlNvY2tldHMnKTtcbiAgfVxufVxuXG5cbi8qKiBIYW5kbGVzIG9ucmVhZHlzdGF0ZWNoYW5nZSByZXNwb25zZSBhcyBhIHN0cmVhbS4gKi9cblNvY2tldC5wcm90b3R5cGUuX2hhbmRsZVN0cmVhbSA9IGZ1bmN0aW9uKGh0dHApIHtcbiAgLy8gMyBhbmQgNCBhcmUgbG9hZGluZy9kb25lIHN0YXRlLiBBbGwgb3RoZXJzIGFyZSBub3QgcmVsZXZhbnQuXG4gIHZhciBtZXNzYWdlcyA9IGh0dHAucmVzcG9uc2VUZXh0LnNwbGl0KCdcXG4nKTtcblxuICAvLyBDaGVjayB0byBzZWUgaWYgYW55dGhpbmcgbmVlZHMgdG8gYmUgcHJvY2Vzc2VkIG9uIGJ1ZmZlci5cbiAgaWYgKGh0dHAuX2J1ZmZlcikge1xuICAgIHdoaWxlIChodHRwLl9idWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGluZGV4ID0gaHR0cC5fYnVmZmVyLnNoaWZ0KCk7XG4gICAgICB2YXIgYnVmZmVyZWRNZXNzYWdlID0gbWVzc2FnZXNbaW5kZXhdO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYnVmZmVyZWRNZXNzYWdlID0gSlNPTi5wYXJzZShidWZmZXJlZE1lc3NhZ2UpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGh0dHAuX2J1ZmZlci5zaGlmdChpbmRleCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdGhpcy5lbWl0KCdtZXNzYWdlJywgYnVmZmVyZWRNZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgbWVzc2FnZSA9IG1lc3NhZ2VzW2h0dHAuX2luZGV4XTtcbiAgaWYgKG1lc3NhZ2UpIHtcbiAgICBodHRwLl9pbmRleCArPSAxO1xuICAgIC8vIEJ1ZmZlcmluZy0tdGhpcyBtZXNzYWdlIGlzIGluY29tcGxldGUgYW5kIHdlJ2xsIGdldCB0byBpdCBuZXh0IHRpbWUuXG4gICAgLy8gVGhpcyBjaGVja3MgaWYgdGhlIGh0dHBSZXNwb25zZSBlbmRlZCBpbiBhIGBcXG5gLCBpbiB3aGljaCBjYXNlIHRoZSBsYXN0XG4gICAgLy8gZWxlbWVudCBvZiBtZXNzYWdlcyBzaG91bGQgYmUgdGhlIGVtcHR5IHN0cmluZy5cbiAgICBpZiAoaHR0cC5faW5kZXggPT09IG1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgaWYgKCFodHRwLl9idWZmZXIpIHtcbiAgICAgICAgaHR0cC5fYnVmZmVyID0gW107XG4gICAgICB9XG4gICAgICBodHRwLl9idWZmZXIucHVzaChodHRwLl9pbmRleCAtIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICB1dGlsLmxvZygnSW52YWxpZCBzZXJ2ZXIgbWVzc2FnZScsIG1lc3NhZ2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmVtaXQoJ21lc3NhZ2UnLCBtZXNzYWdlKTtcbiAgICB9XG4gIH1cbn1cblxuU29ja2V0LnByb3RvdHlwZS5fc2V0SFRUUFRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICB2YXIgb2xkID0gc2VsZi5faHR0cDtcbiAgICBpZiAoIXNlbGYuX3dzT3BlbigpKSB7XG4gICAgICBzZWxmLl9zdGFydFhoclN0cmVhbShvbGQuX3N0cmVhbUluZGV4ICsgMSk7XG4gICAgICBzZWxmLl9odHRwLm9sZCA9IG9sZDtcbiAgICB9IGVsc2Uge1xuICAgICAgb2xkLmFib3J0KCk7XG4gICAgfVxuICB9LCAyNTAwMCk7XG59XG5cbi8qKiBJcyB0aGUgd2Vic29ja2V0IGN1cnJlbnRseSBvcGVuPyAqL1xuU29ja2V0LnByb3RvdHlwZS5fd3NPcGVuID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9zb2NrZXQgJiYgdGhpcy5fc29ja2V0LnJlYWR5U3RhdGUgPT0gMTtcbn1cblxuLyoqIFNlbmQgcXVldWVkIG1lc3NhZ2VzLiAqL1xuU29ja2V0LnByb3RvdHlwZS5fc2VuZFF1ZXVlZE1lc3NhZ2VzID0gZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMuX3F1ZXVlLmxlbmd0aDsgaSA8IGlpOyBpICs9IDEpIHtcbiAgICB0aGlzLnNlbmQodGhpcy5fcXVldWVbaV0pO1xuICB9XG59XG5cbi8qKiBFeHBvc2VkIHNlbmQgZm9yIERDICYgUGVlci4gKi9cblNvY2tldC5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgaWYgKHRoaXMuZGlzY29ubmVjdGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSWYgd2UgZGlkbid0IGdldCBhbiBJRCB5ZXQsIHdlIGNhbid0IHlldCBzZW5kIGFueXRoaW5nIHNvIHdlIHNob3VsZCBxdWV1ZVxuICAvLyB1cCB0aGVzZSBtZXNzYWdlcy5cbiAgaWYgKCF0aGlzLmlkKSB7XG4gICAgdGhpcy5fcXVldWUucHVzaChkYXRhKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIWRhdGEudHlwZSkge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCAnSW52YWxpZCBtZXNzYWdlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgaWYgKHRoaXMuX3dzT3BlbigpKSB7XG4gICAgdGhpcy5fc29ja2V0LnNlbmQobWVzc2FnZSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB2YXIgdXJsID0gdGhpcy5faHR0cFVybCArICcvJyArIGRhdGEudHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgIGh0dHAub3BlbigncG9zdCcsIHVybCwgdHJ1ZSk7XG4gICAgaHR0cC5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgIGh0dHAuc2VuZChtZXNzYWdlKTtcbiAgfVxufVxuXG5Tb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5kaXNjb25uZWN0ZWQgJiYgdGhpcy5fd3NPcGVuKCkpIHtcbiAgICB0aGlzLl9zb2NrZXQuY2xvc2UoKTtcbiAgICB0aGlzLmRpc2Nvbm5lY3RlZCA9IHRydWU7XG4gIH1cbn1cblxufSkodGhpcyk7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbihmdW5jdGlvbigpIHtcbnZhciBkZWZpbmUsIHJlcXVpcmVNb2R1bGUsIHJlcXVpcmUsIHJlcXVpcmVqcztcblxuKGZ1bmN0aW9uKCkge1xuICB2YXIgcmVnaXN0cnkgPSB7fSwgc2VlbiA9IHt9O1xuXG4gIGRlZmluZSA9IGZ1bmN0aW9uKG5hbWUsIGRlcHMsIGNhbGxiYWNrKSB7XG4gICAgcmVnaXN0cnlbbmFtZV0gPSB7IGRlcHM6IGRlcHMsIGNhbGxiYWNrOiBjYWxsYmFjayB9O1xuICB9O1xuXG4gIHJlcXVpcmVqcyA9IHJlcXVpcmUgPSByZXF1aXJlTW9kdWxlID0gZnVuY3Rpb24obmFtZSkge1xuICByZXF1aXJlanMuX2Vha19zZWVuID0gcmVnaXN0cnk7XG5cbiAgICBpZiAoc2VlbltuYW1lXSkgeyByZXR1cm4gc2VlbltuYW1lXTsgfVxuICAgIHNlZW5bbmFtZV0gPSB7fTtcblxuICAgIGlmICghcmVnaXN0cnlbbmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIG1vZHVsZSBcIiArIG5hbWUpO1xuICAgIH1cblxuICAgIHZhciBtb2QgPSByZWdpc3RyeVtuYW1lXSxcbiAgICAgICAgZGVwcyA9IG1vZC5kZXBzLFxuICAgICAgICBjYWxsYmFjayA9IG1vZC5jYWxsYmFjayxcbiAgICAgICAgcmVpZmllZCA9IFtdLFxuICAgICAgICBleHBvcnRzO1xuXG4gICAgZm9yICh2YXIgaT0wLCBsPWRlcHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgaWYgKGRlcHNbaV0gPT09ICdleHBvcnRzJykge1xuICAgICAgICByZWlmaWVkLnB1c2goZXhwb3J0cyA9IHt9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlaWZpZWQucHVzaChyZXF1aXJlTW9kdWxlKHJlc29sdmUoZGVwc1tpXSkpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBjYWxsYmFjay5hcHBseSh0aGlzLCByZWlmaWVkKTtcbiAgICByZXR1cm4gc2VlbltuYW1lXSA9IGV4cG9ydHMgfHwgdmFsdWU7XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlKGNoaWxkKSB7XG4gICAgICBpZiAoY2hpbGQuY2hhckF0KDApICE9PSAnLicpIHsgcmV0dXJuIGNoaWxkOyB9XG4gICAgICB2YXIgcGFydHMgPSBjaGlsZC5zcGxpdChcIi9cIik7XG4gICAgICB2YXIgcGFyZW50QmFzZSA9IG5hbWUuc3BsaXQoXCIvXCIpLnNsaWNlKDAsIC0xKTtcblxuICAgICAgZm9yICh2YXIgaT0wLCBsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgICAgICBpZiAocGFydCA9PT0gJy4uJykgeyBwYXJlbnRCYXNlLnBvcCgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHBhcnQgPT09ICcuJykgeyBjb250aW51ZTsgfVxuICAgICAgICBlbHNlIHsgcGFyZW50QmFzZS5wdXNoKHBhcnQpOyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwYXJlbnRCYXNlLmpvaW4oXCIvXCIpO1xuICAgIH1cbiAgfTtcbn0pKCk7XG5cbmRlZmluZShcInByb21pc2UvYWxsXCIsIFxuICBbXCIuL3V0aWxzXCIsXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2RlcGVuZGVuY3kxX18sIF9fZXhwb3J0c19fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgLyogZ2xvYmFsIHRvU3RyaW5nICovXG5cbiAgICB2YXIgaXNBcnJheSA9IF9fZGVwZW5kZW5jeTFfXy5pc0FycmF5O1xuICAgIHZhciBpc0Z1bmN0aW9uID0gX19kZXBlbmRlbmN5MV9fLmlzRnVuY3Rpb247XG5cbiAgICAvKipcbiAgICAgIFJldHVybnMgYSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIHRoZSBnaXZlbiBwcm9taXNlcyBoYXZlIGJlZW5cbiAgICAgIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLiBUaGUgcmV0dXJuIHByb21pc2VcbiAgICAgIGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGFycmF5IHRoYXQgZ2l2ZXMgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZVxuICAgICAgcGFzc2VkIGluIHRoZSBgcHJvbWlzZXNgIGFycmF5IGFyZ3VtZW50LlxuXG4gICAgICBFeGFtcGxlOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZTEgPSBSU1ZQLnJlc29sdmUoMSk7XG4gICAgICB2YXIgcHJvbWlzZTIgPSBSU1ZQLnJlc29sdmUoMik7XG4gICAgICB2YXIgcHJvbWlzZTMgPSBSU1ZQLnJlc29sdmUoMyk7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICAgICAgUlNWUC5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgICAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgUlNWUC5hbGxgIGFyZSByZWplY3RlZCwgdGhlIGZpcnN0IHByb21pc2VcbiAgICAgIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICAgICAgcmVqZWN0aW9uIGhhbmRsZXIuIEZvciBleGFtcGxlOlxuXG4gICAgICBFeGFtcGxlOlxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcHJvbWlzZTEgPSBSU1ZQLnJlc29sdmUoMSk7XG4gICAgICB2YXIgcHJvbWlzZTIgPSBSU1ZQLnJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgICAgIHZhciBwcm9taXNlMyA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICAgICAgdmFyIHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgICAgIFJTVlAuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAgICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAvLyBlcnJvci5tZXNzYWdlID09PSBcIjJcIlxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCBhbGxcbiAgICAgIEBmb3IgUlNWUFxuICAgICAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXNcbiAgICAgIEBwYXJhbSB7U3RyaW5nfSBsYWJlbFxuICAgICAgQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIGFsbCBgcHJvbWlzZXNgIGhhdmUgYmVlblxuICAgICAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuXG4gICAgKi9cbiAgICBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgICAgIGlmICghaXNBcnJheShwcm9taXNlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byBhbGwuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXSwgcmVtYWluaW5nID0gcHJvbWlzZXMubGVuZ3RoLFxuICAgICAgICBwcm9taXNlO1xuXG4gICAgICAgIGlmIChyZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICByZXNvbHZlKFtdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc29sdmVyKGluZGV4KSB7XG4gICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICByZXNvbHZlQWxsKGluZGV4LCB2YWx1ZSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc29sdmVBbGwoaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgcmVzdWx0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0cyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9taXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgICAgIGlmIChwcm9taXNlICYmIGlzRnVuY3Rpb24ocHJvbWlzZS50aGVuKSkge1xuICAgICAgICAgICAgcHJvbWlzZS50aGVuKHJlc29sdmVyKGkpLCByZWplY3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlQWxsKGksIHByb21pc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18uYWxsID0gYWxsO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvYXNhcFwiLCBcbiAgW1wiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgICB2YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBsb2NhbCA9ICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykgPyBnbG9iYWwgOiAodGhpcyA9PT0gdW5kZWZpbmVkPyB3aW5kb3c6dGhpcyk7XG5cbiAgICAvLyBub2RlXG4gICAgZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7IGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYWwuc2V0VGltZW91dChmbHVzaCwgMSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdHVwbGUgPSBxdWV1ZVtpXTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdHVwbGVbMF0sIGFyZyA9IHR1cGxlWzFdO1xuICAgICAgICBjYWxsYmFjayhhcmcpO1xuICAgICAgfVxuICAgICAgcXVldWUgPSBbXTtcbiAgICB9XG5cbiAgICB2YXIgc2NoZWR1bGVGbHVzaDtcblxuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xuICAgIH0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gcXVldWUucHVzaChbY2FsbGJhY2ssIGFyZ10pO1xuICAgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBJZiBsZW5ndGggaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9fZXhwb3J0c19fLmFzYXAgPSBhc2FwO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvY29uZmlnXCIsIFxuICBbXCJleHBvcnRzXCJdLFxuICBmdW5jdGlvbihfX2V4cG9ydHNfXykge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBjb25maWcgPSB7XG4gICAgICBpbnN0cnVtZW50OiBmYWxzZVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjb25maWd1cmUobmFtZSwgdmFsdWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGNvbmZpZ1tuYW1lXSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZ1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5jb25maWcgPSBjb25maWc7XG4gICAgX19leHBvcnRzX18uY29uZmlndXJlID0gY29uZmlndXJlO1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcG9seWZpbGxcIiwgXG4gIFtcIi4vcHJvbWlzZVwiLFwiLi91dGlsc1wiLFwiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19kZXBlbmRlbmN5MV9fLCBfX2RlcGVuZGVuY3kyX18sIF9fZXhwb3J0c19fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgLypnbG9iYWwgc2VsZiovXG4gICAgdmFyIFJTVlBQcm9taXNlID0gX19kZXBlbmRlbmN5MV9fLlByb21pc2U7XG4gICAgdmFyIGlzRnVuY3Rpb24gPSBfX2RlcGVuZGVuY3kyX18uaXNGdW5jdGlvbjtcblxuICAgIGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgICAgICBsb2NhbCA9IHdpbmRvdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH1cblxuICAgICAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID0gXG4gICAgICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgICAgIC8vIFNvbWUgb2YgdGhlc2UgbWV0aG9kcyBhcmUgbWlzc2luZyBmcm9tXG4gICAgICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICAgICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgICAgICBcInJlamVjdFwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAgICAgLy8gT2xkZXIgdmVyc2lvbiBvZiB0aGUgc3BlYyBoYWQgYSByZXNvbHZlciBvYmplY3RcbiAgICAgICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVzb2x2ZTtcbiAgICAgICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgICAgICBsb2NhbC5Qcm9taXNlID0gUlNWUFByb21pc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18ucG9seWZpbGwgPSBwb2x5ZmlsbDtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3Byb21pc2VcIiwgXG4gIFtcIi4vY29uZmlnXCIsXCIuL3V0aWxzXCIsXCIuL2FsbFwiLFwiLi9yYWNlXCIsXCIuL3Jlc29sdmVcIixcIi4vcmVqZWN0XCIsXCIuL2FzYXBcIixcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19kZXBlbmRlbmN5Ml9fLCBfX2RlcGVuZGVuY3kzX18sIF9fZGVwZW5kZW5jeTRfXywgX19kZXBlbmRlbmN5NV9fLCBfX2RlcGVuZGVuY3k2X18sIF9fZGVwZW5kZW5jeTdfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgY29uZmlnID0gX19kZXBlbmRlbmN5MV9fLmNvbmZpZztcbiAgICB2YXIgY29uZmlndXJlID0gX19kZXBlbmRlbmN5MV9fLmNvbmZpZ3VyZTtcbiAgICB2YXIgb2JqZWN0T3JGdW5jdGlvbiA9IF9fZGVwZW5kZW5jeTJfXy5vYmplY3RPckZ1bmN0aW9uO1xuICAgIHZhciBpc0Z1bmN0aW9uID0gX19kZXBlbmRlbmN5Ml9fLmlzRnVuY3Rpb247XG4gICAgdmFyIG5vdyA9IF9fZGVwZW5kZW5jeTJfXy5ub3c7XG4gICAgdmFyIGFsbCA9IF9fZGVwZW5kZW5jeTNfXy5hbGw7XG4gICAgdmFyIHJhY2UgPSBfX2RlcGVuZGVuY3k0X18ucmFjZTtcbiAgICB2YXIgc3RhdGljUmVzb2x2ZSA9IF9fZGVwZW5kZW5jeTVfXy5yZXNvbHZlO1xuICAgIHZhciBzdGF0aWNSZWplY3QgPSBfX2RlcGVuZGVuY3k2X18ucmVqZWN0O1xuICAgIHZhciBhc2FwID0gX19kZXBlbmRlbmN5N19fLmFzYXA7XG5cbiAgICB2YXIgY291bnRlciA9IDA7XG5cbiAgICBjb25maWcuYXN5bmMgPSBhc2FwOyAvLyBkZWZhdWx0IGFzeW5jIGlzIGFzYXA7XG5cbiAgICBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24ocmVzb2x2ZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgICAgIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCB0aGlzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZva2VSZXNvbHZlcihyZXNvbHZlciwgcHJvbWlzZSkge1xuICAgICAgZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihyZXNvbHZlUHJvbWlzZSwgcmVqZWN0UHJvbWlzZSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmVqZWN0UHJvbWlzZShlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB2YXIgaGFzQ2FsbGJhY2sgPSBpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgICBlcnJvciA9IGU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBSRUpFQ1RFRCkge1xuICAgICAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBQRU5ESU5HICAgPSB2b2lkIDA7XG4gICAgdmFyIFNFQUxFRCAgICA9IDA7XG4gICAgdmFyIEZVTEZJTExFRCA9IDE7XG4gICAgdmFyIFJFSkVDVEVEICA9IDI7XG5cbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwdWJsaXNoKHByb21pc2UsIHNldHRsZWQpIHtcbiAgICAgIHZhciBjaGlsZCwgY2FsbGJhY2ssIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnMsIGRldGFpbCA9IHByb21pc2UuX2RldGFpbDtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgICAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgICAgIGNvbnN0cnVjdG9yOiBQcm9taXNlLFxuXG4gICAgICBfc3RhdGU6IHVuZGVmaW5lZCxcbiAgICAgIF9kZXRhaWw6IHVuZGVmaW5lZCxcbiAgICAgIF9zdWJzY3JpYmVyczogdW5kZWZpbmVkLFxuXG4gICAgICB0aGVuOiBmdW5jdGlvbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHRoZW5Qcm9taXNlID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZnVuY3Rpb24oKSB7fSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3N0YXRlKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGFyZ3VtZW50cztcbiAgICAgICAgICBjb25maWcuYXN5bmMoZnVuY3Rpb24gaW52b2tlUHJvbWlzZUNhbGxiYWNrKCkge1xuICAgICAgICAgICAgaW52b2tlQ2FsbGJhY2socHJvbWlzZS5fc3RhdGUsIHRoZW5Qcm9taXNlLCBjYWxsYmFja3NbcHJvbWlzZS5fc3RhdGUgLSAxXSwgcHJvbWlzZS5fZGV0YWlsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdWJzY3JpYmUodGhpcywgdGhlblByb21pc2UsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGVuUHJvbWlzZTtcbiAgICAgIH0sXG5cbiAgICAgICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBQcm9taXNlLmFsbCA9IGFsbDtcbiAgICBQcm9taXNlLnJhY2UgPSByYWNlO1xuICAgIFByb21pc2UucmVzb2x2ZSA9IHN0YXRpY1Jlc29sdmU7XG4gICAgUHJvbWlzZS5yZWplY3QgPSBzdGF0aWNSZWplY3Q7XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgdmFyIHRoZW4gPSBudWxsLFxuICAgICAgcmVzb2x2ZWQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgdGhlbiA9IHZhbHVlLnRoZW47XG5cbiAgICAgICAgICBpZiAoaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICBpZiAodmFsdWUgIT09IHZhbCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmdWxmaWxsKHByb21pc2UsIHZhbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgIHJlamVjdChwcm9taXNlLCB2YWwpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmICghaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpKSB7XG4gICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gU0VBTEVEO1xuICAgICAgcHJvbWlzZS5fZGV0YWlsID0gdmFsdWU7XG5cbiAgICAgIGNvbmZpZy5hc3luYyhwdWJsaXNoRnVsZmlsbG1lbnQsIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gU0VBTEVEO1xuICAgICAgcHJvbWlzZS5fZGV0YWlsID0gcmVhc29uO1xuXG4gICAgICBjb25maWcuYXN5bmMocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHVibGlzaEZ1bGZpbGxtZW50KHByb21pc2UpIHtcbiAgICAgIHB1Ymxpc2gocHJvbWlzZSwgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICAgICAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEKTtcbiAgICB9XG5cbiAgICBfX2V4cG9ydHNfXy5Qcm9taXNlID0gUHJvbWlzZTtcbiAgfSk7XG5kZWZpbmUoXCJwcm9taXNlL3JhY2VcIiwgXG4gIFtcIi4vdXRpbHNcIixcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZGVwZW5kZW5jeTFfXywgX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAvKiBnbG9iYWwgdG9TdHJpbmcgKi9cbiAgICB2YXIgaXNBcnJheSA9IF9fZGVwZW5kZW5jeTFfXy5pc0FycmF5O1xuXG4gICAgLyoqXG4gICAgICBgUlNWUC5yYWNlYCBhbGxvd3MgeW91IHRvIHdhdGNoIGEgc2VyaWVzIG9mIHByb21pc2VzIGFuZCBhY3QgYXMgc29vbiBhcyB0aGVcbiAgICAgIGZpcnN0IHByb21pc2UgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2AgYXJndW1lbnQgZnVsZmlsbHMgb3IgcmVqZWN0cy5cblxuICAgICAgRXhhbXBsZTpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmVzb2x2ZShcInByb21pc2UgMVwiKTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcHJvbWlzZTIgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICByZXNvbHZlKFwicHJvbWlzZSAyXCIpO1xuICAgICAgICB9LCAxMDApO1xuICAgICAgfSk7XG5cbiAgICAgIFJTVlAucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAvLyByZXN1bHQgPT09IFwicHJvbWlzZSAyXCIgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgICAgIC8vIHdhcyByZXNvbHZlZC5cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIGBSU1ZQLnJhY2VgIGlzIGRldGVybWluaXN0aWMgaW4gdGhhdCBvbmx5IHRoZSBzdGF0ZSBvZiB0aGUgZmlyc3QgY29tcGxldGVkXG4gICAgICBwcm9taXNlIG1hdHRlcnMuIEZvciBleGFtcGxlLCBldmVuIGlmIG90aGVyIHByb21pc2VzIGdpdmVuIHRvIHRoZSBgcHJvbWlzZXNgXG4gICAgICBhcnJheSBhcmd1bWVudCBhcmUgcmVzb2x2ZWQsIGJ1dCB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2UgaGFzIGJlY29tZVxuICAgICAgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWQgcHJvbWlzZVxuICAgICAgd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlMSA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgIHJlc29sdmUoXCJwcm9taXNlIDFcIik7XG4gICAgICAgIH0sIDIwMCk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIHByb21pc2UyID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcInByb21pc2UgMlwiKSk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zIGJlY2F1c2UgdGhlcmUgYXJlIHJlamVjdGVkIHByb21pc2VzIVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09IFwicHJvbWlzZTJcIiBiZWNhdXNlIHByb21pc2UgMiBiZWNhbWUgcmVqZWN0ZWQgYmVmb3JlXG4gICAgICAgIC8vIHByb21pc2UgMSBiZWNhbWUgZnVsZmlsbGVkXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIHJhY2VcbiAgICAgIEBmb3IgUlNWUFxuICAgICAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgdG8gb2JzZXJ2ZVxuICAgICAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsIG9wdGlvbmFsIHN0cmluZyBmb3IgZGVzY3JpYmluZyB0aGUgcHJvbWlzZSByZXR1cm5lZC5cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IGJlY29tZXMgZnVsZmlsbGVkIHdpdGggdGhlIHZhbHVlIHRoZSBmaXJzdFxuICAgICAgY29tcGxldGVkIHByb21pc2VzIGlzIHJlc29sdmVkIHdpdGggaWYgdGhlIGZpcnN0IGNvbXBsZXRlZCBwcm9taXNlIHdhc1xuICAgICAgZnVsZmlsbGVkLCBvciByZWplY3RlZCB3aXRoIHRoZSByZWFzb24gdGhhdCB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2VcbiAgICAgIHdhcyByZWplY3RlZCB3aXRoLlxuICAgICovXG4gICAgZnVuY3Rpb24gcmFjZShwcm9taXNlcykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBQcm9taXNlID0gdGhpcztcblxuICAgICAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW10sIHByb21pc2U7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9taXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgICAgIGlmIChwcm9taXNlICYmIHR5cGVvZiBwcm9taXNlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlKHByb21pc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18ucmFjZSA9IHJhY2U7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS9yZWplY3RcIiwgXG4gIFtcImV4cG9ydHNcIl0sXG4gIGZ1bmN0aW9uKF9fZXhwb3J0c19fKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgLyoqXG4gICAgICBgUlNWUC5yZWplY3RgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkXG4gICAgICBgcmVhc29uYC4gYFJTVlAucmVqZWN0YCBpcyBlc3NlbnRpYWxseSBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgICAgICByZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG4gICAgICB9KTtcblxuICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIHByb21pc2UgPSBSU1ZQLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgcmVqZWN0XG4gICAgICBAZm9yIFJTVlBcbiAgICAgIEBwYXJhbSB7QW55fSByZWFzb24gdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGguXG4gICAgICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBpZGVudGlmeWluZyB0aGUgcmV0dXJuZWQgcHJvbWlzZS5cbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlamVjdGVkIHdpdGggdGhlIGdpdmVuXG4gICAgICBgcmVhc29uYC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlamVjdChyZWFzb24pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18ucmVqZWN0ID0gcmVqZWN0O1xuICB9KTtcbmRlZmluZShcInByb21pc2UvcmVzb2x2ZVwiLCBcbiAgW1wiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBmdW5jdGlvbiByZXNvbHZlKHZhbHVlKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IHRoaXMpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgX19leHBvcnRzX18ucmVzb2x2ZSA9IHJlc29sdmU7XG4gIH0pO1xuZGVmaW5lKFwicHJvbWlzZS91dGlsc1wiLCBcbiAgW1wiZXhwb3J0c1wiXSxcbiAgZnVuY3Rpb24oX19leHBvcnRzX18pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBmdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHgpIHx8ICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJmdW5jdGlvblwiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzQXJyYXkoeCkge1xuICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgIH1cblxuICAgIC8vIERhdGUubm93IGlzIG5vdCBhdmFpbGFibGUgaW4gYnJvd3NlcnMgPCBJRTlcbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL25vdyNDb21wYXRpYmlsaXR5XG4gICAgdmFyIG5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cblxuICAgIF9fZXhwb3J0c19fLm9iamVjdE9yRnVuY3Rpb24gPSBvYmplY3RPckZ1bmN0aW9uO1xuICAgIF9fZXhwb3J0c19fLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuICAgIF9fZXhwb3J0c19fLmlzQXJyYXkgPSBpc0FycmF5O1xuICAgIF9fZXhwb3J0c19fLm5vdyA9IG5vdztcbiAgfSk7XG5yZXF1aXJlTW9kdWxlKCdwcm9taXNlL3BvbHlmaWxsJykucG9seWZpbGwoKTtcbn0oKSk7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBzZXR0aW5nc19sb2NhbCA9IHt9O1xudHJ5IHtcbiAgc2V0dGluZ3NfbG9jYWwgPSByZXF1aXJlKCcuL3NldHRpbmdzX2xvY2FsLmpzJyk7XG59IGNhdGNoIChlKSB7XG59XG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgQVBJX1VSTDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsICAvLyBUaGlzIFVSTCB0byB0aGUgR2FsYXh5IEFQSS4gTm8gdHJhaWxpbmcgc2xhc2guXG4gIFBFRVJfS0VZOiAnZmNkYzRxMmtsamNxNW1pJywgIC8vIFNpZ24gdXAgZm9yIGEga2V5IGF0IGh0dHA6Ly9wZWVyanMuY29tL3BlZXJzZXJ2ZXJcbiAgVkVSU0lPTjogJzAuMC4xJyAgLy8gVmVyc2lvbiBvZiB0aGUgYGdhbWVwYWQuanNgIHNjcmlwdFxufTtcblxuZm9yICh2YXIga2V5IGluIHNldHRpbmdzX2xvY2FsKSB7XG4gIHNldHRpbmdzW2tleV0gPSBzZXR0aW5nc19sb2NhbFtrZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG59O1xuIl19
