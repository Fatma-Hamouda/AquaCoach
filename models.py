from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    timezone = db.Column(db.String(50), default='UTC')
    work_start_hour = db.Column(db.Integer, default=9)
    work_end_hour = db.Column(db.Integer, default=17)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='user', lazy=True, cascade='all, delete-orphan')
    categories = db.relationship('Category', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    color = db.Column(db.String(7), default='#007bff')  # Hex color
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='category', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'

class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    estimated_duration = db.Column(db.Integer, default=60)  # in minutes
    priority = db.Column(db.Integer, default=3)  # 1-5 scale (1=lowest, 5=highest)
    status = db.Column(db.String(20), default='todo')  # todo, in-progress, done
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def mark_completed(self):
        self.status = 'done'
        self.completed_at = datetime.utcnow()
    
    def get_urgency_score(self):
        """Calculate urgency based on days until due date"""
        if not self.due_date:
            return 1
        
        days_until_due = (self.due_date - datetime.utcnow()).days
        if days_until_due <= 0:
            return 10  # Overdue
        elif days_until_due == 1:
            return 8
        elif days_until_due <= 3:
            return 6
        elif days_until_due <= 7:
            return 4
        else:
            return 2
    
    def get_priority_score(self):
        """Get normalized priority score"""
        return self.priority
    
    def get_duration_penalty(self):
        """Get penalty based on duration (longer tasks get slight penalty)"""
        hours = self.estimated_duration / 60
        if hours > 4:
            return 2
        elif hours > 2:
            return 1
        else:
            return 0
    
    def calculate_score(self):
        """Calculate overall task score for scheduling"""
        urgency = self.get_urgency_score()
        priority = self.get_priority_score()
        duration_penalty = self.get_duration_penalty()
        
        # Weighted scoring formula
        score = (urgency * 0.4) + (priority * 0.5) - (duration_penalty * 0.1)
        return score
    
    def __repr__(self):
        return f'<Task {self.title}>'

class Schedule(db.Model):
    __tablename__ = 'schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    schedule_date = db.Column(db.Date, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='schedules')
    task = db.relationship('Task', backref='schedule_entries')
    
    def __repr__(self):
        return f'<Schedule {self.schedule_date} - {self.task.title}>'
