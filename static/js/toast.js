
(() => {
    // Prevent duplicate initialization
    if (window.__toastInitialized) return;
    window.__toastInitialized = true;

    // Inject styles
    const style = document.createElement("style");
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 1.25rem;
            right: 1.25rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .toast {
            width: fit-content;
            min-width: 12rem;
            max-width: 24rem;
            box-sizing: border-box;
            padding: 0.875rem 1.125rem;

            color: white;
            background: #333;
            border-radius: 0.5rem;
            box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.25);

            line-height: 1.5;
            overflow-wrap: anywhere;

            opacity: 0;
            transform: translateX(1.875rem);

            animation:
                toast-in 0.25s ease-out forwards,
                toast-out 0.5s ease-in 2.5s forwards;
        }

        @keyframes toast-in {
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes toast-out {
            to {
                opacity: 0;
                transform: translateX(1.875rem);
            }
        }
    `;

    // Initialize container and styles
    function initialize() {
        if (!document.body || !document.head) return false;

        if (!document.getElementById("toast-container")) {
            const container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }

        if (!style.isConnected) { document.head.appendChild(style); }

        return true;
    }

    // Wait for DOM if necessary
    if (!initialize()) { document.addEventListener("DOMContentLoaded", initialize, { once: true }); }

    // Global toast function
    window.showToast = function (content) {
        if (!initialize()) {
            document.addEventListener("DOMContentLoaded", () => { window.showToast(content); }, { once: true });
            return;
        }

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = String(content);

        // Remove toast after exit animation
        const removeToast = (event) => { if (event.animationName === "toast-out") { toast.remove(); }};

        toast.addEventListener("animationend", removeToast);
        toast.addEventListener("animationcancel", removeToast);

        document.getElementById("toast-container").appendChild(toast);
    };
})();
