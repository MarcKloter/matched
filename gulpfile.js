var gulp = require('gulp');
var connect = require('gulp-connect-php');
var sass = require('gulp-sass');
var browserSync = require('browser-sync');
var del = require('del');
var uglify = require('gulp-uglify');
var svgmin = require('gulp-svgmin');
var jsonminify = require('gulp-jsonminify');

gulp.task('sass', function () {
  return gulp.src('app/style/*.scss')
    .pipe(sass())
    .on('error', swallowError)
    .pipe(gulp.dest('app/style'));
});

gulp.task('sass:watch', ['sass'], function () {
  gulp.watch('app/style/*.scss', ['sass']);
});

gulp.task('serve', ['sass:watch'], function() {
  connect.server({ base: 'app', port: 8000 }, function (){ browserSync({ proxy: 'localhost:8000' }); });
  // watch files for changes
  gulp.watch('app/**/*.php').on('change', browserSync.reload);
  gulp.watch('app/style/**/*.css').on('change', browserSync.reload);
  gulp.watch('app/js/**/*.js').on('change', browserSync.reload);
});

gulp.task('clean', function() {
  return del('dist');
});

gulp.task('copy', ['clean'], function() {
  var app = gulp.src([
    'app/**',
    '!app/style/**',
    '!app/style',
    '!app/js/**',
    '!app/js',
    '!app/*.json',
    '!app/img/*.svg'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('minify-css', ['clean'], function(){
  return gulp.src('app/style/*.scss')
      .pipe(sass({outputStyle: 'compressed'}))
      .pipe(gulp.dest('dist/style'));
});

gulp.task('minify-json', ['clean'], function(){
  return gulp.src('app/*.json')
      .pipe(jsonminify())
      .pipe(gulp.dest('dist'));
});

gulp.task('minify-js', ['clean'], function(){
  return gulp.src('app/js/*.js')
      .pipe(uglify())
      .pipe(gulp.dest('dist/js'));
});

gulp.task('minify-svg', ['clean'], function(){
  return gulp.src('app/img/*.svg')
      .pipe(svgmin())
      .pipe(gulp.dest('dist/img'));
});

gulp.task('default', ['copy', 'minify-css', 'minify-js', 'minify-svg', 'minify-json']);

// avoid crash on error
function swallowError (error) {
  console.log(error.toString());
  this.emit('end');
}
