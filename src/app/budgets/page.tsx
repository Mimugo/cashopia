"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { getBudgetProgress, createBudget, updateBudget, deleteBudget } from '@/app/actions/budgets';
import { getCategoriesAction } from '@/app/actions/categories';
import { getUserHouseholdsAction } from '@/app/actions/household';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BudgetsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [budgetsData, setBudgetsData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [householdCurrency, setHouseholdCurrency] = useState<string>("USD");
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
  });

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
    if (!householdsResult.success || !householdsResult.households || householdsResult.households.length === 0) return;

    const household = householdsResult.households[0] as any;
    setHouseholdId(household.id);
    setHouseholdCurrency(household.currency || 'USD');

    const catsResult = await getCategoriesAction(household.id);
    if (catsResult.success && catsResult.categories) {
      const expenseCategories = catsResult.categories.filter(c => c.type === 'expense');
      setCategories(expenseCategories);
    }

    const result = await getBudgetProgress(household.id, session.user.id, period, periodOffset);
    if (result.success) {
      setBudgets(result.budgets);
      setBudgetsData(result);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !session?.user?.id) return;

    const data = {
      categoryId: parseInt(formData.categoryId),
      amount: parseFloat(formData.amount),
      period: formData.period,
      startDate: formData.startDate,
    };

    if (editingBudget) {
      await updateBudget(editingBudget.id, householdId, session.user.id, data);
    } else {
      await createBudget(householdId, session.user.id, data);
    }

    setShowModal(false);
    setEditingBudget(null);
    setFormData({
      categoryId: '',
      amount: '',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
    loadData();
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.category_id.toString(),
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.start_date,
    });
    setShowModal(true);
  };

  const handleDelete = async (budgetId: number) => {
    if (!householdId || !session?.user?.id) return;
    if (!confirm('Are you sure you want to delete this budget?')) return;

    await deleteBudget(budgetId, householdId, session.user.id);
    loadData();
  };

  if (isPending) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const formatPeriodLabel = () => {
    if (!budgetsData?.startDate || !budgetsData?.endDate) return '';
    
    const start = new Date(budgetsData.startDate);
    const end = new Date(budgetsData.endDate);
    
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
        <div className="flex space-x-3">
          <div className="flex space-x-2">
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setPeriodOffset(0);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setEditingBudget(null);
              setFormData({
                categoryId: '',
                amount: '',
                period: 'monthly',
                startDate: new Date().toISOString().split('T')[0],
              });
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Period Navigation */}
      {period === 'monthly' && (
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
              <p className="text-sm text-gray-600">Budget Period</p>
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => {
          const percentage = (budget.spent / budget.amount) * 100;
          const isOverBudget = percentage > 100;

          return (
            <div key={budget.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {budget.category_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {budget.period === 'monthly' ? 'Monthly' : 'Yearly'} Budget
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(budget)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Spent</span>
                  <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(budget.spent, householdCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(budget.amount, householdCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className={`font-medium ${
                    budget.amount - budget.spent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(budget.amount - budget.spent, householdCurrency)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{percentage.toFixed(0)}% used</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget ? 'bg-red-600' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No budgets set yet. Create your first budget!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  disabled={!!editingBudget}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Period</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value as 'monthly' | 'yearly' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {editingBudget ? 'Update' : 'Create'}
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
    </div>
  );
}

