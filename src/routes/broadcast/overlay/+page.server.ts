import type { PageServerLoad } from "./$types";
import type { LiveClientData } from "../../api/spectator/lol/liveclientdata/+server";

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const res = await fetch("/api/spectator/lol/liveclientdata", {
        method: "GET",
    });

    if (!res.ok) {
        return {
            status: "notingame",
        };
    }

    const data: LiveClientData = await res.json();

    if (!data.allPlayers) {
        return {
            status: "notingame",
        };
    }

    return {
        status: "ingame",
        farsight: data.farsight,
        allPlayers: data.allPlayers,
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
