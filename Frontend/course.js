const DEFAULT_API_PORT = 5000;
const API_HOST = window.location.hostname || 'localhost';
const API_PORT = window.API_PORT || DEFAULT_API_PORT;
const API_BASE_OVERRIDE = (window.API_BASE && String(window.API_BASE).trim()) || '';
const API = API_BASE_OVERRIDE || `http://${API_HOST}:${API_PORT}/api`;
const API_ORIGIN = API_BASE_OVERRIDE
    ? (API_BASE_OVERRIDE.startsWith('http') ? API_BASE_OVERRIDE.replace(/\/api$/, '') : window.location.origin)
    : `http://${API_HOST}:${API_PORT}`;

const params = new URLSearchParams(window.location.search);
const rawUnitId = params.get('unitId') || params.get('id') || localStorage.getItem('lastCourseId') || '';
const unitId = (rawUnitId === 'undefined' || rawUnitId === 'null') ? '' : String(rawUnitId).trim();
let activeUnitId = unitId;

let currentUnit = null;

function getRole() {
    return localStorage.getItem('role') || '';
}

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

function isLecturerAssigned(unit) {
    const lecturerId = String(unit.lecturerId || '').trim();
    const regNumber = getCurrentRegNumber();
    const userId = getCurrentUserId();
    return lecturerId && (lecturerId === regNumber || lecturerId === userId);
}

async function loadUnit() {
    if (!unitId) {
        document.getElementById('course-title').textContent = 'Course not found.';
        return;
    }

    try {
        const res = await fetch(`${API}/units/${unitId}`);
        if (res.status === 404) {
            const fallback = await loadUnitFromList();
            if (!fallback) {
                document.getElementById('course-title').textContent = 'Course not found.';
            }
            return;
        }
        if (!res.ok) throw new Error('Unit fetch failed');
        currentUnit = await res.json();
        activeUnitId = currentUnit._id || currentUnit.code || unitId;
        renderCourse();
    } catch (err) {
        document.getElementById('course-title').textContent = 'Failed to load course.';
        console.error(err);
    }
}

async function loadUnitFromList() {
    try {
        const res = await fetch(`${API}/units/all`);
        if (!res.ok) throw new Error('Units fetch failed');
        const units = await res.json();
        const needle = unitId.toLowerCase();
        const match = units.find(u => {
            const id = String(u._id || u.id || '').toLowerCase();
            const code = String(u.code || '').toLowerCase();
            return id === needle || code === needle;
        });
        if (!match) return false;
        currentUnit = match;
        activeUnitId = currentUnit._id || currentUnit.code || unitId;
        renderCourse();
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function renderCourse() {
    if (!currentUnit) return;

    const title = document.getElementById('course-title');
    const meta = document.getElementById('course-meta');
    const enrollBox = document.getElementById('course-enroll');
    const filesBox = document.getElementById('course-files');
    const uploadPanel = document.getElementById('upload-panel');

    title.textContent = `${currentUnit.code} - ${currentUnit.name}`;

    const lecturer = currentUnit.lecturerId ? currentUnit.lecturerId : 'Not assigned';
    meta.innerHTML = `
        <span>Code: ${currentUnit.code}</span>
        <span>Lecturer: ${lecturer}</span>
    `;

    const role = getRole();
    if (role === 'student') {
        const enrolled = isEnrolled(currentUnit);
        enrollBox.innerHTML = enrolled
            ? `<button class="btn-main btn-danger" onclick="unenroll()">Unenroll</button>`
            : `<button class="btn-main" onclick="enroll()">Enroll</button>`;
    } else {
        enrollBox.innerHTML = '';
    }

    const canManageFiles = role === 'lecturer' && isLecturerAssigned(currentUnit);
    uploadPanel.style.display = canManageFiles ? 'block' : 'none';

    const materials = Array.isArray(currentUnit.materials) ? currentUnit.materials : [];
    if (materials.length === 0) {
        filesBox.innerHTML = '<p class="muted">No files uploaded yet.</p>';
        return;
    }

    filesBox.innerHTML = materials.map(m => {
        const fileUrl = `${API_ORIGIN}${m.url}`;
        const uploaded = m.uploadedAt ? new Date(m.uploadedAt).toLocaleString() : '';
        const removeBtn = canManageFiles
            ? `<button class="btn-small btn-danger" onclick="deleteMaterial('${m._id}')">Remove</button>`
            : '';

        return `
            <div class="file-item">
                <div class="file-info">
                    <a href="${fileUrl}" target="_blank" rel="noopener">${m.name}</a>
                    ${uploaded ? `<small>${uploaded}</small>` : ''}
                </div>
                ${removeBtn}
            </div>
        `;
    }).join('');
}

async function enroll() {
    const userId = getCurrentUserId() || getCurrentRegNumber();
    if (!userId) return alert('Login again to enroll.');

    const res = await fetch(`${API}/units/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, unitId: activeUnitId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Enroll failed');
    await loadUnit();
}

async function unenroll() {
    const userId = getCurrentUserId() || getCurrentRegNumber();
    if (!userId) return alert('Login again to unenroll.');

    const res = await fetch(`${API}/units/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, unitId: activeUnitId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Unenroll failed');
    await loadUnit();
}

async function uploadFile() {
    const input = document.getElementById('file-input');
    if (!input || !input.files || input.files.length === 0) {
        return alert('Please choose a file to upload.');
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    const res = await fetch(`${API}/files/upload/${encodeURIComponent(activeUnitId)}`, {
        method: 'POST',
        body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Upload failed');

    input.value = '';
    await loadUnit();
}

async function deleteMaterial(materialId) {
    if (!confirm('Remove this file?')) return;

    const res = await fetch(`${API}/units/delete-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: activeUnitId, materialId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Delete failed');

    await loadUnit();
}

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

window.onload = () => {
    const role = getRole();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = role ? 'inline-flex' : 'none';
    loadUnit();
};
