var express = require('express');
var router = express.Router();
var http = require('http');
var requests = require('../modules/requests');
var core = require('../modules/core');
var db = require('../modules/db');
var Story = require('../modules/Story');
var moment = require('moment');
var log = (process.env.ENV === 'development');
moment.locale('pl');

router.get('/komentarze/:history?', function(req, res, next){
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
  core.completeRun(startDate, endDate, function(err,result){
    if(err) return next(err);
  	res.render('grafik', {title: 'Grafik loży NF', days: result.days, summary: result.summary, date_from: moment(startDate).format('D MMMM YYYY'), date_to: moment(endDate).format('D MMMM YYYY'), last_updated: moment(result.last_updated).format('LLL'), history: hist, max_hist: process.env.MONTHS});
  });
});

module.exports = router;
