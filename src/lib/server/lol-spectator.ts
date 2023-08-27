import { RiotApiWrapper } from "lol-api-wrapper";
import type { CurrentGameInfo, LeagueEntryDTO, SummonerDTO } from "lol-api-wrapper/types";
import { Logger } from "tslog";
import { LolController } from "./lol-controller";

const log = new Logger({
    name: "lol-spectator",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class LolSpectator extends LolController {
    riot: RiotApiWrapper | undefined;
    leagueEntry: LeagueEntryDTO | undefined;
    leagueHistory: {
        date: Date;
        leagueEntry: LeagueEntryDTO;
    }[] = [];

    currentTimeout: NodeJS.Timeout | null = null;
    timeoutInterval = 1000 * 5;

    lastSpectatedGameId = 0;

    constructor(leagueFolderPath: string) {
        super(leagueFolderPath);
    }

    async init() {
        if (!this.riot) {
            this.riot = new RiotApiWrapper(process.env.RIOT_API_KEY!);
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

        let summoner: SummonerDTO;
        try {
            summoner = await this.riot.getSummonerByName("EUW1", summonerName);
        } catch (error) {
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
                `[lol-spectator] Summoner ${this.summoner} not found`,
            );
        }

        let leagueEntries = await this.riot?.getLeagueEntriesBySummonerId(
            "EUW1",
            this.summoner.id,
        );

        this.leagueEntry = leagueEntries?.find(
            (e) => e.queueType == "RANKED_SOLO_5x5",
        );

        if (this.leagueEntry) {
            this.leagueHistory.push({
                date: new Date(),
                leagueEntry: this.leagueEntry,
            });
        }
    }

    private async checkForNewGame() {
        if (!this.riot) {
            throw new Error("[lol-spectator] Spectator not initialized");
        }

        if (!this.summoner) {
            throw new Error(`[lol-spectator] Summoner not found`);
        }

        // Check if the summoner has a game in progress
        try {
            let currentGame = await this.riot.getActiveGameBySummonerId("EUW1", this.summoner.id);

            if (
                currentGame &&
                currentGame.gameId &&
                currentGame.gameId != this.lastSpectatedGameId
            ) {
                log.info(`onGameFound: ${currentGame.gameId}`);
                this.emit("onGameFound", currentGame);

                // New game found
                this.currentGame = currentGame;
                this.lastSpectatedGameId = currentGame.gameId;

                this.status = "loading";

                // Launch the spectator client
                try {
                    await this.launchSpectatorClient();

                    // Game ended, refresh the league entry
                    await this.refreshLeagueEntry();
                } catch (error) {
                    log.error(`Error launching spectator client. Retrying`, error);

                    await this.exitSpectatorClient();
                    this.lastSpectatedGameId = 0;
                }
            }
        } catch (error) {
            log.info(`No game found`);
            this.status = "searching";
        }

        if (this.status !== "offline") {
            this.currentTimeout = setTimeout(() => {
                this.checkForNewGame();
            }, this.timeoutInterval);
        }
    }
}
