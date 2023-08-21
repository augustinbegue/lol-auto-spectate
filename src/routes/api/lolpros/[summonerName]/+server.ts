import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSummoner } from "$lib/server/lol-pros";

export const GET: RequestHandler = async ({ params }) => {
    const { summonerName } = params;

    if (!summonerName) {
        throw error(400, "Summoner name not provided");
    }

    let lpro = await getSummoner(summonerName);

    if (!lpro) {
        throw error(404, "Summoner not found");
    }

    return json(lpro);
};
