import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSummoner } from "$lib/server/utils/db";

export const GET: RequestHandler = async ({ params }) => {
    const { summonerName } = params;

    if (!summonerName) {
        throw error(400, "Summoner name not provided");
    }

    try {
        let summoner = await getSummoner(summonerName);

        if (!summoner) {
            throw error(404, "Summoner not found");
        }

        return json(summoner);
    } catch (e) {
        throw error(500, "Failed to fetch summoner");
    }
};
