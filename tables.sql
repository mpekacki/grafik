CREATE TABLE "Stories" ("nf_id" INTEGER NOT NULL, "author" VARCHAR(255) NOT NULL, "title" VARCHAR(255) NOT NULL, "date" TIMESTAMP WITHOUT TIME ZONE NOT NULL, "last_updated" TIMESTAMP WITHOUT TIME ZONE, "last_commenter" VARCHAR(255), "last_comment_count" SMALLINT, PRIMARY KEY ("nf_id"));

CREATE TABLE "Judges" ("id" SERIAL, "name" VARCHAR(255) NOT NULL, "active" BOOLEAN NOT NULL, "permanent" BOOLEAN NOT NULL, PRIMARY KEY ("id"));

CREATE TABLE "Duties" ("day_of_week" SMALLINT NOT NULL, "JudgeId" INTEGER REFERENCES "Judges" ("id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "from" TIMESTAMP WITHOUT TIME ZONE NOT NULL, "to" TIMESTAMP WITHOUT TIME ZONE, PRIMARY KEY("day_of_week", "JudgeId"));

CREATE TABLE "StoriesJudgesComments" ("StoryId" INTEGER REFERENCES "Stories" ("nf_id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "JudgeId" INTEGER REFERENCES "Judges" ("id") ON DELETE CASCADE ON UPDATE CASCADE NOT NULL, "comment_count" SMALLINT NOT NULL, PRIMARY KEY("StoryId", "JudgeId"));

CREATE TABLE "Stats" ("ip" TEXT, "page" TEXT, "protocol" TEXT, "date" TIMESTAMP WITHOUT TIME ZONE NOT NULL);

CREATE TABLE "Snapshots" ("year" INTEGER NOT NULL, "month" INTEGER NOT NULL, "date_of_update" TIMESTAMP WITHOUT TIME ZONE, "content" JSON NOT NULL, PRIMARY KEY("year", "month"));

INSERT INTO "Stories" ("nf_id", "author", "title", "date") VALUES (12924, 'Michal2006', 'Smok ekolog', '2015-01-14 13:30');

SELECT "name", SUM("comment_count") AS "count", SUM(CASE WHEN "author"="name" THEN "comment_count" ELSE 0 END) AS "own_count", COUNT("nf_id") AS "stories", "active", "permanent" FROM "StoriesJudgesComments" INNER JOIN "Judges" ON "JudgeId"="id" INNER JOIN "Stories" ON "StoryId"="nf_id" WHERE "date" BETWEEN '2015-06-01' AND '2015-06-30' GROUP BY "name", "active", "permanent" ORDER BY "count" DESC LIMIT 25;
