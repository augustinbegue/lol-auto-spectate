import type { Match, Pro, Summoner } from "@prisma/client";
import { RiotApiWrapper } from "lol-api-wrapper";
import { getLolProSummoner } from "./lolPro";
import type { MatchDTO, SummonerDTO } from "lol-api-wrapper/types";
import prisma from "./prisma";

const QUEUE_TYPE = "RANKED_SOLO_5x5";

const api = new RiotApiWrapper(process.env.RIOT_API_KEY!);

export type CachedSummoner = Summoner & {
    pro: Pro | null;
}

export async function getSummoner(summonerName: string): Promise<CachedSummoner | null> {
    let summoner = await prisma.summoner.findUnique({
        where: {
            name: summonerName,
        },
        include: {
            pro: true
        },
    });

    if (summoner === null) {
        // Summoner not found in database, fetch from Riot API
        let summonerData: SummonerDTO | null = null;

        try {
            summonerData = await api.getSummonerByName("EUW1", summonerName);
        } catch (error) {
            return null;
        }


        let leagueEntries = (await api.getLeagueEntriesBySummonerId("EUW1", summonerData.id)).filter((leagueEntry) => leagueEntry.queueType === QUEUE_TYPE);
        let proEntry = await getLolProSummoner(summonerName);

        if (proEntry && proEntry.leagues) {
            for (let i = 0; i < proEntry.leagues.length; i++) {
                let proleague = await prisma.league.upsert({
                    where: {
                        id: proEntry.leagues[i].uuid,
                    },
                    create: {
                        id: proEntry.leagues[i].uuid,
                        name: proEntry.leagues[i].name,
                        lproSlug: proEntry.leagues[i].slug,
                        shorthand: proEntry.leagues[i].shorthand,
                    },
                    update: {},
                });
            }
        }

        let res = await prisma.summoner.create({
            data: {
                name: summonerName,
                accountId: summonerData.accountId,
                id: summonerData.id,
                puuid: summonerData.puuid,
                profileIconId: summonerData.profileIconId,
                revisionDate: new Date(summonerData.revisionDate),
                summonerLevel: summonerData.summonerLevel,
                LeagueEntries: {
                    create: leagueEntries.map((leagueEntry) => {
                        return {
                            queueType: leagueEntry.queueType,
                            hotStreak: leagueEntry.hotStreak,
                            wins: leagueEntry.wins,
                            losses: leagueEntry.losses,
                            rank: leagueEntry.rank,
                            tier: leagueEntry.tier,
                            leaguePoints: leagueEntry.leaguePoints,
                            leagueId: leagueEntry.leagueId,
                            veteran: leagueEntry.veteran,
                            inactive: leagueEntry.inactive,
                            freshBlood: leagueEntry.freshBlood,
                        }
                    })
                },
                pro:
                    proEntry === null ? undefined : {
                        connectOrCreate: {
                            where: {
                                name: proEntry.name,
                            },
                            create: {
                                name: proEntry.name,
                                lproSlug: proEntry.slug,
                                country: proEntry.country,
                                social_twitter: proEntry.social_media.twitter,
                                leagues: !proEntry.leagues ? undefined : {
                                    connect: proEntry.leagues.map((league) => {
                                        return {
                                            id: league.uuid,
                                        }
                                    }),
                                },
                            }
                        }
                    }
            },
        });

        summoner = await prisma.summoner.findUnique({
            where: {
                name: summonerName,
            },
            include: {
                pro: true,
                LeagueEntries: {
                    take: 1,
                    orderBy: {
                        date: "desc",
                    },
                }
            },
        });
    }

    return summoner;
}

export async function getSummonerLeagueEntries(summonerName: string, count: number = 1) {
    await refreshSummonerLeagueEntries(summonerName);

    return await prisma.leagueEntries.findMany({
        where: {
            summonerName: summonerName,
        },
        take: count,
        orderBy: {
            date: "desc",
        },
    });
}

export async function refreshSummonerLeagueEntries(summonerName: string) {
    let summoner = await getSummoner(summonerName);
    let oldLeagueEntry = (await getSummonerLeagueEntries(summonerName, 1))[0]

    if (summoner === null) {
        return;
    }

    let leagueEntries = (await api.getLeagueEntriesBySummonerId("EUW1", summoner.id)).filter((leagueEntry) => leagueEntry.queueType === QUEUE_TYPE);

    let newLeagueEntry = leagueEntries[0];

    console.log(oldLeagueEntry, newLeagueEntry);

    if (oldLeagueEntry === undefined && newLeagueEntry === undefined) {
        return;
    }

    if (oldLeagueEntry === undefined || oldLeagueEntry.wins !== newLeagueEntry.wins || oldLeagueEntry.losses !== newLeagueEntry.losses || oldLeagueEntry.leaguePoints !== newLeagueEntry.leaguePoints) {
        await prisma.leagueEntries.create({
            data: {
                queueType: newLeagueEntry.queueType,
                hotStreak: newLeagueEntry.hotStreak,
                wins: newLeagueEntry.wins,
                losses: newLeagueEntry.losses,
                rank: newLeagueEntry.rank,
                tier: newLeagueEntry.tier,
                leaguePoints: newLeagueEntry.leaguePoints,
                leagueId: newLeagueEntry.leagueId,
                veteran: newLeagueEntry.veteran,
                inactive: newLeagueEntry.inactive,
                freshBlood: newLeagueEntry.freshBlood,
                summoner: {
                    connect: {
                        name: summonerName,
                    }
                }
            }
        });
    }
}

export async function getMatch(gameId: number, summoner?: CachedSummoner): Promise<Match | null> {
    const matchId = `EUW1_${gameId}`;

    const match = await prisma.match.findUnique({
        where: {
            id: matchId,
        },
    });

    if (match !== null) {
        return match;
    }

    try {
        const res = await api.getMatchByMatchId("EUROPE", matchId);

        const match = await prisma.match.create({
            data: {
                id: matchId,
                gameCreation: new Date(res.info.gameCreation),
                summoner: {
                    connect: {
                        name: summoner?.name,
                    }
                },
                data: JSON.stringify(res),
            }
        });

        return match;
    } catch (error) {
        return null;
    }
}
