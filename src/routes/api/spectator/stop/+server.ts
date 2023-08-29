import type { RequestHandler } from "./$types";
import { error, json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ locals, request }) => {
    try {
        await locals.lolSpectator.stop();
    } catch (err) {
        throw error(500, (err as any).message);
    }

    return json({
        success: true,
        status: locals.status,
        summoner: locals.lolSpectator.summoner,
    });
};
