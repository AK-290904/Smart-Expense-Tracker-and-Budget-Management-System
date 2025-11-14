# Smart Expense Tracker and Budget Management System

A full-stack web application for intelligent database management with chatbot integration, analytics, and a user-friendly web interface.

---

## Features

### Core Features

* Secure user authentication (JWT-based)
* Database setup and management (MySQL + SQLAlchemy)
* AI Chatbot for natural language queries
* Analytics dashboard with visual insights
* Query execution and transaction history
* Role-based access control (Admin/User)

### Advanced Features

* Conversational database assistant
* Real-time analytics and query optimization
* Smart suggestions for schema design and queries
* Dark/Light theme toggle
* Responsive modern UI

---

## Tech Stack

### Backend

* Framework: **Flask 3.0+**
* Database: **MySQL 8.0+**
* ORM: **SQLAlchemy**
* Authentication: **JWT (Flask-JWT-Extended)**
* Validation: **Marshmallow**
* Migrations: **Flask-Migrate**

### Frontend

* Framework: **React 18+**
* Routing: **React Router v6**
* HTTP Client: **Axios**
* Charts: **Recharts / Chart.js**
* Icons: **Lucide React**
* Styling: **TailwindCSS + CSS Variables**

---

## Project Structure

```
smart_expense_tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth/
│   │   ├── chatbot/
│   │   ├── analytics/
│   │   ├── utils/
│   │   └── routes/
│   ├── migrations/
│   ├── setup_database.sql
│   ├── setup_env.py
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── chatbot/
│   │   ├── analytics/
│   │   └── App.js
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

* Python 3.9+
* Node.js 16+
* MySQL 8.0+

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

#### Configure Environment

Create a `.env` file in the backend directory:

```bash
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=mysql+pymysql://username:password@localhost/intellidb
CORS_ORIGINS=http://localhost:3000
```

#### Initialize Database

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

#### Run Backend

```bash
flask run
```

Backend runs on: [**http://localhost:5000**](http://localhost:5000)

---

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in frontend directory:

```bash
REACT_APP_API_URL=http://localhost:5000/api/v1
```

Run Frontend:

```bash
npm start
```

Frontend runs on: [**http://localhost:3000**](http://localhost:3000)

---

## API Endpoints

### Authentication

* POST /api/v1/auth/register — Register new user
* POST /api/v1/auth/login — Login user
* POST /api/v1/auth/refresh — Refresh token
* GET /api/v1/auth/profile — Get user profile

### Chatbot

* POST /api/v1/chatbot/query — Process user query
* GET /api/v1/chatbot/history — Chat history

### Database Management

* GET /api/v1/db/tables — Fetch all tables
* POST /api/v1/db/query — Execute SQL query

### Analytics

* GET /api/v1/analytics/overview — Summary insights
* GET /api/v1/analytics/trends — Query usage trends
* GET /api/v1/analytics/top-queries — Top executed queries

---

## Key Design Decisions

### Chatbot NLP Integration

* Converts natural language → SQL queries
* Uses OpenAI API / LLM-based backend module
* Caches responses for faster repeated queries

### Authentication Flow

* JWT access + refresh tokens
* Access token (15 min), Refresh token (30 days)
* Secure storage using httpOnly cookies

### State Management

* React Context for authentication + theme
* Local state for chatbot and analytics
* Optimistic updates for better UX

### Theme System

* TailwindCSS with CSS variables
* Dark/Light mode toggle
* User preference saved in database

---

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## Deployment

### Backend (Production)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Frontend (Production)

```bash
npm run build
```

Serve the `build/` folder with Nginx or Apache.

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**.

---

## Acknowledgments

* Flask documentation
* React documentation
* TailwindCSS
* Chart.js community
* OpenAI API / NLP Research

---

