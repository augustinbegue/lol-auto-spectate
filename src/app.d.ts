import { LolSpectator } from "$lib/server/lol-spectator";
import { TwitchBot } from "$lib/server/twitch-bot";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            lolSpectator: LolSpectator;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

export {};
