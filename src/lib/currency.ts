/**
 * Currency formatting utilities
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  BRL: 'R$',
  ZAR: 'R',
  RUB: '₽',
  KRW: '₩',
  MXN: 'Mex$',
};

export const CURRENCY_POSITIONS: Record<string, 'before' | 'after'> = {
  USD: 'before',
  EUR: 'before',
  GBP: 'before',
  SEK: 'after',
  NOK: 'after',
  DKK: 'after',
  JPY: 'before',
  CNY: 'before',
  INR: 'before',
  CAD: 'before',
  AUD: 'before',
  CHF: 'before',
  BRL: 'before',
  ZAR: 'before',
  RUB: 'after',
  KRW: 'before',
  MXN: 'before',
};

/**
 * Format an amount with the appropriate currency symbol
 * @param amount - The numeric amount
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'SEK')
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options: {
    showSymbol?: boolean;
    decimals?: number;
    locale?: string;
  } = {}
): string {
  const {
    showSymbol = true,
    decimals = 2,
    locale,
  } = options;

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const position = CURRENCY_POSITIONS[currency] || 'before';
  
  // Format the number with appropriate locale
  let formattedAmount: string;
  
  if (locale) {
    formattedAmount = amount.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    // Use a default locale based on currency
    const defaultLocale = getDefaultLocaleForCurrency(currency);
    formattedAmount = amount.toLocaleString(defaultLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (!showSymbol) {
    return formattedAmount;
  }

  if (position === 'after') {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol}${formattedAmount}`;
  }
}

/**
 * Get the default locale for a currency
 */
function getDefaultLocaleForCurrency(currency: string): string {
  const localeMap: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE', // German uses comma as decimal separator
    GBP: 'en-GB',
    SEK: 'sv-SE',
    NOK: 'nb-NO',
    DKK: 'da-DK',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    INR: 'en-IN',
    CAD: 'en-CA',
    AUD: 'en-AU',
    CHF: 'de-CH',
    BRL: 'pt-BR',
    ZAR: 'en-ZA',
    RUB: 'ru-RU',
    KRW: 'ko-KR',
    MXN: 'es-MX',
  };
  
  return localeMap[currency] || 'en-US';
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Parse currency string to number (handles different formats)
 */
export function parseCurrencyString(str: string): number {
  // Remove currency symbols and spaces
  let cleaned = str.replace(/[^0-9.,-]/g, '').trim();
  
  // Detect format and convert to standard number
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  
  if (hasComma && hasPeriod) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');
    
    if (lastComma > lastPeriod) {
      // European format
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasPeriod) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return parseFloat(cleaned) || 0;
}

