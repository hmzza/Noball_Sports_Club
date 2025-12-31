(() => {
    const root = document.getElementById("inquiries-root");
    if (!root) return;

    const endpoint = root.dataset.endpoint || "/admin/api/corporate-inquiries";
    const listEl = document.getElementById("inquiries-list");
    const emptyEl = document.getElementById("inquiries-empty");

    let items = Array.isArray(window.__INITIAL_INQUIRIES__) ? window.__INITIAL_INQUIRIES__ : [];

    function fmtDate(value) {
        if (!value) return "";
        const d = new Date(value);
        return isNaN(d.getTime()) ? "" : d.toLocaleString();
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text || "";
        return div.innerHTML;
    }

    function render() {
        if (!listEl || !emptyEl) return;
        listEl.innerHTML = "";
        if (!items.length) {
            emptyEl.style.display = "block";
            return;
        }
        emptyEl.style.display = "none";

        items.forEach((it) => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.id = it.id;

            const status = (it.status || "new").toLowerCase();
            const header = document.createElement("div");
            header.innerHTML = `
                <h3>${escapeHtml(it.company_name || "Corporate Inquiry")}</h3>
                <div class="statusline">${status === "new" ? "New" : "Reviewed"} • ${escapeHtml(fmtDate(it.created_at) || "")}</div>
            `;

            const meta = document.createElement("div");
            meta.className = "meta";
            const phone = it.contact_phone ? `<a href="tel:${escapeHtml(it.contact_phone)}">${escapeHtml(it.contact_phone)}</a>` : "-";
            const email = it.contact_email ? `<a href="mailto:${escapeHtml(it.contact_email)}">${escapeHtml(it.contact_email)}</a>` : "-";
            const preferred = it.preferred_date ? escapeHtml(String(it.preferred_date)) : "-";
            const attendees = it.attendees ? escapeHtml(String(it.attendees)) : "-";
            meta.innerHTML = `
                <span>Contact: ${escapeHtml(it.contact_name || "-")}</span>
                <span>Phone: ${phone}</span>
                <span>Email: ${email}</span>
                <span>Date: ${preferred}</span>
                <span>Attendees: ${attendees}</span>
            `;

            const message = document.createElement("div");
            message.className = "message";
            message.textContent = it.message || "";

            const actions = document.createElement("div");
            actions.className = "actions";
            const reviewedBtn = document.createElement("button");
            reviewedBtn.className = "btn btn-ghost";
            reviewedBtn.disabled = status !== "new";
            reviewedBtn.innerHTML = `<i class="fas fa-check"></i> Mark Reviewed`;
            reviewedBtn.addEventListener("click", () => markReviewed(it.id));

            const delBtn = document.createElement("button");
            delBtn.className = "btn btn-danger";
            delBtn.innerHTML = `<i class="fas fa-trash"></i> Delete`;
            delBtn.addEventListener("click", () => deleteInquiry(it.id));

            actions.appendChild(reviewedBtn);
            actions.appendChild(delBtn);

            card.appendChild(header);
            card.appendChild(meta);
            if (message.textContent) card.appendChild(message);
            card.appendChild(actions);

            listEl.appendChild(card);
        });
    }

    async function markReviewed(id) {
        if (!id) return;
        const res = await fetch(`/admin/api/corporate-inquiries/${id}/reviewed`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return;
        items = items.map((it) => (Number(it.id) === Number(id) ? { ...it, status: "reviewed" } : it));
        render();
    }

    async function deleteInquiry(id) {
        if (!id) return;
        if (!confirm("Delete this inquiry?")) return;
        const res = await fetch(`/admin/api/corporate-inquiries/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) return;
        items = items.filter((it) => Number(it.id) !== Number(id));
        render();
    }

    // Optional refresh to ensure latest
    async function refresh() {
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.items)) {
                items = data.items;
                render();
            }
        } catch {
            // ignore
        }
    }

    render();
    refresh();
})();

