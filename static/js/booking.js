// Professional Booking System JavaScript
// Clean, maintainable, and well-structured

class BookingSystem {
  constructor() {
    this.currentStep = 1;
    this.bookingData = {
      sport: "",
      court: "",
      courtName: "",
      date: "",
      startTime: "",
      endTime: "",
      duration: 0,
      selectedSlots: [],
      playerName: "",
      playerPhone: "",
      playerEmail: "",
      playerCount: "2",
      specialRequests: "",
      paymentType: "advance",
      totalAmount: 0,
      originalAmount: 0,
      discountAmount: 0,
      promoCode: "",
    };

    this.sportPricing = {
      cricket: 3000,
      futsal: 2500,
      padel: 5500,
      pickleball: 2500,
    };

    this.pricingInfo = null;
    this.timingInfo = null;

    this.timeSlots = this.generateTimeSlots();
    this.multiPurposeCourts = {
      "cricket-2": "multi-130x60",
      "futsal-1": "multi-130x60",
    };

    this.init();
  }

  generateTimeSlots() {
    const slots = [];

    // Arena operates from 2pm (14:00) to 6am (06:00) next day
    // Day 1 (2 PM to 11:30 PM) - Same day
    for (let hour = 14; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }

    // Day 2 (12 AM to 5:30 AM) - Next day (cross-midnight)
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
  calculateActualDate(selectedCalendarDate, timeString) {
    const baseDate = new Date(selectedCalendarDate);
    
    // If the time slot is a cross-midnight slot (12:00 AM - 5:30 AM), 
    // it belongs to the next day
    if (this.isCrossMidnightSlot(timeString)) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
    
    return baseDate.toISOString().split("T")[0];
  }

  getBookingDate(selectedDate, timeString) {
    // Keep this method for backward compatibility
    return this.calculateActualDate(selectedDate, timeString);
  }

  init() {
    this.initializeDateSelector();
    this.setupEventListeners();
    this.updateProgressBar();
    this.initEmailJS();
    this.loadPricingInfo();
  }

  initEmailJS() {
    if (typeof emailjs !== "undefined") {
      emailjs.init("uZNZEybypHzeY8duz");
    }
  }

  async loadPricingInfo() {
    try {
      console.log("💰 Loading pricing information...");
      
      const response = await fetch("/api/pricing-info", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.pricingInfo = result.pricing;
        this.timingInfo = result.timing_info;
        this.addPricingStyles();
        console.log("✅ Pricing information loaded successfully");
      } else {
        console.error("❌ Failed to load pricing info:", result.message);
      }
    } catch (error) {
      console.error("❌ Error loading pricing info:", error);
      // Continue with fallback pricing if API fails
    }
  }

  addPricingStyles() {
    // Add pricing styles if not already added
    if (!document.getElementById('pricing-info-styles')) {
      const style = document.createElement('style');
      style.id = 'pricing-info-styles';
      style.textContent = `
        .pricing-info {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        
        .pricing-details {
          margin-top: 10px;
        }
        
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid #e9ecef;
        }
        
        .price-row:last-child {
          border-bottom: none;
        }
        
        .price-label {
          font-weight: 500;
          color: #495057;
          font-size: 14px;
        }
        
        .price-value {
          font-weight: bold;
          color: #28a745;
          font-size: 14px;
        }
        
        .pricing-info p {
          margin: 0 0 10px 0;
          font-weight: 600;
          color: #343a40;
        }
        
        /* Promo Code Styles */
        .promo-code-section {
          margin: 20px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }
        
        .promo-code-section h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 1.2rem;
        }
        
        .promo-input-container {
          max-width: 400px;
        }
        
        .input-group {
          display: flex;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .input-group .form-control {
          flex: 1;
          border: 1px solid #ced4da;
          padding: 10px 15px;
          border-right: none;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .input-group .form-control:focus {
          border-color: #007bff;
          box-shadow: none;
          outline: none;
        }
        
        .input-group .btn {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
          padding: 10px 20px;
          white-space: nowrap;
        }
        
        .promo-message {
          margin-top: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .promo-message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .promo-message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .promo-applied {
          margin-top: 15px;
        }
        
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          margin: 0;
        }
        
        .alert-success {
          background: #d4edda;
          color: #155724;
        }
        
        .summary-row.discount {
          color: #28a745;
          font-weight: 600;
        }
        
        .summary-row.final-total {
          border-top: 2px solid #007bff;
          padding-top: 10px;
          margin-top: 10px;
          font-size: 1.1rem;
        }
      `;
      document.head.appendChild(style);
    }
  }

  initializeDateSelector() {
    const dateInput = document.getElementById("booking-date");
    if (!dateInput) return;

    // Get current date using a more reliable method
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    // Calculate max date (30 days from today)
    const maxDate = new Date();
    maxDate.setDate(now.getDate() + 30);
    const maxYear = maxDate.getFullYear();
    const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxDay = String(maxDate.getDate()).padStart(2, '0');
    const maxDateString = `${maxYear}-${maxMonth}-${maxDay}`;

    dateInput.min = todayString;
    dateInput.max = maxDateString;
    dateInput.value = todayString;

    this.bookingData.date = dateInput.value;
    
    console.log("📅 Date initialized:", {
      todayString,
      currentDate: now.toLocaleDateString(),
      currentTime: now.toLocaleTimeString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  setupEventListeners() {
    // Sport and court selection with better mobile support
    document.querySelectorAll(".sport-card").forEach((card) => {
      card.addEventListener("click", (e) => this.selectSport(e));
      // Add touch event for better mobile support
      card.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.selectSport(e);
      });
    });

    // Date change
    const dateInput = document.getElementById("booking-date");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        this.bookingData.date = e.target.value;
        this.loadTimeSlots();
      });
    }

    // Navigation buttons
    document.querySelectorAll(".next-step").forEach((btn) => {
      btn.addEventListener("click", () => this.nextStep());
    });

    document.querySelectorAll(".prev-step").forEach((btn) => {
      btn.addEventListener("click", () => this.prevStep());
    });

    // Step back buttons
    document.querySelectorAll(".step-back-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === 'back-to-step-1' && this.currentStep === 2) {
          this.prevStep();
        } else if (btn.id === 'back-to-step-2' && this.currentStep === 3) {
          this.prevStep();
        } else if (btn.id === 'back-to-step-3' && this.currentStep === 4) {
          this.prevStep();
        }
      });
    });

    // Form validation
    const playerName = document.getElementById("player-name");
    const playerPhone = document.getElementById("player-phone");
    const playerEmail = document.getElementById("player-email");
    if (playerName)
      playerName.addEventListener("input", () => this.validateStep3());
    if (playerPhone)
      playerPhone.addEventListener("input", () => this.validateStep3());
    if (playerEmail)
      playerEmail.addEventListener("input", () => this.validateStep3());

    // Payment type selection
    document.querySelectorAll('input[name="payment-type"]').forEach((radio) => {
      radio.addEventListener("change", () => this.updatePaymentAmounts());
    });

    // Final booking confirmation
    const confirmBtn = document.getElementById("confirm-booking");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => this.confirmBooking());
    }
  }

  selectSport(event) {
    const sportCard = event.currentTarget;
    const sport = sportCard.dataset.sport;

    // Remove previous selections
    document.querySelectorAll(".sport-card").forEach((card) => {
      card.classList.remove("selected");
    });

    // Select current sport
    sportCard.classList.add("selected");
    this.bookingData.sport = sport;

    // Setup court selection with mobile touch support
    const courtOptions = sportCard.querySelectorAll(".court-option");
    courtOptions.forEach((option) => {
      option.addEventListener("click", (e) => this.selectCourt(e));
      // Add touch event for better mobile support
      option.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.selectCourt(e);
      });
    });

    this.validateStep1();
  }

  selectCourt(event) {
    event.stopPropagation();
    const courtOption = event.currentTarget;
    const court = courtOption.dataset.court;
    const courtName = courtOption.dataset.courtName;

    // Remove previous selections
    document.querySelectorAll(".court-option").forEach((option) => {
      option.classList.remove("selected");
    });

    // Select current court
    courtOption.classList.add("selected");
    this.bookingData.court = court;
    this.bookingData.courtName = courtName;

    this.validateStep1();
  }

  validateStep1() {
    const nextBtn = document.querySelector("#step-1 .next-step");
    if (nextBtn) {
      nextBtn.disabled = !(this.bookingData.sport && this.bookingData.court);
    }
  }

  validateStep2() {
    const nextBtn = document.querySelector("#step-2 .next-step");
    const hasValidSlots = this.bookingData.selectedSlots.length >= 2;
    
    if (nextBtn) {
      nextBtn.disabled = !hasValidSlots;
      
      // Update button text to show requirement
      if (!hasValidSlots) {
        nextBtn.textContent = `Select ${2 - this.bookingData.selectedSlots.length} More Slot${this.bookingData.selectedSlots.length === 1 ? '' : 's'}`;
      } else {
        nextBtn.textContent = "Continue to Customer Details";
      }
    }
  }

  validateStep3() {
    const name = document.getElementById("player-name")?.value.trim() || "";
    const phone = document.getElementById("player-phone")?.value.trim() || "";
    const email = document.getElementById("player-email")?.value.trim() || "";
    const nextBtn = document.querySelector("#step-3 .next-step");

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (nextBtn) {
      nextBtn.disabled = !(name && phone && email && emailRegex.test(email));
    }
  }

  nextStep() {
    if (this.currentStep < 4) {
      this.saveStepData();

      // Hide current step
      const currentStepEl = document.getElementById(`step-${this.currentStep}`);
      if (currentStepEl) currentStepEl.classList.remove("active");

      // Show next step
      this.currentStep++;
      const nextStepEl = document.getElementById(`step-${this.currentStep}`);
      if (nextStepEl) nextStepEl.classList.add("active");

      this.updateProgressBar();
      this.initializeCurrentStep();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      // Hide current step
      const currentStepEl = document.getElementById(`step-${this.currentStep}`);
      if (currentStepEl) currentStepEl.classList.remove("active");

      // Show previous step
      this.currentStep--;
      const prevStepEl = document.getElementById(`step-${this.currentStep}`);
      if (prevStepEl) prevStepEl.classList.add("active");

      this.updateProgressBar();
    }
  }

  goBackOneStep() {
    if (this.currentStep > 1) {
      this.prevStep();
    } else {
      window.location.href = "/";
    }
  }

  initializeCurrentStep() {
    switch (this.currentStep) {
      case 2:
        this.updateSelectedInfo();
        this.loadTimeSlots();
        break;
      case 3:
        this.updateBookingSummary();
        break;
      case 4:
        this.updateFinalSummary();
        this.updatePaymentAmounts();
        break;
    }
  }

  updateProgressBar() {
    document.querySelectorAll(".progress-step").forEach((step, index) => {
      const stepNumber = index + 1;

      if (stepNumber < this.currentStep) {
        step.classList.add("completed");
        step.classList.remove("active");
      } else if (stepNumber === this.currentStep) {
        step.classList.add("active");
        step.classList.remove("completed");
      } else {
        step.classList.remove("active", "completed");
      }
    });

    this.updateBackButtonVisibility();
  }

  updateBackButtonVisibility() {
    const backButtons = document.querySelectorAll(".step-back-btn");

    backButtons.forEach((btn) => {
      const stepContainer = btn.closest(".booking-step");
      if (stepContainer) {
        const stepId = stepContainer.id;
        const stepNumber = parseInt(stepId.replace("step-", ""));

        if (stepNumber === this.currentStep) {
          btn.style.display = "inline-block";
          btn.textContent =
            this.currentStep === 1 ? "← Back to Home" : "← Previous Step";
        } else {
          btn.style.display = "none";
        }
      }
    });
  }

  saveStepData() {
    if (this.currentStep === 3) {
      this.bookingData.playerName =
        document.getElementById("player-name")?.value.trim() || "";
      this.bookingData.playerPhone =
        document.getElementById("player-phone")?.value.trim() || "";
      this.bookingData.playerEmail =
        document.getElementById("player-email")?.value.trim() || "";
      this.bookingData.playerCount =
        document.getElementById("player-count")?.value || "2";
      this.bookingData.specialRequests =
        document.getElementById("special-requests")?.value.trim() || "";
    }
  }

  updateSelectedInfo() {
    const sportDisplay = document.getElementById("selected-sport-display");
    const courtDisplay = document.getElementById("selected-court-display");

    if (sportDisplay) {
      sportDisplay.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (courtDisplay) {
      courtDisplay.textContent = this.bookingData.courtName;
    }
  }

  async loadTimeSlots() {
    const timeSlotsContainer = document.getElementById("time-slots");
    if (!timeSlotsContainer) return;

    timeSlotsContainer.innerHTML =
      '<div class="loading">Loading available slots...</div>';

    try {
      console.log(
        `Loading slots for court: ${this.bookingData.court}, date: ${this.bookingData.date}`
      );

      const response = await fetch("/api/booked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: this.bookingData.court,
          date: this.bookingData.date,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const bookedSlots = await response.json();
      console.log(`Received ${bookedSlots.length} booked slots:`, bookedSlots);

      this.renderTimeSlots(timeSlotsContainer, bookedSlots);
    } catch (error) {
      console.error("Error loading time slots:", error);
      timeSlotsContainer.innerHTML =
        '<div class="error">Error loading time slots. Please try again.</div>';
    }
  }

  renderTimeSlots(container, bookedSlots) {
    container.innerHTML = "";

    let nextDayHeaderAdded = false;

    // Create time slot elements with next day header where needed
    this.timeSlots.forEach((time, index) => {
      // Add "Next Day" header before first midnight slot
      if (this.isCrossMidnightSlot(time) && !nextDayHeaderAdded) {
        const nextDayHeader = document.createElement("div");
        nextDayHeader.className = "next-day-header";
        const nextDate = new Date(this.bookingData.date);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDayHeader.textContent = `Next Day - ${this.formatDate(nextDate.toISOString().split("T")[0])}`;
        container.appendChild(nextDayHeader);
        nextDayHeaderAdded = true;
      }

      const slot = document.createElement("div");
      slot.className = "time-slot";

      slot.textContent = this.formatTime(time);
      slot.dataset.time = time;
      slot.dataset.index = index;

      // Check if slot is booked
      if (bookedSlots.includes(time)) {
        slot.classList.add("booked");
        slot.title = "This slot is already booked";
      } else {
        slot.addEventListener("click", (e) => this.selectTimeSlot(e));
      }

      container.appendChild(slot);
    });
  }


  async selectTimeSlot(event) {
    const slot = event.currentTarget;
    const time = slot.dataset.time;
    const index = parseInt(slot.dataset.index);

    if (slot.classList.contains("booked")) return;

    if (slot.classList.contains("selected")) {
      // Deselecting - check if this breaks consecutiveness
      const tempSlots = this.bookingData.selectedSlots.filter(
        (s) => s.time !== time
      );

      if (tempSlots.length > 0 && !this.areConsecutiveSlots(tempSlots)) {
        alert(
          "You cannot deselect this slot as it would break the consecutive booking requirement. Please deselect from the ends only."
        );
        return;
      }

      slot.classList.remove("selected");
      this.bookingData.selectedSlots = tempSlots;
    } else {
      // Selecting - check if this maintains consecutiveness
      const tempSlots = [...this.bookingData.selectedSlots, { time, index }];
      tempSlots.sort((a, b) => a.index - b.index);

      if (!this.areConsecutiveSlots(tempSlots)) {
        alert(
          "Please select consecutive time slots only. You can extend your current selection or start a new consecutive block."
        );
        return;
      }

      slot.classList.add("selected");
      this.bookingData.selectedSlots = tempSlots;
    }

    await this.updateBookingTimeData();
    this.updateSelectedSlotsDisplay();
    this.validateStep2();
  }

  areConsecutiveSlots(slots) {
    if (slots.length <= 1) return true;

    for (let i = 1; i < slots.length; i++) {
      if (slots[i].index !== slots[i - 1].index + 1) {
        return false;
      }
    }
    return true;
  }

  async updateBookingTimeData() {
    if (this.bookingData.selectedSlots.length === 0) {
      this.bookingData.startTime = "";
      this.bookingData.endTime = "";
      this.bookingData.duration = 0;
      this.bookingData.totalAmount = 0;
      return;
    }

    const firstSlot = this.bookingData.selectedSlots[0];
    const lastSlot =
      this.bookingData.selectedSlots[this.bookingData.selectedSlots.length - 1];

    this.bookingData.startTime = firstSlot.time;

    // Calculate end time (30 minutes after last slot)
    const endIndex = lastSlot.index + 1;
    if (endIndex < this.timeSlots.length) {
      this.bookingData.endTime = this.timeSlots[endIndex];
    } else {
      this.bookingData.endTime = "06:00";
    }

    console.log("⏰ Updated booking time data:", {
      startTime: this.bookingData.startTime,
      endTime: this.bookingData.endTime,
      selectedSlots: this.bookingData.selectedSlots.length
    });

    // Calculate actual booking dates based on the selected date from date picker
    const selectedCalendarDate = document.getElementById("booking-date").value;
    
    // Calculate the actual start and end dates for the selected time slots
    const actualStartDate = this.calculateActualDate(selectedCalendarDate, this.bookingData.startTime);
    const actualEndDate = this.calculateActualDate(selectedCalendarDate, this.bookingData.endTime);
    
    const isCrossMidnight = actualStartDate !== actualEndDate;

    // Store booking information
    this.bookingData.isCrossMidnight = isCrossMidnight;
    this.bookingData.actualStartDate = actualStartDate;
    this.bookingData.actualEndDate = actualEndDate;
    
    // The final booking date is always the start time's actual date
    this.bookingData.finalBookingDate = actualStartDate;
    
    // Professional logging for production debugging
    console.log("📅 Booking Date Calculation:", {
      selectedCalendarDate,
      startTime: this.bookingData.startTime,
      endTime: this.bookingData.endTime,
      actualStartDate,
      actualEndDate,
      finalBookingDate: actualStartDate,
      isCrossMidnight
    });

    // Calculate duration and amount using dynamic pricing
    this.bookingData.duration = this.bookingData.selectedSlots.length * 0.5;
    
    // Use dynamic pricing API instead of hardcoded rates
    await this.calculateDynamicPrice();

    // Log cross-midnight booking info for debugging
    if (isCrossMidnight) {
      console.log("🌙 Cross-midnight booking:", {
        startTime: this.bookingData.startTime,
        endTime: this.bookingData.endTime,
        actualStartDate: this.bookingData.actualStartDate,
        actualEndDate: this.bookingData.actualEndDate,
        finalBookingDate: this.bookingData.finalBookingDate,
        duration: this.bookingData.duration,
      });
    }
  }

  updateSelectedSlotsDisplay() {
    const display = document.getElementById("selected-slots-display");
    if (!display) return;

    if (this.bookingData.selectedSlots.length === 0) {
      display.innerHTML = `
        <div class="no-slots-selected">
          <p style="color: #666; text-align: center; padding: 1rem; background: #f9f9f9; border-radius: 8px; margin-top: 1rem;">
            <strong>📅 No time slots selected</strong><br>
            Click on time slots above to select your preferred booking time.<br>
            <small>Minimum: 1 hour (2 consecutive slots)</small>
          </p>
        </div>
      `;
      return;
    }

    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime = this.formatTime(this.bookingData.endTime);
    const duration = this.bookingData.duration;
    const amount = this.bookingData.totalAmount;

    let timeDisplayText = `${startTime} - ${endTime}`;

    // Handle cross-midnight booking display using our new helper functions
    if (this.bookingData.isCrossMidnight) {
      const startDateDisplay = this.formatDateShort(
        this.bookingData.actualStartDate
      );
      const endDateDisplay = this.formatDateShort(
        this.bookingData.actualEndDate
      );
      timeDisplayText = `${startTime} (${startDateDisplay}) - ${endTime} (${endDateDisplay})`;
    }

    display.innerHTML = `
          <div class="selected-time-info">
              <h4>Selected Time:</h4>
              <p><strong>${timeDisplayText}</strong></p>
              <p>Duration: ${duration} hour${duration !== 1 ? "s" : ""}</p>
              <p>Total Amount: <strong>PKR ${amount.toLocaleString()}</strong></p>
          </div>
      `;
  }

  updateBookingSummary() {
    const elements = {
      sport: document.getElementById("summary-sport"),
      court: document.getElementById("summary-court"),
      date: document.getElementById("summary-date"),
      time: document.getElementById("summary-time"),
      amount: document.getElementById("summary-amount"),
    };

    if (elements.sport) {
      elements.sport.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (elements.court) {
      elements.court.textContent = this.bookingData.courtName;
    }
    if (elements.date) {
      // Use the final booking date which is based on the start time's actual date
      const displayDate = this.bookingData.finalBookingDate || this.bookingData.date;
      elements.date.textContent = this.formatDate(displayDate);
    }
    if (elements.time) {
      const startTime = this.formatTime(this.bookingData.startTime);
      const endTime = this.formatTime(this.bookingData.endTime);
      
      // Show cross-midnight time with date indicators if needed
      if (this.bookingData.isCrossMidnight) {
        const startDateShort = this.formatDateShort(this.bookingData.actualStartDate);
        const endDateShort = this.formatDateShort(this.bookingData.actualEndDate);
        elements.time.textContent = `${startTime} (${startDateShort}) - ${endTime} (${endDateShort}) (${this.bookingData.duration}h)`;
      } else {
        elements.time.textContent = `${startTime} - ${endTime} (${this.bookingData.duration}h)`;
      }
    }
    if (elements.amount) {
      elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
    }
  }

  updateFinalSummary() {
    const elements = {
      sport: document.getElementById("final-sport"),
      court: document.getElementById("final-court"),
      datetime: document.getElementById("final-datetime"),
      name: document.getElementById("final-name"),
      phone: document.getElementById("final-phone"),
      amount: document.getElementById("final-amount"),
    };

    if (elements.sport) {
      elements.sport.textContent =
        this.bookingData.sport.charAt(0).toUpperCase() +
        this.bookingData.sport.slice(1);
    }
    if (elements.court) {
      elements.court.textContent = this.bookingData.courtName;
    }
    if (elements.datetime) {
      elements.datetime.textContent = this.formatBookingDateTime();
    }
    if (elements.name) {
      elements.name.textContent = this.bookingData.playerName;
    }
    if (elements.phone) {
      elements.phone.textContent = this.bookingData.playerPhone;
    }
    if (elements.amount) {
      elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
    }
  }

  updatePaymentAmounts() {
    const advanceAmount = Math.floor(this.bookingData.totalAmount * 0.5);
    const fullAmount = this.bookingData.totalAmount;

    const advanceEl = document.getElementById("advance-amount");
    const fullEl = document.getElementById("full-amount");

    if (advanceEl) advanceEl.textContent = advanceAmount.toLocaleString();
    if (fullEl) fullEl.textContent = fullAmount.toLocaleString();

    const selectedPayment = document.querySelector(
      'input[name="payment-type"]:checked'
    );
    if (selectedPayment) {
      this.bookingData.paymentType = selectedPayment.value;
    }
  }

  async confirmBooking() {
    const confirmBtn = document.getElementById("confirm-booking");
    if (!confirmBtn) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
      // Save final data
      this.saveStepData();
      this.bookingData.paymentType =
        document.querySelector('input[name="payment-type"]:checked')?.value ||
        "advance";

      // Check if time slots are selected first
      if (!this.bookingData.selectedSlots || this.bookingData.selectedSlots.length === 0) {
        alert("⚠️ Please go back to Step 2 and select your preferred time slots before confirming your booking.");
        return;
      }

      // Check minimum booking requirement (1 hour = 2 slots)
      if (this.bookingData.selectedSlots.length < 2) {
        alert("⚠️ Minimum booking is 1 hour (2 consecutive time slots). Please select at least 2 consecutive slots.");
        return;
      }

      // Ensure time data is properly set before validation
      await this.updateBookingTimeData();

      // Validate required data
      if (!this.validateBookingData()) {
        alert("Please ensure all required fields are filled out correctly.");
        return;
      }

      // Check for conflicts
      confirmBtn.textContent = "Checking availability...";
      const conflictCheck = await this.checkForConflicts();

      if (conflictCheck.hasConflict) {
        alert(
          `Sorry, ${conflictCheck.message}. Please go back and select different time slots.`
        );
        return;
      }

      // Create booking with correct date
      confirmBtn.textContent = "Finalizing booking...";
      
      // Prepare booking data with the correct final booking date
      const bookingPayload = {
        ...this.bookingData,
        date: this.bookingData.finalBookingDate || this.bookingData.date
      };
      
      console.log("📤 Sending booking data:", {
        originalDate: this.bookingData.date,
        finalBookingDate: this.bookingData.finalBookingDate,
        actualDateSent: bookingPayload.date,
        startTime: bookingPayload.startTime,
        endTime: bookingPayload.endTime
      });
      
      const response = await fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (result.success) {
        this.showBookingConfirmation(result.bookingId);
        await this.sendAdminNotification(result.bookingId);
      } else {
        throw new Error(result.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert(
        `Sorry, there was an error processing your booking: ${error.message}. Please try again or contact support.`
      );
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm Booking";
    }
  }

  validateBookingData() {
    const required = [
      "sport",
      "court",
      "courtName",
      "date",
      "startTime",
      "endTime",
      "duration",
      "selectedSlots",
      "playerName",
      "playerPhone",
    ];

    // Debug: Log all booking data
    console.log("🔍 Validating booking data:", this.bookingData);

    for (const field of required) {
      const value = this.bookingData[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        console.error(`❌ Missing required field: ${field}, value:`, value);
        console.error("📋 Current booking data:", JSON.stringify(this.bookingData, null, 2));
        return false;
      }
    }
    
    console.log("✅ All required fields validated successfully");
    return true;
  }

  async checkForConflicts() {
    try {
      const conflictCheckData = {
        court: this.bookingData.court,
        date: this.bookingData.finalBookingDate || this.bookingData.date,
        selectedSlots: this.bookingData.selectedSlots,
      };
      
      console.log("🔍 Checking conflicts with data:", conflictCheckData);
      
      const response = await fetch("/api/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conflictCheckData),
      });

      return await response.json();
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return { hasConflict: true, message: "Error checking availability" };
    }
  }

  showBookingConfirmation(bookingId) {
    // Hide step 4 and show confirmation
    const step4 = document.getElementById("step-4");
    const confirmation = document.getElementById("booking-confirmation");
    const bookingIdEl = document.getElementById("generated-booking-id");

    if (step4) step4.style.display = "none";
    if (confirmation) confirmation.style.display = "block";
    if (bookingIdEl) bookingIdEl.textContent = bookingId;

    // Scroll to confirmation
    if (confirmation) {
      confirmation.scrollIntoView({ behavior: "smooth" });
    }

    console.log("Booking process completed successfully");
  }

  async sendAdminNotification(bookingId) {
    try {
      if (typeof emailjs === "undefined") {
        console.warn("EmailJS not available");
        return false;
      }

      const templateParams = {
        booking_id: bookingId,
        sport:
          this.bookingData.sport.charAt(0).toUpperCase() +
          this.bookingData.sport.slice(1),
        court_name: this.bookingData.courtName,
        booking_datetime: this.formatBookingDateTime(),
        duration: this.bookingData.duration.toString(),
        total_amount: this.bookingData.totalAmount.toLocaleString(),
        payment_type:
          this.bookingData.paymentType === "advance"
            ? "50% Advance Payment"
            : "Full Payment",
        player_name: this.bookingData.playerName,
        player_phone: this.bookingData.playerPhone,
        player_email: this.bookingData.playerEmail || "Not provided",
        player_count: this.bookingData.playerCount || "2",
        special_requests: this.bookingData.specialRequests || "None",
        submission_time: new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        to_email: "noballarena@gmail.com",
      };

      console.log("Sending admin notification email...");
      const response = await emailjs.send(
        "service_y85g6ha",
        "template_ceqhxb3",
        templateParams
      );
      console.log("Admin notification email sent successfully");
      return true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return false;
    }
  }

  // Utility methods
  isNextDayTime(time) {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 0 && hour <= 5;
  }

  formatTime(time) {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  formatBookingDateTime() {
    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime = this.formatTime(this.bookingData.endTime);
    const startDate = this.bookingData.date;
    const isStartNextDay = this.isNextDayTime(this.bookingData.startTime);
    const isEndNextDay = this.isNextDayTime(this.bookingData.endTime);

    if (!isStartNextDay && !isEndNextDay) {
      return `${this.formatDate(startDate)} from ${startTime} to ${endTime}`;
    } else if (!isStartNextDay && isEndNextDay) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(startDate)} ${startTime} to ${this.formatDate(
        nextDay.toISOString().split("T")[0]
      )} ${endTime}`;
    } else {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(
        nextDay.toISOString().split("T")[0]
      )} from ${startTime} to ${endTime}`;
    }
  }

  async calculateDynamicPrice() {
    try {
      console.log("💰 Calculating dynamic price...");
      
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: this.bookingData.court,
          booking_date: this.bookingData.date,
          selected_slots: this.bookingData.selectedSlots
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.bookingData.totalAmount = result.total_price;
        this.bookingData.originalAmount = result.total_price; // Store original amount
        console.log(`✅ Dynamic price calculated: ₨${result.total_price.toLocaleString()}`);
      } else {
        throw new Error(result.message || "Failed to calculate price");
      }
    } catch (error) {
      console.error("❌ Error calculating dynamic price:", error);
      // Fallback to hardcoded pricing
      const hourlyRate = this.sportPricing[this.bookingData.sport] || 2500;
      const amount = Math.round(hourlyRate * this.bookingData.duration);
      this.bookingData.totalAmount = amount;
      this.bookingData.originalAmount = amount; // Store original amount
      console.log(`🔄 Using fallback price: ₨${amount.toLocaleString()}`);
    }
  }

  // Promo Code Functions
  async applyPromoCode() {
    const promoInput = document.getElementById('promo-code-input');
    const promoCode = promoInput.value.trim().toUpperCase();
    
    if (!promoCode) {
      this.showPromoMessage('Please enter a promo code', 'error');
      return;
    }

    // Validate that booking has been configured with amount
    if (!this.bookingData.originalAmount || this.bookingData.originalAmount <= 0) {
      this.showPromoMessage('Please complete your booking details first', 'error');
      return;
    }

    // Validate that required booking data exists
    if (!this.bookingData.sport || !this.bookingData.date || !this.bookingData.startTime) {
      this.showPromoMessage('Please complete your booking details first', 'error');
      return;
    }

    this.setPromoLoadingState(true);
    
    try {
      console.log('🎟️ Applying promo code:', promoCode);
      console.log('📊 Booking data:', {
        originalAmount: this.bookingData.originalAmount,
        sport: this.bookingData.sport,
        date: this.bookingData.date,
        startTime: this.bookingData.startTime
      });
      
      const requestBody = {
        promo_code: promoCode,
        booking_amount: this.bookingData.originalAmount,
        sport: this.bookingData.sport
      };
      
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch('/api/apply-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (result.success) {
        // Apply discount
        this.bookingData.promoCode = promoCode;
        this.bookingData.discountAmount = result.discount_amount;
        this.bookingData.totalAmount = result.final_amount;
        
        this.showPromoApplied(promoCode, result.discount_amount, result.discount_text || '');
        this.updatePricingDisplay();
        this.updatePaymentAmounts();
        
        console.log(`✅ Promo applied: ${promoCode}, discount: ₨${result.discount_amount}`);
      } else {
        this.showPromoMessage(result.message || 'Invalid promo code', 'error');
      }
    } catch (error) {
      console.error('❌ Error applying promo code:', error);
      this.showPromoMessage('Error applying promo code. Please try again.', 'error');
    } finally {
      this.setPromoLoadingState(false);
    }
  }

  removePromoCode() {
    // Reset amounts
    this.bookingData.promoCode = '';
    this.bookingData.discountAmount = 0;
    this.bookingData.totalAmount = this.bookingData.originalAmount;
    
    // Clear input
    document.getElementById('promo-code-input').value = '';
    
    // Hide applied promo
    document.getElementById('promo-applied').style.display = 'none';
    document.getElementById('promo-form').style.display = 'block';
    
    // Update displays
    this.updatePricingDisplay();
    this.updatePaymentAmounts();
    
    console.log('🎟️ Promo code removed');
  }

  showPromoApplied(code, discountAmount, discountText) {
    document.getElementById('applied-promo-code').textContent = code;
    document.getElementById('applied-discount-text').textContent = 
      discountText || `You saved ₨${discountAmount.toLocaleString()}!`;
    
    document.getElementById('promo-form').style.display = 'none';
    document.getElementById('promo-applied').style.display = 'block';
    document.getElementById('promo-message').style.display = 'none';
  }

  showPromoMessage(message, type) {
    const messageEl = document.getElementById('promo-message');
    messageEl.textContent = message;
    messageEl.className = `promo-message ${type}`;
    messageEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  setPromoLoadingState(loading) {
    const applyBtn = document.getElementById('apply-promo-btn');
    const applyText = applyBtn.querySelector('.apply-text');
    const loadingText = applyBtn.querySelector('.loading-text');
    
    if (loading) {
      applyBtn.disabled = true;
      applyText.style.display = 'none';
      loadingText.style.display = 'inline-block';
    } else {
      applyBtn.disabled = false;
      applyText.style.display = 'inline-block';
      loadingText.style.display = 'none';
    }
  }

  updatePricingDisplay() {
    // Update final summary displays
    if (this.bookingData.discountAmount > 0) {
      document.getElementById('discount-row').style.display = 'flex';
      document.getElementById('discount-amount').textContent = `-PKR ${this.bookingData.discountAmount.toLocaleString()}`;
      
      document.getElementById('final-total-row').style.display = 'flex';
      document.getElementById('final-total-amount').innerHTML = `<strong>PKR ${this.bookingData.totalAmount.toLocaleString()}</strong>`;
    } else {
      document.getElementById('discount-row').style.display = 'none';
      document.getElementById('final-total-row').style.display = 'none';
    }
  }

  initializeCurrentStep() {
    switch (this.currentStep) {
      case 2:
        this.updateSelectedInfo();
        this.loadTimeSlots();
        break;
      case 3:
        this.updateBookingSummary();
        break;
      case 4:
        this.updateFinalSummary();
        this.updatePaymentAmounts();
        this.addPricingStyles(); // Add promo code styles when reaching payment step
        break;
    }
  }
}

// Initialize booking system when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.bookingSystem = new BookingSystem();
});

// Global functions for backward compatibility
function debugCustomerSlots(court, date) {
  if (window.bookingSystem) {
    const testCourt =
      court || window.bookingSystem.bookingData.court || "padel-1";
    const testDate =
      date || window.bookingSystem.bookingData.date || "2025-08-05";

    console.log(`🔍 Debug: Testing ${testCourt} on ${testDate}`);
    window.bookingSystem.loadTimeSlots();
  }
}

// Global promo code functions
function applyPromoCode() {
  if (window.bookingSystem) {
    window.bookingSystem.applyPromoCode();
  }
}

function removePromoCode() {
  if (window.bookingSystem) {
    window.bookingSystem.removePromoCode();
  }
}

// Initialize booking system when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing Booking System...");
  window.bookingSystem = new BookingSystem();
  console.log("✅ Booking System initialized successfully");
});
