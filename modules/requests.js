const request = require('request');
const https = require('https');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const log = (process.env.ENV === 'development');
const skipAuthErrors = process.env.SKIP_A === '1';

module.exports = {
	makeHttpGet : function(url, cb){
		var agentOptions;
		var agent;

		agentOptions = {
		  host: 'www.fantastyka.pl'
		, rejectUnauthorized: !skipAuthErrors
		};

		agent = new https.Agent(agentOptions);
		
		if (log) console.log('making request to ' + url);
		request({url: url, agent:agent}, function(err, response, body){
			if (err) {
				cb(err);
				return;
			}
			var $ = cheerio.load(body, { decodeEntities: false });
			cb(err, $);
		});
	}
};
