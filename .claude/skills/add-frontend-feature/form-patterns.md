# Form Patterns

> **Form handling patterns with validation examples**

---

## Basic Form Pattern

### Text Input
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Name *</label>
  <input
    required
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g., Lake Estate"
  />
</div>
```

### Number Input
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Commission Rate (%) *</label>
  <input
    required
    type="number"
    step="0.01"
    min="0"
    max="100"
    value={commissionRate}
    onChange={(e) => setCommissionRate(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g., 15"
  />
</div>
```

### Select Dropdown
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Property Type *</label>
  <select
    required
    value={propertyType}
    onChange={(e) => setPropertyType(e.target.value as 'STR' | 'LTR')}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Select a type</option>
    <option value="STR">STR (Short-Term Rental)</option>
    <option value="LTR">LTR (Long-Term Rental)</option>
  </select>
</div>
```

### Textarea
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Description</label>
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    rows={4}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="Enter description..."
  />
</div>
```

---

## Dynamic Dropdown with API Data

**Pattern:** Fetch options when modal opens

```tsx
const [clients, setClients] = useState<Client[]>([])
const [loadingClients, setLoadingClients] = useState(false)
const [clientId, setClientId] = useState('')

// Fetch clients when modal opens
useEffect(() => {
  const fetchClients = async () => {
    if (isOpen && profile?.id) {
      try {
        setLoadingClients(true)
        const response = await getClientsByParentId(profile.id)
        setClients(response.data.filter(c => c.isActive))
      } catch (err) {
        console.error('Error fetching clients:', err)
        showNotification('Failed to load clients', 'error')
      } finally {
        setLoadingClients(false)
      }
    }
  }

  fetchClients()
}, [isOpen, profile?.id])

// Render dropdown
<div>
  <label className="block text-sm font-medium mb-1">Client *</label>
  {loadingClients ? (
    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
      Loading clients...
    </div>
  ) : clients.length === 0 ? (
    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
      No active clients available. Please create a client first.
    </div>
  ) : (
    <select
      required
      value={clientId}
      onChange={(e) => setClientId(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select a client</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name} ({client.email || 'No email'})
        </option>
      ))}
    </select>
  )}
</div>
```

---

## Validation Patterns

### Client-Side Validation (Before API Call)

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  const trimmedName = name.trim()
  const trimmedAddress = address.trim()
  const parsedCommissionRate = parseFloat(commissionRate)

  // Required field validation
  if (!trimmedName || !trimmedAddress || !clientId) {
    showNotification('All required fields must be filled', 'error')
    return
  }

  // Number validation
  if (!commissionRate || isNaN(parsedCommissionRate)) {
    showNotification('Commission rate must be a valid number', 'error')
    return
  }

  // Range validation
  if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
    showNotification('Commission rate must be between 0 and 100', 'error')
    return
  }

  // Enum validation
  if (!['STR', 'LTR'].includes(propertyType)) {
    showNotification('Invalid property type', 'error')
    return
  }

  try {
    const payload = {
      name: trimmedName,
      address: trimmedAddress,
      commissionRate: parsedCommissionRate,
      propertyType,
      clientId,
    }

    const res = await createResource(payload)

    if (res.status === 'success') {
      onAdd(res.data)
      showNotification('Resource created successfully', 'success')
      onClose()
    } else {
      showNotification(res.message || 'Failed to create resource', 'error')
    }
  } catch (err) {
    console.error('Error creating resource:', err)
    const message = err instanceof Error ? err.message : 'Error creating resource'
    showNotification(message, 'error')
  }
}
```

---

## Side-by-Side Layout

**Use `grid grid-cols-2 gap-4` for two fields in a row:**

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-1">Property Type *</label>
    <select
      required
      value={propertyType}
      onChange={(e) => setPropertyType(e.target.value as 'STR' | 'LTR')}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="STR">STR (Short-Term Rental)</option>
      <option value="LTR">LTR (Long-Term Rental)</option>
    </select>
  </div>

  <div>
    <label className="block text-sm font-medium mb-1">Commission Rate (%) *</label>
    <input
      required
      type="number"
      step="0.01"
      value={commissionRate}
      onChange={(e) => setCommissionRate(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="e.g., 15"
    />
  </div>
</div>
```

---

## Action Buttons Pattern

**Always at the bottom, right-aligned:**

```tsx
<div className="flex justify-end gap-3 mt-6">
  <button
    type="button"
    onClick={onClose}
    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={loading}
    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {loading ? 'Saving...' : 'Create Resource'}
  </button>
</div>
```

---

## Form Reset Pattern

**Reset form fields when modal opens:**

```tsx
useEffect(() => {
  if (isOpen) {
    setName('')
    setAddress('')
    setProvince('')
    setPropertyType('STR')
    setCommissionRate('')
    setClientId('')
  }
}, [isOpen])
```

---

## Populate Form for Update

**Load existing data when update modal opens:**

```tsx
useEffect(() => {
  if (isOpen && resource) {
    setName(resource.name)
    setAddress(resource.address)
    setProvince(resource.province)
    setPropertyType(resource.propertyType)
    setCommissionRate(resource.commissionRate.toString())
  }
}, [isOpen, resource])
```

---

## Helper Text Pattern

**Add small text below inputs for guidance:**

```tsx
<div>
  <label className="block text-sm font-medium mb-1">Property Owner (Client) *</label>
  <select
    required
    value={clientId}
    onChange={(e) => setClientId(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Select a client</option>
    {clients.map((client) => (
      <option key={client.id} value={client.id}>
        {client.name}
      </option>
    ))}
  </select>
  <p className="text-xs text-gray-500 mt-1">
    This client will be set as the primary owner. You can add co-owners later.
  </p>
</div>
```

---

**Last Updated:** November 4, 2025
