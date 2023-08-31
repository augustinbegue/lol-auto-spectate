import type TypedEmitter from "typed-emitter";

import { EventEmitter } from "node:events";
import tmi, { type Options, type CommonUserstate, client } from "tmi.js";
import { Logger } from "tslog";
import { RiotApiWrapper } from "lol-api-wrapper";
import { getSummoner, type CachedSummoner } from "./utils/db";
import type { LeagueEntries, Match, Pro, Summoner } from "@prisma/client";
import type { CurrentGameInfo, MatchDTO } from "lol-api-wrapper/types";

const log = new Logger({
    name: "twitch-bot",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

type TwitchBotEvents = {
    onSwitch: (summoner: CachedSummoner) => void;
};

export class TwitchController extends (EventEmitter as new () => TypedEmitter<TwitchBotEvents>) {
    riot: RiotApiWrapper | undefined;
    authenticated = false;
    scopes = [
        "moderator:manage:announcements",
        "moderator:manage:banned_users",
        "channel:edit:commercial",
        "channel:manage:broadcast",
        "channel:manage:predictions",
        "chat:read",
        "chat:edit",
    ];
    private accessToken = "";
    private refreshToken = "";
    twitchUser: any;

    client: tmi.Client | undefined;

    currentSummonerName: string | undefined;

    voteTime = 1000 * 60 * 1;
    voteInProgress = false;
    voteSummonerDisplayName = "";
    voted: string[] = [];
    votes: { [key: string]: number } = {};
    voteStart = 0;
    voteEnd = 0;

    constructor() {
        super();

        this.on("onSwitch", async (summoner) => {
            await this.chatAnnouncement(`Switching to ${this.voteSummonerDisplayName}`);

            await this.updateStream({
                title: process.env.TWITCH_STREAM_TITLE?.replace(
                    "{summonerName}",
                    this.voteSummonerDisplayName,
                ),
            });

            await this.endPrediction("CANCELED");

            this.currentSummonerName = summoner.name;
        });
    }

    async init() {
        if (!this.riot) {
            this.riot = new RiotApiWrapper(process.env.RIOT_API_KEY!);
        }
    }

    getAuthUrl(redirect_uri: string) {
        const details = {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: "client_credentials",
        };

        return `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${details.client_id
            }&redirect_uri=${redirect_uri}&scope=${this.scopes.join("+")}`;
    }

    async authenticate(redirect_uri: string, code: string) {
        await this.init();

        const details = {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri,
        };

        let formBody = [];
        for (let property in details) {
            let encodedKey = encodeURIComponent(property);
            let encodedValue = encodeURIComponent((details as any)[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        const res = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formBody.join("&"),
        });

        if (!res.ok) {
            throw new Error(
                `[twitch-bot] Failed to authenticate with Twitch: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();

        if (!json.access_token) {
            throw new Error("[twitch-bot] Failed to authenticate with Twitch");
        } else {
            log.info(`Successfully authenticated with Twitch`);
        }

        this.accessToken = json.access_token;
        this.refreshToken = json.refresh_token;

        log.debug(`Access token: ${this.accessToken}`);

        this.authenticated = true;
        this.connectToChat();
    }

    private async refresh() {
        const details = {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: this.refreshToken,
        };

        let formBody = [];
        for (let property in details) {
            let encodedKey = encodeURIComponent(property);
            let encodedValue = encodeURIComponent((details as any)[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }

        const res = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formBody.join("&"),
        });

        const json = await res.json();

        if (!json.access_token) {
            throw new Error("[twitch-bot] Failed to refresh Twitch token");
        }

        this.accessToken = json.access_token;
        this.refreshToken = json.refresh_token;
    }

    async twitchRequest(
        method: string,
        path: string,
        headers: any,
        body: any,
        refreshed = false,
    ): Promise<Response> {
        if (!this.accessToken) {
            throw new Error("[twitch-bot] Not authenticated");
        }

        const res = await fetch(`https://api.twitch.tv/${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Client-Id": process.env.TWITCH_CLIENT_ID ?? "",
                ...headers,
            },
            body: body,
        });

        if (res.status === 401 && !refreshed) {
            await this.refresh();
            return this.twitchRequest(method, path, body, headers, true);
        } else if (res.status === 401) {
            throw new Error("[twitch-bot] Failed to refresh Twitch token");
        }

        if (!res.ok) {
            log.error(
                `Failed to make Twitch request to ${path} (${res.status} ${res.statusText
                }): ${await res.text()}`,
            );
        }

        return res;
    }

    userCache: { [key: string]: any } = {};
    private async getUser(username: string) {
        if (!this.userCache[username]) {
            const res = await this.twitchRequest(
                "GET",
                `helix/users?login=${username}`,
                {},
                undefined,
            );

            if (!res.ok) {
                log.error(
                    `Failed to get user ${username}.`,
                );
                return;
            }

            const json = await res.json();
            if (!json.data || json.data.length === 0) {
                return null;
            }

            this.userCache[username] = json.data[0];
        }

        return this.userCache[username];
    }

    async chatAnnouncement(message: string) {
        if (!this.twitchUser) {
            this.twitchUser = await this.getUser(
                process.env.TWITCH_CHANNEL ?? "",
            );
        }

        log.info(`Sending chat announcement: ${message} to`, this.twitchUser);

        const res = await this.twitchRequest(
            "POST",
            `helix/chat/announcements?broadcaster_id=${this.twitchUser.id}&moderator_id=${this.twitchUser.id}`,
            {
                "Content-Type": "application/json",
            },
            JSON.stringify({
                message,
                color: "purple",
            }),
        );

        if (res.ok) {
            log.info(`Chat announcement sent: ${message}`);
            return true;
        }
        return false;
    }

    private async chatban(username: string, reason: string, duration?: number) {
        if (!this.twitchUser) {
            this.twitchUser = await this.getUser(
                process.env.TWITCH_CHANNEL ?? "",
            );
        }

        const targetUser = await this.getUser(username);

        if (!targetUser) {
            log.error(`Failed to find user ${username}`);
            return false;
        }

        const res = await this.twitchRequest(
            "POST",
            `helix/moderation/bans?broadcaster_id=${this.twitchUser.id}&moderator_id=${this.twitchUser.id}`,
            {
                "Content-Type": "application/json",
            },
            JSON.stringify({
                data: {
                    user_id: targetUser.id,
                    reason,
                    duration,
                },
            }),
        );

        if (res.ok) {
            log.info(`Chat banned ${username} for ${duration}s: ${reason}`);
            return true;
        }

        log.error(
            `Failed to chat ban ${username}: ${res.status} ${res.statusText}`,
        );
        return false;
    }

    async updateStream(options: {
        game_id?: string;
        language?: string;
        title?: string;
        tags?: string[];
    }) {
        if (!this.twitchUser) {
            this.twitchUser = await this.getUser(
                process.env.TWITCH_CHANNEL ?? "",
            );
        }

        if (
            !options.game_id &&
            !options.language &&
            !options.title &&
            (!options.tags || options.tags.length === 0)
        ) {
            return;
        }

        const res = await this.twitchRequest(
            "PATCH",
            `helix/channels?broadcaster_id=${this.twitchUser.id}`,
            {
                "Content-Type": "application/json",
            },
            JSON.stringify({
                ...options,
            }),
        );

        if (res.ok) {
            log.info(`Updated stream: ${JSON.stringify(options)}`);
            return true;
        }
    }

    commercial_retry_date = Date.now();
    async startCommercial(duration: number) {
        if (!this.twitchUser) {
            this.twitchUser = await this.getUser(
                process.env.TWITCH_CHANNEL ?? "",
            );

            if (!this.twitchUser) {
                throw new Error(
                    "[twitch-bot] Failed to get Twitch user for commercial",
                );
            }

            if (!duration) {
                throw new Error(
                    "[twitch-bot] Failed to get duration for commercial",
                );
            }

            if (this.commercial_retry_date > Date.now()) {
                log.warn(
                    `Commercial already in progress. Next commercial: ${Math.round(
                        (this.commercial_retry_date - Date.now()) / 1000,
                    )}s`,
                );
                return false;
            }

            const res = await this.twitchRequest(
                "POST",
                "helix/channels/commercial",
                {
                    "Content-Type": "application/json",
                },
                JSON.stringify({
                    broadcaster_id: this.twitchUser.id,
                    length: duration,
                }),
            );

            if (res.ok) {
                const data = await res.json();

                log.info(`Started commercial for ${duration}s. Next commercial: ${data.data[0].retry_after}s`);
                this.commercial_retry_date = new Date(Date.now() + data.data[0].retry_after * 1000).getTime();

                return true;
            } else {
                log.error(`Failed to start commercial: ${res.status} ${res.statusText}`);
                return false;
            }
        }
    }

    async getLastPrediction() {
        const twitchUser = await this.getUser(process.env.TWITCH_CHANNEL ?? "");

        if (!twitchUser) {
            throw new Error("[twitch-bot] Failed to get Twitch user");
        }

        const res = await this.twitchRequest(
            "GET",
            `helix/predictions?broadcaster_id=${twitchUser.id}&first=1`,
            {},
            undefined,
        );

        if (!res.ok) {
            throw new Error(
                `[twitch-bot] Failed to get last prediction.`,
            );
            return;
        }

        const json = await res.json();

        console.log(json);

        if (json.data.length === 0) {
            return null;
        }

        return json.data[0];
    }

    async startPrediction(summoner: CachedSummoner, game: CurrentGameInfo) {
        const lastPrediction = await this.getLastPrediction();

        if (lastPrediction && (lastPrediction.status === "ACTIVE" || lastPrediction.status === "LOCKED")) {
            log.warn(`Prediction already in progress, cancelling it.`);

            await this.endPrediction("CANCELED");
        }

        const twitchUser = await this.getUser(process.env.TWITCH_CHANNEL ?? "");

        if (!twitchUser) {
            throw new Error("[twitch-bot] Failed to get Twitch user");
        }

        let summonerTeam = game.participants.find(
            (p) => p.summonerName === summoner.name,
        )?.teamId;

        let outcome1 = "Blue Side"
        let outcome2 = "Red Side"

        const res = await this.twitchRequest(
            "POST",
            `helix/predictions`,
            {
                "Content-Type": "application/json",
            },
            JSON.stringify({
                broadcaster_id: twitchUser.id,
                title: "Who will win this game?",
                outcomes: [
                    {
                        title: outcome1,
                    },
                    {
                        title: outcome2,
                    },
                ],
                prediction_window: 180,
            }),
        );

        if (!res.ok) {
            log.error(
                `Failed to start prediction.`,
            );
            return;
        }

        const json = await res.json();

        if (!json.data || json.data.length === 0) {
            return null;
        }

        return json.data[0];
    }

    async endPrediction(status: "RESOLVED" | "CANCELED", match?: Match) {
        const lastPrediction = await this.getLastPrediction();

        if (!lastPrediction || (lastPrediction.status !== "ACTIVE" && lastPrediction.status !== "LOCKED")) {
            log.error(
                `No prediction in progress.`,
            );
            return;
        }

        let winning_outcome_id: string | undefined;

        if (status != "CANCELED") {
            let winningTeam = (JSON.parse(match?.data ?? "{}") as MatchDTO).info.teams.find(t => t.win)?.teamId;

            winning_outcome_id = winningTeam === 100 ? lastPrediction.outcomes[0].id : lastPrediction.outcomes[1].id;
        }

        const twitchUser = await this.getUser(process.env.TWITCH_CHANNEL ?? "");

        if (!twitchUser) {
            throw new Error("[twitch-bot] Failed to get Twitch user");
        }

        const res = await this.twitchRequest(
            "PATCH",
            `helix/predictions`,
            {
                "Content-Type": "application/json",
            },
            JSON.stringify({
                broadcaster_id: twitchUser.id,
                id: lastPrediction.id,
                status,
                winning_outcome_id,
            }),
        );

        if (!res.ok) {
            log.error(
                `Failed to end prediction.`,
            );
            return;
        }

        const json = await res.json();

        if (!json.data || json.data.length === 0) {
            return null;
        }

        return json.data[0];
    }

    private async connectToChat(retry = false) {
        if (retry) {
            await this.refresh();

            log.info("Reconnecting to Twitch chat");
        }

        // Define configuration options
        const opts = {
            identity: {
                username: process.env.TWITCH_USERNAME,
                password: `oauth:${this.accessToken}`,
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
        this.client.on("disconnected", () => {
            log.warn("Disconnected from Twitch");
            this.client?.removeAllListeners();
            this.connectToChat(true);
        });

        // Connect to Twitch:
        this.client.connect();
    }

    async onSwitchCommand(
        target: string,
        context: CommonUserstate,
        args: string[],
    ) {
        log.debug(
            `Received switch command from ${context.username} with args ${args}`,
        );

        if (!this.riot) {
            throw new Error("[twitch-bot] riotApi is not defined");
        }

        const summonerName = args.join(" ").trim();

        if (summonerName.length === 0) {
            this.client!.say(
                target,
                `@${context.username} Usage: !switch <summoner name>`,
            );
            return;
        }

        if (summonerName === this.currentSummonerName) {
            this.client!.say(
                target,
                `@${context.username} Already spectating ${this.currentSummonerName}`,
            );
            return;
        }

        if (this.voteInProgress) {
            this.client!.say(
                target,
                `@${context.username} A vote is already in progress`,
            );
            return;
        }

        log.info(`Checking if summoner ${summonerName} exists`);

        let summoner: CachedSummoner | null = null;

        try {
            summoner = await getSummoner(summonerName);
        } catch (err) {
            log.error(`Failed to get summoner ${summonerName}`, err);

            this.client!.say(
                target,
                `@${context.username} Failed to get summoner "${summonerName}"`,
            );
            return;
        }

        if (summoner === null) {
            this.client!.say(
                target,
                `@${context.username} Summoner "${summonerName}" not found`,
            );
            return;
        }

        this.voteSummonerDisplayName = summoner.pro
            ? `${summoner.pro.name} (${summoner.name})`
            : summoner.name;

        if (!this.currentSummonerName) {
            this.emit("onSwitch", summoner);
            return;
        }

        let oldSummoner = await getSummoner(this.currentSummonerName);

        let oldSummonerName = oldSummoner!.pro
            ? `${oldSummoner!.pro.name} (${this.currentSummonerName})`
            : this.currentSummonerName;

        log.info(`Starting vote to switch to ${this.voteSummonerDisplayName}`);
        await this.chatAnnouncement(
            `Starting the vote to switch to: ${this.voteSummonerDisplayName} | To switch, type !yes. To stay with ${oldSummonerName}, type !no | 1min`,
        );

        this.voteInProgress = true;

        this.voteStart = Date.now();
        this.voteEnd = this.voteStart + this.voteTime;

        let int = setInterval(async () => {
            if (!this.voteInProgress) {
                clearInterval(int);
                return;
            }

            const yesVotes = this.votes["!yes"] || 0;
            const noVotes = this.votes["!no"] || 0;

            let remaining = Math.round((this.voteEnd - Date.now()) / 1000);

            await this.chatAnnouncement(
                `Vote to switch to ${this.voteSummonerDisplayName} | Yes: ${yesVotes} | No: ${noVotes} | Remaining ${remaining}s`,
            );
        }, 1001 * 20);

        setTimeout(async () => {
            this.voteInProgress = false;

            const yesVotes = this.votes["!yes"] || 0;
            const noVotes = this.votes["!no"] || 0;

            if (yesVotes > noVotes) {
                this.emit("onSwitch", summoner!);
            } else {
                await this.chatAnnouncement(
                    `Staying with ${oldSummonerName}. @${context.username} is muted for 5 minutes.`,
                );

                this.chatban(
                    context.username,
                    "Lost summoner switch vote",
                    5 * 60,
                );
            }

            this.voted = [];
            this.votes = {};
        }, this.voteTime);
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
            if (!this.currentSummonerName) {
                return;
            }

            this.client!.say(
                target,
                `@${context.username
                } https://euw.op.gg/summoner/userName=${encodeURIComponent(
                    this.currentSummonerName,
                )}`,
            );
            return;
        }
    }

    onConnectedHandler(addr: any, port: any) {
        log.info(`Connected to ${addr}:${port}`);
    }
}
