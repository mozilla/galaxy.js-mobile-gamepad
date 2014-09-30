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
