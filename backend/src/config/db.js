const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [{ emit: 'event', level: 'error' }],
});

if (env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}
prisma.$on('error', (e) => logger.error(`Prisma error: ${e.message}`));
prisma.$on('warn', (e) => logger.warn(`Prisma warn: ${e.message}`));

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL database connected successfully via Prisma');
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
