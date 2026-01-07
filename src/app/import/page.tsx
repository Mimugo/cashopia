"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { getUserHouseholdsAction } from '@/app/actions/household';
import { detectCsvStructure, saveCsvMapping, getCsvMappings, importCsvTransactions } from '@/app/actions/csv-import';
import { getAccounts } from '@/app/actions/accounts';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [detectedStructure, setDetectedStructure] = useState<any>(null);
  const [mapping, setMapping] = useState({
    name: '',
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: '',
    typeColumn: '',
    balanceColumn: '',
  });
  const [savedMappings, setSavedMappings] = useState<any[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'confirm' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<any>(null);

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
    if (!householdsResult.success || householdsResult.households.length === 0) return;

    const houseId = householdsResult.households[0].id;
    setHouseholdId(houseId);

    const result = await getCsvMappings(houseId, session.user.id);
    if (result.success) {
      setSavedMappings(result.mappings);
    }

    const accountsResult = await getAccounts(houseId, session.user.id);
    if (accountsResult.success) {
      setAccounts(accountsResult.accounts || []);
      // Auto-select first active account
      const firstActive = accountsResult.accounts?.find((a: any) => a.is_active);
      if (firstActive) {
        setSelectedAccountId(firstActive.id);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      const detection = await detectCsvStructure(content) as any;
      setDetectedStructure(detection);
      
      // If a saved mapping is selected, use it; otherwise use detected values
      if (selectedMappingId === null) {
        setMapping({
          name: file.name.replace('.csv', ''),
          dateColumn: detection.suggestedMapping?.dateColumn || '',
          descriptionColumn: detection.suggestedMapping?.descriptionColumn || '',
          amountColumn: detection.suggestedMapping?.amountColumn || '',
          typeColumn: detection.suggestedMapping?.typeColumn || '',
          balanceColumn: detection.suggestedMapping?.balanceColumn || '',
        });
      }
      // If mapping already selected, keep it but update the name
      else {
        setMapping(prev => ({ ...prev, name: prev.name || file.name.replace('.csv', '') }));
      }
      
      setStep('map');
    };
    reader.readAsText(file);
  };

  const handleSelectMapping = (savedMapping: any) => {
    setSelectedMappingId(savedMapping.id);
    setMapping({
      name: savedMapping.name,
      dateColumn: savedMapping.date_column,
      descriptionColumn: savedMapping.description_column,
      amountColumn: savedMapping.amount_column,
      typeColumn: savedMapping.type_column || '',
      balanceColumn: savedMapping.balance_column || '',
    });
  };

  const handleUseNewMapping = () => {
    setSelectedMappingId(null);
    setMapping({
      name: '',
      dateColumn: '',
      descriptionColumn: '',
      amountColumn: '',
      typeColumn: '',
      balanceColumn: '',
    });
  };

  const handleConfirmMapping = async () => {
    if (!householdId || !session?.user?.id) return;

    // Save mapping
    await saveCsvMapping(householdId, session.user.id, mapping);
    
    setStep('confirm');
  };

  const handleImport = async () => {
    if (!householdId || !session?.user?.id) return;

    const result = await importCsvTransactions(
      householdId,
      session.user.id,
      csvContent,
      mapping,
      selectedAccountId || undefined
    ) as any;

    setImportResult(result);
    setStep('complete');
  };

  if (isPending) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['Upload', 'Map', 'Confirm', 'Complete'].map((stepName, index) => {
          const stepIndex = ['upload', 'map', 'confirm', 'complete'].indexOf(step);
          const currentIndex = ['upload', 'map', 'confirm', 'complete'].indexOf(stepName.toLowerCase());
          const isActive = currentIndex === stepIndex;
          const isComplete = currentIndex < stepIndex;

          return (
            <div key={stepName} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isComplete ? <CheckCircle className="w-6 h-6" /> : index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {stepName}
                </span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-1 mx-2 ${isComplete ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Select Mapping First */}
          {savedMappings.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Import Configuration
              </h2>
              <p className="text-gray-600 mb-4">
                Choose a saved mapping to use, or create a new one
              </p>
              
              <div className="space-y-2 mb-4">
                <button
                  onClick={handleUseNewMapping}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 ${
                    selectedMappingId === null
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <Upload className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">New Mapping</div>
                      <div className="text-sm text-gray-500">
                        Auto-detect columns from your CSV
                      </div>
                    </div>
                  </div>
                </button>

                {savedMappings.map((savedMapping) => (
                  <button
                    key={savedMapping.id}
                    onClick={() => handleSelectMapping(savedMapping)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 ${
                      selectedMappingId === savedMapping.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{savedMapping.name}</div>
                        <div className="text-sm text-gray-500">
                          Date: {savedMapping.date_column}, Amount: {savedMapping.amount_column}
                          {savedMapping.balance_column && `, Balance: ${savedMapping.balance_column}`}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Created {new Date(savedMapping.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload File */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upload CSV File
              {selectedMappingId && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  (Using: {savedMappings.find(m => m.id === selectedMappingId)?.name})
                </span>
              )}
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Choose a CSV file
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-gray-500 text-sm mt-2">
                Upload your bank statement or transaction export
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && detectedStructure && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Map CSV Columns</h2>
          <p className="text-gray-600 mb-4">
            Review and adjust the column mappings detected from your CSV file.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mapping Name</label>
              <input
                type="text"
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date Column</label>
              <select
                value={mapping.dateColumn}
                onChange={(e) => setMapping({ ...mapping, dateColumn: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select column</option>
                {detectedStructure.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description Column</label>
              <select
                value={mapping.descriptionColumn}
                onChange={(e) => setMapping({ ...mapping, descriptionColumn: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select column</option>
                {detectedStructure.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount Column</label>
              <select
                value={mapping.amountColumn}
                onChange={(e) => setMapping({ ...mapping, amountColumn: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select column</option>
                {detectedStructure.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type Column (Optional)</label>
              <select
                value={mapping.typeColumn}
                onChange={(e) => setMapping({ ...mapping, typeColumn: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">None</option>
                {detectedStructure.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Balance Column (Optional)</label>
              <select
                value={mapping.balanceColumn}
                onChange={(e) => setMapping({ ...mapping, balanceColumn: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">None</option>
                {detectedStructure.headers.map((header: string) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                If your CSV includes running balance, select it here
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Import to Account (Optional)</label>
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">No specific account</option>
                {accounts.filter(a => a.is_active).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.institution || account.account_type}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Link these transactions to a specific bank account
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {detectedStructure.headers.map((header: string) => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detectedStructure.samples.slice(0, 3).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {detectedStructure.headers.map((header: string) => (
                        <td key={header} className="px-4 py-2 text-sm text-gray-900">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleConfirmMapping}
              disabled={!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountColumn}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Import</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <p className="text-sm text-blue-800">
                  You're about to import transactions from your CSV file. The system will automatically categorize transactions based on their descriptions.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date Column:</span>
              <span className="font-medium text-gray-900">{mapping.dateColumn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Description Column:</span>
              <span className="font-medium text-gray-900">{mapping.descriptionColumn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Column:</span>
              <span className="font-medium text-gray-900">{mapping.amountColumn}</span>
            </div>
            {mapping.typeColumn && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Type Column:</span>
                <span className="font-medium text-gray-900">{mapping.typeColumn}</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('map')}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Import Transactions
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          {importResult.success ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Import Complete!
              </h2>
              <p className="text-gray-600 mb-6">
                Successfully imported {importResult.imported} transactions.
                {importResult.failed > 0 && ` ${importResult.failed} failed.`}
              </p>
              <button
                onClick={() => router.push('/transactions')}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
              >
                View Transactions
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Import Failed
              </h2>
              <p className="text-gray-600 mb-6">{importResult.error}</p>
              <button
                onClick={() => setStep('upload')}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

