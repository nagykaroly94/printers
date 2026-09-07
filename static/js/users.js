let users = [];
let loggedInUsername = "";
let passwordUser = null;

async function loadCurrentUser() {
    const response = await fetch("/current_user");
    
    if (!response.ok) {
        return;
    }
    
    const data = await response.json();
    
    if (data.authenticated) {
        loggedInUsername = data.username;
    }
}

async function initUsers() {
    await loadCurrentUser();
    await loadUsers();
}

async function loadUsers() {
    try {
        const response = await fetch("/get_users");
        
        if (!response.ok) {
            throw new Error("Nem sikerült lekérni a felhasználókat.");
        }
        
        const data = await response.json();
        
        users = data.map(user => ({
            id: user.id,
            name: user.nev,
            username: user.felhasznalonev,
            email: user.email,
            role: Number(user.isadmin) === 1 ? "admin" : "user"
        }));
        
        renderUsers();
        
    } catch (error) {
        console.error("Felhasználók betöltési hiba:");
    }
}

const usersBody =
document.getElementById("usersBody");

const searchInput =
document.getElementById("usersearchInput");

const userCount =
document.getElementById("userCount");

const emptyState =
document.getElementById("emptyState");

/* =========================
FELHASZNÁLÓK MEGJELENÍTÉSE
========================= */

function renderUsers() {
    
    const search = searchInput.value.trim().toLowerCase();
     
    const filtered =
    users.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
    );
    
    
    usersBody.innerHTML = "";
    
    
    userCount.textContent =
    `${filtered.length} / ${users.length} felhasználó`;
    
    
    emptyState.hidden =
    filtered.length !== 0;
    
    
    filtered.forEach(user => {
        
        const row =
        document.createElement("tr");
        
        
        row.innerHTML = `
        
        <td>
            <input
                class="inline-input"
                data-field="name"
                value="${escapeAttribute(user.name)}"
                disabled
                required
            >
        </td>
        
        
        <td>
            <input
                class="inline-input"
                data-field="username"
                value="${escapeAttribute(user.username)}"
                disabled
                required
            >
        </td>
        
        
        <td>
            <input
                class="inline-input"
                data-field="email"
                type="email"
                value="${escapeAttribute(user.email)}"
                disabled
                required
            >
        </td>
        
        
        <td>
            <select
                class="inline-select"
                data-field="role"
                disabled
            >
                <option
                    value="user"
                    ${user.role === "user" ? "selected" : ""}
                >
                    User
                </option>
        
                <option
                    value="admin"
                    ${user.role === "admin" ? "selected" : ""}
                >
                    Admin
                </option>
            </select>
        </td>
        
        
        <td>
        
            <div class="actions">
            <button
                class="primary-btn"
                type="button"
                onclick="setNewPassword(${user.id})"
            >
                🔐
            </button>
                <button
                    class="primary-btn"
                    type="button"
                    onclick="editUser(${user.id}, this)"
                >
                    🔧
                </button>
        
                <button
                    class="primary-btn"
                    type="button"
                    onclick="deleteUser('${user.username}')"
                    ${user.username === loggedInUsername ? "disabled" : ""}
                >
                    ❌
                </button>
        
            </div>
        
        </td>
        
    `;
        
        
        usersBody.appendChild(row);
        
    });
    
}

/* =========================
JOGOSULTSÁG MÓDOSÍTÁSA
========================= */

function changeUserRole(id, role) {
    
    
    const user =
    users.find(item => item.id === id);
    
    
    if (!user) return;
    
    
    user.role = role;
    
    
}

/* =========================
ÚJ JELSZÓ MEGADÁSA
========================= */

function setNewPassword(id) {
    const user = users.find(item => item.id === id);
    
    if (!user) {
        console.error("Felhasználó nem található:", id);
        return;
    }
    
    passwordUser = user;
    
    document.getElementById("passwordUserName").textContent = user.name;
    document.getElementById("changePasswordInput").value = "";
    
    document.getElementById("passwordModal").style.display = "flex";
    
    document.getElementById("changePasswordInput").focus();
}

function closePasswordModal() {
    document.getElementById("passwordModal").style.display = "none";
    
    passwordUser = null;
}

async function saveNewPassword() {
    
    if (!passwordUser) {
        return;
    }
    
    const password =
    document.getElementById("changePasswordInput").value;
    
    try {
        
        const response =
        await fetch(
            `/change_password/${encodeURIComponent(passwordUser.username)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    jelszo: password
                })
            }
        );
        
        if (!response.ok) {            
            return;
        }
        
        closePasswordModal();
        
    } catch (error) {
        
        console.error(
            "Jelszó módosítási hiba:",
            error
        );
        
    }
}

/* =========================
FELHASZNÁLÓ MÓDOSÍTÁSA
========================= */

async function editUser(id, btn) {
    
    const row = btn.closest("tr");
    
    const inputs = row.querySelectorAll(
        'input[data-field], select[data-field]'
    );
    
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        
        btn.dataset.oldUsername = row
        .querySelector('[data-field="username"]')
        .value.trim();
        
        // Szerkesztés bekapcsolása
        inputs.forEach(input => {
            input.disabled = false;
        });
        
        btn.textContent = "💾";
        btn.dataset.editing = "true";
        
    } else {
        
        // Mentés
        const user = users.find(item => item.id === id);
        
        if (!user) return;
        const oldUsername = btn.dataset.oldUsername;
        
        const name = row
        .querySelector('[data-field="name"]')
        .value.trim();
        
        const username = row
        .querySelector('[data-field="username"]')
        .value.trim();
        
        const email = row
        .querySelector('[data-field="email"]')
        .value.trim();
        
        const role = row
        .querySelector('[data-field="role"]')
        .value;
        const isadmin = role === "admin" ? 1 : 0;
        
        
        if (!name || !username || !email) {
            showToast("Minden mező kitöltése kötelező!");
            return;
        }
        
        
        const response = await fetch("/update_user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                regi_felhasznalonev: oldUsername,
                nev: name,
                felhasznalonev: username,
                email: email,
                isadmin: isadmin
            })
        });
        
        if (!response.ok) {
            return;
        }
        
        user.name = name;
        user.username = username;
        user.email = email;
        user.role = role;
        
        
        // Újra inaktív
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        
        // Vissza a szerkesztés ikonra
        btn.textContent = "🔧";
        btn.dataset.editing = "false";
    }
}

/* =========================
Módosítás visszavonása
========================= */

function cancelEdit(id, button) {
    
    const row =
    button.closest("tr");
    
    
    if (!row) return;
    
    
    row.querySelectorAll(
        '[data-field="name"], [data-field="username"], [data-field="email"], [data-field="role"]'
    ).forEach(input => {
        
        input.value =
        input.dataset.originalValue;
        
        input.disabled = true;
        
    });
    
    
    row.querySelector(".edit-btn").hidden = false;
    
    row.querySelector(".save-btn").hidden = true;
    
    row.querySelector(".cancel-btn").hidden = true;
    
}

/* =========================
FELHASZNÁLÓ TÖRLÉSE
========================= */

async function deleteUser(username) {
    
    if (!confirm("Biztosan törölni szeretnéd ezt a felhasználót?")) {
        return;
    }
    
    try {
        
        const response = await fetch(
            `/delete_user/${encodeURIComponent(username)}`,
            {
                method: "DELETE"
            }
        );
        
        if (!response.ok) {
            alert("Hiba történt a felhasználó törlésekor.");
            return;
        }
        
        await loadUsers();
        
    } catch (error) {
        
        console.error("Felhasználó törlési hiba:", error);
        
        alert("Nem sikerült kapcsolódni a szerverhez.");
    }
}

/* =========================
ÚJ FELHASZNÁLÓ
========================= */

document
.getElementById("addUserForm")
.addEventListener("submit", async event => {
    
    event.preventDefault();
    
    const name =
    document.getElementById("newName")
    .value.trim();
    
    const username =
    document.getElementById("newUsername")
    .value.trim();
    
    const email =
    document.getElementById("newEmail")
    .value.trim();
    
    const password =
    document.getElementById("newPassword")
    .value;
    
    const passwordConfirmInput =
    document.getElementById("newPasswordConfirm");
    
    const passwordConfirm =
    passwordConfirmInput.value;
    
    passwordConfirmInput.addEventListener("input", () => {
        passwordConfirmInput.setCustomValidity("");
    });
    const role =
    document.getElementById("newRole")
    .value;
    
    const isadmin = Number(role);
    
    if (password !== passwordConfirm) {
        
        passwordConfirmInput.setCustomValidity(
            "A két jelszónak meg kell egyeznie."
        );
        
        passwordConfirmInput.reportValidity();
        
        return;
        
    } else {
        
        passwordConfirmInput.setCustomValidity("");
    }
    /* =========================
    ADATKÜLDÉS FLASKNAK
    ========================= */
    
    try {
        
        const response =
        await fetch("/add_user", {
            
            method: "POST",
            
            headers: {
                "Content-Type": "application/json"
            },
            
            body: JSON.stringify({
                
                nev: name,
                
                felhasznalonev: username,
                
                email: email,
                
                isadmin: isadmin,
                
                jelszo: password
                
            })
            
        });
        
        
        if (!response.ok) {
            return;
        }
        
        /* =========================
        SIKERES MENTÉS
        ========================= */
        
        event.target.reset();
        
        
        /* Felhasználók újratöltése */
        
        if (typeof loadUsers === "function") {
            
            await loadUsers();
            
        } else {
            
            renderUsers();
            
        }
        
        
    } catch (error) {
        
        console.error(
            "Felhasználó hozzáadási hiba:",
            error
        );        
    }
    
});


/* =========================
KERESÉS
========================= */

searchInput.addEventListener("input", function () {
    renderUsers();
});

/* =========================
JELSZÓ MUTATÁSA
========================= */
document.querySelectorAll('input[type="password"]').forEach(input => {
    
    const div = input.parentElement;
    div.classList.add('password-field');
    
    const button = document.createElement('button');
    
    button.type = 'button';
    button.textContent = '👀';
    
    button.addEventListener('click', () => {
        
        const visible = input.type === 'text';
        
        input.type = visible ? 'password' : 'text';
        button.textContent = visible ? '👀' : '🫣';
        
    });
    
    div.appendChild(button);
    
});
/* =========================
HTML ESCAPE
========================= */

function escapeHtml(value) {
    
    
    return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
    
    
}

function escapeAttribute(value) {
    
    
    return escapeHtml(value);
    
    
}

/* =========================
INDÍTÁS
========================= */
initUsers();