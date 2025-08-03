from datetime import datetime, date, time, timedelta
from models import Task, Category
from app import db

class TaskScheduler:
    def __init__(self, user_id):
        self.user_id = user_id
        
    def get_pending_tasks(self):
        """Get all pending tasks for the user"""
        return Task.query.filter_by(user_id=self.user_id, status='todo')\
                        .order_by(Task.due_date.asc().nullslast()).all()
    
    def score_tasks(self, tasks):
        """Score tasks based on priority, urgency, and duration"""
        scored_tasks = []
        
        for task in tasks:
            score = task.calculate_score()
            scored_tasks.append({
                'task': task,
                'score': score
            })
        
        # Sort by score (highest first)
        scored_tasks.sort(key=lambda x: x['score'], reverse=True)
        return scored_tasks
    
    def generate_daily_schedule(self, schedule_date, work_start_hour=9, work_end_hour=17):
        """Generate a daily schedule for the given date"""
        
        # Get pending tasks
        pending_tasks = self.get_pending_tasks()
        
        if not pending_tasks:
            return []
        
        # Score and sort tasks
        scored_tasks = self.score_tasks(pending_tasks)
        
        # Time blocking
        schedule_items = []
        current_time = time(work_start_hour, 0)
        end_time = time(work_end_hour, 0)
        
        # Convert to datetime for easier manipulation
        current_datetime = datetime.combine(schedule_date, current_time)
        end_datetime = datetime.combine(schedule_date, end_time)
        
        # Add lunch break (12:00-13:00)
        lunch_start = datetime.combine(schedule_date, time(12, 0))
        lunch_end = datetime.combine(schedule_date, time(13, 0))
        
        for scored_task in scored_tasks:
            task = scored_task['task']
            duration_minutes = task.estimated_duration
            
            # Check if task fits in remaining time
            task_end_time = current_datetime + timedelta(minutes=duration_minutes)
            
            # Skip lunch break
            if (current_datetime < lunch_end and task_end_time > lunch_start):
                if current_datetime < lunch_start:
                    current_datetime = lunch_end
                    task_end_time = current_datetime + timedelta(minutes=duration_minutes)
            
            # Check if task fits within work hours
            if task_end_time <= end_datetime:
                schedule_items.append({
                    'task_id': task.id,
                    'task_title': task.title,
                    'start_time': current_datetime.time(),
                    'end_time': task_end_time.time(),
                    'duration': duration_minutes,
                    'category_name': task.category.name if task.category else 'Uncategorized',
                    'category_color': task.category.color if task.category else '#6c757d'
                })
                
                # Update current time (add 15 min buffer between tasks)
                current_datetime = task_end_time + timedelta(minutes=15)
                
                # If next task would start after lunch, move to after lunch
                if current_datetime < lunch_end and current_datetime >= lunch_start:
                    current_datetime = lunch_end
            
            # Stop if we've run out of time
            if current_datetime >= end_datetime:
                break
        
        return schedule_items
    
    def calculate_task_urgency(self, task):
        """Calculate urgency score based on due date"""
        if not task.due_date:
            return 1  # Low urgency for tasks without due date
        
        days_until_due = (task.due_date.date() - date.today()).days
        
        if days_until_due < 0:
            return 10  # Overdue
        elif days_until_due == 0:
            return 9   # Due today
        elif days_until_due == 1:
            return 7   # Due tomorrow
        elif days_until_due <= 3:
            return 5   # Due within 3 days
        elif days_until_due <= 7:
            return 3   # Due within a week
        else:
            return 1   # Due later
    
    def suggest_optimal_duration(self, task):
        """Suggest optimal time blocks for tasks"""
        duration = task.estimated_duration
        
        # Break large tasks into smaller chunks
        if duration > 240:  # > 4 hours
            return [120, 120, duration - 240]  # 2-hour chunks
        elif duration > 120:  # > 2 hours
            return [90, duration - 90]  # 1.5-hour chunks
        else:
            return [duration]  # Keep as is
    
    def get_schedule_efficiency(self, schedule_items):
        """Calculate efficiency metrics for a schedule"""
        if not schedule_items:
            return {'efficiency': 0, 'total_tasks': 0, 'total_duration': 0}
        
        total_duration = sum(item['duration'] for item in schedule_items)
        total_tasks = len(schedule_items)
        
        # Calculate priority-weighted efficiency
        total_priority_score = 0
        for item in schedule_items:
            task = Task.query.get(item['task_id'])
            total_priority_score += task.priority
        
        avg_priority = total_priority_score / total_tasks if total_tasks > 0 else 0
        efficiency = (avg_priority / 5) * 100  # Normalize to percentage
        
        return {
            'efficiency': round(efficiency, 2),
            'total_tasks': total_tasks,
            'total_duration': total_duration,
            'avg_priority': round(avg_priority, 2)
        }
