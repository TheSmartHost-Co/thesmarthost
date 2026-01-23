'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { KeyIcon, ClipboardDocumentIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { testCredentials, createConnection, getWebhookUrl } from '@/services/hospitableConnectionService'

interface HospitableConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (personalAccessToken: string) => void
  userId: string
}

const HospitableConnectionModal: React.FC<HospitableConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  userId,
}) => {
  const [step, setStep] = useState(1)
  const [personalAccessToken, setPersonalAccessToken] = useState('')
  const [copied, setCopied] = useState({ token: false, webhookUrl: false })
  const [isTestingCredentials, setIsTestingCredentials] = useState(false)
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const webhookUrl = getWebhookUrl(userId)

  const handleCopyToClipboard = async (text: string, field: 'token' | 'webhookUrl') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [field]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [field]: false })), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleTestCredentials = async () => {
    if (!personalAccessToken.trim()) return

    setIsTestingCredentials(true)
    setTestError(null)
    setCredentialsValid(null)

    try {
      const response = await testCredentials({
        personalAccessToken: personalAccessToken
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
        setTestError(response.message || 'Invalid token')
      }
    } catch (error) {
      setCredentialsValid(false)
      setTestError('Failed to verify token. Please try again.')
      console.error('Error testing credentials:', error)
    } finally {
      setIsTestingCredentials(false)
    }
  }

  const handleConnect = async () => {
    if (!personalAccessToken.trim() || !userId) return

    setIsConnecting(true)
    setConnectionError(null)

    try {
      // Calculate token expiry (1 year from now)
      const tokenExpiresAt = new Date()
      tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1)

      // Create the connection with the PAT
      const connectionResponse = await createConnection({
        userId: userId,
        personalAccessToken: personalAccessToken,
        tokenExpiresAt: tokenExpiresAt.toISOString(),
        webhookUrl: webhookUrl,
        autoImport: false, // Default to false, can be changed later
        status: 'active'
      })

      if (connectionResponse.status === 'success') {
        console.log('Hospitable connection created successfully!')
        // Call the original onConnect callback for any parent component updates
        onConnect(personalAccessToken)
        // Close the modal
        handleClose()
      } else {
        throw new Error(connectionResponse.message || 'Failed to create connection')
      }
    } catch (error) {
      console.error('Error connecting to Hospitable:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to Hospitable')
    } finally {
      setIsConnecting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setPersonalAccessToken('')
    setCopied({ token: false, webhookUrl: false })
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
          <h2 className="text-lg font-semibold text-gray-900">Connect to Hospitable</h2>
        </div>
        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-8">
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              step >= 2 ? 'bg-teal-600' : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              step >= 3 ? 'bg-teal-600' : 'bg-gray-300'
            }`} />
          </div>
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3 ? 'bg-teal-600 text-white' : 'bg-gray-300 text-gray-600'
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
                Step 1: Generate a Personal Access Token
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>Follow these steps in your Hospitable account:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Log in to your Hospitable account</li>
                  <li>Navigate to <strong>Apps → API access → Access tokens</strong></li>
                  <li>Click <strong>&quot;+ Add new&quot;</strong></li>
                  <li>
                    Name it <strong>&quot;HostMetrics Integration&quot;</strong> (or any name you prefer)
                  </li>
                  <li>
                    Select permissions: <strong>Read</strong> and <strong>Write</strong>
                  </li>
                  <li>
                    Click <strong>&quot;Create&quot;</strong> and copy the token
                  </li>
                </ol>
              </div>
            </div>

            {/* Info box about PAT */}
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <div className="flex items-start">
                <KeyIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-teal-900 font-medium">About Personal Access Tokens</p>
                  <p className="text-sm text-teal-800 mt-1">
                    Personal Access Tokens (PATs) are valid for 1 year. You&apos;ll receive a reminder before it expires.
                    Keep this token secure - it provides access to your Hospitable account.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> The token is only shown once in Hospitable. Make sure to copy it before closing the dialog.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Enter Token */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Enter Your Personal Access Token
              </h3>
              <p className="text-sm text-gray-700 mb-6">
                Paste the Personal Access Token you generated from Hospitable.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="personalAccessToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Access Token <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="personalAccessToken"
                    value={personalAccessToken}
                    onChange={(e) => setPersonalAccessToken(e.target.value)}
                    className="text-black w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter your Hospitable Personal Access Token"
                  />
                  {personalAccessToken && (
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(personalAccessToken, 'token')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {copied.token ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your token is shown only once in Hospitable. Make sure to copy it before closing.
                </p>
              </div>
            </div>

            {/* Credential Test Result */}
            {credentialsValid === false && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-900 font-medium">Token Verification Failed</p>
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
                    <p className="text-sm text-green-900 font-medium">Token Verified!</p>
                    <p className="text-sm text-green-800 mt-1">Your Hospitable token is valid. Proceeding to webhook setup...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Security Note:</strong> Your token is encrypted and stored securely. We never share or expose your credentials.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Webhook Setup & Connect */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Configure Webhook & Connect
              </h3>
              <p className="text-sm text-gray-700 mb-6">
                Set up the webhook in Hospitable to receive real-time booking updates.
              </p>
            </div>

            {/* Webhook URL to copy */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(webhookUrl, 'webhookUrl')}
                    className="inline-flex items-center px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {copied.webhookUrl ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Webhook setup instructions */}
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <h4 className="text-sm font-semibold text-teal-900 mb-2">Configure in Hospitable:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-teal-800 ml-2">
                <li>Go to <strong>Apps → Webhooks → +Add new</strong></li>
                <li>Paste the webhook URL above</li>
                <li>Select webhook type: <strong>Reservations</strong></li>
                <li>Enable events: <strong>reservation.created</strong> and <strong>reservation.changed</strong></li>
                <li>Save the webhook configuration</li>
              </ol>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">What happens after connecting?</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4">
                <li>New reservations will automatically appear in Incoming Bookings</li>
                <li>Reservation changes will be updated in real-time</li>
                <li>You can customize field mappings from the Properties page</li>
                <li>Enable auto-import to skip manual review</li>
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
                  Your connection will be active immediately. You can manage settings and sync bookings from the Settings page.
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
                className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={(step === 2 && !personalAccessToken.trim()) || isTestingCredentials}
              >
                {step === 2 && isTestingCredentials ? 'Verifying...' : 'Next'}
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
                    Connect to Hospitable
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

export default HospitableConnectionModal
