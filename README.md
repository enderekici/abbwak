# abbwak

**API-Based Browser Without API Key** — A free, open-source headless browser tool designed for AI agents.

No API keys. No paid services. Just a powerful, self-hosted browser that agents can control.

## Why abbwak?

Existing browser tools for agents (Browserbase, Steel Cloud, Bright Data) charge per session or require API keys. Playwright MCP dumps 26+ tools and full accessibility trees, burning agent context windows. `abbwak` gives you:

- **5 clean primitives** — `navigate`, `act`, `extract`, `observe`, `screenshot`
- **93% context reduction** — Snapshot+Refs filters accessibility trees to only interactive/meaningful elements
- **Two interfaces** — REST API for any language, MCP server for Claude Desktop/Cursor
- **Zero cost** — runs entirely on your own machine

## Quick Start

```bash
# Install
npm install
npx playwright install chromium

# Run the REST API server
npm run dev

# Or run the MCP server (stdio, for Claude Desktop)
npx tsx src/mcp/server.ts
```

## Use with Claude Desktop / Claude Code

Add this to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "abbwak": {
      "command": "npx",
      "args": ["tsx", "/path/to/abbwak/src/mcp/server.ts"]
    }
  }
}
```

For Claude Code, add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "abbwak": {
      "command": "npx",
      "args": ["tsx", "/path/to/abbwak/src/mcp/server.ts"]
    }
  }
}
```

Then Claude can use these 5 tools:

| Tool | Description |
|------|-------------|
| `browser_navigate` | Go to a URL, returns page snapshot |
| `browser_act` | Click, type, select, or scroll using ref IDs |
| `browser_extract` | Get page content as text, markdown, or structured JSON |
| `browser_observe` | Get accessibility snapshot with interactive element refs |
| `browser_screenshot` | Capture page as PNG |

### Example Claude interaction

```
User: "Search for the latest Claude API docs"

Claude uses: browser_navigate({ url: "https://google.com" })
  Returns snapshot with search box as r3

Claude uses: browser_act({ action: "type", ref: "r3", value: "Claude API documentation" })
Claude uses: browser_act({ action: "click", ref: "r5" })  // Search button
Claude uses: browser_extract({ mode: "markdown" })
  Returns search results as clean markdown
```

## REST API

Start the server:

```bash
npm run dev    # Development with hot reload
npm run build && npm start  # Production
```

### Endpoints

#### Sessions

```bash
# Create a session
curl -X POST http://localhost:3000/sessions
# { "id": "abc123", "url": "about:blank", "createdAt": "..." }

# List sessions
curl http://localhost:3000/sessions
# { "sessions": [{ "id": "abc123", ... }] }

# Delete a session
curl -X DELETE http://localhost:3000/sessions/abc123
```

#### Navigate

```bash
curl -X POST http://localhost:3000/sessions/abc123/navigate \
  -H 'Content-Type: application/json' \
  -d '{ "url": "https://example.com" }'
# { "url": "...", "title": "...", "snapshot": { "refs": [...] } }
```

#### Act (click, type, select, scroll)

```bash
# Click by ref ID (from a previous observe/navigate response)
curl -X POST http://localhost:3000/sessions/abc123/act \
  -H 'Content-Type: application/json' \
  -d '{ "action": "click", "ref": "r5" }'

# Type into an input
curl -X POST http://localhost:3000/sessions/abc123/act \
  -H 'Content-Type: application/json' \
  -d '{ "action": "type", "ref": "r3", "value": "hello world" }'

# Select a dropdown option
curl -X POST http://localhost:3000/sessions/abc123/act \
  -H 'Content-Type: application/json' \
  -d '{ "action": "select", "ref": "r7", "value": "option2" }'

# Scroll down
curl -X POST http://localhost:3000/sessions/abc123/act \
  -H 'Content-Type: application/json' \
  -d '{ "action": "scroll", "direction": "down" }'
```

#### Extract

```bash
# Plain text (via Readability)
curl -X POST http://localhost:3000/sessions/abc123/extract \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "text" }'

# Markdown (via Turndown)
curl -X POST http://localhost:3000/sessions/abc123/extract \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "markdown" }'

# Structured (extracts fields matching a JSON schema)
curl -X POST http://localhost:3000/sessions/abc123/extract \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "structured", "schema": { "title": "string", "links": ["string"] } }'
```

#### Observe

```bash
curl http://localhost:3000/sessions/abc123/observe
# { "title": "...", "url": "...", "refs": [
#     { "ref": "r1", "role": "link", "name": "Home" },
#     { "ref": "r2", "role": "textbox", "name": "Search", "value": "" },
#     { "ref": "r3", "role": "button", "name": "Submit" }
# ]}
```

#### Screenshot

```bash
curl http://localhost:3000/sessions/abc123/screenshot > page.jpg
```

#### Health

```bash
curl http://localhost:3000/health
# { "status": "ok", "sessions": 1 }
```

## How Snapshot+Refs Works

Instead of dumping the full accessibility tree (thousands of nodes), abbwak:

1. Walks the DOM and finds **interactive elements** (links, buttons, inputs, selects) plus **structural elements** (headings, landmarks)
2. Stamps each with a stable `data-abbwak-ref` attribute (e.g., `r1`, `r2`)
3. Returns a compact list of `{ ref, role, name, value?, checked?, disabled? }`
4. Agents use ref IDs to target elements in subsequent `act` calls

This typically reduces context by **~93%** compared to raw accessibility trees, saving tokens and improving agent reasoning.

## Configuration

All config via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ABBWAK_PORT` | `3000` | HTTP server port |
| `ABBWAK_HOST` | `0.0.0.0` | HTTP server host |
| `ABBWAK_MAX_SESSIONS` | `10` | Maximum concurrent sessions |
| `ABBWAK_SESSION_TIMEOUT_MS` | `300000` | Session idle timeout (5 min) |
| `ABBWAK_HEADLESS` | `true` | Run browser in headless mode |
| `ABBWAK_BROWSER` | `chromium` | Browser engine (chromium/firefox/webkit) |
| `ABBWAK_ALLOWED_DOMAINS` | (empty) | Comma-separated domain allowlist |
| `ABBWAK_BLOCK_RESOURCES` | `image,font,media` | Resource types to block |
| `ABBWAK_EXECUTABLE_PATH` | (auto) | Custom browser executable path |
| `ABBWAK_VIEWPORT_WIDTH` | `1280` | Default viewport width |
| `ABBWAK_VIEWPORT_HEIGHT` | `720` | Default viewport height |
| `ABBWAK_LOG_LEVEL` | `info` | Log level (debug/info/warn/error/silent) |

## Docker

```bash
docker build -t abbwak .
docker run -p 3000:3000 abbwak
```

Or with Docker Compose:

```bash
docker compose up
```

## Testing

```bash
npm test                            # Run all tests
npm test -- test/unit/              # Unit tests only
npm test -- test/integration/       # Integration tests only
SKIP_HEAVY_BROWSER_TESTS=1 npm test # Skip click/type tests (for low-memory CI)
```

## Architecture

```
src/
├── actions/          # click, type, select, scroll, navigate executors
├── browser/          # Playwright engine, session, session-manager
├── processing/       # snapshot (Refs), content extraction
├── server/           # Fastify REST API + middleware + routes
├── mcp/              # MCP server (stdio transport) + tool definitions
├── utils/            # errors, logger, sanitize
├── config.ts         # Env-based configuration
└── index.ts          # Entry point
```

## License

MIT
