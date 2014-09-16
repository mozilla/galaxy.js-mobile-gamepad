var utils = require('./utils');


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
  }
  // TODO: Wait until transition end.
  setTimeout(function () {
    document.body.classList.remove('galaxy-overlayed');
  }, 150);
};

Modal.injectOverlay = function () {
  // Inject the overlay we use for overlaying it behind modals.
  if (!document.querySelector('.md-overlay')) {
    var d = document.createElement('div');
    d.className = 'md-overlay';
    document.body.appendChild(d);
  }
};

Modal.prototype.html = function () {
  var d = document.createElement('div');
  d.id = 'modal-' + this.id;
  d.className = 'md-modal md-effect-1 ' + (this.classes || '');
  d.innerHTML = (
    '<div class="md-content">' +
      '<h3>' + utils.escape(this.title) + '</h3> ' +
      '<a class="md-close" title="Close"><span><div>Close</div></span></a>' +
      '<div>' + this.content + '</div>' +
    '</div>'
  );
  return d;
};

Modal.prototype.inject = function () {
  Modal.injectOverlay();

  this.el = this.html();

  document.body.appendChild(this.el);
  document.body.classList.add('galaxy-overlayed');

  return this.el;
};

Modal.prototype.open = function () {
  this.el.classList.add('md-show');
};


module.exports = Modal;
