(() => {
    const root = document.getElementById("content-root");
    if (!root) return;

    const normalizeEndpoint = (value, fallback) => {
        if (!value || typeof value !== "string") return fallback;
        if (value.startsWith("http")) return value;
        if (value.startsWith("/")) return value;
        // Ensure it resolves from root; default to admin namespace if missing.
        const prefixed = value.startsWith("admin/") ? `/${value}` : `/admin/${value.replace(/^\//, "")}`;
        return prefixed;
    };

    const corporateEndpoint = normalizeEndpoint(root.dataset.corporateEndpoint, "/admin/api/corporate-events");
    const galleryEndpoint = normalizeEndpoint(root.dataset.galleryEndpoint, "/admin/api/gallery");
    const staticBase = (document.body.dataset.staticBase || "/static/").replace(/\/?$/, "/");

    let events = Array.isArray(window.__INITIAL_EVENTS__) ? window.__INITIAL_EVENTS__ : [];
    let gallery = Array.isArray(window.__INITIAL_GALLERY__) ? window.__INITIAL_GALLERY__ : [];

    const corporateList = document.getElementById("corporate-list");
    const galleryList = document.getElementById("gallery-list");
    const corporateForm = document.getElementById("corporate-form");
    const galleryForm = document.getElementById("gallery-form");
    const corporateStatus = document.getElementById("corporate-status");
    const galleryStatus = document.getElementById("gallery-status");

    const fallbackImage = buildStatic("images/dummy.jpeg");

    function buildStatic(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        const clean = path.replace(/^\/+/, "");
        return `${staticBase}${clean}`;
    }

    function setStatus(el, message, isError = false) {
        if (!el) return;
        el.textContent = message || "";
        el.style.color = isError ? "#dc2626" : "#64748b";
        if (message) {
            setTimeout(() => {
                el.textContent = "";
            }, 4500);
        }
    }

    function formatDate(value) {
        if (!value) return "";
        const d = new Date(value);
        return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
    }

    function renderCorporate() {
        corporateList.innerHTML = "";
        if (!events.length) {
            corporateList.innerHTML = `<div class="empty">No corporate posts yet.</div>`;
            return;
        }

        events.forEach((ev) => {
            const wrapper = document.createElement("div");
            wrapper.className = "item";
            wrapper.dataset.id = ev.id;

            const img = document.createElement("img");
            img.className = "thumb";
            img.src = buildStatic(ev.event_image) || fallbackImage;
            img.alt = ev.title || ev.company_name || "Corporate event";

            const content = document.createElement("div");
            content.className = "item-content";

            const heading = document.createElement("h4");
            heading.textContent = ev.title || ev.company_name || "Corporate event";

            const sub = document.createElement("p");
            sub.textContent = ev.company_name || "";

            const desc = document.createElement("p");
            desc.textContent = ev.description || "";

            const meta = document.createElement("div");
            meta.className = "chip";
            meta.textContent = formatDate(ev.event_date) || "No date set";

            content.appendChild(heading);
            if (sub.textContent) content.appendChild(sub);
            if (desc.textContent) content.appendChild(desc);
            content.appendChild(meta);

            const actions = document.createElement("div");
            actions.className = "actions";
            const delBtn = document.createElement("button");
            delBtn.className = "btn btn-ghost";
            delBtn.dataset.action = "delete-event";
            delBtn.dataset.id = ev.id;
            delBtn.innerHTML = `<i class="fas fa-trash"></i> Remove`;
            actions.appendChild(delBtn);

            wrapper.appendChild(img);
            wrapper.appendChild(content);
            wrapper.appendChild(actions);

            corporateList.appendChild(wrapper);
        });
    }

    function renderGallery() {
        galleryList.innerHTML = "";
        if (!gallery.length) {
            galleryList.innerHTML = `<div class="empty">No gallery items yet.</div>`;
            return;
        }

        gallery.forEach((item) => {
            const wrapper = document.createElement("div");
            wrapper.className = "item";
            wrapper.dataset.id = item.id;

            const img = document.createElement("img");
            img.className = "thumb";
            img.src = buildStatic(item.image_path) || fallbackImage;
            img.alt = item.title || "Gallery image";

            const content = document.createElement("div");
            content.className = "item-content";

            const heading = document.createElement("h4");
            heading.textContent = item.title || "Gallery image";

            const desc = document.createElement("p");
            desc.textContent = item.description || "";

            content.appendChild(heading);
            if (desc.textContent) content.appendChild(desc);

            const actions = document.createElement("div");
            actions.className = "actions";
            const delBtn = document.createElement("button");
            delBtn.className = "btn btn-ghost";
            delBtn.dataset.action = "delete-gallery";
            delBtn.dataset.id = item.id;
            delBtn.innerHTML = `<i class="fas fa-trash"></i> Remove`;
            actions.appendChild(delBtn);

            wrapper.appendChild(img);
            wrapper.appendChild(content);
            wrapper.appendChild(actions);

            galleryList.appendChild(wrapper);
        });
    }

    async function handleCorporateSubmit(e) {
        e.preventDefault();
        const formData = new FormData(corporateForm);
        setStatus(corporateStatus, "Publishing...");

        try {
            const res = await fetch(corporateEndpoint, {
                method: "POST",
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                const msg = data.message || `Failed (${res.status})`;
                throw new Error(msg);
            }

            events = [data.event, ...events];
            renderCorporate();
            corporateForm.reset();
            setStatus(corporateStatus, "Event published");
        } catch (err) {
            console.error(err);
            setStatus(corporateStatus, err.message || "Unable to publish", true);
        }
    }

    async function handleGallerySubmit(e) {
        e.preventDefault();
        const formData = new FormData(galleryForm);
        setStatus(galleryStatus, "Uploading...");
        try {
            const res = await fetch(galleryEndpoint, {
                method: "POST",
                body: formData,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                const msg = data.message || `Failed (${res.status})`;
                throw new Error(msg);
            }

            gallery = [data.item, ...gallery];
            renderGallery();
            galleryForm.reset();
            setStatus(galleryStatus, "Added to gallery");
        } catch (err) {
            console.error(err);
            setStatus(galleryStatus, err.message || "Unable to upload", true);
        }
    }

    async function deleteEvent(id) {
        if (!id) return;
        setStatus(corporateStatus, "Removing...");
        try {
            const res = await fetch(`${corporateEndpoint}/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Delete failed");
            events = events.filter((ev) => Number(ev.id) !== Number(id));
            renderCorporate();
            setStatus(corporateStatus, "Removed");
        } catch (err) {
            console.error(err);
            setStatus(corporateStatus, err.message || "Unable to delete", true);
        }
    }

    async function deleteGallery(id) {
        if (!id) return;
        setStatus(galleryStatus, "Removing...");
        try {
            const res = await fetch(`${galleryEndpoint}/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Delete failed");
            gallery = gallery.filter((item) => Number(item.id) !== Number(id));
            renderGallery();
            setStatus(galleryStatus, "Removed");
        } catch (err) {
            console.error(err);
            setStatus(galleryStatus, err.message || "Unable to delete", true);
        }
    }

    corporateForm?.addEventListener("submit", handleCorporateSubmit);
    galleryForm?.addEventListener("submit", handleGallerySubmit);

    corporateList?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='delete-event']");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (!Number.isFinite(id)) return;
        deleteEvent(id);
    });

    galleryList?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='delete-gallery']");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (!Number.isFinite(id)) return;
        deleteGallery(id);
    });

    renderCorporate();
    renderGallery();
})();
