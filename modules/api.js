var db = require('./db');

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
				poniedzialek: false,
				wtorek: false,
				sroda: false,
				czwarte: false,
				piatek: false,
				sobota: false,
				niedziela: false
			};

			db.query('SELECT "day_of_week" FROM "Duties" INNER JOIN "Judges" ON "Duties"."JudgeId" = "Judges"."id" WHERE "Judges"."name" = $1;', 
				[username],
				function(err, dutiesRows){
					if (dutiesRows === undefined){
						cb(null, duties);
						return;
					}

					for (var iRow = 0; iRow < dutiesRows.rows.length; ++iRow){
						duties[days[dutiesRows.rows[iRow].day_of_week]] = true;
					}

					cb(null, duties);
				});
		});
	},
	updateDuties: function(username, reqBody, cb){
		callbacksNo = 0;

		var active = 0;
		var permanent = 0;
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
						db.query('INSERT INTO "Duties" ("day_of_week", "JudgeId") SELECT $1, "id" FROM "Judges" WHERE "name" = $2',
						[day, username],
						function(err,result){
							++callbacksNo;
							if (callbacksNo === days.length){
								cb(null);
							}
						});
					}
					else{
						db.query('DELETE FROM "Duties" USING "Judges" WHERE "Duties"."JudgeId" = "Judges"."id" AND "day_of_week" = $1 AND "Judges"."name" = $2;',
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
	}
};