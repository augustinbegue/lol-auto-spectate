import { LolSpectator } from "$lib/server/lol-spectator";
import { TwitchBot } from "$lib/server/twitch-bot";
import { OBSController } from "$lib/server/obs-controller";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            obsController: OBSController | null;
            twitchBot: TwitchBot | null;
            lolSpectator: LolSpectator;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

export {};
