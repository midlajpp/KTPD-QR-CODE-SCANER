# KTPD Membership Management System

> **Enterprise-Grade Full-Stack MERN Membership Management System**  
> Built for **Kerala Transport Drivers Association (KTPD) – UAE Chapter**  
> Featuring Role-Based Account Management, Permanent Dynamic QR Codes, QR Public Profile Design Customizer, Advanced Dynamic Field Builder, and Bulk Export Utilities.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [Project Folder Structure](#-project-folder-structure)
4. [Installation Instructions](#-installation-instructions)
5. [Development Setup](#-development-setup)
6. [MongoDB Atlas Setup](#-mongodb-atlas-setup)
7. [Environment Variables](#-environment-variables)
8. [Initial Super Admin Setup](#-initial-super-admin-setup)
9. [Account Management & RBAC Guide](#-account-management--rbac-guide)
10. [Member Management Guide](#-member-management-guide)
11. [Dynamic Field Builder Guide](#-dynamic-field-builder-guide)
12. [QR Code System & Public Profile Guide](#-qr-code-system--public-profile-guide)
13. [QR Profile Design Customizer Guide](#-qr-profile-design-customizer-guide)
14. [Smart CSV Import Guide](#-smart-csv-import-guide)
15. [Bulk Export Guide](#-bulk-export-guide)
16. [API Reference Overview](#-api-reference-overview)
17. [Production Deployment Instructions](#-production-deployment-instructions)
18. [Backup and Restore Procedure](#-backup-and-restore-procedure)
19. [Offline & Connectivity Architecture](#-offline--connectivity-architecture)
20. [Troubleshooting Guide](#-troubleshooting-guide)

---

## 🌟 Project Overview

The **KTPD Membership Management System** is a mission-critical web application designed to maintain, verify, and administer drivers across the UAE chapter of the Kerala Transport Drivers Association. 

### Core Capabilities:
- **Permanent Dynamic QR Code Identification:** Every member receives a permanent, collision-free 128-bit cryptographically secure QR token. QR codes printed on physical plastic cards **never expire and never change**, even when member attributes, mobile numbers, company affiliations, or addresses are updated.
- **Single Source of Truth Membership ID:** Membership IDs entered via custom alphanumeric fields (e.g. `D343`, `KTPD001`, `KTPD/2026/001`) are automatically synchronized across all directory listings, profile headers, badges, CSV exports, and public QR scans.
- **QR Profile Design Customizer:** Direct in-browser visual design customization of the page opened when scanning member QR codes, supporting 5 layout templates, branding, custom palettes, independent text size stepper controls, and draft-versus-published isolation.
- **Account Management & RBAC:** Complete multi-tier role-based access control supporting `Super Admin`, `Admin`, and `Staff` roles with backend-enforced permission gates and audit trails.
- **Dynamic Custom Field Builder:** 11 supported field types with nested sub-fields, multi-choice checkbox questions, and dynamic conditional branching logic.
- **High-Throughput Bulk Export:** Export member directories to UTF-8 CSV, bulk QR PNG zip packages, and full system backup bundles.

---

## 🛠 Technology Stack

### Backend
- **Runtime:** Node.js (v18+, v20+, v22+)
- **Web Framework:** Express.js 4 (Modular REST API)
- **Database & ODM:** MongoDB (v6+) via Mongoose 8
- **Authentication & Security:** JWT (JSON Web Tokens), bcryptjs (12 salt rounds), Helmet, Express Rate Limiter, CORS
- **File Handling & Compression:** Multer, Archiver, PapaParse, QRCode (SVG/PNG generator with Error Correction 'H')
- **Testing:** Jest, Supertest, MongoMemoryServer

### Frontend
- **Framework & Tooling:** React 18, Vite 6 (Fast HMR & Optimized Production Bundler)
- **Routing:** React Router DOM v6 with Role-Based Route Guards
- **State & Context:** React Context API (`AuthContext`, `ToastContext`, `ThemeContext`)
- **HTTP Client:** Axios with dynamic auth token interceptors
- **Icons & Typography:** Lucide React icons, Google Fonts dynamic injector (Poppins, Inter, Nunito, Montserrat, Roboto)
- **Design System:** Pure Modular CSS Custom Properties (Vanilla CSS) with Dark & Light theme engines

---

## 📁 Project Folder Structure

```
KTPD Data Base Project/
├── .env.example                     # Environment template (root)
├── package.json                     # Root orchestrator script
├── README.md                        # Complete system documentation
├── client/                          # React + Vite Frontend
│   ├── index.html                   # HTML entrypoint
│   ├── vite.config.js               # Vite configuration
│   ├── package.json                 # Frontend dependencies
│   └── src/
│       ├── App.jsx                  # Route definitions & Role Guards
│       ├── main.jsx                 # React root render
│       ├── components/              # Reusable UI components
│       │   ├── Badge.jsx            # Status, role, and blood group badges
│       │   ├── ConfirmDialog.jsx    # Destructive action confirmation modals
│       │   ├── DynamicFieldInput.jsx# Dynamic field form controls
│       │   ├── Layout.jsx           # Topbar & Sidebar layout frame
│       │   ├── LoadingSpinner.jsx   # State loaders
│       │   ├── MemberDetailModal.jsx# Member profile inspection modal
│       │   ├── MemberFormModal.jsx  # Member creation & editing form
│       │   ├── Modal.jsx            # Accessible base modal
│       │   ├── Navbar.jsx           # Header bar with user profile & theme switch
│       │   ├── ProfileCardView.jsx  # Dynamic profile card renderer
│       │   └── Sidebar.jsx          # Role-filtered navigation sidebar
│       ├── context/                 # Application contexts
│       │   ├── AuthContext.jsx      # Authentication & RBAC state
│       │   ├── ThemeContext.jsx     # Light / Dark theme toggles
│       │   └── ToastContext.jsx     # Notification toast provider
│       ├── pages/                   # Application pages
│       │   ├── AccountManagementPage.jsx # Super Admin account administration
│       │   ├── BulkExportPage.jsx   # Member CSV & QR ZIP export center
│       │   ├── DashboardPage.jsx    # Analytics & aggregate statistics
│       │   ├── ImportPage.jsx       # CSV bulk member ingestion
│       │   ├── LoginPage.jsx        # Administrative authentication
│       │   ├── ManageFieldsPage.jsx # Custom field & sub-field builder
│       │   ├── MembersListPage.jsx  # Member directory, search, & QR view
│       │   ├── NotFoundPage.jsx     # 404 handler
│       │   ├── PublicProfilePage.jsx# Public QR scan member profile
│       │   └── QRProfileDesignPage.jsx # Visual QR design customizer
│       ├── services/                # API client abstraction services
│       │   ├── accountService.js    # Account management endpoints
│       │   ├── api.js               # Axios instance with interceptors
│       │   ├── dashboardService.js  # Stats & logs API
│       │   ├── designService.js     # Design customizer API
│       │   ├── fieldService.js      # Dynamic field builder API
│       │   └── memberService.js     # Member CRUD & QR API
│       ├── styles/                  # CSS design system
│       │   ├── index.css            # Base design system & dark mode
│       │   ├── design-customizer.css# Customizer stepper & control styles
│       │   ├── profile-templates.css# Card templates & badge styles
│       │   └── public-profile.css   # Fallback public styles
│       └── utils/
│           ├── fontLoader.js        # Google Fonts dynamic loader
│           └── memberUtils.js       # Alphanumeric ID resolution
└── server/                          # Node.js + Express Backend
    ├── server.js                    # Server entrypoint & route registration
    ├── package.json                 # Backend dependencies
    ├── .env.example                 # Backend environment template
    ├── config/
    │   └── db.js                    # Database connection & persistence guard
    ├── controllers/
    │   ├── accountController.js     # Account management logic
    │   ├── authController.js        # Authentication & session controllers
    │   ├── dashboardController.js   # Aggregate analytics & audit logs
    │   ├── designController.js      # Profile design draft & publish logic
    │   ├── fieldController.js       # Dynamic field CRUD & option nesting
    │   ├── memberController.js     # Member CRUD, CSV import & bulk export
    │   └── publicController.js     # Cryptographic QR token verification
    ├── middleware/
    │   ├── auth.js                  # JWT verification & RBAC middleware
    │   ├── errorHandler.js          # Central error handling
    │   ├── rateLimiter.js           # Brute force & rate limiting
    │   └── uploadMiddleware.js      # Multer file upload storage
    ├── models/
    │   ├── Admin.js                 # Authorized accounts schema
    │   ├── AuditLog.js              # Administrative audit logs schema
    │   ├── Counter.js               # Atomic sequential ID counter
    │   ├── Member.js                # Core member records schema
    │   ├── MemberField.js           # Dynamic custom fields definition
    │   └── ProfileDesign.js         # Singleton design draft & published settings
    ├── routes/
    │   ├── accountRoutes.js         # /api/accounts routes
    │   ├── authRoutes.js            # /api/auth routes
    │   ├── dashboardRoutes.js       # /api/dashboard routes
    │   ├── designRoutes.js          # /api/design routes
    │   ├── fieldRoutes.js           # /api/fields routes
    │   ├── memberRoutes.js          # /api/members routes
    │   └── publicRoutes.js          # /api/public routes
    ├── services/
    │   ├── csvService.js            # PapaParse parsing & serialization
    │   ├── exportService.js         # ZIP archive generation
    │   ├── illustratorService.js    # Illustrator variable merge formatting
    │   ├── migrationService.js      # ID synchronization utility
    │   └── qrService.js             # High-res 300 DPI QR generator
    ├── tests/                       # Automated Jest test suites
    │   ├── account_management.test.js # Account CRUD & RBAC tests
    │   ├── member_id_unification.test.js # KTPD NO single source of truth tests
    │   ├── persistence_validation.test.js # Database persistence tests
    │   └── profile_design.test.js   # Design customizer & draft tests
    └── uploads/                     # Server-side uploads directory
        └── design/                  # Custom logos and wallpapers
```

---

## ⚙️ Installation Instructions

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas account or local MongoDB 6.0+ instance

### 1. Clone Repository
```bash
git clone <repository-url>
cd "KTPD Data Base Project"
```

### 2. Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

## 🚀 Development Setup

### 1. Configure Environment
Create `.env` in the `server` directory (or project root):
```bash
cp server/.env.example server/.env
```
Edit `server/.env` and supply your database connection and secrets:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ktpd_db?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
CLIENT_URL=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@ktpd.org
ADMIN_PASSWORD=KTPDAdmin2026!
```

### 2. Run the Development Servers
Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd server
npm start
# Server starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Frontend starts on http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## ☁️ MongoDB Atlas Setup

For production deployments, follow these steps to set up MongoDB Atlas:

1. **Create an Account:** Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register.
2. **Create a Cluster:** Create a free M0 cluster or dedicated M10+ cluster in a region close to your primary users (e.g. `me-central-1` UAE / Middle East or `ap-south-1` Mumbai).
3. **Database User:**
   - Go to **Security > Database Access > Add New Database User**.
   - Select **Password** authentication.
   - Assign the **Read and write to any database** built-in role.
4. **Network Access (IP Whitelist):**
   - Go to **Security > Network Access > Add IP Address**.
   - For cloud hosting (Vercel, Render, AWS, DigitalOcean), add `0.0.0.0/0` (Allow access from anywhere).
   - For dedicated servers with a static IP, whitelist that specific IP.
5. **Get Connection String:**
   - Click **Connect > Drivers > Node.js**.
   - Copy the URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ktpd_db?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your database user credentials.
   - Paste into `server/.env` as `MONGO_URI`.

---

## 🔐 Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Backend Express listening port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `production` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster0.net/ktpd_db` |
| `JWT_SECRET` | 64+ char cryptographic key for signing tokens | `a7f93b...` |
| `CLIENT_URL` | Frontend origin for CORS policy | `https://admin.ktpd.org` |
| `PUBLIC_BASE_URL` | Base URL embedded into permanent QR code targets | `https://verify.ktpd.org` |
| `ADMIN_USERNAME`| Default initial Super Admin username | `admin` |
| `ADMIN_EMAIL` | Default initial Super Admin email | `admin@ktpd.org` |
| `ADMIN_PASSWORD`| Default initial Super Admin password | `KTPDAdmin2026!` |

---

## 👤 Initial Super Admin Setup

When starting the application for the first time against an empty database:
1. The system automatically inspects the `Admin` collection.
2. If no accounts exist, it provisions the default Super Admin account defined in your `.env` variables (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
3. Passwords are automatically hashed with `bcrypt` (12 rounds) before storage.
4. Log in at `http://localhost:5173/login` using these credentials.
5. **Security Recommendation:** Immediately navigate to **Account Management**, create a named personal Super Admin account, and change or delete the initial bootstrap password.

---

## 🛡️ Account Management & RBAC Guide

The system features complete Role-Based Access Control enforced at the Express router middleware level and verified on every API request.

### Roles & Permission Matrix

| Feature / Operation | Super Admin | Admin | Staff |
| :--- | :---: | :---: | :---: |
| **View Dashboard Statistics** | ✅ | ✅ | ✅ |
| **View Member Directory & Details** | ✅ | ✅ | ✅ |
| **View & Preview QR Codes** | ✅ | ✅ | ✅ |
| **Add / Edit Members** | ✅ | ✅ | ❌ |
| **Delete Members** | ✅ | ✅ | ❌ |
| **Manage Custom Fields & Sub-Fields** | ✅ | ✅ | ❌ |
| **Bulk Import / Export Data** | ✅ | ✅ | ❌ |
| **Manage QR Profile Design** | ✅ | ❌ | ❌ |
| **Account Management (CRUD)** | ✅ | ❌ | ❌ |
| **View Administrative Audit Logs** | ✅ | ❌ | ❌ |

### Account Safeguards:
- **Last Super Admin Protection:** The backend strictly forbids deactivating, deleting, or demoting the last active Super Admin account.
- **Self-Deletion Protection:** Super Admins cannot delete their own logged-in account.
- **Zero Plaintext Password Exposure:** The `passwordHash` field is marked `select: false` in Mongoose and automatically stripped from all JSON responses via schema transforms.

---

## 👥 Member Management Guide

1. **Adding Members:** Navigate to **Members Directory** and click **Add Member**. Enter standard attributes (Name, Mobile, Emirates ID, Blood Group, Company, India Hometown) along with any custom fields.
2. **Permanent QR Generation:** The moment a member record is created, the system generates a unique 128-bit random token stored in `qrToken`.
3. **Synchronized Alphanumeric ID:** When creating or editing a member, any custom field labeled "KTPD NO" (or key `ktpdNo`) automatically becomes the member's authoritative display ID (e.g. `D343`).
4. **Soft Delete Safety:** Deleting a member marks `isDeleted: true` and preserves the member's QR token and ID history, preventing token collision or accidental record loss.
5. **Secure Bulk Deletion:** Select multiple members using row checkboxes or the master **Select All** header control. Clicking **Bulk Delete** presents a confirmation dialog previewing selected IDs and non-undoable warnings. The backend executes atomic soft-deletion via `POST /api/members/bulk-delete` and records audit entries under `BULK_DELETE_MEMBERS`. Unselected members, admin accounts, and custom fields remain completely unaffected.

---

## 📥 Smart CSV Import Guide

Located at **Members > Bulk Import** (`/import`):
1. **Automatic Header & Field Detection:** Upload any standard CSV file. The backend parser reads column headers, compares them against existing field keys, and maps matches automatically.
2. **Dynamic Custom Field Creation:** Columns not currently recognized in the system schema can be automatically registered as custom fields (with customizable types: text, alphanumeric ID, phone, email, date, dropdown).
3. **Duplicate Resolution Strategies:**
   - **Skip Existing:** Preserves existing member records in the database.
   - **Update Existing:** Overwrites matching member attributes while strictly keeping permanent QR tokens intact.
   - **Cancel on Duplicate:** Aborts the import batch if any conflict is detected.
4. **Interactive Mapping Preview:** Review sample rows, uncheck columns to exclude them, and verify mapping before committing data to MongoDB.

---

## 📦 Bulk Export Guide

Navigate to **Bulk Export** (`/export`):
1. **Download CSV:** Exports all or filtered members into a clean UTF-8 CSV containing standard fields, dynamic custom fields, sub-field values, and checkbox answers.
2. **Download QR Codes ZIP:** Generates a compressed archive containing high-resolution 300 DPI PNG QR codes named by Member ID (`D343.png`, `KTPD001.png`, etc.).
3. **Download All (Complete ZIP):** Bundles the CSV database export and the complete QR codes folder into a single archive.

---

## 🔌 API Reference Overview

All administrative API endpoints are prefixed with `/api` and require a valid Bearer token (`Authorization: Bearer <token>`).

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | Public |
| `GET` | `/api/auth/me` | Fetch active user profile & role | Authenticated |
| `POST` | `/api/auth/logout` | Terminate session & log audit event | Authenticated |
| `GET` | `/api/members` | Paginated member list with search & filters | Staff, Admin, Super Admin |
| `POST` | `/api/members` | Register new member & generate permanent QR | Admin, Super Admin |
| `GET` | `/api/members/:id` | Retrieve member profile details | Staff, Admin, Super Admin |
| `PUT` | `/api/members/:id` | Update member attributes | Admin, Super Admin |
| `DELETE` | `/api/members/:id` | Archive single member record | Admin, Super Admin |
| `POST` | `/api/members/bulk-delete` | Bulk soft-delete selected members | Admin, Super Admin |
| `PATCH` | `/api/members/:id/status` | Toggle member Active / Inactive status | Admin, Super Admin |
| `GET` | `/api/members/:id/qr` | Generate high-res 300 DPI QR code PNG | Staff, Admin, Super Admin |
| `POST` | `/api/members/import/preview` | Analyze CSV headers & preview field mappings | Admin, Super Admin |
| `POST` | `/api/members/import` | Commit CSV member import with auto-field setup | Admin, Super Admin |
| `GET` | `/api/members/export` | Download dynamic members CSV | Admin, Super Admin |
| `GET` | `/api/members/export/qr-zip` | Download high-res QR PNG files archive | Admin, Super Admin |
| `GET` | `/api/members/export/all` | Download complete export ZIP bundle | Admin, Super Admin |
| `GET` | `/api/members/template` | Download CSV import sample template | Admin, Super Admin |
| `GET` | `/api/fields` | List dynamic custom field definitions | Staff, Admin, Super Admin |
| `POST` | `/api/fields` | Create dynamic custom field | Admin, Super Admin |
| `PUT` | `/api/fields/:id` | Update field label, type, options, or order | Admin, Super Admin |
| `DELETE` | `/api/fields/:id` | Archive custom field definition | Admin, Super Admin |
| `GET` | `/api/accounts` | Paginated admin user list & statistics | Super Admin |
| `POST` | `/api/accounts` | Create new Admin or Staff user account | Super Admin |
| `PUT` | `/api/accounts/:id` | Update account details & assigned role | Super Admin |
| `DELETE` | `/api/accounts/:id` | Delete administrative account | Super Admin |
| `PATCH` | `/api/accounts/:id/password` | Reset account login password | Super Admin |
| `PATCH` | `/api/accounts/:id/status` | Activate / Deactivate administrative account | Super Admin |
| `GET` | `/api/design` | Retrieve draft & published profile designs | Super Admin |
| `PUT` | `/api/design/draft` | Save customizer design draft | Super Admin |
| `POST` | `/api/design/publish` | Promote draft design to live QR profile pages | Super Admin |
| `POST` | `/api/design/reset` | Reset design configuration to default | Super Admin |
| `POST` | `/api/design/upload` | Upload branding logo or custom background | Super Admin |
| `GET` | `/api/public/members/:token` | Public QR code verification endpoint | Public |

---

## 🚀 Production Deployment Architecture

The KTPD Membership Management System is pre-configured for deployment on this architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       GitHub (Private)                      │
│            Source Code Repository & Version Control         │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Webhook Trigger              │ Webhook Trigger
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Render (Web Service)    │ │      Netlify (Static SPA)  │
│  Node.js + Express Backend   │ │    React + Vite Frontend   │
│  - Port: process.env.PORT    │ │  - Publish: client/dist    │
│  - Host: 0.0.0.0             │ │  - SPA: _redirects rule    │
│  - Health: /health           │ │  - VITE_API_URL: Render    │
└──────────────┬───────────────┘ └────────────────────────────┘
               │ Mongoose TLS
               ▼
┌──────────────────────────────┐
│     MongoDB Atlas (Cloud)    │
│   Production Database Server │
│   - Network: 0.0.0.0/0       │
│   - Collections: members,    │
│     admins, memberfields     │
└──────────────────────────────┘
```

---

### Step 1: GitHub Private Repository Setup

1. Initialize git in the project root:
   ```bash
   git init
   git branch -M main
   ```
2. Check that `.env` files are ignored:
   ```bash
   git status
   ```
   *(Ensure `.env`, `server/.env`, and `client/.env` do NOT appear in the list. Only `.env.example` should be staged.)*
3. Stage and commit all files:
   ```bash
   git add .
   git commit -m "feat: production ready KTPD Membership Management System"
   ```
4. Create a **Private Repository** on GitHub (e.g., `ktpd-membership-system`).
5. Link remote and push:
   ```bash
   git remote add origin https://github.com/<your-username>/ktpd-membership-system.git
   git push -u origin main
   ```

---

### Step 2: MongoDB Atlas Cloud Database Setup

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create an **M0 Free Cluster** (or dedicated M10+ cluster) in the closest region (e.g. AWS Frankfurt `eu-central-1` or AWS Bahrain / UAE).
3. **Database Access (User Setup):**
   - Go to **Security → Database Access** → Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `ktpd_admin`.
   - Autogenerate or specify a strong password.
   - Built-in Role: **Read and write to any database** (`readWriteAnyDatabase`).
4. **Network Access (IP Whitelist):**
   - Go to **Security → Network Access** → Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Reason:* Render dynamic container IPs change across deploys, requiring `0.0.0.0/0` with user authentication.
5. **Get Connection String:**
   - Go to **Database → Clusters** → Click **Connect** → **Drivers** (Node.js).
   - Copy your connection string:
     ```
     mongodb+srv://ktpd_admin:<password>@cluster0.abcde.mongodb.net/ktpd_production?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password, and set database name to `ktpd_production`.

---

### Step 3: Render Backend Deployment (Node.js + Express)

#### Method 1: Using Render Blueprint (Recommended)
1. In the Render Dashboard, click **New +** → **Blueprint**.
2. Connect your GitHub repository.
3. Render will detect `render.yaml` automatically.
4. Enter the required secrets in the prompted form:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: Random 64-character secret.
   - `ADMIN_EMAIL`: `ktpd2018.uae@gmail.com`
   - `ADMIN_PASSWORD`: Your initial Super Admin password.
   - `CLIENT_URL`: `https://<your-site-name>.netlify.app` (or temporarily `*` until Netlify is created).
   - `PUBLIC_BASE_URL`: `https://<your-site-name>.netlify.app`
5. Click **Apply**.

#### Method 2: Manual Web Service Creation
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service parameters:
   - **Name:** `ktpd-backend`
   - **Region:** Frankfurt (EU Central) or closest region
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Add **Environment Variables**:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production security & logging |
   | `PORT` | `5000` | Port assigned by Render |
   | `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
   | `JWT_SECRET` | `your_secure_secret_key` | Cryptographic secret for signing JWTs |
   | `CLIENT_URL` | `https://ktpd.netlify.app` | Production frontend Netlify domain |
   | `PUBLIC_BASE_URL` | `https://ktpd.netlify.app` | Domain for generated QR profile URLs |
   | `ADMIN_EMAIL` | `ktpd2018.uae@gmail.com` | Initial Super Admin login email |
   | `ADMIN_PASSWORD` | `your_initial_password` | Initial Super Admin secure password |
   | `ADMIN_USERNAME` | `admin` | Initial Super Admin username |
   | `ADMIN_FULL_NAME` | `KTPD Super Admin` | Super Admin display name |
5. Click **Deploy Web Service**.
6. When deployment finishes, note your Render backend URL (e.g. `https://ktpd-backend.onrender.com`).
7. Test the health check by visiting `https://ktpd-backend.onrender.com/health` in your browser. It should return:
   ```json
   {"status":"ok","system":"KTPD Membership Management API","uptime":...}
   ```

---

### Step 4: Netlify Frontend Deployment (React + Vite)

1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project** → **GitHub**.
3. Select your private repository `ktpd-membership-system`.
4. Configure site build settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist` (or `dist`)
5. Configure Environment Variables:
   - Click **Add a variable**.
   - Key: `VITE_API_URL`
   - Value: `https://ktpd-backend.onrender.com/api` *(your Render backend URL with `/api`)*
6. Click **Deploy Site**.
7. Netlify will build the frontend and provide your production URL (e.g., `https://ktpd-membership.netlify.app`).
8. **Final Step:** Go back to Render Dashboard → Environment Variables, and update `CLIENT_URL` and `PUBLIC_BASE_URL` with your exact Netlify domain (`https://ktpd-membership.netlify.app`).

---

### Step 5: Initial Super Admin Login Verification

1. Open your Netlify production frontend URL in your browser:
   ```
   https://ktpd-membership.netlify.app/login
   ```
2. Enter your initial Super Admin credentials:
   - **Email:** `ktpd2018.uae@gmail.com`
   - **Password:** The password configured in Render's `ADMIN_PASSWORD`
3. Click **Sign In**.
4. You will be redirected to the **Admin Dashboard** (`/dashboard`).
5. Verify that:
   - Total Members shows **0**.
   - Custom Field definitions are loaded under **Fields** (`/fields`).
   - You can navigate to **Account Management** (`/accounts`) to create additional Admin or Staff accounts.

---

### Step 6: Post-Launch Production Verification Checklist

- [ ] **Database Persistence:** Create a test member or import a CSV file. Restart the Render service; verify that all records remain intact in MongoDB Atlas.
- [ ] **QR Code Permanence:** Scan the generated QR code or open `/m/:token`; verify the public verification profile opens and renders member details accurately.
- [ ] **Design Customizer:** Edit the live QR Profile template in **QR Profile Design** (`/design`), click **Publish Design**, and verify that the public profile reflects the new design immediately.
- [ ] **Account Management:** Confirm that Super Admin can create, edit, deactivate, or delete Admin and Staff accounts.
- [ ] **Bulk Export:** Go to **Bulk Export** (`/members/export`) and verify that CSV, QR ZIP, and unified export packages download seamlessly.

---

## 💾 Backup and Restore Procedure

### 1. Database Backup (mongodump)
Create a full binary backup of the MongoDB Atlas database:
```bash
mongodump --uri="mongodb+srv://<user>:<password>@cluster0.mongodb.net/ktpd_db" --out="./backup-$(date +%Y%m%d)"
```

### 2. Database Restore (mongorestore)
Restore from an existing backup without dropping other collections:
```bash
mongorestore --uri="mongodb+srv://<user>:<password>@cluster0.mongodb.net/ktpd_db" ./backup-20261113/ktpd_db
```

### 3. File Uploads Backup
Archive uploaded design assets:
```bash
tar -czvf ktpd_uploads_backup.tar.gz server/uploads/
```

---

## 🌐 Offline & Connectivity Architecture

| Action | Connectivity Requirement | Technical Explanation |
| :--- | :---: | :--- |
| **Authentication & Login** | Requires Internet / LAN | Validates credentials against MongoDB and signs JWT. |
| **Member CRUD Operations** | Requires Internet / LAN | Performs atomic database writes and ensures ID uniqueness. |
| **Public QR Code Scan (`/m/:token`)** | Requires Internet | Cryptographically verifies the QR token against live database records. |
| **Bulk CSV & QR ZIP Download** | Requires Internet / LAN | Server dynamically streams compressed binary zip files. |
| **Profile Design Live Preview** | Client-Side / Offline | Preview renders locally in React state without network calls. |
| **Design Publishing** | Requires Internet / LAN | Writes published schema to MongoDB for public consumption. |

---

## 🔧 Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`Authentication required. No token provided.`** | Missing or expired JWT token in browser storage. | Log in again at `/login`. Verify `localStorage.getItem('ktpd_token')`. |
| **`Access denied. Role does not have sufficient permissions.`** | Attempting an action outside your role. | Only Super Admins can access Account Management or publish profile designs. |
| **`Cannot delete the last active Super Admin account.`** | Safety mechanism prevented deleting sole superadmin. | Create another active Super Admin before deleting or deactivating this account. |
| **Public QR Profile shows 404** | QR token does not exist or member was hard deleted. | Verify member record in **Members Directory** or scan original issued card. |
| **CORS Policy Error** | `CLIENT_URL` does not match the frontend browser domain. | Update `CLIENT_URL` in `server/.env` to match the exact frontend URL. |
| **Uploaded logo does not display** | Missing uploads folder permissions. | Verify `server/uploads/design` exists and has read/write permissions. |

---

## 📄 License
Proprietary software developed exclusively for **Kerala Transport Drivers Association (KTPD)**. All rights reserved.
#   K T P D - Q R - C O D E - S C A N E R  
 