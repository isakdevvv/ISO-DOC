// /api/maintenance/[eventId]/create-tasks/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const eventId = params.eventId;
  const { taskCodes } = await req.json();

  const tasks = await Promise.all(
    taskCodes.map((code: string) =>
      db.task.create({
        data: {
          code,
          maintenanceEventId: eventId,
          status: "OPEN",
        },
      })
    )
  );

  return NextResponse.json({ tasks });
}