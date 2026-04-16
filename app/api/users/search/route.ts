import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const client = await clerkClient();

  const { data: users } = await client.users.getUserList({
    limit: 50,
    ...(query ? { query } : {}),
  });

  // Filter out the current user and return minimal info
  const result = users
    .filter((u) => u.id !== userId)
    .map((u) => ({
      id: u.id,
      name:
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        "Unknown",
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
    }));

  return NextResponse.json(result);
}
