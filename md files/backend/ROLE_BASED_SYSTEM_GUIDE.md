# 🎯 sync2gear - Role-Based System Guide

## 📋 **SYSTEM OVERVIEW**

sync2gear uses a **two-tier hierarchy**:
1. **Clients** = Businesses/Organizations (the companies that subscribe)
2. **Users** = People (individuals who log into the system)

---

## 🏢 **CLIENTS (Businesses)**

**What is a Client?**
- A Client is a **business/organization** that subscribes to sync2gear
- Examples: "Acme Corporation", "Coffee Shop Chain", "Retail Store"
- Each Client has:
  - Subscription tier (basic/professional/enterprise)
  - Subscription status (trial/active/suspended/cancelled)
  - Limits (max devices, max storage, max floors)
  - Premium features

**Where Clients are managed:**
- **Admin Panel** (`/admin`) - Only visible to `admin` role
- Shows all businesses in the system
- Admin can create, edit, activate/deactivate clients

---

## 👥 **USERS (People)**

**What is a User?**
- A User is a **person** who logs into sync2gear
- Each User has:
  - Email, name, password
  - A `role` (admin/staff/client/floor_user)
  - An optional `client` (which business they belong to)
  - An optional `floor` (for floor_user role)

**User Roles:**

### 1. **`admin`** - sync2gear System Admin
- **Client**: `null` (no client assigned)
- **Can see**: Everything (all clients, all users, all data)
- **Can manage**: 
  - All clients (businesses)
  - All users (people)
  - System settings
  - AI providers
  - Audit logs (all)
- **Navbar items**: All items including "Admin" and "Team Members"

### 2. **`staff`** - sync2gear Support Staff
- **Client**: `null` (no client assigned)
- **Can see**: All clients and users (for support purposes)
- **Can manage**: 
  - All clients (for support)
  - All users (for support)
  - Cannot access system settings
- **Navbar items**: All items except "Admin" panel

### 3. **`client`** - Business Owner/Admin
- **Client**: Assigned to a specific Client (business)
- **Can see**: Only their own Client's data
- **Can manage**:
  - Their own Client's users (team members)
  - Their own Client's music, announcements, zones, etc.
  - Cannot see other clients
- **Navbar items**: All items except "Admin" panel

### 4. **`floor_user`** - Restricted Employee
- **Client**: Assigned to a specific Client (business)
- **Floor**: Restricted to one specific floor
- **Can see**: Only their assigned floor's data
- **Can manage**: 
  - Play instant announcements
  - View their floor's content
  - Cannot create/edit content
  - Cannot manage users
- **Navbar items**: All items except "Admin" and "Team Members"

---

## 🎯 **NAVBAR VISIBILITY RULES**

| Navbar Item | admin | staff | client | floor_user |
|------------|-------|-------|--------|------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Music Library | ✅ | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ | ✅ |
| Scheduler | ✅ | ✅ | ✅ | ✅ |
| Zones | ✅ | ✅ | ✅ | ✅ |
| **Team Members** | ✅ | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ❌ | ❌ | ❌ |
| Profile | ✅ | ✅ | ✅ | ✅ |

**Key Points:**
- **"Team Members"** shows all users that the current user can manage:
  - `admin`: All users from all clients
  - `staff`: All users from all clients
  - `client`: Only users from their own client
  - `floor_user`: Hidden (no access)
  
- **"Admin"** panel shows:
  - All clients (businesses)
  - System-wide statistics
  - AI provider management
  - System audit logs
  - Only visible to `admin` role

---

## 🔍 **CLARIFYING THE CONFUSION**

### **Why the confusion?**

**Problem 1: "Clients" vs "Users with role='client'"**
- **Client** (model) = A business organization
- **User with role='client'** = A person who is a business owner/admin
- These are **different things**!

**Solution:**
- Admin panel shows **Clients** (businesses)
- Team Members page shows **Users** (people)
- Users with role='client' are the business owners who belong to a Client

**Problem 2: "Team Members" visibility**
- Currently, `client` role users **cannot** see "Team Members" in navbar
- But they should be able to manage their own team!

**Solution:**
- Allow `client` role users to see "Team Members"
- Filter to show only users from their own client
- This is already implemented in the backend (filtering by client_id)

---

## 📊 **DATA FLOW EXAMPLE**

```
sync2gear System
│
├── Client: "Acme Coffee Shop"
│   ├── User (role='client'): john@acme.com (Business Owner)
│   ├── User (role='client'): jane@acme.com (Business Admin)
│   ├── User (role='floor_user'): bob@acme.com (Floor 1 Employee)
│   └── User (role='floor_user'): alice@acme.com (Floor 2 Employee)
│
├── Client: "Retail Store Inc"
│   ├── User (role='client'): manager@retail.com
│   └── User (role='floor_user'): staff@retail.com
│
└── sync2gear Staff
    ├── User (role='admin'): admin@sync2gear.com
    └── User (role='staff'): support@sync2gear.com
```

**What each user sees:**

1. **admin@sync2gear.com** (admin role):
   - Admin Panel: Sees both "Acme Coffee Shop" and "Retail Store Inc"
   - Team Members: Sees all 6 users (john, jane, bob, alice, manager, staff)

2. **john@acme.com** (client role, belongs to "Acme Coffee Shop"):
   - Admin Panel: ❌ Cannot access
   - Team Members: Sees only 4 users (john, jane, bob, alice) - all from Acme

3. **bob@acme.com** (floor_user role, belongs to "Acme Coffee Shop", Floor 1):
   - Admin Panel: ❌ Cannot access
   - Team Members: ❌ Cannot access
   - Zones: Only sees Floor 1

---

## ✅ **PRODUCTION-READY RULES**

### **Permission Summary:**

1. **Admin (`admin` role)**:
   - Full system access
   - Can manage all clients and users
   - Can access Admin panel
   - Can see all audit logs

2. **Staff (`staff` role)**:
   - Can view all clients and users (for support)
   - Can manage users (for support)
   - Cannot access Admin panel (system settings)
   - Can see all audit logs

3. **Client Admin (`client` role)**:
   - Can manage their own client's users
   - Can manage their own client's content (music, announcements, zones)
   - Cannot see other clients
   - Can see audit logs for their client only

4. **Floor User (`floor_user` role)**:
   - Can view their assigned floor only
   - Can play instant announcements
   - Cannot create/edit content
   - Cannot manage users
   - Can see audit logs for their floor only

---

## 🔧 **IMPLEMENTATION NOTES**

### **Backend Filtering:**
- `UserManagementViewSet.get_queryset()` filters users by client_id for non-admin users
- `AuditLogViewSet.get_queryset()` filters logs based on role and client

### **Frontend Filtering:**
- `Users` component filters users by `client_id` for non-admin users
- Layout shows/hides navbar items based on role

### **Key Files:**
- Backend: `apps/admin_panel/views.py` - UserManagementViewSet, ClientViewSet
- Frontend: `app/components/Layout.tsx` - Navbar visibility
- Frontend: `app/components/Users.tsx` - Team members management
- Frontend: `app/components/Admin.tsx` - Admin panel (clients management)

---

## 📝 **SUMMARY**

**The system is clear when you understand:**
1. **Clients** = Businesses (shown in Admin panel)
2. **Users** = People (shown in Team Members page)
3. **Users with role='client'** = Business owners who belong to a Client
4. **Navbar visibility** is role-based and filters data appropriately

**The fix:**
- Allow `client` role users to see "Team Members" (they can manage their own team)
- Make the distinction between Clients (businesses) and Users (people) clearer in the UI
- Ensure all role-based filtering works correctly

