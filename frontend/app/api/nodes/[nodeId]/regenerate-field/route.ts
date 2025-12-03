// /api/nodes/[nodeId]/regenerate-field/route.ts

import { NextResponse } from "next/server";
import { documentBuilder } from "@/lib/ai/documentBuilder";

export async function POST(req: Request, { params }: { params: { nodeId: string } }) {
  const nodeId = params.nodeId;
  const { fieldPath } = await req.json();

  const result = await documentBuilder.regenerateField(nodeId, fieldPath);

  return NextResponse.json(result);
}