<script lang="ts">
    import type { PageData } from "./$types";

    export let data: PageData;

    let summonerName = data.lolSpectator.summoner?.name || "";
    let obsControl: boolean = false;
    async function start() {
        let res = await fetch("/spectator/start", {
            method: "POST",
            body: JSON.stringify({ summonerName, obsControl }),
        });

        if (res.ok) {
            data.lolSpectator.status = "searching";
        }
    }

    async function stop() {
        let res = await fetch("/spectator/stop", {
            method: "POST",
        });

        if (res.ok) {
            data.lolSpectator.status = "offline";
        }
    }
</script>

<h1>Lol Auto Spectator</h1>
<h2>Current Status : {data.lolSpectator.status}</h2>

{#if data.lolSpectator.status === "offline"}
    <button on:click={start}>Start</button>
{:else if data.lolSpectator.status === "ingame" || data.lolSpectator.status === "searching"}
    <button on:click={stop}>Stop</button>
{/if}

<div>
    <input type="text" name="summonerName" bind:value={summonerName} />
    <label for="summonerName">Summoner to Spectate</label>
</div>

<div>
    <input type="checkbox" name="obsControl" bind:checked={obsControl} />
    <label for="obsControl">Streaming mode (twitch bot + obs controller)</label>
</div>
