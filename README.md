# HNG Stage 2 - Country & Exchange Rate API

This is a RESTful API built for the HNG internship. It fetches country and currency exchange data, caches it in a MySQL database, and provides full CRUD operations to manage the data. It also generates and serves a summary image of the data.

## Features

* Fetches data from 2 external APIs (`restcountries.com` and `open.er-api.com`).
* Full CRUD (Create, Read, Update, Delete) endpoints for countries.
* Dynamic filtering and sorting on `GET /countries`.
* Generates a summary image on data refresh.
* Input validation for `POST` and `PATCH` requests.

## How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your database:**
    * Create a MySQL database.
    * Run the following SQL script to create the necessary tables:

    ```sql
    -- Add your SQL 'CREATE TABLE' scripts here
    -- e.g., CREATE TABLE countries ( ... );
    -- e.g., CREATE TABLE app_status ( ... );
    ```

4.  **Create your Environment File:**
    * Create a file named `.env` in the root of the project.
    * Add the following variables (based on your `db.js` file):

    ```ini
    # .env file
    DB_HOST=localhost
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_DATABASE=your_db_name
    PORT=3000
    ```

5.  **Start the server:**
    ```bash
    npm start
    ```

## API Endpoints

(It's good practice to list your endpoints here)

* `POST /countries/refresh`: Refreshes the database from external APIs.
* `GET /status`: Gets the data status.
* `GET /countries`: Gets all countries (supports `?region`, `?currency`, `?sort`).
* `POST /countries`: Creates a new country.
* `GET /countries/:name`: Gets a single country.
* `PATCH /countries/:name`: Updates a country.
* `DELETE /countries/:name`: Deletes a country.
* `GET /countries/image`: Serves the summary image.

## Dependencies

* express
* mysql2
* axios
* express-validator
* canvas
* dotenv
