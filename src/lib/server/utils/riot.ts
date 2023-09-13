import { RateLimitHandler, RiotApiWrapper } from "lol-api-wrapper";
import { Logger } from "tslog";
import prisma from "./prisma";

const log = new Logger({
    name: "riot-api",
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}\t{{logLevelName}}\t[{{name}}]\t",
})

if (!process.env.RIOT_API_KEY) throw new Error("No RIOT_API_KEY env variable set");

const rateLimitHandler = new RateLimitHandler({
    logLevel: "error",
    errorLogFunction(message) {
        log.error(message);
    },
    logFunction(message) {
        log.info(message);
    },
    async getRateLimitsFunction(rateLimitMethod: string) {
        const res = await prisma.rateLimit.findUnique({
            where: {
                name: rateLimitMethod,
            },
            select: {
                end: true,
            }
        });

        if (!res) return null;

        return {
            rateLimitEnd: res.end.getTime(),
            rateLimit: 100,
            rateLimitCount: 0,
        }
    },
    async getRateLimitTypesFunction() {
        const res = await prisma.rateLimit.findMany({
            select: {
                name: true,
            }
        });

        return res.map(r => r.name)
    },
    async storeRateLimitsFunction(rateLimitMethod, rateLimitEnd, rateLimit, rateLimitCount) {
        await prisma.rateLimit.upsert({
            where: {
                name: rateLimitMethod,
            },
            update: {
                end: new Date(rateLimitEnd),
                limit: rateLimit,
                count: rateLimitCount,
            },
            create: {
                name: rateLimitMethod,
                end: new Date(rateLimitEnd),
                limit: rateLimit,
                count: rateLimitCount,
            }
        });
    },
})

export const riot = new RiotApiWrapper(
    process.env.RIOT_API_KEY,
    {
        rateLimitHandler
    }
);
