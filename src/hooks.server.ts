import { LolSpectator } from "$lib/server/lol-spectator";
import type { Handle } from "@sveltejs/kit";
import { findLeaguePath } from "$lib/server/utils/findLeaguePath";
import { TwitchBot } from "$lib/server/twitch-bot";
import { OBSController } from "$lib/server/obs-controller";
import { Logger } from "tslog";

import "dotenv/config";

const log = new Logger({ name: "hooks", prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t", });

let lolSpectator: LolSpectator;
let twitchBot: TwitchBot;
let obsController: OBSController;

export const handle: Handle = async ({ event, resolve }) => {
    let lolSpectatorInitialized = true;
    if (!lolSpectator) {
        lolSpectatorInitialized = false;

        log.warn("lolSpectator not initialized, initializing...");
        lolSpectator = new LolSpectator(findLeaguePath());
    }

    let obsControllerInitialized = true;
    if (!obsController) {
        obsControllerInitialized = false;

        log.warn("obsController not initialized, initializing...");
        obsController = new OBSController();
    }

    let twitchBotInitialized = true;
    if (!twitchBot) {
        twitchBotInitialized = false;

        log.warn("twitchBot not initialized, initializing...");
        twitchBot = new TwitchBot();
        twitchBot.currentSummonerName = lolSpectator.summoner?.name;
    }

    event.locals.lolSpectator = lolSpectator;
    event.locals.obsController = obsController;
    event.locals.twitchBot = twitchBot;

    // LolSpectator was not initialized, so we need to register the events
    if (!lolSpectatorInitialized) {
        lolSpectator.on("onGameFound", async (game) => {
            log.info(`onGameFound: ${game.gameId}`);

            if (twitchBot) {
                // Set currentSummonerName to enable votes on switch
                twitchBot.currentSummonerName = lolSpectator.summoner?.name;
            }
        });

        lolSpectator.on("onGameStarted", async (game) => {
            log.info(`onGameStarted: ${game.gameId}`);

            if (obsController.connected) {
                await obsController.setGameScene();
            }
        });

        lolSpectator.on("onGameEnded", async (game) => {
            log.info(`onGameEnded: ${game.gameId}`);

            if (obsController.connected) {
                await obsController.setWaitingScene();
            }
        });

        lolSpectator.on("onGameExited", async (game) => {
            log.info(`onGameExited: ${game.gameId}`);

            if (obsController.connected && !(await obsController.isWaitingScene())) {
                await obsController.setWaitingScene();
            }
        });
    }

    if (!obsControllerInitialized) {
    }

    // Twitch bot was not initialized, so we need to register the events
    if (!twitchBotInitialized) {
        twitchBot.on("onSwitch", async (summonerName) => {
            await lolSpectator.stop();
            await lolSpectator.start(summonerName);
        });
    }

    return resolve(event);
};
