const password = document.getElementById("password");
const toggle = document.getElementById("togglePassword");
const form = document.getElementById("loginForm");
const message = document.getElementById("message");

toggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.textContent = visible ? "◉" : "◌";
    toggle.setAttribute(
    "aria-label",
    visible ? "Jelszó megjelenítése" : "Jelszó elrejtése"
    );
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    message.style.display = "block";
});