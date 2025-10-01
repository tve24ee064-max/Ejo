// Vercel serverless function for waste management API
const express = require('express');
const cors = require('cors');
const session = require('express-session');

// In-memory storage for demo (in production, use external database)
let users = [
    { id: 1, username: 'admin', role: 'admin' },
    { id: 2, username: 'worker1', role: 'worker' },
    { id: 3, username: 'worker2', role: 'worker' }
];

let bins = [
    { id: 1, type: 'metal', latitude: 8.546425, longitude: 76.906937, location_name: 'Mech Department', status: 'active' },
    { id: 2, type: 'paper', latitude: 8.545169, longitude: 76.904677, location_name: 'Open Gym', status: 'active' },
    { id: 3, type: 'plastic', latitude: 8.545369, longitude: 76.905679, location_name: 'EC Department', status: 'active' },
    { id: 4, type: 'paper', latitude: 8.545475, longitude: 76.906845, location_name: 'Cooperative Store', status: 'active' }
];

let complaints = [];
let schedules = [];
let nextId = { users: 4, bins: 5, complaints: 1, schedules: 1 };

const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'ejo-waste-management-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Helper functions
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

const requireRole = (roles) => (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};

// Authentication routes
app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    let user = users.find(u => u.username === username);
    
    if (!user) {
        // Create new public user
        const role = username === 'admin' ? 'admin' : 'public';
        user = {
            id: nextId.users++,
            username,
            role,
            created_at: new Date().toISOString()
        };
        users.push(user);
    }
    
    req.session.user = user;
    res.json({ user, message: 'Logged in successfully' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Bins routes
app.get('/api/bins', (req, res) => {
    const activeBins = bins.filter(bin => bin.status === 'active');
    res.json(activeBins);
});

app.post('/api/bins', requireAuth, requireRole(['worker', 'admin']), (req, res) => {
    const { type, latitude, longitude, location_name } = req.body;
    
    if (!type || !latitude || !longitude) {
        return res.status(400).json({ error: 'Type, latitude, and longitude are required' });
    }

    const newBin = {
        id: nextId.bins++,
        type,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location_name,
        status: 'active',
        created_at: new Date().toISOString(),
        created_by: req.session.user.id
    };
    
    bins.push(newBin);
    res.json({ id: newBin.id, message: 'Bin created successfully' });
});

// Complaints routes
app.get('/api/complaints', requireAuth, (req, res) => {
    let userComplaints = complaints;
    
    if (req.session.user.role === 'public') {
        userComplaints = complaints.filter(c => c.user_id === req.session.user.id);
    }
    
    // Add user names
    const complaintsWithUsers = userComplaints.map(complaint => ({
        ...complaint,
        user_name: users.find(u => u.id === complaint.user_id)?.username || 'Unknown'
    }));
    
    res.json(complaintsWithUsers);
});

app.post('/api/complaints', requireAuth, (req, res) => {
    const { title, description, latitude, longitude, location_name, priority } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    const newComplaint = {
        id: nextId.complaints++,
        user_id: req.session.user.id,
        title,
        description,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        location_name,
        priority: priority || 'medium',
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    complaints.push(newComplaint);
    res.json({ id: newComplaint.id, message: 'Complaint submitted successfully' });
});

// Schedules routes
app.get('/api/schedules', requireAuth, (req, res) => {
    let userSchedules = schedules;
    
    if (req.session.user.role === 'public') {
        userSchedules = schedules.filter(s => s.user_id === req.session.user.id);
    } else if (req.session.user.role === 'worker') {
        userSchedules = schedules.filter(s => 
            s.user_id === req.session.user.id || s.assigned_worker_id === req.session.user.id
        );
    }
    
    // Add user and bin info
    const schedulesWithInfo = userSchedules.map(schedule => ({
        ...schedule,
        user_name: users.find(u => u.id === schedule.user_id)?.username || 'Unknown',
        assigned_worker_name: schedule.assigned_worker_id ? 
            users.find(u => u.id === schedule.assigned_worker_id)?.username : null,
        bin_location: schedule.bin_id ? 
            bins.find(b => b.id === schedule.bin_id)?.location_name : null,
        bin_type: schedule.bin_id ? 
            bins.find(b => b.id === schedule.bin_id)?.type : null
    }));
    
    res.json(schedulesWithInfo);
});

app.post('/api/schedules', requireAuth, (req, res) => {
    const { bin_id, collection_date, collection_time, notes, assigned_worker_id, admin_notes } = req.body;
    
    if (!collection_date || !collection_time) {
        return res.status(400).json({ error: 'Collection date and time are required' });
    }

    const newSchedule = {
        id: nextId.schedules++,
        user_id: req.session.user.id,
        bin_id: bin_id ? parseInt(bin_id) : null,
        collection_date,
        collection_time,
        notes,
        assigned_worker_id: assigned_worker_id ? parseInt(assigned_worker_id) : null,
        admin_notes,
        status: 'scheduled',
        created_at: new Date().toISOString()
    };
    
    schedules.push(newSchedule);
    res.json({ id: newSchedule.id, message: 'Schedule created successfully' });
});

// Get workers
app.get('/api/workers', requireAuth, requireRole(['admin', 'worker']), (req, res) => {
    const workers = users.filter(u => ['worker', 'admin'].includes(u.role));
    res.json(workers.map(w => ({ id: w.id, username: w.username })));
});

// Export for Vercel
module.exports = app;