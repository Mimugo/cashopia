"use server";

import { getDb } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";

export async function getUserHouseholdsAction(userId: string) {
  const db = getDb();

  try {
    const households = db
      .prepare(
        `
      SELECT h.* 
      FROM households h
      INNER JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = ?
    `
      )
      .all(userId);

    return { success: true, households };
  } catch (error) {
    return { success: false, error: "Failed to fetch households" };
  }
}

export async function getHouseholdMembersAction(householdId: number) {
  const db = getDb();

  try {
    const members = db
      .prepare(
        `
      SELECT u.id, u.name, u.email, hm.role, hm.joined_at
      FROM household_members hm
      INNER JOIN user u ON hm.user_id = u.id
      WHERE hm.household_id = ?
      ORDER BY hm.joined_at ASC
    `
      )
      .all(householdId);

    return { success: true, members };
  } catch (error) {
    return { success: false, error: "Failed to fetch members" };
  }
}

export async function updateHouseholdSettings(
  householdId: number,
  userId: string,
  data: {
    name?: string;
    currency?: string;
    budgetMonthStartDay?: number;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  // Check if user is admin
  const membership = db
    .prepare(
      "SELECT role FROM household_members WHERE household_id = ? AND user_id = ?"
    )
    .get(householdId, userId) as { role: string } | undefined;

  if (!membership || membership.role !== "admin") {
    return { error: "Only admins can update household settings" };
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.currency) {
    updates.push("currency = ?");
    params.push(data.currency);
  }
  if (data.budgetMonthStartDay !== undefined) {
    // Validate day is between 1 and 31
    if (data.budgetMonthStartDay < 1 || data.budgetMonthStartDay > 31) {
      return { error: "Budget month start day must be between 1 and 31" };
    }
    updates.push("budget_month_start_day = ?");
    params.push(data.budgetMonthStartDay);
  }

  if (updates.length === 0) {
    return { error: "No updates provided" };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(householdId);

  try {
    db.prepare(
      `UPDATE households SET ${updates.join(", ")} WHERE id = ?`
    ).run(...params);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update household" };
  }
}
