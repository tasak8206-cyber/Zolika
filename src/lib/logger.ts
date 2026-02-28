/**
 * Egyszerű strukturált logger utility.
 * Éles környezetben JSON formátumban ír, fejlesztői módban olvasható formátumban.
 * Cseréli a nyers console.error hívásokat a kódbázisban.
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
    level: LogLevel
    message: string
    context?: string
    error?: string
    stack?: string
    [key: string]: unknown
}

function formatError(err: unknown): { error: string; stack?: string } {
    if (err instanceof Error) {
        return { error: err.message, stack: err.stack }
    }
    return { error: String(err) }
}

function log(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        ...meta,
    }

    if (process.env.NODE_ENV === 'production') {
        // Éles: JSON output (pl. Vercel / Datadog)
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
            JSON.stringify(entry)
        )
    } else {
        // Fejlesztői: olvasható, színes(ebb) kimenet
        const prefix = `[${level.toUpperCase()}] [${context}]`
        const extras = meta ? ` ${JSON.stringify(meta)}` : ''
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
            `${prefix} ${message}${extras}`
        )
    }
}

export const logger = {
    info: (context: string, message: string, meta?: Record<string, unknown>) =>
        log('info', context, message, meta),

    warn: (context: string, message: string, meta?: Record<string, unknown>) =>
        log('warn', context, message, meta),

    error: (context: string, message: string, err?: unknown, meta?: Record<string, unknown>) => {
        const errorMeta = err ? formatError(err) : {}
        log('error', context, message, { ...errorMeta, ...meta })
    },
}
