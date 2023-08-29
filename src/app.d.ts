import { LolSpectator } from "$lib/server/lol-spectator";
import { TwitchController } from "$lib/server/twitch-controller";
import { OBSController } from "$lib/server/obs-controller";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            obsController: OBSController | null;
            twitchBot: TwitchController | null;
            lolSpectator: LolSpectator;
            status: AutoSpectateStatus;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

export { };

export type AutoSpectateStatus = "offline" | "ingame" | "loading" | "searching";
