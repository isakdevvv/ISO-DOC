// /api/avvik/create/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { projectId, nodeId, title, description, severity } = await req.json();

  const avvik = await db.avvik.create({
    data: {
      projectId,
      nodeId,
      title,
      description,
      severity,
      status: "OPEN",
    },
  });

  return NextResponse.json({ avvik });
}