# HNG Stage 2 - Country & Exchange Rate API

This is a RESTful API built for the HNG internship. It fetches country and currency exchange data, caches it in a MySQL database, and provides full CRUD operations to manage the data. It also generates and serves a summary image of the data.

This project is deployed on **Railway** and uses a remote **Aiven MySQL** database.

##  Live API Endpoints

The API is live and can be tested at the following endpoints.

* **Base URL:** `https://hng-task-two-production.up.railway.app`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | [`/countries/refresh`](https://hng-task-two-production.up.railway.app/countries/refresh) | **Run this first!** Populates the database. |
| `GET` | [`/status`](https://hng-task-two-production.up.railway.app/status) | Gets the data status (total countries, last refresh). |
| `GET` | [`/countries/image`](https://hng-task-two-production.up.railway.app/countries/image) | Serves the generated summary image. |
| `GET` | [`/countries`](https://hng-task-two-production.up.railway.app/countries) | Gets all countries. |
| `GET` | [`/countries/Nigeria`](https://hng-task-two-production.up.railway.app/countries/Nigeria) | Gets a single country by name. |
| `GET` | [`/countries?region=Africa&sort=gdp_desc`](https://hng-task-two-production.up.railway.app/countries?region=Africa&sort=gdp_desc) | Example of filtering and sorting. |

---

##  Features

* Fetches data from 2 external APIs (`restcountries.com` and `open.er-api.com`).
* Full CRUD (Create, Read, Update, Delete) endpoints for countries.
* Dynamic filtering and sorting on `GET /countries`.
* Generates a summary image on data refresh using `node-canvas`.
* Input validation for `POST` and `PATCH` requests using `express-validator`.
* Connects securely to a remote Aiven database using SSL.

---

##  How to Run Locally

### 1. Clone the Repository

```
git clone https://github.com/adewoye-saheed-dML/hng-task-two.git
cd hng-task-two
```
### 2\. Install Dependencies

```
 npm install 
```

### 3\. Set up Your Database

Create a MySQL database (local or remote). Run the following SQL scripts to create the necessary tables.

**countries table:**
```

CREATE TABLE countries (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL UNIQUE,
 capital VARCHAR(255),
 region VARCHAR(255),
 population BIGINT,
 currency_code VARCHAR(10),
 exchange_rate DECIMAL(20, 10),
 estimated_gdp DOUBLE,
 flag_url TEXT,
 last_refreshed_at TIMESTAMP NULL
 );   
```

**app\_status table:**

```  
 CREATE TABLE app_status (   
 id INT PRIMARY KEY, 
 last_refreshed_at TIMESTAMP NULL
 );   
```

### 4\. Create Your Environment File

Create a file named .env in the root of the project. The configuration below is for an Aiven-hosted database.

-  .env file 
-  Server Port  PORT=3000  
-  Aiven (or other remote MySQL)
####  Database Credentials
- DB_HOST=your-aiven-host.aivencloud.com  
- DB_PORT=your-aiven-port 
- DB_USER=avnadmin  
- DB_PASSWORD=your-aiven-password  
- DB_DATABASE=defaultdb 

#### Aiven SSL Certificate Authority  
- Go to your Aiven DB Overview -> "SSL" tab -> Download "CA Certificate" 
-  Open the .pem file, copy its full text content. 
-  IMPORTANT: Paste it as a single line, replacing all newlines with \n 

`
 DB_CA="-----BEGIN CERTIFICATE-----\nMI...[rest of certificate]...END CERTIFICATE-----\n" 
 `

### 5\. Start the Server

```
 npm start
```

The server will now be running at http://localhost:3000.

API Endpoint Reference
-------------------------

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/countries/refresh` | Fetches data from external APIs, calculates GDP, and saves to the DB. |
| `GET` | `/status` | Returns total countries and the last refresh timestamp. |
| `GET` | `/countries/image` | Serves a generated PNG image summary of the data. |
| `GET` | `/countries` | Returns a list of all countries. Supports query params: `?region=`, `?currency=`, `?sort=` (e.g., `gdp_desc`, `name_asc`). |
| `POST` | `/countries` | Creates a new country. Requires a JSON body with `name`, `population`, `currency_code`. |
| `GET` | `/countries/:name` | Gets a single country by its exact name. |
| `PATCH` | `/countries/:name` | Updates one or more fields of a specific country. |
| `DELETE` | `/countries/:name` | Deletes a country from the database. |


Dependencies
---------------

*   express
*   mysql2
*   axios
*   express-validator
*   canvas
*   dotenv
