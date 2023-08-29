import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import farsight, { type GameObject } from "@larseble/farsight";

export const GET: RequestHandler = async ({ locals, fetch }) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    try {
        const res = await fetch(
            `https://127.0.0.1:2999/liveclientdata/allgamedata`,
            {
                method: "GET",
            },
        );

        if (!res.ok) {
            throw error(res.status, await res.text());
        }

        const data: LiveClientData = await res.json();

        let fsight = true;
        if (!farsight.isReady()) {
            fsight = await farsight.connectToLeague();
        }

        if (!fsight) {
            return json(data);
        }

        const snapshot = farsight.makeSnapshot();

        for (let i = 0; i < data.allPlayers.length; i++) {
            const player = data.allPlayers[i];

            player.championStats = snapshot.champions.find(
                (champion) => champion.displayName === player.summonerName,
            ) as any;
        }

        return json({
            ...data,
            farsight: fsight,
            inhibitors: snapshot.inhibitors,
            jungle: snapshot.jungle,
            turrets: snapshot.turrets,
            nextDragonType: snapshot.nextDragonType,
            other: snapshot.other,
        });
    } catch (e) {
        throw error(500, JSON.stringify(e));
    }
};

export interface LiveClientData {
    farsight?: boolean;
    activePlayer: ActivePlayer;
    allPlayers: AllPlayer[];
    events: Events;
    gameData: GameData;
    turrets?: GameObject[];
    inhibitors?: GameObject[];
    jungle?: GameObject[];
    other?: GameObject[];
    nextDragonType?: string;
}

export interface ActivePlayer {
    error: string;
}

export interface AllPlayer {
    championName: string;
    championStats?: GameObject & {
        currentGold: number;
        totalGold: number;
        experience: number;
        level: number;
    };
    isBot: boolean;
    isDead: boolean;
    items: Item[];
    level: number;
    position: string;
    rawChampionName: string;
    rawSkinName?: string;
    respawnTimer: number;
    runes: Runes;
    scores: Scores;
    screenPositionBottom: string;
    screenPositionCenter: string;
    skinID: number;
    skinName?: string;
    summonerName: string;
    summonerSpells: SummonerSpells;
    team: string;
}

export interface Item {
    canUse: boolean;
    consumable: boolean;
    count: number;
    displayName: string;
    itemID: number;
    price: number;
    rawDescription: string;
    rawDisplayName: string;
    slot: number;
}

export interface Runes {
    keystone: Keystone;
    primaryRuneTree: PrimaryRuneTree;
    secondaryRuneTree: SecondaryRuneTree;
}

export interface Keystone {
    displayName: string;
    id: number;
    rawDescription: string;
    rawDisplayName: string;
}

export interface PrimaryRuneTree {
    displayName: string;
    id: number;
    rawDescription: string;
    rawDisplayName: string;
}

export interface SecondaryRuneTree {
    displayName: string;
    id: number;
    rawDescription: string;
    rawDisplayName: string;
}

export interface Scores {
    assists: number;
    creepScore: number;
    deaths: number;
    kills: number;
    wardScore: number;
}

export interface SummonerSpells {
    summonerSpellOne: SummonerSpellOne;
    summonerSpellTwo: SummonerSpellTwo;
}

export interface SummonerSpellOne {
    displayName: string;
    rawDescription: string;
    rawDisplayName: string;
}

export interface SummonerSpellTwo {
    displayName: string;
    rawDescription: string;
    rawDisplayName: string;
}

export interface Events {
    Events: Event[];
}

export interface Event {
    EventID: number;
    EventName: string;
    EventTime: number;
    Assisters?: string[];
    KillerName?: string;
    VictimName?: string;
    Recipient?: string;
}

export interface GameData {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
    mapTerrain: string;
}
