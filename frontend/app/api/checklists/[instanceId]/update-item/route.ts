// /api/checklists/[instanceId]/update-item/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  const instanceId = params.instanceId;
  const { itemPath, value, comment, photos } = await req.json();

  const instance = await db.checklistInstance.update({
    where: { id: instanceId },
    data: {
      data: {
        [itemPath]: { value, comment, photos },
      },
    },
  });

  return NextResponse.json({ instance });
}