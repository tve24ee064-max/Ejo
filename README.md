# Waste Management System

A comprehensive web application for managing waste collection and disposal around CET Engineering College, Trivandrum.

## Features

### 🔐 Authentication System
- **Simple username-based authentication** (no password required)
- **Role-based access control** with three user types:
  - `admin` - Full administrative access
  - `worker` - Worker portal with bin and complaint management
  - `public` - Public user access for viewing and submitting
- **Automatic user creation** - any username creates a public user account

### 👥 User Portals

#### Public User Portal
- View nearby waste bins on an interactive map
- See bin types (paper, plastic, metal) and locations
- Submit waste management complaints
- Schedule waste collection requests
- Track complaint and collection status
- View personal complaint history

#### Worker Portal
- Full scheduling control and management
- View and manage all complaints
- Mark complaints as solved/unsolved/in progress
- Add and remove bins on the map
- Update collection schedules
- Track collection status

#### Admin Portal
- Complete system oversight
- User management capabilities
- Full bin management (add, remove, view all)
- Access to all complaints and schedules
- System-wide statistics and monitoring

### 🗺️ Location Features
- **Interactive map** centered on CET Engineering College, Trivandrum
- **Pre-loaded sample bins** at key campus locations:
  - CET Main Gate (Paper bin)
  - CET Library (Plastic bin)
  - CET Canteen (Metal bin)
  - CET Hostel Block A (Paper bin)
  - CET Administration Block (Plastic bin)
- **Bin filtering** by waste type
- **Location-based services** for complaint and collection scheduling

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 with comprehensive schema
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Map Integration**: Leaflet.js (OpenStreetMap)
- **Styling**: Custom CSS with responsive design
- **Session Management**: Express sessions

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ejo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Use one of the demo usernames or create your own

## Demo Users

- `admin` - Administrator access with full system control
- `worker1` - Worker access for operational management
- `john` - Public user for basic functionality
- **Any other username** - Creates a new public user account

## Database Schema

The application uses SQLite with the following tables:

- **users** - User accounts and roles
- **bins** - Waste bin locations and information
- **complaints** - User-submitted complaints and their status
- **schedules** - Waste collection scheduling and tracking

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Bins Management
- `GET /api/bins` - Get all active bins
- `POST /api/bins` - Add new bin (Worker/Admin only)
- `DELETE /api/bins/:id` - Remove bin (Worker/Admin only)

### Complaints
- `GET /api/complaints` - Get complaints (filtered by user role)
- `POST /api/complaints` - Submit new complaint
- `PUT /api/complaints/:id` - Update complaint status (Worker/Admin only)

### Scheduling
- `GET /api/schedules` - Get schedules (filtered by user role)
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule status (Worker/Admin only)

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```

## Features Implemented

✅ **Authentication System** - Username-based with role management  
✅ **Public User Portal** - Complete functionality for viewing and submitting  
✅ **Worker Portal** - Full operational control and management  
✅ **Admin Portal** - System-wide administration capabilities  
✅ **Interactive Dashboard** - Real-time statistics and quick actions  
✅ **Complaint Management** - Full lifecycle from submission to resolution  
✅ **Collection Scheduling** - Calendar-based scheduling with tracking  
✅ **Bin Management** - Location-based bin tracking and management  
✅ **Role-based Access Control** - Proper security and permission management  
✅ **Responsive Design** - Mobile-friendly interface  
✅ **Database Integration** - Complete data persistence and management  

## Project Structure

```
Ejo/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── database.sqlite        # SQLite database (auto-created)
├── public/                # Frontend assets
│   ├── index.html         # Main application page
│   ├── css/
│   │   └── style.css      # Application styles
│   └── js/
│       └── app.js         # Frontend JavaScript
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Waste Management System** - Making waste management efficient and accessible for CET Engineering College, Trivandrum.
