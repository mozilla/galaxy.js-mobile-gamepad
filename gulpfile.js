var exec = require('child_process').exec;

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

var browserify = require('browserify');
var stylish = require('jshint-stylish');
var source = require('vinyl-source-stream');


var paths = {
  build: {
    src: {
      css: ['src/css/**/*.css'],
      js: ['src/js/**/*.js'],
      jsApp: ['./src/js/host.js'],
      jsClient: ['./src/js/client.js']
    },
    dest: {
      css: './src/css',
      js: './src/js',
      jsApp: './host.bundle.js',
      jsClient: './client.bundle.js'
    }
  },
  minify: {
    src: {
      jsApp: './src/js/host.bundle.js',
      jsClient: './src/js/client.bundle.js',
    },
    dest: {
      css: './dist/css',
      js: './dist/js',
      jsAppBasename: 'gamepad-host',
      jsClientBasename: 'gamepad-client'
    }
  }
};


gulp.task('css-build', function () {
  // We're using vanilla CSS, so nothing to do here.
  // Someday we may use a CSS preprocessor (but we really shouldn't).
});


gulp.task('js-build', function () {
  browserify({
      entries: paths.build.src.jsApp,
      debug: process.env.NODE_ENV === 'development',
      standalone: 'gamepad'
    })
    .bundle()
    .pipe(source(paths.build.dest.jsApp))
    .pipe(gulp.dest(paths.build.dest.js));

  browserify({
      entries: paths.build.src.jsClient,
      debug: process.env.NODE_ENV === 'development'
    })
    .bundle()
    .pipe(source(paths.build.dest.jsClient))
    .pipe(gulp.dest(paths.build.dest.js));
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
  gulp.src(paths.minify.src.jsApp)
    .pipe(gulp.modules.rename(function (path) {
      path.basename = paths.minify.dest.jsAppBasename;
    }))
    .pipe(gulp.dest(paths.minify.dest.js))  // uncompressed
    .pipe(gulp.modules.uglify())
    .pipe(gulp.modules.rename(function (path) {
      path.extname = '.min.js';
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
      './src/js/**/*.js',
      '!./src/js/external/**/*.js',
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


gulp.task('dev', ['default', 'js-lint'], function () {
  gulp.watch(paths.build.src.css, ['css-build']);
  gulp.watch(paths.build.src.js, ['js-build', 'js-lint']);
});

gulp.task('prod', ['default']);


gulp.task('serve', gulp.modules.serve({
  root: 'src',
  port: process.env.PORT
}));

gulp.task('serve-dev', ['serve']);

gulp.task('serve-prod', gulp.modules.serve({
  root: 'dist',
  port: process.env.PORT,
}));


gulp.task('default', ['css-minify', 'js-minify']);
