// Schedule page functionality for Smart Task Manager

/**
 * Generate schedule for selected date
 */
async function generateSchedule() {
    const dateInput = document.getElementById('scheduleDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showAlert('Please select a date', 'warning');
        return;
    }
    
    const button = event.target;
    const originalText = button.innerHTML;
    
    try {
        // Show loading state
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
        button.disabled = true;
        
        const response = await fetch('/api/schedule/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: selectedDate })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate schedule');
        }
        
        const data = await response.json();
        
        // Update schedule display
        updateScheduleDisplay(data.items);
        updateScheduleSummary(data.items);
        
        showAlert('Schedule generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating schedule:', error);
        showAlert(error.message, 'danger');
    } finally {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * Update schedule timeline display
 */
function updateScheduleDisplay(scheduleItems) {
    const container = document.getElementById('scheduleTimeline');
    
    if (!scheduleItems || scheduleItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i data-feather="calendar" style="width: 64px; height: 64px;" class="text-muted mb-3"></i>
                <h4 class="text-muted">No schedule generated</h4>
                <p class="text-muted">Click "Generate Schedule" to create an optimized daily plan based on your tasks.</p>
                <button class="btn btn-primary" onclick="generateSchedule()">
                    <i data-feather="cpu" class="me-1"></i>
                    Generate Schedule
                </button>
            </div>
        `;
        feather.replace();
        return;
    }
    
    const timelineHTML = scheduleItems.map(item => `
        <div class="timeline-item">
            <div class="timeline-time">
                ${item.start_time}
            </div>
            <div class="timeline-content">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center">
                            <span class="badge rounded-pill me-2" style="background-color: ${item.category_color};">
                                ${item.category_name}
                            </span>
                            <span class="fw-medium">${item.task_title}</span>
                        </div>
                        <small class="text-muted">
                            ${item.start_time} - ${item.end_time} (${item.duration} minutes)
                        </small>
                    </div>
                    <button class="btn btn-sm btn-outline-success" onclick="markTaskComplete(${item.task_id})">
                        <i data-feather="check" class="me-1"></i>
                        Complete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
    feather.replace();
}

/**
 * Update schedule summary
 */
function updateScheduleSummary(scheduleItems) {
    const container = document.getElementById('scheduleSummary');
    
    if (!scheduleItems || scheduleItems.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <p class="mb-0">No schedule data available</p>
            </div>
        `;
        return;
    }
    
    const totalTasks = scheduleItems.length;
    const totalDuration = scheduleItems.reduce((sum, item) => sum + item.duration, 0);
    const totalHours = (totalDuration / 60).toFixed(1);
    
    container.innerHTML = `
        <div class="row text-center">
            <div class="col-6">
                <div class="border-end">
                    <h4 class="text-primary mb-0">${totalTasks}</h4>
                    <small class="text-muted">Tasks</small>
                </div>
            </div>
            <div class="col-6">
                <h4 class="text-success mb-0">${totalHours}h</h4>
                <small class="text-muted">Total Time</small>
            </div>
        </div>
    `;
}

/**
 * Mark task as complete from schedule
 */
async function markTaskComplete(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'done' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark task as complete');
        }
        
        showAlert('Task completed successfully!', 'success');
        
        // Remove the timeline item or update its appearance
        const timelineItem = event.target.closest('.timeline-item');
        if (timelineItem) {
            timelineItem.style.opacity = '0.6';
            timelineItem.querySelector('button').innerHTML = `
                <i data-feather="check-circle" class="me-1"></i>
                Completed
            `;
            timelineItem.querySelector('button').disabled = true;
            timelineItem.querySelector('button').className = 'btn btn-sm btn-success';
        }
        
        // Refresh pending tasks
        loadPendingTasks();
        
        feather.replace();
        
    } catch (error) {
        console.error('Error marking task complete:', error);
        showAlert('Failed to mark task as complete', 'danger');
    }
}

/**
 * Load pending tasks for sidebar
 */
async function loadPendingTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to load tasks');
        
        const tasks = await response.json();
        const pendingTasks = tasks.filter(task => task.status === 'todo');
        
        updatePendingTasksDisplay(pendingTasks);
        
    } catch (error) {
        console.error('Error loading pending tasks:', error);
        const container = document.getElementById('pendingTasks');
        container.innerHTML = `
            <div class="text-center py-3 text-muted">
                <p class="mb-0">Error loading tasks</p>
            </div>
        `;
    }
}

/**
 * Update pending tasks display
 */
function updatePendingTasksDisplay(pendingTasks) {
    const container = document.getElementById('pendingTasks');
    
    if (!pendingTasks || pendingTasks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i data-feather="check-circle" class="mb-2"></i>
                <p class="mb-0">All tasks completed!</p>
            </div>
        `;
        feather.replace();
        return;
    }
    
    // Sort by priority and due date
    pendingTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority; // Higher priority first
        }
        if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date); // Earlier due date first
        }
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return 0;
    });
    
    const tasksHTML = pendingTasks.slice(0, 10).map(task => {
        const dueText = task.due_date ? formatDueDate(task.due_date) : '';
        const urgencyClass = getUrgencyClass(task.due_date);
        
        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center">
                            ${task.category_color ? `
                                <span class="badge rounded-pill me-2" style="background-color: ${task.category_color};">
                                    ${task.category_name}
                                </span>
                            ` : ''}
                            <span class="fw-medium">${task.title}</span>
                        </div>
                        <div class="d-flex align-items-center mt-1">
                            <small class="text-muted me-3">
                                <i data-feather="clock" style="width: 12px; height: 12px;" class="me-1"></i>
                                ${task.estimated_duration}min
                            </small>
                            ${dueText ? `
                                <small class="text-muted ${urgencyClass}">
                                    <i data-feather="calendar" style="width: 12px; height: 12px;" class="me-1"></i>
                                    ${dueText}
                                </small>
                            ` : ''}
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <!-- Priority stars -->
                        <div class="me-2">
                            ${generatePriorityStars(task.priority)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="list-group list-group-flush">
            ${tasksHTML}
            ${pendingTasks.length > 10 ? `
                <div class="list-group-item text-center">
                    <small class="text-muted">
                        +${pendingTasks.length - 10} more tasks
                        <a href="/tasks" class="ms-1">View all</a>
                    </small>
                </div>
            ` : ''}
        </div>
    `;
    
    feather.replace();
}

/**
 * Generate priority stars HTML
 */
function generatePriorityStars(priority) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= priority;
        starsHTML += `<i data-feather="star" class="${filled ? 'text-warning' : 'text-muted'}" style="width: 12px; height: 12px;"></i>`;
    }
    return starsHTML;
}

/**
 * Format due date for display
 */
function formatDueDate(dueDateString) {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
        return 'Due today';
    } else if (diffDays === 1) {
        return 'Due tomorrow';
    } else if (diffDays <= 7) {
        return `Due in ${diffDays} days`;
    } else {
        return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Get urgency CSS class based on due date
 */
function getUrgencyClass(dueDateString) {
    if (!dueDateString) return '';
    
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-danger';
    if (diffDays === 0) return 'text-warning';
    if (diffDays <= 2) return 'text-info';
    return '';
}

/**
 * Load schedule for specific date
 */
async function loadScheduleForDate(date) {
    try {
        const response = await fetch(`/api/schedule/${date}`);
        if (!response.ok) throw new Error('Failed to load schedule');
        
        const scheduleItems = await response.json();
        updateScheduleDisplay(scheduleItems);
        updateScheduleSummary(scheduleItems);
        
    } catch (error) {
        console.error('Error loading schedule:', error);
        const container = document.getElementById('scheduleTimeline');
        container.innerHTML = `
            <div class="text-center py-5">
                <i data-feather="alert-circle" style="width: 64px; height: 64px;" class="text-muted mb-3"></i>
                <h4 class="text-muted">Error loading schedule</h4>
                <p class="text-muted">Please try again later.</p>
            </div>
        `;
        feather.replace();
    }
}

/**
 * Show schedule efficiency modal
 */
async function showScheduleEfficiency() {
    const dateInput = document.getElementById('scheduleDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showAlert('Please select a date first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/schedule/${selectedDate}`);
        if (!response.ok) throw new Error('Failed to load schedule');
        
        const scheduleItems = await response.json();
        
        if (scheduleItems.length === 0) {
            showAlert('No schedule found for selected date', 'info');
            return;
        }
        
        // Calculate efficiency metrics
        const totalTasks = scheduleItems.length;
        const totalDuration = scheduleItems.reduce((sum, item) => sum + item.duration, 0);
        const averageDuration = totalDuration / totalTasks;
        
        // Mock efficiency calculation (in real app, this would come from backend)
        const efficiency = Math.min(100, Math.round((totalTasks * 15) + (averageDuration > 120 ? -10 : 10)));
        
        const efficiencyContent = `
            <div class="row text-center mb-4">
                <div class="col-4">
                    <h4 class="text-primary">${totalTasks}</h4>
                    <small class="text-muted">Total Tasks</small>
                </div>
                <div class="col-4">
                    <h4 class="text-success">${(totalDuration / 60).toFixed(1)}h</h4>
                    <small class="text-muted">Total Time</small>
                </div>
                <div class="col-4">
                    <h4 class="text-info">${Math.round(averageDuration)}min</h4>
                    <small class="text-muted">Avg Duration</small>
                </div>
            </div>
            
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>Schedule Efficiency</span>
                    <span class="fw-bold">${efficiency}%</span>
                </div>
                <div class="efficiency-meter">
                    <div class="efficiency-bar ${efficiency >= 80 ? 'efficiency-high' : efficiency >= 60 ? 'efficiency-medium' : 'efficiency-low'}" 
                         style="width: ${efficiency}%;"></div>
                </div>
            </div>
            
            <div class="alert alert-info">
                <i data-feather="info" class="me-2"></i>
                <strong>Tips:</strong> 
                ${efficiency >= 80 ? 'Great job! Your schedule is well optimized.' : 
                  efficiency >= 60 ? 'Good schedule. Consider grouping similar tasks together.' : 
                  'Your schedule could be improved. Try breaking large tasks into smaller chunks.'}
            </div>
        `;
        
        document.getElementById('efficiencyContent').innerHTML = efficiencyContent;
        
        const modal = new bootstrap.Modal(document.getElementById('efficiencyModal'));
        modal.show();
        
        feather.replace();
        
    } catch (error) {
        console.error('Error calculating efficiency:', error);
        showAlert('Failed to calculate schedule efficiency', 'danger');
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insert at the top of the main container
    const container = document.querySelector('.container');
    const firstChild = container.firstElementChild;
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = alertHTML;
    container.insertBefore(alertDiv.firstElementChild, firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

/**
 * Export schedule as text
 */
function exportSchedule() {
    const dateInput = document.getElementById('scheduleDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showAlert('Please select a date first', 'warning');
        return;
    }
    
    const scheduleItems = Array.from(document.querySelectorAll('.timeline-item')).map(item => {
        const time = item.querySelector('.timeline-time').textContent.trim();
        const title = item.querySelector('.fw-medium').textContent.trim();
        const category = item.querySelector('.badge') ? item.querySelector('.badge').textContent.trim() : 'Uncategorized';
        return `${time} - ${title} (${category})`;
    });
    
    if (scheduleItems.length === 0) {
        showAlert('No schedule to export', 'warning');
        return;
    }
    
    const scheduleText = `Daily Schedule - ${new Date(selectedDate).toLocaleDateString()}\n\n${scheduleItems.join('\n')}`;
    
    // Create and download text file
    const blob = new Blob([scheduleText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${selectedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('Schedule exported successfully!', 'success');
}

// Initialize schedule page
document.addEventListener('DOMContentLoaded', function() {
    // Load pending tasks on page load
    loadPendingTasks();
    
    // Initialize tooltips
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Export functions for global use
window.generateSchedule = generateSchedule;
window.markTaskComplete = markTaskComplete;
window.loadPendingTasks = loadPendingTasks;
window.showScheduleEfficiency = showScheduleEfficiency;
window.exportSchedule = exportSchedule;
