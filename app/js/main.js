$(function() {
  // set active section depending on URI
  var uri = location.pathname.match('^/(.*?(/|$))?')[0];
  $('section[data-href^="' + uri + '"]').eq(0).addClass('active');

  // on game reentrance, continue timer
if(uri == '/play') {
  startTimer($('#timer span').html());
}

  // make page titles interactive
  $('.page-title').on('click touchend', function() {
    // if the current view isn't home, switch to home
    if($('section.active').data('view') != 'home') switchTo('home', '/');
  });

  // make highscore anchors interactive
  $(document).on('click touchend', '[data-target="highscore"]', function() {
    // if the current view isn't the target of the anchor, switch to the target
    var target = $(this).data('target');
    var href = $(this).data('href');
    prepareHighscore(target, href, href.split("/")[2], $('section.active'));
  });

  // validate username on input
  $('#username-input').on('input', validateUsername);

  // assign functions to buttons
  $('#play-button, #play-again-button, #retry-button').on('click touchend', play);
  $('#submit-button').on('click touchend', submit);
  $('#ladder-button').on('click touchend', ladder);
  $('.back-button').on('click touchend', back);

  // validate creation on input
  $('#creation-input').on('input', validateCreation);

  // listen for enter in the creation input
  $('#creation-input').keypress(function(e) {
    if(e.which == 13) {
      // if the creation can be submitted, submit it
      if(!$('#submit-button').prop('disabled')) {
        submit();
      }
    }
  });
});

/**
 * adds class invalid to username input field if the username contains invalid characters
 */
function validateUsername() {
  var alphanumeric = /^([a-zA-Z0-9]*)$/;
  if(alphanumeric.test($('#username-input').val())) $('[data-for=username-input]').removeClass('invalid');
  else $('[data-for=username-input]').html('Nur Buchstaben und Zahlen erlaubt!').addClass('invalid');

  // disable/enable the play button
  checkPlayButton();
}

/**
 * Callback function when g-recaptcha was loaded
 */
function recaptchaLoaded() {
  // render Google Recaptcha with custom callback functions
  grecaptcha.render('g-recaptcha', {
    'sitekey' : '6LdjrA4UAAAAAIEDCFlBqyS5Q0hBOF2prJH7_K72',
    'callback' : checkPlayButton,
    'expired-callback': checkPlayButton
  });
}

/**
 * check whether a username is entered and g-recaptcha is answered
 * disables/enables the play button
 */
function checkPlayButton() {
  var disabled = $('#username-input').val().length === 0 || $('[data-for=username-input]').hasClass('invalid') || grecaptcha.getResponse() === "";
  $('#play-button').prop('disabled', disabled);
}

/**
 * 'Starten' button interaction
 */
function play() {
  // set the username in case the user wants to play multiple times
  if($('#username-input').val().length > 0) username = $('#username-input').val();

  // disable the play/play again button to prevent multiple start game requests
  $(this).prop('disabled', true);

  // if there was is username defined (e.g. hardreload), redirect to home
  if(typeof username === 'undefined') switchTo('home', '/');

  // start new game
  $.ajax({
    url: "/game",
    method: "POST",
    data: { 'username': username, 'g-recaptcha-response': grecaptcha.getResponse() },
    dataType: "json",
    success: function(data) {
      setupGame(data);
      resetHome();
    },
    error: function() {
      resetHome();
    }
  });
}

/**
 * resets all fields in the home view
 */
function resetHome() {
   $('#username-input').val('');
   grecaptcha.reset();
   checkPlayButton();
}

/**
 * set up a game according to the passed data
 */
function setupGame(data) {
  // set the word in the game view
  $('#word').html(data.word);

  startTimer(15);

  // switch to game view (transitions.js)
  switchTo('game', '/play');
}

/**
 * starts a 15s timer which automatically submits the creation of the user at the end of it
 */
function startTimer(duration) {
  var word = $('#word').html();
  $('#timer span').html(duration);

  timer = setInterval(function() {
    if(word != $('section.active #word').html()) {
      // if the current word does not match this timer or the game is not active, cancel this timer
      return clearInterval(timer);
    }

    $('#timer span').html(--duration);

    if(duration === 0) {
      clearInterval(timer);
      if(!$('#submit-button').prop('disabled')) {
        // if the creation can be submitted, submit it
        submit();
      } else {
        // otherwise, show a failed attempt screen
        failedAttempt();
      }
    }
  }, 1000);
}

/**
 * 'Abschicken' button interaction
 */
function submit() {
  $('#submit-button').prop('disabled', true);

  clearInterval(timer);

  $.ajax({
    url: '/game',
    type: 'PUT',
    data: { 'word': $('#word').html(), 'creation': $('#creation-input').val() },
    dataType: "json",
    success: function(data) {
      // prepare score screen
      $('#score-word').html(data.word);
      $('#creation').html(data.creation);
      $('#results').html(data.results);
      $('#percent').html(data.percent);
      $('#highscore-anchor').data('href', '/ladder/' + data.word);
      $('#highscore').html(data.highscore);
      $('#rank').html(data.rank);
      $('#play-again-button').prop('disabled', false);

      switchTo('score', '/score');

      resetPlay();
    },
    statusCode: {
      422: function() {
        failedAttempt();
      },
      503: function() {
        // Google Custom Serach API Daily Limit exceeded
        $('[data-view=failed] h3').html('Unser tägliches Limit an Anfragen ist leider erschöpft.');
        failedAttempt();
        $('#retry-button').prop('disabled', true);
      }
    }
  });
}

/**
 * shows the failed attempt screen
 */
function failedAttempt() {
  $('#retry-button').prop('disabled', false);
  switchTo('failed', '/failed');
  resetPlay();
}
/**
 * resets all inputs on the play view
 */
function resetPlay() {
  $('#creation-input').val('');
}

/**
 * checks, whether the given word is present within the creation
 */
function validateCreation() {
  var creation = $('#creation-input').val();
  var alphabetic = /^([a-zA-Z]*)$/;
  if(alphabetic.test(creation)) {
    $('[data-for=creation-input]').removeClass('invalid');

    // if the creation is alphabetic, check if it contains the given word
    if(creation.length > 0){
      if(creation.toLowerCase().indexOf($('#word').html().toLowerCase()) === -1) {
        // if it doesn't contain the word, show an error
        $('[data-for=creation-input]').html('Die Kreation muss dein Wort enthalten!').addClass('invalid');
        $('#submit-button').prop('disabled', true);
      } else {
        $('#submit-button').prop('disabled', false);
      }
    }
  } else {
    $('[data-for=creation-input]').html('Die Kreation darf nur Buchstaben enthalten!').addClass('invalid');
    $('#submit-button').prop('disabled', true);
  }
}

/**
 * 'Bestenliste' button interaction
 */
function ladder() {
  $.ajax({
    url: '/highscore',
    type: 'GET',
    dataType: "json",
    success: function(data) {
      $('[data-view=ladder] article p').html('');
      $.each(data, function() {
        $('[data-view=ladder] article p').append('<a data-href="/ladder/' + this + '" data-target="highscore">' + this + '</a>');

        $('[data-view=ladder] .back-button').data('target', 'home');
        $('[data-view=ladder] .back-button').data('href', '/');
        $('[data-view=ladder] .back-button').html('Zurück');
      });

      switchTo('ladder', '/ladder');
    }
  });
}

/**
 * prepares highscore view for the given word
 */
function prepareHighscore(target, href, word, currentView) {
  $.ajax({
    url: '/highscore/' + word,
    type: 'GET',
    dataType: "json",
    success: function(data) {
      $('#highscore-table').html('');
      $('#highscore-table').append('<tr><th></th><th>Benutzername</th><th>Anzahl Resultate</th></tr>');
      $.each(data, function(i, score) {
        $('#highscore-table').append('<tr><td>' + (i + 1) + '.</td><td>' + score.username + '</td><td>' + score.score + '</td></tr>');
      });

      $('#highscore-word').html(word);
      $('[data-view=highscore] .back-button').data('target', currentView.data('view'));
      $('[data-view=highscore] .back-button').data('href', currentView.data('href'));
      $('[data-view=highscore] .back-button').html('Zurück');

      switchTo(target, href);
    }
  });
}

/**
 * #back-button interaction
 */
function back() {
  switchTo($(this).data('target'), $(this).data('href'));
}
