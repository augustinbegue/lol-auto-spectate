<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;

    let summonerName = data.lolSpectator.summoner?.name || "";
    let obsControl = data.lolSpectator.obsControl || false;

    async function start() {
        let res = await fetch("/api/spectator/start", {
            method: "POST",
            body: JSON.stringify({ summonerName, obsControl }),
        });

        if (res.ok) {
            data.lolSpectator.status = "searching";
        }
    }

    async function stop() {
        let res = await fetch("/api/spectator/stop", {
            method: "POST",
        });

        if (res.ok) {
            data.lolSpectator.status = "offline";
        }
    }
</script>

<div class="container mx-auto font-mono">
    <h1 class="text-2xl">Lol Auto Spectator</h1>
    <h2 class="text-xl">Current Status : {data.lolSpectator.status}</h2>

    {#if data.lolSpectator.status === "offline"}
        <button class="bg-purple text-white p-2 hover:bg-pink" on:click={start}
            >Start</button
        >
    {:else if data.lolSpectator.status === "ingame" || data.lolSpectator.status === "searching"}
        <button class="bg-pink text-white p-2 hover:bg-purple" on:click={stop}
            >Stop</button
        >
    {/if}

    <div class="my-2">
        <input
            class="border-2 border-purple text-gray"
            type="text"
            name="summonerName"
            bind:value={summonerName}
        />
        <label for="summonerName">Summoner to Spectate</label>
    </div>

    <h2 class="text-xl">Broadcaster Options</h2>
    <h3 class="text-lg">Twitch Bot</h3>

    {#if !data.twitchBot?.authenticated}
        <div class="my-2">
            <a class="p-2 bg-purple text-white" href={data.twitchBot?.authUrl}>
                Authenticate with Twitch
            </a>
        </div>
    {:else}
        <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked class="sr-only peer" disabled />
            <div
                class="w-11 h-6 bg-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink dark:peer-focus:ring-pink rounded-full peer dark:bg-gray peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray peer-checked:bg-purple
                            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
"
            />
            <span
                class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
                Enable
            </span>
        </label>
    {/if}
    <h3 class="text-lg">OBS Controller</h3>
    <label class="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            bind:checked={obsControl}
            class="sr-only peer"
            disabled={data.lolSpectator.status != "offline"}
        />
        <div
            class="w-11 h-6 bg-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink dark:peer-focus:ring-pink rounded-full peer dark:bg-gray peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray peer-checked:bg-purple
            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
            "
        />
        <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
            Enable
        </span>
    </label>
</div>
