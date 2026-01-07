"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  toggleExcludeFromReports,
} from "@/app/actions/transactions";
import { getCategoriesAction } from "@/app/actions/categories";
import { getUserHouseholdsAction } from "@/app/actions/household";
import {
  saveCategorizationPattern,
  findMatchingTransactions,
  bulkCategorizeTransactions,
  suggestPatternFromDescription,
} from "@/app/actions/categorization";
import { Plus, Edit2, Trash2, X, Sparkles, EyeOff, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default function TransactionsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [householdCurrency, setHouseholdCurrency] = useState<string>("USD");
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
  });

  // Pattern learning state
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternData, setPatternData] = useState<{
    transactionId: number;
    description: string;
    categoryId: number;
    suggestedPattern: string;
  } | null>(null);
  const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    } else if (session?.user) {
      loadData();
    }
  }, [isPending, session]);

  const loadData = async () => {
    if (!session?.user?.id) return;

    const householdsResult = await getUserHouseholdsAction(session.user.id);
    if (
      !householdsResult.success ||
      !householdsResult.households ||
      householdsResult.households.length === 0
    )
      return;

    const household = householdsResult.households[0] as any;
    setHouseholdId(household.id);
    setHouseholdCurrency(household.currency || "USD");

    const catsResult = await getCategoriesAction(household.id);
    if (catsResult.success && catsResult.categories) {
      setCategories(catsResult.categories);
    }

    const txns = await getTransactions(household.id, session.user.id);
    setTransactions(txns);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !session?.user?.id) return;

    const data = {
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      categoryId: formData.categoryId
        ? parseInt(formData.categoryId)
        : undefined,
    };

    let transactionId: number | undefined;
    const categoryChanged =
      editingTransaction &&
      editingTransaction.category_id !== data.categoryId &&
      data.categoryId;

    if (editingTransaction) {
      await updateTransaction(
        editingTransaction.id,
        householdId,
        session.user.id,
        data
      );
      transactionId = editingTransaction.id;
    } else {
      const result = await createTransaction(
        householdId,
        session.user.id,
        data
      );
      if (result.success) {
        transactionId = result.transactionId as number;
      }
    }

    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      categoryId: "",
    });

    // If a category was manually assigned, offer to learn the pattern
    if (data.categoryId && transactionId) {
      console.log("Category assigned, learning pattern...");
      const pattern = await suggestPatternFromDescription(data.description);
      console.log("Suggested pattern:", pattern);

      setPatternData({
        transactionId,
        description: data.description,
        categoryId: data.categoryId,
        suggestedPattern: pattern,
      });

      // Find matching uncategorized transactions
      const matches = await findMatchingTransactions(
        householdId,
        session.user.id,
        pattern,
        transactionId
      );

      console.log("Matches found:", matches);

      if (matches.success && matches.count > 0) {
        setMatchingTransactions(matches.matches);
        setSelectedMatches(new Set(matches.matches.map((m: any) => m.id)));
        setShowPatternModal(true);
        console.log("Modal should show now");
      } else {
        // Even if no matches, still show the pattern modal to save the pattern
        setMatchingTransactions([]);
        setSelectedMatches(new Set());
        setShowPatternModal(true);
        console.log("No matches, but showing modal anyway to save pattern");
      }
    } else {
      console.log("No category or transactionId", {
        categoryId: data.categoryId,
        transactionId,
      });
      loadData();
    }
  };

  const handleSavePattern = async () => {
    if (!patternData || !householdId || !session?.user?.id) return;

    // Save the pattern
    await saveCategorizationPattern(householdId, session.user.id, {
      categoryId: patternData.categoryId,
      pattern: patternData.suggestedPattern,
      description: patternData.description,
    });

    // Apply category to selected matching transactions
    if (selectedMatches.size > 0) {
      await bulkCategorizeTransactions(
        householdId,
        session.user.id,
        Array.from(selectedMatches),
        patternData.categoryId
      );
    }

    setShowPatternModal(false);
    setPatternData(null);
    setMatchingTransactions([]);
    setSelectedMatches(new Set());
    loadData();
  };

  const handleSkipPattern = () => {
    setShowPatternModal(false);
    setPatternData(null);
    setMatchingTransactions([]);
    setSelectedMatches(new Set());
  };

  const toggleMatchSelection = (transactionId: number) => {
    const newSelection = new Set(selectedMatches);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedMatches(newSelection);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      categoryId: transaction.category_id?.toString() || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (transactionId: number) => {
    if (!householdId || !session?.user?.id) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    await deleteTransaction(transactionId, householdId, session.user.id);
    loadData();
  };

  const handleToggleExclude = async (
    transactionId: number,
    currentlyExcluded: boolean
  ) => {
    if (!householdId || !session?.user?.id) return;

    await toggleExcludeFromReports(
      transactionId,
      householdId,
      session.user.id,
      !currentlyExcluded
    );
    loadData();
  };

  if (isPending) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => {
            setEditingTransaction(null);
            setFormData({
              date: new Date().toISOString().split("T")[0],
              description: "",
              amount: "",
              type: "expense",
              categoryId: "",
            });
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Transaction
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={
                  transaction.excluded_from_reports ? "opacity-50" : ""
                }
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    {transaction.excluded_from_reports && (
                      <span title="Excluded from reports">
                        <EyeOff className="w-4 h-4 text-gray-400 mr-2" />
                      </span>
                    )}
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {transaction.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {transaction.category_name && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: transaction.category_color + "20",
                        color: transaction.category_color,
                      }}
                    >
                      {transaction.category_name}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === "income"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {transaction.type}
                  </span>
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    transaction.type === "income"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount, householdCurrency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() =>
                      handleToggleExclude(
                        transaction.id,
                        transaction.excluded_from_reports
                      )
                    }
                    className={`${
                      transaction.excluded_from_reports
                        ? "text-gray-400 hover:text-gray-600"
                        : "text-gray-600 hover:text-gray-900"
                    } mr-3`}
                    title={
                      transaction.excluded_from_reports
                        ? "Include in reports"
                        : "Exclude from reports"
                    }
                  >
                    {transaction.excluded_from_reports ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No transactions yet. Add your first transaction!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "income" | "expense",
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Uncategorized</option>
                  {categories
                    .filter((c) => c.type === formData.type)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingTransaction ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pattern Learning Modal */}
      {showPatternModal && patternData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Sparkles className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">
                  Learn Categorization Pattern
                </h2>
              </div>
              <button
                onClick={handleSkipPattern}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Save this categorization pattern for future transactions?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Pattern:</strong> "{patternData.suggestedPattern}"
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Category:</strong>{" "}
                  {
                    categories.find((c) => c.id === patternData.categoryId)
                      ?.name
                  }
                </p>
              </div>
            </div>

            {matchingTransactions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Found {matchingTransactions.length} similar uncategorized
                  transaction
                  {matchingTransactions.length !== 1 ? "s" : ""}. Apply this
                  category to them?
                </p>
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {matchingTransactions.map((txn) => (
                    <label
                      key={txn.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMatches.has(txn.id)}
                        onChange={() => toggleMatchSelection(txn.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {txn.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(txn.date).toLocaleDateString()}
                            </p>
                          </div>
                          <p
                            className={`text-sm font-medium ${
                              txn.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {txn.type === "income" ? "+" : "-"}
                            {formatCurrency(txn.amount, householdCurrency)}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleSavePattern}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Save Pattern{" "}
                {selectedMatches.size > 0 &&
                  `& Categorize ${selectedMatches.size}`}
              </button>
              <button
                onClick={handleSkipPattern}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
