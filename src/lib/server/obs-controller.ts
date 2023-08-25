import OBSWebSocket from "obs-websocket-js";
import { Logger } from "tslog";

const log = new Logger({
    name: "obs-controller",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class OBSController {
    obs: OBSWebSocket;
    connected: boolean = false;
    sceneCollection: string = "lol-auto-spectate";
    waitingScene: string = "waiting";
    gameScene: string = "ingame";

    constructor() {
        this.obs = new OBSWebSocket();
    }

    async setup() {
        if (!process.env["OBS_WS_URL"]) {
            throw new Error("env var OBS_WS_URL missing");
        }

        if (!process.env["OBS_WS_PASSWORD"]) {
            throw new Error("env var OBS_WS_PASSWORD missing");
        }

        try {
            const { obsWebSocketVersion, negotiatedRpcVersion } =
                await this.obs.connect(
                    process.env["OBS_WS_URL"],
                    process.env["OBS_WS_PASSWORD"],
                    {
                        rpcVersion: 1,
                    },
                );
            log.info(
                `Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`,
            );
            this.connected = true;

            this.obs.on("ConnectionClosed", (data) => {
                log.warn("Connection closed", data);
                this.connected = false;
            });

            this.sceneCollection =
                process.env["OBS_SCENE_COLLECTION"] || "lol-auto-spectate";
            this.waitingScene = process.env["OBS_WAITING_SCENE"] || "waiting";
            this.gameScene = process.env["OBS_GAME_SCENE"] || "ingame";

            await this.obs.call("SetCurrentSceneCollection", {
                sceneCollectionName: this.sceneCollection,
            });

            await this.setWaitingScene();
            await this.isStreaming();

            log.info("Setup complete");
        } catch (err: any) {
            log.error("Failed to connect", err.code, err.message);
        }
    }

    async isStreaming() {
        let status = await this.obs.call("GetStreamStatus");

        log.info(`Stream status: ${status.outputActive}`);

        return status.outputActive;
    }

    async startStreaming() {
        log.info(`Starting stream`);

        await this.obs.call("StartStream");
    }

    async stopStreaming() {
        log.info(`Stopping stream`);

        await this.obs.call("StopStream");
    }

    async setWaitingScene() {
        log.info(`Setting waiting scene`);

        await this.obs.call("SetCurrentProgramScene", {
            sceneName: this.waitingScene,
        });
    }

    async setGameScene() {
        log.info(`Setting game scene`);

        await this.obs.call("SetCurrentProgramScene", {
            sceneName: this.gameScene,
        });
    }

    async getCurrentScene() {
        return (await this.obs.call("GetCurrentProgramScene"))
            .currentProgramSceneName;
    }

    async isWaitingScene() {
        let currentScene = await this.getCurrentScene();

        return currentScene === this.waitingScene;
    }

    async isGameScene() {
        let currentScene = await this.getCurrentScene();

        return currentScene === this.gameScene;
    }
}
