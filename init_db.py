#!/usr/bin/env python3
"""
Database initialization script for Smart Task Manager
Creates all database tables and optionally seeds with sample data
"""

import os
import sys
from datetime import datetime, timedelta
from app import app, db
from models import User, Task, Category

def create_tables():
    """Create all database tables"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✓ Database tables created successfully")

def seed_sample_data():
    """Create sample data for demonstration"""
    with app.app_context():
        # Check if data already exists
        if User.query.first():
            print("Database already contains data. Skipping seed data.")
            return
        
        print("Creating sample user and data...")
        
        # Create demo user
        demo_user = User(
            username='demo',
            email='demo@example.com',
            timezone='UTC',
            work_start_hour=9,
            work_end_hour=17
        )
        demo_user.set_password('demo123')
        db.session.add(demo_user)
        db.session.flush()  # Get the user ID
        
        # Create categories
        categories = [
            Category(name='Work', color='#007bff', user_id=demo_user.id),
            Category(name='Personal', color='#28a745', user_id=demo_user.id),
            Category(name='Health', color='#dc3545', user_id=demo_user.id),
            Category(name='Learning', color='#ffc107', user_id=demo_user.id),
        ]
        
        for category in categories:
            db.session.add(category)
        
        db.session.flush()  # Get category IDs
        
        # Create sample tasks
        tomorrow = datetime.now() + timedelta(days=1)
        next_week = datetime.now() + timedelta(days=7)
        
        tasks = [
            Task(
                title='Complete project proposal',
                description='Finish the quarterly project proposal for the marketing team',
                due_date=tomorrow,
                estimated_duration=120,
                priority=5,
                status='todo',
                user_id=demo_user.id,
                category_id=categories[0].id  # Work
            ),
            Task(
                title='Review code submissions',
                description='Review and approve pending code submissions from team members',
                due_date=tomorrow,
                estimated_duration=90,
                priority=4,
                status='todo',
                user_id=demo_user.id,
                category_id=categories[0].id  # Work
            ),
            Task(
                title='Grocery shopping',
                description='Buy groceries for the week including vegetables and fruits',
                due_date=next_week,
                estimated_duration=60,
                priority=3,
                status='todo',
                user_id=demo_user.id,
                category_id=categories[1].id  # Personal
            ),
            Task(
                title='Morning workout',
                description='30-minute cardio session at the gym',
                estimated_duration=45,
                priority=4,
                status='todo',
                user_id=demo_user.id,
                category_id=categories[2].id  # Health
            ),
            Task(
                title='Read Python documentation',
                description='Study Flask advanced patterns and best practices',
                estimated_duration=90,
                priority=3,
                status='todo',
                user_id=demo_user.id,
                category_id=categories[3].id  # Learning
            ),
        ]
        
        for task in tasks:
            db.session.add(task)
        
        db.session.commit()
        print("✓ Sample data created successfully")
        print(f"Demo user created: username='demo', password='demo123'")

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == '--with-sample-data':
        create_tables()
        seed_sample_data()
    else:
        create_tables()
    
    print("\n🎉 Database initialization complete!")
    print("You can now run the application with: python main.py")

if __name__ == '__main__':
    main()