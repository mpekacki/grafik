var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var log = (process.env.ENV === 'development');

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
		request(url, agent: agent, function(err, response, body){
			if (err) {
				cb(err);
				return;
			}
			var $ = cheerio.load(body, { decodeEntities: false });
			cb(err, $);
		});
	}
};
