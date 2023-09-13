-- CreateTable
CREATE TABLE "RateLimit" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "end" DATETIME NOT NULL,
    "limit" INTEGER NOT NULL,
    "count" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_name_key" ON "RateLimit"("name");
