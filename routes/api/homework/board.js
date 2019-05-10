const express = require('express')
const router = express.Router()

const responseMessage = require('../../../modules/utils/responseMessage')
const UTILS = require('../../../modules/utils/utils')
const CODE = require('../../../modules/utils/statusCode')
const csvManager = require('../../../modules/utils/csvManager')
const encryptionManager = require('../../../modules/utils/encryptionManager')

const async = require('async')
const crypto = require('crypto-promise')
const csv = require('csvtojson')
const json2csv = require('json2csv')
const fs = require('fs')

const fileName = 'board_db.csv'

/**
 * METHOD       : GET
 * UTL          : /homework/board/:id
 * PARAMETER    : id = 게시글 고유 id
 */
router.get('/:id', (req, res) => {
    const id = req.params.id
    console.log(`get method with id : ${id}`)
    if (id == undefined) {
        res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, responseMessage.OUT_OF_VALUE))
        return
    }
    csvManager.csvRead(fileName).then(jsonArr => {
        jsonData = selectById(jsonArr, id)
        if (jsonData == false) {
            res.status(200).send(UTILS.successFalse(CODE.NOT_FOUND, responseMessage.NO_BOARD))
            return
        }
        res.status(200).send(UTILS.successTrue(CODE.OK, jsonData))
    })
})

/**
 * METHOD       : PUT
 * UTL          : /homework/board/
 * PARAMETER    : (id = 게시물 고유 id), 
 *                  title = 게시물 제목, 
 *                  content = 게시물 내용, 
 *                  password = 게시물 비밀 번호,
 */
router.put('/', (req, res) => {
    console.log(`put method with ${JSON.stringify(req.body)}`)

    const inputId = req.body.id
    const inputTitle = req.body.title
    const inputContent = req.body.content
    const inputPwd = req.body.password

    if (inputId == undefined ||
        inputTitle == undefined ||
        inputContent == undefined ||
        inputPwd == undefined) {
        res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, responseMessage.OUT_OF_VALUE))
        return
    }

    putBoard(inputId, inputTitle, inputContent, inputPwd).then((tf) => {
        res.status(200).send(UTILS.successTrue(CODE.OK, responseMessage.UPDATED_BOARD))
    }).catch((err) => {
        console.log(err)
        if (err.toString().length > 0)
            res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, err.toString()))
        else {
            res.status(200).send(UTILS.successFalse(CODE.INTERNAL_SERVER_ERROR, err.toString()))
        }
    })
})

async function putBoard(inputId, inputTitle, inputContent, inputPwd) {
    const jsonArr = await csvManager.csvRead(fileName)

    const jsonData = selectById(jsonArr, inputId)
    if (jsonData == false) {
        throw new Error(responseMessage.NO_BOARD)
    }
    const hashedPwd = await encryptionManager.encryption(inputPwd, jsonData.salt)

    if (jsonData.password != hashedPwd) {
        throw new Error(responseMessage.MISS_MATCH_PW)
    }

    jsonData.title = inputTitle
    jsonData.content = inputContent

    const tf = await csvManager.csvWrite(fileName, jsonArr)

    if (!tf) {
        throw new Error('')
    }
    return true
}

/**
 * METHOD       : DELETE
 * UTL          : /homework/board/
 * PARAMETER    : (id = 게시물 고유 id), 
 *                  password = 게시물 비밀 번호,
 */
router.delete('/', (req, res) => {
    console.log(`put method with ${JSON.stringify(req.body)}`)

    const inputId = req.body.id
    const inputPwd = req.body.password
    if (inputId == undefined || inputPwd == undefined) {
        res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, responseMessage.OUT_OF_VALUE))
        return
    }

    deleteBoard(inputId, inputPwd).then((tf) => {
        if (tf == false) {
            console.log('tf is false')
            res.status(200).send(UTILS.successFalse(CODE.INTERNAL_SERVER_ERROR, REMOVED_BOARD_FAIL))
        }
        res.status(200).send(UTILS.successTrue(CODE.OK, responseMessage.REMOVED_BOARD))
    }).catch((err) => {
        console.log(err)
        if (err.toString().length > 0)
            res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, err.toString()))
        else {
            res.status(200).send(UTILS.successFalse(CODE.INTERNAL_SERVER_ERROR, REMOVED_BOARD_FAIL))
        }
    })
})

async function deleteBoard(id, pwd) {
    const jsonArr = await csvManager.csvRead(fileName)

    const jsonData = selectById(jsonArr, id)
    console.log(jsonData)
    if (jsonData == false) {
        throw new Error(responseMessage.NO_BOARD)
    }
    const hashedPwd = await encryptionManager.encryption(pwd, jsonData.salt)

    if (jsonData.password != hashedPwd) {
        throw new Error(responseMessage.MISS_MATCH_PW)
    }

    const state = remove(jsonArr, id)
    if (state != responseMessage.REMOVED_BOARD) {
        throw new Error(state)
    }

    const tf = await csvManager.csvWrite(fileName, jsonArr)

    if (!tf) {
        throw new Error('')
    }
    return true
}
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
    console.log(`post method with ${JSON.stringify(req.body)}`)

    const inputTitle = req.body.title
    const inputContent = req.body.content
    const inputPwd = req.body.password

    if (inputTitle == undefined ||
        inputContent == undefined ||
        inputPwd == undefined) {
        res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, responseMessage.OUT_OF_VALUE))
        return
    }

    const jsonInput = {
        title: inputTitle,
        content: inputContent,
        password: inputPwd
    }

    async.parallel([
        // [task 1]  bring the database from csv file
        function (callback) {
            csvManager.csvRead(fileName).then((jsonResult) => {
                callback(null, jsonResult)
            })
        },
        // [task 2] encryption password
        function (callback) {
            const makeEncryption = async () => {
                const salt = await encryptionManager.makeRandomByte()
                const hashedPwd = await encryptionManager.encryption(jsonInput.password, salt)
                const jsonData = {
                    title: jsonInput.title,
                    content: jsonInput.content,
                    password: hashedPwd,
                    salt: salt,
                    date: new Date()
                }
                callback(null, jsonData)
            }
            makeEncryption()
        }
    ], (err, results) => {
        if (err) {
            res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, err.toString()))
            return
        }

        const jsonArr = results[0]

        //check the title is valid
        if (checkDuplicateTitle(jsonArr, inputTitle)) {
            res.status(200).send(UTILS.successFalse(CODE.BAD_REQUEST, responseMessage.ALREADY_BOARD))
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
        csvManager.csvWrite(fileName, jsonArr).then(tf => {
            if (!tf) {
                console.log('tf : false')
                return
            }
            res.status(200).send(UTILS.successTrue(CODE.OK, responseMessage.CREATED_BOARD))
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

function remove(jsonArr, inputId) {
    let removeIdx = -1
    for (const idx in jsonArr) {
        if (jsonArr[idx].id == inputId) {
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

function checkDuplicateTitle(jsonArr, inputTitle) {
    let isContains = false
    for (const idx in jsonArr) {
        const jsonData = jsonArr[idx]
        if (jsonData.title == inputTitle) {
            isContains = true
            break
        }
    }
    return isContains
}

module.exports = router