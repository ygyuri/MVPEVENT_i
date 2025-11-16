const crypto = require("crypto");

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const sanitizeRedirect = (value) => {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return "/";
  }

  if (!trimmed.startsWith("/")) {
    return `/${trimmed}`;
  }

  return trimmed;
};

const encodeState = (data) =>
  Buffer.from(JSON.stringify(data), "utf8").toString("base64url");

const decodeState = (encoded) => {
  try {
    // First, try to URL-decode in case Google/Express encoded it
    let decoded = encoded;
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      // If URL decoding fails, use original (might already be decoded)
      decoded = encoded;
    }
    
    // Then decode from base64url
    return JSON.parse(Buffer.from(decoded, "base64url").toString("utf8"));
  } catch (error) {
    console.error("❌ [STATE STORE] Failed to decode state:", {
      encoded: encoded?.substring(0, 50) + (encoded?.length > 50 ? "..." : ""),
      error: error.message,
    });
    throw error;
  }
};

class StatelessStateStore {
  constructor({ secret, ttl } = {}) {
    if (!secret) {
      throw new Error("StatelessStateStore requires a secret value");
    }

    this.secret = secret;
    this.ttl = typeof ttl === "number" ? ttl : DEFAULT_TTL_MS;
  }

  createSignature(payload) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", this.secret)
      .update(payloadString)
      .digest("hex");
  }

  buildPayload(req, providedState) {
    const redirect = sanitizeRedirect(
      providedState || req?.query?.redirect || "/"
    );

    return {
      redirect,
      nonce: crypto.randomBytes(16).toString("hex"),
      issuedAt: Date.now(),
    };
  }

  store(req, providedState, _meta, callback) {
    try {
      const payload = this.buildPayload(req, providedState);
      const signature = this.createSignature(payload);
      const encoded = encodeState({ ...payload, signature });
      console.log("✅ [STATE STORE] State stored successfully", {
        redirect: payload.redirect,
        stateLength: encoded.length,
      });
      callback(null, encoded);
    } catch (error) {
      console.error("❌ [STATE STORE] Error storing state:", {
        error: error.message,
        stack: error.stack,
      });
      callback(error);
    }
  }

  verify(_req, providedState, callback) {
    console.log("📥 [STATE STORE] State verification requested", {
      hasState: !!providedState,
      stateType: typeof providedState,
      stateLength: providedState?.length,
      statePreview: providedState ? (providedState.substring(0, 50) + (providedState.length > 50 ? "..." : "")) : "none",
      timestamp: new Date().toISOString(),
    });

    if (!providedState) {
      console.warn("⚠️ [STATE STORE] No state provided, using default redirect");
      return callback(null, true, { redirect: "/" });
    }

    // Check if the state looks like an error URL (not our encoded state)
    // Our encoded states are base64url, which don't contain query parameters
    if (
      typeof providedState === "string" &&
      (providedState.includes("oauth=failed") ||
        providedState.includes("oauth=error") ||
        providedState.includes("message=") ||
        providedState.startsWith("/?") ||
        providedState.includes("&"))
    ) {
      console.error("❌ [STATE STORE] State appears to be an error URL, not encoded state", {
        statePreview: providedState.substring(0, 100),
      });
      return callback(null, false, {
        message: "Invalid state parameter format. Please try again from the home page.",
      });
    }

    try {
      console.log("🔍 [STATE STORE] Verifying state:", {
        stateLength: providedState.length,
        statePreview: providedState.substring(0, 50) + (providedState.length > 50 ? "..." : ""),
      });

      const decoded = decodeState(providedState);
      const { signature, ...payload } = decoded;

      if (!signature) {
        console.error("❌ [STATE STORE] Missing signature in decoded state");
        return callback(null, false, {
          message: "Invalid authorization request state.",
        });
      }

      const expectedSignature = this.createSignature(payload);

      const providedBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        console.error("❌ [STATE STORE] Signature mismatch", {
          providedLength: providedBuffer.length,
          expectedLength: expectedBuffer.length,
        });
        return callback(null, false, {
          message: "Authorization request state mismatch.",
        });
      }

      const stateAge = Date.now() - payload.issuedAt;
      if (stateAge > this.ttl) {
        console.error("❌ [STATE STORE] State expired", {
          age: stateAge,
          ttl: this.ttl,
          expiredBy: stateAge - this.ttl,
        });
        return callback(null, false, {
          message: "Authorization request state expired.",
        });
      }

      console.log("✅ [STATE STORE] State validated successfully", {
        redirect: payload.redirect,
        age: stateAge,
        nonce: payload.nonce?.substring(0, 8) + "...",
      });

      return callback(null, true, payload);
    } catch (error) {
      console.error("❌ [STATE STORE] State validation error:", {
        error: error.message,
        stack: error.stack,
        statePreview: providedState?.substring(0, 50) + (providedState?.length > 50 ? "..." : ""),
      });
      return callback(null, false, {
        message: "Failed to validate authorization request state.",
      });
    }
  }
}

module.exports = StatelessStateStore;






