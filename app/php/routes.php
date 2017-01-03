<?php
// Routes
$app->get('/game', '\Matched\Controller:returnGame');
$app->post('/game', '\Matched\Controller:startGame');
$app->put('/game',  '\Matched\Controller:submitCreation');
$app->get('/highscore', '\Matched\Controller:getLadder');
$app->get('/highscore/[{word}]', '\Matched\Controller:getHighscore');
$app->get('/ladder', '\Matched\Controller:showLadder');
$app->get('/ladder/[{word}]', '\Matched\Controller:showHighscore');
$app->get('/play', '\Matched\Controller:continueGame');
$app->get('/', '\Matched\Controller:renderApp');
// fallback route
$app->get('[/{view}]', '\Matched\Controller:redirectToHome');
