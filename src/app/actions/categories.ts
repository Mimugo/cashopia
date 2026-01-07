"use server";

import { getCategories } from "@/lib/categories";

export async function getCategoriesAction(householdId: number) {
  try {
    const categories = getCategories(householdId);
    return { success: true, categories };
  } catch (error) {
    return { success: false, error: "Failed to fetch categories" };
  }
}

