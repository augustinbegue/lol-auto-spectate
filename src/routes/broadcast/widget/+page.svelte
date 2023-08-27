<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { PageData } from "./$types";
    import { invalidateAll } from "$app/navigation";
    import SummonerEntry from "$lib/display/summonerEntry/RankDisplay.svelte";

    export let data: PageData;

    $: wins = data.leagueEntry?.wins ?? 0;
    $: losses = data.leagueEntry?.losses ?? 0;
    $: winrate = Math.round((wins / (wins + losses)) * 100);

    let sessionWins = 0;
    let sessionLosses = 0;
    let sessionHistory: string[] = [];
    $: sessionWinrate = Math.round(
        (sessionWins / (sessionWins + sessionLosses)) * 100,
    );

    function updateSessionHistory() {
        sessionWins = 0;
        sessionLosses = 0;
        sessionHistory = [];

        if (data.leagueHistory) {
            let previousEntry = data.leagueHistory[0]?.leagueEntry;
            for (let i = 1; i < data.leagueHistory.length; i++) {
                if (previousEntry) {
                    const entry = data.leagueHistory[i].leagueEntry;

                    if (entry.wins > previousEntry.wins) {
                        sessionWins++;
                        sessionHistory = ["W", ...sessionHistory];
                    } else if (entry.losses > previousEntry.losses) {
                        sessionLosses++;
                        sessionHistory = ["L", ...sessionHistory];
                    }
                }

                previousEntry = data.leagueHistory[i].leagueEntry;
            }
        }
    }

    let status = data.status;
    let loadingCounter = 0;
    let loadingTimer: NodeJS.Timeout | undefined = undefined;

    $: if (status != data.status && data.status == "loading") {
        status = "loading";

        loadingTimer = setInterval(() => {
            loadingCounter++;
        }, 1000);
    } else if (status != data.status && data.status != "loading") {
        status = data.status;
        loadingCounter = 0;

        clearInterval(loadingTimer);
    }

    let voting = data.twitchBot?.voteInProgress;
    let votingEnd = data.twitchBot?.voteEnd;
    let votingCounter = 0;
    let votingTimer: NodeJS.Timeout | undefined = undefined;

    $: if (voting != data.twitchBot?.voteInProgress) {
        if (data.twitchBot?.voteInProgress) {
            voting = true;
            votingEnd = data.twitchBot?.voteEnd;

            votingCounter = Math.round(
                ((votingEnd || Date.now() - 60 * 1000) - Date.now()) / 1000,
            );
            votingTimer = setInterval(() => {
                votingCounter--;
            }, 1000);
        } else {
            clearInterval(votingTimer);
            voting = false;
        }
    }

    let interval: NodeJS.Timeout | undefined = undefined;
    onMount(() => {
        updateSessionHistory();

        interval = setInterval(() => {
            invalidateAll();
            updateSessionHistory();
        }, 5000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<div class="screen">
    <div class="widget">
        {#if data.status != "offline"}
            {#if data.leagueEntry}
                <div>
                    <SummonerEntry
                        leagueEntry={data.leagueEntry}
                        size={"large"}
                    />
                </div>
            {/if}
            <div>
                {#if data.twitchBot && voting}
                    <div>
                        <span>> VOTE ON TWITCH CHAT</span>
                        <p>SWITCH TO {data.twitchBot.voteSummonerName} ?</p>
                    </div>
                    <div>
                        <span>> VOTE ON TWITCH CHAT</span>
                        <p>
                            !yes : {data.twitchBot.votes?.["!yes"] ?? 0} | !no :
                            {data.twitchBot.votes?.["!no"] ?? 0}
                        </p>
                    </div>
                    <div>
                        <span>> VOTE ON TWITCH CHAT</span>
                        <p>
                            Remaining: {votingCounter}s
                        </p>
                    </div>
                    <div>
                        <span>> VOTE ON TWITCH CHAT</span>
                        <p>SWITCH TO {data.twitchBot.voteSummonerName} ?</p>
                    </div>
                {:else if data.status == "loading"}
                    <div>
                        <span>> LOADING</span>
                        <p class="lolpro-name">
                            {data.leagueEntry?.summonerName}'s next game is
                            loading!
                        </p>
                        <p class="lolpro-info">
                            {loadingCounter}s elapsed
                        </p>
                    </div>
                    <div id="summoner">
                        {#if data.lolpro}
                            <p class="lolpro-info">
                                {data.summoner?.name}
                            </p>
                            <p class="lolpro-name">
                                <img
                                    src="https://flagsapi.com/{data.lolpro
                                        .country}/flat/64.png"
                                />
                                {data.lolpro?.name}
                            </p>
                            <p class="lolpro-info">
                                {#if data.lolpro?.leagues?.length || 0 > 0}
                                    {data.lolpro?.leagues
                                        ?.map((league) => league.shorthand)
                                        .join(", ")} |
                                {/if}
                                {#if data.lolpro?.social_media?.twitter}
                                    @{data.lolpro?.social_media?.twitter}
                                {/if}
                            </p>
                        {:else}
                            <span>> SUMMONER</span>

                            <p>
                                {data.summoner?.name}
                            </p>
                        {/if}
                    </div>
                    <div>
                        <span>> LOADING</span>
                        <p class="lolpro-name">
                            {data.leagueEntry?.summonerName}'s next game is
                            loading!
                        </p>
                        <p class="lolpro-info">
                            {loadingCounter}s elapsed
                        </p>
                    </div>
                    <div id="stats">
                        <span>> STATS</span>
                        <p>
                            {data.leagueEntry?.wins}W {data.leagueEntry
                                ?.losses}L ({winrate}%)
                        </p>
                    </div>
                {:else}
                    <div id="summoner">
                        {#if data.lolpro}
                            <p class="lolpro-info">
                                {data.summoner?.name}
                            </p>
                            <p class="lolpro-name">
                                <img
                                    src="https://flagsapi.com/{data.lolpro
                                        .country}/flat/64.png"
                                    alt={data.lolpro.country}
                                />
                                {data.lolpro?.name}
                            </p>
                            <p class="lolpro-info">
                                {#if data.lolpro?.leagues?.length || 0 > 0}
                                    {data.lolpro?.leagues
                                        ?.map((league) => league.shorthand)
                                        .join(", ")} |
                                {/if}
                                {#if data.lolpro?.social_media?.twitter}
                                    @{data.lolpro?.social_media?.twitter}
                                {/if}
                            </p>
                        {:else}
                            <span>> SUMMONER</span>

                            <p>
                                {data.summoner?.name}
                            </p>
                        {/if}
                    </div>

                    <div id="stats">
                        <span>> STATS</span>
                        <p>
                            {data.leagueEntry?.wins}W {data.leagueEntry
                                ?.losses}L ({winrate}%)
                        </p>
                    </div>

                    <div id="session">
                        <span>> SESSION</span>
                        <p>
                            {sessionWins}W {sessionLosses}L {#if sessionWins + sessionLosses != 0}({sessionWinrate}%)
                            {/if} |
                            {#each sessionHistory as r}
                                <p class={r}>
                                    {r}
                                </p>
                            {/each}
                        </p>
                    </div>

                    <div id="status">
                        <span>> Change the Summoner</span>
                        <p>!switch "summoner"</p>
                    </div>
                {/if}
            </div>
        {:else}
            <p>> OFFLINE</p>
        {/if}
    </div>
</div>

<style lang="postcss">
    p {
        padding: 0px;
        margin: 0px;
        text-overflow: ellipsis;
    }

    .tier {
        width: 10rem;
        height: auto;
    }

    .screen {
        @apply h-screen w-screen;
    }

    .widget {
        @apply font-mono w-full h-full;
        @apply bg-gray;
        padding: 0.5rem 1rem 0.5rem 1rem;
        color: white;

        font-size: 2rem;
        @apply border-y-purple border-y-8;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        gap: 20px;
    }

    .widget > div {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .widget > div > div {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        height: 100%;
        min-height: 100%;
        animation: carousel-animate-vertical 40s linear infinite;
        text-overflow: ellipsis;
    }

    .widget > div:first-child > p {
        @apply text-3xl;
        font-weight: bolder;
    }

    .widget > div:last-child {
        justify-content: flex-start;
        align-items: flex-start;
        scroll-behavior: smooth;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .widget > div:last-child::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    .widget span {
        font-family: "CascaydiaCove NF Mono", "Courier New", Courier, monospace;
        @apply text-5xl;
        font-weight: normal;
    }

    .widget p {
        @apply text-6xl;
        font-weight: bolder;
        display: inline-flex;
        white-space: nowrap;
        text-overflow: ellipsis;
        align-items: center;
        gap: 20px;
    }

    .widget .lolpro-name {
        font-size: 3rem;
        font-weight: bolder;
    }
    .widget .lolpro-info {
        font-size: 3rem;
        font-weight: normal;
    }

    .widget .W {
        color: lightgreen !important;
    }

    .widget .L {
        color: lightcoral !important;
    }

    .widget > div:first-child {
        justify-content: center;
        align-items: center;
    }

    @keyframes carousel-animate-vertical {
        0% {
            transform: translateY(0%);
        }
        10% {
            transform: translateY(0%);
        }
        15% {
            transform: translateY(-100%);
        }
        25% {
            transform: translateY(-100%);
        }
        30% {
            transform: translateY(-200%);
        }
        40% {
            transform: translateY(-200%);
        }
        45% {
            transform: translateY(-300%);
        }
        55% {
            transform: translateY(-300%);
        }
        60% {
            transform: translateY(-200%);
        }
        70% {
            transform: translateY(-200%);
        }
        75% {
            transform: translateY(-100%);
        }
        85% {
            transform: translateY(-100%);
        }
        90% {
            transform: translateY(0%);
        }
        100% {
            transform: translateY(0%);
        }
    }
</style>
