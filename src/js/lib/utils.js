function trace(text, level) {
  console[level || 'log']((window.performance.now() / 1000).toFixed(3) + ': ' + text);
}


function error(text) {
  return trace(text, 'error');
}


function warn(text) {
  return trace(text, 'warn');
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


module.exports.trace = trace;
module.exports.error = error;
module.exports.warn = warn;
module.exports.getPeerId = getPeerId;
module.exports.fieldFocused = fieldFocused;
module.exports.hasTouchEvents = hasTouchEvents;
module.exports.injectCSS = injectCSS;
module.exports.escape = escape;
module.exports.isFullScreen = isFullScreen;
module.exports.toggleFullScreen = toggleFullScreen;
module.exports.lockOrientation = lockOrientation;
