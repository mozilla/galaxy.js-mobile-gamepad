# galaxy.js-mobile-gamepad 🎮

A JavaScript library for controlling an HTML5 game using WebRTC (falling back to WebSockets).

Used in conjunction with [galaxy.js](https://github.com/mozilla/galaxy.js).

> __Note:__ This project is not ready for prime time. Not an official Mozilla project. Pre-alpha everything. Anything and everything at your own risk.

![screenshot of NES-inspired gamepad](src/img/gamepad-traditional-screenshot.png "screenshot of NES-inspired gamepad")


## Downloads

### Client

* [gamepad-client.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.js)
* [gamepad-client.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.min.js)

### Host

* [gamepad-host.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.js)
* [gamepad-host.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.min.js)


## Use in your own game

> __Disclaimer:__ this isn't ready for prime time yet. Use at your own risk.

1. On the static server, open `client.html` (which will load `gamepad-client.min.js`).
2. In your game, insert this script:

    ```js
    <script src="{static_server}/gamepad-host.min.js">
    ```

3. Add a few lines to your game for pairing the gamepad, getting its state, and adding event listeners. Refer to the [sample games](src/examples) for more complete examples. Below is some code to get you started:

    ```js
    var pad = Gamepad.create();

    pad.pair().then(function (controllerPeer) {
      console.log('Connected to controller');
    }).then(initControls).catch(function (e) {
      console.trace(e.stack ? e.stack : e);
    });

    function initControls() {
      window.requestAnimationFrame(function () {
        // In your game loop check `pad.state`, or you can listen to events.
      });

      pad.on('buttonpress', function (key) {
        // Some button pressed.
      }).on('buttondown', function (key) {
        // Some button pushed down.
      }).on('buttonup', function (key) {
        // Some button released.
      }).on('buttonchange', function (key, isPressed) {
        // Some button changed.
      });

      pad.on('buttonpress.select', function (key) {
        // SELECT button pressed.
      }).on('buttondown.select', function (key) {
        // SELECT button pushed down.
      }).on('buttonup.select', function (key) {
        // SELECT button released.
      }).on('buttonchange.select', function (key, isPressed) {
        // SELECT button changed.
      });
    }

    // Totally optional, but when the user stops playing your game,
    // for example, you can call `destroyControls` to remove any event
    // listeners you have set.
    function destroyControls() {
      // Remove event listener for a particular listener function.
      pad.off('buttonpress', buttonpressHandler);

      // Remove all event listeners for a particular event type.
      pad.off('buttonpress');
    }
    ```

## Develop

1. Install Node dependencies:

        npm install

    This installs these production dependencies:

    * [__plink-server__](https://github.com/oztu/plink-server): a simple Node-based WebSocket server – used as a signalling server for WebRTC
    * [__plink__](https://github.com/oztu/plink): a simple client-side library for WebRTC data channels — used to do peer communication between a game and controllers

    And these developer dependencies:

    * [__browserify__](https://github.com/substack/node-browserify): a tool for packaging Node-flavoured CommonJS modules for the browser — used to compile JS for development and production bundles
    * [__gulp__](https://github.com/gulpjs/gulp/): a streaming build system and task runner — used for such tasks as browserify compilation, code linting, distribution, and running a development server
    * [a bunch of related packages for build tasks](package.json)

2. _(Optional)_ Set up symlinks for updating GitHub pages:

        gulp symlink-git-hooks

3. _(Optional)_ To use custom settings for your local setup, first over a settings file:

        cp src/js/settings_local.js{.dist,}

    Any value specified in `src/js/settings_local.js` will override the defaults in `src/js/settings.js`.

4. To rebuild (compile and minify) the scripts while developing and serve the files from a local server:

        npm run-script dev

5. In another terminal session, start up the signalling server (__plink-server__):

        npm run-script signalling-server

6. Load an [example game](http://localhost:3000/examples/HTML5-Keen/?1234).

7. Load the [Nintendo™-inspired controller](http://localhost:3000/examples/HTML5-Keen/?1234).


## Distribution

To build the files for distribution:

    gulp dist

Several files will be written to the `dist/` directory, including the main application file (uncompressed and minified):

* [gamepad-client.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.js)
* [gamepad-client.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-client.min.js)
* [gamepad-host.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.js)
* [gamepad-host.min.js](https://raw.githubusercontent.com/mozilla/galaxy.js-mobile-gamepad/master/dist/js/gamepad-host.min.js)


## Deploying controller to a production server

1. Install Node dependencies:

        npm install --production

2. Deploy the `dist/` on a server (the "static server" we'll call it).


## Credits

* [Albin Larsson](http://codepen.io/fullkornslimpa/) (unauthorized use of [HTML5 Nintendo™ controller CodePen](http://codepen.io/fullkornslimpa/pen/jxiHd/))
* [Ivan Prieto Garrido](https://dribbble.com/shots/1240163-Nintendo-controler-flat-icon-ios7) (unauthorised, temporary use of Nintendo™ controller flat icon for webapp icon; will replace before project is official)

