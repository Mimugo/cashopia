"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { getUserHouseholdsAction } from "@/app/actions/household";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountBalance,
  updateAccountBalance,
} from "@/app/actions/accounts";

export default function AccountsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [households, setHouseholds] = useState<any[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<number | null>(
    null
  );
  const [accounts, setAccounts] = useState<any[]>([]);
  const [householdCurrency, setHouseholdCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    accountType: "checking",
    institution: "",
    accountNumberLast4: "",
    balance: 0,
    currency: "USD",
  });

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    async function loadData() {
      if (!session?.user?.id) return;
      const result = await getUserHouseholdsAction(session.user.id);
      if (result.success && result.households) {
        const householdsList = result.households as any[];
        setHouseholds(householdsList);
        if (householdsList.length > 0) {
          setSelectedHouseholdId(householdsList[0].id);
        }
      }
      setLoading(false);
    }

    loadData();
  }, [session, router]);

  useEffect(() => {
    if (selectedHouseholdId && session?.user) {
      loadAccounts();
    }
  }, [selectedHouseholdId]);

  async function loadAccounts() {
    if (!selectedHouseholdId || !session?.user) return;

    const result = await getAccounts(selectedHouseholdId, session.user.id);
    if (result.success) {
      setAccounts(result.accounts || []);
      setHouseholdCurrency(result.householdCurrency || "USD");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHouseholdId || !session?.user) return;

    if (editingAccount) {
      const result = await updateAccount(
        editingAccount.id,
        selectedHouseholdId,
        session.user.id,
        formData
      );
      if (result.success) {
        setEditingAccount(null);
        resetForm();
        loadAccounts();
      } else {
        alert(result.error);
      }
    } else {
      const result = await createAccount(
        selectedHouseholdId,
        session.user.id,
        formData
      );
      if (result.success) {
        setShowAddForm(false);
        resetForm();
        loadAccounts();
      } else {
        alert(result.error);
      }
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      accountType: "checking",
      institution: "",
      accountNumberLast4: "",
      balance: 0,
      currency: "USD",
    });
    setShowAddForm(false);
    setEditingAccount(null);
  }

  function handleEdit(account: any) {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      accountType: account.account_type,
      institution: account.institution || "",
      accountNumberLast4: account.account_number_last4 || "",
      balance: account.balance,
      currency: account.currency,
    });
    setShowAddForm(true);
  }

  async function handleDelete(accountId: number) {
    if (!selectedHouseholdId || !session?.user) return;
    if (!confirm("Are you sure you want to delete this account?")) return;

    const result = await deleteAccount(
      accountId,
      selectedHouseholdId,
      session.user.id
    );
    if (result.success) {
      loadAccounts();
    } else {
      alert(result.error);
    }
  }

  async function handleToggleActive(account: any) {
    if (!selectedHouseholdId || !session?.user) return;

    const result = await updateAccount(
      account.id,
      selectedHouseholdId,
      session.user.id,
      { isActive: !account.is_active }
    );
    if (result.success) {
      loadAccounts();
    }
  }

  async function handleViewBalance(account: any) {
    if (!selectedHouseholdId || !session?.user) return;

    const result = await getAccountBalance(
      account.id,
      selectedHouseholdId,
      session.user.id
    );
    if (result.success) {
      setBalanceInfo(result);
      setShowBalanceModal(true);
    } else {
      alert(result.error);
    }
  }

  async function handleUpdateBalance(accountId: number, newBalance: number) {
    if (!selectedHouseholdId || !session?.user) return;

    const result = await updateAccountBalance(
      accountId,
      selectedHouseholdId,
      session.user.id,
      newBalance
    );
    if (result.success) {
      setShowBalanceModal(false);
      loadAccounts();
    } else {
      alert(result.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Household Found
          </h2>
          <p className="text-gray-600 mb-6">Please create a household first.</p>
          <button
            onClick={() => router.push("/household")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Household
          </button>
        </div>
      </div>
    );
  }

  const totalBalance = accounts.reduce(
    (sum, acc) => (acc.is_active ? sum + acc.balance : sum),
    0
  );

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-2">
            Manage your household bank accounts
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {households.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Household
          </label>
          <select
            value={selectedHouseholdId || ""}
            onChange={(e) => setSelectedHouseholdId(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg w-full max-w-md"
          >
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Total Balance Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          Total Balance
        </h2>
        <p className="text-3xl font-bold text-gray-900">
          {formatCurrency(totalBalance, householdCurrency)}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Across {accounts.filter((a) => a.is_active).length} active accounts
        </p>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">
            No accounts yet. Add your first account to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-white rounded-lg shadow p-6 ${
                !account.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {account.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {account.account_type.replace("_", " ")}
                  </p>
                </div>
                {!account.is_active && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>

              {account.institution && (
                <p className="text-sm text-gray-600 mb-2">
                  {account.institution}
                </p>
              )}

              {account.account_number_last4 && (
                <p className="text-sm text-gray-500 mb-4">
                  •••• {account.account_number_last4}
                </p>
              )}

              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.balance, householdCurrency)}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleViewBalance(account)}
                  className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleEdit(account)}
                  className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(account)}
                  className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  {account.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">
              {editingAccount ? "Edit Account" : "Add New Account"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Main Checking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type *
                </label>
                <select
                  required
                  value={formData.accountType}
                  onChange={(e) =>
                    setFormData({ ...formData, accountType: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) =>
                    setFormData({ ...formData, institution: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Chase Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.accountNumberLast4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accountNumberLast4: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingAccount ? "Update" : "Add Account"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance Details Modal */}
      {showBalanceModal && balanceInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Account Balance Details</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Account Name</p>
                <p className="text-lg font-semibold">
                  {balanceInfo.account.name}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">Stored Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(balanceInfo.storedBalance, householdCurrency)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  Calculated from Transactions
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(
                    balanceInfo.calculatedBalance,
                    householdCurrency
                  )}
                </p>
              </div>

              {Math.abs(balanceInfo.difference) > 0.01 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    Difference:{" "}
                    {formatCurrency(
                      Math.abs(balanceInfo.difference),
                      householdCurrency
                    )}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    The stored balance differs from the calculated balance.
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={balanceInfo.storedBalance}
                  id="newBalance"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "newBalance"
                    ) as HTMLInputElement;
                    const newBalance = parseFloat(input.value);
                    if (!isNaN(newBalance)) {
                      handleUpdateBalance(balanceInfo.account.id, newBalance);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Balance
                </button>
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
