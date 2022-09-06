var db = require('./db');
const moment = require('moment');

var days = ['niedziela', 'poniedzialek', 'wtorek', 'sroda', 'czwartek', 'piatek', 'sobota'];

var callbacksNo = 0;

module.exports = {
	getDuties: function(username, cb){
		db.query('SELECT "name", "active", "permanent" FROM "Judges" WHERE "name" = $1;', [username], function(err, result){
			if (result.rows.length === 0){
				cb("Brak człowieka!");
				return;
			}

			var role;
			if (result.rows[0].active){
				if (result.rows[0].permanent){
					role = "loza";
				}
				else{
					role = "uzytkownicy";
				}
			}
			else{
				role = "brak";
			}

			var duties = { 
				rola: role,
				dataod: ''
			};

			for (var day = 0; day < days.length; ++day){
				duties[days[day]] = false;
			}

			db.query('SELECT "day_of_week", MIN("from") AS "from" FROM "Duties" INNER JOIN "Judges" ON "Duties"."JudgeId" = "Judges"."id" WHERE "Judges"."name" = $1 GROUP BY "day_of_week";', 
				[username],
				function(err, dutiesRows){
					if (dutiesRows === undefined){
						cb(null, duties);
						return;
					}

					for (var iRow = 0; iRow < dutiesRows.rows.length; ++iRow){
						duties[days[dutiesRows.rows[iRow].day_of_week]] = true;
					}

					if (dutiesRows.rows.length > 0){
						duties.dataod = moment(dutiesRows.rows[0].from).toISOString().substring(0, 10);
					}

					cb(null, duties);
				});
		});
	},
	updateDuties: function(username, reqBody, cb){
		callbacksNo = 0;

		var active = 0;
		var permanent = 0;
		var dataod = moment(reqBody.dataod || '2015-01-01').toDate();
		if (reqBody.rola === "brak"){
			active = 0;
			permanent = 0;
		}
		else if (reqBody.rola === "loza"){
			active = 1;
			permanent = 1;
		}
		else if (reqBody.rola === "uzytkownicy"){
			active = 1;
			permanent = 0;
		}

		db.query('UPDATE "Judges" SET "active" = $1, "permanent" = $2 WHERE "name" = $3;',
			[active, permanent, username],
			function(err, result){
				for (var day = 0; day < days.length; ++day){
					if (reqBody[days[day]] !== undefined){
						db.query('INSERT INTO "Duties" ("day_of_week", "JudgeId", "from") SELECT $1, "id", $3 FROM "Judges" WHERE "name" = $2 ON CONFLICT ("day_of_week", "JudgeId") DO UPDATE SET "from"=excluded."from";',
						[day, username, dataod],
						function(err,result){
							++callbacksNo;
							if (callbacksNo === days.length){
								cb(null);
							}
						});
					}
					else{
						db.query('DELETE FROM "Duties" WHERE "day_of_week" = $1 AND "JudgeId" IN (SELECT "id" FROM "Judges" WHERE "name" = $2);',
							[day, username],
								function(err,result){
								++callbacksNo;
								if (callbacksNo === days.length){
									cb(null);
								}
							});
					}
				}
			});
	},
	toggleStory: function(nfid, cb){
		db.query('UPDATE "Stories" SET "excluded" = NOT "excluded" WHERE "nf_id" = $1', 
			[nfid],
			function(err,result){
				cb(null);
		});
	},
	toggleContest: function(contestId, cb) {
		db.query('UPDATE "Contests" SET "included" = NOT "included" WHERE "id" = $1',
			[contestId],
			function(err,result){
				cb(null);
		});
	}
};