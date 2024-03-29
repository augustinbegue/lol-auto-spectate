import { LolSpectator } from "$lib/server/lol-spectator";
import type { Handle } from "@sveltejs/kit";
import { findLeaguePath } from "$lib/server/utils/findLeaguePath";
import { TwitchController } from "$lib/server/twitch-controller";
import { OBSController } from "$lib/server/obs-controller";
import { Logger } from "tslog";

import "dotenv/config";
import type { AutoSpectateStatus } from "./app";
import { getMatch, refreshSummonerLeagueEntries } from "$lib/server/utils/db";
import { findInGameSummoner } from "$lib/server/utils/findInGameSummoner";

const log = new Logger({
    name: "hooks",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

let lolSpectator: LolSpectator;
let twitchController: TwitchController;
let obsController: OBSController;
let status: AutoSpectateStatus = "offline";

export const handle: Handle = async ({ event, resolve }) => {
    let lolSpectatorInitialized = true;
    if (!lolSpectator) {
        lolSpectatorInitialized = false;

        log.warn("lolSpectator not initialized, initializing...");
        lolSpectator = new LolSpectator();
        const inGameSummoner = await findInGameSummoner();
        if (inGameSummoner)
            lolSpectator.setSummoner(inGameSummoner);
    }

    let obsControllerInitialized = true;
    if (!obsController) {
        obsControllerInitialized = false;

        log.warn("obsController not initialized, initializing...");
        obsController = new OBSController();
    }

    let twitchBotInitialized = true;
    if (!twitchController) {
        twitchBotInitialized = false;

        log.warn("twitchBot not initialized, initializing...");
        twitchController = new TwitchController();
        twitchController.currentSummonerName = lolSpectator.summoner?.name;
    }

    event.locals.lolSpectator = lolSpectator;
    event.locals.obsController = obsController;
    event.locals.twitchBot = twitchController;

    if (status === "offline" && lolSpectator.summoner) {
        status = "searching";
    }

    // LolSpectator was not initialized, so we need to register the events
    if (!lolSpectatorInitialized) {
        /*
         * On Game Found
         */
        lolSpectator.on("onGameFound", async (summoner, game) => {
            log.info(`onGameFound: ${game.gameId}`);

            try {
                if (twitchController) {
                    // Set currentSummonerName to enable votes on switch
                    twitchController.currentSummonerName =
                        lolSpectator.summoner?.name;

                    if (twitchController.authenticated) {
                        let displayName = summoner.pro
                            ? `${summoner.pro.name} (${summoner.name})`
                            : summoner.name;

                        await twitchController.startPrediction(summoner, game);

                        await twitchController.updateStream({
                            title: process.env.TWITCH_STREAM_TITLE?.replace(
                                "{summonerName}",
                                displayName,
                            ),
                        });

                        await twitchController.chatAnnouncement(
                            `Found a game for ${displayName}!`,
                        );
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });

        /*
         * On Game Loading
         */
        lolSpectator.client.on(
            "onGameLoading",
            async (summoner, game, process) => {
                log.info(`onGameLoading: ${game.gameId}`);
                status = "loading";
            },
        );

        /*
         * On Game Started
         */
        lolSpectator.client.on("onGameStarted", async (summoner, game) => {
            log.info(`onGameStarted: ${game.gameId}`);
            status = "ingame";

            if (obsController.connected) {
                await obsController.setGameScene();
            }
        });

        /*
         * On Game Ended
         */
        lolSpectator.client.on("onGameEnded", async (summoner, game) => {
            log.info(`onGameEnded: ${game.gameId}`);

            status = "searching";

            try {
                await refreshSummonerLeagueEntries(summoner.name);
                const match = await getMatch(game.gameId, summoner);

                if (obsController.connected) {
                    await obsController.setWaitingScene();
                }

                if (twitchController && twitchController.authenticated) {
                    await twitchController.startCommercial(180);

                    if (match) {
                        await twitchController.endPrediction("RESOLVED", match);
                    } else {
                        await twitchController.endPrediction("CANCELED");
                    }
                }
            } catch (error) {
                log.error(error);
            }

            lolSpectator.checkForNewGame();
        });

        /*
         * On Game Exited
         */
        lolSpectator.client.on("onGameExited", async (summoner, game) => {
            log.info(`onGameExited: ${game?.gameId}`);

            if (
                obsController.connected &&
                !(await obsController.isWaitingScene())
            ) {
                await obsController.setWaitingScene();
            }
        });
    }

    if (!obsControllerInitialized) {
    }

    // Twitch bot was not initialized, so we need to register the events
    if (!twitchBotInitialized) {
        twitchController.on("onSwitch", async (summoner) => {
            log.info(`onSwitch: ${summoner.name}`);

            await lolSpectator.stop();
            await lolSpectator.setSummoner(summoner);
        });
    }

    event.locals.status = status;

    return resolve(event);
};
