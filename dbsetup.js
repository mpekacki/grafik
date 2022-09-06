const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

sqlite.open({
    filename: process.env.DATABASE_URL,
    driver: sqlite3.Database
}).then(async (db) => {
    await db.run('CREATE TABLE "Stories" ("nf_id" INTEGER NOT NULL, "author" VARCHAR(255) NOT NULL, "title" VARCHAR(255) NOT NULL, "date" INTEGER NOT NULL, "last_updated" INTEGER, "last_commenter" VARCHAR(255), "last_comment_count" SMALLINT, "excluded" BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY ("nf_id"));');
    await db.run('CREATE TABLE "Judges" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" VARCHAR(255) NOT NULL UNIQUE, "active" BOOLEAN NOT NULL, "permanent" BOOLEAN NOT NULL);');
    await db.run('CREATE TABLE "Duties" ("day_of_week" SMALLINT NOT NULL, "JudgeId" INTEGER REFERENCES "Judges" ("id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "from" INTEGER NOT NULL, "to" INTEGER, PRIMARY KEY("day_of_week", "JudgeId"));');
    await db.run('CREATE TABLE "StoriesJudgesComments" ("StoryId" INTEGER REFERENCES "Stories" ("nf_id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "JudgeId" INTEGER REFERENCES "Judges" ("id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "comment_count" SMALLINT NOT NULL, PRIMARY KEY("StoryId", "JudgeId"));');
    await db.run('CREATE TABLE "Stats" ("ip" TEXT, "page" TEXT, "protocol" TEXT, "date" INTEGER NOT NULL);');
    await db.run('CREATE TABLE "Snapshots" ("year" INTEGER NOT NULL, "month" INTEGER NOT NULL, "date_of_update" INTEGER, "content" JSON NOT NULL, PRIMARY KEY("year", "month"));');
    await db.run('CREATE TABLE "Contests" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL UNIQUE, "included" BOOLEAN NOT NULL);');
    await db.run('CREATE TABLE "ContestsStories" ("contest_id" INTEGER REFERENCES "Contests" ("id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "story_id" INTEGER REFERENCES "Stories" ("nf_id"), PRIMARY KEY ("contest_id", "story_id"));');
}).catch(error => {
    console.log('Error during db initialization', error);
});