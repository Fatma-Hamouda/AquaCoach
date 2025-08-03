// Tasks page functionality for Smart Task Manager

/**
 * Apply filters to tasks
 */
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (categoryFilter !== 'all') params.append('category', categoryFilter);
    
    window.location.href = `${window.location.pathname}?${params.toString()}`;
}

/**
 * Save new task
 */
async function saveTask() {
    const form = document.getElementById('addTaskForm');
    const formData = new FormData(form);
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        category_id: document.getElementById('taskCategory').value || null,
        priority: parseInt(document.getElementById('taskPriority').value),
        estimated_duration: parseInt(document.getElementById('taskDuration').value),
        due_date: document.getElementById('taskDueDate').value || null
    };
    
    // Validate required fields
    if (!taskData.title.trim()) {
        showAlert('Task title is required', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create task');
        }
        
        const task = await response.json();
        
        // Close modal and refresh page
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTaskModal'));
        modal.hide();
        
        showAlert('Task created successfully!', 'success');
        
        // Reload page to show new task
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error creating task:', error);
        showAlert(error.message, 'danger');
    }
}

/**
 * Edit task
 */
async function editTask(taskId) {
    try {
        // Get task data
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error('Failed to load tasks');
        
        const tasks = await response.json();
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
            showAlert('Task not found', 'danger');
            return;
        }
        
        // Populate form
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskCategory').value = task.category_id || '';
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskDuration').value = task.estimated_duration;
        document.getElementById('editTaskStatus').value = task.status;
        
        // Format due date for datetime-local input
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const formatted = dueDate.toISOString().slice(0, 16);
            document.getElementById('editTaskDueDate').value = formatted;
        } else {
            document.getElementById('editTaskDueDate').value = '';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading task:', error);
        showAlert('Failed to load task data', 'danger');
    }
}

/**
 * Update task
 */
async function updateTask() {
    const taskId = document.getElementById('editTaskId').value;
    
    const taskData = {
        title: document.getElementById('editTaskTitle').value,
        description: document.getElementById('editTaskDescription').value,
        category_id: document.getElementById('editTaskCategory').value || null,
        priority: parseInt(document.getElementById('editTaskPriority').value),
        estimated_duration: parseInt(document.getElementById('editTaskDuration').value),
        status: document.getElementById('editTaskStatus').value,
        due_date: document.getElementById('editTaskDueDate').value || null
    };
    
    // Validate required fields
    if (!taskData.title.trim()) {
        showAlert('Task title is required', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update task');
        }
        
        // Close modal and refresh page
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTaskModal'));
        modal.hide();
        
        showAlert('Task updated successfully!', 'success');
        
        // Reload page to show changes
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error updating task:', error);
        showAlert(error.message, 'danger');
    }
}

/**
 * Delete task
 */
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete task');
        }
        
        showAlert('Task deleted successfully!', 'success');
        
        // Remove task card from DOM
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
            taskCard.remove();
        }
        
        // If no tasks left, show empty state
        const tasksList = document.getElementById('tasksList');
        if (tasksList.children.length === 0) {
            tasksList.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i data-feather="inbox" style="width: 64px; height: 64px;" class="text-muted mb-3"></i>
                        <h4 class="text-muted">No tasks found</h4>
                        <p class="text-muted">Create your first task to get started!</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTaskModal">
                            <i data-feather="plus" class="me-1"></i>
                            Add Task
                        </button>
                    </div>
                </div>
            `;
            feather.replace();
        }
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showAlert('Failed to delete task', 'danger');
    }
}

/**
 * Update task status
 */
async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update task status');
        }
        
        showAlert(`Task marked as ${newStatus.replace('-', ' ')}!`, 'success');
        
        // Update the task card UI
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
            const statusBadge = taskCard.querySelector('.badge');
            if (statusBadge && statusBadge.textContent.includes('Todo') || statusBadge.textContent.includes('Progress')) {
                // Update status badge
                statusBadge.className = `badge bg-${newStatus === 'done' ? 'success' : newStatus === 'in-progress' ? 'warning' : 'secondary'}`;
                statusBadge.textContent = newStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                // Hide action buttons if completed
                if (newStatus === 'done') {
                    const actionButtons = taskCard.querySelector('.mt-3');
                    if (actionButtons) {
                        actionButtons.style.display = 'none';
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error updating task status:', error);
        showAlert('Failed to update task status', 'danger');
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
 * Format priority for display
 */
function formatPriority(priority) {
    const labels = {
        1: 'Very Low',
        2: 'Low',
        3: 'Medium',
        4: 'High',
        5: 'Very High'
    };
    return labels[priority] || 'Unknown';
}

/**
 * Get priority badge class
 */
function getPriorityBadgeClass(priority) {
    const classes = {
        1: 'secondary',
        2: 'info',
        3: 'primary',
        4: 'warning',
        5: 'danger'
    };
    return classes[priority] || 'secondary';
}

/**
 * Format duration for display
 */
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

/**
 * Calculate days until due
 */
function getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
}

// Initialize tasks page
document.addEventListener('DOMContentLoaded', function() {
    // Clear forms when modals are hidden
    document.getElementById('addTaskModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('addTaskForm').reset();
    });
    
    document.getElementById('editTaskModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('editTaskForm').reset();
    });
    
    // Initialize tooltips
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Export functions for global use
window.saveTask = saveTask;
window.editTask = editTask;
window.updateTask = updateTask;
window.deleteTask = deleteTask;
window.updateTaskStatus = updateTaskStatus;
window.applyFilters = applyFilters;
