# lol-auto-spectate

This tool allows you to automatically spectate the games of a specific summoner in League of Legends.

## Installation & Build

-   Clone the repository
-   Install the dependencies with `npm install`
-   Build the project with `npm run build`

## Usage

-   Create a file named `.env` with the following content:

```
RIOT_API_KEY="Riot API Key"
ORIGIN="http://localhost:3000"
```

-   Only required if you want to use the streaming integrations.

```
OBS_WS_URL="ws://localhost:4455"
OBS_WS_PASSWORD="obs ws password"
OBS_SCENE_COLLECTION="scene collection name"
OBS_GAME_SCENE="name of the scene displayed when spectating a game"
OBS_WAITING_SCENE="name of the scene displayed when waiting for a game"
```

-   Only required if you want to use the Twitch integration.

```
TWITCH_USERNAME="twitch username"
TWITCH_PASSWORD="twitch oauth token"
TWITCH_CHANNEL="twitch channel name"
```

-   Start the server with `npm run start`
-   Open the application in your browser at `http://localhost:3000`

<img src="https://i.imgur.com/cZzc5LT.png" >

-   This interface can be used to select the summoner you want to spectate and to enable/disable the obs & twitch integrations.

## Integrations

### OBS

-   The OBS integration allows you to automatically switch scenes when spectating a game.
-   The application will automatically switch to the scene named `OBS_GAME_SCENE` when spectating a game.
-   The application will automatically switch to the scene named `OBS_WAITING_SCENE` when not spectating a game.
-   The application will also automatically start your strean when a game is found.

-   The application also exposes a widget that can be integrated in OBS at `http://localhost:3000/widget`

<img src="https://i.imgur.com/PCnSGcQ.png" >

### Twitch

-   The Twitch integration allows your spectators to interact with the application through Twitch chat.
    -   They can use the `!switch <summoner name>` command to spectate a specific summoner.
        This will trigger a vote and the summoner with the most votes will be spectated.
    -   They can use the `!opgg` command to get an opgg link to the current account.
