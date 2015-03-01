var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');

module.exports = {
	makeHttpGet : function(url, cb){
		console.log('making request to ' + url);
		request(url, function(err, response, body){
			var $ = cheerio.load(body, { decodeEntities: false });
			cb(err, $);
		});
	}
};