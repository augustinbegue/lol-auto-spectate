import type { RiotWrapper } from "lol-api-wrapper";
import tmi, { type Options, type CommonUserstate, client } from "tmi.js";
import type { LolSpectator } from "./lol-spectator";
import { Logger } from "tslog";

const log = new Logger({
    name: "obs-controller",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class TwitchBot {
    riotApi: RiotWrapper | undefined;
    lolSpectator: LolSpectator | undefined;
    client: tmi.Client;

    voteInProgress = false;
    voteSummonerName = "";
    voted: string[] = [];
    votes: { [key: string]: number } = {};
    voteStart = 0;
    voteEnd = 0;

    constructor(lolSpectator: LolSpectator) {
        this.lolSpectator = lolSpectator;
        this.riotApi = lolSpectator.riot;

        // Define configuration options
        const opts = {
            identity: {
                username: process.env.TWITCH_USERNAME,
                password: process.env.TWITCH_PASSWORD,
            },
            channels: [process.env.TWITCH_CHANNEL],
        };

        // Create a client with our options
        this.client = new tmi.client(opts as Options);

        // Register our event handlers (defined below)
        this.client.on("message", (target, context, msg, self) =>
            this.onMessageHandler(target, context, msg, self),
        );
        this.client.on("connected", (addr, port) => {
            this.onConnectedHandler(addr, port);
        });
        this.client.on("disconnected", () =>
            log.warn("Disconnected from Twitch"),
        );

        // Connect to Twitch:
        this.client.connect();

        log.info("TwitchBot initialized");
    }

    async onSwitchCommand(
        target: string,
        context: CommonUserstate,
        args: string[],
    ) {
        log.debug(
            `Received switch command from ${context.username} with args ${args}`,
        );

        if (!this.riotApi) {
            throw new Error("[twitch-bot] riotApi is not defined");
        }

        const summonerName = args.join(" ").trim();

        if (summonerName.length === 0 || this.voteInProgress) {
            return;
        }

        let summonerId = await this.riotApi.getSummonerIdsByName(summonerName);

        if (!summonerId) {
            this.client.say(
                target,
                `@${context.username} Summoner "${summonerName}" not found`,
            );
            return;
        }

        this.voteSummonerName = summonerId.name;

        if (!this.lolSpectator?.summoner?.name) {
            this.client.say(
                target,
                `@${context.username} Switching to ${summonerName}`,
            );
            await this.lolSpectator?.start(summonerName);
            return;
        }

        this.client.say(
            target,
            `🚨🚨 Starting the vote to switch to: ${summonerName} | To switch, type !yes. | To stay with ${this.lolSpectator?.summoner?.name}, type !no | 2min`,
        );

        this.voteInProgress = true;

        this.voteStart = Date.now();
        this.voteEnd = this.voteStart + 1000 * 60 * 2;

        let int = setInterval(() => {
            if (!this.voteInProgress) {
                clearInterval(int);
                return;
            }

            const yesVotes = this.votes["!yes"] || 0;
            const noVotes = this.votes["!no"] || 0;

            let remaining = Math.round((this.voteEnd - Date.now()) / 1000);

            this.client.say(
                target,
                `🚨🚨 Vote to switch to ${summonerName} 🚨🚨 | Yes: ${yesVotes} | No: ${noVotes} | Remaining ${remaining}s`,
            );
        }, 1000 * 30);

        setTimeout(async () => {
            this.voteInProgress = false;

            const yesVotes = this.votes["!yes"] || 0;
            const noVotes = this.votes["!no"] || 0;

            if (yesVotes > noVotes) {
                this.client.say(
                    target,
                    `@${context.username} Switching to ${summonerName}`,
                );
                await this.lolSpectator?.stop();
                await this.lolSpectator?.start(summonerName);
            } else {
                this.client.say(
                    target,
                    `@${context.username} Staying with ${this.lolSpectator?.summoner?.name}`,
                );
            }

            this.voted = [];
            this.votes = {};
        }, 1000 * 60 * 2);
    }

    async onMessageHandler(
        target: string,
        context: CommonUserstate,
        msg: string,
        self: any,
    ) {
        if (self) {
            return;
        } // Ignore messages from the bot

        const message = msg.trim();

        const command = message.split(" ")[0];
        const args = message.split(" ").slice(1);

        if (command === "!switch") {
            await this.onSwitchCommand(target, context, args);
            return;
        }

        if (command === "!yes" || command === "!no") {
            if (!this.voteInProgress) {
                return;
            }

            if (this.voted.includes(context.username)) {
                return;
            }

            this.voted.push(context.username);

            if (!this.votes[command]) {
                this.votes[command] = 0;
            }

            log.debug(`Received vote ${command} from ${context.username}`);

            this.votes[command]++;
            return;
        }

        if (command === "!opgg") {
            if (!this.lolSpectator?.summoner?.name) {
                return;
            }

            this.client.say(
                target,
                `@${context.username} https://euw.op.gg/summoner/userName=${this.lolSpectator?.summoner?.name}`,
            );
            return;
        }
    }

    onConnectedHandler(addr: any, port: any) {
        log.info(`Connected to ${addr}:${port}`);
    }
}
