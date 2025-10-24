export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the TheSmartHost admin panel</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">1,234</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Active Properties</h3>
          <p className="text-3xl font-bold text-green-600">567</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Reports Generated</h3>
          <p className="text-3xl font-bold text-purple-600">89</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Processing Time Saved</h3>
          <p className="text-3xl font-bold text-orange-600">342h</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">New user registration</p>
                <p className="text-sm text-gray-500">john.doe@example.com</p>
              </div>
              <span className="text-sm text-gray-500">2 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Report generated</p>
                <p className="text-sm text-gray-500">Monthly summary for Property ABC</p>
              </div>
              <span className="text-sm text-gray-500">15 minutes ago</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">CSV upload completed</p>
                <p className="text-sm text-gray-500">Hostaway data processed</p>
              </div>
              <span className="text-sm text-gray-500">1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}