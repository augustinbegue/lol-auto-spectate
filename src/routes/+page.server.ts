import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.lolSpectator) {
        return {
            lolSpectator: {
                status: "offline",
            },
        };
    }

    return {
        lolSpectator: {
            status: locals.lolSpectator.getStatus(),
            summoner: locals.lolSpectator.summoner,
            obsControl: !!locals.lolSpectator.obsController,
        },
    };
};
