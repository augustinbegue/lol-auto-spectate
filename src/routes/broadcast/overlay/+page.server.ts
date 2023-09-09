import type { PageServerLoad } from "./$types";
import type { LiveClientData } from "../../api/spectator/client/livedata/+server";
import type { CachedSummoner } from "$lib/server/utils/db";

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const res = await fetch("/api/spectator/client/livedata", {
        method: "GET",
    });

    if (!res.ok) {
        return {
            status: "notingame",
        };
    }

    const data: LiveClientData = await res.json();

    const accounts: { [key: string]: CachedSummoner } = {};

    if (!data.allPlayers) {
        return {
            status: "notingame",
        };
    } else {
        const summonerNames = data.allPlayers.map((player) => {
            return player.summonerName;
        });

        for (const summonerName of summonerNames) {
            const res = await fetch(`/api/summoner/${summonerName}`, {
                method: "GET",
            });

            if (res.ok) {
                const lpro = (await res.json()) as CachedSummoner;

                accounts[summonerName] = lpro;
            }
        }
    }

    return {
        status: "ingame",
        farsight: data.farsight,
        allPlayers: data.allPlayers,
        accounts,
        gameData: data.gameData,
        events: data.events,
        targetSummonerName: locals.lolSpectator.summoner?.name,
        turrets: data.turrets,
        inhibitors: data.inhibitors,
        nextDragonType: data.nextDragonType,
        jungle: data.jungle,
        other: data.other,
    };
};
