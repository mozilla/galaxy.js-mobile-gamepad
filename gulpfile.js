var browserify = require('browserify');
var gulp = require('gulp');
var stylish = require('jshint-stylish');
var source = require('vinyl-source-stream');

var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var minifyCSS = require('gulp-minify-css');
var rename = require('gulp-rename');
var serve = require('gulp-serve');
var streamify = require('gulp-streamify');
var symlink = require('gulp-symlink');
var uglify = require('gulp-uglify');


var src = 'src';
var paths = {
  src: src,
  build: {
    src: {
      css: [src + '/css/**/*.css'],
      js: [src + '/js/**/*.js'],
      jsHost: ['./js/host.js'],
      jsClient: ['./js/client.js']
    },
    dest: {
      css: src + '/css',
      js: src + '/js',
      jsHost: './host.bundle.js',
      jsClient: './client.bundle.js'
    }
  },
  dist: {
    raw: {
      css: './dist/css',
      js: './dist/js',
      jsHost: './gamepad-host.js',
      jsClient: './gamepad-client.js'
    },
    min: {
      css: './dist/css',
      js: './dist/js',
      jsHost: './gamepad-host.min.js',
      jsClient: './gamepad-client.min.js'
    }
  }
};


function bundlify(files, standalone) {
  return browserify({
    basedir: src,
    entries: files,
    debug: process.env.NODE_ENV === 'development',
    standalone: standalone
  });
}


gulp.task('css-build', function () {
  // We're using vanilla CSS, so nothing to do here.
  // Someday we may use a CSS preprocessor (but we really shouldn't).
});


gulp.task('js-build', [
  'js-build-host',
  'js-build-client'
]);

gulp.task('js-build-host', function () {
  // Write to `src/js/host.bundle.js`.
  return bundlify(paths.build.src.jsHost, 'gamepad')
    .bundle()
    .pipe(source(paths.build.dest.jsHost))
    .pipe(gulp.dest(paths.build.dest.js));
});

gulp.task('js-build-client', function () {
  // Write to `src/js/client.bundle.js`.
  return bundlify(paths.build.src.jsClient)
    .bundle()
    .pipe(source(paths.build.dest.jsClient))
    .pipe(gulp.dest(paths.build.dest.js));
});


gulp.task('css-dist', [], function () {
  // TODO: concatenate multiple CSS files.
  return gulp.src(paths.build.src.css)
    .pipe(minifyCSS())
    .pipe(rename(function (path) {
      path.extname = '.min.css';
    }))
    .pipe(gulp.dest(paths.dist.min.css));
});


gulp.task('js-dist', [
  'js-dist-host-raw',
  'js-dist-client-raw',
  'js-dist-host-min',
  'js-dist-client-min'
]);

gulp.task('js-dist-host-raw', ['js-build'], function (jsBuild, _) {
  // // Write to `dist/js/gamepad-host.js`.
  return bundlify(paths.build.src.jsHost, 'gamepad')
    .bundle()
    .pipe(source(paths.dist.raw.jsHost))
    .pipe(gulp.dest(paths.dist.raw.js));
});

gulp.task('js-dist-client-raw', [], function () {
  // Write to `dist/js/gamepad-client.js`.
  return bundlify(paths.build.src.jsClient)
    .bundle()
    .pipe(source(paths.dist.raw.jsClient))
    .pipe(gulp.dest(paths.dist.raw.js));
});

gulp.task('js-dist-host-min', [], function () {
  // Write to `dist/js/gamepad-host.min.js`.
  var hostBundle = bundlify(paths.build.src.jsHost, 'gamepad');

  // Let's uglify before we browserify.
  hostBundle.transform({
    global: true
  }, 'uglifyify');

  hostBundle.bundle()
    .pipe(source(paths.dist.min.jsHost))
    .pipe(streamify(uglify()))  // Uglify again to clean up after browserify.
    .pipe(gulp.dest(paths.dist.min.js));
});

gulp.task('js-dist-client-min', [], function () {
  // Write to `dist/js/gamepad-client.min.js`.
  var clientBundle = bundlify(paths.build.src.jsClient);

  clientBundle.transform({
    global: true
  }, 'uglifyify');

  clientBundle.bundle()
    .pipe(source(paths.dist.min.jsClient))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest(paths.dist.min.js));
});


gulp.task('js-lint', function () {
  return gulp.src([
      '*.js',
      src + '/js/**/*.js',
      '!' + src + '/js/external/**/*.js',
      '!**/*.bundle.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('js-hint', ['js-lint']);


gulp.task('symlink-git-hooks', function () {
  return gulp.src('scripts/git_hooks/*')
    .pipe(symlink('.git/hooks/'))
    .pipe(gulp.dest('.git/hooks/'));
});


gulp.task('dev', ['build'], function () {
  gulp.watch(paths.build.src.css, ['css-build']);
  gulp.watch(paths.build.src.js, ['js-lint', 'js-build']);
});

gulp.task('prod', ['default']);


gulp.task('serve', serve({
  root: ['src', 'dist'],
  port: process.env.PORT
}));

gulp.task('serve-dev', ['serve']);

gulp.task('serve-prod', serve({
  root: 'dist',
  port: process.env.PORT,
}));


// For local development (`src/js/`).
gulp.task('build', ['css-build', 'js-lint', 'js-build']);


// For production (`dist/`).
gulp.task('dist', ['css-dist', 'js-lint', 'js-dist']);


gulp.task('default', ['dist']);
