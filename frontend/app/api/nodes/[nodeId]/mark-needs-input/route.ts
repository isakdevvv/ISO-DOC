// /api/nodes/[nodeId]/mark-needs-input/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { nodeId: string } }) {
  const nodeId = params.nodeId;
  const { fieldPath } = await req.json();

  const updated = await db.node.update({
    where: { id: nodeId },
    data: {
      data: {
        needsInput: {
          [fieldPath]: true,
        },
      },
    },
  });

  return NextResponse.json({ updated });
}