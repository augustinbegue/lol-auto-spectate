-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameCreation" DATETIME NOT NULL,
    "summonerName" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "Match_summonerName_fkey" FOREIGN KEY ("summonerName") REFERENCES "Summoner" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_id_key" ON "Match"("id");
