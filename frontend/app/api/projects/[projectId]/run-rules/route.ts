// /api/projects/[projectId]/run-rules/route.ts

import { NextResponse } from "next/server";
import { runRuleEngine } from "@/lib/rules/engine";

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  const results = await runRuleEngine(projectId);

  return NextResponse.json({ results });
}