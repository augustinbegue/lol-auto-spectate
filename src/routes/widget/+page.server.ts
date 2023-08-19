import { getSummoner } from "$lib/server/lol-pros";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.lolSpectator) {
        return {
            status: "offline",
        };
    }

    if (!locals.lolSpectator.summoner) {
        return {
            status: locals.lolSpectator.getStatus(),
        };
    }
    return {
        status: locals.lolSpectator.getStatus(),
        summoner: locals.lolSpectator.summoner,
        leagueEntry: locals.lolSpectator.leagueEntry,
        lolpro: getSummoner(locals.lolSpectator.summoner.name),
        twitchBot: {
            voteInProgress: locals.lolSpectator.twitchBot?.voteInProgress,
            votes: locals.lolSpectator.twitchBot?.votes,
            voteSummonerName: locals.lolSpectator.twitchBot?.voteSummonerName,
            voteEnd: locals.lolSpectator.twitchBot?.voteEnd,
        },
    };
};
