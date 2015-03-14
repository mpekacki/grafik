var db = require('./db');
var reqs = require('./requests');
var Story = require('./Story');
var moment = require('moment');
moment.locale('pl');

function completeRun(dateFrom, dateTo, cb){
	var diffDays = Math.ceil((dateTo - dateFrom) / (1000 * 3600 * 24));
	if(diffDays >= 100){cb("date range too big"); return; }
	if (process.env.UPDATE !== 'true'){
		process.env.UPDATE = 'true';
		performUpdate(dateFrom, dateTo, function(err){
			process.env.UPDATE = null;
			if(err) {cb(err); console.error(err); return}
			getChart(dateFrom,dateTo, function(err, result){
				if(err) {cb(err); console.error(err); return}
				var rows = result;
				getSummary(dateFrom, dateTo, function(err,result){
					if(err) {cb(err); console.error(err); return}
					var summary = result;
					getLastUpdateDate(dateFrom, dateTo, function(err, date){
						if(err) {cb(err); console.error(err); return}
						cb(null, {days: rows, summary:summary, last_updated: date});
					});
				});
			});
		});
	}
	else {
		var err = new Error('Update in progress! Please try again in a few seconds, yo.');
		err.status = 503;
		cb(err);
	}
}

function performUpdate(dateFrom, dateTo, cb){
	createJudgesObj(function(err, judges){
		if (err) {cb(err);console.error(err);return;}
		getTopBottomDates(function(err, dates){
			var storiesEmpty = false;
			var bottomDate = dates.bottom_date;
			var topDate = dates.top_date;
			if(!topDate) {
				topDate = new Date(dateFrom);
				storiesEmpty = true;
			}
			getStoriesThatNeedUpdate(dateFrom, dateTo, function(err, nfids){
				if (err) {cb(err);console.error(err);return;}
				var tempBottom = new Date(bottomDate);
				tempBottom.setHours(0,0,0,0);
				var tempFrom = new Date(dateFrom);
				tempFrom.setHours(0,0,0,0);
				if (nfids.length === 0 && !storiesEmpty && tempBottom <= tempFrom) {cb(null);return;}
				callbacks = [];
				finished = false;
				updateStoriesIndex(nfids, judges, topDate, bottomDate, dateFrom, function(err){
					if (err) {cb(err);console.error(err);return;}
					else cb(null);
				});
			});
		});
	});
}

function getChart(dateFrom, dateTo, cb) {
	var startOfDay = moment(dateTo).startOf('day');
	var callsToDo = 0;
	var result = [];
	var fromTemp = moment(dateFrom).startOf('day');
	do{
		var endOfDay = moment(startOfDay).endOf('day');

		getStoriesForDates(startOfDay.toDate(), endOfDay.toDate(), function(err, stories){
			var locResult = [];
			var locCallsToDo = stories.length;
			callsToDo += locCallsToDo;
			for (var iStory = 0; iStory < stories.length; ++iStory){
				getTableRowsForStory(stories[iStory], function(err,rows, story){
					--locCallsToDo;
					locResult.push({"id" : story.nf_id, "title": story.title, "author": story.author, "date": story.date.toISOString(), "display_date": moment(story.date).format('H:mm'), "last_comment_count" : story.last_comment_count, "comments": rows});
					if(locCallsToDo === 0) {locResult.sort(locResSort); result.push({"day": story.date.toISOString().slice(0,-14), "display_day": moment(story.date).format('D MMMM YYYY, dddd'), "stories": locResult});callsToDo -= stories.length;}
					if(callsToDo === 0){result.sort(resSort); cb(null, result);}
				});
			}
		});

		startOfDay.subtract(1, 'days');
	}while(startOfDay >= fromTemp);
}

function getSummary(dateFrom, dateTo, cb){
	db.query('WITH total AS (WITH summary AS (SELECT "name", sum(CASE WHEN EXTRACT (DOW FROM "date") = "day_of_week" THEN 1 ELSE 0 END) > 0 AS "on_duty", "comment_count" FROM "Judges" INNER JOIN "StoriesJudgesComments" ON "Judges"."id" = "StoriesJudgesComments"."JudgeId" INNER JOIN "Duties" ON "Judges"."id" = "Duties"."JudgeId" INNER JOIN "Stories" ON "StoriesJudgesComments"."StoryId" = "Stories"."nf_id" WHERE "date" BETWEEN $1 AND $2 GROUP BY "name", "comment_count", "Stories"."nf_id") SELECT "name", sum(CASE WHEN "on_duty" AND "comment_count" > 0 THEN 1 ELSE 0 END) AS "quota_done", sum(CASE WHEN "on_duty" THEN 1 ELSE 0 END) AS "quota_total", sum(CASE WHEN NOT "on_duty" AND "comment_count" > 0 THEN 1 ELSE 0 END) AS "hobby_done", sum(CASE WHEN NOT "on_duty" THEN 1 ELSE 0 END) AS "hobby_total" FROM summary GROUP BY "name" ORDER BY "name") SELECT "name", "quota_done", "quota_total", CASE WHEN "quota_total" = 0 THEN 100 ELSE round("quota_done"::float / "quota_total" * 100) END AS "quota_percent", "hobby_done", "hobby_total", CASE WHEN "hobby_total" = 0 THEN 100 ELSE round("hobby_done"::float / "hobby_total" * 100) END AS "hobby_percent", "quota_done" + "hobby_done" AS "all_done", "quota_total" + "hobby_total" AS "all_total", CASE WHEN ("quota_total" + "hobby_total") = 0 THEN 100 ELSE round(("quota_done" + "hobby_done")::float / ("quota_total" + "hobby_total") * 100) END AS "all_percent" FROM total;',
		[dateFrom.toISOString(), dateTo.toISOString()],
		function(err,result){
			if(err){cb(err); console.error(err); return}
			cb(null,result);
		});
}

function locResSort(a,b){
	return new Date(b.date) - new Date(a.date);
}

function resSort(a,b){
	return new Date(b.day) - new Date(a.day);
}

function getStoriesForDates(dateFrom, dateTo, cb){
	db.query('SELECT "nf_id", "author", "title", "date", "last_comment_count" FROM "Stories" WHERE "date" >= $1 AND "date" < $2;',
		[moment(dateFrom).format(), moment(dateTo).format()],
		function(err,result){
			if(err) {console.error(err); cb(err); return;}
			cb(null, result.rows);
		});
};

function getTableRowsForStory(story, cb){
	db.query('SELECT "name", "comment_count", sum(CASE WHEN EXTRACT(DOW FROM "date") = "day_of_week" THEN 1 ELSE 0 END) > 0 AS "on_duty" FROM "Judges" INNER JOIN "StoriesJudgesComments" ON "Judges"."id" = "StoriesJudgesComments"."JudgeId" LEFT JOIN "Duties" ON "Judges"."id" = "Duties"."JudgeId" INNER JOIN "Stories" ON "StoriesJudgesComments"."StoryId" = "Stories"."nf_id" WHERE "StoryId" = $1 GROUP BY "name", "comment_count" ORDER BY "name";',
		[story.nf_id],
		function(err,result){
			if(err) {console.error(err); cb(err); return;}
			cb(null, result.rows, story);
		});
}

function getStoriesThatNeedUpdate(dateFrom, dateTo, cb) {
	var tooOldDate = new Date(new Date() - process.env.MINUTES * 60000);
	//tooOldDate.setHours(tooOldDate.getHours() - 1);
	db.query('SELECT "nf_id", "date" FROM "Stories" WHERE "date" BETWEEN $1 AND $2 AND ("last_updated" < $3) OR "last_updated" IS NULL;', 
		[dateFrom.toISOString(), dateTo.toISOString(), tooOldDate.toISOString()],
		function(err, result){
			if (err) { cb(err); console.error(err); return; }
			var stories = [];
			for (var iRow = 0; iRow < result.rows.length; ++iRow){
				stories.push({ nfid: result.rows[iRow].nf_id, date: result.rows[iRow].date });
			}
			cb(null, stories);
		}
	);
}

function getTopBottomDates(cb){
	db.query('SELECT max("date") AS "top_date", min("date") AS "bottom_date" FROM "Stories";', [], function(err, result){
		if(err) { cb(err); console.error(err); return; }
		cb(null, result.rows[0]);
	});
}

function getLastUpdateDate(dateFrom, dateTo, cb){
	db.query('SELECT max("last_updated") AS "last_updated" FROM "Stories" WHERE "date" BETWEEN $1 AND $2;',
		[dateFrom.toISOString(), dateTo.toISOString()],
		function(err,result){
		cb(err, new Date(result.rows[0].last_updated));
	});
}

function createJudgesObj(cb){
	db.query('SELECT "id", "name" FROM "Judges" WHERE "active" = true;', [], function(err,result){
		if (err) { cb(err); console.error(err); return; }
		var judgesObj = {};
		for (var iRow = 0; iRow < result.rows.length; ++iRow){
			var row = result.rows[iRow];
			judgesObj[row.name] = {id: row.id, commCount: 0};
		}
		cb(null, judgesObj);
	});
}

function findNfid(nfid, array){
	for (var iStory = 0; iStory < array.length; ++iStory){
		if (array[iStory].nfid === nfid) return iStory;
	}
	return -1;
}

function removeRemoved(lastDate, array){
	for (var iStory = 0; iStory < array.length; ++iStory){
		if (array[iStory].date > lastDate){
			db.query('DELETE FROM "Stories" WHERE "nf_id" = $1', [array[iStory].nfid], function(err,result){
				if(err) console.error(err);
			});
			array.splice(iStory, 1);
			--iStory;
		}
	}
}

var callbacks = [];
var finished = false;

function updateStoriesIndex(nfids, judges, topDate, bottomDate, dateFrom, cb, pageNo){
	pageNo = pageNo || 1;
	var url = 'http://www.fantastyka.pl/opowiadania/wszystkie/w/w/w/0/d/' + pageNo;
	reqs.makeHttpGet(url, function(err, $){
		if(err) { cb(err); console.error(err); return; }
		//na pierwszej stronie są przyklejone tematy, trzeba ich uniknąć
		var selector = (pageNo === 1) ? 'article:not(.hyphenate) > div.lista' : 'article.hyphenate > div.lista'; 
		var stories = $(selector);
		var story = new Story();
		$(stories).each(function(){
			story = new Story();
			story.createFromElement($(this));
			if (story.date <= topDate && story.date >= bottomDate){ //opowiadanie jest już w bazie
				if (!story.applicable){
					callbacks.push(story.nfid);
					story.delete(function(err, retNfid){
						callbacks.splice(callbacks.indexOf(retNfid), 1);
						if(err) { cb(err); nfids = []; console.error(err); return false; }
						if(callbacks.length === 0 && finished) {cb(null);}
					});
				}
				else{
					var nfidIndex = findNfid(story.nfid, nfids);
					if (nfidIndex !== -1){
						anyCallback = true;
						callbacks.push(story.nfid);
						story.update(judges, function(err, retNfid){
							callbacks.splice(callbacks.indexOf(retNfid), 1);
							if(err) { cb(err); nfids = []; console.error(err); return false; }
							if(callbacks.length === 0 && finished) {cb(null);}
						});
						nfids.splice(nfidIndex, 1);
					}
				}
			}	else if (story.applicable && (story.date >= topDate || (story.date <= bottomDate && story.date >= dateFrom))){
				story.insert(function(err, retStory){
					if(err) { cb(err); nfids = []; console.error(err); return false; }
					anyCallback = true;
					callbacks.push(story.nfid);
					retStory.update(judges, function(err, retNfid){
						callbacks.splice(callbacks.indexOf(retNfid), 1);
						if(err) { cb(err); nfids = []; console.error(err); return false; }
						if(callbacks.length === 0 && finished) {cb(null);}
					});
				});
			}
		});
		removeRemoved(story.date, nfids);
		if (nfids.length > 0 || story.date > topDate || story.date > dateFrom) updateStoriesIndex(nfids, judges, topDate, bottomDate, dateFrom, cb, ++pageNo);
		else {
			finished = true;
			if (callbacks.length === 0) cb(null);
		}
	});
}

module.exports = {
	completeRun: completeRun
};
