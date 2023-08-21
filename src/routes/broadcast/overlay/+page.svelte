<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { LolProPlayer } from "$lib/server/lol-pros.js";
    import { onDestroy, onMount } from "svelte";

    export let data;

    $: orderPlayers = data.allPlayers?.filter((p) => p.team === "ORDER") ?? [];

    $: chaosPlayers = data.allPlayers?.filter((p) => p.team === "CHAOS") ?? [];

    $: orderScore = data.allPlayers
        ?.filter((p) => p.team === "ORDER")
        .reduce((acc, cur) => acc + cur.scores.kills, 0);

    $: chaosScore = data.allPlayers
        ?.filter((p) => p.team === "CHAOS")
        .reduce((acc, cur) => acc + cur.scores.kills, 0);

    const summonerGold: { [key: string]: number } = {};

    $: if (data.allPlayers) {
        for (const player of data.allPlayers) {
            summonerGold[player.summonerName] = player.items.reduce(
                (acc, cur) => acc + cur.price,
                0,
            );
        }
    }

    $: orderGold =
        data.allPlayers
            ?.filter((p) => p.team === "ORDER")
            .reduce((acc, cur) => acc + summonerGold[cur.summonerName], 0) ?? 0;

    $: chaosGold =
        data.allPlayers
            ?.filter((p) => p.team === "CHAOS")
            .reduce((acc, cur) => acc + summonerGold[cur.summonerName], 0) ?? 0;

    $: orderTurrets =
        data.events?.Events.filter(
            (e) =>
                e.EventName === "TurretKilled" &&
                orderPlayers.find((p) => p.summonerName === e.KillerName ?? ""),
        ).length ?? 0;

    $: chaosTurrets =
        data.events?.Events.filter(
            (e) =>
                e.EventName === "TurretKilled" &&
                chaosPlayers.find((p) => p.summonerName === e.KillerName ?? ""),
        ).length ?? 0;

    let interval: NodeJS.Timeout;
    const lolproAccounts: { [key: string]: LolProPlayer } = {};
    onMount(async () => {
        // Auto-refresh data every second
        interval = setInterval(() => {
            invalidateAll();
        }, 250);

        if (data.allPlayers) {
            const summonerNames = data.allPlayers.map((player) => {
                return player.summonerName;
            });

            for (const summonerName of summonerNames) {
                const res = await fetch(`/api/lolpros/${summonerName}`, {
                    method: "GET",
                });

                if (res.ok) {
                    const lpro = (await res.json()) as LolProPlayer;

                    lolproAccounts[summonerName] = lpro;
                }
            }

            console.log(lolproAccounts);
        }
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    function getChampionId(name: string) {
        return name.split("_").reverse()[0];
    }
</script>

{#if data.status === "ingame" && data.allPlayers}
    <div
        class="
    screen bg-cover bg-center bg-no-repeat
    flex flex-col
    text-white font-mono
    "
    >
        <div class="translate-x-[6px]">
            <div class="w-full flex flex-row justify-center">
                <div class="score-bar order">
                    <span class="score">
                        {orderScore}
                    </span>

                    <span class="score">
                        {Math.round((orderGold / 1000) * 10) / 10}k
                        <img class="h-8" src="/assets/gold.svg" alt="gold" />
                    </span>

                    <span class="score">
                        {orderTurrets}
                        <img
                            class="h-8"
                            src="/assets/turret.svg"
                            alt="turret"
                        />
                    </span>
                </div>
                <div class="score-bar p-4">
                    <img src="/assets/swords.svg" alt="swords" />
                </div>
                <div class="score-bar chaos">
                    <span class="score">
                        {chaosScore}
                    </span>

                    <span class="score">
                        {Math.round((chaosGold / 1000) * 10) / 10}k
                        <img class="h-8" src="/assets/gold.svg" alt="gold" />
                    </span>

                    <span class="score">
                        {chaosTurrets}
                        <img
                            class="h-8"
                            src="/assets/turret.svg"
                            alt="turret"
                        />
                    </span>
                </div>
            </div>
            <div class="flex flex-row justify-center al">
                <div class="score-below">
                    {#if Math.floor((orderGold - chaosGold) / 1000) > 0}
                        <p
                            class="absolute text-blue-400 text-2xl font-bold px-4 inline-flex justify-center items-center gap-1 bg-gray"
                            style="position: absolute; left: 33%;"
                        >
                            +{Math.round(
                                ((orderGold - chaosGold) / 1000) * 10,
                            ) / 10}k
                            <img
                                class="h-4"
                                src="/assets/gold.svg"
                                alt="gold"
                            />
                        </p>
                    {/if}
                    <p class="text-2xl font-extrabold bg-gray px-14">
                        {Math.floor(data.gameData.gameTime / 60)}:{String(
                            Math.floor(data.gameData.gameTime % 60),
                        ).padStart(2, "0")}
                    </p>
                    {#if Math.floor((chaosGold - orderGold) / 1000) > 0}
                        <p
                            class="absolute text-red-400 text-2xl font-bold px-4 inline-flex justify-center items-center gap-1 bg-gray"
                            style="position: absolute; right: 33%;"
                        >
                            +{Math.round(
                                ((chaosGold - orderGold) / 1000) * 10,
                            ) / 10}k
                            <img
                                class="h-4"
                                src="/assets/gold.svg"
                                alt="gold"
                            />
                        </p>
                    {/if}
                </div>
            </div>
        </div>
        <div class="team-frames-container">
            <div class="team-frames">
                {#each orderPlayers as player}
                    <div class="flex flex-col items-start">
                        <p
                            class="summonerName"
                            class:text-pink={player.summonerName ===
                                data.targetSummonerName}
                            class:text-white={player.summonerName !==
                                data.targetSummonerName}
                        >
                            {#if lolproAccounts[player.summonerName]}
                                <span>
                                    ({player.summonerName})
                                </span>
                                <img
                                    class="h-5 mx-1"
                                    src="https://flagsapi.com/{lolproAccounts[
                                        player.summonerName
                                    ].country}/flat/64.png"
                                    alt="{lolproAccounts[player.summonerName]
                                        .country} flag"
                                />
                                {lolproAccounts[player.summonerName].name}
                            {:else}
                                <span>
                                    {player.summonerName}
                                </span>
                            {/if}
                        </p>
                        <div class="h-20 w-20" />
                    </div>
                {/each}
            </div>

            <div class="team-frames">
                {#each chaosPlayers as player}
                    <div class="flex flex-col items-end">
                        <p
                            class="summonerName"
                            class:text-pink={player.summonerName ===
                                data.targetSummonerName}
                            class:text-white={player.summonerName !==
                                data.targetSummonerName}
                        >
                            {#if lolproAccounts[player.summonerName]}
                                {lolproAccounts[player.summonerName].name}
                                <img
                                    class="h-5 mx-1"
                                    src="https://flagsapi.com/{lolproAccounts[
                                        player.summonerName
                                    ].country}/flat/64.png"
                                    alt="{lolproAccounts[player.summonerName]
                                        .country} flag"
                                />
                                <span>
                                    ({player.summonerName})
                                </span>
                            {:else}
                                <span>
                                    {player.summonerName}
                                </span>
                            {/if}
                        </p>

                        <div class="h-20 w-20" />
                    </div>
                {/each}
            </div>
        </div>
        <div class="scoreboard-container">
            <div class="side">
                <div class="diff">
                    <table>
                        <tbody>
                            {#each orderPlayers as player, i}
                                {@const diff =
                                    summonerGold[player.summonerName] -
                                    summonerGold[chaosPlayers[i].summonerName]}
                                <tr>
                                    <td
                                        class="h-[46px] w-20 flex flex-col justify-center"
                                    >
                                        {#if Math.round(diff / 100) / 10 > 1}
                                            <p
                                                class="text-blue-400 w-full flex flex-row justify-end px-2 bg-gray"
                                            >
                                                +{Math.round(diff / 100) / 10}k
                                            </p>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="scoreboard">
                <table class="table-auto border-y-gray border-y-2">
                    <tbody>
                        {#each orderPlayers as player, i}
                            <tr class:dead={player.isDead}>
                                <td class="bg-gray px-2">
                                    <div class=" flex flex-row gap-1 h-full">
                                        {#if player.items.length > 6}
                                            {@const item = player.items.find(
                                                (item) => item.slot === 6,
                                            )}
                                            {#if item}
                                                <img
                                                    class="h-8 border border-purple"
                                                    src="/assets/datadragon/img/item/{item.itemID}.png"
                                                    alt={item.displayName}
                                                />
                                                <span
                                                    class="absolute left-[516px] inline-flex items-start justify-start w-8 h-8 text-xs"
                                                >
                                                    <p
                                                        style="text-shadow: black 1px 0 10px;"
                                                    >
                                                        {#if item.count != 1}
                                                            {item?.count}
                                                        {/if}
                                                    </p>
                                                </span>
                                            {/if}
                                        {:else}
                                            <img
                                                class="h-8 border border-purple"
                                                src="/assets/datadragon/img/item/3340.png"
                                                alt="Warding Totem (Trinket)"
                                            />
                                        {/if}
                                        <span
                                            class="absolute left-[516px] inline-flex items-end justify-center w-8 h-8 font-semibold"
                                        >
                                            <p
                                                class="translate-y-1"
                                                style="text-shadow: black 1px 0 10px;"
                                            >
                                                {Math.round(
                                                    player.scores.wardScore,
                                                )}
                                            </p>
                                        </span>
                                        {#each Array.from({ length: 6 }, (value, index) => index).reverse() as i}
                                            {@const item = player.items.find(
                                                (item) => item.slot === i,
                                            )}
                                            {#if item}
                                                <img
                                                    class="h-8 border border-purple"
                                                    src="/assets/datadragon/img/item/{item.itemID}.png"
                                                    alt={item.displayName}
                                                />
                                                <span
                                                    class="absolute inline-flex items-start justify-start w-8 h-8 text-xs"
                                                    style="left: {(5 - i) * 34 +
                                                        566}px;"
                                                >
                                                    <p
                                                        style="text-shadow: black 1px 0 10px;"
                                                    >
                                                        {#if item.count != 1}
                                                            {item.count}
                                                        {/if}
                                                    </p>
                                                </span>
                                            {:else}
                                                <div
                                                    class="w-8 h-8 border border-purple"
                                                />
                                            {/if}
                                        {/each}
                                    </div>
                                </td>
                                <td class="bg-gray px-2">
                                    <div
                                        class="inline-flex w-20 justify-center"
                                    >
                                        {player.scores.kills}/{player.scores
                                            .deaths}/{player.scores.assists}
                                    </div>
                                </td>
                                <td class="w-[46px] h-[46px]">
                                    <div
                                        class="w-full h-full bg-gray bg-opacity-80 border-y-8 border-y-gray border-x-6 border-x-gray"
                                    />
                                </td>
                                <td>
                                    <img
                                        class="h-[46px]"
                                        src="/assets/datadragon/img/champion/{getChampionId(
                                            player.rawChampionName,
                                        )}.png"
                                        alt={getChampionId(
                                            player.rawChampionName,
                                        )}
                                    />
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
                <table class=" table-auto border-y-gray border-y-2">
                    <tbody>
                        {#each chaosPlayers as player, i}
                            <tr class:dead={player.isDead}>
                                <td class="bg-black">
                                    <img
                                        class="h-[46px]"
                                        src="/assets/datadragon/img/champion/{getChampionId(
                                            player.rawChampionName,
                                        )}.png"
                                        alt={getChampionId(
                                            player.rawChampionName,
                                        )}
                                    />
                                </td>
                                <td class=" w-[46px] h-[46px]">
                                    <div
                                        class="w-full h-full bg-gray bg-opacity-80 border-y-8 border-y-gray border-x-6 border-x-gray"
                                    />
                                </td>
                                <td class="bg-gray px-2">
                                    <div
                                        class="inline-flex w-20 justify-center"
                                    >
                                        {player.scores.kills}/{player.scores
                                            .deaths}/{player.scores.assists}
                                    </div>
                                </td>
                                <td class="bg-gray px-2">
                                    <div class=" flex flex-row gap-1 h-full">
                                        {#each Array.from({ length: 6 }, (value, index) => index) as i}
                                            {@const item = player.items.find(
                                                (item) => item.slot === i,
                                            )}
                                            {#if item}
                                                <img
                                                    class="h-8 border border-purple"
                                                    src="/assets/datadragon/img/item/{item.itemID}.png"
                                                    alt={item.displayName}
                                                />
                                                <span
                                                    class="absolute inline-flex items-start justify-start w-8 h-8 text-xs"
                                                    style="right: {(i + 2) *
                                                        36 +
                                                        566}px;"
                                                >
                                                    <p
                                                        style="text-shadow: black 1px 0 10px;"
                                                    >
                                                        {#if item.count != 1}
                                                            {item.count}
                                                        {/if}
                                                    </p>
                                                </span>
                                            {:else}
                                                <div
                                                    class="w-8 h-8 border border-purple"
                                                />
                                            {/if}
                                        {/each}
                                        {#if player.items.length > 6}
                                            {@const item = player.items.find(
                                                (item) => item.slot === 6,
                                            )}
                                            {#if item}
                                                <img
                                                    class="h-8 border border-purple"
                                                    src="/assets/datadragon/img/item/{item.itemID}.png"
                                                    alt={item.displayName}
                                                />
                                                <span
                                                    class="absolute right-[516px] inline-flex items-start justify-start w-8 h-8 text-xs"
                                                >
                                                    <p
                                                        style="text-shadow: black 1px 0 10px;"
                                                    >
                                                        {#if item.count != 1}
                                                            {item?.count}
                                                        {/if}
                                                    </p>
                                                </span>
                                            {/if}
                                        {:else}
                                            <img
                                                class="h-8 border border-purple"
                                                src="/assets/datadragon/img/item/3340.png"
                                                alt="Warding Totem (Trinket)"
                                            />
                                        {/if}
                                        <span
                                            class="absolute right-[516px] inline-flex items-end justify-center w-8 h-8 font-semibold"
                                        >
                                            <p
                                                class="translate-y-1"
                                                style="text-shadow: black 1px 0 10px;"
                                            >
                                                {Math.round(
                                                    player.scores.wardScore,
                                                )}
                                            </p>
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="side">
                <div class="diff">
                    {#each chaosPlayers as player, i}
                        {@const diff =
                            summonerGold[player.summonerName] -
                            summonerGold[orderPlayers[i].summonerName]}
                        <tr>
                            <td
                                class="h-[46px] w-20 flex flex-col justify-center"
                            >
                                {#if Math.round(diff / 100) / 10 > 1}
                                    <p
                                        class="text-red-400 flex flex-row justify-start px-2 bg-gray"
                                    >
                                        +{Math.round(diff / 100) / 10}k
                                    </p>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <style lang="postcss">
        body {
            background-image: url("/overlay-placeholder.webp");
            background-size: cover;
        }

        /* SCOREBOARD */
        .scoreboard-container {
            @apply absolute bottom-0 right-0 h-[238px] w-full;
            @apply flex justify-center items-center;
            @apply translate-x-[6px];
        }
        .scoreboard {
            @apply h-full;
            @apply flex justify-center items-center;
            @apply border-t-purple border-t-4;
        }
        /* Change images to red */
        .scoreboard .dead img {
            filter: grayscale(100%) brightness(0.5);
        }
        .scoreboard .dead {
            color: #666 !important;
        }

        /* SCORES */
        .score-bar {
            @apply flex items-center gap-8 justify-between;
            @apply h-[62px];
            @apply bg-gray;
            @apply border-b-purple border-b-4;
        }

        .score-bar:first-child,
        .score-bar:last-child {
            @apply w-1/4;
        }

        .score-bar.order {
            @apply flex-row-reverse;
            @apply pl-6;
        }

        .score-bar.order > .score {
            @apply text-blue-400;
        }

        .score-bar.chaos {
            @apply flex-row;
            @apply pr-6;
        }

        .score-bar.chaos > .score {
            @apply text-red-400;
        }

        .score-bar > .score {
            @apply inline-flex justify-center items-center;
            @apply text-2xl font-semibold;
        }

        .score-bar > .score:first-child {
            @apply font-bold text-5xl;
        }

        .score-bar > .score > img {
            @apply h-8 mx-2;
        }

        .score-below {
            @apply w-1/6 inline-flex justify-center items-center;
        }

        .score-below > p {
            @apply border-b-purple border-b-4;
        }

        /* TEAM FRAMES */
        .team-frames-container {
            @apply absolute top-[133px] w-screen flex flex-row justify-between;
        }
        .team-frames {
            @apply flex flex-col gap-[1px];
        }
        .summonerName {
            @apply inline-flex justify-center items-center text-[13px];
        }
        .summonerName span {
            @apply border border-gray;
            @apply bg-gray;
        }

        .screen {
            @apply h-screen w-screen;
        }
    </style>
{/if}
