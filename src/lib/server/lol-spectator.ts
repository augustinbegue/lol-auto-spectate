import { RiotWrapper } from "lol-api-wrapper";
import type { LeagueEntryDTO } from "lol-api-wrapper/types";
import { Logger } from "tslog";
import { LolController } from "./lol-controller";

const log = new Logger({
    name: "lol-spectator",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class LolSpectator extends LolController {
    riot: RiotWrapper | undefined;
    leagueEntry: LeagueEntryDTO | undefined;

    currentTimeout: NodeJS.Timeout | null = null;
    timeoutInterval = 1000 * 5;
    lastGameId = 0;

    constructor(leagueFolderPath: string) {
        super(leagueFolderPath);
    }

    async init() {
        if (!this.riot) {
            this.riot = await RiotWrapper.build();
        }

        log.info("Spectator initialized");
    }

    async start(summonerName: string) {
        log.info(`Starting spectator client for ${summonerName}`);

        if (!this.riot) {
            throw new Error("[lol-spectator] Spectator not initialized");
        }

        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        if (this.spectatorProcess) {
            await this.exitSpectatorClient();
        }

        let summoner = await this.riot.getSummonerIdsByName(summonerName);
        if (!summoner) {
            log.error(
                `Summoner ${summonerName} not found. Stopping lol-spectator`,
            );
            await this.stop();
            return;
        }

        this.summoner = summoner;
        await this.refreshLeagueEntry();

        log.info(
            `Summoner ${summonerName} found. Rank: ${this.leagueEntry?.tier} ${this.leagueEntry?.rank}`,
        );

        this.checkForNewGame();
    }

    async stop() {
        log.info("Stopping spectator client");

        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        if (this.spectatorProcess) {
            await this.exitSpectatorClient();
        }

        this.status = "offline";
    }

    getStatus() {
        return this.status;
    }

    async refreshLeagueEntry() {
        if (!this.summoner) {
            throw new Error(
                `[lol-spectator]Summoner ${this.summoner} not found`,
            );
        }

        let leagueEntries = await this.riot?.getLeagueEntryBySummonerId(
            this.summoner.id,
        );

        this.leagueEntry = leagueEntries?.find(
            (e) => e.queueType == "RANKED_SOLO_5x5",
        );
    }

    private async checkForNewGame() {
        if (!this.riot) {
            throw new Error("[lol-spectator] Spectator not initialized");
        }

        if (!this.summoner) {
            throw new Error(`[lol-spectator] Summoner not found`);
        }

        // Check if the summoner has a game in progress
        let currentGame = await this.riot.getActiveGame(this.summoner.id);

        if (
            currentGame &&
            currentGame.gameId &&
            currentGame.gameId != this.lastGameId
        ) {
            log.info(`onGameFound: ${currentGame.gameId}`);
            this.emit("onGameFound", currentGame);

            // New game found
            this.currentGame = currentGame;
            this.lastGameId = currentGame.gameId;

            this.status = "loading";

            // Launch the spectator client
            try {
                await this.launchSpectatorClient();

                // Game ended, refresh the league entry
                await this.refreshLeagueEntry();
            } catch (error) {
                log.error(`Error launching spectator client. Retrying`, error);

                await this.exitSpectatorClient();
                this.lastGameId = 0;
            }
        } else {
            this.status = "searching";
        }

        if ((this.status as any) != "offline") {
            this.currentTimeout = setTimeout(() => {
                this.checkForNewGame();
            }, this.timeoutInterval);
        }
    }
}
