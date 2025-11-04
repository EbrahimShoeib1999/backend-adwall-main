# AddWall Backend API Documentation

This document provides a comprehensive overview of the AddWall backend API, including its architecture, authentication methods, error handling, and detailed descriptions of all available endpoints.

## Table of Contents
1.  [General Architecture & Workflow](#general-architecture--workflow)
2.  [Base URL](#base-url)
3.  [Authentication](#authentication)
4.  [Error Handling](#error-handling)
5.  [Endpoints](#endpoints)
    *   [1. Authentication (Auth)](#1-authentication-auth)
    *   [2. Companies](#2-companies)
    *   [3. Categories](#3-categories)
    *   [4. Users](#4-users)
    *   [5. Reviews](#5-reviews)
    *   [6. Plans](#6-plans)
    *   [7. Payments](#7-payments)
    *   [8. Sitemap](#8-sitemap)

---

## 1. General Architecture & Workflow

The AddWall backend is built using Node.js with the Express.js framework, following a modular, MVC-like (Model-View-Controller) structure.

### Core Components:
*   **`server.js`**: The application's entry point, responsible for setting up the Express app, connecting to the database, and mounting global middlewares and routes.
*   **`config/`**: Contains configuration files for the database connection and Passport.js strategies.
*   **`model/`**: Defines Mongoose schemas for database entities (e.g., User, Company, Category).
*   **`router/`**: Defines API routes and maps them to controller functions. `router/index.js` acts as a central route aggregator.
*   **`controllers/`**: Contains the business logic for handling requests, interacting with models, and preparing responses. Often referred to as "services" in this project (e.g., `authService.js`, `companyService.js`).
*   **`middlewares/`**: Houses reusable functions for request processing, such as authentication checks, error handling, image/video uploads, and input validation.
*   **`utils/`**: Provides utility functions like API error handling, email sending, token creation, and input validators.

### Request Workflow:
1.  **Request Reception**: An incoming HTTP request hits the `server.js`.
2.  **Global Middlewares**: Request passes through global middlewares (e.g., `cors`, `compression`, `express.json`, `passport.initialize`).
3.  **Routing**: The request is matched to a specific route defined in the `router/` directory.
4.  **Route-Specific Middlewares**: Any middlewares specific to that route (e.g., `auth.protect`, `auth.allowedTo`, validation middlewares, upload middlewares) are executed.
5.  **Controller/Service Logic**: The request reaches the corresponding controller function (e.g., `authService.login`, `companyService.createCompany`). This function contains the core business logic, interacts with the database via Mongoose models, and prepares the response.
6.  **Response**: The controller sends an HTTP response back to the client.
7.  **Error Handling**: If any error occurs at any stage, it is caught by the `errorMiddleware.js` for centralized processing and a consistent error response.

---

## 2. Base URL

`http://localhost:8000/api/v1` (or your deployed API URL)

---

## 3. Authentication

Most endpoints require authentication using a JSON Web Token (JWT). To authenticate, include the JWT in the `Authorization` header of your request:

`Authorization: Bearer <YOUR_JWT_TOKEN>`

### Obtaining a Token

Use the `/api/v1/auth/login` or `/api/v1/auth/signup` endpoints to obtain a JWT.

### Social Login (Google & Facebook)

The API supports social login via Google and Facebook using Passport.js.

*   **Configuration**: Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `FRONTEND_URL` are set in your `.env` file.
*   **Workflow**:
    1.  Frontend redirects user to the respective social login endpoint (e.g., `/api/v1/auth/google`).
    2.  User authenticates with Google/Facebook.
    3.  Social provider redirects back to the backend's `callbackURL`.
    4.  Backend processes the user data (creates new user or links existing one), generates a JWT, and redirects back to the `FRONTEND_URL` with the token.

#### `GET /auth/google`

*   **Description:** Initiates Google OAuth flow.
*   **Access:** Public
*   **Redirects to:** Google login page.

#### `GET /auth/google/callback`

*   **Description:** Handles the callback from Google OAuth. Do not call directly from frontend.
*   **Access:** Public (handled by Google redirect)
*   **Redirects to:** `FRONTEND_URL/login-success?token=<JWT_TOKEN>` on success.

#### `GET /auth/facebook`

*   **Description:** Initiates Facebook OAuth flow.
*   **Access:** Public
*   **Redirects to:** Facebook login page.

#### `GET /auth/facebook/callback`

*   **Description:** Handles the callback from Facebook OAuth. Do not call directly from frontend.
*   **Access:** Public (handled by Facebook redirect)
*   **Redirects to:** `FRONTEND_URL/login-success?token=<JWT_TOKEN>` on success.

---

## 4. Error Handling

Errors are returned with an appropriate HTTP status code and a consistent JSON body. The `errorMiddleware.js` handles all errors centrally.

```json
{
  "status": "fail" || "error", // "fail" for operational errors (e.g., validation), "error" for programming errors
  "message": "A descriptive error message"
}
```

### Validation Errors:
When input validation fails (e.g., using `express-validator`), the `message` field will typically contain details about the validation failures.

```json
{
  "status": "fail",
  "message": "Validation Error: Company name is required, Invalid email address"
}
```

---

## 5. Endpoints

---

### 1. Authentication (Auth)

#### `POST /auth/signup`

*   **Description:** Registers a new user.
*   **Access:** Public
*   **Request Body:**
    ```json
    {
      "name": "string",
      "email": "string (email format)",
      "password": "string (min 6 chars)",
      "passwordConfirm": "string (must match password)"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "_id": "string",
        "name": "string",
        "email": "string",
        "role": "user",
        "lastLogin": "date",
        "createdAt": "date",
        "updatedAt": "date",
        "__v": 0
      },
      "token": "string (JWT)"
    }
    ```

#### `POST /auth/login`

*   **Description:** Logs in an existing user and returns a JWT.
*   **Access:** Public
*   **Request Body:**
    ```json
    {
      "email": "string (email format)",
      "password": "string"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "_id": "string",
        "name": "string",
        "email": "string",
        "role": "user",
        "lastLogin": "date",
        "createdAt": "date",
        "updatedAt": "date",
        "__v": 0
      },
      "token": "string (JWT)"
    }
    ```

#### `POST /auth/forgotPassword`

*   **Description:** Initiates the password reset process by sending a reset code to the user's email.
*   **Access:** Public
*   **Request Body:**
    ```json
    {
      "email": "string (email format)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "Reset code sent to email"
    }
    ```

#### `POST /auth/verifyResetCode`

*   **Description:** Verifies the password reset code received via email.
*   **Access:** Public
*   **Request Body:**
    ```json
    {
      "resetCode": "string (6-digit code)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success"
    }
    ```

#### `POST /auth/resetPassword`

*   **Description:** Resets the user's password after successful verification of the reset code.
*   **Access:** Public
*   **Request Body:**
    ```json
    {
      "email": "string (email format)",
      "newPassword": "string (min 6 chars)",
      "passwordConfirm": "string (must match newPassword)"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "token": "string (JWT)"
    }
    ```

---

### 2. Companies

#### `POST /companies`

*   **Description:** Creates a new company listing. Requires authentication.
*   **Access:** Authenticated Users
*   **Validation:** Input is validated using `companyValidator.js` (e.g., `companyName`, `description`, `email`, `categoryId` are required).
*   **Request Body (multipart/form-data):**
    *   `logo`: File (image for company logo) - **Required**
    *   `companyName`: string - **Required**
    *   `companyNameTr`: string - **Required**
    *   `description`: string - **Required**
    *   `descriptionTr`: string - **Required**
    *   `country`: string - **Required**
    *   `city`: string - **Required**
    *   `email`: string (email format) - **Required**
    *   `categoryId`: string (MongoDB ObjectId) - **Required**
    *   `whatsapp`: string (optional, valid phone number format)
    *   `website`: string (optional, URL format)
*   **Success Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "_id": "string",
        "companyName": "string",
        "slug": "string",
        "description": "string",
        "logo": "string (URL)",
        "country": "string",
        "city": "string",
        "email": "string",
        "isApproved": false,
        "adType": "normal",
        "ratingsAverage": 0,
        "ratingsQuantity": 0,
        "userId": "string (ObjectId)",
        "categoryId": "string (ObjectId)",
        "views": 0,
        "createdAt": "date",
        "updatedAt": "date",
        "__v": 0
      }
    }
    ```

#### `GET /companies`

*   **Description:** Retrieves a list of all approved companies. Can be filtered.
*   **Access:** Public
*   **Query Parameters:** (e.g., `?isApproved=false` for admin to get pending companies)
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": "number",
      "data": [
        { /* Company Object */ }
      ]
    }
    ```

#### `GET /companies/:id`

*   **Description:** Retrieves a single company by ID.
*   **Access:** Public
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": { /* Company Object */ }
    }
    ```

#### `PUT /companies/:id`

*   **Description:** Updates an existing company. Only the company owner or an admin can update.
*   **Access:** Authenticated (Owner or Admin)
*   **Request Body (multipart/form-data):** (Similar to `POST /companies`, but fields are optional for update)
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": { /* Updated Company Object */ }
    }
    ```

#### `DELETE /companies/:id`

*   **Description:** Deletes a company. **Secured:** Only the company owner or an admin can delete.
*   **Access:** Authenticated (Owner or Admin)
*   **Success Response (204 No Content):** (Empty body)

#### `PATCH /companies/:id/approve`

*   **Description:** Approves a pending company. Only accessible by administrators. Sends an email notification to the company owner upon approval.
*   **Access:** Admin
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "تمت الموافقة على الشركة بنجاح",
      "data": { /* Approved Company Object */ }
    }
    ```

#### `GET /companies/user/:userId`

*   **Description:** Retrieves all companies belonging to a specific user. User can only access their own companies unless they are an admin.
*   **Access:** Authenticated (Owner or Admin)
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": "number",
      "data": [
        { /* Company Object */ }
      ]
    }
    ```

#### `GET /companies/user/:userId/company/:companyId`

*   **Description:** Retrieves a specific company belonging to a specific user. User can only access their own companies unless they are an admin.
*   **Access:** Authenticated (Owner or Admin)
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": { /* Company Object */ }
    }
    ```

#### `GET /companies/user/:userId/status/:status`

*   **Description:** Retrieves a user's companies filtered by their approval status (approved/pending). User can only access their own companies unless they are an admin.
*   **Access:** Authenticated (Owner or Admin)
*   **Path Parameters:**
    *   `status`: `approved` or `pending`
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "results": "number",
      "data": [
        { /* Company Object */ }
      ]
    }
    ```

#### `PATCH /companies/:id/view`

*   **Description:** Increments the view count for a specific company.
*   **Access:** Public
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "message": "View count incremented"
    }
    ```

#### `PATCH /companies/:id/video`

*   **Description:** Uploads and processes a video for a VIP company ad. Only accessible by administrators.
*   **Access:** Admin
*   **Request Body (multipart/form-data):**
    *   `video`: File (video file)
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": { /* Updated Company Object with video URL */ }
    }
    ```

---

### 3. Categories

*Note: Endpoints for Categories are present in the routing but not detailed here. They typically involve CRUD operations for managing company categories.*

---

### 4. Users

*Note: Endpoints for Users are present in the routing but not detailed here. They typically involve CRUD operations for managing user profiles (excluding authentication which is in Auth section).*

---

### 5. Reviews

*Note: Endpoints for Reviews are present in the routing but not detailed here. They typically involve CRUD operations for managing user reviews on companies.*

---

### 6. Plans

*Note: Endpoints for Plans are present in the routing but not detailed here. They typically involve CRUD operations for managing subscription plans.*

---

### 7. Payments

*Note: Endpoints for Payments are present in the routing but not detailed here. They handle payment processing, likely via Stripe webhooks.*

---

### 8. Sitemap

*Note: Endpoints for Sitemap are present in the routing but not detailed here. They are likely used to generate XML sitemaps for SEO purposes.*

---

**Note:** This documentation provides a detailed overview. For a 100% guarantee of logical correctness and absence of errors, comprehensive automated testing is essential.