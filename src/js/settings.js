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
  VERSION: '0.0.1',

  // Upon any button press, open the controller in fullscreen in a browser.
  // (`true` allows "automatic" fullscreen.)
  GAMEPAD_AUTO_FULLSCREEN: true,

  // Upon pressing the controller's SELECT button, reload the page in browser.
  GAMEPAD_SELECT_RELOAD: false,
};

// Override each default setting with user-defined setting.
Object.keys(settings_local).forEach(function (key) {
  settings[key] = settings_local[key];
});


module.exports = settings;
