"use server";

import { getDb } from "@/lib/db";
import { ensureDefaultCategories } from "@/lib/categories";

export async function createHousehold(userId: string, name: string, currency: string = 'USD') {
  const db = getDb();

  try {
    // Create household
    const result = db
      .prepare("INSERT INTO households (name, currency, created_by) VALUES (?, ?, ?)")
      .run(name, currency, userId);

    const householdId = result.lastInsertRowid as number;

    // Add creator as admin
    db.prepare(
      "INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)"
    ).run(householdId, userId, "admin");

    // Create default categories
    ensureDefaultCategories(householdId);

    return { success: true, householdId };
  } catch (error) {
    return { error: "Failed to create household" };
  }
}

export async function inviteUserToHousehold(
  householdId: number,
  email: string,
  invitedBy: string
) {
  const db = getDb();

  const user = getUserByEmail(email);
  if (!user) {
    return { error: "User not found" };
  }

  try {
    db.prepare(
      "INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)"
    ).run(householdId, user.id, "member");

    return { success: true };
  } catch (error) {
    return { error: "User already in household or invalid household" };
  }
}
