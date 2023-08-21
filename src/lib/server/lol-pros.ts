import { error } from "@sveltejs/kit";

const summoners: { [key: string]: LolProPlayer | null | undefined } = {
    Sσreαnα: {
        name: "Sardoche",
        country: "FR",
        social_media: {
            twitter: "Sardoche_Lol",
        },
    },
    lIlIlllIllIlII: {
        name: "Sardoche",
        country: "FR",
        social_media: {
            twitter: "Sardoche_Lol",
        },
    },
};

export async function getSummoner(summonerName: string) {
    if (summoners[summonerName] === undefined) {
        let res = await fetch(
            `https://api.lolpros.gg/es/search?query=${summonerName.trim()}&active=true`,
        );

        if (!res.ok) {
            throw error(res.status, res.statusText);
        }

        let data = (await res.json()) as LolProPlayer[];

        if (data.length === 0) {
            summoners[summonerName] = null;
        }

        summoners[summonerName] = data[0];
    }

    return summoners[summonerName];
}

export interface LolProPlayer {
    uuid: string;
    name: string;
    slug: string;
    country?: string;
    other_countries?: any[];
    league_player?: LeaguePlayer;
    staff: any;
    social_media: SocialMedia;
    leagues?: League[];
    _type: string;
    tag?: string;
    active?: boolean;
    creation_date?: string;
    logo?: Logo2;
    server?: string;
}

export interface LeaguePlayer {
    position: string;
    score: number;
    accounts: Account[];
    servers: string[];
}

export interface Account {
    uuid: string;
    server: string;
    profile_icon_id: string;
    encrypted_riot_id: string;
    summoner_name: string;
    summoner_names: SummonerName[];
    rank: Rank;
    peak: Peak;
    seasons: Season[];
}

export interface SummonerName {
    name: string;
    created_at: string;
}

export interface Rank {
    score: number;
    tier: string;
    division: number;
    league_points: number;
    wins: number;
    losses: number;
    created_at: string;
}

export interface Peak {
    score: number;
    tier: string;
    division: number;
    league_points: number;
    wins: number;
    losses: number;
    created_at: string;
}

export interface Season {
    id: string;
    end: End;
    peak: Peak2;
}

export interface End {
    score: number;
    tier: string;
    division: number;
    league_points: number;
    wins: number;
    losses: number;
    created_at: string;
}

export interface Peak2 {
    score: number;
    tier: string;
    division: number;
    league_points: number;
    wins: number;
    losses: number;
    created_at: string;
}

export interface SocialMedia {
    discord?: string;
    facebook: any;
    instagram?: string;
    gamesoflegends?: string;
    leaguepedia: string;
    twitch?: string;
    twitter: string;
    website?: string;
}

export interface League {
    uuid: string;
    name: string;
    slug: string;
    shorthand: string;
    servers: string[];
    logo: Logo;
}

export interface Logo {
    public_id: string;
    version: number;
    url: string;
}

export interface Logo2 {
    public_id: string;
    version: number;
    url: string;
}
