import winston from 'winston'

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
  level: process.env.LOG_LEVEL ?? 'info',
  levels: winston.config.syslog.levels,
})

export default logger
