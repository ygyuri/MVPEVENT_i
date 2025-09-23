import React from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentOrder, selectPaymentStatus } from '../store/slices/checkoutSlice'
import { ExternalLink, CheckCircle, Clock } from 'lucide-react'

const PesapalPayment = () => {
  const order = useSelector(selectCurrentOrder)
  const status = useSelector(selectPaymentStatus)

  if (!order) {
    return (
      <div className="min-h-screen bg-web3-primary flex items-center justify-center p-4">
        <p className="text-web3-secondary">Order not found. Go back and create the order first.</p>
      </div>
    )
  }

  const redirectUrl = order?.payment?.pesapalRedirectUrl
  const trackingId = order?.payment?.pesapalTrackingId

  return (
    <div className="min-h-screen bg-web3-primary p-4">
      <div className="max-w-xl mx-auto card-modern p-6">
        <h1 className="text-2xl font-bold text-web3-primary mb-4">PesaPal Payment</h1>
        <p className="text-web3-secondary mb-4">Order: <span className="font-mono">{order.orderNumber}</span></p>
        <p className="text-web3-secondary mb-6">Tracking ID: <span className="font-mono">{trackingId || 'Pending'}</span></p>
        {redirectUrl ? (
          <a
            className="btn-web3-primary px-6 py-3 rounded-xl inline-flex items-center gap-2"
            href={redirectUrl}
            target="_blank"
            rel="noreferrer"
          >
            Continue to PesaPal <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 text-web3-secondary">
            <Clock className="w-4 h-4" /> Initializing...
          </div>
        )}

        {status === 'completed' && (
          <div className="mt-6 inline-flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" /> Payment completed
          </div>
        )}
      </div>
    </div>
  )
}

export default PesapalPayment



