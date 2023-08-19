import ks from "node-key-sender";
import robot from "robotjs";
import { RiotWrapper } from "lol-api-wrapper";
import type {
    CurrentGameInfo,
    LeagueEntryDTO,
    SummonerDTO,
} from "lol-api-wrapper/types";
import { ChildProcess, exec, execSync } from "child_process";
import { OBSController } from "$lib/server/obs-controller";
import { TwitchBot } from "./twitch-bot";
import { Logger } from "tslog";

const log = new Logger({
    name: "lol-spectator",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class LolSpectator {
    private status: "offline" | "searching" | "ingame" | "loading" = "offline";

    riot: RiotWrapper | undefined;
    summoner: SummonerDTO | undefined;
    currentGame: CurrentGameInfo | undefined;
    summonerGameIndex: number | undefined;
    leagueEntry: LeagueEntryDTO | undefined;

    currentTimeout: NodeJS.Timeout | null = null;
    timeoutInterval = 1000 * 5;
    lastGameId = 0;

    leagueFolderPath: string;
    spectatorProcess: ChildProcess | null = null;

    obsController: OBSController | null = null;

    twitchBot: TwitchBot | null = null;

    constructor(leagueFolderPath: string) {
        this.leagueFolderPath = leagueFolderPath;
    }

    async init(obsControl: boolean = false) {
        if (!this.riot) {
            this.riot = await RiotWrapper.build();
        }

        if (obsControl) {
            if (!this.obsController) {
                this.obsController = new OBSController();
                await this.obsController.setup();
            }

            if (!this.twitchBot) {
                this.twitchBot = new TwitchBot(this);
            }
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
        this.status = "searching";

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
            // New game found
            this.currentGame = currentGame;
            this.lastGameId = currentGame.gameId;

            log.info(`New game found: ${currentGame.gameId}`);

            this.status = "loading";

            if (this.obsController) {
                await this.obsController?.setWaitingScene();
                if (!this.obsController?.isStreaming()) {
                    await this.obsController?.startStreaming();
                }
            }

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
        }

        if ((this.status as any) != "offline") {
            this.currentTimeout = setTimeout(() => {
                this.checkForNewGame();
            }, this.timeoutInterval);
        }
    }

    private launchSpectatorClient() {
        if (!this.summoner) {
            throw new Error("[lol-spectator] Summoner not found");
        }

        if (!this.currentGame) {
            throw new Error("[lol-spectator] No game found");
        }

        let specCommand = `"League of Legends.exe" "spectator spectator-consumer.euw1.lol.pvp.net:80 ${this.currentGame.observers.encryptionKey} ${this.currentGame.gameId} EUW1" "-UseRads" "-GameBaseDir=.." "-Locale=en_GB"`;

        log.info(`Launching spectator client: ${specCommand}`);

        return new Promise<void>(async (resolve, reject) => {
            // Launch the spectator client
            this.spectatorProcess = exec(specCommand, {
                cwd: this.leagueFolderPath,
            });

            log.info(
                `Spectator client launched. PID: ${this.spectatorProcess.pid}`,
            );

            this.spectatorProcess.on("exit", (code, signal) => {
                log.warn(
                    `Spectator client exited with code ${code} and signal ${signal}`,
                );
                this.spectatorProcess = null;
                reject();
            });

            // Handle spectator client errors
            this.spectatorProcess.stderr?.on("data", async (data) => {
                log.debug(data);

                // Check for replay error
                if ((data as string).includes("ERROR| ReplayDownloader")) {
                    console.log("Failed to download replay");
                    // Kill the spectator client
                    await this.exitSpectatorClient();
                    reject();
                }

                // Retreive summoner position in game
                if (
                    this.summoner &&
                    ((data as string).includes("TeamOrder") ||
                        (data as string).includes("TeamChaos")) &&
                    (data as string).includes(this.summoner.name)
                ) {
                    let str = data as string;
                    let pos = str.indexOf(this.summoner.name);
                    let summonerIndex = parseInt(str[pos - 4]);

                    log.silly("Summoner position: ${summonerIndex}");

                    this.summonerGameIndex = summonerIndex;
                }

                // Check if the game has started
                if ((data as string).includes("Received Game Start Packet")) {
                    this.status = "ingame";

                    log.silly("Game started");

                    // Wait for the game to load and then configure the camera
                    setTimeout(async () => {
                        this.configureCamera();

                        if (this.obsController) {
                            await this.obsController?.setGameScene();
                        }
                    }, 1000 * 5);
                }

                // Check if the game has ended
                if ((data as string).includes("Received Game End Packet")) {
                    log.silly("Game ended");

                    // Wait for the game to end and then kill the spectator client
                    setTimeout(async () => {
                        console.log("Exiting spectator client");
                        await this.exitSpectatorClient();
                        resolve();
                    }, 1000 * 10);
                    resolve();
                }
            });
        });
    }

    private async exitSpectatorClient() {
        if (this.obsController) {
            await this.obsController?.setWaitingScene();
        }

        // Kill league of legends.exe
        try {
            execSync(`taskkill /F /IM "League of Legends.exe"`);
        } catch (error) {
            log.warn("Failed to kill League of Legends.exe");
        }

        this.spectatorProcess = null;
    }

    private async configureCamera() {
        // Set camera zoom
        console.log("Setting camera zoom");
        robot.moveMouse(10, 10);
        robot.mouseClick();
        await ks.sendCombination(["control", "shift", "z"]);
        robot.scrollMouse(100000000, 100000000);

        // Set HUD
        console.log("Setting HUD");
        ks.sendKey("u");
        ks.sendKey("o");
        ks.sendKey("n");

        console.log("Setting camera lock");
        if (this.summonerGameIndex != null) {
            this.configureSummonerCamera(this.summonerGameIndex);
        } else {
            // Set camera lock
            ks.sendKey("y");
            ks.sendKey("d");
        }
    }

    private configureSummonerCamera(summonerIndex: number) {
        if (!this.summoner) {
            throw new Error("[lol-spectator] Summoner not found");
        }

        if (!this.currentGame) {
            throw new Error("[lol-spectator] No game found");
        }

        // Find player in game
        let playerIndex = this.currentGame.participants.findIndex(
            (p) => p.summonerId == this.summoner?.id,
        );
        let player = this.currentGame.participants[playerIndex];
        if (!player) {
            throw new Error("[lol-spectator] Player not found in game");
        }

        let playerTeam = player.teamId;
        if (!playerTeam) {
            throw new Error("[lol-spectator] Player team not found");
        }

        log.silly(`Player team: ${playerTeam}`);

        // Set fog of war
        log.info("Setting fog of war");
        if (playerTeam == 100) {
            // Blue side
            ks.sendKey("f1");
        } else {
            // Red side
            ks.sendKey("f2");
        }

        // Set camera lock
        log.info("Setting camera lock");
        if (playerTeam == 100) {
            // Blue side
            switch (summonerIndex) {
                case 0:
                    ks.sendKey("1");
                    ks.sendKey("1");
                    break;
                case 1:
                    ks.sendKey("2");
                    ks.sendKey("2");
                    break;
                case 2:
                    ks.sendKey("3");
                    ks.sendKey("3");

                    break;
                case 3:
                    ks.sendKey("4");
                    ks.sendKey("4");
                    break;
                case 4:
                    ks.sendKey("5");
                    ks.sendKey("5");
                default:
                    break;
            }
        } else {
            // Red side
            switch (summonerIndex) {
                case 0:
                    ks.sendKey("q");
                    ks.sendKey("q");
                    break;
                case 1:
                    ks.sendKey("w");
                    ks.sendKey("w");
                    break;
                case 2:
                    ks.sendKey("e");
                    ks.sendKey("e");
                    break;
                case 3:
                    ks.sendKey("r");
                    ks.sendKey("r");
                    break;
                case 4:
                    ks.sendKey("t");
                    ks.sendKey("t");
                default:
                    break;
            }
        }
    }
}
