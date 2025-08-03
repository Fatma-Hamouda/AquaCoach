# Smart Task Manager

A comprehensive Flask-based web application for intelligent task management with AI-powered scheduling, progress analytics, and productivity insights.

## Features

- **Task Management**: Create, edit, and organize tasks with categories and priorities
- **AI-Powered Scheduling**: Intelligent daily schedule generation based on task priority, deadlines, and estimated durations
- **Progress Analytics**: Visual dashboard with charts showing completion rates and productivity metrics
- **Category System**: Color-coded task categories for better organization
- **Time Tracking**: Estimated duration tracking and schedule optimization
- **User Authentication**: Secure user registration and login system
- **Responsive Design**: Modern, mobile-friendly interface with dark theme support

## Technology Stack

- **Backend**: Python 3.11, Flask, SQLAlchemy
- **Frontend**: Bootstrap 5, Chart.js, Feather Icons
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: Flask-Login with secure password hashing

## Getting Started

### Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd smart-task-manager
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install Flask Flask-SQLAlchemy Flask-Login Werkzeug psycopg2-binary python-dotenv gunicorn
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env file with your configuration
```

5. Initialize the database:
```bash
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

6. Run the application:
```bash
python main.py
```

The application will be available at `http://localhost:5000`

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

- `SECRET_KEY`: Flask secret key for session management
- `DATABASE_URL`: Database connection string
- `FLASK_ENV`: Environment (development/production)

### Database Options

**SQLite (Development)**:
```
DATABASE_URL=sqlite:///tasks.db
```

**PostgreSQL (Production)**:
```
DATABASE_URL=postgresql://username:password@localhost:5432/smart_task_manager
```

**MySQL**:
```
DATABASE_URL=mysql://username:password@localhost:3306/smart_task_manager
```

## Deployment

### Local Development
```bash
python main.py
```

### Production with Gunicorn
```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 main:app
```

### Docker Deployment
```bash
# Build image
docker build -t smart-task-manager .

# Run container
docker run -p 5000:5000 -e DATABASE_URL=your_db_url smart-task-manager
```

## Usage

1. **Register/Login**: Create an account or sign in to access your tasks
2. **Create Tasks**: Add tasks with titles, descriptions, categories, priorities, and due dates
3. **Generate Schedule**: Use the AI scheduler to create optimized daily plans
4. **Track Progress**: Monitor your productivity through the dashboard analytics
5. **Manage Categories**: Organize tasks with custom color-coded categories

## AI Scheduling Algorithm

The intelligent scheduling system considers:
- Task priority levels (1-5 scale)
- Due date urgency
- Estimated duration
- Available work hours
- Task dependencies and optimal time blocks
![Homepage](assets/Homepage.png)
## API Endpoints

### Authentication
- `POST /register` - User registration
![Register](assets/Register.png)
- `POST /Sign in` - User Sign-in
![Sign In](assets/Signin.png)
- `GET /logout` - User logout

### Tasks
- `GET /api/tasks` - Get all user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task
![Tasks](assets/Tasks.png)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
![Dashboard](assets/dashboard.png)

### Schedule
- `POST /api/schedule/generate` - Generate optimized schedule
- `GET /api/schedule/<date>` - Get schedule for specific date
![Schedule](assets/Schedul.png)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email your-email@example.com or create an issue in the repository.
