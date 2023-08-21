import { LolSpectator } from "$lib/server/lol-spectator";
import type { Handle } from "@sveltejs/kit";
import { findLeaguePath } from "$lib/server/utils/findLeaguePath";

let lolSpectator: LolSpectator;

export const handle: Handle = async ({ event, resolve }) => {
    if (!lolSpectator) {
        lolSpectator = new LolSpectator(findLeaguePath());
    }

    event.locals.lolSpectator = lolSpectator;
    event.locals.twitchBot = lolSpectator.twitchBot;
    event.locals.obsController = lolSpectator.obsController;

    return resolve(event);
};
