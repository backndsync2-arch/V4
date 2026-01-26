# Bug Report - sync2gear

**Date**: January 21, 2026  
**Status**: Bugs Identified - Ready for Debugging

---

## 🐛 Bugs Found

### Bug 1: React Hooks Order Violation (CRITICAL)
**File**: `src/app/components/AnnouncementsFinal.tsx`  
**Line**: 33-62  
**Issue**: `useEffect` is called BEFORE `useState` and `useAuth()`  
**Impact**: React will throw "Hooks must be called in the same order" error  
**Severity**: 🔴 **CRITICAL** - Will break component rendering

### Bug 2: ForeignKey Assignment Error (CRITICAL)
**File**: `sync2gear_backend/apps/playback/engine.py`  
**Lines**: 64, 167, 196, 248, 278  
**Issue**: Using `current_track_id` and `current_announcement_id` but model has ForeignKey fields  
**Impact**: Django will raise AttributeError - ForeignKey fields don't have `_id` assignment  
**Severity**: 🔴 **CRITICAL** - Will crash playback engine

### Bug 3: Missing Devices API Integration
**File**: `src/app/components/AnnouncementsFinal.tsx`  
**Line**: 67  
**Issue**: Still using `mockDevices` instead of loading from API  
**Impact**: Devices won't update from backend  
**Severity**: 🟡 **MEDIUM** - Feature incomplete

### Bug 4: URL Routing Conflict
**File**: `sync2gear_backend/config/urls.py`  
**Lines**: 43-44  
**Issue**: Both `/zones/` and `/devices/` include same router, causing duplicate routes  
**Impact**: URL conflicts, devices might not be accessible  
**Severity**: 🟡 **MEDIUM** - Routing issues

### Bug 5: Timeline Schedule Time Calculation
**File**: `sync2gear_backend/apps/scheduler/tasks.py`  
**Line**: 169  
**Issue**: Time calculation might be incorrect for timeline schedules  
**Impact**: Schedules might not execute at correct times  
**Severity**: 🟡 **MEDIUM** - Logic error

---

## 🔍 Detailed Analysis

### Bug 1: React Hooks Order
```typescript
// WRONG ORDER:
export function AnnouncementsFinal() {
  useEffect(() => {  // ❌ Called before useState
    // uses 'user' which isn't defined yet
  }, [user]);
  const { user } = useAuth();  // ❌ Defined after useEffect
  const [scripts, setScripts] = useState([]);  // ❌ After useEffect
```

**Fix**: Move all hooks to top, in correct order

### Bug 2: ForeignKey Assignment
```python
# WRONG:
state.current_track_id = queue[0]  # ❌ ForeignKey doesn't have _id assignment

# CORRECT:
from apps.music.models import MusicFile
state.current_track = MusicFile.objects.get(id=queue[0])
# OR:
state.current_track_id = queue[0]  # Only works if field is named current_track_id
```

**Fix**: Use proper ForeignKey assignment

### Bug 3: Missing Devices
```typescript
const [devices, setDevices] = useState(mockDevices);  // ❌ Should load from API
```

**Fix**: Add devices to API loading

### Bug 4: URL Conflict
```python
path(f'{API_PREFIX}/zones/', include('apps.zones.urls')),  # Includes devices
path(f'{API_PREFIX}/devices/', include('apps.zones.urls')),  # Duplicate!
```

**Fix**: Remove duplicate or create separate device URLs

---

## 🎯 Hypotheses

1. **H1**: React hooks order violation causes component to crash on render
2. **H2**: ForeignKey assignment errors cause playback engine to crash
3. **H3**: Missing devices API causes stale data
4. **H4**: URL routing conflict causes 404 errors for devices
5. **H5**: Timeline schedule time calculation is incorrect

---

## 🔧 Next Steps

1. Fix React hooks order
2. Fix ForeignKey assignments
3. Add devices API loading
4. Fix URL routing
5. Verify timeline schedule logic
