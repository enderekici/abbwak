import pino from 'pino';

const level = process.env.STEER_LOG_LEVEL ?? 'info';
const isDev = process.env.NODE_ENV !== 'production';

// Write logs to stderr so they don't interfere with MCP stdio transport on stdout
export const logger = pino(
  {
    level,
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          destination: 2,
        },
      },
    }),
  },
  isDev ? undefined : pino.destination(2),
);
