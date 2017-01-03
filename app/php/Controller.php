<?php
namespace Matched;

class Controller {

  // container interface
  protected $ci;

  /**
   * Constructor, sets the container inferface and initializes the model
   *
   * @param $ci application container
   */
  public function __construct($ci) {
     $this->ci = $ci;

     // Set up model
     $config = require __DIR__ . '/config.php';
     $this->model = new \Matched\Matched($config, $ci);
  }

  public function returnGame($request, $response, $args) {
    return $this->model->returnGame($response, $request->getParsedBody());
  }

  public function startGame($request, $response, $args) {
    return $this->model->startGame($response, $request->getParsedBody());
  }

  public function submitCreation($request, $response, $args) {
    return $this->model->submitCreation($response, $request->getParsedBody());
  }

  public function getLadder($request, $response, $args) {
    $ladder = $this->model->getLadder();
    return $response->withJson($ladder);
  }

  public function getHighscore($request, $response, $args) {
    $highscore = $this->model->getAllScores($args['word']);
    return $response->withJson($highscore);
  }

  public function showHighscore($request, $response, $args) {
    $highscore = $this->model->getAllScores($args['word']);
    $this->ci->renderer->render($response, 'index.phtml', array('highscore' => $highscore, 'word' => $args['word']));
  }

  public function showLadder($request, $response, $args) {
    $ladder = $this->model->getLadder();
    $this->ci->renderer->render($response, 'index.phtml', array('ladder' => $ladder));
  }

  public function continueGame($request, $response, $args) {
    $game = $this->model->getActiveGame();
    // if there was no active game found, redirect to homepage
    if($game === null) return $response->withRedirect('/');
    $this->ci->renderer->render($response, 'index.phtml', array('game' => $game));
  }

  public function renderApp($request, $response, $args) {
    $this->ci->renderer->render($response, 'index.phtml', $args);
  }

  public function redirectToHome($request, $response, $args) {
    return $response->withRedirect('/');
  }
}
