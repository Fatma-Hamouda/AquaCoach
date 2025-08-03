from models import Task, Category
from app import db
from sqlalchemy import func
from datetime import datetime, timedelta

def get_task_stats(user_id):
    """Get comprehensive task statistics for a user"""
    
    # Basic counts
    total_tasks = Task.query.filter_by(user_id=user_id).count()
    completed_tasks = Task.query.filter_by(user_id=user_id, status='done').count()
    pending_tasks = Task.query.filter_by(user_id=user_id, status='todo').count()
    in_progress_tasks = Task.query.filter_by(user_id=user_id, status='in-progress').count()
    
    # Overdue tasks
    today = datetime.utcnow()
    overdue_tasks = Task.query.filter(
        Task.user_id == user_id,
        Task.status != 'done',
        Task.due_date < today
    ).count()
    
    # Due today
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    due_today = Task.query.filter(
        Task.user_id == user_id,
        Task.status != 'done',
        Task.due_date >= today_start,
        Task.due_date < today_end
    ).count()
    
    # Completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Average task duration
    avg_duration = db.session.query(func.avg(Task.estimated_duration))\
                            .filter_by(user_id=user_id).scalar() or 0
    
    # Tasks completed this week
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    completed_this_week = Task.query.filter(
        Task.user_id == user_id,
        Task.status == 'done',
        Task.completed_at >= week_start
    ).count()
    
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks': pending_tasks,
        'in_progress_tasks': in_progress_tasks,
        'overdue_tasks': overdue_tasks,
        'due_today': due_today,
        'completion_rate': round(completion_rate, 1),
        'avg_duration': round(avg_duration, 0),
        'completed_this_week': completed_this_week
    }

def get_category_stats(user_id):
    """Get task distribution by category"""
    
    # Query to get task counts by category
    category_stats = db.session.query(
        Category.name,
        Category.color,
        func.count(Task.id).label('task_count'),
        func.sum(Task.estimated_duration).label('total_duration')
    ).outerjoin(Task, Category.id == Task.category_id)\
     .filter(Category.user_id == user_id)\
     .group_by(Category.id, Category.name, Category.color)\
     .all()
    
    # Tasks without category
    uncategorized_count = Task.query.filter_by(user_id=user_id, category_id=None).count()
    uncategorized_duration = db.session.query(func.sum(Task.estimated_duration))\
                                      .filter_by(user_id=user_id, category_id=None)\
                                      .scalar() or 0
    
    result = []
    for name, color, count, duration in category_stats:
        result.append({
            'name': name,
            'color': color,
            'task_count': count or 0,
            'total_duration': duration or 0
        })
    
    # Add uncategorized if there are any
    if uncategorized_count > 0:
        result.append({
            'name': 'Uncategorized',
            'color': '#6c757d',
            'task_count': uncategorized_count,
            'total_duration': uncategorized_duration
        })
    
    return result

def get_productivity_trends(user_id, days=30):
    """Get productivity trends over the specified number of days"""
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Daily completion counts
    daily_completions = db.session.query(
        func.date(Task.completed_at).label('date'),
        func.count(Task.id).label('completed_count')
    ).filter(
        Task.user_id == user_id,
        Task.status == 'done',
        Task.completed_at >= start_date,
        Task.completed_at <= end_date
    ).group_by(func.date(Task.completed_at)).all()
    
    # Convert to dictionary for easier processing
    completion_data = {str(date): count for date, count in daily_completions}
    
    # Fill in missing days with 0
    current_date = start_date.date()
    trend_data = []
    
    while current_date <= end_date.date():
        date_str = str(current_date)
        trend_data.append({
            'date': date_str,
            'completed': completion_data.get(date_str, 0)
        })
        current_date += timedelta(days=1)
    
    return trend_data

def calculate_productivity_score(user_id):
    """Calculate overall productivity score"""
    
    stats = get_task_stats(user_id)
    
    # Factors for productivity score
    completion_rate_score = stats['completion_rate'] * 0.4
    
    # Penalize overdue tasks
    overdue_penalty = min(stats['overdue_tasks'] * 5, 30)  # Max 30% penalty
    
    # Reward completing tasks this week
    weekly_bonus = min(stats['completed_this_week'] * 2, 20)  # Max 20% bonus
    
    # Base score calculation
    productivity_score = completion_rate_score - overdue_penalty + weekly_bonus
    productivity_score = max(0, min(100, productivity_score))  # Keep between 0-100
    
    return round(productivity_score, 1)

def get_priority_distribution(user_id):
    """Get distribution of tasks by priority level"""
    
    priority_stats = db.session.query(
        Task.priority,
        func.count(Task.id).label('count')
    ).filter_by(user_id=user_id)\
     .group_by(Task.priority)\
     .all()
    
    priority_labels = {1: 'Very Low', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Very High'}
    
    result = []
    for priority, count in priority_stats:
        result.append({
            'priority': priority,
            'label': priority_labels.get(priority, 'Unknown'),
            'count': count
        })
    
    return result

def estimate_completion_time(user_id, task_ids=None):
    """Estimate completion time for pending tasks"""
    
    query = Task.query.filter_by(user_id=user_id, status='todo')
    
    if task_ids:
        query = query.filter(Task.id.in_(task_ids))
    
    tasks = query.all()
    
    total_duration = sum(task.estimated_duration for task in tasks)
    
    # Assuming 6 productive hours per day
    productive_hours_per_day = 6 * 60  # in minutes
    estimated_days = total_duration / productive_hours_per_day
    
    return {
        'total_tasks': len(tasks),
        'total_duration_minutes': total_duration,
        'total_duration_hours': round(total_duration / 60, 1),
        'estimated_days': round(estimated_days, 1)
    }
