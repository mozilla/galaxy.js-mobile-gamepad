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

function isFullscreen() {
  return (document.fullscreenElement &&
          document.fullscreenElement !== null) ||  // standard methods
    document.mozFullScreen ||
    document.webkitIsFullScreen;  // vendor-prefixed methods
}

function requestFullscreen(doNotLock) {
  if (isFullscreen()) {
    return;
  }
  trace('Entering fullscreen');
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

  if (!doNotLock) {
    lockOrientation('landscape-primary');
  }
}

function exitFullscreen() {
  if (!isFullscreen()) {
    return;
  }
  trace('Exiting fullscreen');
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

function toggleFullscreen() {
  if (isFullscreen()) {
    exitFullscreen();
  } else {
    requestFullscreen();
  }
}


function lockOrientation(orientation) {
  // Must check each individual because of a Firefox TypeError
  if ('lockOrientation' in window.screen) {
    return window.screen.lockOrientation(orientation);
  }
  if ('mozLockOrientation' in window.screen) {
    return window.screen.mozLockOrientation(orientation);
  }
  if ('webkitLockOrientation' in window.screen) {
    return window.screen.webkitLockOrientation(orientation);
  }
  if ('msLockOrientation' in window.screen) {
    return window.screen.msLockOrientation(orientation);
  }
  return warn('Orientation could not be locked');
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
  isFullscreen: isFullscreen,
  requestFullscreen: requestFullscreen,
  exitFullscreen: exitFullscreen,
  toggleFullscreen: toggleFullscreen,
  lockOrientation: lockOrientation,
  triggerEvent: triggerEvent
};

};
