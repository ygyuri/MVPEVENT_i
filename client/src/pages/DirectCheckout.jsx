import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShoppingCart,
  Ticket,
  ChevronDown,
  Plus,
  Minus,
  Shield,
} from "lucide-react";
import api from "../utils/api";
import { useTheme } from "../contexts/ThemeContext";
import { Helmet } from "react-helmet-async";
import payheroLogo from "../assets/payhero-logo.png";
import tajilabsLogo from "../assets/tajilabs-logo-horizontal.png";
import FeaturedEventsMasonry from "../components/FeaturedEventsMasonry";

const DirectCheckout = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useTheme();
  const referralCode = searchParams.get("ref") || "";

  // State
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Ref to prevent double submission (race condition protection)
  const isSubmittingRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "", // Merged name field instead of firstName/lastName
    email: "",
    phone: "",
    quantity: 1,
    ticketType: "",
  });

  // Country code state
  const [countryCode, setCountryCode] = useState("+254");

  // Country codes list
  const countryCodes = [
    { code: "+254", country: "Kenya", flag: "🇰🇪", placeholder: "712 345 678" },
    { code: "+256", country: "Uganda", flag: "🇺🇬", placeholder: "712 345 678" },
    {
      code: "+255",
      country: "Tanzania",
      flag: "🇹🇿",
      placeholder: "712 345 678",
    },
    { code: "+250", country: "Rwanda", flag: "🇷🇼", placeholder: "712 345 678" },
    {
      code: "+27",
      country: "South Africa",
      flag: "🇿🇦",
      placeholder: "812 345 678",
    },
    {
      code: "+234",
      country: "Nigeria",
      flag: "🇳🇬",
      placeholder: "812 345 678",
    },
    { code: "+233", country: "Ghana", flag: "🇬🇭", placeholder: "242 345 678" },
    {
      code: "+1",
      country: "USA/Canada",
      flag: "🇺🇸",
      placeholder: "555 123 4567",
    },
    { code: "+44", country: "UK", flag: "🇬🇧", placeholder: "7700 900123" },
  ];

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Dropdown state
  const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);

  // Refs for scrolling to errors
  const formRefs = {
    ticketType: useRef(null),
    quantity: useRef(null),
    fullName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
  };

  // Dropdown ref
  const ticketDropdownRef = useRef(null);

  // Validation functions
  const validateName = (name) => {
    if (!name || name.trim() === "") return "This field is required";
    if (!/^[A-Za-z\s'-]+$/.test(name))
      return "Only letters, spaces, hyphens, and apostrophes allowed";
    if (name.trim().length < 2) return "Must be at least 2 characters";
    if (name.trim().length > 50) return "Must be less than 50 characters";
    return null;
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === "") return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === "") return "Phone number is required";
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");

    // Since we're using country code prefix, expect 9 digits (removes leading 0)
    // For most East African countries: 9 digits after country code
    // For USA/Canada: 10 digits
    // For UK: 10 digits
    let expectedLength = 9;
    if (countryCode === "+1") expectedLength = 10; // USA/Canada
    if (countryCode === "+44") expectedLength = 10; // UK

    if (digitsOnly.length !== expectedLength) {
      return `Please enter ${expectedLength} digits (without leading 0)`;
    }

    // Additional validation for specific countries
    if (countryCode === "+254" && !["7", "1"].includes(digitsOnly[0])) {
      return "Kenya numbers should start with 7 or 1";
    }

    return null;
  };

  const validateField = (name, value) => {
    switch (name) {
      case "fullName":
        return validateName(value);
      case "email":
        return validateEmail(value);
      case "phone":
        return validatePhone(value);
      case "ticketType":
        return !value ? "Please select a ticket type" : null;
      case "quantity":
        const qty = parseInt(value);
        if (isNaN(qty) || qty < 1) return "Quantity must be at least 1";
        if (qty > 20) return "Maximum 20 tickets per order";
        return null;
      default:
        return null;
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const digitsOnly = value.replace(/\D/g, "");

    // If starts with 254, format as +254 7XX XXX XXX
    if (digitsOnly.startsWith("254")) {
      if (digitsOnly.length <= 3) return `+${digitsOnly}`;
      if (digitsOnly.length <= 6) return `+254 ${digitsOnly.slice(3)}`;
      if (digitsOnly.length <= 9)
        return `+254 ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;
      return `+254 ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(
        6,
        9
      )} ${digitsOnly.slice(9, 12)}`;
    }

    // Format as 07XX XXX XXX
    if (digitsOnly.length === 0) return "";
    if (digitsOnly.length <= 4) return digitsOnly;
    if (digitsOnly.length <= 7)
      return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(
      4,
      7
    )} ${digitsOnly.slice(7, 10)}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        ticketDropdownRef.current &&
        !ticketDropdownRef.current.contains(event.target)
      ) {
        setIsTicketDropdownOpen(false);
      }
    };

    if (isTicketDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isTicketDropdownOpen]);

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = referralCode ? `?ref=${referralCode}` : "";
        const response = await api.get(`/api/events/${slug}/checkout${params}`);

        const eventData = response.data.event;
        setEvent(eventData);

        // Set default ticket type if available
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            ticketType: eventData.ticketTypes[0].name,
          }));
        }
      } catch (err) {
        console.error("❌ Error fetching event:", err);
        setError(err.response?.data?.error || "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [slug, referralCode]);

  // Handle form input changes with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let processedValue = value;

    // Format phone number
    if (name === "phone") {
      processedValue = formatPhoneNumber(value);
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Mark field as touched
    setTouchedFields((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate and update errors
    const error = validateField(name, processedValue);
    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Handle quantity change with buttons
  const handleQuantityChange = (delta) => {
    const newQuantity = Math.max(1, Math.min(20, formData.quantity + delta));
    setFormData((prev) => ({ ...prev, quantity: newQuantity }));
    setTouchedFields((prev) => ({ ...prev, quantity: true }));

    const error = validateField("quantity", newQuantity);
    setValidationErrors((prev) => ({ ...prev, quantity: error }));
  };

  // Handle blur event
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Calculate total price
  const getSelectedTicketPrice = () => {
    if (!event || !formData.ticketType) return 0;
    const ticket = event.ticketTypes?.find(
      (t) => t.name === formData.ticketType
    );
    return ticket?.price || 0;
  };

  const getTotalPrice = () => {
    return getSelectedTicketPrice() * formData.quantity;
  };

  const getCurrency = () => {
    if (!event || !formData.ticketType) return "KES";
    const ticket = event.ticketTypes?.find(
      (t) => t.name === formData.ticketType
    );
    return ticket?.currency || event.pricing?.currency || "KES";
  };

  // Handle form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // CRITICAL: Prevent double submission (race condition + React Strict Mode)
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    // Validate all fields
    const errors = {};
    const fields = ["ticketType", "quantity", "fullName", "email", "phone"];

    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    });

    // Mark all fields as touched
    const touched = {};
    fields.forEach((field) => {
      touched[field] = true;
    });
    setTouchedFields(touched);

    // If there are errors, scroll to first error and show message
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);

      // Find first error field and scroll to it
      const firstErrorField = fields.find((field) => errors[field]);
      if (firstErrorField && formRefs[firstErrorField]?.current) {
        formRefs[firstErrorField].current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        formRefs[firstErrorField].current.focus();
      }

      setError("Please fill in all required fields correctly");
      // Reset ref to allow retry after fixing validation errors
      isSubmittingRef.current = false;
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Format phone number with country code for API
      const cleanPhone = formData.phone.replace(/\D/g, "");
      const fullPhone = `${countryCode}${cleanPhone}`;

      // Split full name into firstName and lastName for backend compatibility
      // Ensure both fields are always provided (required by Ticket model)
      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      // If no last name provided, use first name as fallback to satisfy required field
      const lastName = nameParts.slice(1).join(" ") || firstName || "";

      // Validate that we have at least a first name
      if (!firstName) {
        setValidationErrors((prev) => ({
          ...prev,
          fullName: "Please enter your full name",
        }));
        setError("Please enter your full name");
        formRefs.fullName.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        formRefs.fullName.current?.focus();
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }

      const purchaseData = {
        eventId: event.id,
        ticketType: formData.ticketType.trim(),
        quantity: parseInt(formData.quantity),
        firstName: firstName,
        lastName: lastName,
        email: formData.email.trim().toLowerCase(),
        phone: fullPhone, // Send full phone with country code
        ...(referralCode && { referralCode }),
      };

      const response = await api.post(
        "/api/tickets/direct-purchase",
        purchaseData
      );

      if (response.data.success) {
        setSuccess(true);

        // Redirect to payment status page to show progress
        setTimeout(() => {
          navigate(`/payment/${response.data.data.orderId}`);
        }, 1500);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Purchase failed. Please try again."
      );

      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
      // Reset ref to allow retry if submission failed
      isSubmittingRef.current = false;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#4f0f69]" />
      </div>
    );
  }

  // Error state
  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full p-6 ${
            isDarkMode
              ? "bg-red-900/20 border border-red-500/30"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2
              className={`text-xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Error Loading Event
            </h2>
          </div>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
            {error}
          </p>
          <button
            onClick={() => navigate("/events")}
            className="mt-4 w-full btn-web3-primary py-2 rounded-lg"
          >
            Back to Events
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {event && (
        <Helmet>
          <title>{`${event.title || "Event Checkout"} | Event-i`}</title>
          <meta
            name="description"
            content={
              event.shortDescription ||
              `Get your tickets for ${event.title} on Event-i!`
            }
          />
          {/* Open Graph Meta Tags */}
          <meta property="og:title" content={event.title || "Event Checkout"} />
          <meta
            property="og:description"
            content={event.shortDescription || ""}
          />
          <meta
            property="og:image"
            content={
              event.coverImageUrl || "https://eventi.ke/default-og-image.png"
            }
          />
          <meta property="og:type" content="website" />
          <meta
            property="og:url"
            content={`https://eventi.ke/events/${slug}/checkout`}
          />
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={event.title || "Event Checkout"}
          />
          <meta
            name="twitter:description"
            content={event.shortDescription || ""}
          />
          <meta
            name="twitter:image"
            content={
              event.coverImageUrl || "https://eventi.ke/default-og-image.png"
            }
          />
          {/* Canonical */}
          <link
            rel="canonical"
            href={`https://eventi.ke/events/${slug}/checkout`}
          />
        </Helmet>
      )}
      <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="section-modern py-8 md:py-12">
          <div className="container-modern max-w-7xl">
            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 p-4 flex items-center gap-3 ${
                  isDarkMode
                    ? "bg-green-900/20 border border-green-500/30"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p
                    className={`font-medium ${
                      isDarkMode ? "text-green-400" : "text-green-800"
                    }`}
                  >
                    Order Created Successfully!
                  </p>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-green-300" : "text-green-600"
                    }`}
                  >
                    Redirecting to payment...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Event Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`overflow-hidden mb-8 shadow-xl ${
                isDarkMode
                  ? "bg-gray-800 border border-gray-700"
                  : "bg-white border border-gray-200 shadow-lg"
              }`}
            >
              {/* Event Image - Square Format */}
              <div className="relative w-full aspect-square md:max-w-2xl mx-auto overflow-hidden">
                <img
                  src={
                    event?.coverImageUrl ||
                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop"
                  }
                  alt={event?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                    {event?.title}
                  </h1>
                  <p className="text-gray-100 text-base sm:text-lg drop-shadow-md">
                    {event?.shortDescription}
                  </p>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-gray-900/50">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-4 rounded-lg shadow-md ${
                      isDarkMode ? "bg-[#4f0f69]/30" : "bg-[#4f0f69]/10"
                    }`}
                  >
                    <Calendar className="w-7 h-7 text-[#4f0f69] dark:text-[#8A4FFF]" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Date & Time
                    </p>
                    <p
                      className={`font-bold text-lg ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatDate(event?.dates?.startDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`p-4 rounded-lg shadow-md ${
                      isDarkMode ? "bg-[#4f0f69]/30" : "bg-[#4f0f69]/10"
                    }`}
                  >
                    <MapPin className="w-7 h-7 text-[#4f0f69] dark:text-[#8A4FFF]" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Venue
                    </p>
                    <p
                      className={`font-bold text-lg ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {event?.location?.venueName || "TBD"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Layout - Two Columns on Large Screens */}
            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Checkout Form - Takes 2 columns */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-2"
                >
                  <div
                    className={`p-6 md:p-8 shadow-xl ${
                      isDarkMode
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                      <div
                        className={`p-4 rounded-lg shadow-lg ${
                          isDarkMode
                            ? "bg-[#4f0f69]/30"
                            : "bg-gradient-to-br from-[#4f0f69]/10 to-[#8A4FFF]/10"
                        }`}
                      >
                        <Ticket className="w-8 h-8 text-[#4f0f69] dark:text-[#8A4FFF]" />
                      </div>
                      <div>
                        <h2
                          className={`text-2xl md:text-3xl font-bold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Complete Your Purchase
                        </h2>
                        <p
                          className={`text-sm mt-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Fill in your details to proceed
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Ticket Selection */}
                      <div ref={formRefs.ticketType}>
                        <label
                          className={`block text-sm font-semibold mb-3 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Select Ticket Type{" "}
                          <span className="text-red-500">*</span>
                        </label>

                        {!event?.ticketTypes ||
                        event.ticketTypes.length === 0 ? (
                          <div
                            className={`p-4 border-2 border-dashed ${
                              isDarkMode
                                ? "border-gray-600 bg-gray-800"
                                : "border-gray-300 bg-gray-50"
                            }`}
                          >
                            <p
                              className={`text-center ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              No ticket types configured for this event
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="relative" ref={ticketDropdownRef}>
                              {/* Custom Dropdown Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setIsTicketDropdownOpen(!isTicketDropdownOpen)
                                }
                                onBlur={handleBlur}
                                className={`w-full px-4 py-3.5 border-2 text-left transition-all ${
                                  touchedFields.ticketType &&
                                  validationErrors.ticketType
                                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                    : isDarkMode
                                    ? "bg-gray-900/50 border-gray-600 text-white focus:ring-[#4f0f69]/50 focus:border-[#4f0f69] hover:border-gray-500"
                                    : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] hover:border-gray-400"
                                } focus:ring-4 pr-10 font-medium flex items-center justify-between`}
                              >
                                <span>
                                  {formData.ticketType
                                    ? (() => {
                                        const selected = event.ticketTypes.find(
                                          (t) => t.name === formData.ticketType
                                        );
                                        return selected
                                          ? `${selected.name} - ${
                                              selected.currency || "KES"
                                            } ${(
                                              selected.price || 0
                                            ).toLocaleString()}`
                                          : "Select a ticket type";
                                      })()
                                    : "Select a ticket type"}
                                </span>
                                <ChevronDown
                                  className={`w-5 h-5 transition-transform ${
                                    isTicketDropdownOpen ? "rotate-180" : ""
                                  } ${
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-500"
                                  }`}
                                />
                              </button>

                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {isTicketDropdownOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute z-50 w-full mt-2 border-2 shadow-xl ${
                                      isDarkMode
                                        ? "bg-gray-800 border-gray-700"
                                        : "bg-white border-gray-200"
                                    } max-h-60 overflow-auto`}
                                  >
                                    {event.ticketTypes.map((ticket, index) => (
                                      <button
                                        key={ticket.name || index}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            ticketType: ticket.name,
                                          }));
                                          setIsTicketDropdownOpen(false);
                                          // Mark as touched
                                          setTouchedFields((prev) => ({
                                            ...prev,
                                            ticketType: true,
                                          }));
                                        }}
                                        className={`w-full px-4 py-3 text-left transition-all ${
                                          formData.ticketType === ticket.name
                                            ? isDarkMode
                                              ? "bg-[#4f0f69]/30 text-white"
                                              : "bg-[#4f0f69]/10 text-[#4f0f69]"
                                            : isDarkMode
                                            ? "hover:bg-gray-700 text-white"
                                            : "hover:bg-gray-50 text-gray-900"
                                        } border-b ${
                                          isDarkMode
                                            ? "border-gray-700"
                                            : "border-gray-100"
                                        } ${
                                          index === event.ticketTypes.length - 1
                                            ? "border-b-0"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-3 flex-1">
                                            {formData.ticketType ===
                                              ticket.name && (
                                              <CheckCircle className="w-4 h-4 text-[#4f0f69] dark:text-[#8A4FFF] flex-shrink-0" />
                                            )}
                                            <span className="font-semibold">
                                              {ticket.name}
                                            </span>
                                          </div>
                                          <span
                                            className={`font-bold ${
                                              isDarkMode
                                                ? "text-gray-300"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            {ticket.currency || "KES"}{" "}
                                            {(
                                              ticket.price || 0
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <p
                              className={`mt-2 text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {event.ticketTypes.length} ticket type
                              {event.ticketTypes.length > 1 ? "s" : ""}{" "}
                              available
                            </p>
                          </>
                        )}

                        <AnimatePresence>
                          {touchedFields.ticketType &&
                            validationErrors.ticketType && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-2 text-sm text-red-500 flex items-center gap-1"
                              >
                                <AlertCircle className="w-4 h-4" />
                                {validationErrors.ticketType}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>

                      {/* Quantity with +/- Buttons */}
                      <div
                        ref={formRefs.quantity}
                        className="pt-4 border-t border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <label
                            className={`text-base font-bold ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          {formData.ticketType && (
                            <div className="text-right">
                              <p
                                className={`text-xs ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                Subtotal
                              </p>
                              <p
                                className={`text-sm font-semibold ${
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }`}
                              >
                                {getCurrency()}{" "}
                                {getTotalPrice().toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={formData.quantity <= 1}
                            className={`p-4 rounded-lg border-2 transition-all flex-shrink-0 ${
                              formData.quantity <= 1
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[#4f0f69] hover:border-[#4f0f69] hover:text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            } ${
                              isDarkMode
                                ? "bg-gray-800 border-gray-600 text-gray-400"
                                : "bg-white border-gray-300 text-gray-700"
                            }`}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-6 h-6" />
                          </button>

                          <div className="flex-1">
                            <div
                              className={`relative border-2 text-center font-bold ${
                                touchedFields.quantity &&
                                validationErrors.quantity
                                  ? "border-red-500"
                                  : isDarkMode
                                  ? "bg-gray-900/50 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-900 shadow-sm"
                              }`}
                            >
                              <div className="py-6">
                                <span
                                  className={`text-5xl font-extrabold ${
                                    isDarkMode ? "text-white" : "text-gray-900"
                                  }`}
                                >
                                  {formData.quantity}
                                </span>
                              </div>
                              <div
                                className={`absolute bottom-2 left-0 right-0 text-xs font-normal ${
                                  isDarkMode ? "text-gray-500" : "text-gray-400"
                                }`}
                              >
                                {formData.quantity === 1 ? "ticket" : "tickets"}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuantityChange(1)}
                            disabled={formData.quantity >= 20}
                            className={`p-4 rounded-lg border-2 transition-all flex-shrink-0 ${
                              formData.quantity >= 20
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[#4f0f69] hover:border-[#4f0f69] hover:text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            } ${
                              isDarkMode
                                ? "bg-gray-800 border-gray-600 text-gray-400"
                                : "bg-white border-gray-300 text-gray-700"
                            }`}
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            Minimum: 1 ticket
                          </p>
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            Maximum: 20 tickets
                          </p>
                        </div>

                        <AnimatePresence>
                          {touchedFields.quantity &&
                            validationErrors.quantity && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-3 text-sm text-red-500 flex items-center gap-2"
                              >
                                <AlertCircle className="w-4 h-4" />
                                {validationErrors.quantity}
                              </motion.p>
                            )}
                        </AnimatePresence>
                      </div>

                      {/* Customer Information Section */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3
                          className={`text-lg font-bold mb-6 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Your Information
                        </h3>
                      </div>

                      <div ref={formRefs.fullName}>
                        <label
                          className={`block text-sm font-semibold mb-3 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="John Doe"
                          className={`w-full px-4 py-3.5 border-2 transition-all ${
                            touchedFields.fullName && validationErrors.fullName
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                              : isDarkMode
                              ? "bg-gray-900/50 border-gray-600 text-white focus:ring-[#4f0f69]/50 focus:border-[#4f0f69] hover:border-gray-500"
                              : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] hover:border-gray-400"
                          } focus:ring-4`}
                        />
                        <AnimatePresence>
                          {touchedFields.fullName &&
                            validationErrors.fullName && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-2 text-sm text-red-500 flex items-center gap-1"
                              >
                                <AlertCircle className="w-4 h-4" />
                                {validationErrors.fullName}
                              </motion.p>
                            )}
                        </AnimatePresence>
                        <p
                          className={`mt-2 text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Enter your full name (first and last)
                        </p>
                      </div>

                      <div ref={formRefs.email}>
                        <label
                          className={`block text-sm font-semibold mb-3 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="john@example.com"
                          className={`w-full px-4 py-3.5 border-2 transition-all ${
                            touchedFields.email && validationErrors.email
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                              : isDarkMode
                              ? "bg-gray-900/50 border-gray-600 text-white focus:ring-[#4f0f69]/50 focus:border-[#4f0f69] hover:border-gray-500"
                              : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] hover:border-gray-400"
                          } focus:ring-4`}
                        />
                        <AnimatePresence>
                          {touchedFields.email && validationErrors.email && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="mt-2 text-sm text-red-500 flex items-center gap-1"
                            >
                              <AlertCircle className="w-4 h-4" />
                              {validationErrors.email}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div ref={formRefs.phone}>
                        <label
                          className={`block text-sm font-semibold mb-3 ${
                            isDarkMode ? "text-gray-200" : "text-gray-800"
                          }`}
                        >
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                          {/* Country Code Dropdown */}
                          <div className="relative w-44">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className={`w-full px-3 py-3.5 border-2 appearance-none transition-all ${
                                isDarkMode
                                  ? "bg-gray-900/50 border-gray-600 text-white focus:ring-[#4f0f69]/50 focus:border-[#4f0f69] hover:border-gray-500"
                                  : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] hover:border-gray-400"
                              } focus:ring-4 pr-8 font-medium`}
                            >
                              {countryCodes.map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.flag} {item.code}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                          </div>

                          {/* Phone Number Input */}
                          <div className="flex-1">
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              placeholder={
                                countryCodes.find((c) => c.code === countryCode)
                                  ?.placeholder || "712 345 678"
                              }
                              className={`w-full px-4 py-3.5 border-2 transition-all ${
                                touchedFields.phone && validationErrors.phone
                                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                  : isDarkMode
                                  ? "bg-gray-900/50 border-gray-600 text-white focus:ring-[#4f0f69]/50 focus:border-[#4f0f69] hover:border-gray-500"
                                  : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-[#4f0f69]/20 focus:border-[#4f0f69] hover:border-gray-400"
                              } focus:ring-4`}
                            />
                          </div>
                        </div>
                        <AnimatePresence>
                          {touchedFields.phone && validationErrors.phone && (
                            <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="mt-2 text-sm text-red-500 flex items-center gap-1"
                            >
                              <AlertCircle className="w-4 h-4" />
                              {validationErrors.phone}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        <p
                          className={`mt-2 text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {countryCode === "+1" || countryCode === "+44"
                            ? "Enter 10 digits (e.g., 5551234567)"
                            : "Enter 9 digits without the leading 0 (e.g., 712345678)"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Order Summary Sidebar - Takes 1 column */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-1"
                >
                  <div className="sticky top-8">
                    <div
                      className={`relative overflow-hidden shadow-xl ${
                        isDarkMode
                          ? "bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-gray-700"
                          : "bg-gradient-to-br from-white/95 to-gray-50/95 border border-gray-200"
                      }`}
                    >
                      {/* Masonry Background */}
                      <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20 pointer-events-none">
                        <FeaturedEventsMasonry
                          baseOpacity={0.4}
                          subtleAnimations={true}
                        />
                      </div>
                      {/* Content Overlay */}
                      <div className="relative z-10 p-6 md:p-8">
                        <h3
                          className={`text-xl font-bold mb-6 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Order Summary
                        </h3>

                        {/* Price Breakdown */}
                        <div className="space-y-4 mb-6">
                          {formData.ticketType && (
                            <div className="flex justify-between items-center">
                              <div>
                                <p
                                  className={`font-semibold ${
                                    isDarkMode
                                      ? "text-gray-200"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {formData.ticketType}
                                </p>
                                <p
                                  className={`text-sm ${
                                    isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {formData.quantity} × {getCurrency()}{" "}
                                  {getSelectedTicketPrice().toLocaleString()}
                                </p>
                              </div>
                              <p
                                className={`font-bold ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {getCurrency()}{" "}
                                {getTotalPrice().toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-center mb-6">
                            <p
                              className={`text-lg font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Total Amount
                            </p>
                            <p
                              className={`text-3xl font-bold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {getCurrency()} {getTotalPrice().toLocaleString()}
                            </p>
                          </div>

                          <div
                            className={`p-4 mb-6 ${
                              isDarkMode ? "bg-[#4f0f69]/20" : "bg-[#4f0f69]/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <ShoppingCart className="w-6 h-6 text-[#4f0f69] dark:text-[#8A4FFF]" />
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }`}
                              >
                                {formData.quantity} ticket
                                {formData.quantity > 1 ? "s" : ""} selected
                              </p>
                            </div>
                          </div>

                          {/* Error Message */}
                          {error && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`p-4 flex items-start gap-3 mb-6 ${
                                isDarkMode
                                  ? "bg-red-900/20 border border-red-500/30"
                                  : "bg-red-50 border border-red-200"
                              }`}
                            >
                              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-red-400" : "text-red-600"
                                }`}
                              >
                                {error}
                              </p>
                            </motion.div>
                          )}

                          {/* Powered by Tajilabs */}
                          <div
                            className={`flex flex-col items-center justify-center gap-2 p-4 mb-6 ${
                              isDarkMode
                                ? "bg-gray-800/50 border border-gray-700"
                                : "bg-gray-50 border border-gray-200"
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Powered by
                            </p>
                            <a
                              href="https://tajilabs.co.ke"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={tajilabsLogo}
                                alt="Tajilabs"
                                className="h-8 object-contain"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            </a>
                          </div>

                          {/* Submit Button */}
                          <button
                            type="submit"
                            disabled={submitting || success}
                            className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                              submitting || success
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] hover:from-[#6b1a8a] hover:to-[#8A4FFF] text-white transform hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
                            }`}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </>
                            ) : success ? (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                Order Created!
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-5 h-5" />
                                Proceed to Payment
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default DirectCheckout;
