@echo off
echo ========================================
echo Smart Task Manager - Windows Setup
echo ========================================
echo.

echo Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Error: Failed to create virtual environment. Make sure Python is installed.
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing dependencies...
pip install Flask Flask-SQLAlchemy Flask-Login Werkzeug psycopg2-binary python-dotenv gunicorn
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

echo Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo Environment file created. You can edit .env if needed.
)

echo Initializing database...
python init_db.py --with-sample-data
if errorlevel 1 (
    echo Error: Failed to initialize database.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Make sure virtual environment is activated: venv\Scripts\activate
echo 2. Run: python main.py
echo 3. Open browser to: http://localhost:5000
echo.
echo Demo account created:
echo Username: demo
echo Password: demo123
echo.
pause