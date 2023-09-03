<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { PageData } from "./$types";
    import RankDisplay from "$lib/display/summonerEntry/RankDisplay.svelte";
    import { invalidateAll } from "$app/navigation";
    import { slide } from "svelte/transition";
    import type { LeagueEntries } from "@prisma/client";

    export let data: PageData;

    let status: string = "offline";
    let interval: NodeJS.Timeout;

    let historyData: {
        result: "win" | "loss";
        lpDelta: number;
        date: Date;
        leagueEntry: LeagueEntries;
    }[] = [];

    $: {
        if (data.leagueHistory) {
            historyData = [];
            let lastEntry = data.leagueHistory[0];

            for (let i = 1; i < data.leagueHistory.length; i++) {
                const entry = data.leagueHistory[i];

                console.log(entry);

                let lpDelta = entry.leaguePoints - lastEntry.leaguePoints;

                if (lpDelta != 0) {
                    if (entry.tier != lastEntry.tier) {
                        if (tierOrder(entry.tier) > tierOrder(lastEntry.tier)) {
                            lpDelta += 100;
                        } else {
                            lpDelta -= 100;
                        }
                    }

                    if (entry.rank != lastEntry.rank) {
                        if (rankOrder(entry.rank) > rankOrder(lastEntry.rank)) {
                            lpDelta += 100;
                        } else {
                            lpDelta -= 100;
                        }
                    }

                    if (entry.wins > lastEntry.wins) {
                        historyData = [
                            ...historyData,
                            {
                                result: "win",
                                lpDelta,
                                date: new Date(entry.date),
                                leagueEntry: entry,
                            },
                        ];
                    } else if (entry.losses > lastEntry.losses) {
                        historyData = [
                            ...historyData,
                            {
                                result: "loss",
                                lpDelta,
                                date: new Date(entry.date),
                                leagueEntry: entry,
                            },
                        ];
                    }
                }

                lastEntry = entry;
            }
        }
    }

    onMount(async () => {
        interval = setInterval(async () => {
            await fetchStatus();
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    async function fetchStatus() {
        const res = await fetch("/api/spectator/status");
        const json = await res.json();

        if (status !== json.status) {
            await invalidateAll();
        }

        status = json.status;
    }

    function getChampionImageById(id: number) {
        if (data.championsById?.[id]) {
            return `/assets/datadragon/img/champion/tiles/${data.championsById[id].id}_0.jpg`;
        }
    }

    function getProfilePictureIconById(id: number) {
        return `/assets/datadragon/img/profileicon/${id}.png`;
    }

    function getSummonerSpellImageById(id: number) {
        if (data.summonerSpellsById?.[id]) {
            return `/assets/datadragon/img/spell/${data.summonerSpellsById[id].id}.png`;
        }
    }

    function getPerkImageById(id: number) {
        if (data.runesReforgedById?.[id]) {
            return `/assets/datadragon/img/${data.runesReforgedById[id].icon}`;
        }
    }

    function rankOrder(rank: string | undefined) {
        switch (rank) {
            case "I":
                return 4;
            case "II":
                return 3;
            case "III":
                return 2;
            case "IV":
                return 1;
            default:
                return 0;
        }
    }

    function tierOrder(tier: string) {
        switch (tier) {
            case "CHALLENGER":
                return 8;
                break;
            case "GRANDMASTER":
                return 7;
                break;
            case "MASTER":
                return 6;
                break;
            case "DIAMOND":
                return 5;
                break;
            case "EMERALD":
                return 4;
                break;
            case "PLATINUM":
                return 3;
                break;
            case "GOLD":
                return 2;
                break;
            case "SILVER":
                return 1;
                break;
            case "BRONZE":
                return 0;
                break;
            case "IRON":
                return -1;
                break;
            default:
                return -2;
                break;
        }
    }
</script>

{#if (status === "loading" || status === "ingame") && data.currentGame}
    {@const game = data.currentGame}

    <div class="players">
        {#each [100, 200] as teamId}
            <div
                class="flex flex-row w-full h-1/2 p-2 xl:p-8 pb-1 xl:pb-4 gap-2 xl:gap-8"
            >
                {#each game.participants.filter((p) => p.teamId === teamId) as participant, i}
                    {@const summonerEntry =
                        data.currentGameSummonersLeagueEntries[
                            participant.summonerId
                        ]}
                    <div
                        transition:slide={{
                            delay: teamId * (i + 1),
                            duration: 1000,
                        }}
                        class="
                        flex flex-col h-full justify-start items-center w-full bg-gray text-white
                        border-t-4"
                        class:active={summonerEntry?.summonerName ===
                            data.currentSummoner?.name}
                        class:border-t-gray={summonerEntry?.summonerName ===
                            data.currentSummoner?.name}
                        class:border-t-red-400={teamId === 200 &&
                            summonerEntry?.summonerName !==
                                data.currentSummoner?.name}
                        class:border-t-blue-400={teamId === 100 &&
                            summonerEntry?.summonerName !==
                                data.currentSummoner?.name}
                    >
                        <div
                            class="flex flex-row items-center gap-4 text-sm xl:text-xl font-bold p-2"
                        >
                            <img
                                class="h-8 xl:h-16"
                                src={getProfilePictureIconById(
                                    participant.profileIconId,
                                )}
                                alt=""
                            />
                            {#if data.currentGameSummoners[participant.summonerId]?.pro}
                                {@const pro =
                                    data.currentGameSummoners[
                                        participant.summonerId
                                    ]?.pro}
                                <div class="flex flex-col">
                                    <span
                                        class="flex flex-row justify-center items-center gap-1"
                                    >
                                        {pro?.name}
                                        <img
                                            class="h-5 mx-1"
                                            src="https://flagsapi.com/{pro?.country}/flat/64.png"
                                            alt="{pro?.country} flag"
                                        />
                                    </span>
                                    <span class="font-normal">
                                        {participant.summonerName}
                                    </span>
                                </div>
                            {:else}
                                <span>
                                    {participant.summonerName}
                                </span>
                            {/if}
                        </div>
                        {#if summonerEntry}
                            <div
                                class="flex flex-row w-full h-1/4 p-4 justify-center items-center border-t-4"
                                class:border-t-gray={summonerEntry?.summonerName ===
                                    data.currentSummoner?.name}
                                class:border-t-red-400={teamId === 200 &&
                                    summonerEntry?.summonerName !==
                                        data.currentSummoner?.name}
                                class:border-t-blue-400={teamId === 100 &&
                                    summonerEntry?.summonerName !==
                                        data.currentSummoner?.name}
                            >
                                <RankDisplay
                                    size="xsmall"
                                    leagueEntry={summonerEntry}
                                />
                                <div
                                    class="flex flex-col justify-start items-center w-1/2 xl:w-2/3 text-sm xl:text-2xl"
                                >
                                    <p>
                                        {summonerEntry.wins}<span
                                            class="text-pink font-bold"
                                        >
                                            W
                                        </span>
                                        {summonerEntry.losses}<span
                                            class="text-red-400 font-bold"
                                        >
                                            L
                                        </span>
                                    </p>
                                    <p class="text-xs xl:text-xl">
                                        {Math.round(
                                            (summonerEntry.wins /
                                                (summonerEntry.wins +
                                                    summonerEntry.losses)) *
                                                100,
                                        )}% W/R
                                    </p>
                                </div>
                            </div>
                        {/if}
                        <div
                            class="flex flex-row w-full p-1 xl:p-4 justify-center gap-2 items-start border-t-4 text-sm xl:text-xl"
                            class:border-t-gray={summonerEntry?.summonerName ===
                                data.currentSummoner?.name}
                            class:border-t-red-400={teamId === 200 &&
                                summonerEntry?.summonerName !==
                                    data.currentSummoner?.name}
                            class:border-t-blue-400={teamId === 100 &&
                                summonerEntry?.summonerName !==
                                    data.currentSummoner?.name}
                        >
                            {#if data.championsById[participant.championId]}
                                <div class="flex flex-col items-center">
                                    {data.championsById[participant.championId]
                                        .name}

                                    {#if participant.perks.perkIds}
                                        <div
                                            class="w-full flex flex-row justify-center items-center"
                                        >
                                            {#if participant.perks.perkIds[0]}
                                                <img
                                                    class="w-12 h-12 xl:w-16 xl:h-16"
                                                    src={getPerkImageById(
                                                        participant.perks
                                                            .perkIds[0],
                                                    )}
                                                    alt=""
                                                />
                                            {/if}

                                            <img
                                                class="w-8 h-8"
                                                src={getPerkImageById(
                                                    participant.perks
                                                        .perkSubStyle,
                                                )}
                                                alt=""
                                            />
                                        </div>
                                        <div
                                            class="flex flex-row w-full justify-center items-center"
                                        >
                                            <div class="grid grid-cols-2 gap-1">
                                                {#each participant.perks.perkIds.slice(1) as perkId, i}
                                                    <img
                                                        class="w-8 xl:w-12"
                                                        src={getPerkImageById(
                                                            perkId,
                                                        )}
                                                        alt=""
                                                    />
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <div class="flex flex-col">
                                    <img
                                        class="w-16 h-16 xl:w-24 xl:h-24 border-2 border-gray"
                                        src={getChampionImageById(
                                            participant.championId,
                                        )}
                                        alt=""
                                    />
                                    <div class="flex flex-row">
                                        {#if participant.spell1Id}
                                            <img
                                                class="w-8 h-8 xl:w-12 border-2 border-gray"
                                                src={getSummonerSpellImageById(
                                                    participant.spell1Id,
                                                )}
                                                alt=""
                                            />
                                        {/if}
                                        {#if participant.spell2Id}
                                            <img
                                                class="w-8 h-8 xl:w-12 border-2 border-gray"
                                                src={getSummonerSpellImageById(
                                                    participant.spell2Id,
                                                )}
                                                alt=""
                                            />
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/each}
    </div>
{:else}
    <div class="w-screen h-screen flex flex-col justify-center items-center">
        <p class="text-3xl font-mono text-purple font-bold">
            {#if status === "searching"}
                Looking for the next game
                <img
                    src="/assets/peepo_search.webp"
                    class="peepo h-10"
                    alt="peepo searching"
                />
            {:else if status === "ingame"}
                Game in progress
            {:else}
                Offline
            {/if}
        </p>

        {#if status != "offline"}
            <p class="text-2xl font-mono text-purple font-bold mt-8">History</p>

            <div
                class="w-full flex flex-row items-center justify-center font-mono text-white gap-4"
            >
                {#each historyData.slice(historyData.length - 10) as entry}
                    <div
                        class="flex flex-col items-center justify-center p-2 bg-opacity-20"
                        class:bg-pink={entry.lpDelta > 0}
                        class:bg-red-400={entry.lpDelta < 0}
                    >
                        <div class="w-16">
                            <RankDisplay
                                size="xsmall"
                                leagueEntry={entry.leagueEntry}
                            />
                        </div>
                        <span
                            class="font-bold"
                            class:text-pink={entry.lpDelta > 0}
                            class:text-red-400={entry.lpDelta < 0}
                        >
                            {entry.lpDelta > 0 ? "+" : ""}{entry.lpDelta}
                        </span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style lang="postcss">
    .players {
        @apply flex flex-col w-screen h-screen font-mono items-center justify-center;
    }

    .active {
        @apply bg-purple;
    }

    /* Animate peepo from left to right of the container */
    .peepo {
        animation: animate-peepo 6s ease-in-out infinite;
    }

    @keyframes animate-peepo {
        0% {
            transform: translateX(0%) scale(1);
        }
        25% {
            transform: translateX(175%) scale(1.2);
        }
        50% {
            transform: translateX(350%) scale(1);
        }
        75% {
            transform: translateX(175%) scale(1.2);
        }
        100% {
            transform: translateX(0%) scale(1);
        }
    }
</style>
