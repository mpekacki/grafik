const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

module.exports = {
	init: function (dbUrl) {
		this.dbUrl = dbUrl;
	},
	query: function (text, values, cb) {
		if (!this.hasOwnProperty('dbUrl')
			|| this.dbUrl === null
			|| this.dbUrl === undefined) {
			throw "Database connection not initialized.";
		}
		const valuesObj = Object.fromEntries(
			new Map(
				values.map((v, i) => ['$' + (i + 1), v])
			)
		);
		// console.log('query', text, valuesObj);
		sqlite.open({
			filename: this.dbUrl,
			driver: sqlite3.Database
		}).then((db) => {
			// if (text.startsWith('INSERT') || text.startsWith('UPDATE') || text.startsWith('UPSERT') || text.startsWith('DELETE') || text.startsWith('WITH s AS')) {
			// 	return db.run(text, valuesObj);
			// } else {
				return db.all(text, valuesObj);
			// }
		}).then((result) => {
			console.log('result', text, valuesObj, result);
			cb(null, {
				rows: result
			});
		}).catch((error) => {
			console.error('db error', error, text, valuesObj);
			cb(error);
		});
	}
};