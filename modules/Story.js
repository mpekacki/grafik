var db = require('./db');
var reqs = require('./requests');

function Story(){}

Story.prototype.createFromElement = function(listaElement){
	this.nfid = extractNfid(listaElement);
	this.author = extractAuthor(listaElement);
	this.title = extractTitle(listaElement);
	this.date = extractDate(listaElement);
	this.lastCommenter = extractCommenter(listaElement);
	this.lastCommentCount = extractCommentCount(listaElement);
	this.lastUpdated = null;
	this.applicable = checkIfApplicable(listaElement);
}

Story.prototype.createFromDatabase = function(_nfid,cb){
	var story = this;
	db.query('SELECT * FROM "Stories" WHERE "nf_id" = $1;', [_nfid], function(err,result){
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

Story.prototype.insert = function (cb){
	var story = this;
	db.query('INSERT INTO "Stories" ("nf_id", "author", "title", "date", "last_commenter", "last_comment_count") VALUES ($1, $2, $3, $4, $5, $6);',
		[this.nfid, this.author, this.title, this.date, this.lastCommenter, this.lastCommentCount],
		function(err, result){
			if (err) { cb(err); console.error(err); return; }
			cb(null, story);
		}
	);
}

Story.prototype.update = function (judges, cb){
	var judges = {};
	var story = this;
	var dbStory = new Story();
	dbStory.createFromDatabase(this.nfid, function(err){
		if(err) {cb(err); console.error(err); return; }
		if(dbStory.lastUpdated && story.lastCommenter === dbStory.lastCommenter && story.lastCommentCount === dbStory.lastCommentCount){
			if(process.env.ENV === 'dev') console.log('no need to update');
			db.query('UPDATE "Stories" SET "last_updated" = now() WHERE "nf_id" = $1;', [story.nfid], function(err,result){
				cb(err, story.nfid);
			});
			return;
		}
		var url = 'http://www.fantastyka.pl/opowiadania/pokaz/' + story.nfid;

		reqs.makeHttpGet(url, function(err, $){
			if (err){ cb(err); return; }
			var comments = $('section.kom a.login');
			if (comments.length === 0) cb(null, story.nfid);
			comments.each(function(){
				var name = $(this).html();
				if (name in judges) ++(judges[name].commCount);
				else {
					judges[name] = {
						id: 0,
						commCount: 1
					};
				}
			});
			db.query('UPDATE "Stories" SET "last_updated" = now(), "last_commenter" = $1, "last_comment_count" = $2 WHERE "nf_id" = $3;',
				[story.lastCommenter, story.lastCommentCount, story.nfid],
				function(err,result){
					if (err) { cb(err); console.error(err); return; }
					var query = 'WITH upsert AS (UPDATE "StoriesJudgesComments" SET "comment_count" = $3 WHERE "StoryId" = $1 AND "JudgeId" = $2 RETURNING *) INSERT INTO "StoriesJudgesComments" ("StoryId", "JudgeId", "comment_count") SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT * FROM upsert);';
					var insertsToDo = Object.keys(judges).length;
					for (var name in judges){
						var getJudgeIdQuery = 'WITH s AS (SELECT "id" FROM "Judges" WHERE "name" = $1), i AS (INSERT INTO "Judges" ("name", "active", "permanent") SELECT $1, false, false WHERE NOT EXISTS (SELECT 1 FROM s) RETURNING "id") SELECT "id" FROM i UNION ALL SELECT "id" FROM s;';
						db.query(getJudgeIdQuery, [name], function(err,result){
							if (err) {cb(err); console.error(err); return;}
							judges[name].id = result.rows[0].id;
							db.query(query,
								[story.nfid, judges[name].id, judges[name].commCount],
								function(err,result){
									--insertsToDo;
									if (err) {cb(err); console.error(err); return; }
									if(insertsToDo === 0) cb(null, story.nfid);
								}
							);
						});
					}
				}
			);
		});
	});
}

Story.prototype.delete = function(cb){
	var story = this;
	db.query('DELETE FROM "Stories" WHERE "nf_id" = $1;', [story.nfid], function(err,result){
		cb(err, story.nfid);
	});
}

function extractNfid(listaElement){
	var idPattern = /\/opowiadania\/pokaz\/(\d+)/;
	var matchId = idPattern.exec(listaElement.find('.tytul').attr('href'));
	return +matchId[1];
}

function extractDate(listaElement){
	var pattern = /(\d{2}).(\d{2}).(\d{2}), g. (\d{2}):(\d{2})/;
	var match = pattern.exec(listaElement.find('.tytul').siblings('div').html());
	return new Date(+('20' + match[3]), +match[2] - 1, +match[1], +match[4], +match[5]);
}

function extractAuthor(listaElement){
	return listaElement.children('.autor').children('a').html().slice(0,-1).replace(/&nbsp;/g, ' ');;
}

function extractTitle(listaElement){
	return listaElement.children('.teksty').children('.tytul').html();
}

function extractCommenter(listaElement){
	var commenter = listaElement.children('.teksty').children('div').children('a').not('.konkurs').html();
	return commenter ? commenter : null;
}

function extractCommentCount(listaElement){
	var pattern = /\d+/;
	var match = pattern.exec(listaElement.find('div[title="komentarze"]').html());
	return +match[0];
}

function checkIfApplicable(listaElement){
	var text = listaElement.children('.teksty').children('div').text();
	var tags = text.match(/[^|]+(?=\| kom|\| \d{2}\.)/g)[0];
	return tags.indexOf('opowiadanie') !== -1 || tags.indexOf('szort') !== -1;
}

module.exports = Story;