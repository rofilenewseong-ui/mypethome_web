import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initCronJobs } from './utils/cronJobs';

// Initialize Firebase (side effect import)
import './config/firebase';

async function main() {
  try {
    logger.info('Firebase Firestore initialized');

    // Initialize cron jobs
    initCronJobs();

    // Start server
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`
==============================================

   PetHolo Backend Server

   Port:        ${env.PORT}
   Environment: ${env.NODE_ENV}
   Database:    Firebase Firestore
   Cron Jobs:   Active

   API:  http://localhost:${env.PORT}/api/health

==============================================
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

main();
