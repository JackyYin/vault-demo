const mongo = require('nodejs-utils').DB.mongoDBConstructor
const vault = require('node-vault')({ token: 'myroot' })
const os = require('os')

let mongoClient = null
let timer = null
let curLeaseId = null

const periodicQuery = (collection, name) => {
  return mongoClient.connect().then(DBI => {
    timer = setInterval(() => {
      return mongoClient.find(collection, {name}, DBI).then(resp => {
        console.log('query result: ', resp)
      }).catch(err => {
        console.error('failed to query mongoDB')
      })
    }, 1000)

    return Promise.resolve()
  })
}

const getCred = () => {
  return vault.read('database/creds/my-role').then(cred => {
    console.log(cred)
    curLeaseId = cred.lease_id
    return Promise.resolve(cred.data)
  })
}

const genNewMongoClient = (db) => {
  return getCred().then(loginInfo => {
    const options = {
      ...loginInfo,
      db
    }

    mongoClient = mongo(options)
    return Promise.resolve()
  })
}

const autoRefresh = () => {
  setInterval(async () => {
    if (timer) {
        clearInterval(timer)
    }
    await genNewMongoClient('test') // update a new mongoDB client
    await periodicQuery('users', '7FrogTW')
  }, 3000)
}

const noRefresh = async () => {
  await genNewMongoClient('test')
  await periodicQuery('users', '7FrogTW')
}

const handler = (signal) => {
  console.log(`received ${signal}`)
  return vault.revoke({lease_id: curLeaseId}).then(_ => {
    console.log('the current lease has been revoked...')
    process.exit(0)
  })
}

Object.keys(os.constants.signals)
.filter(signal => signal !== 'SIGKILL' && signal !== 'SIGSTOP')
.forEach(signal => {
  process.on(signal, handler)
})

switch (Array.isArray(process.argv) ? process.argv[2] : '') {
  case 'auto': {
    return autoRefresh()
  }
  default: {
    return noRefresh()
  }
}
