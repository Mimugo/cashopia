"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  getUserHouseholdsAction,
  getHouseholdMembersAction,
  updateHouseholdSettings,
} from "@/app/actions/household";
import { inviteUserToHousehold } from "@/app/actions/auth";
import { Users, Mail, Plus, X, Settings } from "lucide-react";

export default function HouseholdPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [settingsData, setSettingsData] = useState({
    name: "",
    currency: "",
    budgetMonthStartDay: 1,
  });
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

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
      !householdsResult?.success ||
      householdsResult?.households?.length === 0
    )
      return;

    const currentHousehold = householdsResult?.households?.[0] as any;
    if (!currentHousehold) {
      return {
        name: "",
        currency: "USD",
        budgetMonthStartDay: 1,
      };
    }
    setHousehold(currentHousehold);
    setSettingsData({
      name: currentHousehold?.name ?? "",
      currency: currentHousehold?.currency ?? "USD",
      budgetMonthStartDay: currentHousehold?.budget_month_start_day ?? 1,
    });

    const membersResult = await getHouseholdMembersAction(currentHousehold.id);
    if (membersResult.success) {
      setMembers(membersResult?.members ?? []);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess(false);

    if (!household || !session?.user?.id) return;

    const result = await inviteUserToHousehold(
      household.id,
      inviteEmail,
      session.user.id
    );

    if (result.error) {
      setInviteError(result.error);
    } else {
      setInviteSuccess(true);
      setInviteEmail("");
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
        loadData();
      }, 2000);
    }
  };

  const handleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSaved(false);

    if (!household || !session?.user?.id) return;

    const result = await updateHouseholdSettings(
      household.id,
      session.user.id,
      settingsData
    );

    if (result.error) {
      setSettingsError(result.error);
    } else {
      setSettingsSaved(true);
      setTimeout(() => {
        setShowSettingsModal(false);
        setSettingsSaved(false);
        loadData();
      }, 1500);
    }
  };

  if (isPending) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!household) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No household found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Household</h1>
      </div>

      {/* Household Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {household.name}
              </h2>
              <p className="text-sm text-gray-500">
                Currency: {household.currency || "USD"} • Created{" "}
                {new Date(household.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div
              key={member.id}
              className="px-6 py-4 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    member.role === "admin"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {member.role}
                </span>
                <span className="text-xs text-gray-500">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError("");
                  setInviteSuccess(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                Member invited successfully!
              </div>
            ) : (
              <>
                {inviteError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="member@example.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      The user must already have an account to be invited.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                    >
                      Send Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteError("");
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Household Settings
              </h2>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setSettingsError("");
                  setSettingsSaved(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {settingsSaved ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                Settings saved successfully!
              </div>
            ) : (
              <>
                {settingsError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                    {settingsError}
                  </div>
                )}

                <form onSubmit={handleSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Household Name
                    </label>
                    <input
                      type="text"
                      value={settingsData.name}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          name: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={settingsData.currency}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          currency: e.target.value,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                      <option value="SEK">SEK - Swedish Krona (kr)</option>
                      <option value="NOK">NOK - Norwegian Krone (kr)</option>
                      <option value="DKK">DKK - Danish Krone (kr)</option>
                      <option value="JPY">JPY - Japanese Yen (¥)</option>
                      <option value="CNY">CNY - Chinese Yuan (¥)</option>
                      <option value="INR">INR - Indian Rupee (₹)</option>
                      <option value="CAD">CAD - Canadian Dollar (C$)</option>
                      <option value="AUD">AUD - Australian Dollar (A$)</option>
                      <option value="CHF">CHF - Swiss Franc (CHF)</option>
                      <option value="BRL">BRL - Brazilian Real (R$)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      This will affect how amounts are displayed throughout the
                      app.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Month Start Day
                    </label>
                    <select
                      value={settingsData.budgetMonthStartDay}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          budgetMonthStartDay: parseInt(e.target.value),
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (day) => (
                          <option key={day} value={day}>
                            {day}
                            {day === 1
                              ? "st"
                              : day === 2
                              ? "nd"
                              : day === 3
                              ? "rd"
                              : "th"}{" "}
                            of the month
                          </option>
                        )
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Set when your budget period starts (e.g., when you receive
                      salary). Your budget tracking, charts, and statistics will
                      align with this cycle.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                    >
                      Save Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        setSettingsError("");
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
