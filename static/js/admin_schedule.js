// FIXED: Professional Admin Schedule Management System
// Enhanced debugging and booking display

// COMPLETE WORKING Admin Schedule - Based on your original working code
// Fixed all issues while keeping existing functionality

class AdminScheduleManager {
  constructor() {
    this.currentDate = new Date();
    this.currentView = "week";
    this.scheduleData = {};
    this.selectedSlot = null;
    this.isSubmittingBooking = false;

    // Booking selection state
    this.bookingMode = false;
    this.startSlot = null;
    this.endSlot = null;
    this.selectedSlots = [];
    this.currentCourt = null;

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
    };

    this.multiPurposeCourts = {
      "cricket-2": "multi-130x60",
      "futsal-1": "multi-130x60",
    };

    this.timeSlots = this.generateTimeSlots();
    this.init();
  }

  generateTimeSlots() {
    const slots = [];

    // Arena operates from 2pm (14:00) to 6am (06:00) next day
    // Generate slots from 14:00 to 23:30 for current day
    for (let hour = 14; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }

    // Generate slots from 00:00 to 05:30 for next day (cross-midnight)
    for (let hour = 0; hour < 6; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }

    return slots;
  }

  // Helper function to check if a time slot is for the next day (cross-midnight)
  isCrossMidnightSlot(timeString) {
    const hour = parseInt(timeString.split(":")[0]);
    return hour >= 0 && hour < 6; // 00:00 to 05:30 are next day slots
  }

  // Helper function to get the actual booking date for a time slot
  getBookingDate(selectedDate, timeString) {
    const baseDate = new Date(selectedDate);
    if (this.isCrossMidnightSlot(timeString)) {
      // Add one day for cross-midnight slots
      baseDate.setDate(baseDate.getDate() + 1);
    }
    return baseDate.toISOString().split("T")[0];
  }

  init() {
    this.initializeSchedule();
    this.setupEventListeners();
    this.hideAllModals();
    // Initialize view based on sport filter
    this.handleSportFilterChange();
    setTimeout(() => {
      this.loadScheduleData();
      // Setup booking controls after everything loads
      this.setupBookingControls();
    }, 200);
  }

  initializeSchedule() {
    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = this.currentDate.toISOString().split("T")[0];
      this.updateDateDisplay();

      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 90);

      dateInput.min = today.toISOString().split("T")[0];
      dateInput.max = maxDate.toISOString().split("T")[0];
    }
  }

  setupEventListeners() {
    // Date navigation
    this.addEventListener("prev-week", "click", () => this.navigateDate(-7));
    this.addEventListener("next-week", "click", () => this.navigateDate(7));
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

    // Modal controls - FIXED
    this.addEventListener("close-modal", "click", () => this.closeSlotModal());
    this.addEventListener("slot-modal-overlay", "click", (e) =>
      this.handleModalOverlayClick(e)
    );

    // Slot actions - FIXED with proper event handling
    this.addEventListener("block-slot-btn", "click", () =>
      this.blockSlotFromModal()
    );

    // Booking actions - FIXED
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

    // Comments - FIXED
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

    // FIXED: Quick book modal overlay click
    this.addEventListener("quick-book-modal-overlay", "click", (e) =>
      this.handleQuickBookOverlayClick(e)
    );

    // Booking creation controls will be setup in init()

    // Window resize handler for switching between desktop/mobile views
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.renderSchedule();
      }, 300);
    });

    console.log("✅ FIXED: Quick book event listeners setup");
  }

  addEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Event listener added for: ${id} (${event})`);
      
      // Special debug for block button
      if (id === "block-slot-btn") {
        console.log("🚫 Block button found and event listener attached!");
        console.log("Block button element:", element);
      }
    } else {
      console.error(`❌ Element not found: ${id}`);
      
      // Special debug for block button
      if (id === "block-slot-btn") {
        console.error("🚫 BLOCK BUTTON NOT FOUND! Checking if it exists...");
        setTimeout(() => {
          const laterCheck = document.getElementById(id);
          console.log("Later check for block button:", laterCheck);
        }, 1000);
      }
    }
  }

  hideAllModals() {
    const modals = [
      "slot-modal-overlay",
      "quick-book-modal-overlay",
      "block-slot-modal-overlay",
    ];

    modals.forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    });

    this.selectedSlot = null;
  }

  // FIXED: Enhanced loadScheduleData (your original working logic)
  async loadScheduleData() {
    this.showLoading(true);

    try {
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
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        sport: document.getElementById("sport-filter")?.value || "",
      };

      console.log("🔧 Loading schedule data with request:", requestData);

      const response = await fetch("/admin/api/schedule-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.scheduleData = data.schedule || {};
        console.log(
          "📊 Schedule data loaded:",
          Object.keys(this.scheduleData).length,
          "days"
        );

        this.renderSchedule();

        // Count total bookings
        let totalBookings = 0;
        Object.keys(this.scheduleData).forEach((date) => {
          Object.keys(this.scheduleData[date] || {}).forEach((court) => {
            totalBookings += Object.keys(
              this.scheduleData[date][court] || {}
            ).length;
          });
        });

        if (totalBookings > 0) {
          this.showSuccessToast(
            `Loaded ${totalBookings} bookings successfully`
          );
        }
      } else {
        throw new Error(data.message || "Failed to load schedule");
      }
    } catch (error) {
      console.error("❌ Error loading schedule:", error);
      this.showErrorToast("Failed to load schedule: " + error.message);
      this.scheduleData = {};
      this.renderSchedule();
    } finally {
      this.showLoading(false);
    }
  }

  renderSchedule() {
    // Check if we should render Excel view for mobile
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      this.renderExcelView();
    } else {
      this.renderDesktopView();
    }
  }

  renderDesktopView() {
    const grid = document.getElementById("schedule-grid");
    if (!grid) {
      console.error("❌ Schedule grid not found");
      return;
    }

    grid.innerHTML = "";
    grid.className = `schedule-grid ${this.currentView}-view`;

    try {
      if (!this.scheduleData || typeof this.scheduleData !== "object") {
        this.scheduleData = {};
      }

      if (this.currentView === "week") {
        this.renderWeekView(grid);
      } else {
        this.renderDayView(grid);
      }

      console.log("✅ Desktop schedule rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering desktop schedule:", error);
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
    console.log("📱 Rendering Excel view for mobile");
    try {
      if (!this.scheduleData || typeof this.scheduleData !== "object") {
        this.scheduleData = {};
      }

      this.renderExcelHeaders();
      this.renderExcelTimeColumn();
      this.renderExcelSlots();

      // Setup scroll synchronization
      this.setupScrollSync();

      console.log("✅ Excel view rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering Excel view:", error);
    }
  }

  renderDayView(grid) {
    const courts = this.getAllCourts();
    const dateStr = this.currentDate.toISOString().split("T")[0];
    const timeSlotCount = this.timeSlots.length;

    grid.style.gridTemplateColumns = `100px repeat(${courts.length}, 1fr)`;
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 50px)`;

    // Create headers
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

    // Create time slots with merged booking support
    let previousDaySection = null;

    this.timeSlots.forEach((time, timeIndex) => {
      const isCrossMidnight = this.isCrossMidnightSlot(time);
      const currentDaySection = isCrossMidnight ? "tomorrow" : "today";

      // Add day section header when transitioning from today to tomorrow
      if (previousDaySection !== currentDaySection && isCrossMidnight) {
        const dayHeader = document.createElement("div");
        dayHeader.className = "time-header day-separator";

        // Create formatted date for tomorrow
        const tomorrowDate = new Date(this.currentDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowFormatted = tomorrowDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        dayHeader.innerHTML = `Next Day - ${tomorrowFormatted}`;
        grid.appendChild(dayHeader);

        // No need to add empty cells - day-separator spans full width via CSS
      }

      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      courts.forEach((court) => {
        const slot = this.createTimeSlot(dateStr, time, court.id, timeIndex);
        grid.appendChild(slot);
      });

      previousDaySection = currentDaySection;
    });
  }

  renderWeekView(grid) {
    const startDate = this.getWeekStartDate(this.currentDate);
    const days = ["Time", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const timeSlotCount = this.timeSlots.length;

    grid.style.gridTemplateColumns = "80px repeat(7, 1fr)";
    grid.style.gridTemplateRows = `60px repeat(${timeSlotCount}, 40px)`;

    // Create headers
    days.forEach((day, index) => {
      const header = document.createElement("div");
      if (index === 0) {
        header.className = "time-header";
        header.textContent = day;
      } else {
        header.className = "day-header";
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (index - 1));
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

    // Create time slots
    this.timeSlots.forEach((time, timeIndex) => {
      const timeLabel = document.createElement("div");
      timeLabel.className = "time-header";
      timeLabel.textContent = this.formatTime(time);
      grid.appendChild(timeLabel);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(startDate.getDate() + dayOffset);
        const dateStr = slotDate.toISOString().split("T")[0];
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

  // ENHANCED: Merged booking functionality
  groupConsecutiveBookings(scheduleData, date, courtId) {
    try {
      if (!scheduleData[date] || !scheduleData[date][courtId]) {
        return {};
      }

      const courtBookings = scheduleData[date][courtId];
      const bookingGroups = {};
      const bookingsByID = {};

      Object.keys(courtBookings).forEach((time) => {
        const booking = courtBookings[time];
        
        // Skip blocked slots - they should never be grouped
        if (booking.status === "blocked" || booking.isBlocked) {
          return;
        }
        
        const bookingId = booking.bookingId;

        if (!bookingsByID[bookingId]) {
          bookingsByID[bookingId] = [];
        }
        bookingsByID[bookingId].push({ time, ...booking });
      });

      Object.keys(bookingsByID).forEach((bookingId) => {
        const slots = bookingsByID[bookingId];
        
        // Sort slots by chronological order (not alphabetical) to handle cross-midnight bookings
        slots.sort((a, b) => {
          const hourA = parseInt(a.time.split(':')[0]);
          const hourB = parseInt(b.time.split(':')[0]);
          const minuteA = parseInt(a.time.split(':')[1]);
          const minuteB = parseInt(b.time.split(':')[1]);
          
          // Convert to minutes for comparison, handling cross-midnight
          // Times 0:00-5:59 are next day, add 24*60 to put them after same-day times
          const totalMinutesA = (hourA >= 0 && hourA < 6) ? (hourA * 60 + minuteA + 24 * 60) : (hourA * 60 + minuteA);
          const totalMinutesB = (hourB >= 0 && hourB < 6) ? (hourB * 60 + minuteB + 24 * 60) : (hourB * 60 + minuteB);
          
          return totalMinutesA - totalMinutesB;
        });

        if (slots.length > 1) {
          const firstSlot = slots[0]; // Now this is the chronologically first slot (e.g., 23:00)
          bookingGroups[firstSlot.time] = {
            ...firstSlot,
            isGroupStart: true,
            groupSize: slots.length,
            mergedBooking: true,
          };

          for (let i = 1; i < slots.length; i++) {
            bookingGroups[slots[i].time] = {
              ...slots[i],
              isGroupContinuation: true,
              groupStartTime: firstSlot.time,
              mergedBooking: true,
            };
          }
        } else {
          bookingGroups[slots[0].time] = {
            ...slots[0],
            isGroupStart: true,
            groupSize: 1,
            mergedBooking: false,
          };
        }
      });

      return bookingGroups;
    } catch (error) {
      console.error("❌ Error grouping bookings:", error);
      return {};
    }
  }

  // ENHANCED: createTimeSlot with merged booking support
  createTimeSlot(date, time, courtId, timeIndex) {
    const slot = document.createElement("div");
    slot.className = "time-slot available";
    slot.dataset.date = date;
    slot.dataset.time = time;
    slot.dataset.court = courtId;
    slot.dataset.timeIndex = timeIndex;

    try {
      const groupedBookings = this.groupConsecutiveBookings(
        this.scheduleData,
        date,
        courtId
      );
      const slotData =
        groupedBookings[time] || this.getSlotData(date, time, courtId);

      // Handle blocked slots separately - no grouping behavior
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
        slot.style.backgroundColor = "#6c757d"; // Gray for blocked
        slot.style.color = "white";
        slot.style.border = "2px solid #6c757d";
        
        // Add click handler for blocked slots
        slot.addEventListener("click", () => {
          console.log("🖱️ Blocked slot clicked:", { date, time, courtId, slotData });
          this.openSlotModal(slot, slotData);
        });
        
        return slot;
      }

      if (slotData && slotData.mergedBooking) {
        if (slotData.isGroupContinuation) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `time-slot ${statusClass} group-continuation`;
          slot.innerHTML = `<div class="slot-content continuation-marker"></div>`;

          slot.style.backgroundColor = "transparent";
          slot.style.border = "none";
          
          // Use the same color as the header based on status
          const statusColors = {
            "booked-pending": "#ffc107",      // Yellow for reservations
            "booked-confirmed": "#28a745",    // Green for confirmed
            "booked-conflict": "#dc3545",     // Red for conflicts
            "booked-cancelled": "#6c757d",    // Gray for cancelled
            "blocked": "#6c757d"              // Gray for blocked
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

          // Check for comments
          const hasCustomerComments = (slotData.customerComments || slotData.special_requests) && 
                                     (slotData.customerComments || slotData.special_requests).trim() !== '';
          const hasAdminComments = slotData.adminComments && slotData.adminComments.trim() !== '';
          
          // Create comment indicators
          let commentIcons = '';
          if (hasCustomerComments) {
            commentIcons += '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests"></i>';
          }
          if (hasAdminComments) {
            commentIcons += '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available"></i>';
          }
          
          slot.innerHTML = `
            <div class="slot-content merged-booking">
              ${commentIcons}
              <div class="slot-title">${slotData.title || "Booked"}</div>
              <div class="slot-subtitle">PKR ${(slotData.amount || 0).toLocaleString()}</div>
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
          slot.style.border = `3px solid ${statusColor}`;
          slot.style.borderRadius = "8px 8px 0 0";
          slot.style.fontWeight = "600";
          slot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        }
      } else if (slotData) {
        const statusClass = slotData.status || "booked-pending";
        slot.className = `time-slot ${statusClass}`;

        // Check for comments
        const hasCustomerComments = (slotData.customerComments || slotData.special_requests) && 
                                   (slotData.customerComments || slotData.special_requests).trim() !== '';
        const hasAdminComments = slotData.adminComments && slotData.adminComments.trim() !== '';
        
        // Create comment indicators
        let commentIcons = '';
        if (hasCustomerComments) {
          commentIcons += '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests"></i>';
        }
        if (hasAdminComments) {
          commentIcons += '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available"></i>';
        }

        slot.innerHTML = `
          <div class="slot-content">
            ${commentIcons}
            <div class="slot-title">${slotData.title || "Booked"}</div>
            <div class="slot-subtitle">PKR ${(slotData.amount || 0).toLocaleString()}</div>
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

      // FIXED: Click event with proper data passing
      slot.addEventListener("click", () => {
        console.log("🖱️ Slot clicked:", { date, time, courtId, slotData });

        // Handle booking selection mode
        if (this.bookingMode) {
          this.handleSlotSelection(slot, { date, time, courtId, slotData });
        } else {
          this.openSlotModal(slot, slotData);
        }
      });
    } catch (error) {
      console.error(`❌ Error creating slot for ${courtId} at ${time}:`, error);
      slot.innerHTML = `<div class="slot-content"><div class="slot-title" style="color: red;">Error</div></div>`;
      slot.style.backgroundColor = "#f8d7da";
    }

    return slot;
  }

  getSlotData(date, time, courtId) {
    try {
      if (!this.scheduleData || !this.scheduleData[date]) {
        return null;
      }

      if (courtId === "all-courts") {
        const allCourts = this.getAllCourts();
        for (const court of allCourts) {
          const courtBooking = this.getSlotDataForSpecificCourt(
            date,
            time,
            court.id
          );
          if (courtBooking) {
            return {
              ...courtBooking,
              title: `${courtBooking.title} (${court.sport.toUpperCase()})`,
              subtitle: `${courtBooking.subtitle} - ${court.name}`,
            };
          }
        }
        return null;
      }

      return this.getSlotDataForSpecificCourt(date, time, courtId);
    } catch (error) {
      console.error("❌ Error in getSlotData:", error);
      return null;
    }
  }

  getSlotDataForSpecificCourt(date, time, courtId) {
    try {
      if (
        this.scheduleData[date][courtId] &&
        this.scheduleData[date][courtId][time]
      ) {
        return this.scheduleData[date][courtId][time];
      }

      if (courtId in this.multiPurposeCourts) {
        const multiCourtType = this.multiPurposeCourts[courtId];
        const conflictingCourts = Object.keys(this.multiPurposeCourts).filter(
          (otherCourtId) =>
            this.multiPurposeCourts[otherCourtId] === multiCourtType &&
            otherCourtId !== courtId
        );

        for (const conflictCourt of conflictingCourts) {
          if (
            this.scheduleData[date][conflictCourt] &&
            this.scheduleData[date][conflictCourt][time]
          ) {
            const conflictData = this.scheduleData[date][conflictCourt][time];
            return {
              ...conflictData,
              title: `${conflictData.title} (${
                conflictCourt.includes("cricket") ? "Cricket" : "Futsal"
              })`,
              subtitle: `${conflictData.subtitle} - Multi Court Booked`,
              status: "booked-conflict",
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ Error checking specific court ${courtId}:`, error);
      return null;
    }
  }

  getAllCourts() {
    const sportFilter = document.getElementById("sport-filter")?.value;
    let courts = [];

    if (sportFilter && this.courtConfig[sportFilter]) {
      courts = this.courtConfig[sportFilter].map((court) => ({
        ...court,
        sport: sportFilter,
      }));
    } else {
      const sportOrder = ["padel", "cricket", "futsal", "pickleball"];
      sportOrder.forEach((sport) => {
        if (this.courtConfig[sport]) {
          this.courtConfig[sport].forEach((court) => {
            courts.push({ ...court, sport });
          });
        }
      });
    }

    return courts;
  }

  // FIXED: Modal functionality
  openSlotModal(slotElement, slotData) {
    try {
      console.log("🔓 Opening slot modal with data:", slotData);

      this.selectedSlot = {
        element: slotElement,
        date: slotElement.dataset.date,
        time: slotElement.dataset.time,
        court: slotElement.dataset.court,
        courtId: slotElement.dataset.court, // Add for compatibility
        data: slotData,
      };

      const modal = document.getElementById("slot-modal");
      const overlay = document.getElementById("slot-modal-overlay");

      if (modal && overlay) {
        this.updateSlotModalContent(slotData);
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
        modal.style.animation = "slideInUp 0.3s ease";
        console.log("✅ Modal opened successfully");
      }
    } catch (error) {
      console.error("❌ Error opening modal:", error);
    }
  }

  // FIXED: Complete modal content update
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

      // Update basic info
      this.setElementText(
        "modal-court",
        this.getCourtName(this.selectedSlot.court)
      );
      this.setElementText(
        "modal-datetime",
        `${this.formatDate(this.selectedSlot.date)} at ${this.formatTime(
          this.selectedSlot.time
        )}`
      );

      // Update status
      const statusElement = document.getElementById("modal-status");
      if (statusElement) {
        if (isAvailable) {
          statusElement.textContent = "Available";
          statusElement.className = "status-badge available";
        } else {
          statusElement.textContent = this.getStatusText(slotData.status);
          statusElement.className = `status-badge ${slotData.status}`;
        }
      }

      // Show/hide sections
      console.log("Modal content - Available:", isAvailable, "Booked:", isBooked, "Blocked:", isBlocked);
      this.setElementDisplay(
        "available-actions",
        isAvailable ? "block" : "none"
      );
      this.setElementDisplay("booking-details", isBooked ? "block" : "none");
      this.setElementDisplay("blocked-actions", isBlocked ? "block" : "none");
      
      console.log("Showing available-actions:", isAvailable ? "block" : "none");

      if (isBooked) {
        this.updateBookingDetails(slotData);
      } else if (isBlocked) {
        this.updateBlockedDetails(slotData);
      }

      console.log("✅ Modal content updated");
      
      // Debug: Test if we can manually click the block button
      if (isAvailable) {
        setTimeout(() => {
          const blockBtn = document.getElementById("block-slot-btn");
          console.log("🧪 Testing - Block button after modal open:", blockBtn);
          if (blockBtn) {
            console.log("Block button style:", blockBtn.style.display);
            console.log("Block button visible:", !blockBtn.style.display || blockBtn.style.display !== 'none');
          }
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error updating modal content:", error);
    }
  }

  updateBlockedDetails(slotData) {
    try {
      // Show blocking reason
      this.setElementText("modal-block-reason", slotData.blockReason || slotData.subtitle || "No reason provided");
      console.log("✅ Updated blocked slot details");
    } catch (error) {
      console.error("❌ Error updating blocked details:", error);
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
      
      // Show promo code information if available
      const promoGroup = document.getElementById("modal-promo-group");
      const promoCodeEl = document.getElementById("modal-promo-code");
      const discountInfoEl = document.getElementById("modal-discount-info");
      
      if (slotData.promoCode) {
        promoGroup.style.display = "block";
        this.setElementText("modal-promo-code", `🎟️ ${slotData.promoCode}`);
        
        let discountText = "";
        if (slotData.discountAmount > 0) {
          discountText = `Discount: PKR ${slotData.discountAmount.toLocaleString()}`;
          if (slotData.originalAmount > 0) {
            discountText += ` (Original: PKR ${slotData.originalAmount.toLocaleString()})`;
          }
        }
        this.setElementText("modal-discount-info", discountText);
      } else {
        promoGroup.style.display = "none";
      }
      
      this.setElementText(
        "modal-duration",
        `${slotData.duration || 1} hour(s)`
      );

      // Handle customer comments (read-only)
      const customerCommentsSection = document.getElementById("customer-comments-section");
      const customerCommentsDisplay = document.getElementById("customer-comments-display");
      
      if (slotData.customerComments) {
        customerCommentsSection.style.display = "block";
        customerCommentsDisplay.textContent = slotData.customerComments;
      } else {
        customerCommentsSection.style.display = "none";
      }
      
      // Handle admin comments (editable)
      const adminCommentsEl = document.getElementById("admin-comments");
      if (adminCommentsEl) {
        adminCommentsEl.value = slotData.adminComments || "";
      }

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
    } catch (error) {
      console.error("❌ Error updating booking details:", error);
    }
  }

  // FIXED: Booking action methods with proper API calls
  async confirmBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to confirm this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Confirming booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "confirm",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking confirmed successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to confirm booking");
      }
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
      this.showErrorToast("Failed to confirm booking: " + error.message);
    }
  }

  async declineBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to decline this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Declining booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "decline",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking declined successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to decline booking");
      }
    } catch (error) {
      console.error("❌ Error declining booking:", error);
      this.showErrorToast("Failed to decline booking: " + error.message);
    }
  }

  async cancelBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const confirmed = confirm(
        "Are you sure you want to cancel this booking?"
      );
      if (!confirmed) return;

      this.showLoadingToast("Cancelling booking...");

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          action: "cancel",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking cancelled successfully!");
        this.closeSlotModal();
        this.loadScheduleData();
      } else {
        throw new Error(result.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      this.showErrorToast("Failed to cancel booking: " + error.message);
    }
  }

  editBookingFromModal() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    console.log(
      "✏️ Redirecting to edit booking:",
      this.selectedSlot.data.bookingId
    );
    this.closeSlotModal();
    window.location.href = `/admin/booking-control?booking=${this.selectedSlot.data.bookingId}`;
  }

  async saveSlotComment() {
    if (!this.selectedSlot?.data?.bookingId) {
      this.showErrorToast("No booking selected");
      return;
    }

    try {
      const adminComment = document.getElementById("admin-comments")?.value || "";
      console.log(
        "💬 Saving admin comment for booking:",
        this.selectedSlot.data.bookingId,
        "Comment:", adminComment
      );

      this.showLoadingToast("Saving admin comment...");

      // Make API call to update booking with admin comment
      const response = await fetch("/admin/api/update-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: this.selectedSlot.data.bookingId,
          adminComments: adminComment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local data
        if (this.selectedSlot.data) {
          this.selectedSlot.data.adminComments = adminComment;
        }
        
        this.showSuccessToast("Admin comment saved successfully!");
        
        // Refresh schedule to show updated comment everywhere
        await this.loadScheduleData();
        
        // Close modal
        this.closeSlotModal();
      } else {
        throw new Error(result.message || "Failed to save admin comment");
      }
    } catch (error) {
      console.error("❌ Error saving admin comment:", error);
      this.showErrorToast("Failed to save admin comment: " + error.message);
    }
  }

  async blockSlotFromModal() {
    console.log("🚫 Block slot button clicked!");
    console.log("Selected slot:", this.selectedSlot);
    
    if (!this.selectedSlot) {
      console.error("❌ No slot selected");
      this.showErrorToast("No slot selected");
      return;
    }

    try {
      const reason = prompt(
        "Enter reason for blocking this slot:",
        "Maintenance"
      );
      if (!reason || reason.trim() === "") return;

      this.showLoadingToast("Blocking slot...");

      const slotInfo = this.selectedSlot;
      const { date, time, courtId } = slotInfo;
      
      // Call backend API to block slot
      const response = await fetch('/api/block-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court: courtId,
          date: date,
          time_slot: time,
          reason: reason.trim()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local data for immediate UI update
        if (!this.scheduleData[date]) {
          this.scheduleData[date] = {};
        }
        if (!this.scheduleData[date][courtId]) {
          this.scheduleData[date][courtId] = {};
        }
        
        this.scheduleData[date][courtId][time] = {
          status: "blocked",
          title: "Blocked",
          subtitle: reason.trim(),
          blockReason: reason.trim(),
          time: time,
          date: date,
          court: courtId,
          isBlocked: true
        };

        this.showSuccessToast("Slot blocked successfully!");
        this.closeSlotModal();
        this.renderSchedule(); // Refresh the view
      } else {
        this.showErrorToast(result.message || "Failed to block slot");
      }
    } catch (error) {
      console.error("❌ Error blocking slot:", error);
      this.showErrorToast("Failed to block slot: " + error.message);
    }
  }

  async unblockSlotFromModal() {
    if (!this.selectedSlot) {
      this.showErrorToast("No slot selected");
      return;
    }

    try {
      const confirmed = confirm("Are you sure you want to unblock this slot?");
      if (!confirmed) return;

      this.showLoadingToast("Unblocking slot...");

      const slotInfo = this.selectedSlot;
      const { date, time, courtId } = slotInfo;
      
      // Call backend API to unblock slot
      const response = await fetch('/api/unblock-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court: courtId,
          date: date,
          time_slot: time
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove blocked slot from local data for immediate UI update
        if (this.scheduleData[date] && this.scheduleData[date][courtId] && this.scheduleData[date][courtId][time]) {
          delete this.scheduleData[date][courtId][time];
          
          // Clean up empty objects
          if (Object.keys(this.scheduleData[date][courtId]).length === 0) {
            delete this.scheduleData[date][courtId];
          }
          if (Object.keys(this.scheduleData[date]).length === 0) {
            delete this.scheduleData[date];
          }
        }

        this.showSuccessToast("Slot unblocked successfully!");
        this.closeSlotModal();
        this.renderSchedule(); // Refresh the view
      } else {
        this.showErrorToast(result.message || "Failed to unblock slot");
      }
    } catch (error) {
      console.error("❌ Error unblocking slot:", error);
      this.showErrorToast("Failed to unblock slot: " + error.message);
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
    } catch (error) {
      console.error("❌ Error closing modal:", error);
    }
  }

  handleModalOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeSlotModal();
    }
  }

  ////////////////////////////////////////
  //  START - QUICK BOOOKING FUNCTIONALITY
  ////////////////////////////////////////
  // Quick book modal methods
  openQuickBookModal() {
    try {
      console.log(
        "📖 FIXED: Opening quick book modal for slot:",
        this.selectedSlot
      );

      // Check if we have either selectedSlot (old way) or booking selection (new way)
      const hasValidSelection =
        this.selectedSlot ||
        (this.startSlot && this.endSlot && this.selectedSlots.length > 0);

      if (!hasValidSelection) {
        this.showErrorToast("No slot selected for booking");
        return;
      }

      const modal = document.getElementById("quick-book-modal-overlay");
      if (!modal) {
        this.showErrorToast("Quick book modal not found");
        return;
      }

      // FIXED: Setup form with slot information
      this.setupQuickBookForm();

      // Show modal
      modal.classList.remove("hidden");
      modal.style.display = "flex";

      // Focus on first input
      const firstInput = document.getElementById("quick-player-name");
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }

      // Close slot modal
      this.closeSlotModal();

      console.log("✅ FIXED: Quick book modal opened successfully");
    } catch (error) {
      console.error("❌ FIXED: Error opening quick book modal:", error);
      this.showErrorToast("Failed to open booking form");
    }
  }

  // FIXED: Setup form with default values and validation
  setupQuickBookForm() {
    try {
      // Clear form first
      const form = document.getElementById("quick-book-form");
      if (form) {
        form.reset();
      }

      // Determine if we're using new selection method or old method
      const isNewSelection =
        this.startSlot && this.endSlot && this.selectedSlots.length > 0;

      // FIXED: Handle duration - hide dropdown if new selection, otherwise set default
      const durationSelect = document.getElementById("quick-duration");
      const durationFormGroup = durationSelect?.closest(".form-group");

      if (isNewSelection) {
        // Hide duration dropdown since we auto-calculate
        if (durationFormGroup) {
          durationFormGroup.style.display = "none";
        }
        // Show selected time range display
        const timeDisplayGroup = document.getElementById(
          "selected-time-display"
        );
        const timeRangeText = document.getElementById("time-range-text");
        if (timeDisplayGroup && timeRangeText) {
          timeDisplayGroup.style.display = "block";
          const duration = this.selectedSlots.length * 0.5;

          // Check for cross-midnight booking
          const startDate = this.getBookingDate(
            this.startSlot.date,
            this.startSlot.time
          );
          const endDate = this.getBookingDate(
            this.startSlot.date,
            this.endSlot.time
          );
          const isCrossMidnight = startDate !== endDate;

          const crossMidnightInfo = isCrossMidnight
            ? `<br><small style="color: #ff6b35; font-weight: 600;">⚠️ Cross-midnight booking (${startDate} to ${endDate})</small>`
            : "";

          timeRangeText.innerHTML = `${this.formatTime(
            this.startSlot.time
          )} - ${this.formatTime(
            this.endSlot.time
          )} (${duration} hours)${crossMidnightInfo}`;
        }
      } else if (durationSelect && this.selectedSlot?.court) {
        // Show duration dropdown for old method
        if (durationFormGroup) {
          durationFormGroup.style.display = "block";
        }
        // Hide selected time range display
        const timeDisplayGroup = document.getElementById(
          "selected-time-display"
        );
        if (timeDisplayGroup) {
          timeDisplayGroup.style.display = "none";
        }
        const courtSport = this.getCourtSport(this.selectedSlot.court);
        const defaultDurations = {
          padel: "1.5",
          cricket: "2",
          futsal: "1",
          pickleball: "1",
        };
        durationSelect.value = defaultDurations[courtSport] || "1";
      }

      // Get current court and sport info
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

      // FIXED: Set default player count based on sport
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

      // FIXED: Update modal title with slot info
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

      console.log("✅ FIXED: Quick book form setup complete");
    } catch (error) {
      console.error("❌ FIXED: Error setting up quick book form:", error);
    }
  }

  // FIXED: Get court sport from court ID
  getCourtSport(courtId) {
    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return sport;
    }
    return "unknown";
  }

  // FIXED: Enhanced handleQuickBook with proper validation and API call
  async handleQuickBook(event) {
    event.preventDefault();

    // Prevent double submission
    if (this.isSubmittingBooking) {
      console.log("⚠️ Booking submission already in progress, ignoring duplicate call");
      return;
    }

    try {
      console.log("📝 FIXED: Processing quick book form submission");
      
      // Set submission lock
      this.isSubmittingBooking = true;

      // Check if we have either selectedSlot (old way) or booking selection (new way)
      const hasValidSelection =
        this.selectedSlot ||
        (this.startSlot && this.endSlot && this.selectedSlots.length > 0);

      if (!hasValidSelection) {
        this.showErrorToast("No slot selected for booking");
        return;
      }

      // FIXED: Collect form data with validation
      const formData = await this.collectQuickBookFormData();

      // FIXED: Validate required fields
      const validationError = this.validateQuickBookData(formData);
      if (validationError) {
        this.showErrorToast(validationError);
        return;
      }

      // FIXED: Show loading state
      this.showLoadingToast("Creating booking...");

      // FIXED: Disable form to prevent double submission
      this.setQuickBookFormDisabled(true);

      console.log("📤 FIXED: Sending booking data:", formData);

      // FIXED: Make API call
      const response = await fetch("/admin/api/admin-create-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      console.log("📡 FIXED: API response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("📥 FIXED: API response:", result);

      if (result.success) {
        this.showSuccessToast(
          `Booking created successfully! ID: ${result.bookingId}`
        );
        this.closeQuickBookModal();

        // Clear booking selection state
        this.clearBookingSelectionState();

        // FIXED: Refresh schedule to show new booking
        setTimeout(() => {
          this.loadScheduleData();
        }, 500);
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("❌ FIXED: Quick book error:", error);
      this.showErrorToast("Failed to create booking: " + error.message);
    } finally {
      // FIXED: Re-enable form and reset submission lock
      this.setQuickBookFormDisabled(false);
      this.isSubmittingBooking = false;
    }
  }

  // FIXED: Collect and validate form data
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

    // Determine if we're using new selection method
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
      // NEW METHOD: Use start/end slot selection
      startTime = this.startSlot.time;
      endTime = this.endSlot.time;
      duration = this.selectedSlots.length * 0.5; // Each slot is 30 minutes
      courtId = this.startSlot.courtId;
      courtSport = this.getCourtSport(courtId);
      courtName = this.getCourtName(courtId);
      bookingDate = this.startSlot.date;

      // Handle cross-midnight bookings
      const startDate = this.getBookingDate(this.startSlot.date, startTime);
      const endDate = this.getBookingDate(this.startSlot.date, endTime);

      console.log("🌙 Cross-midnight booking check:", {
        startTime,
        endTime,
        startDate,
        endDate,
        isCrossMidnight: startDate !== endDate,
      });
    } else {
      // OLD METHOD: Use single slot + duration
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

      // Handle cross-midnight bookings for old method too
      const startDate = this.getBookingDate(this.selectedSlot.date, startTime);
      const endDate = this.getBookingDate(this.selectedSlot.date, endTime);

      console.log("🌙 Cross-midnight booking check (old method):", {
        startTime,
        endTime,
        startDate,
        endDate,
        isCrossMidnight: startDate !== endDate,
      });
    }

    // FIXED: Calculate total amount using dynamic pricing
    const totalAmount = await this.calculateBookingAmount(courtSport, courtId, bookingDate, startTime, duration);

    // Calculate actual start and end dates for cross-midnight bookings
    const actualStartDate = this.getBookingDate(bookingDate, startTime);
    const actualEndDate = this.getBookingDate(bookingDate, endTime);
    const isCrossMidnight = actualStartDate !== actualEndDate;

    return {
      // Required fields
      sport: courtSport,
      court: courtId,
      courtName: courtName,
      date: bookingDate,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      playerName: playerName,
      playerPhone: playerPhone,

      // Optional fields
      playerEmail: playerEmail,
      playerCount: playerCount,
      specialRequests: specialRequests,
      paymentType: "advance", // Default for admin bookings
      totalAmount: totalAmount,
      status: paymentStatus,

      // Cross-midnight booking information
      isCrossMidnight: isCrossMidnight,
      actualStartDate: actualStartDate,
      actualEndDate: actualEndDate,

      // FIXED: Generate selected slots array
      selectedSlots: isNewSelection
        ? this.selectedSlots
        : this.generateSelectedSlots(startTime, duration),
    };
  }

  // FIXED: Validate form data
  validateQuickBookData(data) {
    if (!data.playerName) {
      return "Player name is required";
    }

    if (data.playerName.length < 2) {
      return "Player name must be at least 2 characters long";
    }

    if (!data.playerPhone) {
      return "Phone number is required";
    }

    if (data.playerPhone.length < 10) {
      return "Please enter a valid phone number";
    }

    if (!data.duration || data.duration <= 0) {
      return "Duration must be greater than 0";
    }

    if (data.duration > 6) {
      return "Maximum duration is 6 hours";
    }

    if (!data.court || !data.date || !data.startTime) {
      return "Slot information is missing";
    }

    return null; // No validation errors
  }

  // FIXED: Calculate end time from start time and duration
  calculateEndTime(startTime, durationHours) {
    try {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + durationHours * 60;

      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;

      return `${endHours.toString().padStart(2, "0")}:${endMins
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("❌ FIXED: Error calculating end time:", error);
      return startTime;
    }
  }

  // Calculate booking amount using dynamic pricing
  async calculateBookingAmount(sport, court, date, startTime, duration) {
    try {
      // Generate time slots based on duration and start time for pricing API
      const selectedSlots = this.generateSlotsForDuration(startTime, duration);
      
      console.log("💰 Calculating dynamic price for admin schedule booking...");
      
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: court,
          booking_date: date,
          selected_slots: selectedSlots
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Dynamic price calculated: ₨${result.total_price.toLocaleString()}`);
        return result.total_price;
      } else {
        throw new Error(result.message || "Failed to calculate price");
      }
    } catch (error) {
      console.error("❌ Error calculating dynamic price:", error);
      // Fallback to hardcoded pricing
      const fallbackPricing = {
        padel: 5500,
        cricket: 3000,
        futsal: 2500,
        pickleball: 2500,
      };
      const hourlyRate = fallbackPricing[sport] || 2500;
      const amount = Math.round(hourlyRate * duration);
      console.log(`🔄 Using fallback price: ₨${amount.toLocaleString()}`);
      return amount;
    }
  }

  // Helper method to convert duration-based booking to slot-based format for pricing API
  generateSlotsForDuration(startTime, duration) {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    // Convert duration in hours to number of 30-minute slots
    const numSlots = Math.ceil(duration * 2);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    for (let i = 0; i < numSlots; i++) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push({ time: timeStr, index: i });
      
      // Move to next 30-minute slot
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute -= 60;
        currentHour += 1;
        if (currentHour >= 24) {
          currentHour = 0; // Handle cross-midnight
        }
      }
    }
    
    return slots;
  }

  // FIXED: Generate selected slots array for backend
  generateSelectedSlots(startTime, durationHours) {
    try {
      const slots = [];
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const totalSlots = Math.ceil(durationHours * 2); // Each slot is 30 minutes

      for (let i = 0; i < totalSlots; i++) {
        const slotMinutes = startHours * 60 + startMinutes + i * 30;
        const slotHours = Math.floor(slotMinutes / 60) % 24;
        const slotMins = slotMinutes % 60;

        const timeStr = `${slotHours.toString().padStart(2, "0")}:${slotMins
          .toString()
          .padStart(2, "0")}`;

        slots.push({
          time: timeStr,
          index: i,
        });
      }

      console.log("🕐 FIXED: Generated slots:", slots);
      return slots;
    } catch (error) {
      console.error("❌ FIXED: Error generating slots:", error);
      return [{ time: startTime, index: 0 }];
    }
  }

  // FIXED: Enable/disable form to prevent double submission
  setQuickBookFormDisabled(disabled) {
    const form = document.getElementById("quick-book-form");
    if (form) {
      const inputs = form.querySelectorAll("input, select, textarea, button");
      inputs.forEach((input) => {
        input.disabled = disabled;
      });

      // FIXED: Update submit button text
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        if (disabled) {
          submitBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Creating...';
        } else {
          submitBtn.innerHTML = "Create Booking";
        }
      }
    }
  }

  // FIXED: Enhanced closeQuickBookModal with proper cleanup
  closeQuickBookModal() {
    try {
      const modal = document.getElementById("quick-book-modal-overlay");
      const form = document.getElementById("quick-book-form");

      if (modal) {
        // FIXED: Animate close
        const modalContent = document.getElementById("quick-book-modal");
        if (modalContent) {
          modalContent.style.animation = "slideOutDown 0.3s ease";
        }

        setTimeout(() => {
          modal.classList.add("hidden");
          modal.style.display = "none";

          // FIXED: Reset form and modal title
          if (form) {
            form.reset();
            this.setQuickBookFormDisabled(false);
          }

          // Reset modal title
          const modalTitle = document.querySelector(
            "#quick-book-modal .modal-header h3"
          );
          if (modalTitle) {
            modalTitle.textContent = "Quick Book Slot";
          }

          // DON'T clear booking selection state when modal closes during booking process
          // Only clear if the user manually closes the modal, not during booking flow

          console.log("✅ FIXED: Quick book modal closed and cleaned up");
        }, 300);
      }
    } catch (error) {
      console.error("❌ FIXED: Error closing quick book modal:", error);
    }
  }

  // FIXED: Handle overlay click
  handleQuickBookOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeQuickBookModal();
    }
  }

  // FIXED: Enhanced error handling for quick book
  showQuickBookError(message) {
    // FIXED: Show error in modal instead of toast if modal is open
    const modal = document.getElementById("quick-book-modal-overlay");
    if (modal && !modal.classList.contains("hidden")) {
      // Remove existing error message
      const existingError = document.getElementById("quick-book-error");
      if (existingError) {
        existingError.remove();
      }

      // Add error message to modal
      const modalBody = document.querySelector("#quick-book-modal .modal-body");
      if (modalBody) {
        const errorDiv = document.createElement("div");
        errorDiv.id = "quick-book-error";
        errorDiv.style.cssText = `
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border-left: 4px solid #dc3545;
          font-size: 0.9rem;
        `;
        errorDiv.innerHTML = `
          <strong><i class="fas fa-exclamation-triangle"></i> Error:</strong> ${message}
        `;

        modalBody.insertBefore(errorDiv, modalBody.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 5000);
      }
    } else {
      // Fall back to toast if modal is not open
      this.showErrorToast(message);
    }
  }

  ////////////////////////////////////////
  //  END - QUICK BOOOKING FUNCTIONALITY
  ////////////////////////////////////////

  ////////////////////////////////////////
  //  START - BOOKING SELECTION FUNCTIONALITY
  ////////////////////////////////////////

  setupBookingControls() {
    console.log("🔧 Setting up booking controls...");

    const createBtn = document.getElementById("create-booking-btn");
    const cancelBtn = document.getElementById("cancel-booking-selection");

    if (createBtn) {
      console.log("✅ Found create booking button, adding event listener");
      createBtn.addEventListener("click", () => {
        console.log("🎯 CREATE BOOKING BUTTON CLICKED!");
        this.startBookingSelection();
      });
    } else {
      console.error("❌ CREATE BOOKING BUTTON NOT FOUND!");
    }

    if (cancelBtn) {
      console.log("✅ Found cancel booking button, adding event listener");
      cancelBtn.addEventListener("click", () => {
        console.log("🎯 CANCEL BOOKING BUTTON CLICKED!");
        this.cancelBookingSelection();
      });
    } else {
      console.error("❌ CANCEL BOOKING BUTTON NOT FOUND!");
    }
  }

  startBookingSelection() {
    console.log("📅 Starting booking selection mode");
    try {
      this.bookingMode = true;
      this.startSlot = null;
      this.endSlot = null;
      this.selectedSlots = [];
      this.currentCourt = null;

      // Show instructions
      const createBtn = document.getElementById("create-booking-btn");
      const instructions = document.getElementById("booking-instructions");
      const message = document.getElementById("instruction-message");

      if (createBtn) {
        createBtn.style.display = "none";
        console.log("✅ Hidden create booking button");
      } else {
        console.error("❌ Create booking button not found");
      }

      if (instructions) {
        instructions.style.display = "flex";
        console.log("✅ Shown booking instructions");
      } else {
        console.error("❌ Booking instructions not found");
      }

      if (message) {
        message.textContent = "Select starting time slot";
        console.log("✅ Updated instruction message");
      } else {
        console.error("❌ Instruction message not found");
      }

      // Close any open modals but don't clear booking state
      const slotModal = document.getElementById("slot-modal-overlay");
      if (slotModal) {
        slotModal.classList.add("hidden");
        slotModal.style.display = "none";
      }

      const quickModal = document.getElementById("quick-book-modal-overlay");
      if (quickModal) {
        quickModal.classList.add("hidden");
        quickModal.style.display = "none";
      }

      this.showSuccessToast(
        "Booking selection mode activated. Click on an available slot to start."
      );
      console.log("✅ Booking selection mode fully activated");
    } catch (error) {
      console.error("❌ Error in startBookingSelection:", error);
    }
  }

  cancelBookingSelection() {
    console.log("❌ Canceling booking selection mode");
    this.clearBookingSelectionState();
    this.showSuccessToast("Booking selection cancelled.");
  }

  handleSlotSelection(slotElement, slotInfo) {
    const { courtId, slotData } = slotInfo;

    // Only allow selection of available slots
    if (slotData && slotData.status !== "available") {
      this.showErrorToast("You can only select available slots for booking.");
      this.animateInvalidSlot(slotElement);
      return;
    }

    // Check if this is in day view and we need a court
    if (this.currentView === "day" && courtId === "all-courts") {
      this.showErrorToast(
        "Please switch to day view to select specific court slots."
      );
      return;
    }

    // If no start slot selected yet
    if (!this.startSlot) {
      this.selectStartSlot(slotElement, slotInfo);
    }
    // If start slot is selected, select end slot
    else if (!this.endSlot) {
      this.selectEndSlot(slotElement, slotInfo);
    }
    // If both slots are selected, reset and start over
    else {
      this.clearSlotSelections();
      this.selectStartSlot(slotElement, slotInfo);
    }
  }

  selectStartSlot(slotElement, slotInfo) {
    const { date, time, courtId } = slotInfo;

    this.startSlot = { element: slotElement, date, time, courtId };
    this.currentCourt = courtId;

    slotElement.classList.add("selection-start");

    document.getElementById("instruction-message").textContent =
      "Now select ending time slot";

    console.log("✅ Start slot selected:", { date, time, courtId });
  }

  selectEndSlot(slotElement, slotInfo) {
    const { date, time, courtId } = slotInfo;

    // Validate same court and date
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

    // Validate consecutive slots
    const slotsInBetween = this.getSlotsBetween(this.startSlot.time, time);
    if (!this.validateConsecutiveSlots(slotsInBetween, courtId, date)) {
      return;
    }

    this.endSlot = { element: slotElement, date, time, courtId };

    // Highlight all selected slots
    this.highlightSelectedSlots();

    document.getElementById("instruction-message").textContent =
      "Slots selected! Confirm booking or select different slots.";

    // Auto-open booking modal after short delay
    setTimeout(() => {
      this.openBookingModalWithSelection();
    }, 1000);

    console.log("✅ End slot selected:", { date, time, courtId });
    console.log(
      "📋 Selected range:",
      this.startSlot.time,
      "to",
      this.endSlot.time
    );
  }

  getSlotsBetween(startTime, endTime) {
    const timeSlots = this.timeSlots;
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = timeSlots.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1) {
      return [];
    }

    const [minIndex, maxIndex] =
      startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

    return timeSlots.slice(minIndex, maxIndex + 1);
  }

  validateConsecutiveSlots(slots, courtId, date) {
    // Check if all slots in between are available
    for (const time of slots) {
      const slotData = this.getSlotDataForSpecificCourt(date, time, courtId);
      if (slotData && slotData.status !== "available") {
        this.showErrorToast(
          `Slot at ${this.formatTime(
            time
          )} is not available. Please select a different range.`
        );
        return false;
      }
    }

    // Must have at least 2 slots (1 hour minimum)
    if (slots.length < 2) {
      this.showErrorToast("Minimum booking duration is 1 hour (2 slots).");
      return false;
    }

    return true;
  }

  highlightSelectedSlots() {
    this.clearSlotSelections();

    const slots = this.getSlotsBetween(this.startSlot.time, this.endSlot.time);

    slots.forEach((time, index) => {
      const slotElement = document.querySelector(
        `[data-time="${time}"][data-court="${this.currentCourt}"][data-date="${this.startSlot.date}"]`
      );

      if (slotElement) {
        if (index === 0) {
          slotElement.classList.add("selection-start");
        } else if (index === slots.length - 1) {
          slotElement.classList.add("selection-end");
        } else {
          slotElement.classList.add("selection-between");
        }
      }
    });

    // Store selected slots for booking
    this.selectedSlots = slots.map((time) => ({
      time,
      index: this.timeSlots.indexOf(time),
    }));
  }

  clearSlotSelections() {
    const allSlots = document.querySelectorAll(".time-slot");
    allSlots.forEach((slot) => {
      slot.classList.remove(
        "selection-start",
        "selection-end",
        "selection-between",
        "selection-invalid"
      );
    });
  }

  animateInvalidSlot(slotElement) {
    slotElement.classList.add("selection-invalid");
    setTimeout(() => {
      slotElement.classList.remove("selection-invalid");
    }, 500);
  }

  openBookingModalWithSelection() {
    if (!this.startSlot || !this.endSlot || this.selectedSlots.length === 0) {
      this.showErrorToast("No valid slot selection found.");
      return;
    }

    // Don't create selectedSlot for compatibility - we handle both methods now
    // Just open the quick book modal directly
    this.openQuickBookModal();

    // Note: Don't clear booking selection here - we need it for the form data
    // It will be cleared after successful booking or manual cancellation
  }

  // Copy the consecutive slots validation from customer booking
  areConsecutiveSlots(slots) {
    if (slots.length <= 1) return true;
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].index !== slots[i - 1].index + 1) {
        return false;
      }
    }
    return true;
  }

  // Clear all booking selection state
  clearBookingSelectionState() {
    console.log("🧹 CLEARING BOOKING SELECTION STATE - WHY?");
    console.trace(); // This will show us who called this function

    this.bookingMode = false;
    this.startSlot = null;
    this.endSlot = null;
    this.selectedSlots = [];
    this.currentCourt = null;
    this.selectedSlot = null; // Also clear the old selectedSlot

    // Clear visual selections
    this.clearSlotSelections();

    // Reset UI
    const createBtn = document.getElementById("create-booking-btn");
    const instructions = document.getElementById("booking-instructions");

    if (createBtn) {
      createBtn.style.display = "flex";
    }
    if (instructions) {
      instructions.style.display = "none";
    }

    console.log("🧹 Booking selection state cleared");
  }

  ////////////////////////////////////////
  //  END - BOOKING SELECTION FUNCTIONALITY
  ////////////////////////////////////////

  ////////////////////////////////////////
  //  START - EXCEL VIEW FUNCTIONALITY
  ////////////////////////////////////////

  renderExcelHeaders() {
    const headersContainer = document.getElementById("excel-court-headers");
    if (!headersContainer) return;

    headersContainer.innerHTML = "";

    // Add corner label
    const corner = document.querySelector(".excel-corner");
    if (corner) {
      corner.textContent = "Time";
    }

    const courts = this.getAllCourts();

    courts.forEach((court) => {
      const header = document.createElement("div");
      header.className = "excel-court-header";
      header.innerHTML = `
        <div style="font-size: 0.7rem; font-weight: 700; color: #495057;">${court.sport.toUpperCase()}</div>
        <div style="font-size: 0.65rem; opacity: 0.8;">${court.name}</div>
      `;
      headersContainer.appendChild(header);
    });
  }

  renderExcelTimeColumn() {
    const timeColumn = document.getElementById("excel-time-column");
    if (!timeColumn) return;

    timeColumn.innerHTML = "";
    let previousDaySection = null;

    this.timeSlots.forEach((time) => {
      const isCrossMidnight = this.isCrossMidnightSlot(time);
      const currentDaySection = isCrossMidnight ? "tomorrow" : "today";

      // Add day section header when transitioning from today to tomorrow
      if (previousDaySection !== currentDaySection && isCrossMidnight) {
        const dayHeader = document.createElement("div");
        dayHeader.className = "excel-time-header day-separator";

        // Create formatted date for tomorrow
        const tomorrowDate = new Date(this.currentDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowFormatted = tomorrowDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        dayHeader.innerHTML = `<strong>Next Day - ${tomorrowFormatted}</strong>`;
        dayHeader.style.backgroundColor = "var(--cream, #f8f9fa)";
        dayHeader.style.color = "var(--royal-green, #1b5e20)";
        dayHeader.style.fontWeight = "bold";
        dayHeader.style.fontSize = "0.75rem";
        dayHeader.style.padding = "0.5rem";
        dayHeader.style.borderRadius = "6px";
        dayHeader.style.borderLeft = "3px solid var(--royal-green, #1b5e20)";
        dayHeader.style.textAlign = "center";
        dayHeader.style.margin = "0.5rem 0";
        timeColumn.appendChild(dayHeader);
      }

      const timeHeader = document.createElement("div");
      timeHeader.className = "excel-time-header";
      timeHeader.textContent = this.formatTime(time);
      timeColumn.appendChild(timeHeader);

      previousDaySection = currentDaySection;
    });
  }

  renderExcelSlots() {
    const slotsGrid = document.getElementById("excel-slots-grid");
    if (!slotsGrid) return;

    slotsGrid.innerHTML = "";

    const courts = this.getAllCourts();
    const dateStr = this.currentDate.toISOString().split("T")[0];
    let previousDaySection = null;

    this.timeSlots.forEach((time, timeIndex) => {
      const isCrossMidnight = this.isCrossMidnightSlot(time);
      const currentDaySection = isCrossMidnight ? "tomorrow" : "today";

      // Add separator row when transitioning from today to tomorrow
      if (previousDaySection !== currentDaySection && isCrossMidnight) {
        const separatorRow = document.createElement("div");
        separatorRow.className = "excel-slot-row day-separator";
        separatorRow.style.height = "50px";
        separatorRow.style.backgroundColor = "#e9ecef";

        courts.forEach(() => {
          const separatorSlot = document.createElement("div");
          separatorSlot.className = "excel-slot";
          separatorSlot.style.backgroundColor = "#e9ecef";
          separatorSlot.style.border = "none";
          separatorSlot.style.cursor = "default";
          separatorRow.appendChild(separatorSlot);
        });

        slotsGrid.appendChild(separatorRow);
      }

      const row = document.createElement("div");
      row.className = "excel-slot-row";

      courts.forEach((court) => {
        const slot = this.createExcelSlot(dateStr, time, court.id, timeIndex);
        row.appendChild(slot);
      });

      slotsGrid.appendChild(row);
      previousDaySection = currentDaySection;
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
      const groupedBookings = this.groupConsecutiveBookings(
        this.scheduleData,
        date,
        courtId
      );
      const slotData =
        groupedBookings[time] || this.getSlotData(date, time, courtId);

      if (slotData && slotData.mergedBooking) {
        if (slotData.isGroupContinuation) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `excel-slot ${statusClass} group-continuation`;
          slot.innerHTML = `<div style="font-size: 0.6rem; opacity: 0.7;">...</div>`;
          
          // Use the same color as the header based on status
          const statusColors = {
            "booked-pending": "#ffc107",      // Yellow for reservations
            "booked-confirmed": "#28a745",    // Green for confirmed
            "booked-conflict": "#dc3545",     // Red for conflicts
            "booked-cancelled": "#6c757d",    // Gray for cancelled
            "blocked": "#6c757d"              // Gray for blocked
          };
          const statusColor = statusColors[statusClass] || "#007bff";
          slot.style.borderLeft = `4px solid ${statusColor}`;
          slot.style.borderRight = `4px solid ${statusColor}`;

          slot.addEventListener("click", () => {
            const startSlot = document.querySelector(
              `[data-time="${slotData.groupStartTime}"][data-court="${courtId}"]`
            );
            if (startSlot) startSlot.click();
          });
        } else if (slotData.isGroupStart) {
          const statusClass = slotData.status || "booked-pending";
          slot.className = `excel-slot ${statusClass} group-start`;

          const duration = slotData.groupSize * 0.5;
          
          // Check for comments  
          const hasCustomerComments = (slotData.customerComments || slotData.special_requests) && 
                                     (slotData.customerComments || slotData.special_requests).trim() !== '';
          const hasAdminComments = slotData.adminComments && slotData.adminComments.trim() !== '';
          
          // Create comment indicators
          let commentIcons = '';
          if (hasCustomerComments) {
            commentIcons += '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests" style="position: absolute; top: 1px; right: 1px; font-size: 0.5rem; color: #007bff; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 1px;"></i>';
          }
          if (hasAdminComments) {
            commentIcons += '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available" style="position: absolute; top: 1px; right: 10px; font-size: 0.5rem; color: #28a745; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 1px;"></i>';
          }

          slot.innerHTML = `
            <div style="text-align: center; padding: 0.2rem; position: relative;">
              ${commentIcons}
              <div style="font-size: 0.65rem; font-weight: 600; margin-bottom: 1px;">
                ${slotData.title || "Booked"}
              </div>                
              <div style="font-size: 0.6rem; opacity: 0.8;">
                ${duration}h
              </div>
            </div>
          `;
        }
      } else if (slotData) {
        const statusClass = slotData.status || "booked-pending";
        slot.className = `excel-slot ${statusClass}`;

        // Check for comments  
        const hasCustomerComments = (slotData.customerComments || slotData.special_requests) && 
                                   (slotData.customerComments || slotData.special_requests).trim() !== '';
        const hasAdminComments = slotData.adminComments && slotData.adminComments.trim() !== '';
        
        // Create comment indicators
        let commentIcons = '';
        if (hasCustomerComments) {
          commentIcons += '<i class="fas fa-comment-dots customer-comment-icon" title="Customer has special requests" style="position: absolute; top: 1px; right: 1px; font-size: 0.5rem; color: #007bff; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 1px;"></i>';
        }
        if (hasAdminComments) {
          commentIcons += '<i class="fas fa-comment-medical admin-comment-icon" title="Admin notes available" style="position: absolute; top: 1px; right: 10px; font-size: 0.5rem; color: #28a745; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 1px;"></i>';
        }

        slot.innerHTML = `
          <div style="text-align: center; padding: 0.2rem; position: relative;">
            ${commentIcons}
            <div style="font-size: 0.65rem; font-weight: 600;">${
              slotData.title || "Booked"
            }</div>
            ${
              slotData.subtitle
                ? `<div style="font-size: 0.6rem; opacity: 0.8;">${slotData.subtitle}</div>`
                : ""
            }
          </div>
        `;
      } else {
        slot.innerHTML = `
          <div style="text-align: center; padding: 0.2rem;">
            <div style="font-size: 0.65rem;">Available</div>
            <div style="font-size: 0.6rem; opacity: 0.6;">${this.formatTime(
              time
            )}</div>
          </div>
        `;
        slot.style.backgroundColor = "#f8f9fa";
      }

      // Add click event with booking selection support
      slot.addEventListener("click", () => {
        console.log("🖱️ Excel slot clicked:", {
          date,
          time,
          courtId,
          slotData,
        });

        if (this.bookingMode) {
          this.handleSlotSelection(slot, { date, time, courtId, slotData });
        } else {
          this.openSlotModal(slot, slotData);
        }
      });
    } catch (error) {
      console.error(
        `❌ Error creating Excel slot for ${courtId} at ${time}:`,
        error
      );
      slot.innerHTML = `<div style="color: red; font-size: 0.6rem;">Error</div>`;
      slot.style.backgroundColor = "#f8d7da";
    }

    return slot;
  }

  setupScrollSync() {
    const courtHeaders = document.getElementById("excel-court-headers");
    const slotsContainer = document.getElementById("excel-slots-container");
    const timeColumn = document.getElementById("excel-time-column");

    if (!courtHeaders || !slotsContainer || !timeColumn) return;

    let isSyncing = false;
    let animationId = null;

    // Throttled scroll sync for better performance
    const throttledSync = (callback) => {
      if (animationId) return;
      animationId = requestAnimationFrame(() => {
        callback();
        animationId = null;
      });
    };

    // Enhanced horizontal scroll sync (headers ↔ content)
    const syncHorizontal = (source, target) => {
      if (isSyncing) return;
      throttledSync(() => {
        isSyncing = true;
        target.scrollLeft = source.scrollLeft;
        setTimeout(() => { isSyncing = false; }, 16); // ~60fps
      });
    };

    // Enhanced vertical scroll sync (time column ↔ content)
    const syncVertical = (source, target) => {
      if (isSyncing) return;
      throttledSync(() => {
        isSyncing = true;
        target.scrollTop = source.scrollTop;
        setTimeout(() => { isSyncing = false; }, 16); // ~60fps
      });
    };

    // FIXED: Separate horizontal and vertical scroll synchronization
    
    // Horizontal-only sync between court headers and slots
    slotsContainer.addEventListener("scroll", () => {
      syncHorizontal(slotsContainer, courtHeaders);
    }, { passive: true });

    courtHeaders.addEventListener("scroll", () => {
      syncHorizontal(courtHeaders, slotsContainer);
    }, { passive: true });

    // Vertical-only sync between time column and slots
    slotsContainer.addEventListener("scroll", () => {
      syncVertical(slotsContainer, timeColumn);
    }, { passive: true });

    timeColumn.addEventListener("scroll", () => {
      syncVertical(timeColumn, slotsContainer);
    }, { passive: true });

    // Mobile-specific touch optimizations
    if ('ontouchstart' in window) {
      const containers = [courtHeaders, slotsContainer, timeColumn];
      
      containers.forEach(container => {
        // Improve touch scrolling momentum
        container.style.webkitOverflowScrolling = 'touch';
        container.style.overscrollBehavior = 'contain';
        
        // FIXED: Court headers should NEVER scroll vertically
        if (container === courtHeaders) {
          container.style.overflowY = 'hidden';
          container.style.overscrollBehaviorY = 'none';
          // Prevent any vertical scrolling on court headers
          container.addEventListener('scroll', (e) => {
            if (container.scrollTop !== 0) {
              container.scrollTop = 0;
            }
          }, { passive: false });
        }
        
        // Time column should NEVER scroll horizontally
        if (container === timeColumn) {
          container.style.overflowX = 'hidden';
          container.style.overscrollBehaviorX = 'none';
          // Prevent any horizontal scrolling on time column
          container.addEventListener('scroll', (e) => {
            if (container.scrollLeft !== 0) {
              container.scrollLeft = 0;
            }
          }, { passive: false });
        }
        
        // Add touch-friendly scrollbar indicators for mobile
        container.addEventListener('touchstart', () => {
          container.style.scrollbarWidth = 'thin';
        }, { passive: true });
        
        container.addEventListener('touchend', () => {
          setTimeout(() => {
            container.style.scrollbarWidth = 'none';
          }, 1000);
        }, { passive: true });
      });

      // Add smooth scroll behavior for mobile
      slotsContainer.style.scrollBehavior = 'smooth';
      courtHeaders.style.scrollBehavior = 'smooth';
      timeColumn.style.scrollBehavior = 'smooth';
    }

    // FIXED: Enforce scroll restrictions for ALL devices (not just mobile)
    this.enforceScrollRestrictions(courtHeaders, slotsContainer, timeColumn);

    // Add mobile scroll hint functionality
    this.setupMobileScrollHints();

    console.log("📱 Enhanced mobile scroll sync initialized");
  }

  enforceScrollRestrictions(courtHeaders, slotsContainer, timeColumn) {
    if (!courtHeaders || !timeColumn) return;

    // CRITICAL FIX: Court headers should ONLY scroll horizontally
    courtHeaders.style.overflowY = 'hidden';
    courtHeaders.addEventListener('scroll', () => {
      if (courtHeaders.scrollTop !== 0) {
        courtHeaders.scrollTop = 0;
      }
    }, { passive: false });

    // CRITICAL FIX: Time column should ONLY scroll vertically  
    timeColumn.style.overflowX = 'hidden';
    timeColumn.addEventListener('scroll', () => {
      if (timeColumn.scrollLeft !== 0) {
        timeColumn.scrollLeft = 0;
      }
    }, { passive: false });

    console.log("✅ Scroll restrictions enforced - Headers: horizontal only, Time: vertical only");
  }

  setupMobileScrollHints() {
    if (!('ontouchstart' in window)) return; // Only for touch devices

    const slotsContainer = document.getElementById("excel-slots-container");
    const courtHeaders = document.getElementById("excel-court-headers");
    const scrollHint = document.getElementById("mobile-scroll-hint");
    
    if (!slotsContainer || !scrollHint) return;

    let hintShown = false;
    let hintTimeout = null;

    // Show hint initially for 3 seconds
    setTimeout(() => {
      if (!hintShown) {
        scrollHint.classList.add('show');
        hintTimeout = setTimeout(() => {
          scrollHint.classList.remove('show');
        }, 3000);
      }
    }, 1000);

    // Hide hint when user starts scrolling
    const hideHint = () => {
      if (hintTimeout) clearTimeout(hintTimeout);
      scrollHint.classList.remove('show');
      hintShown = true;
    };

    slotsContainer.addEventListener('touchstart', hideHint, { passive: true });
    slotsContainer.addEventListener('scroll', hideHint, { passive: true });

    // Add scrollable indicator to court headers
    const updateScrollIndicator = () => {
      if (courtHeaders.scrollWidth > courtHeaders.clientWidth) {
        courtHeaders.classList.add('scrollable');
      } else {
        courtHeaders.classList.remove('scrollable');
      }
    };

    // Update indicator when content changes
    setTimeout(updateScrollIndicator, 500);
    window.addEventListener('resize', updateScrollIndicator);
  }

  // Update clearSlotSelections to work with both views
  clearSlotSelections() {
    // Clear desktop view selections
    const allSlots = document.querySelectorAll(".time-slot");
    allSlots.forEach((slot) => {
      slot.classList.remove(
        "selection-start",
        "selection-end",
        "selection-between",
        "selection-invalid"
      );
    });

    // Clear Excel view selections
    const excelSlots = document.querySelectorAll(".excel-slot");
    excelSlots.forEach((slot) => {
      slot.classList.remove(
        "selection-start",
        "selection-end",
        "selection-between",
        "selection-invalid"
      );
    });
  }

  ////////////////////////////////////////
  //  END - EXCEL VIEW FUNCTIONALITY
  ////////////////////////////////////////

  // Navigation methods
  navigateDate(days) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + days);
    this.currentDate = newDate;

    const dateInput = document.getElementById("schedule-date");
    if (dateInput) {
      dateInput.value = this.currentDate.toISOString().split("T")[0];
    }
    this.updateDateDisplay();
    this.loadScheduleData();
  }

  handleDateChange(event) {
    this.currentDate = new Date(event.target.value);
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
    const display = document.getElementById("date-display");
    if (!display) return;

    if (this.currentView === "week") {
      const startDate = this.getWeekStartDate(this.currentDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      display.textContent = `Week of ${startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      display.textContent = this.currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  getWeekStartDate(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return start;
  }

  handleSportFilterChange() {
    const sportFilter = document.getElementById("sport-filter")?.value;
    const weekViewBtn = document.getElementById("week-view");

    // If "All Sports" is selected (empty value), hide week view and force day view
    if (!sportFilter || sportFilter === "") {
      if (weekViewBtn) {
        weekViewBtn.style.display = "none";
      }
      // Force switch to day view if currently on week view
      if (this.currentView === "week") {
        this.switchView("day");
      }
    } else {
      // For individual sports, show both week and day view options
      if (weekViewBtn) {
        weekViewBtn.style.display = "inline-flex";
      }
    }

    this.loadScheduleData();
  }

  filterSchedule() {
    this.loadScheduleData();
  }

  refreshSchedule() {
    const btn = document.getElementById("refresh-schedule");
    const icon = btn?.querySelector("i");

    if (icon) {
      icon.style.animation = "spin 1s linear infinite";
    }

    this.loadScheduleData().finally(() => {
      if (icon) {
        icon.style.animation = "";
      }
    });
  }

  // Utility functions
  formatTime(time) {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  setElementDisplay(id, display) {
    const element = document.getElementById(id);
    if (element) element.style.display = display;
  }

  getCourtName(courtId) {
    if (courtId === "all-courts") return "All Courts";

    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return court.name;
    }

    return courtId;
  }

  getStatusText(status) {
    const statusMap = {
      available: "Available",
      "booked-pending": "Pending Payment",
      "booked-confirmed": "Confirmed",
      "booked-conflict": "Multi-Court Booking",
      "blocked": "Blocked",
    };
    return statusMap[status] || status;
  }

  // Debug function for testing block functionality
  testBlockButton() {
    console.log("🧪 Testing block button functionality...");
    const blockBtn = document.getElementById("block-slot-btn");
    console.log("Block button element:", blockBtn);
    
    if (blockBtn) {
      console.log("Block button found! Attempting to trigger click...");
      blockBtn.click();
    } else {
      console.error("Block button not found!");
    }
  }

  showLoading(show) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      if (show) {
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";
      } else {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }
    }
  }

  // FIXED: Toast notification system
  showSuccessToast(message) {
    this.showToast(message, "success", 3000);
  }

  showErrorToast(message) {
    this.showToast(message, "error", 5000);
  }

  showLoadingToast(message) {
    if (this.currentLoadingToast) {
      this.currentLoadingToast.remove();
    }
    this.currentLoadingToast = this.showToast(message, "info", 0);
  }

  showToast(message, type = "info", duration = 3000) {
    // Remove existing loading toast when showing new non-loading toast
    if (type !== "info" && this.currentLoadingToast) {
      this.currentLoadingToast.remove();
      this.currentLoadingToast = null;
    }

    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
    };

    const colorMap = {
      success: "#28a745",
      error: "#dc3545",
      info: "#17a2b8",
    };

    const isLoading = type === "info" && duration === 0;

    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${iconMap[type] || iconMap.info} ${
      isLoading ? "fa-spin" : ""
    }"></i>
        <span>${message}</span>
      </div>
      ${
        duration > 0
          ? '<button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>'
          : ""
      }
    `;

    const backgroundColor = colorMap[type] || colorMap.info;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 300px;
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight 0.3s ease";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }

    return toast;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Initializing Complete Admin Schedule Manager...");
  try {
    window.adminSchedule = new AdminScheduleManager();
    console.log("✅ AdminScheduleManager created successfully");

    // Test the create booking button after a short delay
    setTimeout(() => {
      const testBtn = document.getElementById("create-booking-btn");
      if (testBtn) {
        console.log("✅ CREATE BOOKING BUTTON FOUND IN DOM!");
        console.log("Button element:", testBtn);
        console.log("Button display:", testBtn.style.display);
        console.log("Button visible:", testBtn.offsetHeight > 0);
      } else {
        console.error("❌ CREATE BOOKING BUTTON STILL NOT FOUND!");
      }
    }, 1000);
  } catch (error) {
    console.error("❌ Error creating AdminScheduleManager:", error);
  }
});

// Global debugging functions
window.forceRefreshSchedule = function () {
  if (window.adminSchedule) {
    console.log("🔄 Force refreshing admin schedule...");
    window.adminSchedule.scheduleData = {};
    window.adminSchedule.loadScheduleData();
  } else {
    console.error("❌ Admin schedule manager not found");
  }
};

window.testBlockButton = function () {
  if (window.adminSchedule) {
    console.log("🧪 Testing block button functionality...");
    window.adminSchedule.testBlockButton();
  } else {
    console.error("❌ AdminSchedule not initialized!");
  }
};

window.testBlockFunctionality = function() {
  console.log("🧪 COMPREHENSIVE BLOCK FUNCTIONALITY TEST");
  console.log("1. Testing if adminSchedule exists:", !!window.adminSchedule);
  
  const blockBtn = document.getElementById("block-slot-btn");
  console.log("2. Block button element:", blockBtn);
  
  const availableActions = document.getElementById("available-actions");
  console.log("3. Available actions container:", availableActions);
  console.log("4. Available actions display:", availableActions ? availableActions.style.display : 'NOT FOUND');
  
  console.log("5. Testing direct blockSlotFromModal call...");
  if (window.adminSchedule) {
    try {
      window.adminSchedule.blockSlotFromModal();
    } catch (error) {
      console.error("Error in blockSlotFromModal:", error);
    }
  }
};

// Enhanced CSS for merged bookings and modal functionality
const enhancedStyle = document.createElement("style");
enhancedStyle.id = "complete-admin-schedule-style";
enhancedStyle.textContent = `
  /* Enhanced styles for merged booking slots */
  .time-slot.group-start {
    position: relative;
    z-index: 10;
  }
  
  .time-slot.group-continuation {
    border-top: none !important;
    border-bottom: none !important;
    position: relative;
    z-index: 5;
  }
  
  .time-slot.group-continuation:last-of-type {
    border-bottom: 8px solid #28a745 !important;
    border-radius: 0 0 8px 8px !important;
  }
  
  .merged-booking {
    padding: 8px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  
  .booking-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  
  .continuation-marker {
    height: 100%;
    background: linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.1) 50%, transparent 80%);
  }
  
  .time-slot.group-start:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    transition: all 0.2s ease;
  }
  
  .time-slot.group-continuation:hover {
    background: rgba(0,123,255,0.1) !important;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-overlay.hidden {
    display: none !important;
  }

  .modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  }

  .modal-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    transition: color 0.3s ease;
    padding: 4px;
    border-radius: 4px;
  }

  .close-btn:hover {
    color: #dc3545;
    background: #f8f9fa;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .info-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .info-group:last-child {
    border-bottom: none;
  }

  .info-group label {
    font-weight: 600;
    color: #555;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 15px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .booking-details {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }

  .comments-section textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9rem;
  }

  .booking-actions, .available-actions .action-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    justify-content: center;
  }

  .action-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  /* Animation keyframes */
  @keyframes slideInUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideOutDown {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(100%); opacity: 0; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    opacity: 0.8;
    transition: opacity 0.3s ease;
  }
  
  .toast-close:hover {
    opacity: 1;
  }
`;

// Only add styles if not already present
if (!document.getElementById("complete-admin-schedule-style")) {
  document.head.appendChild(enhancedStyle);
}

console.log(
  "🎯 COMPLETE: Working admin schedule with full modal functionality loaded!"
);

// FIXED: Enhanced CSS for quick book modal
const quickBookStyle = document.createElement("style");
quickBookStyle.id = "quick-book-modal-style";
quickBookStyle.textContent = `
  /* Enhanced quick book modal styles */
  #quick-book-modal {
    max-width: 600px;
    width: 95%;
  }

  #quick-book-modal .modal-header {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  #quick-book-modal .modal-header h3 {
    color: white;
  }

  #quick-book-modal .close-btn {
    color: white;
  }

  #quick-book-modal .close-btn:hover {
    color: #f8f9fa;
    background: rgba(255,255,255,0.2);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #495057;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }

  .btn-cancel {
    padding: 0.75rem 1.5rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .btn-cancel:hover {
    background: #5a6268;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    background: #218838;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
  }

  /* Form validation styles */
  .form-group input:invalid {
    border-color: #dc3545;
  }

  .form-group input:valid {
    border-color: #28a745;
  }

  /* Loading state */
  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled {
    background-color: #f8f9fa;
    opacity: 0.6;
  }
`;

if (!document.getElementById("quick-book-modal-style")) {
  document.head.appendChild(quickBookStyle);
}

console.log("🎯 FIXED: Complete quick book functionality implemented!");
