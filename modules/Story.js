var db = require('./db');
var reqs = require('./requests');

function Story() { }

Story.prototype.createFromElement = function (listaElement) {
	this.nfid = extractNfid(listaElement);
	this.author = extractAuthor(listaElement);
	this.title = extractTitle(listaElement);
	this.date = extractDate(listaElement);
	this.lastCommenter = extractCommenter(listaElement);
	this.lastCommentCount = extractCommentCount(listaElement);
	this.lastUpdated = null;
	this.applicable = checkIfApplicable(listaElement);
	this.contest = extractContest(listaElement);
}

Story.prototype.createFromDatabase = function (_nfid, cb) {
	var story = this;
	db.query('SELECT * FROM "Stories" WHERE "nf_id" = $1;', [_nfid], function (err, result) {
		if (err) { cb(err); console.error(err); return; }
		if (result.rowCount === 0) {
			cb('nie znaleziono opowiadania');
			console.error('nie znaleziono opowiadania o id ' + _nfid);
			return;
		}
		story.nfid = result.rows[0].nf_id;
		story.author = result.rows[0].author;
		story.title = result.rows[0].title;
		story.date = new Date(result.rows[0].date);
		story.lastCommenter = result.rows[0].last_commenter;
		story.lastCommentCount = result.rows[0].last_comment_count;
		story.lastUpdated = result.rows[0].last_updated ? new Date(result.rows[0].last_updated) : null;
		story.applicable = true;
		cb(null);
	});
}

Story.prototype.insert = function (cb) {
	var story = this;
	db.query('INSERT INTO "Stories" ("nf_id", "author", "title", "date", "last_commenter", "last_comment_count") VALUES ($1, $2, $3, $4, $5, $6);',
		[this.nfid, this.author, this.title, this.date, this.lastCommenter, this.lastCommentCount],
		function (err, result) {
			if (err) { cb(err); console.error(err); return; }
			if (story.contest) {
				db.query('INSERT INTO "Contests" ("name", "included") VALUES ($1, $2) ON CONFLICT("name") DO UPDATE SET "included"=excluded."included";',
					[story.contest, true],
					function (err, result2) {
						if (err) { cb(err); console.error(err); return; }
						db.query('SELECT "id" FROM "Contests" WHERE "name" = $1;',
							[story.contest],
							function (err, result3) {
								if (err) { cb(err); console.error(err); return; }
								var contestId = result3.rows[0].id;
								db.query('INSERT INTO "ContestsStories" ("contest_id", "story_id") VALUES ($1, $2);',
									[contestId, story.nfid],
									function (err, result4) {
										if (err) { cb(err); console.error(err); return; }
										cb(null, story);
									});
							});
					});
			}
			else {
				cb(null, story);
			}
		}
	);
}

Story.prototype.update = function (judges, cb) {
	var judges = {};
	var story = this;
	var dbStory = new Story();
	dbStory.createFromDatabase(this.nfid, function (err) {
		if (err) { cb(err); console.error(err); return; }
		if (dbStory.lastUpdated && story.lastCommenter === dbStory.lastCommenter && story.lastCommentCount === dbStory.lastCommentCount) {
			if (process.env.ENV === 'dev') console.log('no need to update');
			db.query('UPDATE "Stories" SET "last_updated" = strftime(\'%s\', \'now\') * 1000 WHERE "nf_id" = $1;', [story.nfid], function (err, result) {
				cb(err, story.nfid);
			});
			return;
		}
		var url = 'https://www.fantastyka.pl/opowiadania/pokaz/' + story.nfid;

		reqs.makeHttpGet(url, function (err, $) {
			if (err) { cb(err); return; }
			var comments = $('section.kom a.login');
			if (comments.length === 0) cb(null, story.nfid);
			comments.each(function () {
				var name = $(this).html();
				if (name in judges) ++(judges[name].commCount);
				else {
					judges[name] = {
						id: 0,
						commCount: 1
					};
				}
			});
			db.query('UPDATE "Stories" SET "last_updated" = strftime(\'%s\', \'now\') * 1000, "last_commenter" = $1, "last_comment_count" = $2 WHERE "nf_id" = $3;',
				[story.lastCommenter, story.lastCommentCount, story.nfid],
				function (err, result) {
					if (err) { cb(err); console.error(err); return; }
					var query = 'INSERT INTO "StoriesJudgesComments" ("StoryId", "JudgeId", "comment_count") VALUES ($1, $2, $3) ON CONFLICT ("StoryId", "JudgeId") DO UPDATE SET "comment_count"=excluded."comment_count";';
					var insertsToDo = Object.keys(judges).length;
					console.log('judges', judges);
					for (var name in judges) {
						const theName = name;
						var upsertJudgeQuery = 'INSERT INTO "Judges" ("name", "active", "permanent") VALUES ($1, false, false) ON CONFLICT("name") DO NOTHING;';
						db.query(upsertJudgeQuery, [theName], function (err, result) {
							if (err) { cb(err); console.error(err); return; }
							var getJudgeIdQuery = 'SELECT * FROM "Judges" WHERE "name" = $1;';
							db.query(getJudgeIdQuery, [theName], function (err, result) {
								if (err) { cb(err); console.error(err); return; }
								var dumbName = result.rows[0].name;
								judges[dumbName].id = result.rows[0].id;
								db.query(query,
									[story.nfid, judges[dumbName].id, judges[dumbName].commCount],
									function (err, result) {
										--insertsToDo;
										if (err) { cb(err); console.error(err); return; }
										if (insertsToDo === 0) cb(null, story.nfid);
									}
								);
							});
						});
					}
				}
			);
		});
	});
}

Story.prototype.delete = function (cb) {
	var story = this;
	db.query('DELETE FROM "Stories" WHERE "nf_id" = $1;', [story.nfid], function (err, result) {
		cb(err, story.nfid);
	});
}

function extractNfid(listaElement) {
	var idPattern = /\/opowiadania\/pokaz\/(\d+)/;
	var matchId = idPattern.exec(listaElement.find('.tytul').attr('href'));
	return +matchId[1];
}

function extractDate(listaElement) {
	var pattern = /(\d{2}).(\d{2}).(\d{2}), g. (\d{2}):(\d{2})/;
	var match = pattern.exec(listaElement.find('.tytul').siblings('div').html());
	return new Date(+('20' + match[3]), +match[2] - 1, +match[1], +match[4], +match[5]);
}

function extractAuthor(listaElement) {
	return listaElement.children('.autor').children('a').html().slice(0, -1).replace(/&nbsp;/g, ' ');;
}

function extractTitle(listaElement) {
	return listaElement.children('.teksty').children('.tytul').html();
}

function extractCommenter(listaElement) {
	var commenter = listaElement.children('.teksty').children('div').children('a').not('.konkurs').html();
	return commenter ? commenter : null;
}

function extractCommentCount(listaElement) {
	var pattern = /\d+/;
	var match = pattern.exec(listaElement.find('div[title="komentarze"]').html());
	return +match[0];
}

function extractContest(listaElement) {
	var konkurs = listaElement.find('.konkurs').html();
	return konkurs ? konkurs : null;
}

function checkIfApplicable(listaElement) {
	var text = listaElement.children('.teksty').children('div').text();
	var tags = text.match(/[^|]+(?=\| kom|\| \d{2}\.)/g)[0];
	return tags.indexOf('opowiadanie') !== -1 || tags.indexOf('szort') !== -1;
}

module.exports = Story;
