import { LolSpectator } from "$lib/server/lol-spectator";
import type { Handle } from "@sveltejs/kit";
import { findLeaguePath } from "$lib/server/utils/findLeaguePath";

let lolSpectator: LolSpectator;

export const handle: Handle = async ({ event, resolve }) => {
    if (!lolSpectator) {
        console.log("[SERVER] Initializing LolSpectator");

        lolSpectator = new LolSpectator(findLeaguePath());
        await lolSpectator.init();
    }

    event.locals.lolSpectator = lolSpectator;

    return resolve(event);
};
