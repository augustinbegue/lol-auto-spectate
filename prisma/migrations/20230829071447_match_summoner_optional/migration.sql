-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameCreation" DATETIME NOT NULL,
    "summonerName" TEXT,
    "data" TEXT NOT NULL,
    CONSTRAINT "Match_summonerName_fkey" FOREIGN KEY ("summonerName") REFERENCES "Summoner" ("name") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("data", "gameCreation", "id", "summonerName") SELECT "data", "gameCreation", "id", "summonerName" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_id_key" ON "Match"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
