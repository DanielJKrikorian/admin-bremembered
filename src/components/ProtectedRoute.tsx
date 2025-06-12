import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle, User, Shield, Database, Code, Crown, RefreshCw } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isSuperAdmin, error, profileError, signOut, debugInfo, refetchProfile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
          {user && (
            <p className="mt-2 text-sm text-gray-500">Checking admin access for {user.email}</p>
          )}
          {debugInfo.steps && debugInfo.steps.length > 0 && (
            <div className="mt-4 text-xs text-gray-400 max-w-md">
              <p>Debug: {debugInfo.steps[debugInfo.steps.length - 1]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-yellow-800 mb-2">Setup Required:</h3>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Click "Connect to Supabase" in the top right</li>
              <li>2. Set up your Supabase project</li>
              <li>3. Create the required database tables</li>
              <li>4. Add admin profiles to the profiles table</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // User is authenticated but doesn't have admin profile
  if (user && profileError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-6xl mx-auto p-6">
          <Shield className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">{profileError}</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* SQL Setup for Super Admin */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-left">
              <h3 className="font-medium text-purple-900 mb-3 flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Create Super Admin Profile
              </h3>
              <p className="text-sm text-purple-800 mb-3">
                Run this SQL to make {user.email} a super admin:
              </p>
              <div className="bg-purple-100 rounded p-3 font-mono text-xs text-purple-900 overflow-x-auto">
                {`INSERT INTO profiles (id, role, admin_level, description)
VALUES ('${user.id}', 'admin', 'super_admin', 'Super Administrator - Full system access')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  admin_level = 'super_admin',
  description = 'Super Administrator - Full system access';`}
              </div>
            </div>

            {/* SQL Setup for Regular Admin */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Create Regular Admin Profile
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Or run this SQL for regular admin access:
              </p>
              <div className="bg-blue-100 rounded p-3 font-mono text-xs text-blue-900 overflow-x-auto">
                {`INSERT INTO profiles (id, role, admin_level, description)
VALUES ('${user.id}', 'admin', 'admin', 'Administrator')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  admin_level = 'admin',
  description = 'Administrator';`}
              </div>
            </div>
          </div>

          {/* Admin Level Explanation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Admin Level System</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-100 p-3 rounded">
                <div className="font-medium text-gray-900">user</div>
                <div className="text-gray-600">No admin access</div>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <div className="font-medium text-blue-900">admin</div>
                <div className="text-blue-700">Standard admin access</div>
              </div>
              <div className="bg-purple-100 p-3 rounded">
                <div className="font-medium text-purple-900 flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  super_admin
                </div>
                <div className="text-purple-700">Full system access</div>
              </div>
            </div>
          </div>

          {/* Detailed Debug Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Code className="h-4 w-4 mr-2" />
              Detailed Debug Information
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Info */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">User Information</h5>
                <div className="text-xs text-gray-600 space-y-1 bg-gray-100 p-3 rounded">
                  <div><strong>Auth User ID:</strong> {debugInfo.authUserId}</div>
                  <div><strong>Email:</strong> {debugInfo.authUserEmail}</div>
                  <div><strong>Created:</strong> {debugInfo.authUserCreated}</div>
                </div>
              </div>

              {/* Profile Query Results */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Profile Query</h5>
                <div className="text-xs text-gray-600 space-y-1 bg-gray-100 p-3 rounded">
                  <div><strong>Profile Found:</strong> {debugInfo.profileQuery?.found ? 'Yes' : 'No'}</div>
                  {debugInfo.profileQuery?.error && (
                    <div><strong>Error:</strong> {debugInfo.profileQuery.error}</div>
                  )}
                  {debugInfo.profileQuery?.data && (
                    <>
                      <div><strong>Role:</strong> {debugInfo.profileQuery.data.role}</div>
                      <div><strong>Admin Level:</strong> {debugInfo.profileQuery.data.admin_level}</div>
                      <div><strong>Description:</strong> {debugInfo.profileQuery.data.description}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Steps */}
            {debugInfo.steps && debugInfo.steps.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">Processing Steps</h5>
                <div className="bg-gray-100 p-3 rounded max-h-32 overflow-y-auto">
                  {debugInfo.steps.map((step: string, i: number) => (
                    <div key={i} className="text-xs text-gray-600 mb-1">
                      {i + 1}. {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Profiles */}
            {debugInfo.allProfiles && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">
                  All Profiles in Database ({debugInfo.allProfiles.count})
                </h5>
                <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
                  {debugInfo.allProfiles.profiles && debugInfo.allProfiles.profiles.length > 0 ? (
                    debugInfo.allProfiles.profiles.map((p: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600 mb-2 p-2 bg-white rounded">
                        <div><strong>ID:</strong> {p.id}</div>
                        <div><strong>Role:</strong> {p.role}</div>
                        <div><strong>Admin Level:</strong> {p.admin_level}</div>
                        <div><strong>Description:</strong> {p.description || 'None'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-600">No profiles found in database</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 justify-center">
            <button
              onClick={refetchProfile}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Profile Lookup
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile || !isAdmin) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}