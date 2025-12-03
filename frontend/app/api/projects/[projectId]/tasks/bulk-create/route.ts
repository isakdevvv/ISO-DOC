// /api/projects/[projectId]/tasks/bulk-create/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, taskCodes } = body;

  const tasks = await Promise.all(
    taskCodes.map((code: string) =>
      db.task.create({
        data: { projectId, code, status: "OPEN" },
      })
    )
  );

  return NextResponse.json({ tasks });
}