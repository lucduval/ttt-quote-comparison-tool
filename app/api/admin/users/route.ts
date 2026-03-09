import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const caller = await client.users.getUser(userId);
  const role = (caller.publicMetadata as { role?: string })?.role;

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: users } = await client.users.getUserList({ limit: 200 });

  const result = users.map((u) => ({
    id: u.id,
    name:
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      "Unknown",
    email: u.emailAddresses[0]?.emailAddress ?? "",
    imageUrl: u.imageUrl,
    role: (u.publicMetadata as { role?: string })?.role ?? "user",
    createdAt: u.createdAt,
  }));

  return NextResponse.json(result);
}
