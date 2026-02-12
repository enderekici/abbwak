import pino from 'pino';

const level = process.env.STEER_LOG_LEVEL ?? 'info';
const isMcpStdio = process.argv.includes('--mcp');
const isDev = process.env.NODE_ENV !== 'production' && !isMcpStdio;

// In MCP stdio mode, always write JSON to stderr (pino-pretty's worker thread
// ignores destination:2 and leaks logs to stdout, corrupting the JSON-RPC transport).
// In dev mode (REST API), use pino-pretty for human-readable output.
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
