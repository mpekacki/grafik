"use strict"

var db = require('./modules/db');
db.init(process.env.OPENSHIFT_POSTGRESQL_DB_URL);
var reqs = require('./modules/requests');

db.query('INSERT INTO "Snapshots" ("year", "month", "date_of_update", "content") VALUES ($1, $2, $3, $4)', 
	[1979, Math.floor(Math.random() * 12), new Date(), JSON.stringify(new Date())], 
	function(err, result){

});