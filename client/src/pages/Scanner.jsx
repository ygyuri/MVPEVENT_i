import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useDispatch, useSelector } from "react-redux";
import {
  validateScan,
  clearScan,
  setScanning,
  enqueueOfflineScan,
  flushOfflineQueue,
} from "../store/slices/scannerSlice";

export default function Scanner() {
  const dispatch = useDispatch();
  const { lastResult, error, scanning } = useSelector((s) => s.scanner);
  const auth = useSelector((s) => s.auth);
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [location, setLocation] = useState("Gate A");
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const [preferBackCamera, setPreferBackCamera] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const audioCtxRef = useRef(null);
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
    if (!videoRef.current) {
      console.warn("⚠️ Video ref not available");
      return;
    }

    let controls = null;
    let isActive = true;

    const start = async () => {
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

        // Use decodeFromVideoDevice for better control and device selection
        try {
          if (!codeReader.current) {
            throw new Error("Scanner not initialized");
          }

          // Get available video devices
          const videoInputDevices =
            await codeReader.current.listVideoInputDevices();
          console.log(`📷 Found ${videoInputDevices.length} video device(s)`);

          // Find the preferred camera (back camera if available)
          let selectedDeviceId = null;
          if (videoInputDevices.length > 0) {
            if (preferBackCamera) {
              // Look for back/rear camera
              const backCamera = videoInputDevices.find(
                (device) =>
                  device.label.toLowerCase().includes("back") ||
                  device.label.toLowerCase().includes("rear") ||
                  device.label.toLowerCase().includes("environment") ||
                  device.label.toLowerCase().includes("facing back")
              );
              selectedDeviceId =
                backCamera?.deviceId ||
                videoInputDevices[videoInputDevices.length - 1]?.deviceId;
              console.log(
                "📷 Selected back camera:",
                selectedDeviceId || "using last device"
              );
            } else {
              // Use front camera
              const frontCamera = videoInputDevices.find(
                (device) =>
                  device.label.toLowerCase().includes("front") ||
                  device.label.toLowerCase().includes("user") ||
                  device.label.toLowerCase().includes("facing front")
              );
              selectedDeviceId =
                frontCamera?.deviceId || videoInputDevices[0]?.deviceId;
              console.log(
                "📷 Selected front camera:",
                selectedDeviceId || "using first device"
              );
            }
          }

          // Start decoding from video device (preferred method)
          controls = await codeReader.current.decodeFromVideoDevice(
            selectedDeviceId || undefined, // undefined uses default
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

                dispatch(validateScan({ qr: qrText, location, device }))
                  .unwrap()
                  .then(() => {
                    console.log("✅ Scan validation successful");
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
                    }, 2000); // Longer delay to prevent rapid re-scans
                  });
              }
            }
          );

          console.log("✅ QR scanner started successfully");
        } catch (decodeError) {
          // Fallback to decodeFromConstraints if decodeFromVideoDevice fails
          console.warn(
            "⚠️ decodeFromVideoDevice failed, trying decodeFromConstraints:",
            decodeError
          );
          controls = await codeReader.current.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result, err) => {
              if (!isActive || lockedRef.current) return;

              if (err) {
                const errorMessage = err?.message || err?.toString() || "";
                if (
                  errorMessage.includes("No MultiFormat Readers") ||
                  errorMessage.includes("detect the code") ||
                  errorMessage.includes("NotFoundException")
                ) {
                  return;
                }
                console.error("❌ QR Scanner error:", err);
                return;
              }

              if (result && isActive) {
                setLocked(true);
                lockedRef.current = true;

                let qrText = null;
                try {
                  qrText = result.getText
                    ? result.getText()
                    : result.text || String(result);
                  qrText = qrText.trim();

                  if (!qrText) {
                    setLocked(false);
                    lockedRef.current = false;
                    return;
                  }

                  console.log("✅ QR code scanned:", {
                    length: qrText.length,
                    prefix: qrText.substring(0, 50),
                  });

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

                  dispatch(validateScan({ qr: qrText, location, device }))
                    .unwrap()
                    .catch((error) => {
                      console.error("❌ Scan validation failed:", error);
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
                      }, 2000);
                    });
                } catch (e) {
                  console.error("❌ Error extracting QR text:", e);
                  setLocked(false);
                  lockedRef.current = false;
                }
              }
            }
          );
          console.log("✅ QR scanner started (fallback method)");
        }
      } catch (e) {
        console.error("❌ Failed to start camera/scanner:", e);
        dispatch(setScanning(false));
      }
    };

    start();

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
  }, [dispatch, location, preferBackCamera, torchOn]);

  const humanStatus = () => {
    if (lastResult?.valid) return "Valid";
    const code = lastResult?.code || error?.code || error?.error;
    if (!code) return "Ready";
    if (code === "ALREADY_USED") return "Already Used";
    if (code === "INVALID_QR") return "Invalid QR";
    if (code === "QR_EXPIRED") return "QR Expired";
    if (code === "ACCESS_DENIED") return "Access Denied";
    if (code === "RATE_LIMITED") return "Too many scans - slow down";
    return String(code);
  };
  const status = humanStatus();
  const isAlreadyUsed = lastResult?.code === "ALREADY_USED";
  const statusColor = lastResult?.valid
    ? "bg-emerald-600"
    : isAlreadyUsed
    ? "bg-red-700"
    : error
    ? "bg-red-600"
    : "bg-indigo-600";

  // Sounds & haptics on result change
  const lastStatusRef = useRef(null);
  useEffect(() => {
    const type = lastResult?.valid
      ? "success"
      : lastResult?.code === "ALREADY_USED"
      ? "warn"
      : error
      ? "error"
      : null;
    if (!type) return;
    if (lastStatusRef.current === type) return;
    lastStatusRef.current = type;
    try {
      if (type === "success") {
        playTone([
          { freq: 880, durationMs: 100, type: "sine", gain: 0.25, gapMs: 20 },
          { freq: 1320, durationMs: 120, type: "sine", gain: 0.25 },
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
      if (navigator?.vibrate)
        navigator.vibrate(
          type === "success"
            ? 60
            : type === "warn"
            ? [120, 80, 120]
            : [200, 100, 200]
        );
    } catch {}
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
      <div className="mt-4 text-white/60 text-sm">
        Role: {role || "unknown"} · {scanning ? "Camera on" : "Idle"}
      </div>
      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10">
        <video
          ref={videoRef}
          className="w-full aspect-[3/4] object-cover bg-black"
          autoPlay
          muted
          playsInline
        />
      </div>
      <div
        className={`mt-4 rounded-xl px-3 py-2 text-sm ${statusColor} shadow-lg border border-white/10 animate-[pulse_1s_ease-in-out_2]`}
      >
        {status}
      </div>
      {lastResult?.valid && (
        <div className="mt-4 rounded-2xl border border-white/10 p-4">
          <div className="font-semibold">{lastResult?.event?.title}</div>
          <div className="text-white/70 text-sm">
            Holder: {lastResult?.ticket?.holderName}
          </div>
          <div className="text-white/70 text-sm">
            Status: {lastResult?.status}
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => dispatch(clearScan())}
        >
          Clear
        </button>
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={() => dispatch(flushOfflineQueue())}
        >
          Flush Offline ({useSelector((s) => s.scanner.offlineCount) || 0})
        </button>
      </div>

      {/* Fullscreen flash overlay on scan */}
      {(lastResult || error) && (
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
      )}

      <style>{`
        @keyframes fadeout { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.02) } }
      `}</style>
    </div>
  );
}
