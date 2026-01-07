/**
 * Test script for budget period calculations
 * This verifies that the budget period functions work correctly
 */

const { 
  getCurrentBudgetPeriod, 
  getBudgetPeriod, 
  getRecentBudgetPeriods,
  formatBudgetPeriod 
} = require('../src/lib/budget-period.ts');

console.log('Testing Budget Period Calculations\n');
console.log('=' .repeat(60));

// Test Case 1: Budget starts on 1st (default - calendar month)
console.log('\n📅 Test 1: Budget starts on 1st (calendar month)');
console.log('-'.repeat(60));
const period1 = getCurrentBudgetPeriod(1, new Date('2024-01-15'));
console.log('Reference Date: 2024-01-15');
console.log('Period:', formatBudgetPeriod(period1));
console.log('Start:', period1.startStr, 'End:', period1.endStr);
console.log('Expected: Jan 1 - Jan 31, 2024');

// Test Case 2: Budget starts on 25th (typical payday)
console.log('\n📅 Test 2: Budget starts on 25th (payday)');
console.log('-'.repeat(60));
const period2 = getCurrentBudgetPeriod(25, new Date('2024-01-20'));
console.log('Reference Date: 2024-01-20 (before 25th)');
console.log('Period:', formatBudgetPeriod(period2));
console.log('Start:', period2.startStr, 'End:', period2.endStr);
console.log('Expected: Dec 25 - Jan 24 (previous period)');

const period3 = getCurrentBudgetPeriod(25, new Date('2024-01-26'));
console.log('\nReference Date: 2024-01-26 (after 25th)');
console.log('Period:', formatBudgetPeriod(period3));
console.log('Start:', period3.startStr, 'End:', period3.endStr);
console.log('Expected: Jan 25 - Feb 24 (current period)');

// Test Case 3: Budget starts on 31st (edge case)
console.log('\n📅 Test 3: Budget starts on 31st (edge case)');
console.log('-'.repeat(60));
const period4 = getCurrentBudgetPeriod(31, new Date('2024-02-15'));
console.log('Reference Date: 2024-02-15 (February - 28/29 days)');
console.log('Period:', formatBudgetPeriod(period4));
console.log('Start:', period4.startStr, 'End:', period4.endStr);
console.log('Expected: Handles month with < 31 days gracefully');

// Test Case 4: Multiple recent periods
console.log('\n📅 Test 4: Recent periods (last 6 months)');
console.log('-'.repeat(60));
const recentPeriods = getRecentBudgetPeriods(25, 6);
console.log('Budget Start Day: 25th');
console.log('Periods (most recent first):');
recentPeriods.forEach((period, index) => {
  console.log(`  ${index + 1}. ${formatBudgetPeriod(period)}`);
});

// Test Case 5: Historical period
console.log('\n📅 Test 5: Get specific historical period');
console.log('-'.repeat(60));
const lastPeriod = getBudgetPeriod(15, 1);
console.log('Budget Start Day: 15th, Periods Ago: 1 (last period)');
console.log('Period:', formatBudgetPeriod(lastPeriod));
console.log('Start:', lastPeriod.startStr, 'End:', lastPeriod.endStr);

console.log('\n' + '='.repeat(60));
console.log('✅ Budget Period Tests Completed!\n');

