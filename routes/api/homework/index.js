var express = require('express')
var router = express.Router()
var boardRouter = require('./board')

router.use('/board', boardRouter)

module.exports = router