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
