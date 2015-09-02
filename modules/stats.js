var db = require('./db');

var stats = function(req, res, next) {
	if (req.url === "/favicon.ico"){
		return next();
	}
	var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  
  db.query('INSERT INTO "Stats" ("ip", "page", "protocol", "date") VALUES ($1, $2, $3, $4);', [ip, req.url, req.headers['x-forwarded-proto'], new Date()], function(err, result) { });
  next();
};

module.exports = stats;