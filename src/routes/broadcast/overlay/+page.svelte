<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { CachedSummoner } from "$lib/server/utils/db.js";
    import { onDestroy, onMount } from "svelte";
    import { slide } from "svelte/transition";

    export let data;

    $: orderPlayers = data.allPlayers?.filter((p) => p.team === "ORDER") ?? [];

    $: chaosPlayers = data.allPlayers?.filter((p) => p.team === "CHAOS") ?? [];

    $: orderScore = data.allPlayers
        ?.filter((p) => p.team === "ORDER")
        .reduce((acc, cur) => acc + cur.scores.kills, 0);

    $: chaosScore = data.allPlayers
        ?.filter((p) => p.team === "CHAOS")
        .reduce((acc, cur) => acc + cur.scores.kills, 0);

    const summonerItemGold: { [key: string]: number } = {};

    $: if (data.allPlayers) {
        for (const player of data.allPlayers) {
            summonerItemGold[player.summonerName] = player.items.reduce(
                (acc, cur) => acc + cur.price,
                0,
            );
        }
    }

    $: orderGold = data.farsight
        ? data.allPlayers
              .filter((p) => p.team === "ORDER")
              .reduce(
                  (acc, cur) => acc + (cur.championStats?.totalGold ?? 0),
                  0,
              )
        : data.allPlayers
              ?.filter((p) => p.team === "ORDER")
              .reduce(
                  (acc, cur) => acc + summonerItemGold[cur.summonerName],
                  0,
              ) ?? 0;

    $: chaosGold = data.farsight
        ? data.allPlayers
              .filter((p) => p.team === "CHAOS")
              .reduce(
                  (acc, cur) => acc + (cur.championStats?.totalGold ?? 0),
                  0,
              )
        : data.allPlayers
              ?.filter((p) => p.team === "CHAOS")
              .reduce(
                  (acc, cur) => acc + summonerItemGold[cur.summonerName],
                  0,
              ) ?? 0;

    $: orderTurrets =
        data.turrets?.filter((t) => t.team === 200 && t.isAlive === false)
            .length ?? 0;

    $: chaosTurrets =
        data.turrets?.filter((t) => t.team === 100 && t.isAlive === false)
            .length ?? 0;

    let interval: NodeJS.Timeout;
    const accounts: { [key: string]: CachedSummoner } = {};
    onMount(async () => {
        console.log(data);

        // Auto-refresh data every second
        interval = setInterval(() => {
            invalidateAll();
        }, 250);

        if (data.allPlayers) {
            const summonerNames = data.allPlayers.map((player) => {
                return player.summonerName;
            });

            for (const summonerName of summonerNames) {
                const res = await fetch(`/api/summoner/${summonerName}`, {
                    method: "GET",
                });

                if (res.ok) {
                    const lpro = (await res.json()) as CachedSummoner;

                    accounts[summonerName] = lpro;
                }
            }

            console.log(accounts);
        }
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    function getChampionId(name: string) {
        return name.split("_").reverse()[0];
    }

    let championImages: { [key: string]: string } = {};
    async function getChampionImage(
        rawChampionName: string,
        rawSkinName?: string,
    ) {
        let id = getChampionId(rawChampionName);
        if (championImages[id]) {
            return championImages[id];
        }

        let url = `/assets/datadragon/img/champion/tiles/${getChampionId(
            rawChampionName,
        )}_0.jpg`;
        // if (rawSkinName) {
        //     let tmp = `/assets/datadragon/img/champion/tiles/${
        //         rawChampionName.split("_").reverse()[0] +
        //         "_" +
        //         rawSkinName.split("_").reverse()[0]
        //     }.jpg`;

        //     if ((await fetch(tmp)).ok) {
        //         url = tmp;
        //     }
        // }

        championImages[id] = url;

        return url;
    }

    function getRuneImage(
        displayName: string,
        rawDisplayName: string,
        keystoneRawDisplayName?: string,
    ) {
        if (keystoneRawDisplayName) {
            let keystoneName = keystoneRawDisplayName.split("_").reverse()[0];
            let imageName = `${keystoneName}.png`;
            if (keystoneName === "LethalTempo")
                imageName = "LethalTempoTemp.png";

            return `/assets/datadragon/img/perk-images/Styles/${displayName}/${keystoneName}/${imageName}`;
        } else {
            if (displayName === "Inspiration") displayName = "Whimsy";

            return `/assets/datadragon/img/perk-images/Styles/${
                rawDisplayName.split("_").reverse()[0]
            }_${displayName}.png`;
        }
    }

    function getSummonerSpellImage(rawDisplayName: string) {
        let summonerSpellName = rawDisplayName.split("_")[2];

        if (summonerSpellName === "S12") summonerSpellName = "SummonerTeleport";
        if (summonerSpellName === "SummonerSmiteAvatarUtility")
            summonerSpellName = "SummonerSmite";
        if (summonerSpellName === "SummonerSmiteAvatarOffensive")
            summonerSpellName = "SummonerSmite";
        if (summonerSpellName === "SummonerFlashPerksHextechFlashtraptionV2")
            summonerSpellName = "SummonerFlash";

        return `/assets/datadragon/img/spell/${summonerSpellName}.png`;
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
            {#if data.farsight}
                <div class="w-full flex flex-row justify-center">
                    <div class="score-bar order">
                        <span class="score">
                            {orderScore}
                        </span>

                        <span class="score">
                            {Math.round((orderGold / 1000) * 10) / 10}k
                            <img
                                class="h-8"
                                src="/assets/gold.svg"
                                alt="gold"
                            />
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
                            <img
                                class="h-8"
                                src="/assets/gold.svg"
                                alt="gold"
                            />
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
                                transition:slide
                                class="absolute text-blue-400 text-lg font-bold px-4 inline-flex justify-center items-center gap-1 bg-gray"
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
                                transition:slide
                                class="absolute text-red-400 text-lg font-bold px-4 inline-flex justify-center items-center gap-1 bg-gray"
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
            {/if}
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
                            {#if accounts[player.summonerName]?.pro}
                                <span>
                                    ({player.summonerName})
                                </span>
                                <img
                                    class="h-5 mx-1"
                                    src="https://flagsapi.com/{accounts[
                                        player.summonerName
                                    ].pro?.country}/flat/64.png"
                                    alt="{accounts[player.summonerName].pro
                                        ?.country} flag"
                                />
                                {accounts[player.summonerName].pro?.name}
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
                            {#if accounts[player.summonerName]?.pro}
                                {accounts[player.summonerName].pro?.name}
                                <img
                                    class="h-5 mx-1"
                                    src="https://flagsapi.com/{accounts[
                                        player.summonerName
                                    ].pro?.country}/flat/64.png"
                                    alt="{accounts[player.summonerName].pro
                                        ?.country} flag"
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

        {#if data.gameData.gameTime < 60}
            <div transition:slide class="runes-container">
                <div class="runes">
                    <table class="table">
                        <tbody>
                            {#each orderPlayers as player}
                                <tr>
                                    <td>
                                        <img
                                            class="w-[32px] border border-gray"
                                            src={getSummonerSpellImage(
                                                player.summonerSpells
                                                    .summonerSpellTwo
                                                    .rawDisplayName,
                                            )}
                                            alt={player.summonerSpells
                                                .summonerSpellTwo.displayName}
                                        />
                                    </td>
                                    <td>
                                        <img
                                            class="w-[32px] border border-gray"
                                            src={getSummonerSpellImage(
                                                player.summonerSpells
                                                    .summonerSpellOne
                                                    .rawDisplayName,
                                            )}
                                            alt={player.summonerSpells
                                                .summonerSpellOne.displayName}
                                        />
                                    </td>
                                    <td class="pl-8">
                                        <img
                                            class="w-[32px]"
                                            src={getRuneImage(
                                                player.runes.secondaryRuneTree
                                                    .displayName,
                                                player.runes.secondaryRuneTree
                                                    .rawDisplayName,
                                            )}
                                            alt={player.runes.secondaryRuneTree
                                                .displayName}
                                        />
                                    </td>
                                    <td>
                                        <img
                                            class="w-14"
                                            src={getRuneImage(
                                                player.runes.primaryRuneTree
                                                    .displayName,
                                                player.runes.primaryRuneTree
                                                    .rawDisplayName,
                                                player.runes.keystone
                                                    .rawDisplayName,
                                            )}
                                            alt={player.runes.keystone
                                                .displayName}
                                        />
                                    </td>
                                    <td
                                        class="flex flex-row justify-end items-center gap-2"
                                    >
                                        {player.championName}

                                        {#await getChampionImage(player.rawChampionName, player.rawSkinName) then src}
                                            <img
                                                class="w-14 border-gray border-2"
                                                {src}
                                                alt={getChampionId(
                                                    player.rawChampionName,
                                                )}
                                            />
                                        {/await}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                    <table>
                        <tbody>
                            {#each chaosPlayers as player}
                                <tr>
                                    <td
                                        class="flex flex-row justify-start items-center gap-2"
                                    >
                                        {#await getChampionImage(player.rawChampionName, player.rawSkinName) then src}
                                            <img
                                                class="w-14 border-gray border-2"
                                                {src}
                                                alt={getChampionId(
                                                    player.rawChampionName,
                                                )}
                                            />
                                        {/await}
                                        {player.championName}
                                    </td>
                                    <td>
                                        <img
                                            class="w-14"
                                            src={getRuneImage(
                                                player.runes.primaryRuneTree
                                                    .displayName,
                                                player.runes.primaryRuneTree
                                                    .rawDisplayName,
                                                player.runes.keystone
                                                    .rawDisplayName,
                                            )}
                                            alt={player.runes.keystone
                                                .displayName}
                                        />
                                    </td>
                                    <td class="pr-8">
                                        <img
                                            class="w-[32px]"
                                            src={getRuneImage(
                                                player.runes.secondaryRuneTree
                                                    .displayName,
                                                player.runes.secondaryRuneTree
                                                    .rawDisplayName,
                                            )}
                                            alt={player.runes.secondaryRuneTree
                                                .displayName}
                                        />
                                    </td>
                                    <td>
                                        <img
                                            class="w-[32px] border border-gray"
                                            src={getSummonerSpellImage(
                                                player.summonerSpells
                                                    .summonerSpellOne
                                                    .rawDisplayName,
                                            )}
                                            alt={player.summonerSpells
                                                .summonerSpellOne.displayName}
                                        />
                                    </td>
                                    <td>
                                        <img
                                            class="w-[32px] border border-gray"
                                            src={getSummonerSpellImage(
                                                player.summonerSpells
                                                    .summonerSpellTwo
                                                    .rawDisplayName,
                                            )}
                                            alt={player.summonerSpells
                                                .summonerSpellTwo.displayName}
                                        />
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {:else if data.farsight}
            <div transition:slide class="scoreboard-container">
                <div class="side">
                    <div class="diff">
                        <table>
                            <tbody>
                                {#each orderPlayers as player, i}
                                    {@const diff =
                                        (player.championStats?.totalGold ?? 0) -
                                        (chaosPlayers[i].championStats
                                            ?.totalGold ?? 0)}
                                    <tr>
                                        <td
                                            class="h-[46px] w-20 flex flex-col justify-center items-end"
                                        >
                                            {#if Math.round(diff / 100) / 10 > 1}
                                                <p
                                                    transition:slide={{
                                                        axis: "x",
                                                    }}
                                                    class="text-blue-400 px-2 bg-gray border-b-2 border-b-blue w-min"
                                                >
                                                    +{Math.round(diff / 100) /
                                                        10}k
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
                                        <div
                                            class=" flex flex-row gap-1 h-full"
                                        >
                                            {#if player.items.length > 6}
                                                {@const item =
                                                    player.items.find(
                                                        (item) =>
                                                            item.slot === 6,
                                                    )}
                                                {#if item}
                                                    <img
                                                        class="h-8 border border-purple"
                                                        src="/assets/datadragon/img/item/{item.itemID}.png"
                                                        alt={item.displayName}
                                                    />
                                                    <span
                                                        class="absolute left-[532px] inline-flex items-start justify-start w-8 h-8 text-xs"
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
                                                class="absolute left-[532px] inline-flex items-end justify-center w-8 h-8 font-semibold"
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
                                                {@const item =
                                                    player.items.find(
                                                        (item) =>
                                                            item.slot === i,
                                                    )}
                                                {#if item}
                                                    <img
                                                        class="h-8 border border-purple"
                                                        src="/assets/datadragon/img/item/{item.itemID}.png"
                                                        alt={item.displayName}
                                                    />
                                                    <span
                                                        class="absolute inline-flex items-start justify-start w-8 h-8 text-xs"
                                                        style="left: {(5 - i) *
                                                            34 +
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
                                    <td class="bg-gray">
                                        <div
                                            class="inline-flex w-20 justify-center"
                                        >
                                            {player.scores.kills}/{player.scores
                                                .deaths}/{player.scores.assists}
                                        </div>
                                    </td>
                                    <td class="w-[38px] h-[46px]">
                                        <div
                                            class="w-full h-full bg-gray bg-opacity-80 border-y-8 border-y-gray border-x-6 border-x-gray"
                                        />
                                    </td>
                                    <td class="champion-icon-container">
                                        {#if player.isDead}
                                            <p>
                                                {Math.ceil(
                                                    player.respawnTimer,
                                                )}{""}
                                            </p>
                                        {/if}
                                        {#await getChampionImage(player.rawChampionName, player.rawSkinName) then src}
                                            <img
                                                class="champion-icon"
                                                {src}
                                                alt={getChampionId(
                                                    player.rawChampionName,
                                                )}
                                            />
                                        {/await}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                    <table class=" table-auto border-y-gray border-y-2">
                        <tbody>
                            {#each chaosPlayers as player, i}
                                <tr class:dead={player.isDead}>
                                    <td class="champion-icon-container">
                                        {#if player.isDead}
                                            <p>
                                                {Math.ceil(
                                                    player.respawnTimer,
                                                )}{""}
                                            </p>
                                        {/if}
                                        {#await getChampionImage(player.rawChampionName, player.rawSkinName) then src}
                                            <img
                                                class="champion-icon"
                                                {src}
                                                alt={getChampionId(
                                                    player.rawChampionName,
                                                )}
                                            />
                                        {/await}
                                    </td>
                                    <td class=" w-[38px] h-[46px]">
                                        <div
                                            class="w-full h-full bg-gray bg-opacity-80 border-y-8 border-y-gray border-x-6 border-x-gray"
                                        />
                                    </td>
                                    <td class="bg-gray">
                                        <div
                                            class="inline-flex w-20 justify-center"
                                        >
                                            {player.scores.kills}/{player.scores
                                                .deaths}/{player.scores.assists}
                                        </div>
                                    </td>
                                    <td class="bg-gray px-2">
                                        <div
                                            class=" flex flex-row gap-1 h-full"
                                        >
                                            {#each Array.from({ length: 6 }, (value, index) => index) as i}
                                                {@const item =
                                                    player.items.find(
                                                        (item) =>
                                                            item.slot === i,
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
                                                {@const item =
                                                    player.items.find(
                                                        (item) =>
                                                            item.slot === 6,
                                                    )}
                                                {#if item}
                                                    <img
                                                        class="h-8 border border-purple"
                                                        src="/assets/datadragon/img/item/{item.itemID}.png"
                                                        alt={item.displayName}
                                                    />
                                                    <span
                                                        class="absolute right-[532px] inline-flex items-start justify-start w-8 h-8 text-xs"
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
                                                class="absolute right-[532px] inline-flex items-end justify-center w-8 h-8 font-semibold"
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
                                (player.championStats?.totalGold ?? 0) -
                                (orderPlayers[i].championStats?.totalGold ?? 0)}
                            <tr>
                                <td
                                    class="h-[46px] w-20 flex flex-col justify-center items-start"
                                >
                                    {#if Math.round(diff / 100) / 10 > 1}
                                        <p
                                            transition:slide={{ axis: "x" }}
                                            class="text-red-400 flex flex-row justify-start px-2 bg-gray border-b-2 border-b-red w-min"
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
        {/if}
    </div>

    <style lang="postcss">
        body {
            background-image: url("/overlay-placeholder.webp");
            background-size: cover;
        }

        /* RUNES */
        .runes-container {
            @apply absolute bottom-0 right-0 h-[280px] w-full;
            @apply flex justify-center items-center;
            @apply translate-x-[6px];
        }

        .runes {
            @apply w-max px-16;
            @apply flex justify-center items-center;
            @apply bg-gray;
            @apply border-t-4 border-t-purple;
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
        .scoreboard .champion-icon-container {
            @apply h-[46px] w-[54px] relative;
            @apply flex flex-row items-center justify-center;
        }
        .scoreboard .champion-icon-container:first-child {
            @apply border-l-2 border-l-gray;
            background: rgb(25, 24, 37);
            background: linear-gradient(
                90deg,
                rgba(25, 24, 37, 0) 0%,
                rgba(25, 24, 37, 0) 30%,
                rgba(25, 24, 37, 1) 100%
            );
        }
        .scoreboard .champion-icon-container:last-child {
            @apply border-r-2 border-r-gray;
            background: rgb(25, 24, 37);
            background: linear-gradient(
                90deg,
                rgba(25, 24, 37, 1) 0%,
                rgba(25, 24, 37, 0) 70%,
                rgba(25, 24, 37, 0) 100%
            );
        }
        .scoreboard .champion-icon-container p {
            @apply filter-none text-red-500 text-2xl font-black w-min opacity-80;
        }
        .scoreboard .champion-icon {
            @apply absolute top-0 left-0 -z-50;
            @apply h-[54px] w-[54px];
            object-fit: cover;
            filter: blur(0.4px);
        }
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
