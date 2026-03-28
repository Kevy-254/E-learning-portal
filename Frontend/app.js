const API = "http://localhost:5000/api";
const BASE_URL = "http://localhost:5000";
let allUnits = [];
let currentOpenUnitId = null;
let currentActiveView = 'dashboard';

// --- 1. VIEW CONTROLLERS ---
function hideAll() {
    const views = ['auth-container', 'dashboard-view', 'catalog-view', 'course-details-view', 'global-search', 'admin-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    ['side-dash', 'side-catalog'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

// --- 2. AUTHENTICATION (LOGIN) ---
async function login() {
    const regNumInput = document.getElementById('regNum').value.trim(); 
    const passwordInput = document.getElementById('pass').value;
    const selectedRole = document.getElementById('role').value; 

    if (!regNumInput || !passwordInput) return alert("Please enter both ID and Password");

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regNumber: regNumInput, password: passwordInput })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('regNum', data.regNumber);
            localStorage.setItem('role', selectedRole); 
            showDashboard();
        } else {
            alert(data.error); 
        }
    } catch (err) {
        alert("Cannot connect to server. Ensure Backend is running.");
    }
}

// --- 3. DASHBOARD LOGIC ---
async function showDashboard() {
    hideAll();
    currentActiveView = 'dashboard';
    const role = localStorage.getItem('role');
    const userRegNum = localStorage.getItem('regNum');

    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    document.getElementById('side-dash').classList.add('active');

    try {
        const res = await fetch(`${API}/units/all`);
        allUnits = await res.json();
    } catch (err) { console.error("Fetch error:", err); }

    if (role === 'admin') {
        document.getElementById('admin-view').style.display = 'block';
        renderAdminTools();
    } else {
        document.getElementById('dashboard-view').style.display = 'block';
        document.getElementById('global-search').style.display = 'block';
        document.getElementById('dash-title').innerText = 
            role === 'lecturer' ? `Staff Portal: ${userRegNum}` : "My Enrolled Units";
        renderCurrentView();
    }
}

// --- 4. RENDERING ENGINE ---
function handleSearch() { renderCurrentView(); }

function renderCurrentView() {
    const userRegNum = localStorage.getItem('regNum'); 
    const role = localStorage.getItem('role');
    const query = document.getElementById('unitSearch').value.toLowerCase();

    if (currentActiveView === 'dashboard') {
        const listDiv = document.getElementById('enrolled-list');
        const filtered = allUnits.filter(u => {
            const matches = u.name.toLowerCase().includes(query) || u.code.toLowerCase().includes(query);
            const isOwner = (role === 'lecturer' && u.lecturerId === userRegNum);
            const isStudent = (role === 'student' && u.enrolledStudents.includes(userRegNum));
            return matches && (isOwner || isStudent);
        });

        listDiv.innerHTML = filtered.map(u => `
            <div class="unit-card" onclick="openCourse('${u._id}')">
                <div style="height:8px; background:#003366;"></div>
                <div class="card-body">
                    <small>${u.code}</small>
                    <h3>${u.name}</h3>
                </div>
            </div>`).join('') || `<p>No units found.</p>`;

    } else if (currentActiveView === 'catalog') {
        const listDiv = document.getElementById('catalog-list');
        const filtered = allUnits.filter(u => u.name.toLowerCase().includes(query) || u.code.toLowerCase().includes(query));

        listDiv.innerHTML = filtered.map(u => {
            const isEnrolled = u.enrolledStudents.includes(userRegNum);
            let btn = (role === 'student' && !isEnrolled) 
                ? `<button class="btn-main" onclick="enroll('${u._id}')">Enroll</button>` 
                : `<button class="btn-main" style="background:#6c757d;" onclick="openCourse('${u._id}')">View</button>`;
            
            return `<div class="unit-card"><div class="card-body"><small>${u.code}</small><h3>${u.name}</h3>${btn}</div></div>`;
        }).join('');
    }
}

// --- 5. UNIT DETAILS ---
function openCourse(unitId) {
    const unit = allUnits.find(u => u._id === unitId);
    if (!unit) return;
    currentOpenUnitId = unitId;
    hideAll();
    document.getElementById('course-details-view').style.display = 'block';
    document.getElementById('cv-name').innerText = unit.name;
    document.getElementById('cv-code').innerText = unit.code;
    
    const role = localStorage.getItem('role');
    const userRegNum = localStorage.getItem('regNum');
    const isLecturer = (role === 'lecturer' && unit.lecturerId === userRegNum);

    document.getElementById('lecturer-upload-zone').style.display = isLecturer ? 'block' : 'none';

    document.getElementById('cv-materials').innerHTML = unit.materials.map(m => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>📄 ${m.name}</span>
            <div>
                <a href="${BASE_URL}${m.url}" target="_blank">Download</a>
            </div>
        </div>`).join('') || "No materials.";
}

// --- 6. ADMIN USER MANAGEMENT ---
async function adminCreateUser() {
    const regNumber = document.getElementById('new-user-id').value;
    const password = document.getElementById('new-user-pass').value;
    const role = document.getElementById('new-user-role').value;

    if(!regNumber || !password) return alert("Fill all fields");

    const res = await fetch(`${API}/auth/admin/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNumber, password, role })
    });

    const data = await res.json();
    alert(data.message || data.error);
}

async function adminResetPassword() {
    const regNumber = document.getElementById('reset-user-id').value;
    const newPassword = document.getElementById('reset-user-pass').value;

    if(!regNumber || !newPassword) return alert("Fill all fields");

    const res = await fetch(`${API}/auth/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNumber, newPassword })
    });

    const data = await res.json();
    alert(data.message || data.error);
}

// --- 7. ADMIN COURSE ACTIONS ---
async function adminCreateUnit() {
    const code = document.getElementById('admin-unit-code').value;
    const name = document.getElementById('admin-unit-name').value;
    await fetch(`${API}/units/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ code, name })
    });
    alert("Unit Created!"); 
    showDashboard();
}

async function adminAssignLecturer() {
    const unitId = document.getElementById('admin-unit-select').value;
    const lecturerId = document.getElementById('admin-staff-id').value;
    await fetch(`${API}/units/assign-lecturer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unitId, lecturerId })
    });
    alert("Lecturer Assigned!"); 
    showDashboard();
}

// --- 8. MISC ---
async function handleUpload() {
    const fileInput = document.getElementById('new-file-input');
    if (!fileInput.files[0]) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    await fetch(`${API}/files/upload/${currentOpenUnitId}`, { method: 'POST', body: formData });
    alert("Uploaded!"); showDashboard();
}

async function enroll(unitId) {
    const userRegNum = localStorage.getItem('regNum');
    await fetch(`${API}/units/enroll`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: userRegNum, unitId })
    });
    showDashboard();
}

function showCatalog() { hideAll(); currentActiveView = 'catalog'; document.getElementById('catalog-view').style.display = 'block'; document.getElementById('global-search').style.display = 'block'; document.getElementById('side-catalog').classList.add('active'); renderCurrentView(); }
function logout() { localStorage.clear(); location.reload(); }
function renderAdminTools() { 
    const select = document.getElementById('admin-unit-select');
    if(select) select.innerHTML = allUnits.map(u => `<option value="${u._id}">${u.code} - ${u.name}</option>`).join(''); 
}

window.onload = () => { 
    if (localStorage.getItem('userId')) showDashboard(); 
    else { hideAll(); document.getElementById('auth-container').style.display = 'block'; } 
}