// Dashboard functionality for Smart Task Manager

// Chart instances
let taskProgressChart = null;
let categoryChart = null;

/**
 * Initialize dashboard charts
 */
function initializeCharts(taskProgressData, categoryData) {
    // Task Progress Chart
    const progressCtx = document.getElementById('taskProgressChart');
    if (progressCtx) {
        taskProgressChart = new Chart(progressCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending'],
                datasets: [{
                    data: [
                        taskProgressData.completed,
                        taskProgressData.inProgress,
                        taskProgressData.pending
                    ],
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#6c757d'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    // Category Distribution Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx && categoryData.length > 0) {
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryData.map(cat => cat.name),
                datasets: [{
                    label: 'Tasks',
                    data: categoryData.map(cat => cat.task_count),
                    backgroundColor: categoryData.map(cat => cat.color),
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

/**
 * Generate today's schedule
 */
async function generateTodaysSchedule() {
    const button = document.getElementById('generateScheduleBtn');
    const originalText = button.innerHTML;
    
    try {
        // Show loading state
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
        button.disabled = true;
        
        const today = new Date().toISOString().split('T')[0];
        
        const response = await fetch('/api/schedule/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: today })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate schedule');
        }
        
        const data = await response.json();
        
        // Update today's schedule section
        updateTodayScheduleDisplay(data.items);
        
        // Show success message
        showAlert('Schedule generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating schedule:', error);
        showAlert('Failed to generate schedule. Please try again.', 'danger');
    } finally {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

/**
 * Update today's schedule display
 */
function updateTodayScheduleDisplay(scheduleItems) {
    const container = document.getElementById('todaySchedule');
    
    if (!scheduleItems || scheduleItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i data-feather="calendar" class="mb-2"></i>
                <p class="mb-0">No tasks scheduled for today.</p>
            </div>
        `;
        feather.replace();
        return;
    }
    
    const listHTML = scheduleItems.map(item => `
        <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <span class="badge rounded-pill me-2" style="background-color: ${item.category_color};">
                            ${item.category_name}
                        </span>
                        <span class="fw-medium">${item.task_title}</span>
                    </div>
                    <small class="text-muted">
                        ${item.start_time} - ${item.end_time}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="list-group list-group-flush">${listHTML}</div>`;
    feather.replace();
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
 * Load real-time stats
 */
async function loadRealtimeStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        
        const data = await response.json();
        
        // Update stats cards
        updateStatsCards(data.task_stats);
        
        // Update charts if they exist
        if (taskProgressChart) {
            taskProgressChart.data.datasets[0].data = [
                data.task_stats.completed_tasks,
                data.task_stats.in_progress_tasks,
                data.task_stats.pending_tasks
            ];
            taskProgressChart.update();
        }
        
        if (categoryChart && data.category_stats.length > 0) {
            categoryChart.data.labels = data.category_stats.map(cat => cat.name);
            categoryChart.data.datasets[0].data = data.category_stats.map(cat => cat.task_count);
            categoryChart.data.datasets[0].backgroundColor = data.category_stats.map(cat => cat.color);
            categoryChart.update();
        }
        
    } catch (error) {
        console.error('Error loading realtime stats:', error);
    }
}

/**
 * Update stats cards
 */
function updateStatsCards(stats) {
    const updateCard = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    };
    
    updateCard('.col-md-3:nth-child(1) h3', stats.total_tasks);
    updateCard('.col-md-3:nth-child(2) h3', stats.completed_tasks);
    updateCard('.col-md-3:nth-child(3) h3', stats.pending_tasks);
    updateCard('.col-md-3:nth-child(4) h3', stats.overdue_tasks);
}

/**
 * Format duration
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
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Calculate completion percentage
 */
function calculateCompletionPercentage(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load realtime stats every 30 seconds
    setInterval(loadRealtimeStats, 30000);
    
    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});

// Export functions for global use
window.generateTodaysSchedule = generateTodaysSchedule;
window.initializeCharts = initializeCharts;
