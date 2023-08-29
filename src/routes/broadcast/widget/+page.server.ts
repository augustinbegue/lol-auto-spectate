import { getSummoner, getSummonerLeagueEntries } from "$lib/server/utils/db";
import prisma from "$lib/server/utils/prisma";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.lolSpectator) {
        return {
            status: "offline",
        };
    }

    if (!locals.lolSpectator.summoner) {
        return {
            status: locals.status ?? "offline",
        };
    }

    return {
        status: locals.status,
        summoner: locals.lolSpectator.summoner,
        summonerLeagues: await prisma.league.findMany({
            where: {
                pros: {
                    some: {
                        id: locals.lolSpectator.summoner.pro?.id,
                    },
                },
            },
        }),
        leagueEntry: (await getSummonerLeagueEntries(locals.lolSpectator.summoner.name, 1))[0],
        leagueHistory: (await getSummonerLeagueEntries(locals.lolSpectator.summoner.name, 10)).reverse(),
        twitchBot: {
            voteInProgress: locals.twitchBot?.voteInProgress,
            votes: locals.twitchBot?.votes,
            voteSummonerName: locals.twitchBot?.voteSummonerDisplayName,
            voteEnd: locals.twitchBot?.voteEnd,
        },
    };
};
