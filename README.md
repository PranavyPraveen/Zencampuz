# ZencampuZ - Intelligent Campus OS

A clean modular monolith for Indian higher education institutions.

## Prerequisites
- PostgreSQL running locally
- Python 3.10+
- Node.js 18+

## Local Setup

### Database
1. Create a PostgreSQL database named `zencampuz`

### Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp ../.env.example .env
npm run dev
```
