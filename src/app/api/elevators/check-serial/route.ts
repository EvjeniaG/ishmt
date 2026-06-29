import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { SerialValidationService } from "@/lib/services/serial-validation-service";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const serial = searchParams.get("serial")?.trim();
  if (!serial) {
    return NextResponse.json({ available: false, message: "Serial i zbrazët" });
  }

  const result = await SerialValidationService.checkAvailable(serial, {
    excludeApplicationId: searchParams.get("excludeApplicationId") ?? undefined,
    excludeElevatorId: searchParams.get("excludeElevatorId") ?? undefined,
  });

  return NextResponse.json(result);
}
