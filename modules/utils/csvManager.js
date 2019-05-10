const fs = require('fs')
const json2csv = require('json2csv')
const csv = require('csvtojson')
const MSG = require('../utils/responseMessage')

const csv_url = './public/csv/'

const csvManager = {
    csvWrite: (fileName, jsonArray) => {
        return new Promise((resolve, reject) => {
            console.log(JSON.stringify(jsonArray))

            let resultCsv = ''
            if (jsonArray.length > 0) {
                resultCsv = json2csv.parse(jsonArray)
            }
            console.log(resultCsv)

            fs.writeFile(`${csv_url}${fileName}`, resultCsv, (err) => {
                if (err) {
                    console.log(`file save(${csv_url}${fileName}) err: ${err}`)
                    reject(MSG.FAIL_CSV_WRITE)
                    return
                }
                console.log(`All of complete(${csv_url}${fileName})`)
                resolve(true)
            })
        })
    },
    csvRead: (fileName) => {
        return new Promise((resolve, reject) => {
            try {
                if (fs.existsSync(`${csv_url}${fileName}`) == false) {
                    throw Error(MSG.FAIL_CSV_READ)
                }
            } catch (err) {
                console.log(`file(${csv_url}${fileName}) not exist`)
                resolve(Array())
                return
            }

            csv().fromFile(`${csv_url}${fileName}`).then((jsonArr) => {
                if (!jsonArr) {
                    console.log(`file read(${csv_url}${fileName}) err: ${err}`)
                    reject(MSG.FAIL_CSV_READ)
                    return
                }
                for (const idx in jsonArr) {
                    if (!jsonArr[idx].write_date) continue
                    jsonArr[idx].write_date = jsonArr[idx].write_date
                }
                console.log(`All of complete(${csv_url}${fileName})!`)
                resolve(jsonArr)
            }, (err) => {
                console.log(`err with readCSV: ${err}`)
                reject(MSG.FAIL_CSV_READ)
            })
        })
    },
    csvReadSingle: (fileName, idx) => {
        return new Promise(async (resolve, reject) => {
            const jsonArr = await csvManager.csvRead(fileName)

            let jsonData = null
            for (const i in jsonArr) {
                if (jsonArr[i].idx == idx) {
                    jsonData = jsonArr[i]
                    break
                }
            }
            if (jsonData == null) {
                reject(MSG.NO_INDEX)
                return
            }
            resolve(jsonData)
        })
    },
    csvAdd: async (fileName, jsonData) => {
        const jsonArr = await csvManager.csvRead(fileName)
        let prevIdx = 0
        if (jsonArr.length > 0)
            prevIdx = parseInt(jsonArr[jsonArr.length - 1].idx)
        console.log(`prevId : ${prevIdx}`)
        jsonData.idx = parseInt(prevIdx + 1)
        jsonArr.push(jsonData)
        return csvManager.csvWrite(fileName, jsonArr)
    },
    CSV_USER: "user.csv",
    CSV_DIARY: "diary.csv",
    CSV_CONSULT: "consult.csv",
    CSV_COUNSELOR: "counselor.csv",
}

module.exports = csvManager