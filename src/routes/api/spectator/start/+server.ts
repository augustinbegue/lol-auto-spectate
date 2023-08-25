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
        await locals.lolSpectator.init();

        if (obsControl) {
            await locals.obsController.setup();
        }

        await locals.lolSpectator.start(summonerName);
    } catch (err) {
        throw error(500, (err as any).message);
    }

    return json({
        success: true,
        status: locals.lolSpectator.getStatus(),
        summoner: locals.lolSpectator.summoner,
    });
};
