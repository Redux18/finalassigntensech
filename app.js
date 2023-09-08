const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Pantry API base URL
const pantryBaseUrl = 'https://getpantry.cloud/apiv1/pantry/';

// Endpoint for currency conversion
app.post('/convert', async (req, res) => {
  try {
    const { amount, from_currency, to_currencies } = req.body;

    if (!amount || !from_currency || !to_currencies || !Array.isArray(to_currencies)) {
      return res.status(400).json({ error: 'Invalid request data.' });
    }

    const conversionPromises = to_currencies.map(async (to_currency) => {
      const conversion = await convertCurrency(amount, from_currency, to_currency);
      return { from_currency, to_currency, amount, converted_amount: conversion.amount };
    });

    const conversions = await Promise.all(conversionPromises);

    return res.json({ conversions });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'An error occurred while converting currencies.' });
  }
});

// Function to convert currency using the currency-api
async function convertCurrency(amount, from_currency, to_currency) {
  const pantryId = 'YOUR_PANTRY_ID'; // Replace with your Pantry ID
  const basketKey = 'YOUR_BASKET_KEY'; // Replace with your Pantry Basket Key

  // Check if the conversion rate is cached in Pantry
  const pantryResponse = await axios.get(`${pantryBaseUrl}${pantryId}/basket/${basketKey}`);
  const cachedRates = pantryResponse.data || {};

  if (cachedRates[`${from_currency}_${to_currency}`]) {
    const conversion_rate = cachedRates[`${from_currency}_${to_currency}`];
    return { amount: amount * conversion_rate };
  } else {
    // If not cached, fetch the rate from currency-api
    const currencyApiResponse = await axios.get(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${from_currency}/${to_currency}.json`);

    if (currencyApiResponse.data && currencyApiResponse.data[to_currency]) {
      const conversion_rate = currencyApiResponse.data[to_currency];

      // Cache the conversion rate in Pantry for future use
      cachedRates[`${from_currency}_${to_currency}`] = conversion_rate;
      await axios.put(`${pantryBaseUrl}${pantryId}/basket/${basketKey}`, cachedRates);

      return { amount: amount * conversion_rate };
    } else {
      throw new Error('Currency conversion rate not found.');
    }
  }
}

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
