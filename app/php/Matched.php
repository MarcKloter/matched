<?php
namespace Matched;
use PDO;

class Matched {

  // google recaptcha secret
  protected $secret;

  // google custom search engine api key and engine to use
  protected $cse;

  // database object
  protected $db;

  // container interface
  protected $ci;

  /**
   * Constructor
   * ensures that any configuration is given, establishes DB connection
   *
   * @param $config config.php (see /src/config.default.php)
   * @param $ci application container
   */
  public function __construct($config, $ci) {
    $this->ci = $ci;

    if(is_null($config)) throw new Exception('Configuration missing.');

    $this->secret = $config['g-recaptcha-secret'];
    $this->cse['api-key'] = $config['cse-api-key'];
    $this->cse['cse-id'] = $config['cse-id'];

    try {
      // try establishling a database connection
      $dsn = $config['db-type'] . ':dbname=' . $config['db-name'] . ';host=' . $config['db-host'];
      $this->db = new PDO($dsn, $config['db-user'], $config['db-pass']);

      // activate error reporting for logging
      $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);
    } catch(PDOException $e) {
        throw new Exception('Database connection could not be established.');
    }
  }

  /**
   * creates a game using a random word for the current session with the given usernams
   *
   * @param $response PSR 7 response object
   * @param $args parsed request body
   * @return PSR 7 response object
   */
  public function startGame($response, $args) {
    // trigger garbage collector function
    $this->cleanUpGames();

    if(!$this->checkRecaptcha($args['g-recaptcha-response'])) {
      // if the recaptcha response was invalid, return with 400 - Bad request
      return $response->withStatus(400);
    }

    // get the id and word for this game
    $word = $this->getWord();

    // if there was no word for this game available, return 422 - Unprocessable Entity
    if(!$word) {
      $this->ci->logger->emergency('There are no words left!');
      return $response->withStatus(422);
    }

    $username = $args['username'];
    // if the username is malformed, return with 400 - Bad Request
    if(strlen($username) == 0 || strlen($username) > 32 || !ctype_alnum($username)) {
      return $response->withStatus(400);
    }

    $stmt = $this->db->prepare('INSERT INTO games (session, username, word, start) values(:session, :username, :word, FROM_UNIXTIME(:start))');

    $stmt->bindValue(':session', session_id());
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':word', $word['id'], PDO::PARAM_INT);
    // use server timestamp to avoid issues with external database time settings
    $stmt->bindValue(':start', time(), PDO::PARAM_INT);

    if($stmt->execute()) {
      // if everything worked, return 201 - Created and the word
      $return = array('word' => $word['word']);
      return $response->withJson($return, 201);
    } else {
      $this->ci->logger->error($stmt->errorInfo());
      return $response->withStatus(422);
    }
  }

  /**
   * Validates the user response via Google Recaptcha using curl
   *
   * @param $recaptchaResponse Google Recaptcha User Response
   * @return boolean whether the response was valid
   */
  public function checkRecaptcha($recaptchaResponse) {
    // a recaptcha is required only once per session
    if($this->isVerifiedSession()) {
      return true;
    }

    // prepare data to be sent
    $data = array('secret' => $this->secret, 'response' => $recaptchaResponse, 'remoteip' => $_SERVER['REMOTE_ADDR']);

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://www.google.com/recaptcha/api/siteverify");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // returns an object accroding to https://developers.google.com/recaptcha/docs/verify#api-response
    $googleResponse = json_decode(curl_exec($ch));

    curl_close($ch);

    return $googleResponse->success;
  }

  /**
   * Checks whether there is a game with the current session within the last 24h
   *
   * @return boolean whether the current session is verified
   */
  public function isVerifiedSession() {
    $stmt = $this->db->prepare('SELECT COUNT(*) FROM games WHERE session = :session AND start >= NOW() - INTERVAL 1 DAY');
    $stmt->bindValue(':session', session_id());

    if($stmt->execute()) {
      $gamesThisSession = $stmt->fetchColumn();

      return $gamesThisSession > 0;
    } else {
      $this->ci->logger->error($stmt->errorInfo());
      return false;
    }
  }

  /**
   * Returns a random word that is in play
   *
   * @return array(id, word) of an entry in the table words that is in play
   */
  public function getWord() {
    $this->bringWordsIntoPlay();

    // select random word that is in play
    $word = $this->db->query('SELECT id, word FROM words WHERE in_play = 1 ORDER BY RAND() LIMIT 1')->fetch(PDO::FETCH_ASSOC);
    return $word;
  }

  /**
   * Ensures, that there are words in play as long as there are any in the database
   */
  public function bringWordsIntoPlay() {
    $wordsInPlay = $this->db->query('SELECT COUNT(*) FROM words WHERE in_play = 1')->fetchColumn();

    // if there are less than 20 words in play, bring a new one into it
    if($wordsInPlay < 20) {
      // select random word and bring it into play
      $wordId = $this->db->query('SELECT id FROM words WHERE in_play = 0 ORDER BY RAND() LIMIT 1')->fetchColumn();

      if(!$wordId) return $this->ci->logger->error('All words are currently in play!');

      $stmt = $this->db->prepare('UPDATE words SET in_play = 1 WHERE id = ?');

      if(!$stmt->execute(array($wordId))) {
        $this->ci->logger->error($stmt->errorInfo());
      }
    }
  }

  /**
  * processes a user submitted creation for his active game
  *
  * @param $response PSR 7 response object
  * @param $args parsed request body
  * @return PSR 7 response object
  */
  public function submitCreation($response, $args) {
    // get the game information for the current session and word
    $game = $this->getUnfinishedGame($args['word']);

    if(!$game) {
      // if there was no game found, return with 400 - Bad Request
      return $response->withStatus(400);
    }

    if($this->validateCreation($game, $args['creation'])) {
      // get score for the creation
      $score = $this->requestScore($args['creation']);

      if($score === null) {
        // if there was an error retreiving the result count, return with 503 - Service Unavailable
        return $response->withStatus(503);
      }

      // if everything is correct, and it is a perfect score (1), take the word out of play
      if($score == 1) {
        $stmt = $this->db->prepare('UPDATE words SET in_play = 2 WHERE word = :word');
        $stmt->bindParam(':id', $game['word']);

        if(!$stmt->execute()) {
          $this->ci->logger->error($stmt->errorInfo());
          return $response->withStatus(422);
        }
      }

      // determine highscore
      $wordScore = $this->getAllScores($args['word']);
      if(count($wordScore) > 0) $wordHighscore = $wordScore[0]['score'];
      else $wordHighscore = 0;
      $highscore = ($score < $wordHighscore || $wordHighscore == 0) ? $score : $wordHighscore;

      // calculate percentage of players of this word which the current player has beaten
      if(count($wordScore) == 0) {
        $percentage = 100;
        $rank = 1;
      } elseif($score == 0) {
        $percentage = 0;
        $rank = count($wordScore) + 1;
      }else {
        $beaten = 0;
        // loop ASC over all scores
        for($i = 0; $i < count($wordScore); $i++) {
          // if the current player has beaten the score, increase the beaten count
          if($score < $wordScore[$i]['score'] || $wordScore[$i]['score'] == 0) $beaten++;
        }
        $percentage = round((100 / count($wordScore)) * $beaten, 2);

        $rank = count($wordScore) - $beaten + 1;
      }

      // insert creation into game
      $stmt = $this->db->prepare('UPDATE games SET creation = :creation, score = :score WHERE id = :id');
      $stmt->bindParam(':creation', $args['creation']);
      $stmt->bindParam(':score', $score, PDO::PARAM_INT);
      $stmt->bindParam(':id', $game['id'], PDO::PARAM_INT);

      if($stmt->execute()) {

        // return information for score screen
        $return = array('word' => $game['word'],
                        'creation' => $args['creation'],
                        'results' => $score,
                        'percent' => $percentage,
                        'highscore' => $highscore,
                        'rank' => $rank);

        return $response->withJson($return);
      } else {
        $this->ci->logger->error($stmt->errorInfo());
        return $response->withStatus(422);
      }
    } else {
      // if the creation was invalid, return 400 - Bad Request
      return $response->withStatus(400);
    }
  }

  /**
   * returns a multidimensional array with all scores for the given word ordered in highscore fasion (scores > 0 ASC, then scores = 0)
   * array(array('word' => 'abc', 'score' => 5))
   *
   * @param $word word to look for
   * @return multidimensional array with all games played of a word
   */
  public function getAllScores($word) {
    // get id of the word
    $stmt = $this->db->prepare('SELECT id FROM words WHERE word = :word');
    if($stmt->execute(array('word' => $word))) {
      $wordId = $stmt->fetchColumn();

      // get all games for this word, ordered by score ASC with score = 0 at the bottom
      $stmt = $this->db->prepare('SELECT username, score FROM games WHERE word = :word AND creation IS NOT NULL ORDER BY CASE WHEN score = 0 THEN 2 ELSE 1 END, score');
      $stmt->bindParam(':word', $wordId, PDO::PARAM_INT);

      if($stmt->execute()) {
        $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $scores;
      } else {
        $this->ci->logger->error($stmt->errorInfo());
        return null;
      }
    }

    return array();
  }

  /**
   * returns the most recent still active game or NULL
   *
   * @return entry of the table games matching the criteria
   */
  public function getActiveGame() {
    // select the most recent active game
    $stmt = $this->db->prepare('SELECT games.start, games.username, words.word
                                FROM games
                                INNER JOIN words ON games.word = words.id
                                WHERE session = :session AND creation IS NULL AND NOW() - start < 17
                                ORDER BY start DESC LIMIT 1');
    $stmt->bindValue(':session', session_id());

    if($stmt->execute()) {
      $game = $stmt->fetch(PDO::FETCH_ASSOC);
      if(!$game) return null;
      return $game;
    } else {
      $this->ci->logger->error($stmt->errorInfo());
      return null;
    }
  }

  /**
   * get game of the current session and word where no creation has been submitted yet
   *
   * @param $word word the user played
   * @return entry of the table games matching the current session and the given word
   */
  public function getUnfinishedGame($word) {
    // select the latest game where the word and session id match
    $stmt = $this->db->prepare('SELECT games.*, words.word
                                FROM games
                                INNER JOIN words ON games.word = words.id
                                WHERE words.word = :word AND session = :session AND creation IS NULL
                                ORDER BY start DESC LIMIT 1');
    $stmt->bindParam(':word', $word, PDO::PARAM_INT);
    $stmt->bindValue(':session', session_id());

    if($stmt->execute()) {
      $game = $stmt->fetch(PDO::FETCH_ASSOC);
      if(!$game) return null;
      return $game;
    } else {
      $this->ci->logger->error($stmt->errorInfo());
      return null;
    }
  }

  /**
   * validates whether the user submitted creation was valid
   * a valid creation contains the given word and was submitted within time containing only alphabetic characters
   *
   * @param $game the relevant entry of the games table
   * @param $creation the user submitted creation
   * @return boolean whether the creation is accepted
   */
  public function validateCreation($game, $creation) {
    // check if the creation contains only alphabetic characters or is too long
    if(!ctype_alpha($creation) || strlen($creation) > 255) return false;

    // validate whether the creation contains the word (case insensitive)
    if(stripos($creation, $game['word']) === false) return false;

    // check whether the creation was submitted within the given timeframe (15s + 2s tolerancy)
    if($_SERVER['REQUEST_TIME'] - strtotime($game['start']) < 17) return true;
    else return false;
  }

  /**
   * Sends a request to the Google Custom Search API to determine the number of results for the given word
   *
   * @param $creation word that the user created
   * @return number of results for the given word, NULL on error
   */
  public function requestScore($creation) {
    $ch = curl_init();

    $parameters = http_build_query(array('key' => $this->cse['api-key'], 'cx' => $this->cse['cse-id'], 'q' => $creation));

    curl_setopt($ch, CURLOPT_URL, "https://www.googleapis.com/customsearch/v1?" . $parameters);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $googleResponse = json_decode(curl_exec($ch));

    curl_close($ch);

    // check whether the daily API request limit was exceeded
    if(isset($googleResponse->error->code) && $googleResponse->error->code == 403) {
        $this->ci->logger->critical('Google Custom Search API Key daily limit exceeded.');
        return null;
    }

    return $googleResponse->queries->request[0]->totalResults;
  }

  /**
   * Returns all words that are or were in play ordered alphabetically
   *
   * @return array of wards ordered alphabetically
   */
  public function getLadder() {
     $words = $this->db->query('SELECT word FROM words WHERE in_play > 0 ORDER BY word')->fetchAll(PDO::FETCH_COLUMN);
     return $words;
   }

   /**
    * Deletes all games that do not have a creation submitted and the submission window is significantly expired
    */
  public function cleanUpGames() {
    $this->db->exec('DELETE FROM games WHERE creation IS NULL AND NOW() - start > 60');
  }

  /**
  * returns the game data for the active game of this session
  *
  * @param $response PSR 7 response object
  * @param $args parsed request body
  * @return PSR 7 response object
  */
  public function returnGame($response, $args) {
    $activeGame = $this->getActiveGame();

    // if there was no active game found, return with 404 - Not Found
    if($activeGame === null) {
      return $response->withStatus(404);
    }

    return $response->withJson($activeGame);
  }
}
