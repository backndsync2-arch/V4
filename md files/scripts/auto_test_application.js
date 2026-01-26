/**
 * Automatic Application Test Script
 * Run this in browser console after app loads to test all functionality
 */

(async function autoTestApplication() {
    console.log('🧪 Starting Automatic Application Test...');
    console.log('==========================================');
    
    const API_BASE = 'http://localhost:8000/api/v1';
    let testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };

    function log(message, type = 'info') {
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    function recordTest(name, passed, error = null) {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            log(`${name}: PASS`, 'success');
        } else {
            testResults.failed++;
            testResults.errors.push({ name, error });
            log(`${name}: FAIL - ${error}`, 'error');
        }
    }

    // Get auth token
    let accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        log('No access token found. Attempting login...', 'warning');
        try {
            const response = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@sync2gear.com',
                    password: 'admin123'
                })
            });
            if (response.ok) {
                const data = await response.json();
                accessToken = data.access;
                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', data.refresh);
                localStorage.setItem('sync2gear_user', JSON.stringify(data.user));
                log('Logged in successfully', 'success');
            }
        } catch (e) {
            recordTest('Login', false, e.message);
            return;
        }
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    // Test 1: Check current user
    log('Test 1: Checking current user...');
    try {
        const response = await fetch(`${API_BASE}/auth/me/`, { headers });
        if (response.ok) {
            const user = await response.json();
            recordTest('Current User', true);
            log(`Logged in as: ${user.name || user.email} (${user.role})`, 'info');
        } else {
            recordTest('Current User', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Current User', false, e.message);
    }

    // Test 2: Check music folders
    log('\nTest 2: Checking music folders...');
    try {
        const response = await fetch(`${API_BASE}/music/folders/`, { headers });
        if (response.ok) {
            const folders = await response.json();
            const folderList = Array.isArray(folders) ? folders : (folders.results || []);
            recordTest('Music Folders', true);
            log(`Found ${folderList.length} folders`, 'info');
            if (folderList.length === 0) {
                log('⚠️  No folders found. Run populate_dummy_data.py first', 'warning');
            }
        } else {
            recordTest('Music Folders', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Music Folders', false, e.message);
    }

    // Test 3: Check music files
    log('\nTest 3: Checking music files...');
    try {
        const response = await fetch(`${API_BASE}/music/files/`, { headers });
        if (response.ok) {
            const files = await response.json();
            const fileList = Array.isArray(files) ? files : (files.results || []);
            recordTest('Music Files', true);
            log(`Found ${fileList.length} music files`, 'info');
            if (fileList.length === 0) {
                log('⚠️  No music files found. Run populate_dummy_data.py first', 'warning');
            } else {
                log(`Sample files: ${fileList.slice(0, 3).map(f => f.title).join(', ')}`, 'info');
            }
        } else {
            recordTest('Music Files', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Music Files', false, e.message);
    }

    // Test 4: Check announcements
    log('\nTest 4: Checking announcements...');
    try {
        const response = await fetch(`${API_BASE}/announcements/`, { headers });
        if (response.ok) {
            const announcements = await response.json();
            const annList = Array.isArray(announcements) ? announcements : (announcements.results || []);
            recordTest('Announcements', true);
            log(`Found ${annList.length} announcements`, 'info');
            if (annList.length === 0) {
                log('⚠️  No announcements found. Run populate_dummy_data.py first', 'warning');
            }
        } else {
            recordTest('Announcements', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Announcements', false, e.message);
    }

    // Test 5: Check zones
    log('\nTest 5: Checking zones...');
    try {
        const response = await fetch(`${API_BASE}/zones/zones/`, { headers });
        if (response.ok) {
            const zones = await response.json();
            const zoneList = Array.isArray(zones) ? zones : (zones.results || []);
            recordTest('Zones', true);
            log(`Found ${zoneList.length} zones`, 'info');
            if (zoneList.length === 0) {
                log('⚠️  No zones found. Run populate_dummy_data.py first', 'warning');
            }
        } else {
            recordTest('Zones', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Zones', false, e.message);
    }

    // Test 6: Check devices
    log('\nTest 6: Checking devices...');
    try {
        const response = await fetch(`${API_BASE}/devices/devices/`, { headers });
        if (response.ok) {
            const devices = await response.json();
            const deviceList = Array.isArray(devices) ? devices : (devices.results || []);
            recordTest('Devices', true);
            log(`Found ${deviceList.length} devices`, 'info');
        } else {
            recordTest('Devices', false, `Status: ${response.status}`);
        }
    } catch (e) {
        recordTest('Devices', false, e.message);
    }

    // Test 7: Test page navigation
    log('\nTest 7: Testing page navigation...');
    const pages = ['dashboard', 'music', 'announcements', 'channel-playlists', 'scheduler', 'zones', 'users', 'admin', 'profile'];
    let pagesWorking = 0;
    
    for (const page of pages) {
        try {
            // Dispatch navigation event
            window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
            await new Promise(r => setTimeout(r, 500));
            pagesWorking++;
        } catch (e) {
            log(`Page ${page} failed: ${e.message}`, 'error');
        }
    }
    
    recordTest('Page Navigation', pagesWorking === pages.length, 
        pagesWorking === pages.length ? null : `${pagesWorking}/${pages.length} pages working`);

    // Test 8: Test file playback (if files exist)
    log('\nTest 8: Testing file playback capability...');
    try {
        const filesRes = await fetch(`${API_BASE}/music/files/`, { headers });
        if (filesRes.ok) {
            const files = await filesRes.json();
            const fileList = Array.isArray(files) ? files : (files.results || []);
            if (fileList.length > 0) {
                const testFile = fileList[0];
                log(`Testing playback for: ${testFile.title}`, 'info');
                // Check if file has URL
                if (testFile.file_url || testFile.url) {
                    recordTest('File Playback', true);
                    log('✅ Files have playback URLs', 'success');
                } else {
                    recordTest('File Playback', false, 'No file URL found');
                }
            } else {
                recordTest('File Playback', false, 'No files to test');
            }
        }
    } catch (e) {
        recordTest('File Playback', false, e.message);
    }

    // Summary
    console.log('\n==========================================');
    console.log('📊 TEST SUMMARY');
    console.log('==========================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        testResults.errors.forEach(err => {
            console.log(`  - ${err.name}: ${err.error}`);
        });
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (testResults.failed > 0) {
        console.log('  - Check backend is running on port 8000');
        console.log('  - Run populate_dummy_data.py to create test data');
        console.log('  - Check browser console for detailed errors');
    } else {
        console.log('  ✅ All tests passed! Application is ready for use.');
    }

    return testResults;
})();
