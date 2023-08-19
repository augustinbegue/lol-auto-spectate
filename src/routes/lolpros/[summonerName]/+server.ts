import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSummoner } from "$lib/server/lol-pros";

export const GET: RequestHandler = async ({ params }) => {
    const { summonerName } = params;

    if (!summonerName) {
        throw error(400, "Summoner name not provided");
    }

    return json(await getSummoner(summonerName));
};
