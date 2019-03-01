const express = require('express'),
      session = require('express-session'),
      bodyParser = require('body-parser'),
      proxy = require('express-http-proxy'),
      request = require('request'),
      _ = require('lodash'),
      ldap = require('./ldap'),
      logger = require('./logger')


const GROUP = process.env.GROUP

const app = express()
app.set('view engine', 'pug')
app.set('views','./src/views')

app.use(express.static('./src/public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}))

app.use((req, res, next) => {
  if (!req.session.uid) {
    if (req.method == 'GET') {
      res.render('login')
    } else {
      let username = req.body.username
      let password = req.body.password

      ldap.auth(username, password).then(function ldapFoundUserCallback(user) {
        if (user) {
          ldap.userInGroup(username, GROUP).then(function ldapUserInGroupCallback(inGroup) {
            if (inGroup) {
              req.session.uid = username
              res.redirect(req.path)
              logger.info({
                user: req.session.uid,
                message: "USER LOGGED IN"
              })
            } else {
              res.render('login', {
                error: 'No Permission'
              })
            }
          }).catch(function ldapUserNotInGroupCallback(e) {
            res.render('login', {
              error: 'No Permission'
            })
          })

        } else {
          res.render('login', {
            error: 'Username or Password is incorrect'
          })
        }
      }).catch(function ldapNotFoundUserCallback(e) {
        logger.error({
          message: e.message
        })
      })
    }
  } else {
    logger.debug({
      user: req.session.uid,
      method: req.method,
      path: req.path,
      body: req.body,
      params: req.params,
      query: req.query,
    })
    next()
  }
})

app.use((req, res, next) => {
  let backend = process.env.BACKEND

  if (req.path == '/logout') {
    logger.info({
      user: req.session.uid,
      message: "USER LOGGED OUT"
    })
    req.session.uid = null
    res.redirect('/')
    return
  }

  let opts = {
    url: backend + req.originalUrl,
    headers: _.clone(req.headers),
    method: req.method,
    body: req.method == 'GET' ? undefined : JSON.stringify(req.body),
    followRedirect: false,
    encoding: null,
  }

  delete(opts.headers.host)

  request(opts).pipe(res)
})

const port = process.env.PORT || 3000
app.listen(port)
logger.info({
  message: `server started at http://0.0.0.0:${port}`
})
