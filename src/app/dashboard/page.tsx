"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { getDashboardData } from "@/app/actions/dashboard";
import { getUserHouseholdsAction } from "@/app/actions/household";
import { formatCurrency } from "@/lib/currency";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, -1 = previous, etc.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    } else if (session?.user) {
      loadData();
    }
  }, [isPending, session, period, periodOffset]);

  const loadData = async () => {
    if (!session?.user?.id) return;

    const householdsResult = await getUserHouseholdsAction(session.user.id);
    if (
      !householdsResult.success ||
      !householdsResult.households ||
      (householdsResult.households as any[]).length === 0
    ) {
      setLoading(false);
      return;
    }

    const houseId = (householdsResult.households as any[])[0].id;
    setHouseholdId(houseId);

    const data = await getDashboardData(
      houseId,
      session.user.id,
      period,
      periodOffset
    );
    if (data.success) {
      setDashboardData(data);
    }
    setLoading(false);
  };

  const goToPreviousPeriod = () => {
    setPeriodOffset(periodOffset - 1);
  };

  const goToNextPeriod = () => {
    if (periodOffset < 0) {
      setPeriodOffset(periodOffset + 1);
    }
  };

  const goToCurrentPeriod = () => {
    setPeriodOffset(0);
  };

  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Cashopia!
        </h2>
        <p className="text-gray-600">
          Start by importing your transactions or adding them manually.
        </p>
      </div>
    );
  }

  const {
    summary,
    spendingByCategory,
    dailyTrend,
    recentTransactions,
    accountBalances,
    totalBalance,
    householdCurrency,
  } = dashboardData;

  const formatPeriodLabel = () => {
    if (!dashboardData?.startDate || !dashboardData?.endDate) return "";

    const start = new Date(dashboardData.startDate);
    const end = new Date(dashboardData.endDate);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          {/* Period Type Selector */}
          <div className="flex space-x-2">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setPeriodOffset(0); // Reset to current period when changing type
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousPeriod}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous
          </button>

          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-600">Viewing Period</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPeriodLabel()}
            </p>
            {periodOffset < 0 && (
              <button
                onClick={goToCurrentPeriod}
                className="text-sm text-blue-600 hover:text-blue-700 mt-1"
              >
                Return to Current
              </button>
            )}
          </div>

          <button
            onClick={goToNextPeriod}
            disabled={periodOffset >= 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              periodOffset >= 0
                ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                : "text-gray-700 bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      {/* Account Balances Section */}
      {accountBalances && accountBalances.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Wallet className="w-6 h-6 mr-2 text-blue-600" />
              Account Balances
            </h2>
            <button
              onClick={() => router.push("/accounts")}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="mb-4 pb-4 border-b">
            <p className="text-sm text-gray-600">Total Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalBalance, householdCurrency || "USD")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountBalances.slice(0, 6).map((account: any) => (
              <div
                key={account.id}
                className={`p-4 rounded-lg border ${
                  account.is_active ? "bg-gray-50" : "bg-gray-100 opacity-60"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {account.account_type.replace("_", " ")}
                    </p>
                  </div>
                  {!account.is_active && (
                    <span className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                {account.institution && (
                  <p className="text-xs text-gray-600 mb-2">
                    {account.institution}
                  </p>
                )}
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(account.balance, householdCurrency || "USD")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  summary.totalIncome,
                  householdCurrency || "USD"
                )}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  summary.totalExpenses,
                  householdCurrency || "USD"
                )}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p
                className={`text-2xl font-bold ${
                  summary.netIncome >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.netIncome, householdCurrency || "USD")}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.transactionCount}
              </p>
            </div>
            <Activity className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Spending by Category
          </h2>
          {spendingByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendingByCategory}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) =>
                    `${entry.name}: $${
                      entry.total?.toFixed
                        ? entry.total.toFixed(0)
                        : entry.total
                    }`
                  }
                >
                  {spendingByCategory.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || "#3B82F6"}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No spending data</p>
          )}
        </div>

        {/* Daily Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Trend
          </h2>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10B981"
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No trend data</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-x-auto">
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
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction: any) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
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
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(
                        transaction.amount,
                        householdCurrency || "USD"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
