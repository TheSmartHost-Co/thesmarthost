'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { KeyIcon, ClipboardDocumentIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { testCredentials, getAccessToken, createConnection } from '@/services/hostawayConnectionService'

interface HostawayConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (accountId: string, apiKey: string) => void
  userId: string // Add userId prop
}

const HostawayConnectionModal: React.FC<HostawayConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  userId,
}) => {
  const [step, setStep] = useState(1)
  const [accountId, setAccountId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState({ accountId: false, apiKey: false })
  const [isTestingCredentials, setIsTestingCredentials] = useState(false)
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const handleCopyToClipboard = (text: string, field: 'accountId' | 'apiKey') => {
    navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [field]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [field]: false })), 2000)
  }

  const handleTestCredentials = async () => {
    if (!accountId.trim() || !apiKey.trim()) return

    setIsTestingCredentials(true)
    setTestError(null)
    setCredentialsValid(null)

    try {
      const response = await testCredentials({
        hostawayAccountId: accountId,
        apiKey: apiKey
      })

      if (response.status === 'success') {
        setCredentialsValid(true)
        setTestError(null)
        // Move to step 3 after successful test
        setTimeout(() => {
          setStep(3)
        }, 1000)
      } else {
        setCredentialsValid(false)
        setTestError(response.message || 'Invalid credentials')
      }
    } catch (error) {
      setCredentialsValid(false)
      setTestError('Failed to verify credentials. Please try again.')
      console.error('Error testing credentials:', error)
    } finally {
      setIsTestingCredentials(false)
    }
  }

  const handleConnect = async () => {
    if (!accountId.trim() || !apiKey.trim() || !userId) return

    setIsConnecting(true)
    setConnectionError(null)

    try {
      // Step 1: Get access token from Hostaway
      console.log('Getting access token...')
      const tokenResponse = await getAccessToken({
        hostawayAccountId: accountId,
        apiKey: apiKey
      })

      if (tokenResponse.status !== 'success' || !tokenResponse.data) {
        throw new Error(tokenResponse.message || 'Failed to get access token')
      }

      console.log('Access token retrieved, creating connection...')
      
      // Step 2: Create the connection with all the data
      const connectionResponse = await createConnection({
        userId: userId,
        hostawayAccountId: accountId,
        apiKey: apiKey,
        accessToken: tokenResponse.data.accessToken,
        accessTokenExpiresAt: tokenResponse.data.expiresAt,
        autoImport: false, // Default to false, can be changed later
        status: 'active'
      })

      if (connectionResponse.status === 'success') {
        console.log('Hostaway connection created successfully!')
        // Call the original onConnect callback for any parent component updates
        onConnect(accountId, apiKey)
        // Close the modal
        handleClose()
      } else {
        throw new Error(connectionResponse.message || 'Failed to create connection')
      }
    } catch (error) {
      console.error('Error connecting to Hostaway:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to Hostaway')
    } finally {
      setIsConnecting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setAccountId('')
    setApiKey('')
    setCopied({ accountId: false, apiKey: false })
    setIsTestingCredentials(false)
    setCredentialsValid(null)
    setTestError(null)
    setIsConnecting(false)
    setConnectionError(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      style="p-12 max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Connect to Hostaway</h2>
        </div>
        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-8">
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              step >= 3 ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Instructions */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Create Hostaway API Connection
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>Follow these steps in your Hostaway account:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Log in to your Hostaway account</li>
                  <li>Navigate to <strong>Settings -&gt; Hostaway API</strong></li>
                  <li>Click the <strong>"Create"</strong> button</li>
                  <li>
                    Select <strong>"Hostaway Public API"</strong> as the Partner
                  </li>
                  <li>
                    Name it <strong>"SmartHost Connection"</strong> (or any name you prefer)
                  </li>
                </ol>
              </div>
            </div>

            {/* Screenshot */}
            <div className="mt-6">
              <img 
                src="/images/HostawayConnectionTutorial.png" 
                alt="Hostaway API creation screen showing partner selection"
                className="w-full rounded-lg border border-gray-200 shadow-sm"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Keep this window open. You'll need to copy your Account ID and API Key in the next step.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Enter Your Hostaway Credentials
              </h3>
              <p className="text-sm text-gray-700 mb-6">
                Copy your Account ID and API Key from Hostaway and paste them below.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                  Account ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="accountId"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="text-black w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your Hostaway Account ID"
                  />
                  {accountId && (
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(accountId, 'accountId')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copied.accountId ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="text-black w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your Hostaway API Key"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(apiKey, 'apiKey')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copied.apiKey ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your API Key is shown only once in Hostaway. Make sure to copy it before closing.
                </p>
              </div>
            </div>

            {/* Credential Test Result */}
            {credentialsValid === false && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-900 font-medium">Credential Test Failed</p>
                    <p className="text-sm text-red-800 mt-1">{testError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {credentialsValid === true && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-900 font-medium">Credentials Verified!</p>
                    <p className="text-sm text-green-800 mt-1">Your Hostaway credentials are valid. Proceeding to connection setup...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Security Note:</strong> Your API credentials are encrypted and stored securely. We never share or expose your credentials.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Connect */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Review & Connect
              </h3>
              <p className="text-sm text-gray-700 mb-6">
                Review your connection details before connecting.
              </p>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Account ID:</span>
                <span className="text-sm text-gray-900 font-mono">{accountId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">API Key:</span>
                <span className="text-sm text-gray-900">""""""""""""""""</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">What happens next?</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                <li>We'll verify your credentials with Hostaway</li>
                <li>Set up automatic booking synchronization</li>
                <li>Configure webhook notifications for real-time updates</li>
                <li>You can customize field mappings after connection</li>
              </ul>
            </div>

            {/* Connection Error */}
            {connectionError && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-900 font-medium">Connection Failed</p>
                    <p className="text-sm text-red-800 mt-1">{connectionError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start">
                <KeyIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-green-900">
                  Your connection will be active immediately. You can manage properties, sync bookings, and configure settings from your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="cursor-pointer px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={step === 2 ? handleTestCredentials : () => setStep(step + 1)}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={(step === 2 && (!accountId.trim() || !apiKey.trim())) || isTestingCredentials}
              >
                {step === 2 && isTestingCredentials ? 'Testing...' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="cursor-pointer inline-flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Connect to Hostaway
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default HostawayConnectionModal