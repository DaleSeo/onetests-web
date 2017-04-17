import { fireGet, firePush, fireRemove } from '../../src/services/fireUtils'
import callApi from './callApi'
import diff from './diff'

import db from './database'

export default class TestService {

  createSuite (suite) {
    suite.date = new Date().getTime()
    firePush('suites', suite)
      .then(this.readSpecsAndHosts)
      .then(this.pushTests)
  }

  removeSuite (suite) {
    fireGet('tests', 'suiteKey', suite['.key'])
      .then(tests => {
        Object.keys(tests).forEach(key => {
          fireRemove('tests/' + key)
        })
        fireRemove('suites/' + suite['.key'])
      })
      .catch(err => {
        console.error(err)
        fireRemove('suites/' + suite['.key'])
      })
  }

  callSuite (suiteKey) {
    db.ref('tests')
      .orderByChild('suiteKey')
      .equalTo(suiteKey)
      .once('value')
      .then(tests => {
        tests.forEach(test => {
          callApi(test.val().reqA)
            .then(res => db.ref('tests').child(test.key).child('resA').set(res))
            .catch(err => db.ref('tests').child(test.key).child('errA').set(err))
          callApi(test.val().reqB)
            .then(res => db.ref('tests').child(test.key).child('resB').set(res))
            .catch(err => db.ref('tests').child(test.key).child('errB').set(err))
        })
      })
  }

  diffSuite (suiteKey) {
    db.ref('tests')
      .orderByChild('suiteKey')
      .equalTo(suiteKey)
      .once('value')
      .then(tests => {
        tests.forEach(test => {
          let result = {
            status: diff(test.val().resA.statusCode, test.val().resB.statusCode),
            headers: diff(test.val().resA.headers, test.val().resB.headers),
            body: diff(test.val().resA.body, test.val().resB.body)
          }
          db.ref('tests').child(test.key).child('result').set(result)
        })
      })
  }

  readSpecsAndHosts (suiteKey) {
    return new Promise((resolve, reject) => {
      fireGet('suites/' + suiteKey)
        .then(suite => {
          fireGet('apis/' + suite.apiKey)
          .then(api => {
            resolve({specs: api.specs, hostA: suite.hostA, hostB: suite.hostB, suiteKey: suiteKey})
          })
        })
    })
  }

  pushTests (data) {
    let specs = data.specs
    let hostA = data.hostA
    let hostB = data.hostB
    let suiteKey = data.suiteKey

    Object.values(specs)
      .filter(spec => !spec.skip)
      .forEach(spec => {
        let reqA = {
          method: spec.method,
          url: hostA + spec.url,
          body: spec.body
        }
        let reqB = {
          method: spec.method,
          url: hostB + spec.url,
          body: spec.body
        }
        let test = {
          suiteKey: suiteKey,
          reqA,
          reqB
        }
        firePush('tests', test)
      })
  }
}
