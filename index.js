const express = require('express');
const db = require('./db'); 
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { generateSummaryImage } = require('./img_gen');
const { body, validationResult } = require('express-validator');
require('dotenv').config();



const app = express();
app.use(express.json());
const PORT = process.env.PORT ||3000;



// server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });



// POST /countries/refresh
app.post('/countries/refresh', async(req, res)=>{
  let countriesResponse;
  let ratesResponse;
    try {
    const countriesAPI = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
    countriesResponse = await axios.get(countriesAPI, { timeout: 5000 });
    } 
    catch (error) {
      console.error('error fetching rest countries:', error.message);
    return res.status(503).json({ "error": "External data source unavailable",
                                  "details": "Could not fetch data from restcountries.com" });
    }

    try {
     const ratesAPI = 'https://open.er-api.com/v6/latest/USD';
     ratesResponse = await axios.get(ratesAPI, { timeout: 5000 });
      } 
      catch (error) {
        console.error('error fetching rate api:', error.message);
        return res.status(503).json({ 
          "error": "External data source unavailable", 
          "details": "Could not fetch data from open.er-api.com" 
      });

      }
      const countries = countriesResponse.data;
      const rates = ratesResponse.data.rates;

      // transform and combined data
      const processedCountries = countries.map(country => {
        let currencyCode = null;
        let exchangeRate = null;
        let estimatedGdp = 0;

        if (country.currencies && country.currencies.length > 0) {
          currencyCode = country.currencies[0].code;

          if (rates[currencyCode]) {
              exchangeRate = rates[currencyCode];
          } 
      }   
      //estimated gdp 
        if (country.population && exchangeRate){
            estimatedGdp = (country.population*Math.floor(Math.random()*1001)+1000)
                         /exchangeRate
        } else if(!currencyCode){
            estimatedGdp=0
          } else {
            estimatedGdp=null;
          }
      
        return{
          name: country.name,
          capital: country.capital || null, 
          region: country.region || null,
          population: country.population || 0,
          flag_url: country.flag || null,
          currency_code: currencyCode,
          exchange_rate: exchangeRate,
          estimated_gdp: estimatedGdp
      };
      });
      // map through all countries and run the query
        try {
          // 1. Map all countries to an array of arrays
          const allCountryValues = processedCountries.map(country => [
              country.name,
              country.capital,
              country.region,
              country.population,
              country.currency_code,
              country.exchange_rate,
              country.estimated_gdp,
              country.flag_url
          ]);


   const sql = `
        INSERT INTO countries (
            name, capital, region, population, currency_code, 
            exchange_rate, estimated_gdp, flag_url
        )
        VALUES ?  
        ON DUPLICATE KEY UPDATE
            capital = VALUES(capital),
            region = VALUES(region),
            population = VALUES(population),
            currency_code = VALUES(currency_code),
            exchange_rate = VALUES(exchange_rate),
            estimated_gdp = VALUES(estimated_gdp),
            flag_url = VALUES(flag_url),
            last_refreshed_at = NOW();
    `;

    // 3. Run the query ONCE with all values
    //    Note: The values are wrapped in an extra array: [allCountryValues]
    await db.query(sql, [allCountryValues]);

    // 4. Update Global Status (this part was already fine)
    const statusSql = `
        INSERT INTO app_status (id, last_refreshed_at)
        VALUES (1, NOW())
        ON DUPLICATE KEY UPDATE
            last_refreshed_at = NOW();
    `;
    await db.query(statusSql);

    // 5. Image generation (this part was also fine)
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM countries');
    const totalCountries = countRows[0].total;

    const [topCountries] = await db.query(
      'SELECT name, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5'
    );
    const lastRefreshed = new Date(); 
    await generateSummaryImage(totalCountries, topCountries, lastRefreshed);

    // 6. Send Final Response
    res.status(200).json({
        status: "success",
        message: "Countries cache refreshed successfully.",
        countries_processed: processedCountries.length
    });

    } catch (dbError) {
        console.error("Database save error:", dbError);
        res.status(500).json({ error: "Internal server error", details: "Failed to save data to database." });
      }
});



// GET /status endpoint health check
app.get('/status', async (req, res) => {
  try {
    const [countRows] = await db.query('SELECT COUNT(*) AS total_countries FROM countries');
    const total_countries = parseInt(countRows[0].total_countries);

    // Get the last refresh timestamp from 'app_status' table
    const [statusRows] = await db.query('SELECT last_refreshed_at FROM app_status WHERE id = 1');
    
    // Handle case where it hasn't been refreshed yet
    const last_refreshed_at = statusRows[0] ? statusRows[0].last_refreshed_at : null;

    // 3. Send the response in the format required by the task
    res.status(200).json({
      total_countries: total_countries,
      last_refreshed_at: last_refreshed_at
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service is unavailable',
      error: error.message
    });
  }
});



// GET /countries (with filtering and sorting)
app.get('/countries', async (req, res) => {
  try {
    const { region, currency, sort } = req.query;

    let baseQuery = 'SELECT * FROM countries';
    const whereClauses = [];
    const params = [];

    if (region) {
      whereClauses.push('region = ?');
      params.push(region);
    }

    if (currency) {
      whereClauses.push('currency_code = ?');
      params.push(currency);
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // --- Build ORDER BY clause for sorting ---
    if (sort) {
      // Whitelist of allowed sortable columns to prevent SQL injection
      const sortableColumns = {
        'name': 'name',
        'population': 'population',
        'gdp': 'estimated_gdp', 
        'region': 'region'
      };

      const [columnKey, sortOrder = 'asc'] = sort.toLowerCase().split('_');
      const safeColumn = sortableColumns[columnKey];
      const safeOrder = (sortOrder === 'desc') ? 'DESC' : 'ASC';

      // Only add to query if the column is in our whitelist
      if (safeColumn) {
        baseQuery += ` ORDER BY ${safeColumn} ${safeOrder}`;
      }
    }
    const [rows] = await db.query(baseQuery, params);
    
    res.status(200).json(rows);

  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// GET /countries/:name
app.get('/countries/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const query = 'SELECT * FROM countries WHERE name = ?';
    const [rows] = await db.query(query, [name]);

    // Check if we found a country
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.status(200).json(rows[0]);

  } catch (error) {
    console.error('Error fetching single country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /countries/:name
app.delete('/countries/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const query = 'DELETE FROM countries WHERE name = ?';
    const [rows] = await db.query(query, [name]);

    // Check if we found a country
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.status(200).json({ message: 'Country deleted successfully' });

  } catch (error) {
    console.error('Error deleting single country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /countries/image
app.get('/countries/image', (req, res) => {

  const imagePath = path.join(__dirname, 'cache', 'summary.png');

  // Check if the file exists
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: "Summary image not found" });
  }
});



// POST /countries (Create a new country)

// This array defines all our validation rules
const countryValidationRules = [
  body('name').notEmpty().withMessage('name is required'),
  body('population').isInt({ gt: 0 }).withMessage('population must be a positive integer'),
  body('currency_code').notEmpty().withMessage('currency_code is required'),
  body('capital').optional().isString(),
  body('region').optional().isString()
];


const countryUpdateValidationRules = [
  body('name').optional().notEmpty().withMessage('name cannot be empty'),
  body('population').optional().isInt({ gt: 0 }).withMessage('population must be a positive integer'),
  body('currency_code').optional().notEmpty().withMessage('currency_code cannot be empty'),
  body('capital').optional().isString(),
  body('region').optional().isString()
];


// POST new country creation 
app.post('/countries', countryValidationRules, async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = {};
    errors.array().forEach(err => {
      errorDetails[err.path] = err.msg;
    });

    return res.status(400).json({
      error: "Validation failed",
      details: errorDetails
    });
  }
  // If validation passes, get the data from the body
  const { 
    name, 
    capital, 
    region, 
    population, 
    currency_code, 
    exchange_rate, 
    estimated_gdp, 
    flag_url 
  } = req.body;

  try {
    const sql = `
      INSERT INTO countries 
      (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      name,
      capital || null,
      region || null,
      population,
      currency_code,
      exchange_rate || null,
      estimated_gdp || null,
      flag_url || null
    ];

    await db.query(sql, values);

    // We'll fetch it back to get the auto-generated ID and last_refreshed_at
    const [newCountry] = await db.query('SELECT * FROM countries WHERE name = ?', [name]);

    res.status(201).json(newCountry[0]); 

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A country with this name already exists' });
    }
    console.error('Error creating country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// PATCH /countries/:name (Update a country)
app.patch('/countries/:name', countryUpdateValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = {};
    errors.array().forEach(err => {
      errorDetails[err.path] = err.msg;
    });
    return res.status(400).json({
      error: "Validation failed",
      details: errorDetails
    });
  }

  try {
    const { name } = req.params;
    const updateFields = req.body;

    // Check if there's anything to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    // Dynamically build the SET part of the query
    const setClauses = [];
    const values = [];

    // Whitelist of allowed columns to prevent SQL injection
    const allowedUpdates = {
      'name': updateFields.name,
      'capital': updateFields.capital,
      'region': updateFields.region,
      'population': updateFields.population,
      'currency_code': updateFields.currency_code,
      'exchange_rate': updateFields.exchange_rate,
      'estimated_gdp': updateFields.estimated_gdp,
      'flag_url': updateFields.flag_url
    };

    for (const [column, value] of Object.entries(allowedUpdates)) {
      if (value !== undefined) {
        setClauses.push(`${column} = ?`);
        values.push(value);
      }
    }

    values.push(name);
    const sql = `UPDATE countries SET ${setClauses.join(', ')}, last_refreshed_at = NOW() WHERE name = ?`;
    
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const updatedName = updateFields.name || name; 
    const [updatedRows] = await db.query('SELECT * FROM countries WHERE name = ?', [updatedName]);

    res.status(200).json(updatedRows[0]);

  } catch (error) {
    // Handle duplicate name error (if they changed the name to an existing one)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A country with this name already exists' });
    }
    console.error('Error updating country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

