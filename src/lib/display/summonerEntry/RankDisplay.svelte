<script lang="ts">
    import type { LeagueEntries } from "@prisma/client";

    export let leagueEntry: LeagueEntries;
    export let size: "xsmall" | "small" | "medium" | "large" = "large";

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
</script>

<div>
    <div>
        {#if leagueEntry?.tier.toLowerCase() == "grandmaster"}
            <img class="tier" src="/tiers/GM.webp" alt="" />
        {:else}
            <img
                class="tier"
                src="/tiers/{leagueEntry?.tier.charAt(0)}.webp"
                alt=""
            />
        {/if}
    </div>
    <p
        class:text-xl={size === "large"}
        class:text-lg={size === "medium"}
        class:text-sm={size === "small"}
        class:text-xs={size === "xsmall"}
        class:xl:text-3xl={size === "large"}
        class:xl:text-xl={size === "medium"}
        class:xl:text-md={size === "small"}
        class:xl:text-sm={size === "xsmall"}
    >
        {#if leagueEntry?.tier.toLowerCase() == "grandmaster"}
            GM
        {:else}
            {leagueEntry?.tier.charAt(0)}{rankToInt(leagueEntry?.rank)}
        {/if}

        {leagueEntry?.leaguePoints}LP
    </p>
</div>

<style>
    div > div {
        height: 80%;
        width: auto;
    }
    div > div > img {
        height: 100%;
        width: auto;
        object-fit: cover;
    }

    div {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
    }

    p {
        font-weight: bolder;
    }
</style>
