// /api/checklists/[instanceId]/submit/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  const instanceId = params.instanceId;

  const updated = await db.checklistInstance.update({
    where: { id: instanceId },
    data: { status: "completed", filledAt: new Date() },
  });

  return NextResponse.json({ updated });
}