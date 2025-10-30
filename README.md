# Scholarship Management Portal

Backend: Node.js/Express + MySQL
Frontend: static files served from `public/`.

## Prerequisites
- Node.js 18+
- MySQL running and a database created
- `.env` file with:
```
PORT=5500
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
```

## Install & Run
```bash
npm install
node server.js
```
App runs at `http://localhost:5500`.

## API (examples)
- POST `/api/register`
- POST `/api/login`
- GET `/api/schemes`
- POST `/api/apply`

## Deploy/Host
Express serves static frontend from `public/` and API under `/api/*`.
