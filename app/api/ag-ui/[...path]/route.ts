import { NextRequest } from "next/server";
import { proxyToKtor } from "@/lib/ktor-proxy";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    return proxyToKtor(req, `/api/ag-ui/${path.join("/")}`);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    return proxyToKtor(req, `/api/ag-ui/${path.join("/")}`);
}
