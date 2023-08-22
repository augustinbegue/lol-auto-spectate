import tmi, { type Options, type CommonUserstate, client } from "tmi.js";
import type { LolSpectator } from "./lol-spectator";
import { Logger } from "tslog";
import { getSummoner } from "./lol-pros";

const log = new Logger({
    name: "twitch-bot",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
});

export class TwitchBot {
    lolSpectator: LolSpectator | undefined;

    authenticated = false;
    scopes = [
        "moderator:manage:announcements",
        "moderator:manage:banned_users",
        "channel:manage:broadcast",
        "chat:read",
        "chat:edit",
    ];
    private accessToken = "";
    private refreshToken = "";
    twitchUser: any;

    client: tmi.Client | undefined;

    voteTime = 1000 * 60 * 1;
    voteInProgress = false;
    voteSummonerName = "";
    voted: string[] = [];
    votes: { [key: string]: number } = {};
    voteStart = 0;
    voteEnd = 0;

    constructor(lolSpectator: LolSpectator) {
        this.lolSpectator = lolSpectator;
    }

    getAuthUrl(redirect_uri: string) {
        const details = {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: "client_credentials",
        };

        return `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${
            details.client_id
        }&redirect_uri=${redirect_uri}&scope=${this.scopes.join("+")}`;
    }

    async authenticate(redirect_uri: string, code: string) {
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
        endpoint: string,
        headers: any,
        body: any,
        refreshed = false,
    ): Promise<Response> {
        if (!this.accessToken) {
            throw new Error("[twitch-bot] Not authenticated");
        }

        const res = await fetch(`https://api.twitch.tv/${endpoint}`, {
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
            return this.twitchRequest(method, endpoint, body, headers, true);
        } else if (res.status === 401) {
            throw new Error("[twitch-bot] Failed to refresh Twitch token");
        }

        if (!res.ok) {
            log.error(
                `Failed to make Twitch request to: ${res.status} ${
                    res.statusText
                } ${await res.text()}`,
            );
            console.log(method, endpoint, headers, body);
        }

        return res;
    }

    private async getUser(username: string) {
        const res = await this.twitchRequest(
            "GET",
            `helix/users?login=${username}`,
            {},
            undefined,
        );

        if (!res.ok) {
            throw new Error(
                `[twitch-bot] Failed to get user ${username}: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();
        if (!json.data || json.data.length === 0) {
            return null;
        }

        return json.data[0];
    }

    private async chatAnnouncement(message: string) {
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

    private async updateStream(options: {
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

        if (!this.lolSpectator?.riot) {
            throw new Error("[twitch-bot] riotApi is not defined");
        }

        const summonerName = args.join(" ").trim();

        if (summonerName.length === 0 || this.voteInProgress) {
            return;
        }

        log.info(`Checking if summoner ${summonerName} exists`);
        let summonerId = await this.lolSpectator.riot.getSummonerIdsByName(
            summonerName,
        );

        if (!summonerId) {
            this.client!.say(
                target,
                `@${context.username} Summoner "${summonerName}" not found`,
            );
            return;
        }

        let newLolpro = await getSummoner(summonerId.name);

        this.voteSummonerName = newLolpro
            ? `${newLolpro.name} (${summonerId.name})`
            : summonerId.name;

        if (!this.lolSpectator?.summoner?.name) {
            await this.chatAnnouncement(
                `@${context.username} Switching to ${this.voteSummonerName}`,
            );
            await this.lolSpectator?.start(summonerName);
            return;
        }

        let oldLolpro = await getSummoner(this.lolSpectator?.summoner?.name);
        let oldSummonerName = oldLolpro
            ? `${oldLolpro.name} (${this.lolSpectator.summoner.name})`
            : this.lolSpectator.summoner.name;

        log.info(`Starting vote to switch to ${this.voteSummonerName}`);
        await this.chatAnnouncement(
            `Starting the vote to switch to: ${this.voteSummonerName} | To switch, type !yes. To stay with ${oldSummonerName}, type !no | 1min`,
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
                `Vote to switch to ${this.voteSummonerName} | Yes: ${yesVotes} | No: ${noVotes} | Remaining ${remaining}s`,
            );
        }, 1001 * 20);

        setTimeout(async () => {
            this.voteInProgress = false;

            const yesVotes = this.votes["!yes"] || 0;
            const noVotes = this.votes["!no"] || 0;

            if (yesVotes > noVotes) {
                await this.chatAnnouncement(`Switching to ${summonerName}`);

                await this.updateStream({
                    title: process.env.TWITCH_STREAM_TITLE?.replace(
                        "{summonerName}",
                        this.voteSummonerName,
                    ),
                });

                await this.lolSpectator?.stop();
                await this.lolSpectator?.start(summonerName);
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
            if (!this.lolSpectator?.summoner?.name) {
                return;
            }

            this.client!.say(
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
