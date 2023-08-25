import { LolSpectator } from "$lib/server/lol-spectator";
import type { Handle } from "@sveltejs/kit";
import { findLeaguePath } from "$lib/server/utils/findLeaguePath";
import { TwitchBot } from "$lib/server/twitch-bot";
import { OBSController } from "$lib/server/obs-controller";

let lolSpectator: LolSpectator;
let twitchBot: TwitchBot;
let obsController: OBSController;

export const handle: Handle = async ({ event, resolve }) => {
    let lolSpectatorInitialized = true;
    if (!lolSpectator) {
        lolSpectatorInitialized = false;

        lolSpectator = new LolSpectator(findLeaguePath());
    }

    let obsControllerInitialized = true;
    if (!obsController) {
        obsControllerInitialized = false;
        obsController = new OBSController();
    }

    let twitchBotInitialized = true;
    if (!twitchBot) {
        twitchBotInitialized = false;
        twitchBot = new TwitchBot();
        twitchBot.currentSummonerName = lolSpectator.summoner?.name;
    }

    event.locals.lolSpectator = lolSpectator;
    event.locals.obsController = obsController;
    event.locals.twitchBot = twitchBot;

    if (!lolSpectatorInitialized) {
        lolSpectator.on("onGameFound", async (game) => {
            if (twitchBot) {
                // Set currentSummonerName to enable votes on switch
                twitchBot.currentSummonerName = lolSpectator.summoner?.name;
            }
        });

        lolSpectator.on("onGameStarted", async (game) => {
            if (obsController.connected) {
                await obsController.setGameScene();
            }
        });

        lolSpectator.on("onGameEnded", async (game) => {});

        lolSpectator.on("onGameExited", async (game) => {
            if (obsController.connected) {
                await obsController.setWaitingScene();
            }
        });
    }

    if (!obsControllerInitialized) {
    }

    if (!twitchBotInitialized) {
        twitchBot.on("onSwitch", async (summonerName) => {
            await lolSpectator.stop();
            await lolSpectator.start(summonerName);
        });
    }

    return resolve(event);
};
