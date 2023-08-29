/*
  Warnings:

  - The primary key for the `League` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new__LeagueToPro" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LeagueToPro_A_fkey" FOREIGN KEY ("A") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LeagueToPro_B_fkey" FOREIGN KEY ("B") REFERENCES "Pro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__LeagueToPro" ("A", "B") SELECT "A", "B" FROM "_LeagueToPro";
DROP TABLE "_LeagueToPro";
ALTER TABLE "new__LeagueToPro" RENAME TO "_LeagueToPro";
CREATE UNIQUE INDEX "_LeagueToPro_AB_unique" ON "_LeagueToPro"("A", "B");
CREATE INDEX "_LeagueToPro_B_index" ON "_LeagueToPro"("B");
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lproSlug" TEXT NOT NULL,
    "shorthand" TEXT NOT NULL
);
INSERT INTO "new_League" ("id", "lproSlug", "name", "shorthand") SELECT "id", "lproSlug", "name", "shorthand" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE UNIQUE INDEX "League_id_key" ON "League"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
