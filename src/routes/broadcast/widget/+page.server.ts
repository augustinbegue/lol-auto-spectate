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
        leagueHistory: locals.lolSpectator.leagueHistory,
        lolpro: getSummoner(locals.lolSpectator.summoner.name),
        twitchBot: {
            voteInProgress: locals.twitchBot?.voteInProgress,
            votes: locals.twitchBot?.votes,
            voteSummonerName: locals.twitchBot?.voteSummonerDisplayName,
            voteEnd: locals.twitchBot?.voteEnd,
        },
    };
};
