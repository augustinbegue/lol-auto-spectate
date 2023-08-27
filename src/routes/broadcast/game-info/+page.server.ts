import type { LeagueEntryDTO } from "lol-api-wrapper/types";
import type { PageServerLoad } from "./$types";
import champions from "../../../../static/assets/datadragon/data/en_GB/champion.json";
import summoner from "../../../../static/assets/datadragon/data/en_GB/summoner.json";
import runesReforged from "../../../../static/assets/datadragon/data/en_GB/runesReforged.json";

const summonerEntries: { [key: string]: LeagueEntryDTO | undefined } = {};

export const load: PageServerLoad = async ({ locals }) => {
    const currentGame = locals.lolSpectator.currentGame;
    const currentSummoner = locals.lolSpectator.summoner;
    const currentGameSummonerEntries: {
        [key: string]: LeagueEntryDTO | undefined;
    } = {};
    const championsById: { [key: string]: any } = {};
    const summonerSpellsById: { [key: string]: any } = {};
    const runesReforgedById: { [key: string]: any } = {};

    for (let i = 0; i < (currentGame?.participants?.length ?? 0); i++) {
        const participant = currentGame?.participants[i];

        if (participant) {
            if (!summonerEntries[participant.summonerId]) {
                summonerEntries[participant.summonerId] = (
                    await locals.lolSpectator.riot?.getLeagueEntryBySummonerId(
                        participant.summonerId,
                    )
                )?.find((e) => e.queueType == "RANKED_SOLO_5x5");
            }

            currentGameSummonerEntries[participant.summonerId] =
                summonerEntries[participant.summonerId];
        }

        if (participant?.championId) {
            championsById[participant.championId] = Object.values(
                champions.data,
            ).find((c: any) => c.key == participant.championId);
        }

        if (participant?.spell1Id) {
            summonerSpellsById[participant.spell1Id] = Object.values(
                summoner.data,
            ).find((c: any) => c.key == participant.spell1Id);
        }

        if (participant?.spell2Id) {
            summonerSpellsById[participant.spell2Id] = Object.values(
                summoner.data,
            ).find((c: any) => c.key == participant.spell2Id);
        }

        if (participant?.perks) {
            if (participant.perks.perkStyle) {
                let perkStyle = Object.values(runesReforged).find(
                    (c: any) => c.id == participant.perks.perkStyle,
                );

                runesReforgedById[participant.perks.perkStyle] = perkStyle;

                let perkSubStyle = Object.values(runesReforged).find(
                    (c: any) => c.id == participant.perks.perkSubStyle,
                );

                runesReforgedById[participant.perks.perkSubStyle] =
                    perkSubStyle;

                perkStyle?.slots.forEach((slot) => {
                    slot.runes.forEach((rune) => {
                        if (participant.perks.perkIds.includes(rune.id)) {
                            runesReforgedById[rune.id] = rune;
                        }
                    });
                });

                perkSubStyle?.slots.forEach((slot) => {
                    slot.runes.forEach((rune) => {
                        if (participant.perks.perkIds.includes(rune.id)) {
                            runesReforgedById[rune.id] = rune;
                        }
                    });
                });
            }
        }
    }

    return {
        currentSummoner,
        currentGame,
        currentGameSummonerEntries,
        championsById,
        summonerSpellsById,
        runesReforgedById,
    };
};
