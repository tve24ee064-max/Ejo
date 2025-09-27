const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ejo-waste-management-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Initialize SQLite database
const db = new sqlite3.Database('database.sqlite');

// Create tables
db.serialize(() => {
    // Users table (simple username-based auth)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'public' CHECK (role IN ('public', 'worker', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bins table
    db.run(`CREATE TABLE IF NOT EXISTS bins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('paper', 'plastic', 'metal')),
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_name TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Complaints table
    db.run(`CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        latitude REAL,
        longitude REAL,
        location_name TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'solved', 'unsolved')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (resolved_by) REFERENCES users (id)
    )`);

    // Waste collection schedules table
    db.run(`CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bin_id INTEGER,
        collection_date DATE NOT NULL,
        collection_time TIME NOT NULL,
        status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        collector_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (bin_id) REFERENCES bins (id)
    )`);

    // Insert default admin user
    db.run(`INSERT OR IGNORE INTO users (username, role) VALUES ('admin', 'admin')`);
    
    // Insert some sample bins around CET Engineering College, Trivandrum
    const sampleBins = [
        ['paper', 8.5513, 76.8995, 'CET Main Gate'],
        ['plastic', 8.5520, 76.9000, 'CET Library'],
        ['metal', 8.5510, 76.8990, 'CET Canteen'],
        ['paper', 8.5525, 76.9005, 'CET Hostel Block A'],
        ['plastic', 8.5505, 76.8985, 'CET Administration Block']
    ];
    
    const insertBin = db.prepare(`INSERT OR IGNORE INTO bins (type, latitude, longitude, location_name) VALUES (?, ?, ?, ?)`);
    sampleBins.forEach(bin => {
        insertBin.run(bin);
    });
    insertBin.finalize();
});

// Authentication middleware
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

// Routes

// Authentication routes
app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user exists, if not create them as public user
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            // Create new public user
            const role = username === 'admin' ? 'admin' : 'public';
            db.run('INSERT INTO users (username, role) VALUES (?, ?)', [username, role], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }
                
                const newUser = { id: this.lastID, username, role };
                req.session.user = newUser;
                res.json({ user: newUser, message: 'User created and logged in successfully' });
            });
        } else {
            req.session.user = user;
            res.json({ user, message: 'Logged in successfully' });
        }
    });
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
    db.all('SELECT * FROM bins WHERE status = "active"', (err, bins) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(bins);
    });
});

app.post('/api/bins', requireAuth, requireRole(['worker', 'admin']), (req, res) => {
    const { type, latitude, longitude, location_name } = req.body;
    
    if (!type || !latitude || !longitude) {
        return res.status(400).json({ error: 'Type, latitude, and longitude are required' });
    }

    db.run('INSERT INTO bins (type, latitude, longitude, location_name, created_by) VALUES (?, ?, ?, ?, ?)',
        [type, latitude, longitude, location_name, req.session.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create bin' });
        }
        res.json({ id: this.lastID, message: 'Bin created successfully' });
    });
});

app.delete('/api/bins/:id', requireAuth, requireRole(['worker', 'admin']), (req, res) => {
    const binId = req.params.id;
    
    db.run('UPDATE bins SET status = "inactive" WHERE id = ?', [binId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete bin' });
        }
        res.json({ message: 'Bin deleted successfully' });
    });
});

// Complaints routes
app.get('/api/complaints', requireAuth, (req, res) => {
    let query = `SELECT c.*, u.username as user_name, r.username as resolved_by_name 
                FROM complaints c 
                LEFT JOIN users u ON c.user_id = u.id 
                LEFT JOIN users r ON c.resolved_by = r.id`;
    
    // Public users can only see their own complaints
    if (req.session.user.role === 'public') {
        query += ` WHERE c.user_id = ${req.session.user.id}`;
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    db.all(query, (err, complaints) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(complaints);
    });
});

app.post('/api/complaints', requireAuth, (req, res) => {
    const { title, description, latitude, longitude, location_name, priority } = req.body;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    db.run('INSERT INTO complaints (user_id, title, description, latitude, longitude, location_name, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.session.user.id, title, description, latitude, longitude, location_name, priority || 'medium'], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create complaint' });
        }
        res.json({ id: this.lastID, message: 'Complaint submitted successfully' });
    });
});

app.put('/api/complaints/:id', requireAuth, requireRole(['worker', 'admin']), (req, res) => {
    const complaintId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    db.run('UPDATE complaints SET status = ?, resolved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.session.user.id, complaintId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update complaint' });
        }
        res.json({ message: 'Complaint updated successfully' });
    });
});

// Schedules routes
app.get('/api/schedules', requireAuth, (req, res) => {
    let query = `SELECT s.*, u.username as user_name, b.type as bin_type, b.location_name as bin_location 
                FROM schedules s 
                LEFT JOIN users u ON s.user_id = u.id 
                LEFT JOIN bins b ON s.bin_id = b.id`;
    
    // Public users can only see their own schedules
    if (req.session.user.role === 'public') {
        query += ` WHERE s.user_id = ${req.session.user.id}`;
    }
    
    query += ' ORDER BY s.collection_date DESC, s.collection_time DESC';
    
    db.all(query, (err, schedules) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(schedules);
    });
});

app.post('/api/schedules', requireAuth, (req, res) => {
    const { bin_id, collection_date, collection_time, notes } = req.body;
    
    if (!collection_date || !collection_time) {
        return res.status(400).json({ error: 'Collection date and time are required' });
    }

    db.run('INSERT INTO schedules (user_id, bin_id, collection_date, collection_time, notes) VALUES (?, ?, ?, ?, ?)',
        [req.session.user.id, bin_id, collection_date, collection_time, notes], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create schedule' });
        }
        res.json({ id: this.lastID, message: 'Schedule created successfully' });
    });
});

app.put('/api/schedules/:id', requireAuth, requireRole(['worker', 'admin']), (req, res) => {
    const scheduleId = req.params.id;
    const { status, collector_name } = req.body;
    
    db.run('UPDATE schedules SET status = ?, collector_name = ? WHERE id = ?',
        [status, collector_name, scheduleId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update schedule' });
        }
        res.json({ message: 'Schedule updated successfully' });
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});