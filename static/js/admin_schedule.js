// admin_schedule.js
//
// COMPLETE Admin Schedule Manager (single-day view with 00:00–05:30, then 14:00–23:30)
// - Local-date safe helpers
// - Cross-midnight handling (only when end < start, not for 00:00–05:30)
// - Desktop grid + Mobile “Excel” view
// - Quick booking, selection, blocking, comments, and admin actions

// ===== Local date helpers =====
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD (LOCAL)
}
function parseLocalDate(dateStr /* 'YYYY-MM-DD' */) {
  const [Y, M, D] = dateStr.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0); // Local midnight
}
function combineLocal(dateStr, timeStr /* 'HH:mm' */) {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(Y, M - 1, D, h, m, 0, 0); // Local
}
function minutesOfDay(time /* 'HH:mm' */) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function isTimeBefore(a /* 'HH:mm' */, b /* 'HH:mm' */) {
  return minutesOfDay(a) < minutesOfDay(b);
}
function addDays(dateStr /* 'YYYY-MM-DD' */, days) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

class AdminScheduleManager {
  constructor() {
    // State
    this.currentDate = new Date();
    this.currentView = "day"; // default to day view for single-day layout
    this.scheduleData = {};
    this.selectedSlot = null;
    this.isSubmittingBooking = false;

    // Booking selection state
    this.bookingMode = false;
    this.startSlot = null;
    this.endSlot = null;
    this.selectedSlots = [];
    this.currentCourt = null;
    this.selectionSegment = null; // "night" (00:00–05:30) or "day" (14:00–23:30)

    // Courts
    this.courtConfig = {
      padel: [
        { id: "padel-1", name: "Court 1: Purple Mondo", pricing: 5500 },
        { id: "padel-2", name: "Court 2: Teracotta Court", pricing: 5500 },
      ],
      cricket: [
        { id: "cricket-1", name: "Court 1: 110x50ft", pricing: 3000 },
        { id: "cricket-2", name: "Court 2: 130x60ft Multi", pricing: 3000 },
      ],
      futsal: [
        { id: "futsal-1", name: "Court 1: 130x60ft Multi", pricing: 2500 },
      ],
      pickleball: [
        {
          id: "pickleball-1",
          name: "Court 1: Professional Setup",
          pricing: 2500,
        },
      ],
      axe_throw: [
        { id: "axe-1", name: "Lane 1: Axe Throw", pricing: 4000 },
      ],
      archery: [
        { id: "archery-1", name: "Lane 1: Archery Range", pricing: 3500 },
      ],
    };

    // Multi-purpose mapping
    this.multiPurposeCourts = {
      "cricket-2": "multi-130x60",
      "futsal-1": "multi-130x60",
    };

    // Build time slots for a single day:
    // 00:00–05:30 (12 slots), then 14:00–23:30 (20 slots) = 32 slots total
    this.timeSlots = this.generateTimeSlots();

    // Init
    this.init();
  }

  // ===== Time slots (workday 14:00 -> 06:00 next day) =====
  generateTimeSlots() {
    const slots = [];
    // Afternoon/Evening: 14:00..23:30
    for (let hour = 14; hour < 24; hour++) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
      slots.push(`${String(hour).padStart(2, "0")}:30`);
    }
    // Next-day early morning: 00:00..05:30
    for (let hour = 0; hour < 6; hour++) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
      slots.push(`${String(hour).padStart(2, "0")}:30`);
    }
    return slots;
  }
  // Session labeling helpers
  isMorningSlot(time) {
    const h = parseInt(time.split(":")[0], 10);
    return h >= 0 && h < 6;
  }
  isEveningSlot(time) {
    const h = parseInt(time.split(":")[0], 10);
    return h >= 14 && h <= 23;
  }
  // Mark slots after midnight for next-day labeling
  isNextDaySlot(time) {
    return this.isMorningSlot(time);
  }
  // Segment helper (for selection rule)
  getTimeSegment(time /* 'HH:mm' */) {
    const [h, m] = time.split(":").map(Number);
    const mins = h * 60 + m;
    if (mins >= 0 && mins <= 330) return "night"; // 00:00–05:30
    if (mins >= 840 && mins <= 1410) return "day"; // 14:00–23:30
    return "gap"; // 05:30–14:00 (closed)
  }

  // ===== Init / Event listeners =====
  init() {
    this.initializeSchedule();
    this.setupEventListeners();
    this.hideAllModals();
    this.handleSportFilterChange();
    setTimeout(() => {
      this.loadScheduleData();
      this.setupBookingControls();
      this.setupEditModalListeners();
    }, 200);

    // Prefer unified mobile grid for smooth scrolling
    this.useUnifiedMobile = window.matchMedia('(max-width: 768px)').matches;
  }

  initializeSchedule() {
    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = localDateKey(this.currentDate);
      this.updateDateDisplay();

      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 90);

      dateInput.min = localDateKey(today);
      dateInput.max = localDateKey(maxDate);
    }
  }

  setupEventListeners() {
    // Date navigation (move by 1 day)
    this.addEventListener("prev-week", "click", () => this.navigateDate(-1));
    this.addEventListener("next-week", "click", () => this.navigateDate(1));
    this.addEventListener("schedule-date", "change", (e) =>
      this.handleDateChange(e)
    );

    // View toggle
    this.addEventListener("week-view", "click", () => this.switchView("week"));
    this.addEventListener("day-view", "click", () => this.switchView("day"));

    // Filters and refresh
    this.addEventListener("sport-filter", "change", () =>
      this.handleSportFilterChange()
    );
    this.addEventListener("refresh-schedule", "click", () =>
      this.refreshSchedule()
    );

    // Modal controls
    this.addEventListener("close-modal", "click", () => this.closeSlotModal());
    this.addEventListener("slot-modal-overlay", "click", (e) =>
      this.handleModalOverlayClick(e)
    );

    // Slot actions
    this.addEventListener("block-slot-btn", "click", () =>
      this.blockSlotFromModal()
    );

    // Booking actions
    this.addEventListener("confirm-booking-btn", "click", () =>
      this.confirmBookingFromModal()
    );
    this.addEventListener("decline-booking-btn", "click", () =>
      this.declineBookingFromModal()
    );
    this.addEventListener("cancel-booking-btn", "click", () =>
      this.cancelBookingFromModal()
    );
    this.addEventListener("edit-booking-btn", "click", () =>
      this.editBookingFromModal()
    );

    // Comments
    this.addEventListener("save-admin-comment-btn", "click", () =>
      this.saveSlotComment()
    );
    this.addEventListener("unblock-slot-btn", "click", () =>
      this.unblockSlotFromModal()
    );

    // Quick book modal
    this.addEventListener("close-quick-book-modal", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("cancel-quick-book", "click", () =>
      this.closeQuickBookModal()
    );
    this.addEventListener("quick-book-form", "submit", (e) =>
      this.handleQuickBook(e)
    );
    this.addEventListener("quick-book-modal-overlay", "click", (e) =>
      this.handleQuickBookOverlayClick(e)
    );

    // Responsive rerender
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.renderSchedule(), 300);
    });

    console.log("✅ Event listeners ready");
  }

  addEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Listener: ${id} (${event})`);
      if (id === "block-slot-btn") {
        console.log("🚫 Block button attached:", element);
      }
    } else {
      console.warn(`⚠️ Missing element: ${id}`);
      if (id === "block-slot-btn") {
        setTimeout(() => {
          const later = document.getElementById(id);
          console.log("Recheck block button:", later);
        }, 1000);
      }
    }
  }

  hideAllModals() {
    [
      "slot-modal-overlay",
      "quick-book-modal-overlay",
      "block-slot-modal-overlay",
    ].forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    });
    this.selectedSlot = null;
  }

  // ===== Data / Render =====
  async loadScheduleData() {
    this.showLoading(true);
    try {
      const sportFilter = document.getElementById("sport-filter")?.value || "";
      if (sportFilter === "rage_room") {
        this.scheduleData = {};
        this.renderRageRoomNotice();
        this.showLoading(false);
        return;
      }

      const startDate =
        this.currentView === "week"
          ? this.getWeekStartDate(this.currentDate)
          : new Date(this.currentDate);
      const endDate =
        this.currentView === "week"
          ? (() => {
              const end = new Date(startDate);
              end.setDate(startDate.getDate() + 6);
              return end;
            })()
          : new Date(this.currentDate);

      const requestData = {
        startDate: localDateKey(startDate),
        endDate: localDateKey(endDate),
        sport: document.getElementById("sport-filter")?.value || "",
      };

      console.log("🔧 Load schedule:", requestData);

      const res = await fetch("/admin/api/schedule-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      if (!data.success)
        throw new Error(data.message || "Failed to load schedule");

      this.scheduleData = data.schedule || {};
      console.log("📊 Days loaded:", Object.keys(this.scheduleData).length);

      this.renderSchedule();

      // Count bookings
      let totalBookings = 0;
      Object.keys(this.scheduleData).forEach((date) => {
        Object.keys(this.scheduleData[date] || {}).forEach((court) => {
          totalBookings += Object.keys(
            this.scheduleData[date][court] || {}
          ).length;
        });
      });
      if (totalBookings > 0)
        this.showSuccessToast(`Loaded ${totalBookings} bookings`);
    } catch (err) {
      console.error("❌ Load error:", err);
      this.showErrorToast("Failed to load schedule: " + err.message);
      this.scheduleData = {};
      this.renderSchedule();
    } finally {
      this.showLoading(false);
    }
  }

  renderSchedule() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) this.renderExcelView();
    else this.renderDesktopView();
  }

  renderRageRoomNotice() {
    const grid = document.getElementById("schedule-grid");
    if (grid) {
      grid.innerHTML = `
        <div class="rage-room-notice">
          <div class="notice-icon"><i class="fas fa-fire-alt"></i></div>
          <h3>Rage Room is phone-only</h3>
          <p>Sessions are booked in 15-minute blocks directly via call or WhatsApp.</p>
          <div class="notice-actions">
            <a class="btn-modern primary" href="tel:+923161439569"><i class="fas fa-phone"></i> Call 0316 143 9569</a>
            <a class="btn-modern secondary" href="https://wa.me/923161439569?text=Hi%21%20I%27d%20like%20to%20book%20the%20Rage%20Room%20%2815-minute%20sessions%29.%20Please%20share%20available%20times%20and%20pricing." target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>
          </div>
          <small class="notice-footnote">Rage Room is excluded from the 30-minute slot grid to keep timings accurate.</small>
        </div>
      `;
    }

    const excel = document.getElementById("schedule-excel");
    if (excel) {
      excel.innerHTML = `
        <div class="rage-room-notice">
          <div class="notice-icon"><i class="fas fa-fire-alt"></i></div>
          <h3>Rage Room is phone-only</h3>
          <p>15-minute sessions are booked directly via call or WhatsApp.</p>
          <div class="notice-actions">
            <a class="btn-modern primary" href="tel:+923161439569"><i class="fas fa-phone"></i> Call 0316 143 9569</a>
            <a class="btn-modern secondary" href="https://wa.me/923161439569?text=Hi%21%20I%27d%20like%20to%20book%20the%20Rage%20Room%20%2815-minute%20sessions%29.%20Please%20share%20available%20times%20and%20pricing." target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>
          </div>
          <small class="notice-footnote">Rage Room is excluded from the 30-minute slot grid to keep timings accurate.</small>
        </div>
      `;
    }
  }

  renderDesktopView() {
    const grid = document.getElementById("schedule-grid");
    if (!grid) {
      console.error("❌ Missing #schedule-grid");
      return;
    }
    grid.innerHTML = "";
    grid.className = `schedule-grid ${this.currentView}-view`;

    try {
      if (!this.scheduleData || typeof this.scheduleData !== "object")
        this.scheduleData = {};
      if (this.currentView === "week") this.renderWeekView(grid);
      else this.renderDayView(grid);
      console.log("✅ Desktop view rendered");
    } catch (error) {
      console.error("❌ Desktop render error:", error);
      grid.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #666;">
          <h4>Error rendering schedule</h4>
          <p>Please try refreshing the page.</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Refresh Page</button>
        </div>
      `;
    }
  }

  renderExcelView() {
    console.log("📱 Render mobile Excel view");
    try {
      if (!this.scheduleData || typeof this.scheduleData !== "object")
        this.scheduleData = {};
      if (window.matchMedia('(max-width: 768px)').matches) {
        this.renderUnifiedMobile();
      } else {
        this.renderExcelHeaders();
        this.renderExcelTimeColumn();
        this.renderExcelSlots();
        this.setupScrollSync();
      }
      console.log("✅ Excel view rendered");
    } catch (error) {
      console.error("❌ Excel view error:", error);
    }
  }

  // ===== Day / Week grids =====
  renderDayView(grid) {
    const courts = this.getAllCourts();
    const dateStr = localDateKey(this.currentDate);
    const timeSlotCount = this.timeSlots.length;

    grid.style.gridTemplateColumns = `100px repeat(${courts.length}, 1fr)`;
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 50px)`;

    // Headers
    const timeHeader = document.createElement("div");
    timeHeader.className = "time-header";
    timeHeader.textContent = "Time";
    grid.appendChild(timeHeader);

    courts.forEach((court) => {
      const courtHeader = document.createElement("div");
      courtHeader.className = "court-header";
      courtHeader.innerHTML = `
        <div>${court.sport.toUpperCase()}</div>
        <div style="font-size: 0.8rem; opacity: 0.9;">${court.name}</div>
      `;
      grid.appendChild(courtHeader);
    });

    // Rows
    let nextDayHeaderAdded = false;
    this.timeSlots.forEach((time, timeIndex) => {
      // Insert a "Next Day" header once when moving into 00:00..05:30
      if (this.isNextDaySlot(time) && !nextDayHeaderAdded) {
        const sep = document.createElement("div");
        sep.className = "time-header day-separator";
        const next = new Date(this.currentDate);
        next.setDate(this.currentDate.getDate() + 1);
        const nextStr = localDateKey(next);
        sep.innerHTML = `Next Day - ${this.formatDate(nextStr)}`;
        grid.appendChild(sep);
        nextDayHeaderAdded = true;
      }

      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      courts.forEach((court) => {
        const slot = this.createTimeSlot(dateStr, time, court.id, timeIndex);
        grid.appendChild(slot);
      });

    });
  }

  renderWeekView(grid) {
    const startDate = this.getWeekStartDate(this.currentDate);
    const days = ["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const timeSlotCount = this.timeSlots.length;

    grid.style.gridTemplateColumns = "80px repeat(7, 1fr)";
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 40px)`;

    // Headers
    days.forEach((day, idx) => {
      const header = document.createElement("div");
      if (idx === 0) {
        header.className = "time-header";
        header.textContent = day;
      } else {
        header.className = "day-header";
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (idx - 1));
        header.innerHTML = `
          <div>${day}</div>
          <div style="font-size: 0.8rem; opacity: 0.9;">
            ${date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        `;
      }
      grid.appendChild(header);
    });

    // Rows
    this.timeSlots.forEach((time, timeIndex) => {
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = localDateKey(slotDate);
        const slot = this.createTimeSlot(
          dateStr,
          time,
          "all-courts",
          timeIndex
        );
        grid.appendChild(slot);
      }
    });
  }

  // ===== Slot creation / grouping =====
  groupConsecutiveBookings(scheduleData, date, courtId) {
    try {
      if (!scheduleData[date] || !scheduleData[date][courtId]) return {};
      const courtBookings = scheduleData[date][courtId];
      const grouped = {};
      const byId = {};

      Object.keys(courtBookings).forEach((time) => {
        const b = courtBookings[time];
        if (b.status === "blocked" || b.isBlocked) return; // do not group blocks
        const id = b.bookingId;
        if (!byId[id]) byId[id] = [];
        byId[id].push({ time, ...b });
      });

      Object.keys(byId).forEach((bookingId) => {
        const slots = byId[bookingId];

        // Sort by visual workday order (14:00..23:30, then 00:00..05:30)
        slots.sort((a, b) => this.timeSlots.indexOf(a.time) - this.timeSlots.indexOf(b.time));

        if (slots.length > 1) {
          const first = slots[0];
          grouped[first.time] = {
            ...first,
            isGroupStart: true,
            groupSize: slots.length,
            mergedBooking: true,
          };
          for (let i = 1; i < slots.length; i++) {
            grouped[slots[i].time] = {
              ...slots[i],
              isGroupContinuation: true,
              groupStartTime: first.time,
              mergedBooking: true,
            };
          }
        } else {
          grouped[slots[0].time] = {
            ...slots[0],
            isGroupStart: true,
            groupSize: 1,
            mergedBooking: false,
          };
        }
      });

      return grouped;
    } catch (e) {
      console.error("❌ groupConsecutiveBookings error:", e);
      return {};
    }
  }

  createTimeSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement("div");
    slot.className = "time-slot available";
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;

    try {
      const grouped = this.groupConsecutiveBookings(
        this.scheduleData,
        date,
        courtId
      );
      const slotData = grouped[time] || this.getSlotData(date, time, courtId);

      // Blocked slot
      if (slotData && (slotData.status === "blocked" || slotData.isBlocked)) {
        slot.className = "time-slot blocked";
        slot.innerHTML = `
          <div class="slot-content">
            <div class="slot-title">Blocked</div>
            <div class="slot-subtitle">${
              slotData.blockReason || slotData.subtitle || "Unavailable"
            }</div>
          </div>
        `;
        slot.style.backgroundColor = "#6c757d";
        // slot.style.color = "white";
        slot.style.border = "2px solid #6c757d";
        slot.addEventListener("click", () =>
          this.openSlotModal(slot, slotData)
        );
        return slot;
      }

      if (slotData && slotData.mergedBooking) {
        if (slotData.isGroupContinuation) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `time-slot ${statusClass} group-continuation`;
          slot.innerHTML = `<div class="slot-content continuation-marker"></div>`;
          slot.style.backgroundColor = "transparent";
          slot.style.border = "none";
          const statusColors = {
            "booked-pending": "#ffc107",
            "booked-confirmed": "#28a745",
            "booked-conflict": "#dc3545",
            "booked-cancelled": "#6c757d",
            blocked: "#6c757d",
          };
          const statusColor = statusColors[statusClass] || "#007bff";
          slot.style.borderLeft = `8px solid ${statusColor}`;
          slot.style.borderRight = `8px solid ${statusColor}`;
          slot.addEventListener("click", () => {
            const startSlot = document.querySelector(
              `[data-time="${slotData.groupStartTime}"][data-court="${courtId}"]`
            );
            if (startSlot) startSlot.click();
          });
        } else if (slotData.isGroupStart) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `time-slot ${statusClass} group-start`;
          const duration = slotData.groupSize * 0.5;

          const hasCustomerComments =
            (slotData.customerComments || slotData.special_requests) &&
            (slotData.customerComments || slotData.special_requests).trim() !==
              "";
          const hasAdminComments =
            slotData.adminComments && slotData.adminComments.trim() !== "";

          let commentIcons = "";
          if (hasCustomerComments) {
            commentIcons +=
              '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests"></i>';
          }
          if (hasAdminComments) {
            commentIcons +=
              '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available"></i>';
          }

          slot.innerHTML = `
            <div class="slot-content merged-booking">
              ${commentIcons}
              <div class="slot-title">${slotData.title || "Booked"}</div>
              <div class="slot-subtitle">PKR ${(
                slotData.amount || 0
              ).toLocaleString()}</div>
              <div class="slot-time">${duration}h</div>
            </div>
          `;

          const statusColors = {
            "booked-pending": "#ffc107",
            "booked-confirmed": "#28a745",
            "booked-conflict": "#dc3545",
            "booked-cancelled": "#6c757d",
          };
          const statusColor = statusColors[statusClass] || "#007bff";
          slot.style.backgroundColor = statusColor;
          slot.style.color = "white";
          // keep left/right emphasis only, avoid stealing vertical space
          slot.style.borderLeft = `3px solid ${statusColor}`;
          slot.style.borderRight = `3px solid ${statusColor}`;
          // let the normal 1px top/bottom from CSS remain
          slot.style.borderTop = "";
          slot.style.borderBottom = "";
          slot.style.borderRadius = "8px 8px 0 0";

          slot.style.fontWeight = "600";
          slot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        }
      } else if (slotData) {
        const statusClass = slotData.status || "booked-pending";
        slot.className = `time-slot ${statusClass}`;

        const hasCustomerComments =
          (slotData.customerComments || slotData.special_requests) &&
          (slotData.customerComments || slotData.special_requests).trim() !==
            "";
        const hasAdminComments =
          slotData.adminComments && slotData.adminComments.trim() !== "";

        let commentIcons = "";
        if (hasCustomerComments) {
          commentIcons +=
            '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests"></i>';
        }
        if (hasAdminComments) {
          commentIcons +=
            '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available"></i>';
        }

        slot.innerHTML = `
          <div class="slot-content">
            ${commentIcons}
            <div class="slot-title">${slotData.title || "Booked"}</div>
            <div class="slot-subtitle">PKR ${(
              slotData.amount || 0
            ).toLocaleString()}</div>
          </div>
        `;
        const statusColors = {
          "booked-pending": "#ffc107",
          "booked-confirmed": "#28a745",
          "booked-conflict": "#dc3545",
        };
        const statusColor = statusColors[statusClass] || "#007bff";
        slot.style.backgroundColor = statusColor;
        slot.style.color = "white";
        slot.style.border = `2px solid ${statusColor}`;
      } else {
        slot.innerHTML = `
          <div class="slot-content">
            <div class="slot-title">Available</div>
            <div class="slot-time">${this.formatTime(time)}</div>
          </div>
        `;
        slot.style.backgroundColor = "#f8f9fa";
        slot.style.border = "1px solid #dee2e6";
      }

      // Click handling
      slot.addEventListener("click", () => {
        const slotDataForClick =
          grouped[time] || this.getSlotData(date, time, courtId);
        if (
          this.bookingMode &&
          (!slotDataForClick || slotDataForClick.status === "available")
        ) {
          this.handleSlotSelection(slot, {
            date,
            time,
            courtId,
            slotData: slotDataForClick || null,
          });
        } else {
          this.openSlotModal(slot, slotDataForClick || null);
        }
      });
    } catch (error) {
      console.error(`❌ createTimeSlot error for ${courtId} @ ${time}:`, error);
      slot.innerHTML = `<div class="slot-content"><div class="slot-title" style="color: red;">Error</div></div>`;
      slot.style.backgroundColor = "#f8d7da";
    }

    return slot;
  }

  getSlotData(date, time, courtId) {
    try {
      if (!this.scheduleData || !this.scheduleData[date]) return null;

      if (courtId === "all-courts") {
        const all = this.getAllCourts();
        for (const court of all) {
          const courtBooking = this.getSlotDataForSpecificCourt(
            date,
            time,
            court.id
          );
          if (courtBooking) {
            return {
              ...courtBooking,
              title: `${courtBooking.title} (${court.sport.toUpperCase()})`,
              subtitle: `${courtBooking.subtitle || ""} - ${court.name}`.trim(),
            };
          }
        }
        return null;
      }

      return this.getSlotDataForSpecificCourt(date, time, courtId);
    } catch (e) {
      console.error("❌ getSlotData error:", e);
      return null;
    }
  }

  getSlotDataForSpecificCourt(date, time, courtId) {
    try {
      if (this.scheduleData[date]?.[courtId]?.[time]) {
        return this.scheduleData[date][courtId][time];
      }

      // Multi-purpose conflicts
      if (courtId in this.multiPurposeCourts) {
        const type = this.multiPurposeCourts[courtId];
        const conflicts = Object.keys(this.multiPurposeCourts).filter(
          (other) =>
            this.multiPurposeCourts[other] === type && other !== courtId
        );
        for (const conflictCourt of conflicts) {
          if (this.scheduleData[date]?.[conflictCourt]?.[time]) {
            const conflictData = this.scheduleData[date][conflictCourt][time];
            return {
              ...conflictData,
              title: `${conflictData.title} (${
                conflictCourt.includes("cricket") ? "Cricket" : "Futsal"
              })`,
              subtitle: `${
                conflictData.subtitle || ""
              } - Multi Court Booked`.trim(),
              status: "booked-conflict",
            };
          }
        }
      }
      return null;
    } catch (e) {
      console.error(`❌ getSlotDataForSpecificCourt error for ${courtId}:`, e);
      return null;
    }
  }

  getAllCourts() {
    const sportFilter = document.getElementById("sport-filter")?.value;
    let courts = [];
    if (sportFilter && this.courtConfig[sportFilter]) {
      courts = this.courtConfig[sportFilter].map((c) => ({
        ...c,
        sport: sportFilter,
      }));
    } else {
      const order = ["padel", "cricket", "futsal", "pickleball"];
      order.forEach((sport) => {
        if (this.courtConfig[sport]) {
          this.courtConfig[sport].forEach((court) =>
            courts.push({ ...court, sport })
          );
        }
      });
    }
    return courts;
  }

  // ===== Modals =====
  openSlotModal(slotElement, slotData) {
    try {
      this.selectedSlot = {
        element: slotElement,
        date: slotElement.dataset.date,
        time: slotElement.dataset.time,
        court: slotElement.dataset.court,
        courtId: slotElement.dataset.court,
        data: slotData,
      };

      const modal = document.getElementById("slot-modal");
      const overlay = document.getElementById("slot-modal-overlay");

      if (modal && overlay) {
        this.updateSlotModalContent(slotData);
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
        modal.style.animation = "slideInUp 0.3s ease";
      }
    } catch (error) {
      console.error("❌ openSlotModal error:", error);
    }
  }

  updateSlotModalContent(slotData) {
    try {
      if (!this.selectedSlot) return;

      const isAvailable = !slotData;
      const isBlocked = slotData && slotData.status === "blocked";
      const isBooked =
        slotData &&
        (slotData.status === "booked-pending" ||
          slotData.status === "booked-confirmed" ||
          slotData.status === "booked-conflict");

      // Basic info
      this.setElementText(
        "modal-court",
        this.getCourtName(this.selectedSlot.court)
      );
      {
        const baseDate = this.selectedSlot.date;
        const timeStr = this.selectedSlot.time;
        // Show next calendar day for 00:00..05:30 slots
        let displayDate = baseDate;
        if (this.isNextDaySlot(timeStr)) {
          const d = parseLocalDate(baseDate);
          d.setDate(d.getDate() + 1);
          displayDate = localDateKey(d);
        }
        this.setElementText(
          "modal-datetime",
          `${this.formatDate(displayDate)} at ${this.formatTime(timeStr)}`
        );
      }

      // Status
      const statusEl = document.getElementById("modal-status");
      if (statusEl) {
        if (isAvailable) {
          statusEl.textContent = "Available";
          statusEl.className = "status-badge available";
        } else {
          statusEl.textContent = this.getStatusText(slotData.status);
          statusEl.className = `status-badge ${slotData.status}`;
        }
      }

      // Sections
      this.setElementDisplay(
        "available-actions",
        isAvailable ? "block" : "none"
      );
      this.setElementDisplay("booking-details", isBooked ? "block" : "none");
      this.setElementDisplay("blocked-actions", isBlocked ? "block" : "none");

      if (isBooked) this.updateBookingDetails(slotData);
      else if (isBlocked) this.updateBlockedDetails(slotData);
    } catch (e) {
      console.error("❌ updateSlotModalContent error:", e);
    }
  }

  updateBlockedDetails(slotData) {
    try {
      this.setElementText(
        "modal-block-reason",
        slotData.blockReason || slotData.subtitle || "—"
      );
    } catch (e) {
      console.error("❌ updateBlockedDetails error:", e);
    }
  }

  updateBookingDetails(slotData) {
    try {
      this.setElementText("modal-booking-id", slotData.bookingId || "N/A");
      this.setElementText(
        "modal-player",
        slotData.playerName || slotData.title || "N/A"
      );
      this.setElementText("modal-phone", slotData.playerPhone || "N/A");
      this.setElementText(
        "modal-amount",
        `PKR ${(slotData.amount || 0).toLocaleString()}`
      );

      // Promo
      const promoGroup = document.getElementById("modal-promo-group");
      if (promoGroup) {
        if (slotData.promoCode) {
          promoGroup.style.display = "block";
          this.setElementText("modal-promo-code", `🎟️ ${slotData.promoCode}`);
          const info =
            slotData.discountAmount > 0
              ? `Discount: PKR ${slotData.discountAmount.toLocaleString()}${
                  slotData.originalAmount > 0
                    ? ` (Original: PKR ${slotData.originalAmount.toLocaleString()})`
                    : ""
                }`
              : "";
          this.setElementText("modal-discount-info", info);
        } else {
          promoGroup.style.display = "none";
        }
      }

      this.setElementText(
        "modal-duration",
        `${slotData.duration || 1} hour(s)`
      );

      // Comments
      const custSec = document.getElementById("customer-comments-section");
      const custDisp = document.getElementById("customer-comments-display");
      if (slotData.customerComments) {
        custSec.style.display = "block";
        custDisp.textContent = slotData.customerComments;
      } else {
        custSec.style.display = "none";
      }

      const adminEl = document.getElementById("admin-comments");
      if (adminEl) adminEl.value = slotData.adminComments || "";

      const isPending = slotData.status === "booked-pending";
      const isConfirmed = slotData.status === "booked-confirmed";

      this.setElementDisplay(
        "confirm-booking-btn",
        isPending ? "inline-block" : "none"
      );
      this.setElementDisplay(
        "decline-booking-btn",
        isPending ? "inline-block" : "none"
      );
      this.setElementDisplay(
        "cancel-booking-btn",
        isConfirmed ? "inline-block" : "none"
      );
      this.setElementDisplay("edit-booking-btn", "inline-block");
    } catch (e) {
      console.error("❌ updateBookingDetails error:", e);
    }
  }

  async confirmBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId)
      return this.showErrorToast("No booking selected");
    try {
      if (!confirm("Confirm this booking?")) return;
      this.showLoadingToast("Confirming booking...");
      const res = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "confirm",
        }),
      });
      const result = await res.json();
      if (!result.success)
        throw new Error(result.message || "Failed to confirm booking");
      this.showSuccessToast("Booking confirmed");
      this.closeSlotModal();
      this.loadScheduleData();
    } catch (e) {
      console.error("❌ confirmBooking error:", e);
      this.showErrorToast("Failed to confirm booking: " + e.message);
    }
  }

  async declineBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId)
      return this.showErrorToast("No booking selected");
    try {
      if (!confirm("Decline this booking?")) return;
      this.showLoadingToast("Declining booking...");
      const res = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "decline",
        }),
      });
      const result = await res.json();
      if (!result.success)
        throw new Error(result.message || "Failed to decline booking");
      this.showSuccessToast("Booking declined");
      this.closeSlotModal();
      this.loadScheduleData();
    } catch (e) {
      console.error("❌ declineBooking error:", e);
      this.showErrorToast("Failed to decline booking: " + e.message);
    }
  }

  async cancelBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId)
      return this.showErrorToast("No booking selected");
    try {
      if (!confirm("Cancel this booking?")) return;
      this.showLoadingToast("Cancelling booking...");
      const res = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "cancel",
        }),
      });
      const result = await res.json();
      if (!result.success)
        throw new Error(result.message || "Failed to cancel booking");
      this.showSuccessToast("Booking cancelled");
      this.closeSlotModal();
      this.loadScheduleData();
    } catch (e) {
      console.error("❌ cancelBooking error:", e);
      this.showErrorToast("Failed to cancel booking: " + e.message);
    }
  }

  // Open inline edit modal on schedule page instead of redirecting
  editBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId)
      return this.showErrorToast("No booking selected");
    try {
      const overlay = document.getElementById('schedule-edit-modal-overlay');
      const form = document.getElementById('sched-edit-booking-form');
      if (!overlay || !form) return this.showErrorToast('Edit modal not available');

      // Populate fields
      const data = this.selectedSlot.data || {};
      document.getElementById('sched-edit-booking-id').value = data.bookingId;
      document.getElementById('sched-edit-player-name').value = data.playerName || '';
      document.getElementById('sched-edit-player-phone').value = data.playerPhone || '';
      document.getElementById('sched-edit-player-email').value = data.playerEmail || '';
      document.getElementById('sched-edit-player-count').value = (data.playerCount || '2');
      // Map schedule status -> DB status
      const statusMap = { 'booked-pending': 'pending_payment', 'booked-confirmed': 'confirmed', 'booked-cancelled': 'cancelled' };
      const dbStatus = statusMap[data.status] || 'pending_payment';
      document.getElementById('sched-edit-status').value = dbStatus;
      document.getElementById('sched-edit-total-amount').value = (data.amount != null ? data.amount : '');
      document.getElementById('sched-edit-admin-comments').value = data.adminComments || '';

      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    } catch (e) {
      console.error('❌ editBookingFromModal error:', e);
      this.showErrorToast('Failed to open edit modal');
    }
  }

  async saveSlotComment() {
    if (!this.selectedSlot?.data?.bookingId)
      return this.showErrorToast("No booking selected");
    try {
      const adminComment =
        document.getElementById("admin-comments")?.value || "";
      this.showLoadingToast("Saving admin comment...");
      const res = await fetch("/admin/api/update-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          adminComments: adminComment,
        }),
      });
      const result = await res.json();
      if (!result.success)
        throw new Error(result.message || "Failed to save comment");

      if (this.selectedSlot.data)
        this.selectedSlot.data.adminComments = adminComment;
      this.showSuccessToast("Admin comment saved");
      await this.loadScheduleData();
      this.closeSlotModal();
    } catch (e) {
      console.error("❌ saveSlotComment error:", e);
      this.showErrorToast("Failed to save comment: " + e.message);
    }
  }

  async blockSlotFromModal() {
    if (!this.selectedSlot) return this.showErrorToast("No slot selected");

    try {
      const reason = prompt(
        "Enter reason for blocking this slot:",
        "Maintenance"
      );
      if (!reason || reason.trim() === "") return;

      this.showLoadingToast("Blocking slot...");
      const { date, time, courtId } = this.selectedSlot;

      const res = await fetch("/api/block-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: courtId,
          date,
          time_slot: time,
          reason: reason.trim(),
        }),
      });
      const result = await res.json();

      if (result.success) {
        if (!this.scheduleData[date]) this.scheduleData[date] = {};
        if (!this.scheduleData[date][courtId])
          this.scheduleData[date][courtId] = {};
        this.scheduleData[date][courtId][time] = {
          status: "blocked",
          title: "Blocked",
          subtitle: reason.trim(),
          blockReason: reason.trim(),
          time,
          date,
          court: courtId,
          isBlocked: true,
        };
        this.showSuccessToast("Slot blocked");
        this.closeSlotModal();
        this.renderSchedule();
      } else {
        this.showErrorToast(result.message || "Failed to block slot");
      }
    } catch (e) {
      console.error("❌ blockSlot error:", e);
      this.showErrorToast("Failed to block slot: " + e.message);
    }
  }

  async unblockSlotFromModal() {
    if (!this.selectedSlot) return this.showErrorToast("No slot selected");

    try {
      if (!confirm("Unblock this slot?")) return;
      this.showLoadingToast("Unblocking slot...");

      const { date, time, courtId } = this.selectedSlot;
      const res = await fetch("/api/unblock-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ court: courtId, date, time_slot: time }),
      });
      const result = await res.json();

      if (result.success) {
        if (this.scheduleData[date]?.[courtId]?.[time]) {
          delete this.scheduleData[date][courtId][time];
          if (Object.keys(this.scheduleData[date][courtId]).length === 0)
            delete this.scheduleData[date][courtId];
          if (Object.keys(this.scheduleData[date]).length === 0)
            delete this.scheduleData[date];
        }
        this.showSuccessToast("Slot unblocked");
        this.closeSlotModal();
        this.renderSchedule();
      } else {
        this.showErrorToast(result.message || "Failed to unblock slot");
      }
    } catch (e) {
      console.error("❌ unblockSlot error:", e);
      this.showErrorToast("Failed to unblock slot: " + e.message);
    }
  }

  closeSlotModal() {
    try {
      const overlay = document.getElementById("slot-modal-overlay");
      const modal = document.getElementById("slot-modal");
      if (modal && overlay) {
        modal.style.animation = "slideOutDown 0.3s ease";
        setTimeout(() => {
          overlay.classList.add("hidden");
          overlay.style.display = "none";
          this.selectedSlot = null;
          const commentsEl = document.getElementById("slot-comments");
          if (commentsEl) commentsEl.value = "";
        }, 300);
      }
    } catch (e) {
      console.error("❌ closeSlotModal error:", e);
    }
  }

  handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) this.closeSlotModal();
  }

  // ===== Inline Edit (Schedule) =====
  setupEditModalListeners() {
    this.addEventListener('sched-close-edit-modal', 'click', () => this.closeScheduleEditModal());
    this.addEventListener('sched-cancel-edit', 'click', () => this.closeScheduleEditModal());
    const form = document.getElementById('sched-edit-booking-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleScheduleEditSubmit(e));
    }
  }

  closeScheduleEditModal() {
    const overlay = document.getElementById('schedule-edit-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
    }
  }

  async handleScheduleEditSubmit(e) {
    e.preventDefault();
    try {
      const bookingId = document.getElementById('sched-edit-booking-id').value;
      if (!bookingId) return this.showErrorToast('Missing booking ID');

      const payload = {
        bookingId,
        playerName: document.getElementById('sched-edit-player-name').value.trim(),
        playerPhone: document.getElementById('sched-edit-player-phone').value.trim(),
        playerEmail: document.getElementById('sched-edit-player-email').value.trim(),
        playerCount: document.getElementById('sched-edit-player-count').value,
        status: document.getElementById('sched-edit-status').value,
        totalAmount: parseInt(document.getElementById('sched-edit-total-amount').value || '0', 10),
        adminComments: document.getElementById('sched-edit-admin-comments').value.trim(),
      };

      if (!payload.playerName || !payload.playerPhone) {
        return this.showErrorToast('Player name and phone are required');
      }

      this.showLoadingToast('Updating booking...');
      const res = await fetch('/admin/api/update-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to update booking');

      this.showSuccessToast('Booking updated successfully');
      this.closeScheduleEditModal();
      this.closeSlotModal();
      await this.loadScheduleData();
    } catch (err) {
      console.error('❌ handleScheduleEditSubmit error:', err);
      this.showErrorToast('Failed to update booking: ' + err.message);
    }
  }

  // ===== QUICK BOOKING =====
  openQuickBookModal() {
    try {
      const hasSelection =
        this.selectedSlot ||
        (this.startSlot && this.endSlot && this.selectedSlots.length > 0);
      if (!hasSelection)
        return this.showErrorToast("No slot selected for booking");

      const modal = document.getElementById("quick-book-modal-overlay");
      if (!modal) return this.showErrorToast("Quick book modal not found");

      this.setupQuickBookForm();
      modal.classList.remove("hidden");
      modal.style.display = "flex";

      const firstInput = document.getElementById("quick-player-name");
      if (firstInput) setTimeout(() => firstInput.focus(), 300);

      this.closeSlotModal();
    } catch (e) {
      console.error("❌ openQuickBookModal error:", e);
      this.showErrorToast("Failed to open booking form");
    }
  }

  setupQuickBookForm() {
    try {
      const form = document.getElementById("quick-book-form");
      if (form) form.reset();

      const isNewSelection =
        this.startSlot && this.endSlot && this.selectedSlots.length > 0;

      const durationSelect = document.getElementById("quick-duration");
      const durationFormGroup = durationSelect?.closest(".form-group");

      if (isNewSelection) {
        if (durationFormGroup) durationFormGroup.style.display = "none";
        const timeDisplayGroup = document.getElementById(
          "selected-time-display"
        );
        const timeRangeText = document.getElementById("time-range-text");
        if (timeDisplayGroup && timeRangeText) {
          timeDisplayGroup.style.display = "block";
          const duration = this.selectedSlots.length * 0.5;
          timeRangeText.innerHTML = `${this.formatTime(
            this.startSlot.time
          )} - ${this.formatTime(this.endSlot.time)} (${duration} hours)`;
        }
      } else if (durationSelect && this.selectedSlot?.court) {
        if (durationFormGroup) durationFormGroup.style.display = "block";
        const timeDisplayGroup = document.getElementById(
          "selected-time-display"
        );
        if (timeDisplayGroup) timeDisplayGroup.style.display = "none";
        const courtSport = this.getCourtSport(this.selectedSlot.court);
        const defaultDurations = {
          padel: "1.5",
          cricket: "2",
          futsal: "1",
          pickleball: "1",
        };
        durationSelect.value = defaultDurations[courtSport] || "1";
      }

      let currentCourt,
        courtSport,
        courtName,
        dateStr,
        startTimeStr,
        endTimeStr;

      if (isNewSelection) {
        currentCourt = this.startSlot.courtId;
        courtSport = this.getCourtSport(currentCourt);
        courtName = this.getCourtName(currentCourt);
        dateStr = this.formatDate(this.startSlot.date);
        startTimeStr = this.formatTime(this.startSlot.time);
        endTimeStr = this.formatTime(this.endSlot.time);
      } else if (this.selectedSlot) {
        currentCourt = this.selectedSlot.court;
        courtSport = this.getCourtSport(currentCourt);
        courtName = this.getCourtName(currentCourt);
        dateStr = this.formatDate(this.selectedSlot.date);
        startTimeStr = this.formatTime(this.selectedSlot.time);
      }

      const playerCountSelect = document.getElementById("quick-player-count");
      if (playerCountSelect && courtSport) {
        const defaultPlayers = {
          padel: "4",
          cricket: "6",
          futsal: "5",
          pickleball: "2",
        };
        playerCountSelect.value = defaultPlayers[courtSport] || "2";
      }

      const modalTitle = document.querySelector(
        "#quick-book-modal .modal-header h3"
      );
      if (modalTitle && courtName && dateStr && startTimeStr) {
        if (isNewSelection && endTimeStr) {
          modalTitle.innerHTML = `
            Quick Book Slots<br>
            <small style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">
              ${courtName}<br>
              ${startTimeStr} - ${endTimeStr} on ${dateStr}
            </small>
          `;
        } else {
          modalTitle.innerHTML = `
            Quick Book Slot<br>
            <small style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">
              ${courtName} - ${startTimeStr} on ${dateStr}
            </small>
          `;
        }
      }
      console.log("✅ Quick book form ready");
    } catch (error) {
      console.error("❌ setupQuickBookForm error:", error);
    }
  }

  getCourtSport(courtId) {
    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return sport;
    }
    return "unknown";
  }

  async handleQuickBook(event) {
    event.preventDefault();
    if (this.isSubmittingBooking) return;

    try {
      this.isSubmittingBooking = true;

      const hasValidSelection =
        this.selectedSlot ||
        (this.startSlot && this.endSlot && this.selectedSlots.length > 0);
      if (!hasValidSelection) {
        this.showErrorToast("No slot selected for booking");
        return;
      }

      const formData = await this.collectQuickBookFormData();
      const validationError = this.validateQuickBookData(formData);
      if (validationError) {
        this.showErrorToast(validationError);
        return;
      }

      this.showLoadingToast("Creating booking...");
      this.setQuickBookFormDisabled(true);

      const response = await fetch("/admin/api/admin-create-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const result = await response.json();
      if (result.success) {
        this.showSuccessToast(`Booking created! ID: ${result.bookingId}`);
        this.closeQuickBookModal();
        this.clearBookingSelectionState();
        setTimeout(() => this.loadScheduleData(), 400);
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("❌ Quick book error:", error);
      this.showErrorToast("Failed to create booking: " + error.message);
    } finally {
      this.setQuickBookFormDisabled(false);
      this.isSubmittingBooking = false;
    }
  }

  async collectQuickBookFormData() {
    const playerName =
      document.getElementById("quick-player-name")?.value?.trim() || "";
    const playerPhone =
      document.getElementById("quick-player-phone")?.value?.trim() || "";
    const playerEmail =
      document.getElementById("quick-player-email")?.value?.trim() || "";
    const playerCount =
      document.getElementById("quick-player-count")?.value || "2";
    const paymentStatus =
      document.getElementById("quick-payment-status")?.value || "confirmed";
    const specialRequests =
      document.getElementById("quick-comments")?.value?.trim() || "";

    const isNewSelection =
      this.startSlot && this.endSlot && this.selectedSlots.length > 0;

    let startTime,
      endTime,
      duration,
      courtSport,
      courtName,
      courtId,
      bookingDate;

    if (isNewSelection) {
      startTime = this.startSlot.time;
      endTime = this.endSlot.time;
      duration = this.selectedSlots.length * 0.5;
      courtId = this.startSlot.courtId;
      courtSport = this.getCourtSport(courtId);
      courtName = this.getCourtName(courtId);
      bookingDate = this.startSlot.date;
    } else {
      const durationInput = parseFloat(
        document.getElementById("quick-duration")?.value || 1
      );
      startTime = this.selectedSlot.time;
      endTime = this.calculateEndTime(startTime, durationInput);
      duration = durationInput;
      courtId = this.selectedSlot.court;
      courtSport = this.getCourtSport(courtId);
      courtName = this.getCourtName(courtId);
      bookingDate = this.selectedSlot.date;
    }

    // Determine actual end date (only if end < start → crosses midnight to next day)
    const actualStartDate = bookingDate;
    const actualEndDate = isTimeBefore(endTime, startTime)
      ? addDays(bookingDate, 1)
      : bookingDate;
    const isCrossMidnight = isTimeBefore(endTime, startTime);

    const totalAmount = await this.calculateBookingAmount(
      courtSport,
      courtId,
      bookingDate,
      startTime,
      duration
    );

    return {
      sport: courtSport,
      court: courtId,
      courtName: courtName,
      date: bookingDate,
      startTime: startTime,
      endTime: endTime,
      duration: duration,

      playerName: playerName,
      playerPhone: playerPhone,
      playerEmail: playerEmail,
      playerCount: playerCount,
      specialRequests: specialRequests,

      paymentType: "advance",
      totalAmount: totalAmount,
      status: paymentStatus,

      // Midnight info
      isCrossMidnight,
      actualStartDate,
      actualEndDate,

      selectedSlots: isNewSelection
        ? this.selectedSlots
        : this.generateSelectedSlots(startTime, duration),
    };
  }

  validateQuickBookData(data) {
    if (!data.playerName) return "Player name is required";
    if (data.playerName.length < 2)
      return "Player name must be at least 2 characters long";
    if (!data.playerPhone) return "Phone number is required";
    if (data.playerPhone.length < 10)
      return "Please enter a valid phone number";
    if (!data.duration || data.duration <= 0)
      return "Duration must be greater than 0";
    if (data.duration > 6) return "Maximum duration is 6 hours";
    if (!data.court || !data.date || !data.startTime)
      return "Slot information is missing";
    return null;
  }

  calculateEndTime(startTime, durationHours) {
    try {
      const [h, m] = startTime.split(":").map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + Math.round(durationHours * 60);
      const endH = Math.floor((endMin / 60) % 24);
      const endM = endMin % 60;
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(
        2,
        "0"
      )}`;
    } catch (e) {
      console.error("❌ Error calculating end time:", e);
      return startTime;
    }
  }

  // Dynamic pricing – falls back to per-sport hourly rate if API fails
  async calculateBookingAmount(sport, courtId, date, startTime, duration) {
    try {
      const selectedSlots = this.generateSlotsForDuration(startTime, duration);

      const res = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: courtId,
          booking_date: date,
          selected_slots: selectedSlots,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data?.success && typeof data.total_price === "number") {
        return data.total_price;
      }
      throw new Error(data?.message || "Pricing API returned error");
    } catch (err) {
      console.warn(
        "⚠️ Pricing API failed, using fallback:",
        err?.message || err
      );
      const fallbackHourly = {
        padel: 5500,
        cricket: 3000,
        futsal: 2500,
        pickleball: 2500,
      };
      const rate = fallbackHourly[sport] ?? 2500;
      return Math.round(rate * duration);
    }
  }

  // Build 30-min slots from startTime for duration (hours)
  generateSlotsForDuration(startTime, durationHours) {
    const out = [];
    try {
      const [h0, m0] = startTime.split(":").map(Number);
      const count = Math.ceil(durationHours * 2); // 30-min
      let h = h0,
        m = m0;

      for (let i = 0; i < count; i++) {
        out.push({
          time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          index: i,
        });
        m += 30;
        if (m >= 60) {
          m -= 60;
          h = (h + 1) % 24;
        }
      }
    } catch (e) {
      console.error("❌ generateSlotsForDuration error:", e);
      out.push({ time: startTime, index: 0 });
    }
    return out;
  }

  // Build selectedSlots array compatible with backend
  generateSelectedSlots(startTime, durationHours) {
    try {
      const [h0, m0] = startTime.split(":").map(Number);
      const total = Math.ceil(durationHours * 2);
      const slots = [];
      for (let i = 0; i < total; i++) {
        const mins = h0 * 60 + m0 + i * 30;
        const hh = Math.floor((mins / 60) % 24);
        const mm = mins % 60;
        slots.push({
          time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
          index: i,
        });
      }
      return slots;
    } catch (e) {
      console.error("❌ generateSelectedSlots error:", e);
      return [{ time: startTime, index: 0 }];
    }
  }

  setQuickBookFormDisabled(disabled) {
    const form = document.getElementById("quick-book-form");
    if (!form) return;
    form
      .querySelectorAll("input,select,textarea,button")
      .forEach((el) => (el.disabled = disabled));
    const submit = form.querySelector('button[type="submit"]');
    if (submit)
      submit.innerHTML = disabled
        ? '<i class="fas fa-spinner fa-spin"></i> Creating...'
        : "Create Booking";
  }

  closeQuickBookModal() {
    try {
      const overlay = document.getElementById("quick-book-modal-overlay");
      const modal = document.getElementById("quick-book-modal");
      if (!overlay) return;

      if (modal) modal.style.animation = "slideOutDown 0.25s ease";
      setTimeout(() => {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
        const form = document.getElementById("quick-book-form");
        if (form) {
          form.reset();
          this.setQuickBookFormDisabled(false);
        }
        const title = document.querySelector(
          "#quick-book-modal .modal-header h3"
        );
        if (title) title.textContent = "Quick Book Slot";
      }, 250);
    } catch (e) {
      console.error("❌ closeQuickBookModal error:", e);
    }
  }

  handleQuickBookOverlayClick(e) {
    if (e.target === e.currentTarget) this.closeQuickBookModal();
  }

  showQuickBookError(message) {
    const overlay = document.getElementById("quick-book-modal-overlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      const body = document.querySelector("#quick-book-modal .modal-body");
      if (!body) return this.showErrorToast(message);
      const old = document.getElementById("quick-book-error");
      if (old) old.remove();
      const div = document.createElement("div");
      div.id = "quick-book-error";
      div.style.cssText = `
        background:#f8d7da;color:#721c24;padding:.75rem;border-radius:6px;margin-bottom:1rem;
        border-left:4px solid #dc3545;font-size:.9rem;
      `;
      div.innerHTML = `<strong><i class="fas fa-exclamation-triangle"></i> Error:</strong> ${message}`;
      body.prepend(div);
      setTimeout(() => div.remove(), 5000);
    } else {
      this.showErrorToast(message);
    }
  }

  // =========================
  // BOOKING SELECTION (RANGE)
  // =========================
  setupBookingControls() {
    const createBtn = document.getElementById("create-booking-btn");
    const cancelBtn = document.getElementById("cancel-booking-selection");
    if (createBtn)
      createBtn.addEventListener("click", () => this.startBookingSelection());
    if (cancelBtn)
      cancelBtn.addEventListener("click", () => this.cancelBookingSelection());
  }

  startBookingSelection() {
    this.bookingMode = true;
    this.startSlot = null;
    this.endSlot = null;
    this.selectedSlots = [];
    this.currentCourt = null;
    this.selectionSegment = null;

    const createBtn = document.getElementById("create-booking-btn");
    const instructions = document.getElementById("booking-instructions");
    const msg = document.getElementById("instruction-message");
    if (createBtn) createBtn.style.display = "none";
    if (instructions) instructions.style.display = "flex";
    if (msg) msg.textContent = "Select starting time slot";

    // close any open modals
    ["slot-modal-overlay", "quick-book-modal-overlay"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });

    this.showSuccessToast("Selection mode on. Tap an available slot to start.");
  }

  cancelBookingSelection() {
    this.clearBookingSelectionState();
    this.showSuccessToast("Selection cancelled.");
  }

  handleSlotSelection(slotEl, slotInfo) {
    const { courtId, slotData } = slotInfo;

    // only allow available
    if (slotData && slotData.status && slotData.status !== "available") {
      this.showErrorToast("Only available slots can be selected.");
      this.animateInvalidSlot(slotEl);
      return;
    }

    if (this.currentView === "week" && courtId === "all-courts") {
      this.showErrorToast("Switch to Day view to select a specific court.");
      this.animateInvalidSlot(slotEl);
      return;
    }

    if (!this.startSlot) {
      this.selectStartSlot(slotEl, slotInfo);
    } else if (!this.endSlot) {
      this.selectEndSlot(slotEl, slotInfo);
    } else {
      this.clearSlotSelections();
      this.selectStartSlot(slotEl, slotInfo);
    }
  }

  selectStartSlot(slotEl, { date, time, courtId }) {
    this.startSlot = { element: slotEl, date, time, courtId };
    this.currentCourt = courtId;
    this.selectionSegment = this.getTimeSegment(time);
    slotEl.classList.add("selection-start");
    const msg = document.getElementById("instruction-message");
    if (msg) msg.textContent = "Now select ending time slot";
  }

  selectEndSlot(slotElement, { date, time, courtId }) {
    // Same court & same date
    if (courtId !== this.currentCourt) {
      this.showErrorToast("Please select slots from the same court.");
      this.animateInvalidSlot(slotElement);
      return;
    }
    if (date !== this.startSlot.date) {
      this.showErrorToast("Please select slots from the same date.");
      this.animateInvalidSlot(slotElement);
      return;
    }

    // Enforce same segment (both before 5:30 AM OR both after 2:00 PM)
    const endSegment = this.getTimeSegment(time);
    // Allow crossing midnight (day → night) by normalizing the segment
    if (this.selectionSegment === "day" && endSegment === "night") {
      this.selectionSegment = endSegment;
    }
    if (
      !this.selectionSegment ||
      this.selectionSegment === "gap" ||
      endSegment === "gap" ||
      this.selectionSegment !== endSegment
    ) {
      this.showErrorToast(
        "You can’t select across the closed period (5:30 AM → 2:00 PM). Keep all selected slots either before 5:30 AM or after 2:00 PM."
      );
      this.animateInvalidSlot(slotElement);
      return;
    }

    // Validate consecutive, available slots
    const slotsInBetween = this.getSlotsBetween(this.startSlot.time, time);
    if (!this.validateConsecutiveSlots(slotsInBetween, courtId, date)) {
      this.animateInvalidSlot(slotElement);
      return;
    }

    this.endSlot = { element: slotElement, date, time, courtId };
    this.highlightSelectedSlots();

    const msg = document.getElementById("instruction-message");
    if (msg) msg.textContent = "Slots selected! Opening quick book…";

    setTimeout(() => this.openBookingModalWithSelection(), 600);
    console.log("✅ End slot selected:", {
      date,
      time,
      courtId,
      segment: endSegment,
    });
  }

  getSlotsBetween(startTime, endTime) {
    const arr = this.timeSlots;
    const a = arr.indexOf(startTime);
    const b = arr.indexOf(endTime);
    if (a === -1 || b === -1) return [];
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return arr.slice(lo, hi + 1);
  }

  validateConsecutiveSlots(slots, courtId, date) {
    // Must have at least 2 slots (1 hour minimum)
    if (slots.length < 2) {
      this.showErrorToast("Minimum booking duration is 1 hour (2 slots).");
      return false;
    }

    // Disallow wrap-around selection back to afternoon session
    if (this.startSlot && this.endSlot) {
      const si = this.timeSlots.indexOf(this.startSlot.time);
      const ei = this.timeSlots.indexOf(this.endSlot.time);
      if (si !== -1 && ei !== -1 && ei < si) {
        this.showErrorToast(
          "Invalid range. Please select a continuous range within the work day order (2:00 PM → 6:00 AM)."
        );
        return false;
      }
    }

    // All slots must be within the same time segment as the start slot
    const startSeg =
      this.selectionSegment ||
      (slots.length ? this.getTimeSegment(slots[0]) : "gap");
    if (startSeg === "gap") {
      this.showErrorToast("Invalid slot selection.");
      return false;
    }
    const mixedSegment = false; // allow crossing midnight within workday timeline
    if (mixedSegment) {
      this.showErrorToast(
        "You can’t select across the closed period (5:30 AM → 2:00 PM). Keep all selected slots either before 5:30 AM or after 2:00 PM."
      );
      return false;
    }

    // All slots must be available
    for (const time of slots) {
      const sd = this.getSlotDataForSpecificCourt(date, time, courtId);
      if (sd && sd.status && sd.status !== "available") {
        this.showErrorToast(
          `Slot at ${this.formatTime(
            time
          )} is not available. Please select a different range.`
        );
        return false;
      }
    }

    return true;
  }

  highlightSelectedSlots() {
    this.clearSlotSelections();
    const times = this.getSlotsBetween(this.startSlot.time, this.endSlot.time);
    times.forEach((t, idx) => {
      const sel = `[data-time="${t}"][data-court="${this.currentCourt}"][data-date="${this.startSlot.date}"]`;
      const el = document.querySelector(sel);
      if (!el) return;
      if (idx === 0) el.classList.add("selection-start");
      else if (idx === times.length - 1) el.classList.add("selection-end");
      else el.classList.add("selection-between");
    });

    this.selectedSlots = times.map((t) => ({
      time: t,
      index: this.timeSlots.indexOf(t),
    }));
  }

  clearSlotSelections() {
    document.querySelectorAll(".time-slot, .excel-slot").forEach((el) => {
      el.classList.remove(
        "selection-start",
        "selection-end",
        "selection-between",
        "selection-invalid"
      );
    });
  }

  animateInvalidSlot(el) {
    el.classList.add("selection-invalid");
    setTimeout(() => el.classList.remove("selection-invalid"), 400);
  }

  openBookingModalWithSelection() {
    if (!this.startSlot || !this.endSlot || this.selectedSlots.length === 0) {
      this.showErrorToast("No valid selection found.");
      return;
    }
    this.openQuickBookModal();
  }

  areConsecutiveSlots(slots) {
    if (slots.length <= 1) return true;
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].index !== slots[i - 1].index + 1) return false;
    }
    return true;
  }
  clearBookingSelectionState() {
    console.log("🧹 Clearing booking selection state");
    this.bookingMode = false;
    this.startSlot = null;
    this.endSlot = null;
    this.selectedSlots = [];
    this.currentCourt = null;
    this.selectedSlot = null;
    this.selectionSegment = null;

    // Clear visual selections
    this.clearSlotSelections();

    // Reset UI
    const createBtn = document.getElementById("create-booking-btn");
    const instructions = document.getElementById("booking-instructions");
    if (createBtn) createBtn.style.display = "flex";
    if (instructions) instructions.style.display = "none";
  }

  // =========================
  // MOBILE "EXCEL" VIEW
  // =========================
  renderExcelHeaders() {
    const head = document.getElementById("excel-court-headers");
    if (!head) return;
    head.innerHTML = "";

    const corner = document.querySelector(".excel-corner");
    if (corner) corner.textContent = "Time";

    this.getAllCourts().forEach((ct) => {
      const div = document.createElement("div");
      div.className = "excel-court-header";
      div.innerHTML = `
        <div style="font-size: .7rem; font-weight:700; color:#495057">${ct.sport.toUpperCase()}</div>
        <div style="font-size: .65rem; opacity:.8">${ct.name}</div>
      `;
      head.appendChild(div);
    });
  }

  renderExcelTimeColumn() {
    const col = document.getElementById("excel-time-column");
    if (!col) return;
    col.innerHTML = "";

    let prevSection = null;
    let nextDayHeaderAdded = false;
    this.timeSlots.forEach((time) => {
      // "day sections" are already partitioned by our times (00:00-05:30 and 14:00-23:30)
      const isNight = parseInt(time.slice(0, 2)) < 6; // 00-05
      const section = isNight ? "night" : "day";

      // Insert a Next Day header when moving into 00:00..05:30 block
      if (this.isNextDaySlot(time) && !nextDayHeaderAdded) {
        const sep = document.createElement("div");
        sep.className = "excel-time-header day-separator";
        const next = new Date(this.currentDate);
        next.setDate(this.currentDate.getDate() + 1);
        const nextStr = localDateKey(next);
        sep.textContent = `Next Day - ${this.formatDate(nextStr)}`;
        col.appendChild(sep);
        nextDayHeaderAdded = true;
      }

      // Remove extra section header here to keep rows perfectly aligned with slots grid

      const h = document.createElement("div");
      h.className = "excel-time-header";
      h.textContent = this.formatTime(time);
      col.appendChild(h);

      prevSection = section;
    });
  }

  renderExcelSlots() {
    const grid = document.getElementById("excel-slots-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const courts = this.getAllCourts();
    const dateStr = localDateKey(this.currentDate);
    let prevSection = null;
    let nextDayHeaderAdded = false;

    this.timeSlots.forEach((time, idx) => {
      const isNight = parseInt(time.slice(0, 2)) < 6;
      const section = isNight ? "night" : "day";

      if (this.isNextDaySlot(time) && !nextDayHeaderAdded) {
        const rowSep = document.createElement("div");
        rowSep.className = "excel-slot-row day-separator";
        courts.forEach(() => {
          const c = document.createElement("div");
          c.className = "excel-slot";
          c.style.background = "#eef3ee";
          c.style.border = "none";
          c.style.cursor = "default";
          rowSep.appendChild(c);
        });
        grid.appendChild(rowSep);
        nextDayHeaderAdded = true;
      }

      const row = document.createElement("div");
      row.className = "excel-slot-row";

      courts.forEach((ct) => {
        row.appendChild(this.createExcelSlot(dateStr, time, ct.id, idx));
      });

      grid.appendChild(row);
      prevSection = section;
    });
  }

  // ===== Unified Mobile Grid (single scroll container) =====
  renderUnifiedMobile() {
    const container = document.getElementById('unified-excel');
    const headerRow = document.getElementById('unified-court-headers');
    const body = document.getElementById('unified-rows');
    if (!container || !headerRow || !body) return;

    // Ensure unified container is visible and legacy is hidden
    const legacy = document.getElementById('legacy-excel');
    if (legacy) legacy.style.display = 'none';
    container.style.display = 'block';

    // Build headers (courts)
    headerRow.innerHTML = '';
    this.getAllCourts().forEach(ct => {
      const h = document.createElement('div');
      h.className = 'u-slot header';
      h.style.background = '#f8f9fa';
      h.style.fontWeight = '700';
      h.innerHTML = `<div style="font-size:.7rem;color:#495057">${ct.sport.toUpperCase()}</div><div style="font-size:.65rem;opacity:.8">${ct.name}</div>`;
      h.style.position = 'relative';
      headerRow.appendChild(h);
    });

    // Build rows
    body.innerHTML = '';
    const courts = this.getAllCourts();
    let nextDayAdded = false;
    this.timeSlots.forEach((time) => {
      if (this.isNextDaySlot(time) && !nextDayAdded) {
        const sep = document.createElement('div');
        sep.className = 'unified-row separator';
        const next = new Date(this.currentDate); next.setDate(this.currentDate.getDate() + 1);
        const nextStr = localDateKey(next);
        const tc = document.createElement('div'); tc.className = 'time-cell'; tc.textContent = `Next Day - ${this.formatDate(nextStr)}`;
        sep.appendChild(tc);
        courts.forEach(() => { const c = document.createElement('div'); c.className = 'u-slot'; sep.appendChild(c); });
        body.appendChild(sep);
        nextDayAdded = true;
      }

      const row = document.createElement('div');
      row.className = 'unified-row';
      const tcell = document.createElement('div');
      tcell.className = 'time-cell';
      tcell.textContent = this.formatTime(time);
      row.appendChild(tcell);
      courts.forEach(ct => {
        // Reuse the rich slot builder so statuses/bookings/blocked states render correctly
        const built = this.createExcelSlot(localDateKey(this.currentDate), time, ct.id, this.timeSlots.indexOf(time));
        // Adapt class for unified layout while keeping status classes
        built.className = built.className.replace('excel-slot', 'u-slot');
        row.appendChild(built);
      });
      body.appendChild(row);
    });
  }

  createExcelSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement("div");
    slot.className = "excel-slot available";
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;

    try {
      const grouped = this.groupConsecutiveBookings(
        this.scheduleData,
        date,
        courtId
      );
      const slotData = grouped[time] || this.getSlotData(date, time, courtId);

      if (slotData && (slotData.status === "blocked" || slotData.isBlocked)) {
        slot.className = "excel-slot blocked";
        slot.innerHTML = `
          <div style="text-align:center; padding:.2rem;">
            <div style="font-size:.65rem; font-weight:700;">Blocked</div>
            <div style="font-size:.6rem; opacity:.8;">${
              slotData.blockReason || "Unavailable"
            }</div>
          </div>`;
        slot.addEventListener("click", () =>
          this.openSlotModal(slot, slotData)
        );
        return slot;
      }

      if (slotData && slotData.mergedBooking) {
        if (slotData.isGroupContinuation) {
          const status = slotData.status || "booked-pending";
          slot.className = `excel-slot ${status} group-continuation`;
          slot.innerHTML = `<div style="font-size:.6rem; opacity:.7;">…</div>`;
          const colorMap = {
            "booked-pending": "#ffc107",
            "booked-confirmed": "#28a745",
            "booked-conflict": "#dc3545",
            "booked-cancelled": "#6c757d",
            blocked: "#6c757d",
          };
          const c = colorMap[status] || "#007bff";
          slot.style.borderLeft = `4px solid ${c}`;
          slot.style.borderRight = `4px solid ${c}`;
          slot.addEventListener("click", () => {
            const start = document.querySelector(
              `[data-time="${slotData.groupStartTime}"][data-court="${courtId}"]`
            );
            if (start) start.click();
          });
        } else if (slotData.isGroupStart) {
          const status = slotData.status || "booked-pending";
          slot.className = `excel-slot ${status} group-start`;
          const duration = slotData.groupSize * 0.5;

          const hasCust =
            (
              slotData.customerComments ||
              slotData.special_requests ||
              ""
            ).trim() !== "";
          const hasAdmin = (slotData.adminComments || "").trim() !== "";
          let icons = "";
          if (hasCust)
            icons +=
              '<i class="fas fa-comment-dots" style="position:absolute;top:1px;right:1px;font-size:.5rem;color:#007bff;background:rgba(255,255,255,.9);border-radius:50%;padding:1px;"></i>';
          if (hasAdmin)
            icons +=
              '<i class="fas fa-comment-medical" style="position:absolute;top:1px;right:10px;font-size:.5rem;color:#28a745;background:rgba(255,255,255,.9);border-radius:50%;padding:1px;"></i>';

          slot.innerHTML = `
            <div style="text-align:center; padding:.2rem; position:relative;">
              ${icons}
              <div style="font-size:.65rem; font-weight:600">${
                slotData.title || "Booked"
              }</div>
              <div style="font-size:.6rem; opacity:.8">${duration}h</div>
            </div>`;
          slot.addEventListener("click", () =>
            this.openSlotModal(slot, slotData)
          );
        }
      } else if (slotData) {
        const status = slotData.status || "booked-pending";
        slot.className = `excel-slot ${status}`;

        const hasCust =
          (
            slotData.customerComments ||
            slotData.special_requests ||
            ""
          ).trim() !== "";
        const hasAdmin = (slotData.adminComments || "").trim() !== "";
        let icons = "";
        if (hasCust)
          icons +=
            '<i class="fas fa-comment-dots" style="position:absolute;top:1px;right:1px;font-size:.5rem;color:#007bff;background:rgba(255,255,255,.9);border-radius:50%;padding:1px;"></i>';
        if (hasAdmin)
          icons +=
            '<i class="fas fa-comment-medical" style="position:absolute;top:1px;right:10px;font-size:.5rem;color:#28a745;background:rgba(255,255,255,.9);border-radius:50%;padding:1px;"></i>';

        slot.innerHTML = `
          <div style="text-align:center; padding:.2rem; position:relative;">
            ${icons}
            <div style="font-size:.65rem; font-weight:600">${
              slotData.title || "Booked"
            }</div>
            ${
              slotData.subtitle
                ? `<div style="font-size:.6rem; opacity:.8">${slotData.subtitle}</div>`
                : ""
            }
          </div>`;
        slot.addEventListener("click", () =>
          this.openSlotModal(slot, slotData)
        );
      } else {
        slot.innerHTML = `
          <div style="text-align:center; padding:.2rem;">
            <div style="font-size:.65rem;">Available</div>
            <div style="font-size:.6rem; opacity:.6">${this.formatTime(
              time
            )}</div>
          </div>`;
        slot.style.background = "#f8f9fa";
        slot.addEventListener("click", () => {
          if (this.bookingMode) {
            this.handleSlotSelection(slot, {
              date,
              time,
              courtId,
              slotData: null,
            });
          } else {
            this.openSlotModal(slot, null);
          }
        });
      }
    } catch (e) {
      console.error(`❌ createExcelSlot error for ${courtId} @ ${time}:`, e);
      slot.innerHTML = `<div style="color:red;font-size:.6rem;">Error</div>`;
      slot.style.background = "#f8d7da";
    }
    return slot;
  }

  setupScrollSync() {
    const headers = document.getElementById("excel-court-headers");
    const gridWrap = document.getElementById("excel-slots-container");
    const timeCol = document.getElementById("excel-time-column");
    if (!headers || !gridWrap || !timeCol) return;

    let raf = null,
      syncing = false;
    const throttle = (cb) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        cb();
        raf = null;
      });
    };

    const syncX = (src, tgt) =>
      throttle(() => {
        syncing = true;
        tgt.scrollLeft = src.scrollLeft;
        syncing = false;
      });
    const syncY = (src, tgt) =>
      throttle(() => {
        syncing = true;
        tgt.scrollTop = src.scrollTop;
        syncing = false;
      });

    gridWrap.addEventListener(
      "scroll",
      () => {
        if (!syncing) {
          syncX(gridWrap, headers);
          syncY(gridWrap, timeCol);
        }
      },
      { passive: true }
    );
    headers.addEventListener(
      "scroll",
      () => {
        if (!syncing) syncX(headers, gridWrap);
      },
      { passive: true }
    );
    timeCol.addEventListener(
      "scroll",
      () => {
        if (!syncing) syncY(timeCol, gridWrap);
      },
      { passive: true }
    );

    // Restrict axes
    headers.style.overflowY = "hidden";
    timeCol.style.overflowX = "hidden";
  }

  // =========================
  // NAV/VIEW/DATE
  // =========================
  navigateDate(days) {
    const d = new Date(this.currentDate);
    d.setDate(this.currentDate.getDate() + days);
    this.currentDate = d;
    const inp = document.getElementById("schedule-date");
    if (inp) inp.value = localDateKey(this.currentDate);
    this.updateDateDisplay();
    this.loadScheduleData();
  }

  handleDateChange(e) {
    this.currentDate = parseLocalDate(e.target.value);
    this.updateDateDisplay();
    this.loadScheduleData();
  }

  switchView(view) {
    if (this.currentView === view) return;
    this.currentView = view;
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    this.loadScheduleData();
  }

  updateDateDisplay() {
    const el = document.getElementById("date-display");
    if (!el) return;
    if (this.currentView === "week") {
      const start = this.getWeekStartDate(this.currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      el.textContent = `Week of ${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      el.textContent = this.currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  getWeekStartDate(date) {
    const s = new Date(date);
    const day = s.getDay(); // 0 Sun..6 Sat
    const diff = s.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    s.setDate(diff);
    return s;
  }

  handleSportFilterChange() {
    const val = document.getElementById("sport-filter")?.value;
    const weekBtn = document.getElementById("week-view");
    if (!val) {
      if (weekBtn) weekBtn.style.display = "none";
      if (this.currentView === "week") this.switchView("day");
    } else {
      if (weekBtn) weekBtn.style.display = "inline-flex";
    }
    this.loadScheduleData();
  }

  filterSchedule() {
    this.loadScheduleData();
  }

  refreshSchedule() {
    const btn = document.getElementById("refresh-schedule");
    const icon = btn?.querySelector("i");
    if (icon) icon.style.animation = "spin 1s linear infinite";
    this.loadScheduleData().finally(() => {
      if (icon) icon.style.animation = "";
    });
  }

  // =========================
  // UTILS
  // =========================
  formatTime(t) {
    const [H, M] = t.split(":").map(Number);
    const ampm = H >= 12 ? "PM" : "AM";
    const h12 = H % 12 || 12;
    return `${h12}:${String(M).padStart(2, "0")} ${ampm}`;
  }

  formatDate(dateStr) {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  setElementText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
  setElementDisplay(id, disp) {
    const el = document.getElementById(id);
    if (el) el.style.display = disp;
  }

  getCourtName(courtId) {
    if (courtId === "all-courts") return "All Courts";
    for (const sport in this.courtConfig) {
      const c = this.courtConfig[sport].find((x) => x.id === courtId);
      if (c) return c.name;
    }
    return courtId;
  }

  getStatusText(status) {
    const map = {
      available: "Available",
      "booked-pending": "Pending Payment",
      "booked-confirmed": "Confirmed",
      "booked-conflict": "Multi-Court Booking",
      "booked-cancelled": "Cancelled",
      blocked: "Blocked",
    };
    return map[status] || status || "Available";
  }

  testBlockButton() {
    const btn = document.getElementById("block-slot-btn");
    if (btn) btn.click();
  }

  showLoading(show) {
    const ov = document.getElementById("loading-overlay");
    if (!ov) return;
    ov.classList.toggle("hidden", !show);
    ov.style.display = show ? "flex" : "none";
  }

  showSuccessToast(msg) {
    this.showToast(msg, "success", 3000);
  }
  showErrorToast(msg) {
    this.showToast(msg, "error", 5000);
  }
  showLoadingToast(msg) {
    if (this.currentLoadingToast) this.currentLoadingToast.remove();
    this.currentLoadingToast = this.showToast(msg, "info", 0);
  }

  showToast(message, type = "info", duration = 3000) {
    if (type !== "info" && this.currentLoadingToast) {
      this.currentLoadingToast.remove();
      this.currentLoadingToast = null;
    }
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const icon =
      {
        success: "fa-check-circle",
        error: "fa-exclamation-circle",
        info: "fa-info-circle",
      }[type] || "fa-info-circle";
    const bg =
      { success: "#28a745", error: "#dc3545", info: "#17a2b8" }[type] ||
      "#17a2b8";
    const loading = type === "info" && duration === 0;

    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${icon} ${loading ? "fa-spin" : ""}"></i>
        <span>${message}</span>
      </div>
      ${
        duration > 0
          ? '<button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>'
          : ""
      }`;
    toast.style.cssText = `
      position:fixed;top:20px;right:20px;background:${bg};color:#fff;padding:1rem 1.25rem;border-radius:10px;
      box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:10000;display:flex;align-items:center;gap:.75rem;min-width:280px;
      animation:slideInRight .25s ease;`;

    document.body.appendChild(toast);
    if (duration > 0)
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight .25s ease";
          setTimeout(() => toast.remove(), 250);
        }
      }, duration);

    return toast;
  }
}

// ============ BOOTSTRAP ============
document.addEventListener("DOMContentLoaded", () => {
  try {
    window.adminSchedule = new AdminScheduleManager();
    // quick sanity for create button
    setTimeout(() => {
      const btn = document.getElementById("create-booking-btn");
      console.log("Create booking button present:", !!btn);
    }, 800);
  } catch (e) {
    console.error("❌ Failed to init AdminScheduleManager:", e);
  }
});

// Global helpers
window.forceRefreshSchedule = function () {
  if (!window.adminSchedule) return console.error("❌ AdminSchedule missing");
  window.adminSchedule.scheduleData = {};
  window.adminSchedule.loadScheduleData();
};

window.testBlockButton = function () {
  if (!window.adminSchedule) return console.error("❌ AdminSchedule missing");
  window.adminSchedule.testBlockButton();
};

window.testBlockFunctionality = function () {
  console.log("🧪 Block test start");
  const blockBtn = document.getElementById("block-slot-btn");
  console.log("Block button:", blockBtn);
  const avail = document.getElementById("available-actions");
  console.log("Available actions:", avail, "display:", avail?.style.display);
  if (window.adminSchedule) {
    try {
      window.adminSchedule.blockSlotFromModal();
    } catch (e) {
      console.error(e);
    }
  }
};

// ===== Styles (only inject once) =====
const enhancedStyle = document.createElement("style");
enhancedStyle.id = "complete-admin-schedule-style";
enhancedStyle.textContent = `
  /* Enhanced styles for merged booking slots */
  .time-slot.group-start { position: relative; z-index: 10; }
  .time-slot.group-continuation { border-top: none !important; border-bottom: none !important; position: relative; z-index: 5; }
  .time-slot.group-continuation:last-of-type { border-bottom: 8px solid #28a745 !important; border-radius: 0 0 8px 8px !important; }
  .merged-booking { padding: 8px; height: 100%; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .booking-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .continuation-marker { height: 100%; background: linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.1) 50%, transparent 80%); }
  .time-slot.group-start:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; transition: all 0.2s ease; }
  .time-slot.group-continuation:hover { background: rgba(0,123,255,0.1) !important; }

  /* Selection styles */
  .selection-start { outline: 3px solid #20c997; outline-offset: -3px; }
  .selection-end { outline: 3px solid #20c997; outline-offset: -3px; }
  .selection-between { background: rgba(32,201,151,0.15) !important; }
  .selection-invalid { animation: shake 0.25s linear; }

  @keyframes shake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    50% { transform: translateX(2px); }
    75% { transform: translateX(-2px); }
    100% { transform: translateX(0); }
  }

  /* Modal styles */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
  .modal-overlay.hidden { display: none !important; }
  .modal { background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #eee; background: linear-gradient(135deg, #f8f9fa, #e9ecef); }
  .modal-header h3 { margin: 0; color: #333; font-size: 1.25rem; font-weight: 600; }
  .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; transition: color 0.3s ease; padding: 4px; border-radius: 4px; }
  .close-btn:hover { color: #dc3545; background: #f8f9fa; }
  .modal-body { padding: 1.5rem; }
  .info-group { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f0f0f0; }
  .info-group:last-child { border-bottom: none; }
  .info-group label { font-weight: 600; color: #555; }
  .status-badge { padding: 4px 12px; border-radius: 15px; font-size: 0.85rem; font-weight: 600; }
  .booking-details { background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  .comments-section textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; resize: vertical; font-family: inherit; font-size: 0.9rem; }
  .booking-actions, .available-actions .action-group { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; justify-content: center; }
  .action-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
  .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

  /* Animations */
  @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideOutDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .toast-content { display: flex; align-items: center; gap: 0.5rem; flex: 1; }
  .toast-close { background: none; border: none; color: white; cursor: pointer; font-size: 0.9rem; opacity: 0.8; transition: opacity 0.3s ease; }
  .toast-close:hover { opacity: 1; }
`;
if (!document.getElementById("complete-admin-schedule-style")) {
  document.head.appendChild(enhancedStyle);
}

const quickBookStyle = document.createElement("style");
quickBookStyle.id = "quick-book-modal-style";
quickBookStyle.textContent = `
  /* Enhanced quick book modal styles */
  #quick-book-modal { max-width: 600px; width: 95%; }
  #quick-book-modal .modal-header { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
  #quick-book-modal .modal-header h3 { color: white; }
  #quick-book-modal .close-btn { color: white; }
  #quick-book-modal .close-btn:hover { color: #f8f9fa; background: rgba(255,255,255,0.2); }

  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #495057; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 6px; font-size: 0.9rem; transition: border-color 0.3s ease, box-shadow 0.3s ease; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #28a745; box-shadow: 0 0 0 2px rgba(40,167,69,0.25); }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }

  .form-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; }
  .btn-cancel { padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease; }
  .btn-cancel:hover { background: #5a6268; }
  .btn-primary { padding: 0.75rem 1.5rem; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s ease; }
  .btn-primary:hover { background: #218838; transform: translateY(-1px); }
  .btn-primary:disabled { background: #6c757d; cursor: not-allowed; transform: none; }

  .form-group input:invalid { border-color: #dc3545; }
  .form-group input:valid { border-color: #28a745; }

  .form-group input:disabled, .form-group select:disabled, .form-group textarea:disabled { background-color: #f8f9fa; opacity: 0.6; }
`;
if (!document.getElementById("quick-book-modal-style")) {
  document.head.appendChild(quickBookStyle);
}

console.log("🎯 COMPLETE: Admin schedule (local-date safe) loaded!");
