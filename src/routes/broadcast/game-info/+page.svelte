<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { PageData } from "./$types";
    import RankDisplay from "$lib/display/summonerEntry/RankDisplay.svelte";
    import { invalidateAll } from "$app/navigation";
    import { slide } from "svelte/transition";
    import type { LolProPlayer } from "$lib/server/lol-pros";

    export let data: PageData;

    let status: string;
    let interval: NodeJS.Timeout;

    const lolproAccounts: { [key: string]: LolProPlayer } = {};

    $: summonerNames = data.currentGame?.participants.map(
        (p) => p.summonerName,
    );

    onMount(() => {
        fetchStatus();
        fetchLolProAccounts();

        interval = setInterval(() => {
            fetchStatus();
            console.log(status);
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    async function fetchLolProAccounts() {
        if (summonerNames) {
            for (const summonerName of summonerNames) {
                const res = await fetch(`/api/lolpros/${summonerName}`, {
                    method: "GET",
                });

                if (res.ok) {
                    const lpro = (await res.json()) as LolProPlayer;

                    lolproAccounts[summonerName] = lpro;
                }
            }
        }
    }

    async function fetchStatus() {
        const res = await fetch("/api/spectator/status");
        const json = await res.json();

        if (status !== json.status) {
            invalidateAll();
            fetchLolProAccounts();
        }

        status = json.status;
    }

    function getChampionImageById(id: number) {
        if (data.championsById[id]) {
            return `/assets/datadragon/img/champion/tiles/${data.championsById[id].id}_0.jpg`;
        }
    }

    function getProfilePictureIconById(id: number) {
        return `/assets/datadragon/img/profileicon/${id}.png`;
    }

    function getSummonerSpellImageById(id: number) {
        if (data.summonerSpellsById[id]) {
            return `/assets/datadragon/img/spell/${data.summonerSpellsById[id].id}.png`;
        }
    }

    function getPerkImageById(id: number) {
        if (data.runesReforgedById[id]) {
            return `/assets/datadragon/img/${data.runesReforgedById[id].icon}`;
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
                        data.currentGameSummonerEntries[participant.summonerId]}
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
                        class:border-t-purple={summonerEntry?.summonerName !==
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
                            {#if lolproAccounts[participant.summonerName]}
                                <div class="flex flex-col">
                                    <span
                                        class="flex flex-row justify-center items-center gap-1"
                                    >
                                        {lolproAccounts[
                                            participant.summonerName
                                        ].name}
                                        <img
                                            class="h-5 mx-1"
                                            src="https://flagsapi.com/{lolproAccounts[
                                                participant.summonerName
                                            ].country}/flat/64.png"
                                            alt="{lolproAccounts[
                                                participant.summonerName
                                            ].country} flag"
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
                                class:border-t-purple={summonerEntry?.summonerName !==
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
                            class:border-t-purple={summonerEntry?.summonerName !==
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
    <div class="w-screen h-screen flex flex-row justify-center items-center">
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
