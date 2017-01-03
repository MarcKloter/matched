/**
 * Helper function to capitalize a String
 * From http://stackoverflow.com/a/7224605/
 */
function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

/**
 * transition to a new view
 */
function switchTo(view, uri) {
  // events that signalize the end of an animation
  var animationEndEvents = 'webkitAnimationEnd oAnimationEnd MSAnimationEnd animationend';

  var opposites = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

  var currentView = $('section.active');
  var newView = $('section[data-view="' + view + '"]');

  // change URI
  history.replaceState({}, 'matched', uri);

  // read data-transition attribute of given view
  var direction = newView.data('transition');

  // move current view in opposite direction
  var moveToAnimation = 'moveTo' + capitalize(opposites[direction]);
  currentView.addClass(moveToAnimation);

  // remove active and animation classes after the animation has finished
  currentView.on(animationEndEvents, function() {
    $(this).removeClass('active ' + moveToAnimation);

    // remove this handler
    $(this).off(animationEndEvents);
  });

  // move the new view from the specified direction into the viewport
  var moveFromAnimation = 'moveFrom' + capitalize(direction);
  newView.addClass('active ' + moveFromAnimation);

  // remove the animation class after the animation has finished
  newView.on(animationEndEvents, function() {
    $(this).removeClass(moveFromAnimation);

    // remove this handler
    $(this).off(animationEndEvents);
  });
 }
