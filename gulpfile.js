var gulp = require('gulp');
var connect = require('gulp-connect-php');
var sass = require('gulp-sass');
var browserSync = require('browser-sync');

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
  connect.server({ base: 'app', port: 8000 }, function (){ browserSync({ proxy: 'localhost:8000' })});
  // watch files for changes
  gulp.watch('app/**/*.php').on('change', browserSync.reload);
  gulp.watch('app/style/**/*.css').on('change', browserSync.reload);
  gulp.watch('app/js/**/*.js').on('change', browserSync.reload);
});

// avoid crash on error
function swallowError (error) {
  console.log(error.toString());
  this.emit('end');
}
