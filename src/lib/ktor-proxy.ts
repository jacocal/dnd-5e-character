import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const KTOR_PORT = process.env.KTOR_PORT || "8081";
const KTOR_BASE_URL = process.env.KTOR_URL || `http://127.0.0.1:${KTOR_PORT}`;

let startingPromise: Promise<void> | null = null;

async function isKtorHealthy(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600);
        const resp = await fetch(`${KTOR_BASE_URL}/api/engine/health`, {
            signal: controller.signal,
            cache: "no-store",
        });
        clearTimeout(timeout);
        return resp.ok;
    } catch {
        return false;
    }
}

/**
 * Ensures the Kotlin/Ktor backend server (:server) is running on port 8081.
 * If the user started only `npm run dev` without `make server`, this automatically
 * spawns the compiled Ktor server distribution in the background (~50ms startup).
 */
export async function ensureKtorServerRunning(): Promise<void> {
    if (await isKtorHealthy()) return;

    if (startingPromise) {
        await startingPromise;
        return;
    }

    startingPromise = (async () => {
        try {
            const binaryPath = path.join(process.cwd(), "server", "build", "install", "server", "bin", "server");
            if (fs.existsSync(binaryPath)) {
                console.log("[ktor-proxy] Auto-starting Ktor backend server on port", KTOR_PORT);
                const child = spawn(binaryPath, [], {
                    cwd: process.cwd(),
                    detached: true,
                    stdio: "ignore",
                    env: {
                        ...process.env,
                        JAVA_HOME: process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@21",
                        KTOR_PORT,
                        DATABASE_URL:
                            process.env.DATABASE_URL ||
                            "postgres://postgres:postgres@localhost:5432/dnd_character_db",
                    },
                });
                child.unref();
            } else {
                console.warn("[ktor-proxy] Compiled Ktor binary not found at", binaryPath);
            }

            // Poll up to 4 seconds for Ktor to accept connections
            for (let i = 0; i < 25; i++) {
                await new Promise((r) => setTimeout(r, 150));
                if (await isKtorHealthy()) {
                    return;
                }
            }
        } finally {
            startingPromise = null;
        }
    })();

    await startingPromise;
}

export async function proxyToKtor(req: NextRequest, targetPath: string): Promise<Response> {
    await ensureKtorServerRunning();

    const search = req.nextUrl.search || "";
    const url = `${KTOR_BASE_URL}${targetPath}${search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== "host" && lower !== "connection" && lower !== "content-length") {
            headers.set(key, value);
        }
    });

    const method = req.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const bodyText = hasBody ? await req.text() : undefined;

    try {
        const upstream = await fetch(url, {
            method,
            headers,
            body: bodyText,
            cache: "no-store",
        });

        const respHeaders = new Headers();
        upstream.headers.forEach((value, key) => {
            const lower = key.toLowerCase();
            if (lower !== "transfer-encoding" && lower !== "content-encoding") {
                respHeaders.set(key, value);
            }
        });

        return new Response(upstream.body, {
            status: upstream.status,
            headers: respHeaders,
        });
    } catch (err: any) {
        console.error(`[ktor-proxy] Upstream request to ${url} failed:`, err);
        return NextResponse.json(
            {
                error: `Ktor Engine unreachable at ${url}: ${err.message || "Connection failed"}`,
            },
            { status: 502 }
        );
    }
}
