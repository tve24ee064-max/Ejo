// Global variables
let currentUser = null;
let map = null;
let bins = [];
let complaints = [];
let schedules = [];
let binMarkers = [];
let selectedLocation = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    setupEventListeners();
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            initializeApp();
        } else {
            showLoginModal();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginModal();
    }
}

// Show login modal
function showLoginModal() {
    console.log('Showing login modal');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('Login modal displayed');
    } else {
        console.error('Login modal not found');
    }
}

// Hide login modal
function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Modal forms
    document.getElementById('newComplaintForm').addEventListener('submit', handleNewComplaint);
    document.getElementById('newScheduleForm').addEventListener('submit', handleNewSchedule);
    document.getElementById('addBinForm').addEventListener('submit', handleAddBin);

    // Action buttons
    document.getElementById('newComplaintBtn').addEventListener('click', () => {
        document.getElementById('newComplaintModal').style.display = 'block';
    });

    document.getElementById('newScheduleBtn').addEventListener('click', () => {
        loadBinsForSchedule();
        document.getElementById('newScheduleModal').style.display = 'block';
    });

    document.getElementById('addBinBtn').addEventListener('click', () => {
        document.getElementById('addBinModal').style.display = 'block';
    });

    // Filter
    document.getElementById('binTypeFilter').addEventListener('change', filterBins);

    // Close modals when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();

    if (!username) {
        alert('Please enter a username');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            hideLoginModal();
            initializeApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        document.getElementById('userWelcome').textContent = '';
        showLoginModal();

        // Reset navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize the application
function initializeApp() {
    updateUI();
    showSection('dashboard');
    loadDashboardData();
}

// Update UI based on user role
function updateUI() {
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.username} (${currentUser.role})`;

    // Show/hide navigation items based on role
    const adminNav = document.getElementById('adminNav');
    const workerControls = document.getElementById('workerControls');

    if (currentUser.role === 'admin') {
        adminNav.style.display = 'block';
        workerControls.style.display = 'flex';
    } else if (currentUser.role === 'worker') {
        adminNav.style.display = 'none';
        workerControls.style.display = 'flex';
    } else {
        adminNav.style.display = 'none';
        workerControls.style.display = 'none';
    }
}

// Show section
function showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');

    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'map':
            loadMapData();
            break;
        case 'complaints':
            loadComplaints();
            break;
        case 'schedule':
            loadSchedules();
            break;
        case 'admin':
            loadAdminData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load bins
        const binsResponse = await fetch('/api/bins');
        const binsData = await binsResponse.json();
        document.getElementById('totalBins').textContent = binsData.length;

        // Load complaints
        const complaintsResponse = await fetch('/api/complaints');
        const complaintsData = await complaintsResponse.json();
        const pendingComplaints = complaintsData.filter(c => c.status === 'pending').length;
        document.getElementById('pendingComplaints').textContent = pendingComplaints;

        // Load schedules
        const schedulesResponse = await fetch('/api/schedules');
        const schedulesData = await schedulesResponse.json();
        const scheduledCollections = schedulesData.filter(s => s.status === 'scheduled').length;
        const completedTasks = schedulesData.filter(s => s.status === 'completed').length;
        document.getElementById('scheduledCollections').textContent = scheduledCollections;
        document.getElementById('completedTasks').textContent = completedTasks;

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load map data
async function loadMapData() {
    if (!map) {
        initializeMap();
    }
    await loadBins();
    displayBinsOnMap();
}

// Initialize map
function initializeMap() {
    // Center on CET Engineering College, Trivandrum - focused on actual bin locations
    const cetLocation = [8.545579, 76.905784];

    map = L.map('mapContainer').setView(cetLocation, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click handler for adding bins (workers/admin only)
    if (currentUser && (currentUser.role === 'worker' || currentUser.role === 'admin')) {
        map.on('click', function (e) {
            selectedLocation = e.latlng;
            document.getElementById('binLat').value = e.latlng.lat.toFixed(6);
            document.getElementById('binLng').value = e.latlng.lng.toFixed(6);
        });
    }
}

// Load bins
async function loadBins() {
    try {
        console.log('Loading bins from /api/bins');
        const response = await fetch('/api/bins');
        console.log('Bins response status:', response.status);
        bins = await response.json();
        console.log('Loaded bins:', bins);
        return bins;
    } catch (error) {
        console.error('Error loading bins:', error);
        return [];
    }
}

// Display bins on map
function displayBinsOnMap() {
    console.log('Displaying bins on map, total bins:', bins.length);
    
    // Clear existing markers
    binMarkers.forEach(marker => map.removeLayer(marker));
    binMarkers = [];

    // Filter bins based on type filter
    const typeFilter = document.getElementById('binTypeFilter').value;
    let filteredBins = bins;
    if (typeFilter) {
        filteredBins = bins.filter(bin => bin.type === typeFilter);
    }
    
    console.log('Filtered bins to display:', filteredBins.length);

    // Add markers for each bin
    filteredBins.forEach(bin => {
        const icon = getBinIcon(bin.type);
        const marker = L.marker([bin.latitude, bin.longitude], { icon }).addTo(map);

        const popupContent = `
            <div class="bin-popup">
                <h4>${bin.location_name || 'Waste Bin'}</h4>
                <div class="bin-type">${bin.type}</div>
                <div class="bin-location">Lat: ${bin.latitude.toFixed(4)}, Lng: ${bin.longitude.toFixed(4)}</div>
                ${(currentUser.role === 'worker' || currentUser.role === 'admin')
                ? `<div class="bin-actions">
                         <button class="btn btn-danger btn-small" onclick="deleteBin(${bin.id})">Remove</button>
                       </div>`
                : ''}
            </div>
        `;

        marker.bindPopup(popupContent);
        binMarkers.push(marker);
    });
}

// Get bin icon based on type
function getBinIcon(type) {
    const colors = {
        paper: '#4CAF50',
        plastic: '#2196F3',
        metal: '#FF9800'
    };

    return L.divIcon({
        className: 'custom-bin-icon',
        html: `<div style="background-color: ${colors[type]}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// Filter bins
function filterBins() {
    if (map && bins.length > 0) {
        displayBinsOnMap();
    }
}

// Delete bin
async function deleteBin(binId) {
    if (!confirm('Are you sure you want to remove this bin?')) {
        return;
    }

    try {
        const response = await fetch(`/api/bins/${binId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadBins();
            displayBinsOnMap();
            loadDashboardData();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete bin');
        }
    } catch (error) {
        console.error('Error deleting bin:', error);
        alert('Failed to delete bin');
    }
}

// Handle add bin
async function handleAddBin(e) {
    e.preventDefault();

    const type = document.getElementById('binType').value;
    const location_name = document.getElementById('binLocation').value;
    const latitude = parseFloat(document.getElementById('binLat').value);
    const longitude = parseFloat(document.getElementById('binLng').value);

    if (!type || !location_name || !latitude || !longitude) {
        alert('Please fill all fields and select a location on the map');
        return;
    }

    try {
        const response = await fetch('/api/bins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, location_name, latitude, longitude })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('addBinModal');
            document.getElementById('addBinForm').reset();
            await loadBins();
            displayBinsOnMap();
            loadDashboardData();
            alert('Bin added successfully!');
        } else {
            alert(data.error || 'Failed to add bin');
        }
    } catch (error) {
        console.error('Error adding bin:', error);
        alert('Failed to add bin');
    }
}

// Load complaints
async function loadComplaints() {
    try {
        const response = await fetch('/api/complaints');
        complaints = await response.json();
        displayComplaints();
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

// Display complaints
function displayComplaints() {
    const complaintsContainer = document.getElementById('complaintsList');

    if (complaints.length === 0) {
        complaintsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No complaints found.</p>
            </div>
        `;
        return;
    }

    complaintsContainer.innerHTML = complaints.map(complaint => `
        <div class="complaint-item">
            <div class="complaint-header">
                <div>
                    <div class="complaint-title">${complaint.title}</div>
                    <div class="complaint-meta">
                        <span><i class="fas fa-user"></i> ${complaint.user_name}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(complaint.created_at).toLocaleDateString()}</span>
                        <span class="status-badge status-${complaint.status}">${complaint.status}</span>
                        <span class="status-badge priority-${complaint.priority}">${complaint.priority} priority</span>
                    </div>
                </div>
                ${(currentUser.role === 'worker' || currentUser.role === 'admin') ? `
                    <div class="complaint-actions">
                        <select onchange="updateComplaintStatus(${complaint.id}, this.value)">
                            <option value="">Update Status</option>
                            <option value="in_progress" ${complaint.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="solved" ${complaint.status === 'solved' ? 'selected' : ''}>Solved</option>
                            <option value="unsolved" ${complaint.status === 'unsolved' ? 'selected' : ''}>Unsolved</option>
                        </select>
                    </div>
                ` : ''}
            </div>
            <p>${complaint.description}</p>
            ${complaint.location_name ? `<p><i class="fas fa-map-marker-alt"></i> ${complaint.location_name}</p>` : ''}
            ${complaint.resolved_by_name ? `<p><i class="fas fa-user-check"></i> Resolved by: ${complaint.resolved_by_name}</p>` : ''}
        </div>
    `).join('');
}

// Handle new complaint
async function handleNewComplaint(e) {
    e.preventDefault();

    const title = document.getElementById('complaintTitle').value;
    const description = document.getElementById('complaintDescription').value;
    const priority = document.getElementById('complaintPriority').value;
    const location_name = document.getElementById('complaintLocationName').value;

    try {
        const response = await fetch('/api/complaints', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, priority, location_name })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('newComplaintModal');
            document.getElementById('newComplaintForm').reset();
            loadComplaints();
            loadDashboardData();
            alert('Complaint submitted successfully!');
        } else {
            alert(data.error || 'Failed to submit complaint');
        }
    } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('Failed to submit complaint');
    }
}

// Update complaint status
async function updateComplaintStatus(complaintId, status) {
    if (!status) return;

    try {
        const response = await fetch(`/api/complaints/${complaintId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            loadComplaints();
            loadDashboardData();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update complaint status');
        }
    } catch (error) {
        console.error('Error updating complaint status:', error);
        alert('Failed to update complaint status');
    }
}

// Load schedules
async function loadSchedules() {
    try {
        const response = await fetch('/api/schedules');
        schedules = await response.json();
        displaySchedules();
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

// Display schedules
function displaySchedules() {
    const schedulesContainer = document.getElementById('scheduleList');

    if (schedules.length === 0) {
        schedulesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <p>No scheduled collections found.</p>
            </div>
        `;
        return;
    }

    schedulesContainer.innerHTML = schedules.map(schedule => {
        const isAssignedToCurrentUser = schedule.assigned_worker_id === currentUser.id;
        const canManage = currentUser.role === 'admin' || isAssignedToCurrentUser;

        return `
        <div class="schedule-item ${isAssignedToCurrentUser ? 'assigned-to-me' : ''}">
            <div class="schedule-header">
                <div>
                    <div class="schedule-title">
                        Collection on ${new Date(schedule.collection_date).toLocaleDateString()}
                        ${isAssignedToCurrentUser ? '<span class="assigned-badge">Assigned to You</span>' : ''}
                    </div>
                    <div class="schedule-meta">
                        <span><i class="fas fa-clock"></i> ${schedule.collection_time}</span>
                        <span><i class="fas fa-user"></i> ${schedule.user_name}</span>
                        ${schedule.assigned_worker_name ? `<span><i class="fas fa-user-cog"></i> Assigned: ${schedule.assigned_worker_name}</span>` : ''}
                        <span class="status-badge status-${schedule.status}">${schedule.status.replace('_', ' ')}</span>
                        ${schedule.bin_type ? `<span class="status-badge">${schedule.bin_type} bin</span>` : ''}
                    </div>
                </div>
                <div class="schedule-actions">
                    ${canManage ? `
                        <select onchange="updateScheduleStatus(${schedule.id}, this.value)">
                            <option value="">Update Status</option>
                            <option value="in_progress" ${schedule.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${schedule.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${schedule.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    ` : ''}
                    ${currentUser.role === 'admin' && !schedule.assigned_worker_id ? `
                        <button class="btn btn-primary btn-small" onclick="showAssignWorkerModal(${schedule.id})">
                            <i class="fas fa-user-plus"></i> Assign Worker
                        </button>
                    ` : ''}
                </div>
            </div>
            ${schedule.bin_location ? `<p><i class="fas fa-map-marker-alt"></i> ${schedule.bin_location}</p>` : ''}
            ${schedule.notes ? `<p><i class="fas fa-sticky-note"></i> Notes: ${schedule.notes}</p>` : ''}
            ${schedule.admin_notes && currentUser.role === 'admin' ? `<p><i class="fas fa-lock"></i> Admin Notes: ${schedule.admin_notes}</p>` : ''}
            ${schedule.collector_name ? `<p><i class="fas fa-user-check"></i> Collector: ${schedule.collector_name}</p>` : ''}
        </div>
    `;
    }).join('');
}

// Load bins for schedule dropdown
async function loadBinsForSchedule() {
    try {
        const response = await fetch('/api/bins');
        const bins = await response.json();
        const select = document.getElementById('scheduleBin');

        select.innerHTML = '<option value="">General Collection</option>';
        bins.forEach(bin => {
            select.innerHTML += `<option value="${bin.id}">${bin.location_name || 'Unnamed'} (${bin.type})</option>`;
        });

        // Load workers for assignment (admin only)
        if (currentUser.role === 'admin') {
            document.getElementById('workerAssignmentGroup').style.display = 'block';
            document.getElementById('adminNotesGroup').style.display = 'block';
            await loadWorkersForAssignment();
        }
    } catch (error) {
        console.error('Error loading bins for schedule:', error);
    }
}

// Load workers for assignment dropdown
async function loadWorkersForAssignment() {
    try {
        const response = await fetch('/api/workers');
        const workers = await response.json();
        const select = document.getElementById('assignedWorker');

        select.innerHTML = '<option value="">No specific assignment</option>';
        workers.forEach(worker => {
            select.innerHTML += `<option value="${worker.id}">${worker.username} (${worker.id === currentUser.id ? 'You' : 'Worker'})</option>`;
        });
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

// Handle new schedule
async function handleNewSchedule(e) {
    e.preventDefault();

    const bin_id = document.getElementById('scheduleBin').value || null;
    const collection_date = document.getElementById('scheduleDate').value;
    const collection_time = document.getElementById('scheduleTime').value;
    const notes = document.getElementById('scheduleNotes').value;
    const assigned_worker_id = document.getElementById('assignedWorker').value || null;
    const admin_notes = document.getElementById('adminNotes').value;

    try {
        const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bin_id, collection_date, collection_time, notes, assigned_worker_id, admin_notes })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('newScheduleModal');
            document.getElementById('newScheduleForm').reset();
            loadSchedules();
            loadDashboardData();
            alert('Collection scheduled successfully!');
        } else {
            alert(data.error || 'Failed to schedule collection');
        }
    } catch (error) {
        console.error('Error scheduling collection:', error);
        alert('Failed to schedule collection');
    }
}

// Update schedule status
async function updateScheduleStatus(scheduleId, status) {
    if (!status) return;

    const collector_name = status === 'completed' ? prompt('Enter collector name:') : null;

    try {
        const response = await fetch(`/api/schedules/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, collector_name })
        });

        if (response.ok) {
            loadSchedules();
            loadDashboardData();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update schedule status');
        }
    } catch (error) {
        console.error('Error updating schedule status:', error);
        alert('Failed to update schedule status');
    }
}

// Load admin data
function loadAdminData() {
    showAdminTab('users');
}

// Show admin tab
function showAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');

    // Load tab data
    switch (tabName) {
        case 'users':
            loadAdminUsers();
            break;
        case 'bins':
            loadAdminBins();
            break;
        case 'complaints':
            loadAdminComplaints();
            break;
        case 'schedules':
            loadAdminSchedules();
            break;
    }
}

// Load admin users (placeholder)
function loadAdminUsers() {
    document.getElementById('usersList').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>User management functionality would be implemented here.</p>
            <p>Current features include automatic user creation on login.</p>
        </div>
    `;
}

// Load admin bins
async function loadAdminBins() {
    try {
        const response = await fetch('/api/bins');
        const bins = await response.json();

        document.getElementById('adminBinsList').innerHTML = bins.map(bin => `
            <div class="complaint-item">
                <div class="complaint-header">
                    <div>
                        <div class="complaint-title">${bin.location_name || 'Unnamed Bin'}</div>
                        <div class="complaint-meta">
                            <span class="status-badge">${bin.type}</span>
                            <span class="status-badge status-${bin.status}">${bin.status}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${bin.latitude.toFixed(4)}, ${bin.longitude.toFixed(4)}</span>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-danger btn-small" onclick="deleteBin(${bin.id})">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading admin bins:', error);
    }
}

// Load admin complaints
async function loadAdminComplaints() {
    await loadComplaints();
    document.getElementById('adminComplaintsList').innerHTML = document.getElementById('complaintsList').innerHTML;
}

// Load admin schedules
async function loadAdminSchedules() {
    await loadSchedules();
    document.getElementById('adminSchedulesList').innerHTML = document.getElementById('scheduleList').innerHTML;
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Set minimum date for schedule to today
document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }

    // Setup worker assignment form handler
    const assignWorkerForm = document.getElementById('assignWorkerForm');
    if (assignWorkerForm) {
        assignWorkerForm.addEventListener('submit', handleWorkerAssignment);
    }
});

// Global variable to store schedule ID for assignment
let scheduleIdForAssignment = null;

// Show assign worker modal
async function showAssignWorkerModal(scheduleId) {
    scheduleIdForAssignment = scheduleId;

    // Load workers
    try {
        const response = await fetch('/api/workers');
        const workers = await response.json();
        const select = document.getElementById('assignWorkerSelect');

        select.innerHTML = '<option value="">Choose a worker...</option>';
        workers.forEach(worker => {
            select.innerHTML += `<option value="${worker.id}">${worker.username}</option>`;
        });

        document.getElementById('assignWorkerModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading workers:', error);
        alert('Failed to load workers');
    }
}

// Handle worker assignment
async function handleWorkerAssignment(e) {
    e.preventDefault();

    const assigned_worker_id = document.getElementById('assignWorkerSelect').value;
    const admin_notes = document.getElementById('assignmentNotes').value;

    if (!assigned_worker_id) {
        alert('Please select a worker');
        return;
    }

    try {
        const response = await fetch(`/api/schedules/${scheduleIdForAssignment}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ assigned_worker_id, admin_notes })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('assignWorkerModal');
            document.getElementById('assignWorkerForm').reset();
            loadSchedules();
            alert('Worker assigned successfully!');
        } else {
            alert(data.error || 'Failed to assign worker');
        }
    } catch (error) {
        console.error('Error assigning worker:', error);
        alert('Failed to assign worker');
    }
}