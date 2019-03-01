const winston = require('winston')
const logger = winston.createLogger({
  level: process.env.NODE_ENV != 'production' ? 'debug' : 'info',
  transports: [
    new winston.transports.Console(),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  )
})

module.exports = logger
