import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import QRCode from 'react-qr-code';

const QRTest = () => {
  const [ticketId, setTicketId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [generateError, setGenerateError] = useState(null);

  const [scanQr, setScanQr] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [availableTickets, setAvailableTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);
  const [events, setEvents] = useState([]);
  const [fixingValidity, setFixingValidity] = useState(false);
  const [seedingEvent, setSeedingEvent] = useState(false);

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent duplicate submissions
    if (generating) {
      console.warn('⚠️ Already generating QR, ignoring duplicate request');
      return;
    }
    
    setGenerating(true);
    setGenerateError(null);
    setQrData(null);

    try {
      const response = await api.post(`/api/tickets/test/generate-qr/${ticketId.trim()}`, {
        rotate: false
      });

      if (response.data.success) {
        setQrData(response.data.data);
        console.log('✅ QR Generated:', response.data.data);
      } else {
        setGenerateError(response.data.error || 'Failed to generate QR');
      }
    } catch (error) {
      console.error('❌ Generate QR Error:', error);
      setGenerateError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to generate QR code'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleScanQR = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent duplicate submissions
    if (scanning) {
      console.warn('⚠️ Already scanning, ignoring duplicate request');
      return;
    }
    
    // Trim and validate QR string
    const trimmedQr = scanQr.trim();
    if (!trimmedQr) {
      setScanError({ error: 'QR code string cannot be empty', code: 'EMPTY_QR' });
      return;
    }
    
    setScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await api.post('/api/tickets/test/scan', {
        qr: trimmedQr,
        location: 'Test Browser',
        device: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor
        }
      });

      if (response.data.success) {
        setScanResult(response.data);
        console.log('✅ Scan Result:', response.data);
      } else {
        setScanError(response.data);
      }
    } catch (error) {
      console.error('❌ Scan Error:', error);
      console.error('❌ Scan Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        qrLength: trimmedQr.length,
        qrPreview: trimmedQr.substring(0, 100)
      });
      
      const errorData = error.response?.data || { 
        error: error.message || 'Failed to scan QR code',
        code: 'UNKNOWN_ERROR',
        message: error.response?.status === 400 
          ? 'Bad Request - Check QR code format'
          : error.message || 'Failed to scan QR code'
      };
      setScanError(errorData);
    } finally {
      setScanning(false);
    }
  };

  const fetchAvailableTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await api.get('/api/tickets/test/list', {
        params: { limit: 20 }
      });
      if (response.data.success) {
        setAvailableTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await api.get('/api/tickets/test/events');
      if (response.data.success) {
        setEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fixEventValidity = async (eventId, daysFromNow = 30) => {
    setFixingValidity(true);
    try {
      const response = await api.post('/api/tickets/test/fix-validity', {
        eventId,
        daysFromNow
      });
      if (response.data.success) {
        alert(`✅ Updated ${response.data.updated} event(s)! Tickets are now valid.`);
        // Refresh tickets and events
        fetchAvailableTickets();
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to fix validity:', error);
      alert('Failed to fix validity: ' + (error.response?.data?.error || error.message));
    } finally {
      setFixingValidity(false);
    }
  };

  const seedNewEvent = async () => {
    setSeedingEvent(true);
    try {
      const response = await api.post('/api/tickets/test/seed-event');
      if (response.data.success) {
        const eventId = response.data.event.id;
        alert(`✅ New test event created!\n\nEvent ID: ${eventId}\nTitle: ${response.data.event.title}\n\nThis event is valid for testing.`);
        // Refresh events list
        fetchEvents();
        // Refresh tickets (in case any were created)
        fetchAvailableTickets();
      }
    } catch (error) {
      console.error('Failed to seed event:', error);
      alert('Failed to seed event: ' + (error.response?.data?.error || error.message));
    } finally {
      setSeedingEvent(false);
    }
  };

  useEffect(() => {
    fetchAvailableTickets();
    fetchEvents();
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎫 QR Code Test Page
          </h1>
          <p className="text-white/80 text-lg">
            Test QR code generation and scanning endpoints
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generate QR Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              📱 Generate QR Code
            </h2>

            <form onSubmit={handleGenerateQR} className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/90 text-sm font-medium">
                    Ticket ID
                  </label>
                  <button
                    type="button"
                    onClick={fetchAvailableTickets}
                    disabled={loadingTickets}
                    className="text-xs px-3 py-1 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingTickets ? '⏳ Loading...' : '🔄 Refresh List'}
                  </button>
                </div>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="Enter ticket ID or select from list below"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  required
                />
              </div>

              {/* Available Tickets List */}
              {availableTickets.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <p className="text-white/80 text-xs font-medium mb-2">
                    Available Tickets ({availableTickets.length}):
                  </p>
                  <div className="space-y-2">
                    {availableTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setTicketId(ticket.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          ticketId === ticket.id
                            ? 'bg-purple-600/50 border-purple-400'
                            : 'bg-white/5 border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm truncate">
                                {ticket.eventTitle}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                ticket.status === 'active' 
                                  ? 'bg-green-500/30 text-green-200' 
                                  : ticket.status === 'used'
                                  ? 'bg-red-500/30 text-red-200'
                                  : 'bg-gray-500/30 text-gray-200'
                              }`}>
                                {ticket.status}
                              </span>
                              {ticket.orderPaid && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-200">
                                  Paid
                                </span>
                              )}
                              {ticket.hasQR && (
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/30 text-purple-200">
                                  Has QR
                                </span>
                              )}
                              {ticket.validity && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  ticket.validity.isCurrentlyValid
                                    ? 'bg-green-500/30 text-green-200'
                                    : 'bg-red-500/30 text-red-200'
                                }`}>
                                  {ticket.validity.isCurrentlyValid ? 'Valid Now' : 'Expired'}
                                </span>
                              )}
                            </div>
                            <div className="text-white/70 text-xs space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{ticket.id.substring(0, 8)}...</span>
                                {ticket.ticketNumber && (
                                  <span>• {ticket.ticketNumber}</span>
                                )}
                              </div>
                              <div className="text-white/60">
                                {ticket.holderName || 'No holder name'}
                              </div>
                              {ticket.validity && !ticket.validity.isCurrentlyValid && (
                                <div className="text-red-300 text-xs mt-1">
                                  {ticket.validity.validUntil && new Date(ticket.validity.validUntil) < new Date() 
                                    ? `Expired: ${ticket.validity.validUntilFormatted}`
                                    : ticket.validity.validFrom && new Date(ticket.validity.validFrom) > new Date()
                                    ? `Valid from: ${ticket.validity.validFromFormatted}`
                                    : 'Invalid'
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-2 text-white/60">
                            →
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableTickets.length === 0 && !loadingTickets && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                  <p className="text-yellow-200 text-sm">
                    No tickets found. Make sure you have tickets in your database.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={generating || !ticketId.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                onClick={(e) => {
                  // Additional click handler to prevent double-clicks
                  if (generating) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {generating ? '⏳ Generating...' : '✨ Generate QR Code'}
              </button>
            </form>

            {generateError && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-200 font-medium">Error:</p>
                <p className="text-red-100 text-sm mt-1">{generateError}</p>
              </div>
            )}

            {qrData && (
              <div className="space-y-4">
                <div className="bg-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Generated QR Code</h3>
                    <button
                      onClick={() => setShowFullScreenQR(true)}
                      className="text-xs px-3 py-1.5 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      📱 Full Screen
                    </button>
                  </div>
                  
                  {/* Large QR Code for Mobile Scanning */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl">
                      <QRCode 
                        value={qrData.qr} 
                        size={Math.min(400, window.innerWidth - 100)}
                        level="H"
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Display QR Code Image (backup) */}
                  {qrData.qrCodeUrl && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-4 rounded-xl">
                        <img 
                          src={qrData.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-full max-w-sm"
                          style={{ maxWidth: '400px' }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-4">
                    <p className="text-blue-200 text-xs text-center">
                      📱 <strong>Mobile Scanning:</strong> Open this page on your phone and use your camera app to scan this QR code, or use the scanner at <code className="bg-blue-600/30 px-1 rounded">/scanner</code>
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-white/90">
                      <span className="font-medium">Ticket Number:</span>
                      <span>{qrData.ticketNumber || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/90">
                      <span className="font-medium">Event:</span>
                      <span>{qrData.eventTitle || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/90">
                      <span className="font-medium">Order Paid:</span>
                      <span className={qrData.orderPaid ? 'text-green-300' : 'text-yellow-300'}>
                        {qrData.orderPaid ? '✅ Yes' : '⚠️ No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/90">
                      <span className="font-medium">Expires At:</span>
                      <span>{new Date(qrData.expiresAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white/90 text-sm font-medium">
                      QR Code String:
                    </label>
                    <button
                      onClick={() => copyToClipboard(qrData.qr)}
                      className="text-xs px-3 py-1 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <textarea
                    value={qrData.qr}
                    readOnly
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-xs font-mono resize-none"
                    rows="3"
                  />
                </div>

                {/* Auto-fill scan input */}
                <button
                  onClick={() => setScanQr(qrData.qr)}
                  className="w-full px-4 py-2 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors"
                >
                  🔄 Use this QR for scanning test
                </button>
              </div>
            )}
          </div>

          {/* Scan QR Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              🔍 Scan QR Code
            </h2>

            <form onSubmit={handleScanQR} className="space-y-4 mb-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  QR Code String
                </label>
                <textarea
                  value={scanQr}
                  onChange={(e) => setScanQr(e.target.value)}
                  placeholder="Paste QR code string here or use the 'Use this QR' button from generated QR"
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  rows="4"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={scanning || !scanQr.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                onClick={(e) => {
                  // Additional click handler to prevent double-clicks
                  if (scanning) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {scanning ? '⏳ Scanning...' : '🔍 Test Scan'}
              </button>
            </form>

            {scanError && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-200 font-medium mb-2">Scan Failed:</p>
                <p className="text-red-100 text-sm mb-2">
                  Code: <span className="font-mono">{scanError.code || 'UNKNOWN'}</span>
                </p>
                <p className="text-red-100 text-sm mb-2">
                  {scanError.message || scanError.error || 'Unknown error'}
                </p>
                
                {/* Special handling for validity window errors */}
                {scanError.code === 'TICKET_OUT_OF_VALIDITY_WINDOW' && scanError.validityIssue && (
                  <div className="mt-3 p-3 bg-red-600/20 rounded-lg space-y-2">
                    <p className="text-red-200 text-xs font-medium">
                      {scanError.validityIssue.reason}
                    </p>
                    {scanError.validityIssue.validFrom && (
                      <div className="text-red-100 text-xs">
                        <strong>Valid From:</strong> {new Date(scanError.validityIssue.validFrom).toLocaleString()}
                        {scanError.validityIssue.daysUntilValid !== undefined && (
                          <span className="ml-2">
                            ({scanError.validityIssue.daysUntilValid} day{scanError.validityIssue.daysUntilValid !== 1 ? 's' : ''} until valid)
                          </span>
                        )}
                      </div>
                    )}
                    {scanError.validityIssue.validUntil && (
                      <div className="text-red-100 text-xs">
                        <strong>Valid Until:</strong> {new Date(scanError.validityIssue.validUntil).toLocaleString()}
                        {scanError.validityIssue.daysSinceExpired !== undefined && (
                          <span className="ml-2">
                            (Expired {scanError.validityIssue.daysSinceExpired} day{scanError.validityIssue.daysSinceExpired !== 1 ? 's' : ''} ago)
                          </span>
                        )}
                      </div>
                    )}
                    {scanError.ticket && (
                      <div className="text-red-100 text-xs mt-2 pt-2 border-t border-red-500/30">
                        <strong>Ticket:</strong> {scanError.ticket.ticketNumber || scanError.ticket.id}
                        {scanError.ticket.eventTitle && (
                          <span> • <strong>Event:</strong> {scanError.ticket.eventTitle}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {scanError.details && scanError.code !== 'TICKET_OUT_OF_VALIDITY_WINDOW' && (
                  <div className="mt-3 p-3 bg-red-600/20 rounded-lg">
                    <p className="text-red-200 text-xs font-medium mb-1">Details:</p>
                    <pre className="text-red-100 text-xs overflow-auto">
                      {JSON.stringify(scanError.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <div className={`p-6 rounded-xl ${
                  scanResult.valid 
                    ? 'bg-green-500/20 border border-green-500/50' 
                    : 'bg-yellow-500/20 border border-yellow-500/50'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    {scanResult.valid ? (
                      <span className="text-2xl">✅</span>
                    ) : (
                      <span className="text-2xl">⚠️</span>
                    )}
                    <h3 className="text-white font-semibold text-lg">
                      {scanResult.valid ? 'Valid QR Code' : 'Invalid QR Code'}
                    </h3>
                  </div>

                  <p className="text-white/90 text-sm mb-4">
                    {scanResult.message}
                  </p>

                  {scanResult.ticket && (
                    <div className="bg-white/10 rounded-lg p-4 mb-4">
                      <h4 className="text-white font-medium mb-2">Ticket Info:</h4>
                      <div className="space-y-1 text-sm text-white/90">
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono text-xs">{scanResult.ticket.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Number:</span>
                          <span>{scanResult.ticket.ticketNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Holder:</span>
                          <span>{scanResult.ticket.holderName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{scanResult.ticket.ticketType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={
                            scanResult.ticket.status === 'active' 
                              ? 'text-green-300' 
                              : 'text-yellow-300'
                          }>
                            {scanResult.ticket.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.event && (
                    <div className="bg-white/10 rounded-lg p-4 mb-4">
                      <h4 className="text-white font-medium mb-2">Event Info:</h4>
                      <div className="space-y-1 text-sm text-white/90">
                        <div className="flex justify-between">
                          <span>Title:</span>
                          <span>{scanResult.event.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Start Date:</span>
                          <span>{new Date(scanResult.event.startDate).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.qrMetadata && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">QR Metadata:</h4>
                      <div className="space-y-1 text-xs text-white/80">
                        <div className="flex justify-between">
                          <span>Nonce:</span>
                          <span className="font-mono">{scanResult.qrMetadata.nonce?.substring(0, 16)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Issued At:</span>
                          <span>{new Date(scanResult.qrMetadata.issuedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expires At:</span>
                          <span>{new Date(scanResult.qrMetadata.expiresAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.scanDetails && (
                    <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                      <p className="text-blue-200 text-xs">
                        {scanResult.scanDetails.note}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setScanResult(null);
                    setScanError(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Clear Results
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Events & Fix Validity */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📅 Events & Validity</h2>
            <div className="flex gap-2">
              <button
                onClick={seedNewEvent}
                disabled={seedingEvent}
                className="text-xs px-3 py-1.5 bg-green-600/50 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {seedingEvent ? '⏳ Creating...' : '✨ Seed New Event'}
              </button>
              <button
                onClick={() => fetchEvents()}
                className="text-xs px-3 py-1 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {events.length > 0 ? (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${
                      event.validity.isCurrentlyValid
                        ? 'bg-green-500/20 border-green-500/50'
                        : event.validity.isExpired
                        ? 'bg-red-500/20 border-red-500/50'
                        : 'bg-yellow-500/20 border-yellow-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm truncate">
                            {event.title}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            event.validity.isCurrentlyValid
                              ? 'bg-green-500/30 text-green-200'
                              : event.validity.isExpired
                              ? 'bg-red-500/30 text-red-200'
                              : 'bg-yellow-500/30 text-yellow-200'
                          }`}>
                            {event.validity.isCurrentlyValid
                              ? 'Valid Now'
                              : event.validity.isExpired
                              ? `Expired ${event.validity.daysSinceExpired}d ago`
                              : `Starts in ${event.validity.daysUntilStart}d`
                            }
                          </span>
                        </div>
                        <div className="text-white/70 text-xs">
                          {event.dates.startDateFormatted && (
                            <div>Start: {event.dates.startDateFormatted}</div>
                          )}
                          {event.dates.endDateFormatted && (
                            <div>End: {event.dates.endDateFormatted}</div>
                          )}
                        </div>
                      </div>
                      {!event.validity.isCurrentlyValid && (
                        <button
                          onClick={() => fixEventValidity(event.id)}
                          disabled={fixingValidity}
                          className="ml-2 text-xs px-3 py-1.5 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {fixingValidity ? '⏳' : '🔧 Fix'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-200 text-xs">
                  <strong>💡 Tip:</strong> Click "Fix" on expired events to update their dates to be valid for the next 30 days. 
                  This will also update all tickets for that event. Or click "Seed New Event" to create a fresh test event.
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-200 text-sm text-center">
                No events found. Click "Seed New Event" to create a test event.
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📖 How to Use</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">🖥️ Desktop Testing:</h3>
              <ol className="space-y-2 text-white/90 text-sm list-decimal list-inside ml-2">
                <li>Enter a valid ticket ID in the "Generate QR Code" section</li>
                <li>Click "Generate QR Code" to create a QR code for that ticket</li>
                <li>The QR code will be displayed visually and as a string</li>
                <li>Click "Use this QR for scanning test" to auto-fill the scan input</li>
                <li>Or manually paste a QR code string in the "Scan QR Code" section</li>
                <li>Click "Test Scan" to validate the QR code</li>
                <li>Review the scan results to see if the QR code is valid</li>
              </ol>
            </div>

            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">📱 Mobile Scanning:</h3>
              <ol className="space-y-2 text-white/90 text-sm list-decimal list-inside ml-2">
                <li>Open this page on your phone using the same WiFi network</li>
                <li>Generate a QR code (or use one already generated)</li>
                <li>Click "Full Screen" button to display QR code in full screen</li>
                <li>Open your phone's camera app and point it at the QR code</li>
                <li>Or open <code className="bg-blue-600/30 px-1 rounded">/scanner</code> on your phone to use the built-in scanner</li>
                <li>The scanner will automatically validate the QR code</li>
              </ol>
              <div className="mt-3 p-2 bg-blue-600/20 rounded text-xs text-blue-200">
                <strong>💡 Tip:</strong> Make sure your phone and computer are on the same WiFi network. 
                Access this page using your computer's IP address (e.g., <code>http://192.168.1.100:5173/qr-test</code>)
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-xs">
              <strong>Note:</strong> These are test endpoints. The scan endpoint does NOT mark tickets as used, 
              so you can test the same QR code multiple times.
            </p>
          </div>
        </div>
      </div>

      {/* Full Screen QR Modal */}
      {showFullScreenQR && qrData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setShowFullScreenQR(false)}
        >
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setShowFullScreenQR(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
            
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
              <h3 className="text-gray-900 font-bold text-xl mb-4 text-center">
                Scan This QR Code
              </h3>
              
              <div className="flex justify-center mb-4">
                <div className="bg-white p-6 rounded-xl border-4 border-gray-900">
                  <QRCode 
                    value={qrData.qr} 
                    size={Math.min(600, window.innerWidth - 80)}
                    level="H"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-gray-600 text-sm">
                  Use your phone's camera to scan this QR code
                </p>
                <p className="text-gray-500 text-xs">
                  Tap anywhere outside to close
                </p>
              </div>

              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Ticket:</strong> {qrData.ticketNumber || 'N/A'}</div>
                  <div><strong>Event:</strong> {qrData.eventTitle || 'N/A'}</div>
                  <div><strong>Expires:</strong> {new Date(qrData.expiresAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRTest;

