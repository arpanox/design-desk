// DOM Elements - Login
const loginFormContainer = document.getElementById('loginForm');
const loginForm = document.getElementById('login');
const loginButton = document.getElementById('loginButton');
const errorMessage = document.getElementById('errorMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const dbStatusDot = document.getElementById('dbStatusDot');
const loadingSpinner = loginButton.querySelector('.loading-spinner');
const loginIcon = loginButton.querySelector('.login-icon');
const loginText = loginButton.querySelector('.login-text');

// DOM Elements - Dashboard
const dashboardContainer = document.getElementById('dashboard');
const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const totalProjects = document.getElementById('totalProjects');
const fixedProjects = document.getElementById('fixedProjects');
const dedicatedProjects = document.getElementById('dedicatedProjects');
const teamAvailability = document.getElementById('teamAvailability');
const projectsGrid = document.getElementById('projectsGrid');
const navItems = document.querySelectorAll('.nav-item');

// Loading States
function showLoadingState() {
    // Stats loading state
    document.querySelectorAll('.stat-card').forEach(card => {
        card.innerHTML = `
            <div class="animate-pulse">
                <div class="h-6 w-6 bg-dark-accent rounded-full mb-2"></div>
                <div class="h-8 w-24 bg-dark-accent rounded mb-2"></div>
                <div class="h-4 w-32 bg-dark-accent rounded"></div>
            </div>
        `;
    });

    // Projects grid loading state
    projectsGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="project-card">
            <div class="animate-pulse">
                <div class="flex justify-between items-start mb-4">
                    <div class="h-6 w-48 bg-dark-accent rounded"></div>
                    <div class="h-6 w-24 bg-dark-accent rounded"></div>
                </div>
                <div class="space-y-4">
                    <div class="h-4 w-32 bg-dark-accent rounded"></div>
                    <div class="h-4 w-full bg-dark-accent rounded"></div>
                    <div class="h-4 w-3/4 bg-dark-accent rounded"></div>
                    <div class="h-4 w-5/6 bg-dark-accent rounded"></div>
                </div>
                <div class="mt-4 pt-4 border-t border-glass">
                    <div class="h-4 w-full bg-dark-accent rounded"></div>
                    <div class="h-2 w-full bg-dark-accent rounded mt-2"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function hideLoadingState() {
    // Clear loading states (content will be updated by respective update functions)
    document.querySelectorAll('.stat-card').forEach(card => {
        card.innerHTML = '';
    });
    projectsGrid.innerHTML = '';
}

// Show/Hide Functions
function showLogin() {
    loginFormContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    // Clear form
    loginForm.reset();
    errorMessage.classList.add('hidden');
}

function showDashboard() {
    loginFormContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    // Show loading state immediately
    showLoadingState();
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide any existing error message
    errorMessage.classList.add('hidden');
    
    // Show loading state
    loadingSpinner.classList.remove('hidden');
    loginIcon.classList.add('hidden');
    loginText.classList.add('opacity-0');
    loginButton.disabled = true;
    
    try {
        const result = await window.api.login(emailInput.value, passwordInput.value);
        
        if (result.success) {
            // Login successful
            showDashboard();
            initializeDashboard();
            startAutoRefresh();
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Show error and shake animation
        errorMessage.classList.remove('hidden');
        loginForm.closest('.glass-panel').classList.add('shake');
        
        // Remove shake class after animation completes
        setTimeout(() => {
            loginForm.closest('.glass-panel').classList.remove('shake');
        }, 650);
    } finally {
        // Reset button state
        loadingSpinner.classList.add('hidden');
        loginIcon.classList.remove('hidden');
        loginText.classList.remove('opacity-0');
        loginButton.disabled = false;
    }
});

// Remove error message when user starts typing
emailInput.addEventListener('input', () => {
    errorMessage.classList.add('hidden');
});

passwordInput.addEventListener('input', () => {
    errorMessage.classList.add('hidden');
});

// Initialize Dashboard
async function initializeDashboard() {
    try {
        // Check session
        const session = await window.api.checkSession();
        if (!session.success) {
            showLogin();
            return;
        }

        // Store current user with permissions
        currentUser = session.user;

        // Set user name
        userName.textContent = currentUser.name;

        // Setup role-based view using permissions
        setupRoleBasedView(currentUser.role, currentUser.permissions);

        // Show loading state
        showLoadingState();

        // Load dashboard data
        await loadDashboardData();

        // Hide loading state after data is loaded
        hideLoadingState();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showLogin();
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Show loading state
        showLoadingState();

        // Get projects data (filtering is now handled by the main process)
        const projects = await window.api.getProjects();
        allProjects = projects;
        
        // Update statistics
        updateStatistics(projects);
        
        // Update project cards
        await updateProjectCards(projects);
        
        // Update team availability only if permitted
        if (currentUser.permissions.view_team_members === 'true') {
            await updateTeamAvailability();
        }

        // Hide loading state
        hideLoadingState();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Keep loading state visible to indicate error
    }
}

// Update Statistics
function updateStatistics(projects) {
    const stats = projects.reduce((acc, project) => {
        acc.total++;
        if (project.project_type === 'Fixed') {
            acc.fixed++;
        } else {
            acc.dedicated++;
        }
        return acc;
    }, { total: 0, fixed: 0, dedicated: 0 });

    totalProjects.textContent = stats.total;
    fixedProjects.textContent = stats.fixed;
    dedicatedProjects.textContent = stats.dedicated;
}

// Update Team Availability
async function updateTeamAvailability() {
    try {
        const teamMembers = await window.api.getTeamMembers();
        const available = teamMembers.filter(member => member.status === 'Available').length;
        const total = teamMembers.length;
        teamAvailability.textContent = `${available}/${total}`;
    } catch (error) {
        console.error('Error updating team availability:', error);
    }
}

// Create Project Card
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.designerId = project.designer_id;
    
    const statusColor = project.status === 'In Progress' 
        ? 'text-yellow-500' 
        : project.status === 'Completed' 
            ? 'text-green-500' 
            : 'text-blue-500';

    const hoursDisplay = project.project_type === 'Fixed' 
        ? `${project.consumed_hours}/${project.total_hours}`
        : `${project.consumed_hours}`;

    const progressPercentage = project.project_type === 'Fixed'
        ? (project.consumed_hours / project.total_hours) * 100
        : 0;

    card.innerHTML = `
        <div class="mb-4">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-semibold flex-1">${project.title}</h3>
                <span class="glass-dark px-2 py-1 rounded-full text-xs ${
                    project.project_type.toLowerCase() === 'fixed' 
                        ? 'text-accent-purple' 
                        : 'text-accent-pink'
                }">${project.project_type}</span>
            </div>
            <div class="flex items-center gap-2 text-sm ${statusColor}">
                <i class="ph-fill ph-circle-bold text-xs"></i>
                <span>${project.status}</span>
            </div>
        </div>
        
        <div class="space-y-3 text-sm opacity-75">
            <div class="flex justify-between items-center">
                <span class="flex items-center gap-2">
                    <i class="ph-fill ph-calendar text-accent-blue"></i>
                    Start Date
                </span>
                <span>${formatDate(project.start_date)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="flex items-center gap-2">
                    <i class="ph-fill ph-calendar-x text-accent-pink"></i>
                    End Date
                </span>
                <span>${formatDate(project.end_date)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="flex items-center gap-2">
                    <i class="ph-fill ph-user text-accent-purple"></i>
                    Designer
                </span>
                <span>${project.designer_name}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="flex items-center gap-2">
                    <i class="ph-fill ph-user-gear text-accent-blue"></i>
                    Manager
                </span>
                <span>${project.manager_name}</span>
            </div>
            
            ${project.project_type === 'Fixed' ? `
                <div class="mt-4 pt-4 border-t border-glass">
                    <div class="flex justify-between items-center mb-2">
                        <span class="flex items-center gap-2">
                            <i class="ph-fill ph-timer text-accent-blue"></i>
                            Hours Progress
                        </span>
                        <span class="font-semibold text-accent-blue">${hoursDisplay}</span>
                    </div>
                    <div class="h-2 bg-dark-accent rounded-full overflow-hidden">
                        <div class="h-full bg-accent-blue rounded-full transition-all duration-500" 
                             style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
            ` : ''}
            
            ${project.basecamp_link ? `
                <a href="${project.basecamp_link}" 
                   class="glass-button mt-4 block text-center hover:text-accent-blue" 
                   target="_blank">
                    <span class="flex items-center justify-center gap-2">
                        <i class="ph-fill ph-arrow-square-out"></i>
                        Open in Basecamp
                    </span>
                </a>
            ` : ''}
        </div>
    `;
    
    // Add edit controls based on permissions
    const canManageHours = currentUser.permissions.manage_hours === 'true' || 
                          (currentUser.permissions.manage_hours === 'own' && project.designer_id === currentUser.id);
    const canEditProject = currentUser.permissions.edit_all_projects === 'true';

    if (canManageHours || canEditProject) {
        const editControls = document.createElement('div');
        editControls.className = 'edit-controls mt-4 pt-4 border-t border-glass';
        editControls.innerHTML = `
            <div class="flex justify-end gap-2">
                ${canManageHours ? `
                    <button class="glass-button text-xs" onclick="updateProjectHours('${project.id}')">
                        <i class="ph-fill ph-clock"></i>
                        Update Hours
                    </button>
                ` : ''}
                ${canEditProject ? `
                    <button class="glass-button text-xs" onclick="editProject('${project.id}')">
                        <i class="ph-fill ph-pencil"></i>
                        Edit
                    </button>
                ` : ''}
            </div>
        `;
        card.appendChild(editControls);
    }

    return card;
}

// Update Project Cards
async function updateProjectCards(projects) {
    // Clear existing cards
    projectsGrid.innerHTML = '';
    
    // Sort projects by start date (newest first)
    const sortedProjects = projects.sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
    );
    
    // Add project cards
    sortedProjects.forEach(project => {
        projectsGrid.appendChild(createProjectCard(project));
    });
}

// Format date to YYYY-MM-DD
function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) 
        ? date.toISOString().split('T')[0]
        : 'Invalid date';
}

// Handle Navigation
navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Remove active class from all items
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Add active class to clicked item
        e.target.classList.add('active');
        
        // Show loading state before loading new content
        showLoadingState();
        
        // Handle navigation (to be implemented)
        const page = e.target.textContent.toLowerCase();
        console.log(`Navigate to: ${page}`);
        
        // Simulate page load delay (remove this in production)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Hide loading state after content is loaded
        hideLoadingState();
    });
});

// Handle Logout
logoutButton.addEventListener('click', async () => {
    try {
        const result = await window.api.logout();
        if (result.success) {
            showLogin();
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Auto-refresh dashboard data every 5 minutes
let refreshInterval;

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Search functionality
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');
let allProjects = []; // Store all projects for filtering

// Search handler
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    // Show loading state
    showLoadingState();
    
    const filteredProjects = allProjects.filter(project => {
        return (
            project.title.toLowerCase().includes(searchTerm) ||
            project.designer_name.toLowerCase().includes(searchTerm) ||
            project.manager_name.toLowerCase().includes(searchTerm)
        );
    });
    
    // Update project cards with filtered results
    updateProjectCards(filteredProjects);
    noResults.classList.toggle('hidden', filteredProjects.length > 0);
    
    // Hide loading state
    hideLoadingState();
});

// Update database status indicator
function updateDatabaseStatus(status) {
    if (status.connected && status.sheetsAccessible) {
        dbStatusDot.style.backgroundColor = '#2ecc71'; // Green
        dbStatusDot.title = 'Database Connected';
    } else {
        dbStatusDot.style.backgroundColor = '#e74c3c'; // Red
        if (status.error) {
            console.warn('Database status:', status.error);
            // Show error tooltip with specific message
            if (status.error.includes('network')) {
                dbStatusDot.title = 'Network Error: Please check your internet connection';
            } else if (status.error.includes('authentication')) {
                dbStatusDot.title = 'Authentication Error: Please check your credentials';
            } else if (status.error.includes('permission')) {
                dbStatusDot.title = 'Permission Error: Access denied to Google Sheets';
            } else {
                dbStatusDot.title = `Database Error: ${status.error}`;
            }
        } else {
            dbStatusDot.title = 'Database Connection Error';
        }
    }
}

// Initialize database status check
async function initializeDatabaseStatus() {
    try {
        // Initial check
        const status = await window.api.checkDatabaseStatus();
        updateDatabaseStatus(status);

        // Set up periodic checks
        setInterval(async () => {
            try {
                const status = await window.api.checkDatabaseStatus();
                updateDatabaseStatus(status);
            } catch (error) {
                console.error('Database status check failed:', error);
                dbStatusDot.style.backgroundColor = '#e74c3c'; // Red
                dbStatusDot.title = 'Failed to check database status';
            }
        }, 5000); // Check every 5 seconds
    } catch (error) {
        console.error('Initial database status check failed:', error);
        dbStatusDot.style.backgroundColor = '#e74c3c'; // Red
        dbStatusDot.title = 'Failed to check database status';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Start database status monitoring
        await initializeDatabaseStatus();
        
        const session = await window.api.checkSession();
        if (session.success) {
            showDashboard();
            await initializeDashboard();
            startAutoRefresh();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showLogin();
    }
});

// Role-based view management
function setupRoleBasedView(userRole, permissions) {
    // Hide all admin-only elements by default
    document.querySelectorAll('[data-requires-permission]').forEach(element => {
        const requiredPermission = element.dataset.requiresPermission;
        const hasPermission = permissions[requiredPermission] === 'true';
        element.classList.toggle('hidden', !hasPermission);
    });

    // Team Members navigation
    const teamMembersNav = document.querySelector('.nav-item[data-view="team-members"]');
    if (teamMembersNav) {
        teamMembersNav.parentElement.classList.toggle('hidden', !permissions.view_team_members);
    }

    // Statistics visibility
    const statsContainer = document.querySelector('.stats-grid');
    if (statsContainer) {
        const adminOnlyStats = statsContainer.querySelectorAll('.admin-only-stat');
        adminOnlyStats.forEach(stat => {
            stat.classList.toggle('hidden', !permissions.view_all_stats);
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = permissions.global_search === 'true'
            ? "Search projects, designers, managers..."
            : "Search your projects...";
    }

    // Update header role display
    const roleDisplay = document.querySelector('#userRole');
    if (roleDisplay) {
        roleDisplay.textContent = userRole;
    }
} 