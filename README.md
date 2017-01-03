# Matched
Small game created for Web Engineering, autumn semester 2016.

Available at: [matched.codeable.ch](matched.codeable.ch)

## How it works
The player receives a random word - for example "bean". He then has to use this word to build something new, containing the given word - such as "caribbean".

After a player submits his creation, it will be passed to the [Google Custom Search API](https://developers.google.com/custom-search/) to determine the number of results.
Due to a lack of features in custom searches, like universal search or personalized results, the number will differ from the result of a site search on Google.

The goal is to hit as few results as possible, while scoring more than zero, which makes 1 the perfect score.

The count for "caribbean" is 54'700'000, which is pretty bad. The word "jellybean", scoring 1'690'000, would have been a bit better.

## Words
### Source
The words are coming from the [DeReWo](http://www1.ids-mannheim.de/kl/projekte/methoden/derewo.html) project. We took the list of 100'000 german words and filtered it to extract nouns without special chars within a length of 4 - 12 characters. This reduced the words to about 20'000 nouns.

## API
### Game
**URI:** /game

| Method | Status Code               | Description |
| ------ |:------------------------- | :---------- |
| GET    | 200 OK<br>404 Not Found | returns the current game of this session as `{"start":"YYYY-MM-DD hh:mm:ss","username":"YourUsername","word":"YourWord"}` |
| POST   | 201 Created<br>400 Bad Request<br>503 Internal Server Error | starts a new game for this session<br>required parameters: `username` (1-32 alphanumeric String) and `g-recaptcha-response` (Google Recaptcha Response for `6LdjrA4UAAAAAIEDCFlBqyS5Q0hBOF2prJH7_K72`)<br>returns word for the created game as `{word: "YourWord"}` |
| PUT    | 200 OK<br>400 Bad Request<br>503 Internal Server Error | submit a creation for a game of the current session and get the score<br>required parameters: `word` (word received from POST) and `creation` (1-255 alphabetic String containing the word received from POST)<br>returns score as `{word: "YourWord", creation: "YourCreation", results: "NumberOfResults", percent: percentageOfPlayersYouBeat, highscore: "HighscoreForThisWord", rank: YurRankForThisWord}` |

### Highscore
**URI:** /highscore

A GET request returns all words that are currently or have been available for playing as `["word1", "word2", "word3", ...]`.

**URI:** /highscore/{word}

A GET request returns the score for all played games of the specified {word} as `[{"username":"john1","score":"23"}, {"username":"john2","score":"443"}, ...]`.

## Timing
A player has 15 seconds to enter his creation ingame. To make Matched available for weaker connections, there is a 2s tolerancy to support GPRS (500ms, 50kb/s, 20kb/s).

## Background
The background animation uses a separate file: `words.json` from where it takes 2-3 random words to combine and display on blank space left or right of the content, as long as the window width > 1000.

Whenever a word is inserted, it checks 9 of its pixels whether there was already a word displayed. If so, the other word will be faded out before the new one will take its position.

 [9 pixels that will be checked](word.jpg?raw=true)

## Setup
Requires npm 2.15+ and Composer 1.3.0+.
Check your npm version: `npm -v`

Make sure to insert all required data into the `app/php/config.default.php` file and rename it to `config.php`.

### Installing Dependencies

    npm install
    php composer.phar install

### Starting the development server
Requires PHP 7.0+ with the PDO & cURL extensions installed and short_open_tag enabled.
Starts a local server on port 8000 (default) running browsersync.
Check your PHP version: `php -v`.

    gulp serve
