var pg = require('pg');
var log = (process.env.ENV === 'developmen');

module.exports = {
	init: function(dbUrl){
		this.dbUrl = dbUrl;
		process.env.PGHOST = process.env.POSTGRESQL_SERVICE_HOST;
		process.env.PGPORT = process.env.POSTGRESQL_SERVICE_PORT;
	},
	query: function(text, values, cb){
		if(!this.hasOwnProperty('dbUrl') 
			|| this.dbUrl === null 
			|| this.dbUrl === undefined){
			throw "Database connection not initialized."; 
		}
		pg.connect(this.dbUrl, function(err, client, done){
			if (err) return cb(err);
			if(log)
				console.log(text + values);
			client.query(text, values, function(err, result){
				done();
				if (err)
					err.query = text;
				cb(err, result);
			});
		});
	}
};