import { getDb } from "./db";

export function getUserByEmail(email: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM user WHERE email = ?").get(email);
}

export function getUserById(id: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM user WHERE id = ?").get(id);
}

export function getUserHouseholds(userId: string) {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT h.*, hm.role
    FROM households h
    JOIN household_members hm ON h.id = hm.household_id
    WHERE hm.user_id = ?
    ORDER BY h.created_at DESC
  `
    )
    .all(userId);
}

export function getHouseholdMembers(householdId: number) {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT u.id, u.email, u.name, hm.role, hm.joined_at
    FROM user u
    JOIN household_members hm ON u.id = hm.user_id
    WHERE hm.household_id = ?
    ORDER BY hm.joined_at ASC
  `
    )
    .all(householdId);
}

export function isUserInHousehold(
  userId: string,
  householdId: number
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "SELECT 1 FROM household_members WHERE user_id = ? AND household_id = ?"
    )
    .get(userId, householdId);
  return !!result;
}

export function isUserHouseholdAdmin(
  userId: string,
  householdId: number
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "SELECT 1 FROM household_members WHERE user_id = ? AND household_id = ? AND role = ?"
    )
    .get(userId, householdId, "admin");
  return !!result;
}

