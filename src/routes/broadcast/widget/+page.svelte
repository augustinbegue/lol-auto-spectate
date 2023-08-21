<script lang="ts">
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { invalidateAll } from "$app/navigation";

    export let data: PageData;

    let wins = data.leagueEntry?.wins ?? 0;
    let losses = data.leagueEntry?.losses ?? 0;
    $: winrate = Math.round((wins / (wins + losses)) * 100);

    let sessionSummoner = data.summoner?.name;
    let sessionWins = 0;
    let sessionLosses = 0;
    let sessionHistory: string[] = [];
    $: sessionWinrate = Math.round(
        (sessionWins / (sessionWins + sessionLosses)) * 100,
    );

    $: if (sessionSummoner == data.summoner?.name) {
        let newWins = data.leagueEntry?.wins ?? 0;
        let newLosses = data.leagueEntry?.losses ?? 0;

        if (newWins != wins) {
            sessionWins++;
            sessionHistory = ["W", ...sessionHistory];
        } else if (newLosses != losses) {
            sessionLosses++;
            sessionHistory = ["L", ...sessionHistory];
        }

        wins = newWins;
        losses = newLosses;
    } else {
        sessionLosses = 0;
        sessionWins = 0;
        sessionSummoner = data.summoner?.name;
        sessionHistory = [];
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

    function rankToInt(rank: string | undefined) {
        switch (rank) {
            case "I":
                return 1;
            case "II":
                return 2;
            case "III":
                return 3;
            case "IV":
                return 4;
            default:
                return 0;
        }
    }

    let loadStart: number = 0;

    onMount(() => {
        setInterval(() => {
            invalidateAll();
        }, 5000);
    });
</script>

<div class="screen">
    <div class="widget">
        {#if data.status != "offline"}
            <div>
                {#if data.leagueEntry?.tier.toLowerCase() == "grandmaster"}
                    <img class="tier" src="/tiers/GM.webp" alt="" />
                {:else}
                    <img
                        class="tier"
                        src="/tiers/{data.leagueEntry?.tier.charAt(0)}.webp"
                        alt=""
                    />
                {/if}
                <p>
                    {#if data.leagueEntry?.tier.toLowerCase() == "grandmaster"}
                        GM
                    {:else}
                        {data.leagueEntry?.tier.charAt(0)}{rankToInt(
                            data.leagueEntry?.rank,
                        )}
                    {/if}

                    {data.leagueEntry?.leaguePoints}LP
                </p>
            </div>
            <div>
                {#if data.twitchBot?.voteInProgress}
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
                            Remaining: {Math.round(
                                ((data.twitchBot.voteEnd || Date.now()) -
                                    Date.now()) /
                                    1000,
                            )}s
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
        background-color: rgba(0, 0, 0, 0.5);
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
        font-size: 2.5rem;
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
        font-size: 3rem;
        font-weight: normal;
    }

    .widget p {
        font-size: 5rem;
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
