import React, { useState } from 'react'
import api from '../utils/api'
import { useDispatch } from 'react-redux'
import { setPaymentProvider, setProviderCredentials } from '../store/slices/checkoutSlice'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'

const PaymentProviderSelector = ({ className = '' }) => {
  const [provider, setProvider] = useState('payhero')
  // Pre-fill with provided test keys for quick verification
  const [consumerKey, setConsumerKey] = useState('xvABSIISxuOfIkDNFd1TWJcRF9Dhmv3f')
  const [consumerSecret, setConsumerSecret] = useState('hMt6449On99Mlk/1GbFGVBJi1kI=')
  const [status, setStatus] = useState('idle') // idle | testing | success | error
  const [message, setMessage] = useState('')

  const dispatch = useDispatch()

  const handleTest = async () => {
    try {
      setStatus('testing')
      setMessage('')

      if (provider === 'pesapal') {
        // Save selection + credentials in Redux for payment step
        dispatch(setPaymentProvider('pesapal'))
        dispatch(setProviderCredentials({ provider: 'pesapal', credentials: { consumerKey, consumerSecret } }))
        const res = await api.post('/api/orders/provider/auth', {
          provider: 'pesapal',
          credentials: {
            consumerKey,
            consumerSecret
          }
        })
        setStatus('success')
        setMessage('Token acquired successfully. Ready for test payments.')
        console.log('Pesapal token result:', res.data)
      } else if (provider === 'payhero') {
        dispatch(setPaymentProvider('payhero'))
        setStatus('success')
        setMessage('PayHero selected. Server has Basic token configured.')
      } else {
        dispatch(setPaymentProvider('mpesa'))
        setStatus('success')
        setMessage('MPESA selected. Using server-side configured credentials.')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.error || 'Provider test failed')
    }
  }

  return (
    <div className={`card-modern p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-web3-primary mb-3">Payment Method</h3>

      <div className="flex flex-col gap-3">
        {/* Provider select */}
        <div>
          <label className="text-sm text-web3-secondary">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="input-modern w-full mt-1"
          >
            <option value="mpesa">MPESA (Daraja)</option>
            <option value="pesapal">PesaPal</option>
            <option value="payhero">PayHero (MPESA STK & Pesapal)</option>
          </select>
        </div>

        {/* Dynamic credentials for providers that require client-supplied keys */}
        {provider === 'pesapal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-web3-secondary">PesaPal Consumer Key</label>
              <input
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder="Enter Consumer Key"
                className="input-modern w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-web3-secondary">PesaPal Consumer Secret</label>
              <input
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                placeholder="Enter Consumer Secret"
                className="input-modern w-full mt-1"
              />
            </div>
          </div>
        )}

        {/* Test credentials */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="btn-web3-secondary px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'testing' ? 'animate-spin' : ''}`} />
            Test Provider
          </button>
          {status === 'success' && (
            <span className="inline-flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" /> {message}
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1 text-red-400 text-sm">
              <XCircle className="w-4 h-4" /> {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentProviderSelector


