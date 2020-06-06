const request = require('request');
const https = require('https');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const log = (process.env.ENV === 'development');

module.exports = {
	makeHttpGet : function(url, cb){
		var agentOptions;
		var agent;

		agentOptions = {
		  host: 'www.fantastyka.pl'
		, rejectUnauthorized: false
		};

		agent = new https.Agent(agentOptions);
		
		if (log) console.log('making request to ' + url);
		request({url: url, agent: agent}, function(err, response, body){
			if (err) {
				cb(err);
				return;
			}
			var $ = cheerio.load(body, { decodeEntities: false });
			cb(err, $);
		});
	}
};
