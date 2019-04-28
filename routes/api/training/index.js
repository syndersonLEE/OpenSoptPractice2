var express = require('express');
var router = express.Router();

var infoRouter = require('./info');

router.use('/info', infoRouter);

module.exports = router;