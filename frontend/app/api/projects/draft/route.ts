// apps/web/app/api/projects/draft/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const meta = await req.json();

  const project = await db.project.create({
    data: {
      name: meta.name,
      address: meta.address,
      customerType: meta.customerType,
      medium: meta.medium,
      ps: meta.ps,
      volume: meta.volume,
      commissionedAt: meta.commissionedAt,
      status: "draft",
    },
  });

  return NextResponse.json({ project });
}