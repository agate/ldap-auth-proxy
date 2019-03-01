const LDAP = require('ldapjs')
const Mustache = require('mustache')

const LDAP_URI = process.env.LDAP_URI
const LDAP_BASE_USER = process.env.LDAP_BASE_USER
const LDAP_BASE_GROUP = process.env.LDAP_BASE_GROUP
const LDAP_FILTER_USER = process.env.LDAP_FILTER_USER
const LDAP_FILTER_GROUP = process.env.LDAP_FILTER_GROUP

const client = LDAP.createClient({ url: LDAP_URI })

const auth = (username, password) => {
  return new Promise((resolve, reject) => {
    client.search(LDAP_BASE_USER, {
      scope: 'sub',
      filter: Mustache.render(LDAP_FILTER_USER, {
        username: username,
        password: password,
      }),
    }, function ldapSearchCallback(err, res) {
      if (err) {
        resolve(false)
      } else {
        let found = false

        res.on('searchEntry', function ldapOnSearchEntryCallback(entry) {
          found = true
          client.bind(entry.object.dn, password, function ldapBindCallback(err, res) {
            if (err) {
              resolve(false)
            } else {
              const userObject = {
                username: entry.object.uid,
                firstname: entry.object.givenName,
                lastname: entry.object.sn,
                name: entry.object.cn,
                email: entry.object.mail,
                description: entry.object.description,
                uidNumber: entry.object.uidNumber
              }

              resolve(userObject)
            }
          })
        })

        res.on('end', function ldapOnEndCallback(result) {
          if (!found) resolve(false)
        })
      }
    })
  })
}

const userInGroup = (username, groupname) => {
  return new Promise((resolve, reject) => {
    if (!groupname) return resolve(true)

    client.search(LDAP_BASE_GROUP, {
      scope: 'sub',
      filter: Mustache.render(LDAP_FILTER_GROUP, {
        username: username,
        groupname: groupname,
      }),
    }, function ldapSearchCallback(err, res) {
      if (err) {
        resolve(false)
      } else {
        res.on('searchEntry', function ldapOnSearchEntryCallback(entry) {
          resolve(true)
        })

        res.on('end', function ldapOnEndCallback(result) {
          resolve(false)
        })
      }
    })
  })
}

module.exports = {
  auth: auth,
  userInGroup: userInGroup,
}
