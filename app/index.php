<?php

require __DIR__ . '/vendor/autoload.php';

use \Interop\Container\ContainerInterface as ContainerInterface;

// has to match the timezone of the database
date_default_timezone_set('Europe/Zurich');

session_start();

$app = new \Slim\App();

// DIC configuration
$container = $app->getContainer();

// view renderer
$container['renderer'] = function () {
    return new Slim\Views\PhpRenderer(__DIR__ . '/templates/');
};

// monolog
$container['logger'] = function () {
    $logger = new Monolog\Logger('matched');
    $logger->pushProcessor(new Monolog\Processor\UidProcessor());
    $logger->pushHandler(new Monolog\Handler\StreamHandler(__DIR__ . '/logs/app.log', \Monolog\Logger::ERROR));
    return $logger;
};

// Register routes
require __DIR__ . '/php/routes.php';

// Run app
$app->run();
