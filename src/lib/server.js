const express = require('express'),
      session = require('express-session'),
      bodyParser = require('body-parser'),
      ldap = require('./ldap'),
      logger = require('./logger')


const GROUP = process.env.GROUP

const app = express()
app.set('view engine', 'pug')
app.set('views','./src/views')

app.use(express.static('./src/public'))

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}))

app.use((req, res, next) => {
  if (!req.session.uid) {
  // if (false) {
    if (req.path != '/ldap-auth-proxy/login') {
      req.session.back = req.originalUrl
      res.redirect('/ldap-auth-proxy/login')
    } else {
      if (req.method == 'GET') {
        res.render('login')
      } else {
        bodyParser.urlencoded({ extended: false })(req, res, () => {
          let username = req.body.username
          let password = req.body.password

          ldap.auth(username, password).then(function ldapFoundUserCallback(user) {
            if (user) { ldap.userInGroup(username, GROUP).then(function ldapUserInGroupCallback(inGroup) { if (inGroup) {
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
        })
      }
    }
  } else if (req.path == '/ldap-auth-proxy/logout') {
    logger.info({
      user: req.session.uid,
      message: "USER LOGGED OUT"
    })
    req.session.uid = null
    res.redirect('/')
  } else if (req.session.back) {
    const back = req.session.back
    req.session.back = null
    res.redirect(back)
  } else if (req.path.match(/^\/ldap-auth-proxy/)) {
    res.redirect('/')
  } else {
    logger.debug({
      user: req.session.uid,
      method: req.method,
      originalUrl: req.originalUrl,
    })
    next()
  }
})

const httpProxy = require('http-proxy')
const proxy = httpProxy.createProxyServer()
const BACKEND = process.env.BACKEND

app.use((req, res, next) => {
  proxy.web(req, res, { target: BACKEND })
})

const port = process.env.PORT || 3000
app.listen(port)
logger.info({
  message: `server started at http://0.0.0.0:${port}`
})
