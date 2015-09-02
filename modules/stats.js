var db = require('./db');

var stats = function(req, res, next) {
	var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  
  db.query('INSERT INTO "Stats" ("ip", "date") VALUES ($1, $2);', [ip, new Date()], function(err, result) { });
  next();
};

module.exports = stats;