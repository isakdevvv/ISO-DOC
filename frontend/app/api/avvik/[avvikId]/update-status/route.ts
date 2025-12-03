// /api/avvik/[avvikId]/update-status/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { avvikId: string } }) {
  const avvikId = params.avvikId;
  const { newStatus, comment } = await req.json();

  const updated = await db.avvik.update({
    where: { id: avvikId },
    data: { status: newStatus },
  });

  await db.avvikActions.create({
    data: {
      avvikId,
      action_type: "STATUS_CHANGE",
      comment,
      new_status: newStatus,
    },
  });

  return NextResponse.json({ updated });
}