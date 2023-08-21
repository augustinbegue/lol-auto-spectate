import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.lolSpectator) {
        return {
            lolSpectator: {
                status: "offline",
            },
        };
    }

    // Check for twitch auth code
    if (url.searchParams.has("code")) {
        try {
            const code = url.searchParams.get("code")!;

            await locals.twitchBot?.authenticate(url.origin, code);

            url.searchParams.delete("code");
        } catch (error) {
            console.error(error);
        } finally {
            throw redirect(303, url.pathname);
        }
    }

    return {
        lolSpectator: {
            status: locals.lolSpectator.getStatus(),
            summoner: locals.lolSpectator.summoner,
            obsControl: !!locals.lolSpectator.obsController,
            twitchBot: !!locals.lolSpectator.twitchBot,
        },
        twitchBot: {
            authenticated: !!locals.twitchBot?.authenticated,
            authUrl: locals.twitchBot?.getAuthUrl(url.origin),
        },
    };
};
