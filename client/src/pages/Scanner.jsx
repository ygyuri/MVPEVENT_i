import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useDispatch, useSelector } from "react-redux";

// Scan Overlay Component - Auto-clears after animation
function ScanOverlay({ lastResult, error, onAnimationEnd }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (lastResult || error) {
      setShow(true);
      // Clear overlay after animation, but keep result visible for user to read
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShow(false);
      }, 600); // Match animation duration - overlay fades out
      
      // Auto-clear the result after user has time to read it (8 seconds for success, 10 for errors)
      const clearDelay = lastResult?.valid ? 8000 : 10000;
      setTimeout(() => {
        if (onAnimationEnd) onAnimationEnd();
      }, clearDelay);
    } else {
      setShow(false);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [lastResult, error, onAnimationEnd]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-40 ${
        lastResult?.valid
          ? "bg-emerald-500/40"
          : lastResult?.code === "ALREADY_USED"
          ? "bg-red-600/40"
          : error
          ? "bg-red-700/40"
          : "bg-indigo-600/30"
      } animate-[fadeout_600ms_ease-in_1]`}
    ></div>
  );
}
import {
  validateScan,
  clearScan,
  setScanning,
  setError,
  enqueueOfflineScan,
  flushOfflineQueue,
  fetchRecentScans,
} from "../store/slices/scannerSlice";

export default function Scanner() {
  const dispatch = useDispatch();
  const { lastResult, error, scanning, recentScans } = useSelector((s) => s.scanner);
  const auth = useSelector((s) => s.auth);
  const [currentPage, setCurrentPage] = useState(1);
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [location, setLocation] = useState("Gate A");
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const [preferBackCamera, setPreferBackCamera] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const audioCtxRef = useRef(null);

  // Log component mount
  useEffect(() => {
    console.log("📱 Scanner component mounted");
    // Load recent scans on mount
    dispatch(fetchRecentScans({ page: 1, limit: 20 }));
    return () => {
      console.log("📱 Scanner component unmounting");
    };
  }, [dispatch]);

  // Refresh recent scans after successful scan
  useEffect(() => {
    if (lastResult?.valid || error) {
      // Refresh the first page to show the latest scan
      setCurrentPage(1);
      dispatch(fetchRecentScans({ page: 1, limit: 20 }));
    }
  }, [lastResult, error, dispatch]);

  // Sync currentPage with pagination from API
  useEffect(() => {
    if (recentScans.pagination.page !== currentPage) {
      setCurrentPage(recentScans.pagination.page);
    }
  }, [recentScans.pagination.page]);

  // Callback ref to ensure video element is captured
  const setVideoRef = (element) => {
    if (element) {
      videoRef.current = element;
      setVideoReady(true);
      console.log("✅ Video element ref set", {
        videoWidth: element.videoWidth,
        videoHeight: element.videoHeight,
        readyState: element.readyState,
      });
    }
  };
  const ensureAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch {}
    return audioCtxRef.current;
  };
  const playTone = async (pattern) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    let start = now;
    for (const step of pattern) {
      const {
        freq = 440,
        durationMs = 120,
        type = "sine",
        gain = 0.2,
        gapMs = 60,
      } = step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(gain, start);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      const end = start + durationMs / 1000;
      osc.stop(end);
      start = end + gapMs / 1000;
    }
  };

  useEffect(() => {
    console.log("🔧 Initializing QR scanner...");
    try {
      // BrowserMultiFormatReader automatically supports QR codes
      codeReader.current = new BrowserMultiFormatReader();
      console.log("✅ QR scanner initialized");
    } catch (e) {
      console.error("❌ Failed to initialize scanner:", e);
      codeReader.current = null;
    }
    return () => {
      try {
        if (codeReader.current) {
          codeReader.current.reset();
        }
      } catch {}
    };
  }, []);

  // Flush offline queue when we regain network
  useEffect(() => {
    const onOnline = () => dispatch(flushOfflineQueue());
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [dispatch]);

  useEffect(() => {
    console.log("🔄 Scanner effect triggered", {
      hasVideoRef: !!videoRef.current,
      videoReady,
      hasCodeReader: !!codeReader.current,
      preferBackCamera,
      torchOn,
      location,
    });

    // Wait for video element to be available in DOM
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait

    const checkVideoRef = () => {
      if (!videoRef.current || !videoReady) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(
            `⚠️ Video ref not ready, retrying... (${retryCount}/${maxRetries})`
          );
          setTimeout(checkVideoRef, 100);
          return;
        } else {
          console.error("❌ Video ref not ready after max retries");
          dispatch(setScanning(false));
          return;
        }
      }
      console.log("✅ Video ref ready, starting scanner");
      startScanner();
    };

    let controls = null;
    let isActive = true;

    const startScanner = async () => {
      if (!videoRef.current) {
        console.error("❌ Video ref still not available after retries");
        dispatch(setScanning(false));
        return;
      }

      console.log("🎥 Starting camera...", { preferBackCamera, torchOn });
      dispatch(setScanning(true));

      try {
        // Build video constraints - simpler and more compatible
        const constraints = {
          video: {
            facingMode: preferBackCamera ? { ideal: "environment" } : "user",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
        };

        // Add torch support if available and requested
        if (torchOn) {
          constraints.video.advanced = [{ torch: true }];
        }

        console.log("📹 Starting QR scanner with constraints:", constraints);

        // Use decodeFromConstraints (works reliably across browsers)
        try {
          if (!codeReader.current) {
            throw new Error("Scanner not initialized");
          }

          // Start decoding from constraints (handles camera selection via facingMode)
          controls = await codeReader.current.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result, err) => {
              if (!isActive || lockedRef.current) return;

              if (err) {
                // Suppress "No MultiFormat Readers were able to detect the code" errors
                const errorMessage = err?.message || err?.toString() || "";
                if (
                  errorMessage.includes("No MultiFormat Readers") ||
                  errorMessage.includes("detect the code") ||
                  errorMessage.includes("NotFoundException")
                ) {
                  // This is normal - scanner is checking frames, no QR visible yet
                  return;
                }
                // Log other errors
                console.error("❌ QR Scanner error:", err);
                return;
              }

              if (result && isActive) {
                setLocked(true);
                lockedRef.current = true;

                // Extract QR code text - handle different ZXing result formats
                let qrText = null;
                try {
                  // ZXing returns result with getText() method
                  if (typeof result.getText === "function") {
                    qrText = result.getText();
                  } else if (result.text) {
                    qrText = result.text;
                  } else if (typeof result === "string") {
                    qrText = result;
                  } else {
                    qrText = String(result);
                  }

                  // Ensure it's a string and trim whitespace
                  if (typeof qrText !== "string") {
                    console.error(
                      "❌ QR text is not a string:",
                      typeof qrText,
                      qrText
                    );
                    qrText = String(qrText);
                  }
                  qrText = qrText.trim();

                  if (!qrText) {
                    console.error("❌ Empty QR text extracted");
                    setLocked(false);
                    lockedRef.current = false;
                    return;
                  }

                  console.log("✅ QR code scanned:", {
                    length: qrText.length,
                    prefix: qrText.substring(0, 50),
                    format: result.getBarcodeFormat?.() || "unknown",
                  });
                } catch (e) {
                  console.error("❌ Error extracting QR text:", e);
                  setLocked(false);
                  lockedRef.current = false;
                  return;
                }

                const device = {
                  userAgent:
                    typeof navigator !== "undefined"
                      ? navigator.userAgent
                      : undefined,
                  platform:
                    typeof navigator !== "undefined"
                      ? navigator.platform
                      : undefined,
                  vendor:
                    typeof navigator !== "undefined"
                      ? navigator.vendor
                      : undefined,
                };

                // Server handles duplicate detection - no need for client-side check
                dispatch(validateScan({ qr: qrText, location, device }))
                  .unwrap()
                  .then((result) => {
                    console.log("✅ Scan validation successful", result);
                    // Recent scans will be refreshed by useEffect
                  })
                  .catch((error) => {
                    console.error("❌ Scan validation failed:", error);
                    // If offline, enqueue
                    if (!navigator.onLine) {
                      dispatch(
                        enqueueOfflineScan({ qr: qrText, location, device })
                      );
                    }
                  })
                  .finally(() => {
                    setTimeout(() => {
                      setLocked(false);
                      lockedRef.current = false;
                    }, 1500); // Reduced delay for faster re-scanning (was 3000ms)
                  });
              }
            }
          );

          console.log("✅ QR scanner started successfully");
        } catch (decodeError) {
          console.error("❌ Failed to start QR scanner:", decodeError);
          throw decodeError; // Re-throw to be caught by outer catch
        }
      } catch (e) {
        console.error("❌ Failed to start camera/scanner:", e);
        dispatch(setScanning(false));
        
        // Set user-friendly error message
        const errorMessage = e.message || e.toString();
        let userError = {
          title: "Camera Error",
          message: "Unable to access camera",
          details: "Please check your browser permissions and ensure camera access is allowed."
        };
        
        if (errorMessage.includes("Permission") || errorMessage.includes("permission")) {
          userError = {
            title: "Camera Permission Denied",
            message: "Camera access was denied. Please allow camera access in your browser settings.",
            details: "Go to your browser settings and enable camera permissions for this site, then refresh the page."
          };
        } else if (errorMessage.includes("NotFound") || errorMessage.includes("not found")) {
          userError = {
            title: "No Camera Found",
            message: "No camera device was found on your device.",
            details: "Please ensure a camera is connected and try again."
          };
        } else if (errorMessage.includes("NotAllowed") || errorMessage.includes("not allowed")) {
          userError = {
            title: "Camera Access Not Allowed",
            message: "Camera access is not allowed. Please enable it in your browser settings.",
            details: "Check your browser's privacy settings and allow camera access for this website."
          };
        } else if (errorMessage.includes("NotReadable") || errorMessage.includes("not readable")) {
          userError = {
            title: "Camera Not Available",
            message: "The camera is being used by another application.",
            details: "Please close other applications using the camera and try again."
          };
        }
        
        setCameraError({
          ...userError,
          code: 'CAMERA_ERROR',
          originalError: errorMessage
        });
      }
    };

    // Start checking for video ref (only if video is ready)
    if (videoReady) {
      checkVideoRef();
    } else {
      // Wait a bit for video ref callback to fire
      const timeout = setTimeout(() => {
        if (videoRef.current) {
          checkVideoRef();
        }
      }, 200);
      return () => clearTimeout(timeout);
    }

    return () => {
      console.log("🛑 Stopping QR scanner");
      isActive = false;
      try {
        if (controls) {
          controls.stop();
        }
        codeReader.current?.reset();
      } catch (e) {
        console.warn("⚠️ Error stopping scanner:", e);
      }
    };
  }, [dispatch, location, preferBackCamera, torchOn, videoReady]);

  const getStatusInfo = () => {
    if (lastResult?.valid) {
      return {
        title: "✅ Valid Ticket",
        message: "Ticket scanned successfully!",
        color: "bg-emerald-600",
        icon: "✓"
      };
    }
    
    const code = lastResult?.code || error?.code || error?.error;
    if (!code && !error) {
      return {
        title: "Ready to Scan",
        message: "Point camera at QR code",
        color: "bg-indigo-600",
        icon: "📷"
      };
    }
    
    // Use error message from enhanced error handling
    const errorTitle = error?.title || lastResult?.title || "Error";
    const errorMessage = error?.message || lastResult?.message || "Scan failed";
    const errorDetails = error?.details || lastResult?.details;
    
    const isAlreadyUsed = code === "ALREADY_USED";
    const isWarning = code === "RATE_LIMITED" || code === "EVENT_NOT_STARTED";
    
    return {
      title: errorTitle,
      message: errorMessage,
      details: errorDetails,
      color: isAlreadyUsed 
        ? "bg-red-700" 
        : isWarning 
        ? "bg-yellow-600" 
        : error 
        ? "bg-red-600"
        : "bg-orange-600",
      icon: isAlreadyUsed ? "⚠" : isWarning ? "⏱" : "✗",
      code: code
    };
  };
  
  const statusInfo = getStatusInfo();
  const isAlreadyUsed = lastResult?.code === "ALREADY_USED";

  // Sounds & haptics on result change - Enhanced for better feedback
  const lastStatusRef = useRef(null);
  const lastResultIdRef = useRef(null);
  
  useEffect(() => {
    const type = lastResult?.valid
      ? "success"
      : lastResult?.code === "ALREADY_USED"
      ? "warn"
      : error
      ? "error"
      : null;
    
    if (!type) return;
    
    // Check if this is a new result (by ticket ID or timestamp)
    const resultId = lastResult?.ticket?._id || lastResult?.ticketId || error?.code || Date.now();
    if (lastResultIdRef.current === resultId && lastStatusRef.current === type) {
      return; // Same result, don't play sound again
    }
    
    lastStatusRef.current = type;
    lastResultIdRef.current = resultId;
    
    try {
      if (type === "success") {
        // Success sound - more noticeable
        playTone([
          { freq: 880, durationMs: 150, type: "sine", gain: 0.3, gapMs: 30 },
          { freq: 1320, durationMs: 180, type: "sine", gain: 0.3, gapMs: 20 },
          { freq: 1760, durationMs: 200, type: "sine", gain: 0.25 },
        ]);
      } else if (type === "warn") {
        playTone([
          { freq: 520, durationMs: 140, type: "square", gain: 0.25, gapMs: 80 },
          { freq: 520, durationMs: 140, type: "square", gain: 0.25 },
        ]);
      } else if (type === "error") {
        playTone([
          {
            freq: 220,
            durationMs: 220,
            type: "sawtooth",
            gain: 0.25,
            gapMs: 40,
          },
          { freq: 180, durationMs: 240, type: "sawtooth", gain: 0.25 },
        ]);
      }
      
      // Haptic feedback
      if (navigator?.vibrate) {
        navigator.vibrate(
          type === "success"
            ? [100, 50, 100] // Success: double vibration
            : type === "warn"
            ? [120, 80, 120]
            : [200, 100, 200]
        );
      }
    } catch (e) {
      console.warn("⚠️ Error playing sound:", e);
    }
  }, [lastResult, error]);

  // Role gating hint only; backend enforces.
  const role = auth?.user?.role;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Scanner</h1>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="bg-white/10 rounded-xl px-3 py-2"
        >
          <option>Gate A</option>
          <option>Gate B</option>
          <option>Entrance</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => setPreferBackCamera((p) => !p)}
        >
          Camera: {preferBackCamera ? "Rear" : "Front"}
        </button>
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => setTorchOn((t) => !t)}
        >
          Torch: {torchOn ? "On" : "Off"}
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-white/60 text-sm">
          Role: {role || "unknown"} · {scanning ? "Camera on" : "Idle"}
          {!navigator.onLine && (
            <span className="ml-2 text-yellow-400">⚠ Offline</span>
          )}
        </div>
        {error && (
          <button
            onClick={() => dispatch(clearScan())}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            title="Clear error"
          >
            Clear Error
          </button>
        )}
      </div>
      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 relative">
        <video
          ref={setVideoRef}
          className="w-full aspect-[3/4] object-cover bg-black"
          autoPlay
          muted
          playsInline
          onLoadedMetadata={() => {
            console.log("✅ Video metadata loaded", {
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight,
            });
          }}
          onLoadedData={() => {
            console.log("✅ Video data loaded");
          }}
          onCanPlay={() => {
            console.log("✅ Video can play");
          }}
          onError={(e) => {
            console.error("❌ Video element error:", e);
          }}
        />
        {!scanning && !videoReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="text-lg font-semibold mb-2">
                Initializing camera...
              </div>
              <div className="text-sm text-white/70">
                Please wait
              </div>
            </div>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-white text-center px-4">
              <div className="text-lg font-semibold mb-2 text-yellow-400">
                ⚠ Camera Error
              </div>
              <div className="text-sm text-white/70">
                {cameraError.message}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Status/Error Display */}
      <div className="mt-4 space-y-3">
        {/* Main Status Card */}
        <div
          className={`rounded-xl px-4 py-3 ${statusInfo.color} shadow-lg border border-white/10 animate-[pulse_1s_ease-in-out_2]`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusInfo.icon}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">{statusInfo.title}</div>
              {statusInfo.message && (
                <div className="text-xs opacity-90 mt-0.5">{statusInfo.message}</div>
              )}
            </div>
          </div>
        </div>

        {/* Error Details Panel */}
        {(error || (lastResult && !lastResult.valid)) && statusInfo.details && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-red-400 text-lg">ℹ</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-red-200">Details</div>
                  <button
                    onClick={() => dispatch(clearScan())}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                    title="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-red-300/80">{statusInfo.details}</div>
                {error?.httpStatus && (
                  <div className="text-xs text-red-400/60 mt-2">
                    HTTP {error.httpStatus} {error.networkError ? '(Network Error)' : ''}
                  </div>
                )}
                {error?.code && (
                  <div className="text-xs text-red-400/60 mt-1">
                    Error Code: {error.code}
                  </div>
                )}
                {error?.networkError && (
                  <div className="mt-2 pt-2 border-t border-red-500/20">
                    <div className="text-xs text-red-300/70">
                      💡 <strong>Tip:</strong> Check your internet connection. Scans will be queued offline and processed when connection is restored.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Details */}
        {lastResult?.valid && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-4">
            <div className="space-y-2">
              {lastResult?.event?.title && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">🎫</span>
                  <div>
                    <div className="font-semibold text-emerald-200">{lastResult.event.title}</div>
                  </div>
                </div>
              )}
              {lastResult?.ticket?.holderName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">👤</span>
                  <span className="text-emerald-300">Holder: {lastResult.ticket.holderName}</span>
                </div>
              )}
              {lastResult?.ticket?.ticketNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">#</span>
                  <span className="text-emerald-300">Ticket: {lastResult.ticket.ticketNumber}</span>
                </div>
              )}
              {lastResult?.status && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-emerald-300">Status: {lastResult.status}</span>
                </div>
              )}
              {lastResult?.scannedAt && (
                <div className="flex items-center gap-2 text-xs text-emerald-400/70 mt-2 pt-2 border-t border-emerald-500/20">
                  <span>🕐</span>
                  <span>Scanned at: {new Date(lastResult.scannedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Recently Scanned Tickets List - From Database */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/90">
            Recently Scanned {recentScans.pagination.total > 0 && `(${recentScans.pagination.total})`}
          </h3>
          <button
            onClick={() => dispatch(fetchRecentScans({ page: 1, limit: 20 }))}
            className="text-xs text-white/60 hover:text-white/80 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            disabled={recentScans.loading}
          >
            {recentScans.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        
        {recentScans.loading && recentScans.scans.length === 0 ? (
          <div className="text-center py-4 text-white/60 text-sm">Loading scans...</div>
        ) : recentScans.scans.length === 0 ? (
          <div className="text-center py-4 text-white/60 text-sm">No scans yet</div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentScans.scans.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    item.valid
                      ? "bg-emerald-900/20 border border-emerald-500/30"
                      : "bg-red-900/20 border border-red-500/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/90 truncate">
                      {item.eventTitle || "Event"}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      Ticket: {item.ticketNumber || "N/A"}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      {item.holderName || "Unknown"}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {new Date(item.scannedAt).toLocaleString()}
                      {item.location && ` · ${item.location}`}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-col items-center">
                    {item.valid ? (
                      <span className="text-emerald-400 text-lg">✓</span>
                    ) : (
                      <span className="text-red-400 text-lg">✗</span>
                    )}
                    <span className="text-xs text-white/50 mt-1">
                      {item.result === "success" ? "Valid" : item.result.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {recentScans.pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    dispatch(fetchRecentScans({ page: newPage, limit: 20 }));
                  }}
                  disabled={!recentScans.pagination.hasPrev || recentScans.loading}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white/90"
                >
                  ← Previous
                </button>
                <span className="text-xs text-white/60">
                  Page {recentScans.pagination.page} of {recentScans.pagination.pages}
                </span>
                <button
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    dispatch(fetchRecentScans({ page: newPage, limit: 20 }));
                  }}
                  disabled={!recentScans.pagination.hasNext || recentScans.loading}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white/90"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => {
            dispatch(clearScan());
          }}
        >
          Clear Result
        </button>
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => dispatch(flushOfflineQueue())}
        >
          Flush Offline ({useSelector((s) => s.scanner.offlineCount) || 0})
        </button>
      </div>

      {/* Camera Error Display - Only show if there's an actual camera error */}
      {cameraError && (
        <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg">⚠</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-200">{cameraError.title}</div>
              <div className="text-xs text-yellow-300/80 mt-1">{cameraError.message}</div>
              {cameraError.details && (
                <div className="text-xs text-yellow-300/70 mt-2">{cameraError.details}</div>
              )}
              <button
                onClick={() => setCameraError(null)}
                className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen flash overlay on scan - Auto-clear after animation */}
      <ScanOverlay lastResult={lastResult} error={error} onAnimationEnd={() => {
        // Auto-clear after overlay animation completes
        setTimeout(() => {
          dispatch(clearScan());
        }, 600);
      }} />

      <style>{`
        @keyframes fadeout { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.02) } }
      `}</style>
    </div>
  );
}
