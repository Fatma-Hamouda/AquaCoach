from flask import render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime, date, timedelta
from app import app, db
from models import User, Task, Category, Schedule
from scheduler import TaskScheduler
from utils import get_task_stats, get_category_stats

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered. Please login instead.', 'error')
            return redirect(url_for('login'))
        
        existing_username = User.query.filter_by(username=username).first()
        if existing_username:
            flash('Username already taken. Please choose another.', 'error')
            return render_template('register.html')
        
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        # Create default categories
        default_categories = [
            {'name': 'Work', 'color': '#007bff'},
            {'name': 'Personal', 'color': '#28a745'},
            {'name': 'Health', 'color': '#dc3545'},
            {'name': 'Learning', 'color': '#ffc107'}
        ]
        
        for cat_data in default_categories:
            category = Category(name=cat_data['name'], color=cat_data['color'], user_id=user.id)
            db.session.add(category)
        
        db.session.commit()
        
        login_user(user)
        flash('Registration successful! Welcome to Smart Task Manager.', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            flash(f'Welcome back, {user.username}!', 'success')
            return redirect(next_page) if next_page else redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get task statistics
    stats = get_task_stats(current_user.id)
    category_stats = get_category_stats(current_user.id)
    
    # Get recent tasks
    recent_tasks = Task.query.filter_by(user_id=current_user.id)\
                            .order_by(Task.updated_at.desc())\
                            .limit(5).all()
    
    # Get today's schedule
    today = date.today()
    today_schedule = Schedule.query.filter_by(user_id=current_user.id, schedule_date=today)\
                                  .order_by(Schedule.start_time).all()
    
    return render_template('dashboard.html', 
                         stats=stats, 
                         category_stats=category_stats,
                         recent_tasks=recent_tasks,
                         today_schedule=today_schedule)

@app.route('/tasks')
@login_required
def tasks():
    # Get filter parameters
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    
    # Build query
    query = Task.query.filter_by(user_id=current_user.id)
    
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    
    if category_filter != 'all':
        query = query.filter_by(category_id=int(category_filter))
    
    tasks = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).all()
    categories = Category.query.filter_by(user_id=current_user.id).all()
    
    return render_template('tasks.html', tasks=tasks, categories=categories, 
                         status_filter=status_filter, category_filter=category_filter)

@app.route('/schedule')
@login_required
def schedule():
    # Get date parameter or default to today
    date_str = request.args.get('date', date.today().isoformat())
    try:
        schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        schedule_date = date.today()
    
    # Get existing schedule for the date
    existing_schedule = Schedule.query.filter_by(user_id=current_user.id, schedule_date=schedule_date)\
                                     .order_by(Schedule.start_time).all()
    
    return render_template('schedule.html', 
                         schedule_date=schedule_date,
                         schedule_items=existing_schedule)

# API Routes
@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def api_tasks():
    if request.method == 'POST':
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        
        # Parse due date if provided
        due_date = None
        if data.get('due_date'):
            try:
                due_date = datetime.fromisoformat(data['due_date'])
            except ValueError:
                return jsonify({'error': 'Invalid due date format'}), 400
        
        # Create new task
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            due_date=due_date,
            estimated_duration=int(data.get('estimated_duration', 60)),
            priority=int(data.get('priority', 3)),
            category_id=data.get('category_id'),
            user_id=current_user.id
        )
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'estimated_duration': task.estimated_duration,
            'priority': task.priority,
            'status': task.status,
            'category_id': task.category_id
        }), 201
    
    # GET request - return all tasks
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'estimated_duration': task.estimated_duration,
        'priority': task.priority,
        'status': task.status,
        'category_id': task.category_id,
        'category_name': task.category.name if task.category else None,
        'category_color': task.category.color if task.category else '#6c757d'
    } for task in tasks])

@app.route('/api/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
@login_required
def api_task_detail(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    
    if request.method == 'PUT':
        data = request.get_json()
        
        # Update task fields
        task.title = data.get('title', task.title)
        task.description = data.get('description', task.description)
        task.estimated_duration = int(data.get('estimated_duration', task.estimated_duration))
        task.priority = int(data.get('priority', task.priority))
        task.status = data.get('status', task.status)
        task.category_id = data.get('category_id', task.category_id)
        
        # Handle due date
        if 'due_date' in data:
            if data['due_date']:
                try:
                    task.due_date = datetime.fromisoformat(data['due_date'])
                except ValueError:
                    return jsonify({'error': 'Invalid due date format'}), 400
            else:
                task.due_date = None
        
        # Mark as completed if status changed to done
        if data.get('status') == 'done' and task.status != 'done':
            task.mark_completed()
        
        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'estimated_duration': task.estimated_duration,
            'priority': task.priority,
            'status': task.status,
            'category_id': task.category_id
        })
    
    elif request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return '', 204

@app.route('/api/categories', methods=['GET', 'POST'])
@login_required
def api_categories():
    if request.method == 'POST':
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Name is required'}), 400
        
        category = Category(
            name=data['name'],
            color=data.get('color', '#007bff'),
            user_id=current_user.id
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'id': category.id,
            'name': category.name,
            'color': category.color
        }), 201
    
    # GET request
    categories = Category.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': cat.id,
        'name': cat.name,
        'color': cat.color
    } for cat in categories])

@app.route('/api/schedule/generate', methods=['POST'])
@login_required
def api_generate_schedule():
    data = request.get_json()
    schedule_date_str = data.get('date', date.today().isoformat())
    
    try:
        schedule_date = datetime.strptime(schedule_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Get user's work hours
    work_start = current_user.work_start_hour
    work_end = current_user.work_end_hour
    
    # Generate schedule
    scheduler = TaskScheduler(current_user.id)
    schedule_items = scheduler.generate_daily_schedule(schedule_date, work_start, work_end)
    
    # Clear existing schedule for the date
    Schedule.query.filter_by(user_id=current_user.id, schedule_date=schedule_date).delete()
    
    # Save new schedule
    for item in schedule_items:
        schedule_entry = Schedule(
            user_id=current_user.id,
            schedule_date=schedule_date,
            task_id=item['task_id'],
            start_time=item['start_time'],
            end_time=item['end_time']
        )
        db.session.add(schedule_entry)
    
    db.session.commit()
    
    return jsonify({
        'date': schedule_date.isoformat(),
        'items': [{
            'task_id': item['task_id'],
            'task_title': item['task_title'],
            'start_time': item['start_time'].strftime('%H:%M'),
            'end_time': item['end_time'].strftime('%H:%M'),
            'duration': item['duration'],
            'category_name': item.get('category_name', 'Uncategorized'),
            'category_color': item.get('category_color', '#6c757d')
        } for item in schedule_items]
    })

@app.route('/api/schedule/<date_str>')
@login_required
def api_get_schedule(date_str):
    try:
        schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    schedule_items = Schedule.query.filter_by(user_id=current_user.id, schedule_date=schedule_date)\
                                  .order_by(Schedule.start_time).all()
    
    return jsonify([{
        'task_id': item.task_id,
        'task_title': item.task.title,
        'start_time': item.start_time.strftime('%H:%M'),
        'end_time': item.end_time.strftime('%H:%M'),
        'category_name': item.task.category.name if item.task.category else 'Uncategorized',
        'category_color': item.task.category.color if item.task.category else '#6c757d'
    } for item in schedule_items])

@app.route('/api/stats')
@login_required
def api_stats():
    stats = get_task_stats(current_user.id)
    category_stats = get_category_stats(current_user.id)
    
    return jsonify({
        'task_stats': stats,
        'category_stats': category_stats
    })
