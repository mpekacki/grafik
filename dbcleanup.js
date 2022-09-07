const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

sqlite.open({
    filename: process.env.DATABASE_URL,
    driver: sqlite3.Database
}).then(async (db) => {
    await db.run('DELETE FROM "Judges";');
    await db.run('DELETE FROM "Duties";');
    await db.run('DELETE FROM "StoriesJudgesComments";');
    await db.run('DELETE FROM "Stats";');
    await db.run('DELETE FROM "Snapshots";');
    await db.run('DELETE FROM "Contests";');
    await db.run('DELETE FROM "ContestsStories";');
    await db.run('DELETE FROM "Stories";');
}).catch(error => {
    console.log('Error during db initialization', error);
});