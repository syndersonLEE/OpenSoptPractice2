var express = require('express')
var router = express.Router()

router.use('/training', require('./api/training/index'))
router.use('/homework', require('./api/homework/index'))

// /* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

module.exports = router