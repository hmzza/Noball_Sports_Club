// Professional Admin Booking Control System
// Clean, maintainable, and well-structured

class AdminBookingControl {
  constructor() {
    this.selectedBookings = new Set();
    this.currentEditBooking = null;
    this.currentToast = null;

    this.courtConfig = {
      padel: [
        { id: "padel-1", name: "Court 1: Purple Mondo" },
        { id: "padel-2", name: "Court 2: Teracotta Court" },
      ],
      cricket: [
        { id: "cricket-1", name: "Court 1: 110x50ft" },
        { id: "cricket-2", name: "Court 2: 130x60ft Multi" },
      ],
      futsal: [{ id: "futsal-1", name: "Court 1: 130x60ft Multi" }],
      pickleball: [{ id: "pickleball-1", name: "Court 1: Professional" }],
      axe_throw: [{ id: "axe-1", name: "Lane 1: Axe Throw" }],
      archery: [{ id: "archery-1", name: "Lane 1: Archery Range" }],
    };

    this.sportPricing = {
      cricket: 3000,
      futsal: 2500,
      padel: 5500,
      pickleball: 2500,
      axe_throw: 4000,
      archery: 3500,
    };

    this.init();
  }

  init() {
    this.initializeBookingControl();
    this.setupEventListeners();
    this.checkUrlParams();
  }

  initializeBookingControl() {
    // Set default dates
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach((input) => {
      if (!input.value) {
        input.value = today.toISOString().split("T")[0];
      }
      input.min = today.toISOString().split("T")[0];
      input.max = maxDate.toISOString().split("T")[0];
    });

    this.setupCourtDropdowns();
  }

  setupEventListeners() {
    // Action cards
    this.addEventListener("create-booking-card", "click", () =>
      this.showSection("create-booking-section")
    );
    this.addEventListener("search-booking-card", "click", () =>
      this.showSection("search-booking-section")
    );
    this.addEventListener("bulk-operations-card", "click", () =>
      this.showSection("bulk-operations-section")
    );

    // Close section buttons
    document.querySelectorAll(".close-section-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const section = e.target.closest(".close-section-btn").dataset.section;
        this.closeSection(section);
      });
    });

    // Create booking form
    this.addEventListener("create-sport", "change", () =>
      this.updateCourtOptions()
    );
    this.addEventListener("create-court", "change", () =>
      this.calculateAmount()
    );
    this.addEventListener("create-date", "change", () =>
      this.calculateAmount()
    );
    this.addEventListener("create-start-time", "change", () =>
      this.calculateAmount()
    );
    this.addEventListener("create-duration", "change", () =>
      this.calculateAmount()
    );
    this.addEventListener("create-booking-form", "submit", (e) =>
      this.handleCreateBooking(e)
    );

    // Search methods
    document.querySelectorAll(".search-method").forEach((method) => {
      method.addEventListener("click", (e) => {
        const methodType = e.target.closest(".search-method").dataset.method;
        this.switchSearchMethod(methodType);
      });
    });

    // Search forms
    this.addEventListener("booking-id-input", "keypress", (e) => {
      if (e.key === "Enter") this.searchBookingById();
    });
    this.addEventListener("phone-input", "keypress", (e) => {
      if (e.key === "Enter") this.searchBookingByPhone();
    });
    this.addEventListener("name-input", "keypress", (e) => {
      if (e.key === "Enter") this.searchBookingByName();
    });

    // Bulk operations
    const bulkDateFrom = document.getElementById("bulk-date-from");
    const bulkDateTo = document.getElementById("bulk-date-to");
    if (bulkDateFrom)
      bulkDateFrom.value = new Date().toISOString().split("T")[0];
    if (bulkDateTo)
      bulkDateTo.value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Modal controls
    this.addEventListener("close-edit-modal", "click", () =>
      this.closeEditModal()
    );
    this.addEventListener("edit-booking-form", "submit", (e) =>
      this.handleUpdateBooking(e)
    );
    this.addEventListener("edit-sport", "change", () =>
      this.updateEditCourtOptions()
    );

    // Confirmation modal
    this.addEventListener("confirmation-modal-overlay", "click", (e) =>
      this.handleConfirmationOverlayClick(e)
    );

    console.log("✅ Admin Booking Control initialized");
  }

  addEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    } else {
      console.warn(`⚠️ Element not found: ${id}`);
    }
  }

  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get("booking");
    if (bookingId) {
      console.log(`🔗 URL parameter found: booking=${bookingId}`);
      this.searchBookingById(bookingId);
      this.showSection("search-booking-section");
    }
  }

  setupCourtDropdowns() {
    const createCourtSelect = document.getElementById("create-court");
    const editCourtSelect = document.getElementById("edit-court");

    if (createCourtSelect)
      createCourtSelect.innerHTML = '<option value="">Select Court</option>';
    if (editCourtSelect)
      editCourtSelect.innerHTML = '<option value="">Select Court</option>';
  }

  updateCourtOptions() {
    const sportSelect = document.getElementById("create-sport");
    const courtSelect = document.getElementById("create-court");

    if (!sportSelect || !courtSelect) return;

    const sport = sportSelect.value;
    courtSelect.innerHTML = '<option value="">Select Court</option>';

    if (sport && this.courtConfig[sport]) {
      this.courtConfig[sport].forEach((court) => {
        const option = document.createElement("option");
        option.value = court.id;
        option.textContent = court.name;
        courtSelect.appendChild(option);
      });
    }

    this.calculateAmount();
  }

  updateEditCourtOptions() {
    const sportSelect = document.getElementById("edit-sport");
    const courtSelect = document.getElementById("edit-court");

    if (!sportSelect || !courtSelect) return;

    const sport = sportSelect.value;
    courtSelect.innerHTML = '<option value="">Select Court</option>';

    if (sport && this.courtConfig[sport]) {
      this.courtConfig[sport].forEach((court) => {
        const option = document.createElement("option");
        option.value = court.id;
        option.textContent = court.name;
        courtSelect.appendChild(option);
      });
    }
  }

  async calculateAmount() {
    const sportSelect = document.getElementById("create-sport");
    const courtSelect = document.getElementById("create-court");
    const dateInput = document.getElementById("create-date");
    const startTimeInput = document.getElementById("create-start-time");
    const durationInput = document.getElementById("create-duration");
    const amountInput = document.getElementById("create-amount");

    if (!sportSelect || !durationInput || !amountInput || !courtSelect || !dateInput || !startTimeInput) return;

    const sport = sportSelect.value;
    const court = courtSelect.value;
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const duration = parseFloat(durationInput.value) || 0;

    if (sport && court && date && startTime && duration > 0) {
      try {
        // Generate time slots based on duration and start time
        const selectedSlots = this.generateSlotsForDuration(startTime, duration);
        
        console.log("💰 Calculating dynamic price for admin booking...");
        
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
          amountInput.value = result.total_price;
          console.log(`✅ Dynamic price calculated: ₨${result.total_price.toLocaleString()}`);
        } else {
          throw new Error(result.message || "Failed to calculate price");
        }
      } catch (error) {
        console.error("❌ Error calculating dynamic price:", error);
        // Fallback to hardcoded pricing
        const hourlyRate = this.sportPricing[sport] || 2500;
        const amount = Math.round(hourlyRate * duration);
        amountInput.value = amount;
        console.log(`🔄 Using fallback price: ₨${amount.toLocaleString()}`);
      }
    } else {
      amountInput.value = "";
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

  // Section Management
  showSection(sectionId) {
    console.log(`📖 Showing section: ${sectionId}`);

    // Hide all sections
    document.querySelectorAll(".section-card").forEach((section) => {
      section.style.display = "none";
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.style.display = "block";
      targetSection.scrollIntoView({ behavior: "smooth" });
    } else {
      console.error(`❌ Section not found: ${sectionId}`);
    }
  }

  closeSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = "none";

      // Clear forms when closing
      const forms = section.querySelectorAll("form");
      forms.forEach((form) => form.reset());

      // Clear search results
      const resultsContainer = document.getElementById("results-container");
      if (resultsContainer) resultsContainer.innerHTML = "";

      const searchResults = document.getElementById("search-results");
      if (searchResults) searchResults.style.display = "none";
    }
  }

  // Create Booking
  async handleCreateBooking(event) {
    event.preventDefault();

    try {
      const bookingData = {
        sport: this.getElementValue("create-sport"),
        court: this.getElementValue("create-court"),
        date: this.getElementValue("create-date"),
        startTime: this.getElementValue("create-start-time"),
        duration: parseFloat(this.getElementValue("create-duration")),
        playerName: this.getElementValue("create-player-name"),
        playerPhone: this.getElementValue("create-player-phone"),
        playerEmail: this.getElementValue("create-player-email"),
        playerCount: this.getElementValue("create-player-count"),
        status: this.getElementValue("create-status"),
        paymentType: this.getElementValue("create-payment-type"),
        specialRequests: this.getElementValue("create-special-requests"),
      };

      // Validate required fields
      const requiredFields = [
        "sport",
        "court",
        "date",
        "startTime",
        "duration",
        "playerName",
        "playerPhone",
      ];
      for (const field of requiredFields) {
        if (!bookingData[field]) {
          this.showErrorToast(
            `Please fill in the ${field
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()} field`
          );
          return;
        }
      }

      this.showLoadingToast("Creating booking...");

      const response = await fetch("/admin/api/admin-create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast(
          `Booking created successfully! ID: ${result.bookingId}`
        );
        event.target.reset();
        this.calculateAmount();
      } else {
        throw new Error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("❌ Create booking error:", error);
      this.showErrorToast("Failed to create booking: " + error.message);
    }
  }

  // Search Functions
  switchSearchMethod(method) {
    console.log(`🔍 Switching to search method: ${method}`);

    // Update active method
    document.querySelectorAll(".search-method").forEach((m) => {
      m.classList.toggle("active", m.dataset.method === method);
    });

    // Show corresponding form
    document.querySelectorAll(".search-form").forEach((form) => {
      form.classList.toggle("active", form.id === `search-by-${method}`);
    });

    // Clear previous results
    const searchResults = document.getElementById("search-results");
    if (searchResults) searchResults.style.display = "none";
  }

  async searchBookingById(bookingId = null) {
    const id = bookingId || this.getElementValue("booking-id-input").trim();
    if (!id) {
      this.showErrorToast("Please enter a booking ID");
      return;
    }

    await this.performSearch("id", id);
  }

  async searchBookingByPhone() {
    const phone = this.getElementValue("phone-input").trim();
    if (!phone) {
      this.showErrorToast("Please enter a phone number");
      return;
    }

    await this.performSearch("phone", phone);
  }

  async searchBookingByName() {
    const name = this.getElementValue("name-input").trim();
    if (!name) {
      this.showErrorToast("Please enter a player name");
      return;
    }

    await this.performSearch("name", name);
  }

  async searchBookingByDate() {
    const startDate = this.getElementValue("start-date");
    const endDate = this.getElementValue("end-date");

    if (!startDate || !endDate) {
      this.showErrorToast("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      this.showErrorToast("Start date must be before end date");
      return;
    }

    await this.performSearch("date", null, startDate, endDate);
  }

  async performSearch(method, value, startDate = null, endDate = null) {
    try {
      this.showLoadingToast("Searching...");

      const searchData = { method };

      if (method === "date") {
        searchData.startDate = startDate;
        searchData.endDate = endDate;
      } else {
        searchData.value = value;
      }

      console.log("🔍 Performing search:", searchData);

      const response = await fetch("/admin/api/search-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchData),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Search completed: ${result.bookings.length} results`);
        this.displaySearchResults(result.bookings);
        this.hideLoadingToast();
      } else {
        throw new Error(result.message || "Search failed");
      }
    } catch (error) {
      console.error("❌ Search error:", error);
      this.showErrorToast("Search failed: " + error.message);
    }
  }

  displaySearchResults(bookings) {
    const resultsContainer = document.getElementById("results-container");
    const searchResults = document.getElementById("search-results");

    if (!resultsContainer || !searchResults) {
      console.error("❌ Search results containers not found");
      return;
    }

    if (bookings.length === 0) {
      resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6c757d;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No bookings found matching your criteria.</p>
                </div>
            `;
    } else {
      resultsContainer.innerHTML = bookings
        .map((booking) => this.createResultItem(booking))
        .join("");
    }

    searchResults.style.display = "block";
  }

  createResultItem(booking) {
    const statusClass = booking.status.replace("_", "-");
    const statusText = this.getStatusText(booking.status);

    return `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-title">Booking #${booking.id}</div>
                    <span class="result-status status-${statusClass}">${statusText}</span>
                </div>
                
                <div class="result-details">
                    <div class="result-detail">
                        <div class="result-detail-label">Player</div>
                        <div class="result-detail-value">${
                          booking.playerName || "N/A"
                        }</div>
                    </div>
                    <div class="result-detail">
                        <div class="result-detail-label">Phone</div>
                        <div class="result-detail-value">${
                          booking.playerPhone || "N/A"
                        }</div>
                    </div>
                    <div class="result-detail">
                        <div class="result-detail-label">Sport & Court</div>
                        <div class="result-detail-value">${(
                          booking.sport || "Unknown"
                        ).toUpperCase()} - ${
      booking.courtName || "Unknown"
    }</div>
                    </div>
                    <div class="result-detail">
                        <div class="result-detail-label">Date & Time</div>
                        <div class="result-detail-value">${
                          booking.formatted_time || "N/A"
                        }</div>
                    </div>
                    <div class="result-detail">
                        <div class="result-detail-label">Amount</div>
                        <div class="result-detail-value">
                            PKR ${(booking.totalAmount || 0).toLocaleString()}
                            ${booking.promo_code ? `
                                <br><span style="color: #28a745; font-weight: 600; font-size: 0.85em;">
                                    🎟️ ${booking.promo_code} (-PKR ${(booking.discount_amount || 0).toLocaleString()})
                                </span>` : ''}
                        </div>
                    </div>
                    <div class="result-detail">
                        <div class="result-detail-label">Duration</div>
                        <div class="result-detail-value">${
                          booking.duration || 0
                        }h</div>
                    </div>
                    ${booking.special_requests ? `
                    <div class="result-detail">
                        <div class="result-detail-label">Customer Request</div>
                        <div class="result-detail-value" style="font-style: italic; color: #6c757d;">
                            <i class="fas fa-comment-dots"></i> ${booking.special_requests}
                        </div>
                    </div>` : ''}
                    ${booking.admin_comments ? `
                    <div class="result-detail">
                        <div class="result-detail-label">Admin Comments</div>
                        <div class="result-detail-value" style="font-style: italic; color: #28a745;">
                            <i class="fas fa-user-shield"></i> ${booking.admin_comments}
                        </div>
                    </div>` : ''}
                </div>
                
                <div class="result-actions">
                    <button class="result-action-btn edit-result-btn" onclick="window.adminBookingControl.openEditModal('${
                      booking.id
                    }')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="result-action-btn delete-result-btn" onclick="window.adminBookingControl.deleteBooking('${
                      booking.id
                    }')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${
                      booking.status === "pending_payment"
                        ? `
                        <button class="result-action-btn confirm-result-btn" onclick="window.adminBookingControl.confirmBooking('${booking.id}')">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                    `
                        : ""
                    }
                    ${
                      booking.status === "confirmed"
                        ? `
                        <button class="result-action-btn cancel-result-btn" onclick="window.adminBookingControl.cancelBooking('${booking.id}')">
                            <i class="fas fa-ban"></i> Cancel
                        </button>
                    `
                        : ""
                    }
                </div>
            </div>
        `;
  }

  // Booking Actions
  async confirmBooking(bookingId) {
    await this.performBookingAction(
      bookingId,
      "confirm",
      "confirm this booking"
    );
  }

  async cancelBooking(bookingId) {
    await this.performBookingAction(bookingId, "cancel", "cancel this booking");
  }

  async deleteBooking(bookingId) {
    this.showConfirmationModal(
      "Delete Booking",
      "Are you sure you want to delete this booking? This action cannot be undone.",
      () => this.performDeleteBooking(bookingId)
    );
  }

  async performBookingAction(bookingId, action, confirmText) {
    const confirmed = confirm(`Are you sure you want to ${confirmText}?`);
    if (!confirmed) return;

    try {
      this.showLoadingToast(
        `${action.charAt(0).toUpperCase() + action.slice(1)}ing booking...`
      );

      const response = await fetch("/admin/api/admin-booking-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast(`Booking ${action}ed successfully!`);
        // Refresh search results
        this.performSearch("id", bookingId);
      } else {
        throw new Error(result.message || `Failed to ${action} booking`);
      }
    } catch (error) {
      console.error(`❌ ${action} booking error:`, error);
      this.showErrorToast(`Failed to ${action} booking: ` + error.message);
    }
  }

  async performDeleteBooking(bookingId) {
    try {
      this.showLoadingToast("Deleting booking...");

      const response = await fetch("/admin/api/delete-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking deleted successfully!");

        // Remove from results
        const resultItems = document.querySelectorAll(".result-item");
        resultItems.forEach((item) => {
          if (item.innerHTML.includes(`Booking #${bookingId}`)) {
            item.remove();
          }
        });

        // Check if no results left
        const remainingResults = document.querySelectorAll(".result-item");
        if (remainingResults.length === 0) {
          const resultsContainer = document.getElementById("results-container");
          if (resultsContainer) {
            resultsContainer.innerHTML = `
                            <div style="text-align: center; padding: 2rem; color: #6c757d;">
                                <p>No bookings found.</p>
                            </div>
                        `;
          }
        }
      } else {
        throw new Error(result.message || "Failed to delete booking");
      }
    } catch (error) {
      console.error("❌ Delete booking error:", error);
      this.showErrorToast("Failed to delete booking: " + error.message);
    }
  }

  // Utility Functions
  getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
  }

  getStatusText(status) {
    const statusMap = {
      pending_payment: "Pending Payment",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  }

  getCourtName(courtId) {
    for (const sport in this.courtConfig) {
      const court = this.courtConfig[sport].find((c) => c.id === courtId);
      if (court) return court.name;
    }
    return courtId;
  }

  // Modal Functions
  async openEditModal(bookingId) {
    try {
      this.showLoadingToast("Loading booking details...");

      const response = await fetch("/admin/api/search-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "id", value: bookingId }),
      });

      const result = await response.json();

      if (result.success && result.bookings.length > 0) {
        const booking = result.bookings[0];
        this.populateEditForm(booking);

        const modal = document.getElementById("edit-booking-modal-overlay");
        if (modal) {
          modal.classList.add("show");
        }
        this.hideLoadingToast();
      } else {
        throw new Error("Booking not found");
      }
    } catch (error) {
      console.error("❌ Edit modal error:", error);
      this.showErrorToast("Failed to load booking details: " + error.message);
    }
  }

  populateEditForm(booking) {
    this.currentEditBooking = booking;

    const fields = {
      "edit-booking-id": booking.id,
      "edit-sport": booking.sport,
      "edit-court": booking.court,
      "edit-date": booking.date,
      "edit-start-time": booking.startTime,
      "edit-duration": booking.duration,
      "edit-player-name": booking.playerName,
      "edit-player-phone": booking.playerPhone,
      "edit-player-email": booking.playerEmail || "",
      "edit-player-count": booking.playerCount || "2",
      "edit-status": booking.status,
      "edit-total-amount": booking.totalAmount,
      "edit-special-requests": booking.specialRequests || "",
      "edit-admin-comments": booking.admin_comments || booking.adminComments || "",
    };

    // Handle promo code information
    const promoSection = document.getElementById("edit-promo-section");
    const originalAmountSection = document.getElementById("edit-original-amount-section");
    
    if (booking.promo_code) {
      // Show promo code fields
      promoSection.style.display = "flex";
      document.getElementById("edit-promo-code").value = booking.promo_code;
      document.getElementById("edit-discount-amount").value = booking.discount_amount || 0;
      
      if (booking.original_amount) {
        originalAmountSection.style.display = "flex";
        document.getElementById("edit-original-amount").value = booking.original_amount;
      } else {
        originalAmountSection.style.display = "none";
      }
    } else {
      // Hide promo code fields
      promoSection.style.display = "none";
      originalAmountSection.style.display = "none";
    }

    // Update court options first
    this.updateEditCourtOptions();

    // Populate all fields
    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value;
      }
    });
  }

  closeEditModal() {
    const modal = document.getElementById("edit-booking-modal-overlay");
    const form = document.getElementById("edit-booking-form");

    if (modal) modal.classList.remove("show");
    if (form) form.reset();

    this.currentEditBooking = null;
  }

  async handleUpdateBooking(event) {
    event.preventDefault();

    try {
      const bookingData = {
        bookingId: this.getElementValue("edit-booking-id"),
        playerName: this.getElementValue("edit-player-name"),
        playerPhone: this.getElementValue("edit-player-phone"),
        playerEmail: this.getElementValue("edit-player-email"),
        playerCount: this.getElementValue("edit-player-count"),
        status: this.getElementValue("edit-status"),
        totalAmount: parseInt(this.getElementValue("edit-total-amount")),
        adminComments: this.getElementValue("edit-admin-comments"),
      };

      this.showLoadingToast("Updating booking...");

      const response = await fetch("/admin/api/update-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast("Booking updated successfully!");
        this.closeEditModal();

        // Refresh search results if visible
        const searchResults = document.getElementById("search-results");
        if (searchResults && searchResults.style.display !== "none") {
          this.performSearch("id", bookingData.bookingId);
        }
      } else {
        throw new Error(result.message || "Failed to update booking");
      }
    } catch (error) {
      console.error("❌ Update booking error:", error);
      this.showErrorToast("Failed to update booking: " + error.message);
    }
  }

  // Confirmation Modal
  showConfirmationModal(title, message, onConfirm) {
    const titleEl = document.getElementById("confirmation-title");
    const messageEl = document.getElementById("confirmation-message");
    const confirmBtn = document.getElementById("confirm-action-btn");
    const overlay = document.getElementById("confirmation-modal-overlay");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        this.closeConfirmationModal();
        onConfirm();
      };
    }

    if (overlay) overlay.classList.add("show");
  }

  closeConfirmationModal() {
    const overlay = document.getElementById("confirmation-modal-overlay");
    if (overlay) overlay.classList.remove("show");
  }

  handleConfirmationOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.closeConfirmationModal();
    }
  }

  // Toast Functions
  showLoadingToast(message) {
    this.showToast(message, "info", 0);
  }

  showSuccessToast(message) {
    this.showToast(message, "success", 3000);
  }

  showErrorToast(message) {
    this.showToast(message, "error", 5000);
  }

  hideLoadingToast() {
    if (
      this.currentToast &&
      this.currentToast.classList.contains("toast-info")
    ) {
      this.currentToast.remove();
      this.currentToast = null;
    }
  }

  showToast(message, type = "info", duration = 3000) {
    // Remove existing toast
    if (this.currentToast) {
      this.currentToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
      warning: "fa-exclamation-triangle",
    };

    const colorMap = {
      success: "#28a745",
      error: "#dc3545",
      info: "#17a2b8",
      warning: "#ffc107",
    };

    toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${iconMap[type] || iconMap.info}"></i>
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
    this.currentToast = toast;

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOutRight 0.3s ease";
          setTimeout(() => {
            toast.remove();
            if (this.currentToast === toast) this.currentToast = null;
          }, 300);
        }
      }, duration);
    }
  }

  // Bulk Operations Methods
  async loadBulkBookings() {
    try {
      this.showLoadingToast("Loading bookings...");
      
      const filters = {
        status: document.getElementById('bulk-status')?.value || '',
        sport: document.getElementById('bulk-sport')?.value || '',
        dateFrom: document.getElementById('bulk-date-from')?.value || '',
        dateTo: document.getElementById('bulk-date-to')?.value || ''
      };

      const response = await fetch("/admin/api/bulk-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      const result = await response.json();

      if (result.success) {
        this.displayBulkResults(result.bookings);
        this.showSuccessToast(`Found ${result.bookings.length} bookings`);
      } else {
        throw new Error(result.message || "Failed to load bookings");
      }
    } catch (error) {
      console.error("❌ Load bulk bookings error:", error);
      this.showErrorToast("Failed to load bookings: " + error.message);
    }
  }

  displayBulkResults(bookings) {
    const resultsContainer = document.getElementById('bulk-results');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (!resultsContainer) return;

    if (bookings.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No bookings found matching the criteria</div>';
      if (bulkActions) bulkActions.style.display = 'none';
      return;
    }

    let html = '<div class="bulk-bookings-list">';
    bookings.forEach(booking => {
      html += `
        <div class="booking-item">
          <input type="checkbox" class="booking-select" value="${booking.id}" onchange="updateSelectedCount()">
          <div class="booking-info">
            <div class="booking-header">
              <span class="booking-id">${booking.id}</span>
              <span class="booking-status status-${booking.status.replace('_', '-')}">${booking.status}</span>
            </div>
            <div class="booking-details">
              ${booking.player_name} • ${booking.sport} • ${booking.court_name} • ${booking.date} ${booking.time}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    resultsContainer.innerHTML = html;
    if (bulkActions) bulkActions.style.display = 'block';
    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.booking-select:checked');
    const countElement = document.getElementById('selected-count');
    if (countElement) {
      countElement.textContent = checkboxes.length;
    }
  }

  bulkConfirm() {
    const selectedBookings = Array.from(document.querySelectorAll('.booking-select:checked')).map(cb => cb.value);
    if (selectedBookings.length === 0) {
      this.showErrorToast("Please select bookings to confirm");
      return;
    }
    
    this.showConfirmationModal(
      "Confirm Bookings",
      `Are you sure you want to confirm ${selectedBookings.length} selected booking(s)?`,
      () => this.performBulkAction('confirm', selectedBookings)
    );
  }

  bulkCancel() {
    const selectedBookings = Array.from(document.querySelectorAll('.booking-select:checked')).map(cb => cb.value);
    if (selectedBookings.length === 0) {
      this.showErrorToast("Please select bookings to cancel");
      return;
    }
    
    this.showConfirmationModal(
      "Cancel Bookings",
      `Are you sure you want to cancel ${selectedBookings.length} selected booking(s)?`,
      () => this.performBulkAction('cancel', selectedBookings)
    );
  }

  bulkDelete() {
    const selectedBookings = Array.from(document.querySelectorAll('.booking-select:checked')).map(cb => cb.value);
    if (selectedBookings.length === 0) {
      this.showErrorToast("Please select bookings to delete");
      return;
    }
    
    this.showConfirmationModal(
      "Delete Bookings",
      `Are you sure you want to delete ${selectedBookings.length} selected booking(s)? This action cannot be undone.`,
      () => this.performBulkAction('delete', selectedBookings)
    );
  }

  async performBulkAction(action, bookingIds) {
    try {
      this.showLoadingToast(`${action}ing ${bookingIds.length} bookings...`);

      const response = await fetch("/admin/api/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, bookingIds }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessToast(`Successfully ${action}ed ${bookingIds.length} bookings`);
        this.loadBulkBookings(); // Refresh the list
      } else {
        throw new Error(result.message || `Failed to ${action} bookings`);
      }
    } catch (error) {
      console.error(`❌ Bulk ${action} error:`, error);
      this.showErrorToast(`Failed to ${action} bookings: ` + error.message);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing Admin Booking Control...");
  window.adminBookingControl = new AdminBookingControl();
});

// Global functions for HTML onclick handlers
window.closeConfirmationModal = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.closeConfirmationModal();
  }
};

window.closeEditModal = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.closeEditModal();
  }
};

window.closeSection = function(sectionId) {
  if (window.adminBookingControl) {
    window.adminBookingControl.hideSection(sectionId);
  }
};

// Global functions for search operations
window.searchBookingById = function() {
  if (window.adminBookingControl) {
    const input = document.getElementById('booking-id-input');
    if (input && input.value.trim()) {
      window.adminBookingControl.performSearch('id', input.value.trim());
    }
  }
};

window.searchBookingByPhone = function() {
  if (window.adminBookingControl) {
    const input = document.getElementById('phone-input');
    if (input && input.value.trim()) {
      window.adminBookingControl.performSearch('phone', input.value.trim());
    }
  }
};

window.searchBookingByName = function() {
  if (window.adminBookingControl) {
    const input = document.getElementById('name-input');
    if (input && input.value.trim()) {
      window.adminBookingControl.performSearch('name', input.value.trim());
    }
  }
};

window.searchBookingByDate = function() {
  if (window.adminBookingControl) {
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    if (startDate && endDate && startDate.value && endDate.value) {
      window.adminBookingControl.performSearch('date', null, startDate.value, endDate.value);
    }
  }
};

// Global functions for bulk operations
window.loadBulkBookings = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.loadBulkBookings();
  }
};

window.bulkConfirm = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.bulkConfirm();
  }
};

window.bulkCancel = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.bulkCancel();
  }
};

window.bulkDelete = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.bulkDelete();
  }
};

window.updateSelectedCount = function() {
  if (window.adminBookingControl) {
    window.adminBookingControl.updateSelectedCount();
  }
};

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
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
document.head.appendChild(style);
