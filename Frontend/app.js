// --- DYNAMIC API DETECTION ---
const DEFAULT_API_PORT = 5000;
const API_HOST = window.location.hostname || 'localhost';
const API_PORT = window.API_PORT || DEFAULT_API_PORT;
const API_BASE_OVERRIDE = (window.API_BASE && String(window.API_BASE).trim()) || '';
const API = API_BASE_OVERRIDE || `http://${API_HOST}:${API_PORT}/api`;

let cachedUnits = [];
let cachedLecturers = [];
let cachedNews = [];
let currentView = 'enrolled';
let searchBound = false;

function getSearchQuery() {
    const input = document.getElementById('course-search');
    return input ? input.value.trim().toLowerCase() : '';
}

function matchesQuery(unit, query) {
    if (!query) return true;
    const code = String(unit.code || '').toLowerCase();
    const name = String(unit.name || '').toLowerCase();
    return code.includes(query) || name.includes(query);
}

// --- 1. Announcements Logic ---
async function loadNews() {
    try {
        const res = await fetch(`${API}/news`);
        if (!res.ok) throw new Error('News fetch failed');
        cachedNews = await res.json();
    } catch (err) {
        console.error("News load failed:", err);
        cachedNews = [];
    }
    renderNewsFeed();
    renderNoticeBar();
    renderAdminAnnouncements();
}

function renderNewsFeed() {
    const feed = document.getElementById('news-feed');
    if (!feed) return;
    if (cachedNews.length === 0) {
        feed.innerHTML = "<p>No recent updates.</p>";
        return;
    }
    feed.innerHTML = cachedNews.map(n => `
        <div class="news-item">
            <h4>${n.title}</h4>
            <p>${n.content}</p>
            <small>${new Date(n.date).toLocaleDateString()}</small>
        </div>
    `).join('');
}

function renderNoticeBar() {
    const noticeBar = document.getElementById('notice-bar');
    if (!noticeBar) return;
    const defaultNotice = noticeBar.dataset.default || "Welcome to UoE";
    if (cachedNews.length > 0) {
        const latest = cachedNews[0];
        noticeBar.textContent = `Latest: ${latest.title}`;
    } else {
        noticeBar.textContent = defaultNotice;
    }
}

// --- 2. Auth & Navigation ---
function quickLogin(role) {
    // Hide the landing hero
    document.getElementById('landing').style.display = 'none';
    // Show the login & news grid
    const authContainer = document.getElementById('auth-container');
    authContainer.style.display = 'grid'; 
    
    // Focus the input for better UX
    document.getElementById('regNum').focus();
    console.log(`Ready for ${role} login`);
}

async function login() {
    const regNumber = document.getElementById('regNum').value.trim();
    const password = document.getElementById('pass').value.trim();

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ regNumber, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('role', data.role);
            localStorage.setItem('regNum', data.regNumber || regNumber);
            if (data.userId) localStorage.setItem('userId', data.userId);
            showDashboard();
        } else {
            alert(data.error || "Invalid credentials");
        }
    } catch (err) {
        alert("Server is offline. Make sure Backend is running!");
    }
}

function setActiveSidebar(label) {
    const links = Array.from(document.querySelectorAll('.side-link'));
    links.forEach(l => l.classList.remove('active'));
    const match = links.find(l => l.textContent.toLowerCase().includes(label));
    if (match) match.classList.add('active');
}

function configureSidebarByRole(role) {
    const catalogLink = document.getElementById('side-catalog');
    if (catalogLink) {
        catalogLink.style.display = role === 'student' ? 'block' : 'none';
    }
}

function configureSearch(mode) {
    const toolbar = document.getElementById('course-toolbar');
    const input = document.getElementById('course-search');
    if (!toolbar || !input) return;

    if (mode === 'hide') {
        toolbar.style.display = 'none';
        return;
    }

    toolbar.style.display = 'flex';
    input.value = '';
    if (mode === 'catalog') {
        input.placeholder = 'Search new courses by code or name';
    } else if (mode === 'lecturer') {
        input.placeholder = 'Search assigned courses';
    } else {
        input.placeholder = 'Search my courses';
    }
}

function bindCourseSearch() {
    if (searchBound) return;
    const input = document.getElementById('course-search');
    if (!input) return;
    input.addEventListener('input', () => {
        if (currentView === 'lecturer') {
            renderLecturerUnits();
        } else {
            renderStudentUnits(currentView);
        }
    });
    searchBound = true;
}

function showDashboard() {
    // Hide everything else
    document.getElementById('landing').style.display = 'none';
    document.getElementById('auth-container').style.display = 'none';
    
    // Show sidebar and logout
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';

    const role = localStorage.getItem('role');
    const adminView = document.getElementById('admin-view');
    const dashboardView = document.getElementById('dashboard-view');

    adminView.style.display = 'none';
    dashboardView.style.display = 'none';

    configureSidebarByRole(role);

    if (role === 'admin') {
        adminView.style.display = 'block';
        configureSearch('hide');
        loadAdminData();
    } else if (role === 'lecturer') {
        dashboardView.style.display = 'block';
        document.getElementById('dash-title').textContent = 'Assigned Courses';
        setActiveSidebar('dashboard');
        currentView = 'lecturer';
        configureSearch('lecturer');
        loadLecturerDashboard();
    } else {
        dashboardView.style.display = 'block';
        document.getElementById('dash-title').textContent = 'My Courses';
        setActiveSidebar('dashboard');
        currentView = 'enrolled';
        configureSearch('enrolled');
        loadStudentDashboard();
    }
}

function showCatalog() {
    const role = localStorage.getItem('role');
    if (role !== 'student') return;

    document.getElementById('landing').style.display = 'none';
    document.getElementById('auth-container').style.display = 'none';

    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('admin-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';

    document.getElementById('dash-title').textContent = 'Catalog';
    setActiveSidebar('catalog');
    currentView = 'catalog';
    configureSearch('catalog');
    loadStudentCatalog();
}

// --- 3. Admin Functionality ---
function getAdminHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const adminKey = (window.ADMIN_KEY && String(window.ADMIN_KEY).trim()) || localStorage.getItem('adminKey');
    if (adminKey) headers['x-admin-key'] = adminKey;
    return headers;
}

async function adminCreateUser() {
    const regNumber = document.getElementById('new-user-id').value.trim();
    const password = document.getElementById('new-user-pass').value.trim();
    const role = document.getElementById('new-user-role').value;
    if (!regNumber || !password) return alert("Enter user ID and password.");

    const res = await fetch(`${API}/auth/admin/create-user`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ regNumber, password, role })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Failed to create user.");

    alert(data.message || "User created.");
    document.getElementById('new-user-id').value = '';
    document.getElementById('new-user-pass').value = '';

    if (role === 'lecturer') {
        await loadLecturers();
        renderLecturerOptions();
    }
}

async function adminCreateUnit() {
    const code = document.getElementById('new-unit-code').value.trim();
    const name = document.getElementById('new-unit-name').value.trim();
    if (!code || !name) return alert("Enter unit code and name.");

    const res = await fetch(`${API}/units/create`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ code, name })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Failed to create unit.");

    alert("Unit created.");
    document.getElementById('new-unit-code').value = '';
    document.getElementById('new-unit-name').value = '';

    await loadUnits();
    renderUnitOptions();
    renderUnitsOverview();
}

async function assignLecturer() {
    const unitId = document.getElementById('assign-unit').value;
    const lecturerId = document.getElementById('assign-lecturer').value;
    if (!unitId || !lecturerId) return alert("Select a unit and lecturer.");

    const res = await fetch(`${API}/units/assign-lecturer`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ unitId, lecturerId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Assignment failed.");

    alert("Lecturer assigned.");
    await loadUnits();
    renderUnitOptions();
    renderUnitsOverview();
}

async function postNews() {
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    
    if (!title || !content) return alert("Please enter both title and details.");

    const res = await fetch(`${API}/news/add`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content })
    });

    if (res.ok) {
        alert("Announcement Published!");
        document.getElementById('news-title').value = '';
        document.getElementById('news-content').value = '';
        loadNews();
    }
}

function renderAdminAnnouncements() {
    const list = document.getElementById('admin-announcements-list');
    if (!list) return;
    if (cachedNews.length === 0) {
        list.innerHTML = '<p>No announcements to manage.</p>';
        return;
    }
    list.innerHTML = cachedNews.map(n => `
        <div class="info-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${n.title}</strong><br>
                <small>${new Date(n.date).toLocaleDateString()}</small>
            </div>
            <button onclick="deleteAnnouncement('${n._id}')" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
        </div>
    `).join('');
}

async function deleteAnnouncement(id) {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`${API}/news/${id}`, { method: 'DELETE' });
    if (res.ok) loadNews();
}

// --- Admin Data Loaders ---
async function loadAdminData() {
    // These functions need your existing Logic for Units and Lecturers
    await Promise.all([loadUnits(), loadLecturers(), loadNews()]);
    renderUnitOptions();
    renderLecturerOptions();
    renderUnitsOverview();
}

// --- Shared Data Loaders ---
async function loadUnits() {
    try {
        const res = await fetch(`${API}/units/all`);
        if (!res.ok) throw new Error('Unit fetch failed');
        cachedUnits = await res.json();
    } catch (err) {
        console.error("Units load failed:", err);
        cachedUnits = [];
    }
}

async function loadLecturers() {
    try {
        const res = await fetch(`${API}/auth/admin/lecturers`, {
            headers: getAdminHeaders()
        });
        if (!res.ok) throw new Error('Lecturer fetch failed');
        cachedLecturers = await res.json();
    } catch (err) {
        console.error("Lecturers load failed:", err);
        cachedLecturers = [];
    }
}

function renderUnitOptions() {
    const unitSelect = document.getElementById('assign-unit');
    if (!unitSelect) return;
    if (cachedUnits.length === 0) {
        unitSelect.innerHTML = '<option value="">No units yet</option>';
        return;
    }
    unitSelect.innerHTML = '<option value="">Select unit</option>' + cachedUnits.map(u => {
        const status = u.lecturerId ? 'Assigned' : 'Unassigned';
        return `<option value="${u._id}">${u.code} - ${u.name} (${status})</option>`;
    }).join('');
}

function renderLecturerOptions() {
    const lecturerSelect = document.getElementById('assign-lecturer');
    if (!lecturerSelect) return;
    if (cachedLecturers.length === 0) {
        lecturerSelect.innerHTML = '<option value="">No lecturers yet</option>';
        return;
    }
    lecturerSelect.innerHTML = '<option value="">Select lecturer</option>' + cachedLecturers.map(l => {
        return `<option value="${l.regNumber}">${l.regNumber}</option>`;
    }).join('');
}

function renderUnitsOverview() {
    const list = document.getElementById('admin-units-list');
    if (!list) return;
    if (cachedUnits.length === 0) {
        list.innerHTML = '<p class="muted">No units created yet.</p>';
        return;
    }
    list.innerHTML = cachedUnits.map(u => `
        <div class="info-card">
            <h4>${u.code} - ${u.name}</h4>
            <p>Lecturer: ${u.lecturerId ? u.lecturerId : 'Unassigned'}</p>
        </div>
    `).join('');
}

// --- Student Catalog / Enroll ---
function getCurrentUserId() {
    return localStorage.getItem('userId') || '';
}

function getCurrentRegNumber() {
    return localStorage.getItem('regNum') || '';
}

function isEnrolled(unit) {
    const list = Array.isArray(unit.enrolledStudents) ? unit.enrolledStudents : [];
    const userId = getCurrentUserId();
    const regNumber = getCurrentRegNumber();
    return (userId && list.includes(userId)) || (regNumber && list.includes(regNumber));
}

function renderStudentUnits(mode) {
    const list = document.getElementById('enrolled-list');
    if (!list) return;
    const query = getSearchQuery();
    const filtered = mode === 'enrolled'
        ? cachedUnits.filter(isEnrolled)
        : cachedUnits;
    const filteredByQuery = filtered.filter(u => matchesQuery(u, query));

    if (filteredByQuery.length === 0) {
        list.innerHTML = mode === 'enrolled'
            ? '<p class="muted">You have not enrolled in any course yet.</p>'
            : '<p class="muted">No courses available yet.</p>';
        return;
    }

    list.innerHTML = filteredByQuery.map(u => {
        const courseId = u._id || u.id || u.code;
        const enrolled = isEnrolled(u);
        const lecturer = u.lecturerId ? u.lecturerId : 'Not assigned';
        const actionBtn = enrolled
            ? `<button class="btn-main btn-danger" onclick="event.stopPropagation(); unenroll('${u._id || u.id || u.code}')">Unenroll</button>`
            : `<button class="btn-main" onclick="event.stopPropagation(); enroll('${u._id || u.id || u.code}')">Enroll</button>`;

        return `
            <div class="info-card course-card" onclick="openCourse('${courseId}')">
                <h4>${u.code} - ${u.name}</h4>
                <p>Lecturer: ${lecturer}</p>
                <div class="course-actions">
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');
}

async function loadStudentDashboard() {
    await loadUnits();
    renderStudentUnits('enrolled');
}

async function loadStudentCatalog() {
    await loadUnits();
    renderStudentUnits('catalog');
}

function isLecturerAssigned(unit) {
    const lecturerId = String(unit.lecturerId || '').trim();
    const regNumber = getCurrentRegNumber();
    const userId = getCurrentUserId();
    return lecturerId && (lecturerId === regNumber || lecturerId === userId);
}

function renderLecturerUnits() {
    const list = document.getElementById('enrolled-list');
    if (!list) return;
    const query = getSearchQuery();
    const assigned = cachedUnits.filter(isLecturerAssigned).filter(u => matchesQuery(u, query));

    if (assigned.length === 0) {
        list.innerHTML = '<p class="muted">No courses assigned to you yet.</p>';
        return;
    }

    list.innerHTML = assigned.map(u => {
        const courseId = u._id || u.id || u.code;
        return `
        <div class="info-card course-card" onclick="openCourse('${courseId}')">
            <h4>${u.code} - ${u.name}</h4>
            <p>Lecturer: ${u.lecturerId}</p>
        </div>
    `;
    }).join('');
}

function openCourse(unitId) {
    const cleanId = (unitId === undefined || unitId === null) ? '' : String(unitId).trim();
    if (cleanId) {
        localStorage.setItem('lastCourseId', cleanId);
    }
    window.location.href = `course.html?unitId=${encodeURIComponent(cleanId)}`;
}

async function loadLecturerDashboard() {
    await loadUnits();
    renderLecturerUnits();
}

async function enroll(unitId) {
    const userId = getCurrentUserId() || getCurrentRegNumber();
    if (!userId) return alert("Login again to enroll.");
    const res = await fetch(`${API}/units/enroll`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, unitId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Enroll failed");
    await loadUnits();
    renderStudentUnits(document.getElementById('dash-title').textContent === 'Catalog' ? 'catalog' : 'enrolled');
}

async function unenroll(unitId) {
    const userId = getCurrentUserId() || getCurrentRegNumber();
    if (!userId) return alert("Login again to unenroll.");
    const res = await fetch(`${API}/units/unenroll`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId, unitId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || "Unenroll failed");
    await loadUnits();
    renderStudentUnits(document.getElementById('dash-title').textContent === 'Catalog' ? 'catalog' : 'enrolled');
}

function logout() {
    localStorage.clear();
    location.reload();
}

// Start everything
window.onload = () => {
    loadNews();
    bindCourseSearch();
    if (localStorage.getItem('regNum')) {
        showDashboard();
    }
};
