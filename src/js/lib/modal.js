module.exports = function (window, document) {
'use strict';

var utils = require('./utils')(window, document);


function Modal(opts, inject) {
  // Create properties for `id`, `classes`, `title`, and `content`.
  Object.keys(opts).forEach(function (key) {
    this[key] = opts[key];
  }.bind(this));

  if (inject) {
    this.inject();
  }
}

Modal.closeAll = Modal.prototype.close = function () {
  // Close any open modal.
  var openedModal = document.querySelector('.md-show');
  if (openedModal) {
    openedModal.classList.remove('md-show');
    utils.trace('Closed modal');
  }
  // TODO: Wait until transition end.
  setTimeout(function () {
    document.body.classList.remove('galaxy-overlayed');
    utils.trace('Hid overlay');
  }, 150);
};

Modal.injectOverlay = function () {
  utils.trace('Injected overlay');
  // Inject the overlay we use for overlaying it behind modals.
  if (!document.querySelector('.md-overlay')) {
    var d = document.createElement('div');
    d.className = 'md-overlay';
    document.body.appendChild(d);
    utils.trace('Added overlay');
  }
};

Modal.prototype.html = function () {
  var d = document.createElement('div');
  d.id = 'modal-' + this.id;
  d.className = 'md-modal md-effect-1 ' + (this.classes || '');
  d.style.display = 'none';
  d.innerHTML = (
    '<div class="md-content">' +
      '<h3>' + utils.escape(this.title) + '</h3> ' +
      '<a class="md-close" title="Close"><span><div>Close</div></span></a>' +
      '<div>' + this.content + '</div>' +
    '</div>'
  );

  utils.trace('Created modal DOM');

  return d;
};

Modal.prototype.inject = function () {
  Modal.injectOverlay();

  this.el = this.html();

  // TODO: Replace `setTimeout`s with `transitionend` event listeners (#33).
  window.setTimeout(function () {
    this.el.style.display = 'block';
  }.bind(this), 150);

  document.body.appendChild(this.el);
  document.body.classList.add('galaxy-overlayed');

  utils.trace('Injected modal');

  return this.el;
};

Modal.prototype.open = function () {
  return new Promise(function () {
    utils.trace('Opened modal');
    return this.el.classList.add('md-show');
  }.bind(this));
};


return Modal;

};
