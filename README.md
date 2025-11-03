# Scholarship Management Portal

A comprehensive full-stack scholarship management system built with Node.js, Express, MySQL, and vanilla JavaScript. This portal allows students to browse, search, and apply for scholarships while administrators can manage applications and track statistics.

## Features

### Student Features
- **Browse Scholarships** - Search and filter scholarships by name, academic year, type, category, and international eligibility
- **Detailed Scheme Information** - View comprehensive eligibility criteria, descriptions, deadlines, and award amounts
- **Multi-step Application Process** - Intuitive 5-step application form with:
  - Personal & contact details
  - Family & income information
  - Educational qualifications
  - Extracurricular activities
  - Document upload support
- **Application Tracking** - View all submitted applications with real-time status updates
- **User Profile** - Manage personal information and account settings
- **Secure Authentication** - Password hashing with bcryptjs

### Admin Features
- **Dashboard Statistics** - View total users, schemes, and pending applications
- **Application Management** - Review and approve/reject pending applications
- **Application Details** - Access comprehensive application information with uploaded documents
- **Database Views** - Optimized queries for pending applications

## Technology Stack

**Backend:**
- Node.js with Express.js
- MySQL with connection pooling
- bcryptjs for password hashing
- multer for file uploads
- CORS enabled

**Frontend:**
- Vanilla JavaScript (no frameworks)
- Responsive CSS with modern design
- Single Page Application (SPA) architecture
- RESTful API integration

**Database:**
- MySQL with the following key tables:
  - `users` - User accounts and authentication
  - `schemes` - Scholarship scheme information
  - `applications` - Application submissions
  - `documents` - Uploaded application documents
  - `v_admin_applications` - Database view for admin queries

## Prerequisites

- **Node.js** 18+ installed
- **MySQL** server running with a database created
- **Database setup** - The application expects a MySQL database with the following tables:
  - users (id, name, email, password_hash, age, gender, role)
  - schemes (id, scheme_name, scholarship_name, amount, academic_year, type, category, etc.)
  - applications (id, user_id, scheme_id, application_date, status, data_json, etc.)
  - documents (id, application_id, doc_type, filename)
  - v_admin_applications (database view)

## Installation

1. **Clone or download the project**
   ```bash
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database**
   - Edit `server.js` lines 36-40 to match your MySQL credentials:
   ```javascript
   const dbConfig = {
       host: "localhost",
       user: "your_user",
       password: "your_password", 
       database: "your_database" 
   };
   ```
   
   **Note:** Currently the database credentials are hardcoded in `server.js`. For production, move these to environment variables.

4. **Create uploads directory** (if it doesn't exist)
   ```bash
   mkdir uploads
   ```

5. **Start the server**
   ```bash
   node server.js
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:5500`

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
  - Body: `{ name, email, password, age?, gender? }`
- `POST /api/login` - Login user
  - Body: `{ email, password }`

### Schemes
- `GET /api/schemes` - Get all schemes with optional filters
  - Query params: `q`, `academic_year`, `type`, `category`, `international`
- `GET /api/schemes/:id` - Get specific scheme details

### Applications
- `POST /api/apply` - Submit scholarship application (multipart/form-data)
  - Fields: `data` (JSON string), `photo` (file), `mark10` (file)
- `GET /api/my-applications/:userId` - Get user's applications
- `GET /api/application/:id` - Get specific application details with documents

### Admin
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/pending-applications` - Get pending applications
- `POST /api/admin/application/:id/approve` - Approve application
- `POST /api/admin/application/:id/reject` - Reject application

## Database Features

This project demonstrates various database management concepts:

1. **DML Operations** - User registration and data insertion
2. **Aggregate Functions** - Statistical queries for admin dashboard
3. **Transactions (TCL)** - Application submission with atomicity guarantees
4. **Set Operations** - Complex scheme filtering with IN operations
5. **Arithmetic Operations** - Age calculations and percentage conversions
6. **JOINs** - Combining user, application, and scheme data
7. **Subqueries** - Nested queries for application statistics
8. **Views** - Pre-defined queries for admin pending applications
9. **Triggers** - Automatic actions on application status changes (implemented in database)

## Project Structure

```
project/
├── public/
│   └── index.html          # Frontend SPA (single file with HTML, CSS, JS)
├── uploads/                # Storage for uploaded documents
├── server.js               # Express backend with MySQL integration
├── package.json            # Node.js dependencies
├── package-lock.json       # Dependency lock file
└── README.md              # This file
```

## Key Features in Code

### Frontend (public/index.html)
- **Responsive Design** - Modern gradient UI with card-based layout
- **Dynamic Navigation** - Role-based menu items
- **Multi-step Forms** - Step indicator and progress tracking
- **Real-time Updates** - Automatic data refresh on navigation
- **Error Handling** - User-friendly error messages and alerts

### Backend (server.js)
- **Connection Pooling** - Efficient database connection management
- **Input Validation** - Server-side validation for all inputs
- **File Upload Handling** - Multer integration for document processing
- **Transaction Support** - Atomic application submissions
- **SQL Injection Prevention** - Parameterized queries throughout
- **Error Handling** - Comprehensive try-catch blocks with appropriate HTTP status codes

## Usage

1. **As a Student:**
   - Register for a new account or login
   - Browse available scholarships using filters
   - Click "View" on any scheme to see details
   - Click "Apply Now" to start the application process
   - Complete all 5 steps of the application form
   - Upload required documents (photo is mandatory)
   - Track your application status in "My Applications"

2. **As an Admin:**
   - Login with an admin account
   - Access the Admin Dashboard
   - View statistics and pending applications
   - Review, approve, or reject applications
   - View detailed application information

## Troubleshooting

### Server Won't Start
- **Issue:** Database connection error
- **Solution:** Verify MySQL is running and credentials in `server.js` are correct
- Check terminal for: `✅ Connected to MySQL database!`

### Port Already in Use
- **Issue:** `EADDRINUSE` error
- **Solution:** 
  - Stop other applications on port 5500, or
  - Modify line 305 in `server.js` to use a different port

### Frontend Not Loading
- **Issue:** Opening `file:///` protocol or directly opening HTML
- **Solution:** Always access via `http://localhost:5500` after starting the server
- The Express server serves both API and static files

### Uploads Not Working
- **Issue:** `uploads/` directory missing or permissions issue
- **Solution:** Create the `uploads` folder in project root with write permissions

### API Calls Failing
- **Issue:** Network errors or 404 responses
- **Solution:**
  - Ensure server is running (`node server.js`)
  - Check browser console (F12) for detailed errors
  - Verify API endpoints match frontend requests
  - Check CORS settings if accessing from different origin

## Important Notes

- **Security:** Currently uses hardcoded database credentials. For production:
  - Move credentials to `.env` file
  - Use environment variables with `dotenv`
  - Implement JWT or session-based authentication
  - Add rate limiting and CSRF protection
  
- **File Uploads:** Documents are stored locally in `uploads/`. For production:
  - Consider cloud storage (S3, etc.)
  - Implement file validation and size limits
  - Add virus scanning

- **Password Security:** Uses bcryptjs with salt rounds of 10, ensuring secure password storage

## Development

**Server:** The backend runs on port 5500 (configurable in `server.js`)

**Database:** MySQL with connection pooling for efficiency

**Hot Reload:** Not configured. Restart server after changes with `node server.js`

## License

ISC

## Author

Created for DBMS course project