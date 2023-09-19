import { getSummoner } from "./db";
import { riot } from "./riot";

export async function findInGameSummoner(tier: "CHALLENGER" | "MASTER" | "GRANDMASTER" = "CHALLENGER") {
    // Get all top ladder summoners
    const leagueList = await riot.getLeagueListEntries("EUW1", "RANKED_SOLO_5x5", tier);

    // Sort by league points
    const leaderboard = leagueList.entries.sort((a, b) => b.leaguePoints - a.leaguePoints);

    // Find a summoner that is currently in game
    for (const summoner of leaderboard) {
        const activeGame = await riot.getActiveGameBySummonerId("EUW1", summoner.summonerId);

        if (activeGame) {
            return await getSummoner(summoner.summonerName);
        }
    }

    if (tier == "CHALLENGER") {
        return findInGameSummoner("GRANDMASTER");
    } else if (tier == "GRANDMASTER") {
        return findInGameSummoner("MASTER");
    } else {
        return null;
    }
}
