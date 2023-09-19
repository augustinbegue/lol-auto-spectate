import type TypedEmitter from "typed-emitter";
import { EventEmitter } from "node:events";
import type {
    CurrentGameInfo,
    LeagueEntryDTO,
    SummonerDTO,
} from "lol-api-wrapper/types";
import { Logger } from "tslog";
import { LolController } from "./lol-controller";
import { findLeaguePath } from "./utils/findLeaguePath";
import {
    getSummoner,
    refreshSummonerLeagueEntries,
    type CachedSummoner,
} from "./utils/db";
import type { Summoner } from "@prisma/client";
import { riot } from "./utils/riot";
import type { RiotApiWrapper } from "lol-api-wrapper";
import { findInGameSummoner } from "./utils/findInGameSummoner";

const log = new Logger({
    name: "lol-spectator",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

type LolSpectatorEvents = {
    onGameFound: (summoner: CachedSummoner, game: CurrentGameInfo) => void;
};

export class LolSpectator extends (EventEmitter as new () => TypedEmitter<LolSpectatorEvents>) {
    spectatorId: string;
    client: LolController;
    api: RiotApiWrapper;
    summoner: CachedSummoner | null;

    currentTimeout: NodeJS.Timeout | null = null;
    timeoutInterval = 1000 * 5;

    lastSpectatedGameId = 0;
    lastSpectatedGameReplayId = "EUW1_6591904871";
    lastSpectatedGameTime: number;

    constructor() {
        super();

        this.client = new LolController(findLeaguePath());
        this.api = riot;
        this.summoner = null;
        this.spectatorId = crypto.randomUUID();
        this.lastSpectatedGameTime = Date.now();
    }

    async setSummoner(summoner: CachedSummoner) {
        await this.stop();

        log.info(`Setting summoner to spectate: ${summoner.name}`);
        this.summoner = summoner;
        await refreshSummonerLeagueEntries(this.summoner.name);

        this.checkForNewGame();
    }

    async stop() {
        log.info("Stopping search for a new game");

        this.client.exit();
        this.lastSpectatedGameId = 0;

        this.retrySearch = false;
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }
    }

    private retrySearch = false;
    async checkForNewGame() {
        if (!this.api) {
            throw new Error("[lol-spectator] Spectator not initialized");
        }

        if (!this.summoner) {
            throw new Error(`[lol-spectator] Summoner not found`);
        }

        if (this.lastSpectatedGameTime + 1000 * 60 * 20 < Date.now()) {
            // If the last game was more than 20 minutes ago, switch to another summoner

            const newSummoner = await findInGameSummoner();

            if (newSummoner) {
                this.stop();
                return this.setSummoner(newSummoner);
            }
        }

        this.retrySearch = true;

        // Check if the summoner has a game in progress
        let currentGame: CurrentGameInfo | undefined;
        try {
            currentGame = await this.api.getActiveGameBySummonerId(
                "EUW1",
                this.summoner.id,
            );
        } catch (error) {}

        if (
            currentGame &&
            currentGame.gameId &&
            currentGame.gameId != this.lastSpectatedGameId
        ) {
            log.info(`onGameFound: ${currentGame.gameId}`);
            this.emit("onGameFound", this.summoner, currentGame);

            // New game found
            this.lastSpectatedGameId = currentGame.gameId;
            this.lastSpectatedGameReplayId = `${currentGame.platformId}_${currentGame.gameId}`
            await this.client.launch(this.summoner, currentGame);

            this.lastSpectatedGameTime = Date.now();
        } else {
            log.info("No game found");

            if (this.retrySearch) {
                this.currentTimeout = setTimeout(
                    this.checkForNewGame.bind(this),
                    this.timeoutInterval,
                );
            }
        }
    }
}
