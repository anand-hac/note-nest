# Note Nest — Premium Neumorphic Sticky Notes & Reminder App

**Note Nest** is a modern, minimal monochrome Sticky Notes & Reminder application built with a premium tactile **Neumorphic UI**. It blends deep charcoal/black dark mode with porcelain light mode, soft dual offset drop shadows, pressed inset controls, audio feedback, and granular multi-user collaboration.

![Note Nest Logo](/app-icon.png)

---

## ✨ Key Features

### 1. 🗂️ Sticky Notes & Organization
- **Tactile Sticky Notes**: Responsive cards featuring raised/pressed states, subtle gradients, and rounded edges.
- **Monochrome Color Spectrum**: Choose between 6 monochrome shades (*Default*, *Charcoal*, *Slate*, *Graphite*, *Snow*, *Silver*).
- **Pin to Top**: One-click pin toggle with pressed inset shadow and amber indicator.
- **Checklist Task Lists**: Embed interactive checklists inside any note with real-time completion progress tracking.
- **Tags & Categories**: Add custom `#tags` to categorize notes (e.g., `#Work`, `#Ideas`, `#Architecture`, `#Reading`).
- **Masonry Grid & List Views**: Easily toggle between tactile grid view and dense list view.
- **Instant Live Search**: Search across note titles, body text, and tags in real time.

### 2. ⏰ Reminders & Notifications
- **Due Date & Time**: Schedule reminders with custom date and time.
- **Priority Levels**: Tag reminders as `High`, `Medium`, or `Low` priority.
- **Link Notes to Reminders**: Link any sticky note directly to a reminder.
- **Real-Time Notification System**:
  - In-app notification bell with live unread badge.
  - Floating Neumorphic Toast banner when a reminder becomes due with **Snooze (10m)** and **Complete** actions.
  - Native browser HTML5 push notification support.
  - Periodic background reminder checking every 15 seconds.
  - Audio chimes synthesized via the Web Audio API (tactile clicks, alarm chimes, completion tunes).
  - Confetti celebration upon checking off tasks and reminders.

### 3. 👥 Secure Sharing & Collaboration
- **Granular Note-Level Sharing**: Share individual notes with any registered user by their `@username` or email address.
- **Permissions**:
  - **Can Edit**: Collaborators can edit title, content, and check off task list items.
  - **View Only**: Collaborators can only read the note.
- **Owner Control**: The note owner can inspect active collaborators and revoke access at any time.
- **Strict Privacy**: Private notes remain strictly confidential and completely inaccessible to unauthorized users.

### 4. 🔒 Enterprise-Grade Security & Authentication
- **Secure Authentication**: Password hashing with `bcryptjs` (salt rounds: 10) and signed JWT tokens with 7-day expiration.
- **Strict Authorization**: Every API route validates identity and ownership/collaborator permissions.
- **Session Management**: Persistent authenticated sessions with safe logout.
- **Account Deletion**: Full account removal option with password confirmation and cascading data cleanup.
- **Data Export & Backup**: Download all personal notes, shared links, and reminders as a portable JSON archive.

### 5. 🎨 Neumorphic Design System
- **Pure Monochrome Palette**: White, off-white, light gray, dark gray, charcoal, and dark black.
- **Light & Dark Mode**: Seamless toggle between deep dark mode (`#141518`) and porcelain light mode (`#edf2f8`).
- **Tactile Feedback**: Soft dual offset drop shadows, pressed inset input fields, and smooth CSS transitions.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts both the Express API server and Vite dev server concurrently:
```bash
npm run dev
```

### 3. Build & Run Production Server
```bash
npm run build
npm start
```
The application will be live at **`http://localhost:5000`**.

---

## 🧪 Demo Accounts for Instant Testing

| Username | Email | Password | Role | Features to Test |
| :--- | :--- | :--- | :--- | :--- |
| **`alex`** | `alex@notenest.com` | `Password123!` | Product Lead | Has pinned notes, reminders due today, and shared notes |
| **`sarah`** | `sarah@notenest.com` | `Password123!` | Senior Designer | Collaborator on Alex's project plan with edit permission |
| **`david`** | `david@notenest.com` | `Password123!` | DevOps Engineer | View-only collaborator, ideal for testing permission enforcement |

*Tip: You can click any demo account pill on the Login screen to auto-fill credentials instantly, or register a brand-new account!*

---

## 📁 Project Structure

```
├── public/
│   ├── app-icon.png           # User brand app icon & logo
│   └── favicon.png            # App favicon
├── server/
│   ├── auth.ts                # JWT generation, bcrypt hashing & requireAuth middleware
│   ├── db.ts                  # Persistent atomic asynchronous database engine & seed data
│   ├── index.ts               # Express server with auth, notes, reminders, search & export
│   └── types.ts               # Shared database and API interfaces
├── src/
│   ├── components/
│   │   ├── common/            # NeumorphicButton, Toast alert container
│   │   ├── layout/            # Navbar with search & notifications, responsive Sidebar
│   │   ├── notes/             # NoteCard, NoteModal, ShareModal
│   │   └── reminders/         # ReminderItem, ReminderModal
│   ├── context/
│   │   ├── AuthContext.tsx    # User session, login, signup, preferences
│   │   ├── NotificationContext.tsx # Periodic reminder checker & audio/browser alerts
│   │   └── ThemeContext.tsx   # Light/dark mode toggle
│   ├── pages/
│   │   ├── AuthPage.tsx       # Neumorphic Sign In / Create Account with 1-click demo logins
│   │   ├── DashboardPage.tsx  # Metrics, Quick Sticky Composer, Upcoming reminders
│   │   ├── MyNotesPage.tsx    # Board with tag filters, search, sort & grid/list views
│   │   ├── RemindersPage.tsx  # Tabbed views (All, Today, Overdue, Upcoming, Completed)
│   │   ├── SettingsPage.tsx   # Profile, theme/sound preferences, password change, backup
│   │   └── SharedPage.tsx     # Notes shared by peers with permission badges
│   ├── utils/
│   │   ├── api.ts             # Typed REST API client
│   │   └── sound.ts           # Web Audio API synthesized clicks & chimes
│   ├── index.css              # Neumorphic design token styles and utility classes
│   └── main.tsx               # Application bootstrap
├── package.json
└── vite.config.ts
```
