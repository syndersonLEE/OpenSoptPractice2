const express = require('express')
const router = express.Router()

const responseMessage = require('../../../modules/utils/responseMessage')

const url = require('url')
const async = require('async')
const crypto = require('crypto-promise')
const csv = require('csvtojson')
const json2csv = require('json2csv')
const fs = require('fs')

const csvFilePath = './public/csv/board_db.csv'

/**
 * METHOD       : GET
 * UTL          : /homework/board/:id
 * PARAMETER    : id = 게시글 고유 id
 */
router.get('/:id', (req, res) => {
    const id = req.params.id
    console.log(`get method with id : ${id}`)
    readCSV().then(jsonArr => {
        jsonData = selectById(jsonArr, id)
        if (jsonData == false) {
            writeRes(res, responseMessage.NO_BOARD)
            return
        }
        writeRes(res, JSON.stringify(jsonData))
    })
})

/**
 * METHOD       : PUT
 * UTL          : /homework/board/
 * PARAMETER    : (id = 게시물 고유 id), 
 *                  title = 게시물 제목, 
 *                  content = 게시물 내용, 
 *                  (write_time = 게시물 작성 시간),
 *                  password = 게시물 비밀 번호,
 *                  (salt = salt)
 */
router.put('/', (req, res) => {
    const json = req.body
    console.log(`put method with ${JSON.stringify(json)}`)

    async.waterfall([
        // [task 1]  bring the database from csv file
        function (callback) {
            readCSV().then(jsonResult => callback(null, jsonResult))
        },
        // [task 2] encryption password
        function (jsonArr, callback) {
            json.salt = selectById(jsonArr, json.id).salt
            encryption(json).then(jsonResult => callback(null, jsonArr, jsonResult))
        }
    ], (err, jsonArr, jsonData) => {
        if (err) { throw error('err') }

        const state = update(jsonArr, jsonData)
        console.log(state)
        if (state != responseMessage.UPDATED_BOARD) {
            writeRes(res, state)
            return
        }

        writeCSV(csvFilePath, jsonArr).then(tf => {
            if (!tf) {
                console.log('tf : false')
                return
            }
            writeRes(res, responseMessage.UPDATED_BOARD)
        })
    })
})


/**
 * METHOD       : DELETE
 * UTL          : /homework/board/
 * PARAMETER    : (id = 게시물 고유 id), 
 *                  title = 게시물 제목, 
 *                  content = 게시물 내용, 
 *                  (write_time = 게시물 작성 시간),
 *                  password = 게시물 비밀 번호,
 *                  (salt = salt)
 */
router.delete('/', (req, res) => {
    const json = req.body
    console.log(`put method with ${JSON.stringify(json)}`)

    async.waterfall([
        // [task 1]  bring the database from csv file
        function (callback) {
            readCSV().then(jsonResult => callback(null, jsonResult))
        },
        // [task 2] encryption password
        function (jsonArr, callback) {
            json.salt = selectById(jsonArr, json.id).salt
            encryption(json).then(jsonResult => callback(null, jsonArr, jsonResult))
        }
    ], (err, jsonArr, jsonData) => {
        if (err) { throw error('err') }
        
        const state = remove(jsonArr, jsonData)
        console.log(state)
        if (state != responseMessage.REMOVED_BOARD) {
            writeRes(res, state)
            return
        }

        writeCSV(csvFilePath, jsonArr).then(tf => {
            if (!tf) {
                console.log('tf : false')
                return
            }
            writeRes(res, responseMessage.REMOVED_BOARD)
        })
    })
})

/**
 * METHOD       : POST
 * UTL          : /homework/board
 * PARAMETER    : (id = 게시물 고유 id), 
 *                  title = 게시물 제목, 
 *                  content = 게시물 내용, 
 *                  (write_time = 게시물 작성 시간),
 *                  password = 게시물 비밀 번호,
 *                  (salt = salt)
 */
router.post('/', (req, res) => {
    const json = req.body
    console.log(`post method with ${JSON.stringify(json)}`)

    async.parallel([
        // [task 1]  bring the database from csv file
        function (callback) {
            readCSV().then(jsonResult => callback(null, jsonResult))
        },
        // [task 2] encryption password
        function (callback) {
            encryption(json).then(json => callback(null, json))
        }
    ], (err, results) => {
        if (err) {
            throw error('err')
        }

        const jsonArr = results[0]

        //check the title is valid
        if (checkDuplicate(jsonArr, json)) {
            writeRes(res, responseMessage.ALREADY_BOARD)
            return
        }

        console.log(results)
        jsonData = results[1]

        let prevId = 0
        if (jsonArr.length > 0)
            prevId = parseInt(jsonArr[jsonArr.length - 1].id)
        jsonData.id = (prevId + 1).toString()
        jsonArr.push(jsonData)

        //step 3. insert
        writeCSV(csvFilePath, jsonArr).then(tf => {
            if (!tf) {
                console.log('tf : false')
                return
            }
            writeRes(res, responseMessage.CREATED_BOARD)
            return
        })
    })
})

function selectById(jsonArr, id) {
    for (const idx in jsonArr) {
        const jsonData = jsonArr[idx]
        if (jsonData.id == id) {
            return jsonData
        }
    }
    return false
}

function update(jsonArr, json) {
    for (const idx in jsonArr) {
        if (jsonArr[idx].id == json.id) {
            if(jsonArr[idx].password != json.password){
                return responseMessage.MISS_MATCH_PW
            }
            jsonArr[idx] = json
            return responseMessage.UPDATED_BOARD
        }
    }
    return responseMessage.NO_BOARD
}

function remove(jsonArr, json) {
    let removeIdx = -1
    for (const idx in jsonArr) {
        if (jsonArr[idx].id == json.id) {
            if(jsonArr[idx].password != json.password){
                return responseMessage.MISS_MATCH_PW
            }
            removeIdx = idx
            break
        }
    }
    if (removeIdx == -1) {
        return responseMessage.NO_BOARD
    }
    jsonArr.splice(removeIdx, 1)
    return responseMessage.REMOVED_BOARD
}

function checkDuplicate(jsonArr, newData) {
    let isContains = false
    for (const idx in jsonArr) {
        const jsonData = jsonArr[idx]
        if (jsonData.title == newData.title) {
            isContains = true
            break
        }
    }
    return isContains
}

async function readCSV() {
    const jsonArr = await readCsvFunction(csvFilePath)
    return jsonArr
}

const readCsvFunction = (csvFilePath) => new Promise((resolve, reject) => {
    csv().fromFile(csvFilePath).then((jsonArr) => {
        console.log(`read success`)
        resolve(jsonArr)
    })
})

async function writeCSV(path, json) {
    const fields = []
    for (key in json[0]) {
        fields.push(key)
    }
    const opts = {
        fields
    }
    const parser = new json2csv.Parser(opts)
    const resultCsv = parser.parse(json)

    return new Promise(function (resolve, reject) {
        fs.writeFile(path, resultCsv, (err) => {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        })
    })
}

async function encryption(json) {
    const data = json.password
    console.log(`data: ${data}`)
    
    if(json.salt == undefined)
        json.salt = (await crypto.randomBytes(32)).toString('base64')
    console.log(`salt: ${json.salt}`)

    let hashed = data
    for (let i = 0; i < 1000; i++) {
        hashed = await crypto.hmac('SHA512', json.salt)(hashed)
    }
    console.log(`hashed: ${hashed.toString('base64')}`)
    json.password = hashed.toString('base64')

    console.log(`result : ${JSON.stringify(json)}}`)
    return json
}

function writeRes(res, msg) {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=UTF-8'
    })
    res.write(msg)
    res.end()
}

module.exports = router