// Professional Booking System JavaScript (Updated - Workday anchored to selected date)
// Clean, maintainable, and well-structured

class BookingSystem {
  constructor() {
    this.currentStep = 1;
    this.bookingData = {
      sport: "",
      court: "",
      courtName: "",
      date: "",                // selected calendar date (workday anchor)
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
      // derived
      isCrossMidnight: false,
      actualStartDate: "",
      actualEndDate: "",
      finalBookingDate: ""     // ALWAYS the selected calendar date (workday)
    };

    this.rageRoomContact = {
      phone: "03161439569",
      whatsapp: "923161439569"
    };

    this.minSlotsBySport = {
      axe_throw: 1,
      archery: 1,
    };

    this.sportPricing = {
      cricket: 3000,
      futsal: 2500,
      padel: 5500,
      pickleball: 2500,
      axe_throw: 4000,
      archery: 3500,
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

  // EmailJS config (reuse your existing admin service)
  getEmailJsServiceId() {
    return 'service_y85g6ha'; // set to your EmailJS service ID
  }
  getEmailJsCustomerTemplateId() {
    // EmailJS customer-facing template provided by you
    return 'template_79dq4rl';
  }

  generateTimeSlots() {
    const slots = [];
    // Workday operates from 2pm (14:00) to 6am (06:00) next day
    for (let hour = 14; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    for (let hour = 0; hour < 6; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }

  // Helper: slot shown under "Next Day" section (still belongs to workday)
  isCrossMidnightSlot(timeString) {
    const [h, m] = timeString.split(":").map(Number);
    return (h * 60 + m) < (5 * 60 + 30); // 00:00–05:30
  }

  // Map (selected date, HH:mm) → actual calendar date string (YYYY-MM-DD) for display only
  calculateActualDate(selectedCalendarDate, timeString) {
    const base = new Date(selectedCalendarDate);
    if (this.isCrossMidnightSlot(timeString)) {
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split("T")[0];
  }

  getBookingDate(selectedDate, timeString) {
    return this.calculateActualDate(selectedDate, timeString);
  }

  getMinSlotsForSport(sport) {
    if (!sport) return 2;
    return this.minSlotsBySport[sport] || 2;
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
      const response = await fetch("/api/pricing-info", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success) {
        this.pricingInfo = result.pricing; // structured by sport with per-hour values
        this.timingInfo = result.timing_info;
        this.addPricingStyles();
        this.populatePricingUI();
        this.updateStep2PricingDisplay();
      }
    } catch (error) {
      console.error("❌ Error loading pricing info:", error);
    }
  }

  // Update visible prices on sport cards and step-2 panel
  populatePricingUI() {
    if (!this.pricingInfo) return;
    // Update sport cards “From PKR …”
    document.querySelectorAll('.sport-card').forEach(card => {
      const sport = card.getAttribute('data-sport');
      const priceEl = card.querySelector('.sport-price');
      if (!sport || !priceEl) return;
      const sportData = this.pricingInfo[sport];
      const fallback = this.sportPricing[sport];
      if (!sportData && !fallback) return;
      const base = (sportData && sportData.base_price_per_hour) || fallback || 0;
      if (base > 0) priceEl.textContent = `From PKR ${Number(base).toLocaleString()}`;
    });
  }

  updateStep2PricingDisplay() {
    if (!this.pricingInfo) return;
    // Determine selected sport/court
    const sport = this.bookingData.sport || document.querySelector('.sport-card.selected')?.getAttribute('data-sport');
    if (sport === "rage_room") {
      return;
    }
    let base, peak, off, weekend;
    if (sport && this.pricingInfo[sport]) {
      const courtId = this.bookingData.court || document.querySelector('.court-option.selected')?.getAttribute('data-court');
      const sportData = this.pricingInfo[sport];
      if (courtId) {
        const court = (sportData.courts || []).find(c => c.court_id === courtId);
        if (court) {
          base = court.base_price_per_hour; peak = court.peak_price_per_hour; off = court.off_peak_price_per_hour; weekend = court.weekend_price_per_hour;
        }
      }
      // fallback to sport defaults if specific court not found
      base = base ?? sportData.base_price_per_hour;
      peak = peak ?? sportData.peak_price_per_hour;
      off = off ?? sportData.off_peak_price_per_hour;
      weekend = weekend ?? sportData.weekend_price_per_hour;
    } else if (sport && this.sportPricing[sport]) {
      base = this.sportPricing[sport];
    }

    const setRow = (rowId, valueId, value) => {
      const row = document.getElementById(rowId);
      const val = document.getElementById(valueId);
      if (!row || !val) return;
      if (value && Number(value) > 0) {
        row.style.display = 'flex';
        val.textContent = `PKR ${Number(value).toLocaleString()}`;
      } else {
        row.style.display = 'none';
      }
    };

    setRow('price-row-base', 'price-base-value', base || 0);
    setRow('price-row-peak', 'price-peak-value', peak);
    setRow('price-row-offpeak', 'price-offpeak-value', off);
    setRow('price-row-weekend', 'price-weekend-value', weekend);
  }

  addPricingStyles() {
    if (document.getElementById('pricing-info-styles')) return;
    const style = document.createElement('style');
    style.id = 'pricing-info-styles';
    style.textContent = `
      .pricing-info{margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #28a745}
      .pricing-details{margin-top:10px}
      .price-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #e9ecef}
      .price-row:last-child{border-bottom:none}
      .price-label{font-weight:500;color:#495057;font-size:14px}
      .price-value{font-weight:bold;color:#28a745;font-size:14px}
      .pricing-info p{margin:0 0 10px;font-weight:600;color:#343a40}
      .promo-code-section{margin:20px 0;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #e9ecef}
      .promo-code-section h3{margin:0 0 15px;color:#495057;font-size:1.2rem}
      .promo-input-container{max-width:400px}
      .input-group{display:flex;border-radius:8px;overflow:hidden}
      .input-group .form-control{flex:1;border:1px solid #ced4da;padding:10px 15px;border-right:none;border-top-right-radius:0;border-bottom-right-radius:0}
      .input-group .form-control:focus{border-color:#007bff;box-shadow:none;outline:none}
      .input-group .btn{border-top-left-radius:0;border-bottom-left-radius:0;padding:10px 20px;white-space:nowrap}
      .promo-message{margin-top:10px;padding:8px 12px;border-radius:6px;font-size:14px}
      .promo-message.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}
      .promo-message.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
      .promo-applied{margin-top:15px}
      .alert{padding:12px 16px;border-radius:8px;border:none;margin:0}
      .alert-success{background:#d4edda;color:#155724}
      .summary-row.discount{color:#28a745;font-weight:600}
      .summary-row.final-total{border-top:2px solid #007bff;padding-top:10px;margin-top:10px;font-size:1.1rem}
    `;
    document.head.appendChild(style);
  }

  initializeDateSelector() {
    const dateInput = document.getElementById("booking-date");
    if (!dateInput) return;

    const now = new Date();
    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };

    const todayString = toYMD(now);
    const maxDate = new Date(now); maxDate.setDate(now.getDate() + 30);
    const maxDateString = toYMD(maxDate);

    dateInput.min = todayString;
    dateInput.max = maxDateString;
    dateInput.value = todayString;

    this.bookingData.date = dateInput.value;
    this.bookingData.finalBookingDate = dateInput.value; // anchor workday
  }

  setupEventListeners() {
    document.querySelectorAll(".sport-card").forEach((card) => {
      card.addEventListener("click", (e) => this.selectSport(e));
      card.addEventListener("touchend", (e) => { e.preventDefault(); this.selectSport(e); });
    });

    document.querySelectorAll(".rage-room-actions a").forEach((link) => {
      link.addEventListener("click", (e) => e.stopPropagation());
    });

    const dateInput = document.getElementById("booking-date");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        this.bookingData.date = e.target.value;
        this.bookingData.finalBookingDate = e.target.value; // anchor to selected day
        // clear selection since day changed
        this.bookingData.selectedSlots = [];
        this.bookingData.startTime = "";
        this.bookingData.endTime = "";
        this.bookingData.duration = 0;
        this.bookingData.totalAmount = 0;
        this.updateSelectedSlotsDisplay();
        this.loadTimeSlots();
        this.validateStep2();
      });
    }

    document.querySelectorAll(".next-step").forEach((btn) => {
      btn.addEventListener("click", () => this.nextStep());
    });
    document.querySelectorAll(".prev-step").forEach((btn) => {
      btn.addEventListener("click", () => this.prevStep());
    });

    document.querySelectorAll(".step-back-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === 'back-to-step-1' && this.currentStep === 2) this.prevStep();
        else if (btn.id === 'back-to-step-2' && this.currentStep === 3) this.prevStep();
        else if (btn.id === 'back-to-step-3' && this.currentStep === 4) this.prevStep();
      });
    });

    const playerName = document.getElementById("player-name");
    const playerPhone = document.getElementById("player-phone");
    const playerEmail = document.getElementById("player-email");
    if (playerName) playerName.addEventListener("input", () => this.validateStep3(true));
    if (playerPhone) playerPhone.addEventListener("input", () => this.validateStep3(true));
    if (playerEmail) playerEmail.addEventListener("input", () => this.validateStep3(true));

    document.querySelectorAll('input[name="payment-type"]').forEach((radio) => {
      radio.addEventListener("change", () => this.updatePaymentAmounts());
    });

    const confirmBtn = document.getElementById("confirm-booking");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => this.confirmBooking());
    }

    const rageRoomClose = document.getElementById("rage-room-modal-close");
    if (rageRoomClose) {
      rageRoomClose.addEventListener("click", () => this.hideRageRoomModal());
    }

    const rageRoomModal = document.getElementById("rage-room-modal");
    if (rageRoomModal) {
      rageRoomModal.addEventListener("click", (e) => {
        if (e.target === rageRoomModal) this.hideRageRoomModal();
      });
    }
  }

  selectSport(event) {
    const sportCard = event.currentTarget;
    const sport = sportCard.dataset.sport;

    // Phone-only experience: show contact modal and stop the normal flow
    if (sport === "rage_room") {
      document.querySelectorAll(".sport-card").forEach((card) => card.classList.remove("selected"));
      sportCard.classList.add("selected");
      document.querySelectorAll(".court-option").forEach((o) => o.classList.remove("selected"));
      this.bookingData.sport = "";
      this.bookingData.court = "";
      this.showRageRoomModal();
      this.validateStep1();
      return;
    }

    document.querySelectorAll(".sport-card").forEach((card) => card.classList.remove("selected"));
    sportCard.classList.add("selected");
    this.bookingData.sport = sport;

    sportCard.querySelectorAll(".court-option").forEach((option) => {
      option.addEventListener("click", (e) => this.selectCourt(e));
      option.addEventListener("touchend", (e) => { e.preventDefault(); this.selectCourt(e); });
    });

    this.validateStep1();
    this.updateStep2PricingDisplay();
  }

  selectCourt(event) {
    event.stopPropagation();
    const courtOption = event.currentTarget;
    const court = courtOption.dataset.court;
    const courtName = courtOption.dataset.courtName;

    document.querySelectorAll(".court-option").forEach((o) => o.classList.remove("selected"));
    courtOption.classList.add("selected");

    this.bookingData.court = court;
    this.bookingData.courtName = courtName;

    this.validateStep1();
    this.updateStep2PricingDisplay();
  }

  validateStep1() {
    const nextBtn = document.querySelector("#step-1 .next-step");
    if (nextBtn) nextBtn.disabled = !(this.bookingData.sport && this.bookingData.court);
  }

  validateStep2() {
    const nextBtn = document.querySelector("#step-2 .next-step");
    const minSlots = this.getMinSlotsForSport(this.bookingData.sport);
    const hasValid = this.bookingData.selectedSlots.length >= minSlots;
    if (!nextBtn) return;
    nextBtn.disabled = !hasValid;
    nextBtn.textContent = hasValid
      ? "Continue to Customer Details"
      : `Select ${Math.max(0, minSlots - this.bookingData.selectedSlots.length)} More Slot${this.bookingData.selectedSlots.length === 1 ? '' : 's'}`;
  }

  validateStep3(showMessages = false) {
    const nameEl = document.getElementById("player-name");
    const phoneEl = document.getElementById("player-phone");
    const emailEl = document.getElementById("player-email");
    const name = nameEl?.value.trim() || "";
    const phone = phoneEl?.value.trim() || "";
    const email = emailEl?.value.trim() || "";
    const nextBtn = document.querySelector("#step-3 .next-step");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(03\d{9}|\+923\d{9})$/;

    const errors = {
      name: !name || name.length < 2,
      phone: !phoneRegex.test(phone),
      email: !emailRegex.test(email),
    };

    if (showMessages) {
      this.setFieldError("player-name", "error-player-name", errors.name, "Please enter your full name.");
      this.setFieldError("player-phone", "error-player-phone", errors.phone, "Please enter a valid Pakistani mobile number.");
      this.setFieldError("player-email", "error-player-email", errors.email, "Please enter a valid email address.");
    }

    const valid = !errors.name && !errors.phone && !errors.email;
    if (nextBtn) nextBtn.disabled = !valid;
    return valid;
  }

  setFieldError(inputId, errorId, hasError, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    if (!input || !errorEl) return;
    if (hasError) {
      input.classList.add("input-error");
      errorEl.textContent = message || errorEl.textContent;
      errorEl.style.display = "block";
    } else {
      input.classList.remove("input-error");
      errorEl.style.display = "none";
    }
  }

  showRageRoomModal() {
    const modal = document.getElementById("rage-room-modal");
    if (modal) modal.style.display = "flex";
  }

  hideRageRoomModal() {
    const modal = document.getElementById("rage-room-modal");
    if (modal) modal.style.display = "none";
  }

  nextStep() {
    if (this.currentStep >= 4) return;
    if (this.currentStep === 3) {
      // Force validation with visible messages
      const ok = this.validateStep3(true);
      if (!ok) {
        const nextBtn = document.querySelector('#step-3 .next-step');
        if (nextBtn) nextBtn.disabled = true;
        return;
      }
    }
    this.saveStepData();
    const cur = document.getElementById(`step-${this.currentStep}`);
    if (cur) cur.classList.remove("active");
    this.currentStep++;
    const nxt = document.getElementById(`step-${this.currentStep}`);
    if (nxt) nxt.classList.add("active");
    this.updateProgressBar();
    this.initializeCurrentStep();
  }

  prevStep() {
    if (this.currentStep <= 1) return;
    const cur = document.getElementById(`step-${this.currentStep}`);
    if (cur) cur.classList.remove("active");
    this.currentStep--;
    const prev = document.getElementById(`step-${this.currentStep}`);
    if (prev) prev.classList.add("active");
    this.updateProgressBar();
  }

  goBackOneStep() {
    if (this.currentStep > 1) this.prevStep();
    else window.location.href = "/";
  }

  initializeCurrentStep() {
    switch (this.currentStep) {
      case 2:
        this.updateSelectedInfo();
        this.loadTimeSlots();
        break;
      case 3:
        this.updateBookingSummary();
        this.validateStep3(true);
        break;
      case 4:
        this.updateFinalSummary();
        this.updatePaymentAmounts();
        this.addPricingStyles();
        this.updateWhatsAppLinks();
        this.setupShareSummary();
        break;
    }
  }

  setupShareSummary() {
    const btn = document.getElementById('share-summary-btn');
    if (!btn) return;
    btn.onclick = async () => {
      try {
        const card = document.querySelector('.final-summary-card');
        if (!card || typeof html2canvas === 'undefined') {
          alert('Sorry, this device does not support sharing images here.');
          return;
        }
        // Render to canvas (2x for clarity)
        const canvas = await html2canvas(card, { backgroundColor: '#f9fafb', scale: window.devicePixelRatio || 2 });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
        const file = new File([blob], `noball_booking_${Date.now()}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'NoBall Booking Summary',
            text: 'Booking summary attached.'
          });
        } else {
          // Fallback: download the image and guide the user
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert('Summary image downloaded. Please attach it in WhatsApp after opening the chat.');
        }
      } catch (e) {
        console.error('❌ Share summary error:', e);
        alert('Failed to create summary image. Please take a screenshot instead.');
      }
    };
  }

  updateProgressBar() {
    document.querySelectorAll(".progress-step").forEach((step, index) => {
      const num = index + 1;
      step.classList.toggle("completed", num < this.currentStep);
      step.classList.toggle("active", num === this.currentStep);
      if (num > this.currentStep) step.classList.remove("active", "completed");
    });
    this.updateBackButtonVisibility();
  }

  updateBackButtonVisibility() {
    document.querySelectorAll(".step-back-btn").forEach((btn) => {
      const stepContainer = btn.closest(".booking-step");
      if (!stepContainer) return;
      const stepNumber = parseInt(stepContainer.id.replace("step-", ""));
      if (stepNumber === this.currentStep) {
        btn.style.display = "inline-block";
        btn.textContent = this.currentStep === 1 ? "← Back to Home" : "← Previous Step";
      } else {
        btn.style.display = "none";
      }
    });
  }

  saveStepData() {
    if (this.currentStep === 3) {
      this.bookingData.playerName = document.getElementById("player-name")?.value.trim() || "";
      this.bookingData.playerPhone = document.getElementById("player-phone")?.value.trim() || "";
      this.bookingData.playerEmail = document.getElementById("player-email")?.value.trim() || "";
      this.bookingData.playerCount = document.getElementById("player-count")?.value || "2";
      this.bookingData.specialRequests = document.getElementById("special-requests")?.value.trim() || "";
    }
  }

  updateSelectedInfo() {
    const sportDisplay = document.getElementById("selected-sport-display");
    const courtDisplay = document.getElementById("selected-court-display");
    if (sportDisplay) sportDisplay.textContent = this.bookingData.sport.charAt(0).toUpperCase() + this.bookingData.sport.slice(1);
    if (courtDisplay) courtDisplay.textContent = this.bookingData.courtName;
  }

  async loadTimeSlots() {
    const container = document.getElementById("time-slots");
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading available slots...</div>';

    try {
      const response = await fetch("/api/booked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court: this.bookingData.court,
          date: this.bookingData.finalBookingDate || this.bookingData.date, // workday date
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const bookedSlots = await response.json();
      this.renderTimeSlots(container, bookedSlots);
    } catch (error) {
      console.error("Error loading time slots:", error);
      container.innerHTML = '<div class="error">Error loading time slots. Please try again.</div>';
    }
  }

  renderTimeSlots(container, bookedSlots) {
    container.innerHTML = "";
    let nextDayHeaderAdded = false;

    this.timeSlots.forEach((time, index) => {
      if (this.isCrossMidnightSlot(time) && !nextDayHeaderAdded) {
        const nextDayHeader = document.createElement("div");
        nextDayHeader.className = "next-day-header";
        const nextDate = new Date(this.bookingData.finalBookingDate || this.bookingData.date);
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
      const temp = this.bookingData.selectedSlots.filter((s) => s.time !== time);
      if (temp.length > 0 && !this.areConsecutiveSlots(temp)) {
        alert("You cannot deselect this slot as it would break the consecutive booking requirement. Please deselect from the ends only.");
        return;
      }
      slot.classList.remove("selected");
      this.bookingData.selectedSlots = temp;
    } else {
      const temp = [...this.bookingData.selectedSlots, { time, index }];
      temp.sort((a, b) => a.index - b.index);
      if (!this.areConsecutiveSlots(temp)) {
        alert("Please select consecutive time slots only. You can extend your current selection or start a new consecutive block.");
        return;
      }
      slot.classList.add("selected");
      this.bookingData.selectedSlots = temp;
    }

    await this.updateBookingTimeData();
    this.updateSelectedSlotsDisplay();
    this.validateStep2();
  }

  areConsecutiveSlots(slots) {
    if (slots.length <= 1) return true;
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].index !== slots[i - 1].index + 1) return false;
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

    const first = this.bookingData.selectedSlots[0];
    const last = this.bookingData.selectedSlots[this.bookingData.selectedSlots.length - 1];

    this.bookingData.startTime = first.time;
    const endIndex = last.index + 1;
    this.bookingData.endTime = endIndex < this.timeSlots.length ? this.timeSlots[endIndex] : "06:00";

    const selectedCalendarDate = document.getElementById("booking-date").value;

    const actualStartDate = this.calculateActualDate(selectedCalendarDate, this.bookingData.startTime);
    const actualEndDate   = this.calculateActualDate(selectedCalendarDate, this.bookingData.endTime);
    const isCrossMidnight = actualStartDate !== actualEndDate;

    // ✅ Anchor workday/canonical date to the selected date always
    this.bookingData.isCrossMidnight  = isCrossMidnight;
    this.bookingData.actualStartDate  = actualStartDate; // for display only
    this.bookingData.actualEndDate    = actualEndDate;   // for display only
    this.bookingData.finalBookingDate = selectedCalendarDate;

    this.bookingData.duration = this.bookingData.selectedSlots.length * 0.5;

    await this.calculateDynamicPrice();

    console.log("📅 Booking Date Calculation:", {
      selectedCalendarDate,
      startTime: this.bookingData.startTime,
      endTime: this.bookingData.endTime,
      actualStartDate,
      actualEndDate,
      finalBookingDate: this.bookingData.finalBookingDate,
      isCrossMidnight
    });
  }

  updateSelectedSlotsDisplay() {
    const display = document.getElementById("selected-slots-display");
    if (!display) return;

    const minSlots = this.getMinSlotsForSport(this.bookingData.sport);

    if (this.bookingData.selectedSlots.length === 0) {
      display.innerHTML = `
        <div class="no-slots-selected">
          <p style="color:#666;text-align:center;padding:1rem;background:#f9f9f9;border-radius:8px;margin-top:1rem;">
            <strong>📅 No time slots selected</strong><br>
            Click on time slots above to select your preferred booking time.<br>
            <small>Minimum: ${minSlots * 0.5} hour${minSlots * 0.5 === 1 ? "" : "s"} (${minSlots} consecutive slot${minSlots === 1 ? "" : "s"})${['axe_throw','archery'].includes(this.bookingData.sport) ? " for this sport" : ""}</small>
          </p>
        </div>`;
      return;
    }

    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime   = this.formatTime(this.bookingData.endTime);
    const duration  = this.bookingData.duration;
    const amount    = this.bookingData.totalAmount;

    let timeDisplayText = `${startTime} - ${endTime}`;
    if (this.bookingData.isCrossMidnight) {
      const startDateDisplay = this.formatDateShort(this.bookingData.actualStartDate);
      const endDateDisplay   = this.formatDateShort(this.bookingData.actualEndDate);
      timeDisplayText = `${startTime} (${startDateDisplay}) - ${endTime} (${endDateDisplay})`;
    } else {
      // If selection starts in the next-day segment (00:00–05:30), show the actual next-day date
      const startIsNextDay = this.isNextDayTime(this.bookingData.startTime);
      const displayDate = startIsNextDay
        ? this.bookingData.actualStartDate
        : (this.bookingData.finalBookingDate || this.bookingData.date);
      const dayText = this.formatDateShort(displayDate);
      timeDisplayText = `${startTime} - ${endTime} (${dayText})`;
    }

    display.innerHTML = `
      <div class="selected-time-info">
        <h4>Selected Time:</h4>
        <p><strong>${timeDisplayText}</strong></p>
        <p>Duration: ${duration} hour${duration !== 1 ? "s" : ""}</p>
        <p>Total Amount: <strong>PKR ${amount.toLocaleString()}</strong></p>
      </div>`;
  }

  updateBookingSummary() {
    const elements = {
      sport: document.getElementById("summary-sport"),
      court: document.getElementById("summary-court"),
      date: document.getElementById("summary-date"),
      time: document.getElementById("summary-time"),
      amount: document.getElementById("summary-amount"),
    };

    if (elements.sport) elements.sport.textContent = this.bookingData.sport.charAt(0).toUpperCase() + this.bookingData.sport.slice(1);
    if (elements.court) elements.court.textContent = this.bookingData.courtName;

    if (elements.date) {
      const startIsNextDay = this.isNextDayTime(this.bookingData.startTime);
      const displayDate = startIsNextDay
        ? this.bookingData.actualStartDate
        : (this.bookingData.finalBookingDate || this.bookingData.date);
      elements.date.textContent = this.formatDate(displayDate);
    }

    if (elements.time) {
      const startTime = this.formatTime(this.bookingData.startTime);
      const endTime   = this.formatTime(this.bookingData.endTime);
      if (this.bookingData.isCrossMidnight) {
        const startDateShort = this.formatDateShort(this.bookingData.actualStartDate);
        const endDateShort   = this.formatDateShort(this.bookingData.actualEndDate);
        elements.time.textContent = `${startTime} (${startDateShort}) - ${endTime} (${endDateShort}) (${this.bookingData.duration}h)`;
      } else {
        const startIsNextDay = this.isNextDayTime(this.bookingData.startTime);
        const displayDate = startIsNextDay
          ? this.bookingData.actualStartDate
          : (this.bookingData.finalBookingDate || this.bookingData.date);
        const dayText = this.formatDateShort(displayDate);
        elements.time.textContent = `${startTime} - ${endTime} (${dayText}, ${this.bookingData.duration}h)`;
      }
    }

    if (elements.amount) elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
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

    if (elements.sport) elements.sport.textContent = this.bookingData.sport.charAt(0).toUpperCase() + this.bookingData.sport.slice(1);
    if (elements.court) elements.court.textContent = this.bookingData.courtName;
    if (elements.datetime) elements.datetime.textContent = this.formatBookingDateTime();
    if (elements.name) elements.name.textContent = this.bookingData.playerName;
    if (elements.phone) elements.phone.textContent = this.bookingData.playerPhone;
    if (elements.amount) elements.amount.textContent = `PKR ${this.bookingData.totalAmount.toLocaleString()}`;
  }

  updatePaymentAmounts() {
    const advanceAmount = Math.floor(this.bookingData.totalAmount * 0.5);
    const fullAmount = this.bookingData.totalAmount;
    const advanceEl = document.getElementById("advance-amount");
    const fullEl = document.getElementById("full-amount");
    if (advanceEl) advanceEl.textContent = advanceAmount.toLocaleString();
    if (fullEl) fullEl.textContent = fullAmount.toLocaleString();

    const selectedPayment = document.querySelector('input[name="payment-type"]:checked');
    if (selectedPayment) this.bookingData.paymentType = selectedPayment.value;
  }

  async confirmBooking() {
    const confirmBtn = document.getElementById("confirm-booking");
    if (!confirmBtn) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
      this.saveStepData();
      this.bookingData.paymentType = document.querySelector('input[name="payment-type"]:checked')?.value || "advance";
      const minSlots = this.getMinSlotsForSport(this.bookingData.sport);

      if (!this.bookingData.selectedSlots || this.bookingData.selectedSlots.length === 0) {
        alert("⚠️ Please go back to Step 2 and select your preferred time slots before confirming your booking.");
        return;
      }
      if (this.bookingData.selectedSlots.length < minSlots) {
        const minHours = minSlots * 0.5;
        alert(`⚠️ Minimum booking for this sport is ${minHours} hour${minHours === 1 ? "" : "s"} (${minSlots} consecutive slot${minSlots === 1 ? "" : "s"}). Please select at least ${minSlots} slot${minSlots === 1 ? "" : "s"}.`);
        return;
      }

      await this.updateBookingTimeData();

      if (!this.validateBookingData()) {
        this.validateStep3(true);
        alert("Please ensure your name, phone (03XXXXXXXXX or +923XXXXXXXXX) and email are valid.");
        return;
      }

      confirmBtn.textContent = "Checking availability...";
      const conflictCheck = await this.checkForConflicts();
      if (conflictCheck.hasConflict) {
        alert(`Sorry, ${conflictCheck.message}. Please go back and select different time slots.`);
        return;
      }

      confirmBtn.textContent = "Finalizing booking...";

      const bookingPayload = {
        ...this.bookingData,
        // Always send the workday date (selected date)
        date: this.bookingData.finalBookingDate || this.bookingData.date,
        booking_date: this.bookingData.finalBookingDate || this.bookingData.date
      };

      const response = await fetch("/api/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (result.success) {
        this.showBookingConfirmation(result.bookingId);
        await this.sendAdminNotification(result.bookingId);
        await this.sendCustomerNotification(result.bookingId);
      } else {
        throw new Error(result.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert(`Sorry, there was an error processing your booking: ${error.message}. Please try again or contact support.`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm Booking";
    }
  }

  validateBookingData() {
    const required = [
      "sport","court","courtName","date","startTime","endTime","duration","selectedSlots","playerName","playerPhone",
    ];
    for (const field of required) {
      const val = this.bookingData[field];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        console.error(`❌ Missing required field: ${field}`, this.bookingData);
        return false;
      }
    }
    // Extra client validation for phone/email
    const phoneValid = /^(03\d{9}|\+923\d{9})$/.test(this.bookingData.playerPhone || "");
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.bookingData.playerEmail || "");
    return phoneValid && emailValid;
  }

  // Update WhatsApp links with configured number and prefilled message
  updateWhatsAppLinks() {
    const number = (window.WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
    if (!number) return;
    const message = `Hello Noball Sports Club,%0A%0AI have a booking:%0A- Sport: ${this.bookingData.sport}%0A- Court: ${this.bookingData.courtName}%0A- Date/Time: ${this.formatBookingDateTime()}%0A- Name: ${this.bookingData.playerName}%0A- Phone: ${this.bookingData.playerPhone}%0A- Amount: PKR ${this.bookingData.totalAmount.toLocaleString()}%0A%0AI will send the payment screenshot now.`;
    const href = `https://wa.me/${number}?text=${message}`;
    const a1 = document.getElementById('whatsapp-link');
    const a2 = document.getElementById('whatsapp-link-confirm');
    if (a1) a1.href = href;
    if (a2) a2.href = href;
  }

  async checkForConflicts() {
    try {
      const conflictCheckData = {
        court: this.bookingData.court,
        date: this.bookingData.finalBookingDate || this.bookingData.date, // workday
        selectedSlots: this.bookingData.selectedSlots,
      };
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
    const step4 = document.getElementById("step-4");
    const confirmation = document.getElementById("booking-confirmation");
    const bookingIdEl = document.getElementById("generated-booking-id");

    if (step4) step4.style.display = "none";
    if (confirmation) confirmation.style.display = "block";
    if (bookingIdEl) bookingIdEl.textContent = bookingId;
    if (confirmation) confirmation.scrollIntoView({ behavior: "smooth" });
    this.updateWhatsAppLinks();
  }

  async sendAdminNotification(bookingId) {
    try {
      if (typeof emailjs === "undefined") return false;

      const templateParams = {
        booking_id: bookingId,
        sport: this.bookingData.sport.charAt(0).toUpperCase() + this.bookingData.sport.slice(1),
        court_name: this.bookingData.courtName,
        booking_datetime: this.formatBookingDateTime(),
        duration: this.bookingData.duration.toString(),
        total_amount: this.bookingData.totalAmount.toLocaleString(),
        payment_type: this.bookingData.paymentType === "advance" ? "50% Advance Payment" : "Full Payment",
        player_name: this.bookingData.playerName,
        player_phone: this.bookingData.playerPhone,
        player_email: this.bookingData.playerEmail || "Not provided",
        player_count: this.bookingData.playerCount || "2",
        special_requests: this.bookingData.specialRequests || "None",
        submission_time: new Date().toLocaleString("en-US", {
          year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
        }),
        to_email: "noballarena@gmail.com",
      };

      await emailjs.send("service_y85g6ha", "template_ceqhxb3", templateParams);
      return true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return false;
    }
  }

  async sendCustomerNotification(bookingId) {
    try {
      if (typeof emailjs === "undefined") return false;

      const toEmail = this.bookingData.playerEmail?.trim();
      if (!toEmail) return false;

      const templateParams = {
        // recipient
        to_email: toEmail,

        // booking basics
        booking_id: bookingId,
        sport: this.bookingData.sport.charAt(0).toUpperCase() + this.bookingData.sport.slice(1),
        court_name: this.bookingData.courtName,
        booking_datetime: this.formatBookingDateTime(),
        duration: this.bookingData.duration.toString(),
        total_amount: this.bookingData.totalAmount.toLocaleString(),
        payment_type: this.bookingData.paymentType === "advance" ? "50% Advance Payment" : "Full Payment",

        // customer info
        customer_name: this.bookingData.playerName,
        customer_phone: this.bookingData.playerPhone,
        customer_email: toEmail,

        // footer or note
        note: "Thank you for booking with The NoBall Sports Club!",
      };

      // Send via EmailJS service (same as admin), but using a customer-facing template
      await emailjs.send(this.getEmailJsServiceId(), this.getEmailJsCustomerTemplateId(), templateParams);
      return true;
    } catch (error) {
      console.error("Failed to send customer email:", error);
      return false;
    }
  }

  isNextDayTime(time) {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 0 && hour <= 5;
  }

  formatTime(time) {
    const [hour, minute] = time.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  formatBookingDateTime() {
    const startTime = this.formatTime(this.bookingData.startTime);
    const endTime = this.formatTime(this.bookingData.endTime);
    const workday = this.bookingData.finalBookingDate || this.bookingData.date;
    const isStartNextDay = this.isNextDayTime(this.bookingData.startTime);
    const isEndNextDay = this.isNextDayTime(this.bookingData.endTime);

    if (!isStartNextDay && !isEndNextDay) {
      return `${this.formatDate(workday)} from ${startTime} to ${endTime}`;
    } else if (!isStartNextDay && isEndNextDay) {
      const nextDay = new Date(workday); nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(workday)} ${startTime} to ${this.formatDate(nextDay.toISOString().split("T")[0])} ${endTime}`;
    } else {
      const nextDay = new Date(workday); nextDay.setDate(nextDay.getDate() + 1);
      return `${this.formatDate(nextDay.toISOString().split("T")[0])} from ${startTime} to ${endTime}`;
    }
  }

  async calculateDynamicPrice() {
    try {
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: this.bookingData.court,
          booking_date: this.bookingData.finalBookingDate || this.bookingData.date, // workday date
          selected_slots: this.bookingData.selectedSlots
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        this.bookingData.totalAmount = result.total_price;
        this.bookingData.originalAmount = result.total_price;
      } else {
        throw new Error(result.message || "Failed to calculate price");
      }
    } catch (error) {
      console.error("❌ Error calculating dynamic price:", error);
      const hourlyRate = this.sportPricing[this.bookingData.sport] || 2500;
      const amount = Math.round(hourlyRate * this.bookingData.duration);
      this.bookingData.totalAmount = amount;
      this.bookingData.originalAmount = amount;
    }
  }

  // Promo Code functions (unchanged logic)
  async applyPromoCode() {
    const promoInput = document.getElementById('promo-code-input');
    const promoCode = (promoInput?.value || "").trim().toUpperCase();

    if (!promoCode) { this.showPromoMessage('Please enter a promo code', 'error'); return; }
    if (!this.bookingData.originalAmount || this.bookingData.originalAmount <= 0) {
      this.showPromoMessage('Please complete your booking details first', 'error'); return;
    }
    if (!this.bookingData.sport || !this.bookingData.finalBookingDate || !this.bookingData.startTime) {
      this.showPromoMessage('Please complete your booking details first', 'error'); return;
    }

    this.setPromoLoadingState(true);
    try {
      const response = await fetch('/api/apply-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promo_code: promoCode,
          booking_amount: this.bookingData.originalAmount,
          sport: this.bookingData.sport
        })
      });
      const result = await response.json();
      if (result.success) {
        this.bookingData.promoCode = promoCode;
        this.bookingData.discountAmount = result.discount_amount;
        this.bookingData.totalAmount = result.final_amount;
        this.showPromoApplied(promoCode, result.discount_amount, result.discount_text || '');
        this.updatePricingDisplay();
        this.updatePaymentAmounts();
      } else {
        this.showPromoMessage(result.message || 'Invalid promo code', 'error');
      }
    } catch (e) {
      console.error('❌ Error applying promo code:', e);
      this.showPromoMessage('Error applying promo code. Please try again.', 'error');
    } finally {
      this.setPromoLoadingState(false);
    }
  }

  removePromoCode() {
    this.bookingData.promoCode = '';
    this.bookingData.discountAmount = 0;
    this.bookingData.totalAmount = this.bookingData.originalAmount;
    const input = document.getElementById('promo-code-input');
    if (input) input.value = '';
    document.getElementById('promo-applied').style.display = 'none';
    document.getElementById('promo-form').style.display = 'block';
    this.updatePricingDisplay();
    this.updatePaymentAmounts();
  }

  showPromoApplied(code, discountAmount, discountText) {
    document.getElementById('applied-promo-code').textContent = code;
    document.getElementById('applied-discount-text').textContent = discountText || `You saved ₨${discountAmount.toLocaleString()}!`;
    document.getElementById('promo-form').style.display = 'none';
    document.getElementById('promo-applied').style.display = 'block';
    document.getElementById('promo-message').style.display = 'none';
  }

  showPromoMessage(message, type) {
    const messageEl = document.getElementById('promo-message');
    messageEl.textContent = message;
    messageEl.className = `promo-message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 5000);
  }

  setPromoLoadingState(loading) {
    const applyBtn = document.getElementById('apply-promo-btn');
    if (!applyBtn) return;
    const applyText = applyBtn.querySelector('.apply-text');
    const loadingText = applyBtn.querySelector('.loading-text');
    applyBtn.disabled = !!loading;
    if (applyText) applyText.style.display = loading ? 'none' : 'inline-block';
    if (loadingText) loadingText.style.display = loading ? 'inline-block' : 'none';
  }

  updatePricingDisplay() {
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
}

// Initialize booking system when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Initializing Booking System...");
  window.bookingSystem = new BookingSystem();
  console.log("✅ Booking System initialized successfully");
});

// Debug helpers
function debugCustomerSlots(court, date) {
  if (window.bookingSystem) {
    window.bookingSystem.bookingData.court = court || window.bookingSystem.bookingData.court || "padel-1";
    window.bookingSystem.bookingData.finalBookingDate = date || window.bookingSystem.bookingData.date;
    window.bookingSystem.loadTimeSlots();
  }
}

// Global promo code functions
function applyPromoCode() { window.bookingSystem?.applyPromoCode(); }
function removePromoCode() { window.bookingSystem?.removePromoCode(); }
