    
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
        role: "admin",
        status: "active"
    },
    
    {
        id: 2,
        name: "Nagy Anna",
        username: "nagy.anna",
        email: "anna@example.hu",
        role: "user",
        status: "active"
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
                    <span class="user-name">
                        ${escapeHtml(user.name)}
                    </span>
                </td>

                <td>
                    <span class="muted">
                        ${escapeHtml(user.username)}
                    </span>
                </td>

                <td>
                    <span class="muted">
                        ${escapeHtml(user.email)}
                    </span>
                </td>

                <td>
                    <span class="badge ${user.role === "admin" ? "admin" : ""}">
                        ${
            user.role === "admin"
            ? "Rendszergazda"
            : "Felhasználó"
            }
                    </span>
                </td>

                <td>
                    <span class="badge ${user.status === "inactive" ? "inactive" : ""}">
                        ${
            user.status === "active"
            ? "Aktív"
            : "Inaktív"
            }
                    </span>
                </td>

                <td>

                    <div class="actions">

                        <button
                            class="secondary-btn"
                            type="button"
                            onclick="editUser(${user.id})"
                        >
                            Módosítás
                        </button>

                        <button
                            class="danger-btn"
                            type="button"
                            onclick="deleteUser(${user.id})"
                        >
                            Törlés
                        </button>

                    </div>

                </td>
            `;
            
            
            usersBody.appendChild(row);
            
        });
        
    }
    
    
    /* =========================
    FELHASZNÁLÓ MÓDOSÍTÁSA
    ========================= */
    
    function editUser(id) {
        
        const user =
        users.find(item => item.id === id);
        
        
        if (!user) return;
        
        
        const row =
        [...usersBody.querySelectorAll("tr")]
        .find(
        tr =>
        tr.querySelector(
        `[onclick="editUser(${id})"]`
        )
        );
        
        
        if (!row) return;
        
        
        row.innerHTML = `

            <td>
                <input
                    class="inline-input"
                    data-field="name"
                    value="${escapeAttribute(user.name)}"
                >
            </td>

            <td>
                <input
                    class="inline-input"
                    data-field="username"
                    value="${escapeAttribute(user.username)}"
                >
            </td>

            <td>
                <input
                    class="inline-input"
                    data-field="email"
                    type="email"
                    value="${escapeAttribute(user.email)}"
                >
            </td>

  

            <td>

                <div class="actions">

                    <button
                        class="primary-btn"
                        type="button"
                        onclick="saveUser(${id}, this)"
                    >
                        Mentés
                    </button>

                    <button
                        class="secondary-btn"
                        type="button"
                        onclick="renderUsers()"
                    >
                        Mégsem
                    </button>

                    <button
                        class="danger-btn"
                        type="button"
                        onclick="deleteUser(${id})"
                    >
                        Törlés
                    </button>

                </div>

            </td>
        `;
        
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
        
        
        const status =
        row.querySelector(
        '[data-field="status"]'
        ).value;
        
        
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
        user.status = status;
        
        
        renderUsers();
        
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
        users.filter(item => item.id !== id);
        
        
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
        
        
        const role =
        document.getElementById("newRole")
        .value;
        
        
        const status =
        document.getElementById("newStatus")
        .value;
        
        
        const message =
        document.getElementById("formMessage");
        
        
        if (password.length < 8) {
            
            message.hidden = false;
            
            message.textContent =
            "A jelszónak legalább 8 karakter hosszúnak kell lennie.";
            
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
            
            role,
            
            status
            
            // A jelszó backendben legyen kezelve.
            
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
    
    document
    .querySelectorAll(".toggle-password")
    .forEach(button => {
        
        button.addEventListener(
        "click",
        () => {
            
            const input =
            document.getElementById(
            button.dataset.target
            );
            
            
            const visible =
            input.type === "text";
            
            
            input.type =
            visible
            ? "password"
            : "text";
            
            
            button.textContent =
            visible
            ? "◉"
            : "◌";
            
        }
        );
        
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