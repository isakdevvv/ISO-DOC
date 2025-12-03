// /api/maintenance/[eventId]/interpret/route.ts

import { NextResponse } from "next/server";
import { interpretMaintenance } from "@/lib/ai/maintenance";

export async function POST(req: Request, { params }: { params: { eventId: string } }) {
  const eventId = params.eventId;

  const interpretation = await interpretMaintenance(eventId);

  return NextResponse.json({ interpretation });
}