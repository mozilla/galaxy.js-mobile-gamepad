# galaxy.js-mobile-gamepad 🎮

A JavaScript library for controlling an HTML5 game using WebRTC (falling back to WebSockets).

Used in conjunction with [galaxy.js](https://github.com/mozilla/galaxy.js).


## Downloads

### Client

* [gamepad-client.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.js)
* [gamepad-client.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.min.js)

### Host

* [gamepad-host.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.js)
* [gamepad-host.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.min.js)


## Installation

To install Node dependencies:

    npm install

To set up symlinks for updating GitHub pages:

    gulp symlink-git-hooks

To use custom settings for your local setup, first over a settings file:

    cp src/js/settings_local.js{.dist,}

Any value specified in `src/js/settings_local.js` will override the defaults in `src/js/settings.js`.

To recreate the whole experience locally, if you haven't already, make sure you install all of the Node dependencies:

    npm install

This will install [__plink-server__](https://github.com/oztu/plink-server), a simple Node-based WebSocket server which is used as a signalling server in junction with [__plink__](https://github.com/oztu/plink) (a simple client-side library for WebRTC channels).


## Development

Ensure you have installed the Node dependencies:

    npm install

To rebuild (compile and minify) the scripts while developing and serve the files from a local server:

    npm run-script dev

Alternatively:

    NODE_ENVIRONMENT='development' gulp dev serve

In another terminal session, start up the signalling server (__plink-server__):

    npm run-script signalling-server

Alternatively:

    ./node_modules/plink-server/bin/plink-server


## Distribution

To build the files for distribution:

    gulp dist

Several files will be written to the `dist/` directory, including the main application file (uncompressed and minified):

* [gamepad-client.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.js)
* [gamepad-client.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.min.js)
* [gamepad-host.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.js)
* [gamepad-host.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.min.js)
