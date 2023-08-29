-- CreateTable
CREATE TABLE "Summoner" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "profileIconId" INTEGER NOT NULL,
    "summonerLevel" INTEGER NOT NULL,
    "revisionDate" DATETIME NOT NULL,
    "proId" INTEGER,
    CONSTRAINT "Summoner_proId_fkey" FOREIGN KEY ("proId") REFERENCES "Pro" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeagueEntries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "summonerName" TEXT NOT NULL,
    "leaguePoints" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "veteran" BOOLEAN NOT NULL,
    "inactive" BOOLEAN NOT NULL,
    "freshBlood" BOOLEAN NOT NULL,
    "hotStreak" BOOLEAN NOT NULL,
    CONSTRAINT "LeagueEntries_summonerName_fkey" FOREIGN KEY ("summonerName") REFERENCES "Summoner" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "lproSlug" TEXT,
    "social_twitter" TEXT,
    "country" TEXT
);

-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "lproSlug" TEXT NOT NULL,
    "shorthand" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_LeagueToPro" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LeagueToPro_A_fkey" FOREIGN KEY ("A") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LeagueToPro_B_fkey" FOREIGN KEY ("B") REFERENCES "Pro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Summoner_name_key" ON "Summoner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pro_name_key" ON "Pro"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_LeagueToPro_AB_unique" ON "_LeagueToPro"("A", "B");

-- CreateIndex
CREATE INDEX "_LeagueToPro_B_index" ON "_LeagueToPro"("B");
