const express = require('express')
const router = express.Router()

const csv = require('csvtojson')
const json2csv = require('json2csv')
const fs = require('fs')

const crypto = require('crypto-promise')

const responseMessage = require('../../../modules/utils/responseMessage')
const secret = require('../../../modules/utils/secret')

const csvFilePath = './public/csv/my_info.csv'

/* GET home page. */
router.get('/', (req, res) => {
    //localhost:3000/training/info/?name="김현진"&age=23
    console.log(`get method with ${JSON.stringify(req.query)}`)

    const name = req.query.name
    const age = req.query.age

    readCSV().then(jsonResult => {
        let myInfo = null
        for (const idx in jsonResult) {
            const jsonData = jsonResult[idx]
            if (jsonData.name == name) {
                myInfo = jsonData
                break
            }
        }
        if(myInfo != null)
            return decryption(myInfo)
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=UTF-8'
        })
        res.write(responseMessage.NO_USER)
        res.end()
    }).then(jsonData => {
        if(jsonData == undefined) return
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=UTF-8'
        })
        res.write(JSON.stringify(jsonData))
        res.end()
    })
})

//localhost:3000/training/info
//body = {
// 	"name":"윤희성2",
// 	"age": 25,
// 	"phone":"010-2081-3818",
// 	"colleage":"중앙대학교",
// 	"major":"전자전기공학부",
// 	"email":"heesung6701@naver.com"
// }
router.post('/', (req, res) => {

    console.log(`post method with ${JSON.stringify(req.body)}`)
    encryption(req.body).then(json => {
        readCSV().then(jsonResult => {
            console.log(jsonResult)
            const jsonArray = jsonResult

            let isContains = false
            for (const idx in jsonArray) {
                const jsonData = jsonArray[idx]
                if (jsonData.name == json.name) {
                    for (const field in jsonData) {
                        jsonData[field] = json[field]
                    }
                    isContains = true
                    break;
                }
            }
            if (!isContains) jsonArray.push(json)
            writeCSV(csvFilePath, res, jsonArray, () => {
                console.log("success")
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=UTF-8'
                })
                res.write(JSON.stringify(json))
                res.end()
            }, (err) => {
                console.log("fail")
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=UTF-8'
                })
                res.write(responseMessage.CREATED_USER_FAIL)
                res.end()
            })
        })
    })
})

async function readCSV() {
    const jsonResult = await readCsvFunction(csvFilePath)
    if (jsonResult == 'false') {
        console.log(`error with readCSV with ${csvFilePath}`)
        return
    }
    return jsonResult
}

const readCsvFunction = (csvFilePath) => new Promise((resolve, reject) => {
    csv().write
    csv().fromFile(csvFilePath).then((jsonArr) => {
        console.log(`read success with ${JSON.stringify(jsonArr)}`)
        resolve(jsonArr)
    })
})

const writeCSV = (path, res, json, success, fail) => {
    const fields = []
    for (key in json[0]) {
        fields.push(key)
    }
    const opts = {
        fields
    }
    const parser = new json2csv.Parser(opts)
    const resultCsv = parser.parse(json)

    fs.writeFile(path, resultCsv, (err) => {
        if (err) {
            responseError(res, 'csv 저장', err)
            fail(err)
            return
        }
        success()
    })
}

async function encryption(json) {
    const data = json.age
    console.log(`data: ${data}`)
    const salt = await crypto.randomBytes(32)
    const saltStr = salt.toString('base64')
    console.log(`salt: ${saltStr}`)

    const cipher = await crypto.cipher('aes256', secret.SECRET_KEY_AGE)(`${data}+${salt}`)
    const cipherStr = cipher.toString('hex')
    console.log(`cipherStr : ${cipherStr}`)
    json.age = cipherStr
    return json
}

async function decryption(json) {
    const data = json.age
    const decipher = await crypto.decipher('aes256', secret.SECRET_KEY_AGE)(data, 'hex')
    const str = decipher.toString()
    const age = str.split('+', 2)[0]
    console.log(`age : ${age}`)
    json.age = age
    return json
}

module.exports = router