$(function(){
  // load words.json
  $.getJSON('/words.json', function(data) {
    // set global words
    words = data;

    // define interval variable
    randomWords = null;

    // prepare .background containers
    $('section').each(function() {
      $(this).prepend('<div class="background"></div>');
    });

    // trigger window resize event
    window.dispatchEvent(new Event('resize'));
  });

  window.addEventListener('resize', function(event){
    if($(window).width() > 1000) {
      calculateVisibleArea();
      startRandomWords();
    } else stopRandomWords();
  });
});

/**
 * calculates the dimensions of the visible area beside the content
 */
function calculateVisibleArea() {
  // area left of the content
  leftArea = {};
  leftArea.left = 0;
  leftArea.right = $('section.active article').offset().left;

  // area right of the content
  rightArea = {};
  rightArea.left = $('section.active article').offset().left + $('section.active article').width();
  rightArea.right = $(window).width();
}

/**
 * starts an interval at a random time that displays words
 * the time is influenced by the size of the window
 */
function startRandomWords() {
  // start random words interval if it isn't already running
  if(randomWords === null) {
    // calculate visible area dimensions
    var visibleArea = (leftArea.right - leftArea.left) * $(document).height();
    visibleArea += (rightArea.right - rightArea.left) * $(document).height();

    // calculate how many words can be displayed
    // an average word combination of the current words.json is 26x250 = 6500px in size
    var wordCapacity = Math.floor(visibleArea / (26 * 250));

    // make sure the screen can't be filled >70% - a word auto fades out after max. 40s
    var interval = Math.floor(Math.random() * 200) + 40000 / (0.7 * wordCapacity);

    randomWords = setInterval(function() { displayRandomWord(); }, interval);
  }
}

/**
 * stops the interval that displays words
 */
function stopRandomWords() {
  if(randomWords !== null) {
    // stop random words interval
    clearInterval(randomWords);
    randomWords = null;
  }
}

/**
 * requests a random word for display and randomly determines its css properties
 */
function displayRandomWord() {
  var word = getRandomWord();
  $('section.active .background').append(word);

  // decide on word styles
  word.css({ fontSize: (Math.random() + 1).toFixed(1) + 'em',
             color: 'rgba(34, 34, 34, ' + ((Math.random() * 0.75) + 0.25).toFixed(2) + ')' });

  // place word at a random position
  placeWord(word);
}

/**
 * places a div at a random position in the visible area beside of the content
 *
 * @param word DOM element div
 */
function placeWord(word) {
   // decide if the word will be placed in the left/right area
  var area = Math.round(Math.random()) ? leftArea : rightArea;

  // find a random left offset
  var leftOffset = Math.floor(Math.random() * (area.right - area.left - word.width() * 0.5)) + area.left - word.width() * 0.25;

  // calculate offset from top
  var topOffset = Math.floor(Math.random() * $(document).height());

  // calculate relative offset of element to current viewport
  var relativeTopOffset = topOffset - window.pageYOffset;

  fadeOutElementsAtTop(leftOffset, relativeTopOffset, word);
  fadeOutElementsAtCenter(leftOffset, relativeTopOffset, word);
  fadeOutElementsAtBottom(leftOffset, relativeTopOffset, word);

  // position word to offsets
  word.css({ top: topOffset, left: leftOffset });

  // fade it in
  word.fadeIn(1000);

  // set max time to fade out
  setTimeout(function(word) { word.fadeOut(1000, function() { $(this).remove(); }); }, Math.floor((Math.random() * 30000) + 10000), word);
}

/**
 * calls elementFromPoint for the given word for 3 points on the top
 *
 * @param leftOffset number of pixels relative to the left window border
 * @param topOffset number of pixels relative to the top window border
 * @param word DOM element div
 */
function fadeOutElementsAtTop(leftOffset, topOffset, word) {
  var topLeft = document.elementFromPoint(leftOffset, topOffset);
  fadeOutElementsAtPosition(topLeft);

  var topCenter = document.elementFromPoint(leftOffset + (word.width() / 2), topOffset);
  fadeOutElementsAtPosition(topCenter);

  var topRight = document.elementFromPoint(leftOffset + word.width(), topOffset);
  fadeOutElementsAtPosition(topRight);
}

/**
 * calls elementFromPoint for the given word for 3 points in the middle
 *
 * @param leftOffset number of pixels relative to the left window border
 * @param topOffset number of pixels relative to the top window border
 * @param word DOM element div
 */
function fadeOutElementsAtCenter(leftOffset, topOffset, word) {
  var centerLeft = document.elementFromPoint(leftOffset + (word.width() / 4), topOffset + (word.height() / 2));
  fadeOutElementsAtPosition(centerLeft);

  var centerCenter = document.elementFromPoint(leftOffset + (word.width() / 2), topOffset + (word.height() / 2));
  fadeOutElementsAtPosition(centerCenter);

  var centerRight = document.elementFromPoint(leftOffset + ((word.width() / 4) * 3), topOffset + (word.height() / 2));
  fadeOutElementsAtPosition(centerRight);
}

/**
 * calls elementFromPoint for the given word for 3 points on the bottom
 *
 * @param leftOffset number of pixels relative to the left window border
 * @param topOffset number of pixels relative to the top window border
 * @param word DOM element div
 */
function fadeOutElementsAtBottom(leftOffset, topOffset, word) {
  var bottomLeft = document.elementFromPoint(leftOffset, topOffset + word.height());
  fadeOutElementsAtPosition(bottomLeft);

  var bottomCenter = document.elementFromPoint(leftOffset + (word.width() / 2), topOffset + word.height());
  fadeOutElementsAtPosition(bottomCenter);

  var bottomRight = document.elementFromPoint(leftOffset + word.width(), topOffset + word.height());
  fadeOutElementsAtPosition(bottomRight);
}

/**
 * takes a DOM element and fades it out, if it is a background word element
 *
 * @param elementFromPoint DOM element or NULL
 */
function fadeOutElementsAtPosition(elementFromPoint) {
  // check if the element is a background word
  if(elementFromPoint !== null && elementFromPoint.parentElement !== null && elementFromPoint.parentElement.classList.contains('bg-word')) {
    // if so, fade it out and remove it afterwards
    $(elementFromPoint.parentElement).fadeOut(1000, function(){ $(this).remove(); });
  }
}

/**
 * returns a div containing 1 - 2 span tags and a mark tag
 *
 * @return DOM element div containing 2 - 3 children nodes
 */
function getRandomWord() {
  // decide whether to combine 2 or 3 words
  var noOfWords = Math.floor(Math.random() * 2) + 2;

  // decide which word will be bold
  var boldWord = Math.floor(Math.random() * noOfWords) + 1;

  // build word as <div> (required for elementFromPoint)
  var result = $('<div class="bg-word"></div>');

  // HTML tags used for words
  var tags = {false: 'span', true: 'mark'};

  // choose random words
  for(var i = 1; i <= noOfWords; i++) {
    // choose a random word
    var word = words[Math.floor(Math.random() * words.length)].toUpperCase();

    // append the word to our return value
    result.append('<' + tags[i == boldWord] + '>' + word + '</' + tags[i == boldWord] + '>');
  }

  return result;
}
