import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

import items from "../../../../../../static/assets/datadragon/data/en_GB/item.json";

export const GET: RequestHandler = async ({ fetch }) => {
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

        for (let i = 0; i < data.allPlayers.length; i++) {
            const p = data.allPlayers[i];

            p.items = p.items.map((item) => {
                const itemData = (items as any).data[item.itemID];

                item.price = itemData.gold.total;

                return item;
            });
        }

        return json(data);
    } catch (e) {
        throw error(500, JSON.stringify(e));
    }
};

export interface LiveClientData {
    activePlayer: ActivePlayer;
    allPlayers: AllPlayer[];
    events: Events;
    gameData: GameData;
}

export interface ActivePlayer {
    error: string;
}

export interface AllPlayer {
    championName: string;
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
