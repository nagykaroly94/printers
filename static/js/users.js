/*

* Mintaadatok.
* Backend használatakor ezeket API-hívásokra lehet cserélni.
*/

let users = [
    
    
    {
        id: 1,
        name: "Kovács Péter",
        username: "kovacs.peter",
        email: "peter@example.hu",
        role: "admin"
    },
    
    {
        id: 2,
        name: "Nagy Anna",
        username: "nagy.anna",
        email: "anna@example.hu",
        role: "user"
    }
    
    
];

const usersBody =
document.getElementById("usersBody");

const searchInput =
document.getElementById("searchInput");

const userCount =
document.getElementById("userCount");

const emptyState =
document.getElementById("emptyState");

/* =========================
FELHASZNÁLÓK MEGJELENÍTÉSE
========================= */

function renderUsers() {
    
    const search =
    searchInput.value
    .trim()
    .toLowerCase();
    
    
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
            >
        </td>
        
        
        <td>
            <input
                class="inline-input"
                data-field="username"
                value="${escapeAttribute(user.username)}"
                disabled
            >
        </td>
        
        
        <td>
            <input
                class="inline-input"
                data-field="email"
                type="email"
                value="${escapeAttribute(user.email)}"
                disabled
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
                    onclick="deleteUser(${user.id})"
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
    
    
    const user =
    users.find(item => item.id === id);
    
    
    if (!user) return;
    
    
    const password =
    prompt(
        `Új jelszó megadása:\n\n${user.name}`
    );
    
    
    if (password === null) {
        return;
    }
    
    
    if (password.length < 8) {
        
        alert(
            "A jelszónak legalább 8 karakter hosszúnak kell lennie."
        );
        
        return;
    }
    
    
    /*
    * FONTOS:
    * A jelszót valódi rendszerben nem itt,
    * hanem a backendben kell kezelni.
    */
    
    alert(
        "A jelszó sikeresen módosítva."
    );
    
    
}

/* =========================
FELHASZNÁLÓ MÓDOSÍTÁSA
========================= */

function editUser(id, btn) {
    
    const row = btn.closest("tr");
    
    const inputs = row.querySelectorAll(
        'input[data-field], select[data-field]'
    );
    
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        
        // Szerkesztés bekapcsolása
        inputs.forEach(input => {
            input.disabled = false;
        });
        
        btn.textContent = "💾";
        btn.dataset.editing = "true";
        
    } else {
        
        // Mentés
        const user = users.find(
            item => item.id === id
        );
        
        if (!user) return;
        
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
        
        
        if (!name || !username || !email) {
            
            alert(
                "A név, felhasználónév és e-mail cím kitöltése kötelező."
            );
            
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
MÓDOSÍTÁS MENTÉSE
========================= */

function saveUser(id, button) {
    
    const row =
    button.closest("tr");
    
    
    const user =
    users.find(item => item.id === id);
    
    
    if (!user) return;
    
    
    const name =
    row.querySelector(
        '[data-field="name"]'
    ).value.trim();
    
    
    const username =
    row.querySelector(
        '[data-field="username"]'
    ).value.trim();
    
    
    const email =
    row.querySelector(
        '[data-field="email"]'
    ).value.trim();
    
    
    const role =
    row.querySelector(
        '[data-field="role"]'
    ).value;
    
    
    if (!name || !username || !email) {
        
        alert(
            "A név, felhasználónév és e-mail cím kitöltése kötelező."
        );
        
        return;
    }
    
    
    user.name =
    name;
    
    user.username =
    username;
    
    user.email =
    email;
    
    user.role =
    role;
    
    
    /*
    * Mezők újra letiltása.
    */
    
    row.querySelectorAll(
        '[data-field="name"], [data-field="username"], [data-field="email"], [data-field="role"]'
    ).forEach(input => {
        
        input.disabled = true;
        
        input.dataset.originalValue =
        input.value;
        
    });
    
    
    /*
    * Gombok visszaállítása.
    */
    
    row.querySelector(".edit-btn").hidden = false;
    
    row.querySelector(".save-btn").hidden = true;
    
    row.querySelector(".cancel-btn").hidden = true;
    
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

function deleteUser(id) {
    
    
    const user =
    users.find(item => item.id === id);
    
    
    if (!user) return;
    
    
    const confirmed =
    confirm(
        `Biztosan törölni szeretnéd a felhasználót?\n\n${user.name}`
    );
    
    
    if (!confirmed) return;
    
    
    users =
    users.filter(
        item => item.id !== id
    );
    
    
    renderUsers();
    
    
}

/* =========================
ÚJ FELHASZNÁLÓ
========================= */

document
.getElementById("addUserForm")
.addEventListener("submit", event => {
    
    
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
    
    
    const passwordConfirm =
    document.getElementById("newPasswordConfirm")
    .value;
    
    
    const role =
    document.getElementById("newRole")
    .value;
    
    
    const message =
    document.getElementById("formMessage");
    
    
    if (password.length < 8) {
        
        message.hidden = false;
        
        message.textContent =
        "A jelszónak legalább 8 karakter hosszúnak kell lennie.";
        
        return;
    }
    
    
    if (password !== passwordConfirm) {
        
        message.hidden = false;
        
        message.textContent =
        "A két jelszó nem egyezik.";
        
        return;
    }
    
    
    if (!role) {
        
        message.hidden = false;
        
        message.textContent =
        "A jogosultság kiválasztása kötelező.";
        
        return;
    }
    
    
    if (
        users.some(
            user =>
                user.username.toLowerCase() ===
            username.toLowerCase()
        )
    ) {
        
        message.hidden = false;
        
        message.textContent =
        "Ez a felhasználónév már létezik.";
        
        return;
    }
    
    
    users.push({
        
        id: Date.now(),
        
        name,
        
        username,
        
        email,
        
        role
        
        /*
        * A jelszó backendben legyen kezelve.
        */
        
    });
    
    
    event.target.reset();
    
    
    message.hidden = false;
    
    message.textContent =
    "A felhasználó sikeresen hozzáadva.";
    
    
    renderUsers();
    
});


/* =========================
KERESÉS
========================= */

searchInput.addEventListener(
"input",
    renderUsers
);

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

renderUsers();
