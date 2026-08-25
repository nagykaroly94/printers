const password = document.getElementById("password");
const toggle = document.getElementById("togglePassword");

toggle.addEventListener("click", () => {

    const visible = password.type === "text";

    password.type = visible ? "password" : "text";

    toggle.textContent = visible ? "◉" : "◌";

    toggle.setAttribute(
        "aria-label",
        visible
            ? "Jelszó megjelenítése"
            : "Jelszó elrejtése"
    );
});