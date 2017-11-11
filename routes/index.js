var express = require('express');
var router = express.Router();
var http = require('http');
var requests = require('../modules/requests');
var core = require('../modules/core');
var db = require('../modules/db');
var api = require('../modules/api');
var Story = require('../modules/Story');
var moment = require('moment');
var log = (process.env.ENV === 'development');
moment.locale('pl');

router.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

router.get('/komentarze/', function (req, res, next){
  var endDate = new Date();
  var startDate = moment(new Date()).subtract(process.env.MONTHS, 'months').startOf('month').toDate();
  if (req.query.dataod && req.query.datado){
      startDate = moment(req.query.dataod);
      endDate = moment(req.query.datado);
      if (!startDate.isValid() || !endDate.isValid()){
          var err = new Error("that shit crazy");
          err.status = 400;
          return next(err);
      }
  }
  core.getCommentStats(startDate, endDate, function(err, stats){
    if(err) return next(err);
    res.render('comments', {month: 'okres od ' + moment(startDate).format('D MMMM YYYY') + ' do ' + moment(endDate).format('D MMMM YYYY'), stats: stats, history: -1, max_hist: -1 });
  });
});

router.get('/konkursy', function(req,res,next){
  core.getContests(function(err,contests) {
    if (err) return next(err);
    res.render('konkursy', {title: "Konkursy", contests: contests});
  });
});

router.get('/konkurs/:id', function(req,res,next){
  var contestId = +req.params.id;
  if (isNaN(contestId)) {
    var err = new Error("");
    err.status = 400;
    return next(err);
  }
  var endDate = new Date();
  var startDate = moment(new Date()).subtract(process.env.MONTHS, 'months').startOf('month').toDate();
  core.getContestChart(contestId, startDate, endDate, function(err,result){
    res.render('konkurs', {title: 'Konkurs "' + result[0].stories[0].contest_name +'"', days:result});
  });
});

router.get('/komentarze/:history?', function (req, res, next){
  var hist = req.params.history ? +req.params.history : 0;
  if (hist < 0) hist = -hist;
  if (hist > process.env.MONTHS) {
    var err = new Error('stahp');
    err.status = 403;
    return next(err);
  }
  var endDate = new Date();
  endDate = moment(endDate).subtract(hist, 'months').toDate();
  if (hist > 0) endDate = moment(endDate).endOf('month').toDate();
  var startDate = moment(endDate).startOf('month').toDate();
  core.getCommentStats(startDate, endDate, function(err, stats){
    if(err) return next(err);
    res.render('comments', {month: moment(endDate).format('MMMM YYYY'), stats: stats, history: hist, max_hist: process.env.MONTHS});
  });
});

/* panel admina, modyfikacja dyżurów */
router.get('/lubieplacki/:username?', function (req, res, next) {
  if (req.headers['x-forwarded-proto'] == 'http') { 
      res.redirect('https://' + req.headers.host + req.path);
  } 

  var endDate = new Date();
  var startDate = moment(new Date()).subtract(process.env.MONTHS, 'months').startOf('month').toDate();
  core.getJudges(function(err,result){
    core.getStoriesForDates(startDate, endDate, function(err, stories){
      var excludedStories = [];
      for (var iStory = 0; iStory < stories.length; ++iStory) {
        if (stories[iStory].excluded) {
          excludedStories.push(stories[iStory]);
        }
      }
      core.getContests(function(err,contests){
        var excludedContests = [];
        for (var iContest = 0; iContest < contests.length; ++iContest){
          if (!contests[iContest].included) {
            excludedContests.push(contests[iContest]);
          }
        }
        res.render('admin', {osoby: result, selectedUser: req.params.username, stories: stories, excluded_stories: excludedStories, contests: contests, excluded_contests: excludedContests});        
      });
    });
  });
});

router.post('/api/dyzury', function (req, res, next){
  if (req.headers['x-forwarded-proto'] == 'http') { 
      res.redirect('https://' + req.headers.host + req.path);
  }

  if(req.body.klucz !== process.env.KLUCZ || process.env.ATTEMPTS > 20){
    if (!process.env.ATTEMPTS) {
      process.env.ATTEMPTS = 1;
    } else {
      process.env.ATTEMPTS++;
    }
    var err = new Error("BZZT! Wrong authorization key! Dispatching security forces. Have a nice day.");
    err.status = 401;
    return next(err);
  }

  console.log(req.body);
  api.updateDuties(req.body.osoba, req.body, function(err){
    res.redirect('/lubieplacki/' + req.body.osoba);
  });
});

router.get('/api/dyzury/:username', function(req, res, next){
  api.getDuties(req.params.username, function(err, duties){
    res.send(duties);
  });
});

router.post('/api/stories/', function(req, res,next){
  if (req.headers['x-forwarded-proto'] == 'http') { 
    res.redirect('https://' + req.headers.host + req.path);
  }

  if(req.body.klucz !== process.env.KLUCZ || process.env.ATTEMPTS > 20){
    if (!process.env.ATTEMPTS) {
      process.env.ATTEMPTS = 1;
    } else {
      process.env.ATTEMPTS++;
    }
    var err = new Error("BZZT! Wrong authorization key! Dispatching security forces. Have a nice day.");
    err.status = 401;
    return next(err);
  }

  api.toggleStory(req.body.nfid, function(err) {
    res.redirect('/lubieplacki/');
  });
});

router.post('/api/contests/', function(req, res,next){
  if (req.headers['x-forwarded-proto'] == 'http') { 
    res.redirect('https://' + req.headers.host + req.path);
  }

  if(req.body.klucz !== process.env.KLUCZ || process.env.ATTEMPTS > 20){
    if (!process.env.ATTEMPTS) {
      process.env.ATTEMPTS = 1;
    } else {
      process.env.ATTEMPTS++;
    }
    var err = new Error("BZZT! Wrong authorization key! Dispatching security forces. Have a nice day.");
    err.status = 401;
    return next(err);
  }

  api.toggleContest(req.body.contestid, function(err) {
    res.redirect('/lubieplacki/');
  });
});

/* GET home page. */
router.get('/:history?', function(req, res, next) {
  var hist = req.params.history ? +req.params.history : 0;
  if (hist < 0) hist = -hist;
  if (hist > process.env.MONTHS) {
    var err = new Error('stahp');
    err.status = 403;
    return next(err);
  }
  var endDate = new Date();
  endDate = moment(endDate).subtract(hist, 'months').toDate();
  if (hist > 0) endDate = moment(endDate).endOf('month').toDate();
  var startDate = moment(endDate).startOf('month').toDate();
  if (log) console.log(startDate, endDate);
  var secret = Math.random() <= 0.001 ? "Jeśli to czytasz - obudź się. Od ponad dwudziestu lat jesteś w śpiączce. Cały czas usiłujemy Cię wybudzić, lecz bezskutecznie. Próbujemy teraz nowej metody. Mamy nadzieję, że ta wiadomość pojawi się w Twoim śnie. Prosimy, obudź się i wróć do nas. Bardzo nam Ciebie brakuje." : null;
  core.completeRun(startDate, endDate, function(err,result){
    if(err) return next(err);
  	res.render('grafik', {title: 'Grafik loży NF', days: result.days, summary: result.summary, fullSummary: result.fullSummary, date_from: moment(startDate).format('D MMMM YYYY'), date_to: moment(endDate).format('D MMMM YYYY'), last_updated: moment(result.last_updated).format('LLL'), history: hist, max_hist: process.env.MONTHS, secret: secret});
  });
});

module.exports = router;
