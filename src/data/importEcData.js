import json from './ec.json'
import db from '../services/database'

let specRef = db.ref('apis/-KhQ6MTyGDA-W1CaALev/specs')

specRef.remove()
  .then(_ => Promise.all(
    json.apis.map(api => {
      return specRef.push({
        method: api.method,
        url: api.path,
        body: api.body || {},
        skip: api.skip,
        text: JSON.stringify(api.body, null, 2) || '',
        title: api.description || '',
        exclusion: api.ignoreKeys || []
      })
    })
  ))
  .then(vals => vals.map(val => val.key))
  .then(keys => {
    console.log(keys)
    db.goOffline()
  })
  .catch(err => {
    console.error(err)
    db.goOffline()
  })