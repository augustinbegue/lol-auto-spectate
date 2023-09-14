import { getSummoner, type CachedSummoner } from "$lib/server/utils/db";
import prisma from "$lib/server/utils/prisma";
import type { RequestHandler } from "./$types";
import { error, json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ locals, request }) => {
    const { summonerName, obsControl } = await request.json();

    if (!summonerName) {
        throw error(400, "Summoner name not provided");
    }

    if (!locals.lolSpectator) {
        throw error(500, "LolSpectator not instantiated");
    }

    if (!locals.obsController) {
        throw error(500, "OBSController not instantiated");
    }

    try {
        if (obsControl) {
            await locals.obsController.setup();
        }

        const summoner = await getSummoner(summonerName);
        
        if (!summoner) {
            throw error(404, "Summoner not found");
        }

        await locals.lolSpectator.setSummoner(summoner);
    } catch (err) {
        throw error(500, (err as any).message);
    }

    return json({
        success: true,
        status: locals.status,
        summoner: locals.lolSpectator.summoner,
    });
};
