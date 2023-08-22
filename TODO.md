# TODO

## Refactor

-   Unlink obs-controller and twitch-bot from lol-spectator
    -   Use EventEmitter for communication
    -   lol-spectator should use lol-controller to control the client

## Overlay

-   Automatic teamfight view w. championPositionOnScreen
-   OCR for golds & cs

## Widget

-   fix session 1 W on start/summ change

## Spectator

-   Automatically switch summoner if no game for 20 min
-   Stop search game loop on load start for keeping loading status

## Twitch Bot

-   Sanitize user input for twitch requests
