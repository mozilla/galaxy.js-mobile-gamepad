var exec = require('child_process').exec;
var path = require('path');

var gulp = require('gulp');
gulp.modules = {};
[
  'concat',
  'jshint',
  'minify-css',
  'rename',
  'serve',
  'symlink',
  'uglify'
].forEach(function (name) {
  gulp.modules[name] = require('gulp-' + name);
});

var duo = require('duo');
var stylish = require('jshint-stylish');
var mapStream = require('map-stream');


var src = 'src';
var paths = {
  src: src,
  build: {
    src: {
      css: [src + '/css/**/*.css'],
      js: [src + '/js/**/*.js'],
      jsHost: [src + '/js/host.js'],
      jsClient: [src + '/js/client.js']
    },
    dest: {
      css: src + '/css',
      js: src + '/js',
      jsHost: './host.bundle.js',
      jsClient: './client.bundle.js'
    }
  },
  minify: {
    src: {
      jsHost: src + '/js/host.bundle.js',
      jsClient: src + '/js/client.bundle.js',
    },
    dest: {
      css: './dist/css',
      js: './dist/js',
      jsHostBasename: 'gamepad-host',
      jsClientBasename: 'gamepad-client'
    }
  }
};


gulp.task('css-build', function () {
  // We're using vanilla CSS, so nothing to do here.
  // Someday we may use a CSS preprocessor (but we really shouldn't).
});


gulp.task('js-build', function () {
  gulp.src(paths.build.src.jsHost)
    .pipe(duoify())
    .pipe(gulp.modules.rename(function (path) {
      path.extname = '.bundle.js';
    }))
    .pipe(gulp.dest(paths.build.dest.js));  // Write to `host.bundle.js`.

  gulp.src(paths.build.src.jsClient)
    .pipe(duoify())
    .pipe(gulp.modules.rename(function (path) {
      path.extname = '.bundle.js';
    }))
    .pipe(gulp.dest(paths.build.dest.js));  // Write to `client.bundle.js`.
});


gulp.task('css-minify', ['css-build'], function () {
  return gulp.src(paths.build.src.css)
    .pipe(gulp.modules['minify-css']())
    .pipe(gulp.modules.rename(function (path) {
      path.extname = '.min.css';
    }))
    .pipe(gulp.dest(paths.minify.dest.css));
});


gulp.task('js-minify', ['js-build'], function () {
  gulp.src(paths.minify.src.jsHost)
    .pipe(gulp.modules.rename(function (path) {
      path.basename = paths.minify.dest.jsHostBasename;
    }))
    .pipe(gulp.dest(paths.minify.dest.js))  // uncompressed
    .pipe(gulp.modules.uglify())
    .pipe(gulp.modules.rename(function (path) {
      console.log(path);
      path.extname = '.min.js';
      console.log(path);
    }))
    .pipe(gulp.dest(paths.minify.dest.js));  // minified

  gulp.src(paths.minify.src.jsClient)
    .pipe(gulp.modules.rename(function (path) {
      path.basename = paths.minify.dest.jsClientBasename;
    }))
    .pipe(gulp.dest(paths.minify.dest.js))  // uncompressed
    .pipe(gulp.modules.uglify())
    .pipe(gulp.modules.rename(function (path) {
      path.extname = '.min.js';
    }))
    .pipe(gulp.dest(paths.minify.dest.js));  // minified
});


gulp.task('js-lint', function () {
  return gulp.src([
      src + '/js/**/*.js',
      '!' + src + '/js/external/**/*.js',
      '!**/*.bundle.js'
    ])
    .pipe(gulp.modules.jshint({
      esnext: true
    }))
    .pipe(gulp.modules.jshint.reporter(stylish));
});


gulp.task('symlink-git-hooks', function () {
  return gulp.src('scripts/git_hooks/*')
    .pipe(gulp.modules.symlink('.git/hooks/'))
    .pipe(gulp.dest('.git/hooks/'));
});


gulp.task('dev', ['build'], function () {
  gulp.watch(paths.build.src.css, ['css-build']);
  gulp.watch(paths.build.src.js, ['js-lint', 'js-build']);
});

gulp.task('prod', ['default']);


gulp.task('serve', gulp.modules.serve({
  root: ['src', 'dist'],
  port: process.env.PORT
}));

gulp.task('serve-dev', ['serve']);

gulp.task('serve-prod', gulp.modules.serve({
  root: 'dist',
  port: process.env.PORT,
}));


gulp.task('build', ['js-lint', 'css-build', 'js-build']);


gulp.task('minify', ['js-lint', 'css-minify', 'js-minify']);


gulp.task('default', ['minify']);


function duoify() {
  return mapStream(function (file, func) {
    duo(path.join(__dirname, paths.src))
      .entry(file.path)
      .run(function (err, src) {
        if (err) {
          return func(err);
        }

        file.contents = new Buffer(src);
        func(null, file);
      });
  });
}
