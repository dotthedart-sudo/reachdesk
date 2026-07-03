import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'reachdesk_local_currency_data_mock_pk';
const TIMEOUT_MS = 3000;

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export function useLocalCurrency() {
  const [currencyData, setCurrencyData] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached currency data:', e);
    }
    return { currency: null, rate: null, enabled: false, country: null };
  });

  useEffect(() => {
    if (currencyData.currency || currencyData.country) return;

    let isMounted = true;

    async function detectAndFetchRates() {
      try {
        const currency = 'PKR';
        const country = 'PK';

        if (!currency || currency === 'USD' || country === 'US') {
          const result = { currency: currency || null, rate: null, enabled: false, country: country || null };
          if (isMounted) {
            setCurrencyData(result);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
          }
          return;
        }

        // 2. Fetch exchange rates relative to USD
        const ratesResponse = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/USD');
        const ratesData = await ratesResponse.json();
        
        const rate = ratesData.rates ? ratesData.rates[currency] : null;

        if (rate) {
          const enabled = (currency !== 'PKR' && currency !== 'BDT' && country !== 'PK' && country !== 'BD');
          const result = { currency, rate, enabled, country };
          if (isMounted) {
            setCurrencyData(result);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
          }
        } else {
          throw new Error(`Rate not found for currency: ${currency}`);
        }
      } catch (err) {
        // Fail silently as required
        console.warn('Silent fallback: Local currency auto-detection failed:', err.message);
        const result = { currency: null, rate: null, enabled: false, country: null };
        if (isMounted) {
          setCurrencyData(result);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
        }
      }
    }

    detectAndFetchRates();

    return () => {
      isMounted = false;
    };
  }, [currencyData.currency, currencyData.country]);

  const formatLocalPrice = (usdAmount) => {
    if (!currencyData.enabled || !currencyData.rate || !currencyData.currency) return null;
    const num = parseFloat(usdAmount);
    if (isNaN(num)) return null;
    const converted = num * currencyData.rate;
    // Format to 2 decimal places if it has fractional part, or 0 if integer-ish
    const formatted = converted % 1 === 0 ? converted.toFixed(0) : converted.toFixed(2);
    return `≈ ${currencyData.currency} ${formatted}`;
  };

  return {
    currency: currencyData.currency,
    rate: currencyData.rate,
    enabled: currencyData.enabled,
    country: currencyData.country,
    formatLocalPrice
  };
}
