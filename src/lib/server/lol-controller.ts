import type TypedEmitter from "typed-emitter";
import { EventEmitter } from "node:events";
import { ChildProcess, exec, execSync } from "node:child_process";

import ks from "node-key-sender";
import type { CurrentGameInfo, SummonerDTO } from "lol-api-wrapper/types";
import { Logger } from "tslog";
import type { CachedSummoner } from "./utils/db";

const log = new Logger({
    name: "lol-controller",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

type LolControllerEvents = {
    onGameLoading: (
        summoner: CachedSummoner,
        game: CurrentGameInfo,
        process: ChildProcess,
    ) => void;
    onGameStarted: (summoner: CachedSummoner, game: CurrentGameInfo) => void;
    onGameEnded: (summoner: CachedSummoner, game: CurrentGameInfo) => void;
    onGameExited: (summoner?: CachedSummoner, game?: CurrentGameInfo) => void;
};

export class LolController extends (EventEmitter as new () => TypedEmitter<LolControllerEvents>) {
    summoner: CachedSummoner | undefined;
    currentGame: CurrentGameInfo | undefined;
    summonerGameIndex: number | undefined;

    private leagueFolderPath: string;
    private spectatorProcess: ChildProcess | null = null;

    private gameEnded = false;

    constructor(leagueFolderPath: string) {
        super();

        this.leagueFolderPath = leagueFolderPath;
    }

    async launch(summoner: CachedSummoner, game: CurrentGameInfo, retry = 0) {
        this.gameEnded = false;
        this.summoner = summoner;
        this.currentGame = game;

        try {
            await this.exec();
        } catch (error) {
            this.emit("onGameExited", this.summoner, this.currentGame);

            log.warn(`Client exited with error: `, error);

            if (!this.gameEnded) {
                // Game crashed
                log.warn(
                    "Client crashed. Relaunching spectator client in 10 seconds.",
                );

                await new Promise((resolve) => setTimeout(resolve, 1000 * 10));

                await this.launch(this.summoner, this.currentGame, retry + 1);
            } else {
                log.info("Game ended. Not relaunching spectator client");
            }
        }
    }

    exit() {
        log.info("Exiting spectator client");

        this.gameEnded = true;

        this.kill();
    }

    private kill() {
        // Kill league of legends.exe
        try {
            execSync(`taskkill /F /IM "League of Legends.exe"`);
        } catch (error) {
            log.warn("Failed to kill League of Legends.exe");
        }

        this.spectatorProcess = null;
    }

    private exec() {
        if (!this.summoner) {
            throw new Error("[lol-controller] Summoner not found");
        }

        if (!this.currentGame) {
            throw new Error("[lol-controller] No game found");
        }

        let specCommand = `"League of Legends.exe" "spectator spectator-consumer.euw1.lol.pvp.net:80 ${this.currentGame.observers.encryptionKey} ${this.currentGame.gameId} EUW1" "-UseRads" "-GameBaseDir=.." "-Locale=en_GB"`;

        log.info(`Launching spectator client: ${specCommand}`);

        return new Promise<void>(async (resolve, reject) => {
            // Launch the spectator client
            this.spectatorProcess = exec(specCommand, {
                cwd: this.leagueFolderPath,
            });

            this.emit(
                "onGameLoading",
                this.summoner!,
                this.currentGame!,
                this.spectatorProcess!,
            );

            log.info(
                `Spectator client launched. PID: ${this.spectatorProcess.pid}`,
            );

            this.spectatorProcess.on("exit", (code, signal) => {
                log.warn(
                    `Spectator client exited with code ${code} and signal ${signal}`,
                );
                this.spectatorProcess = null;
                reject(code);
            });

            // Handle spectator client output
            this.spectatorProcess.stderr?.on("data", async (data) => {
                // log.debug(data);

                // Check for replay error
                if ((data as string).includes("ERROR| ReplayDownloader")) {
                    // Kill the spectator client
                    this.kill();
                    reject("Failed to download replay");
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

                    log.debug(`Summoner position: ${summonerIndex}`);

                    this.summonerGameIndex = summonerIndex;
                }

                // Check if the game has started
                if ((data as string).includes("Received Game Start Packet")) {
                    // Wait for the game to load and then configure the camera
                    setTimeout(async () => {
                        await this.configureCamera();
                        this.gameEnded = false;

                        this.emit(
                            "onGameStarted",
                            this.summoner!,
                            this.currentGame!,
                        );
                    }, 1000 * 5);
                }

                // Check if the game has ended
                if ((data as string).includes("Received Game End Packet")) {
                    // Wait for the game to end and then kill the spectator client
                    setTimeout(async () => {
                        this.gameEnded = true;

                        this.emit(
                            "onGameEnded",
                            this.summoner!,
                            this.currentGame!,
                        );

                        await this.exit();
                    }, 1000 * 10);
                }
            });
        });
    }

    private async configureCamera() {
        // Set camera zoom
        log.debug("Setting camera zoom");
        execSync(`${process.cwd()}/scripts/autohotkey/scrolldown.exe`);

        // Set HUD
        log.debug("Setting HUD");
        ks.sendKey("u");
        ks.sendKey("o");
        ks.sendKey("n");

        log.debug("Setting camera lock");
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
            throw new Error("[lol-controller] Summoner not found");
        }

        if (!this.currentGame) {
            throw new Error("[lol-controller] No game found");
        }

        // Find player in game
        let playerIndex = this.currentGame.participants.findIndex(
            (p) => p.summonerId == this.summoner?.id,
        );
        let player = this.currentGame.participants[playerIndex];
        if (!player) {
            throw new Error("[lol-controller] Player not found in game");
        }

        let playerTeam = player.teamId;
        if (!playerTeam) {
            throw new Error("[lol-controller] Player team not found");
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
