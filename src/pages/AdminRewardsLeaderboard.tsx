import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface VendorPoints {
  id: string;
  name: string;
  points: number;
  rewardsAchieved: number;
  referralCount: number;
}

interface VendorReward {
  vendor_id: string;
  name: string;
  total_points: number;
  referral_count: number;
  referral_code: string | null;
  rewards: { points_required: number; prize: number }[];
}

const CURRENT_YEAR = 2025;

export function AdminRewardsLeaderboard() {
  const [topVendors, setTopVendors] = useState<VendorPoints[]>([]);
  const [allVendors, setAllVendors] = useState<VendorReward[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchRewardsData();
  }, [user]);

  const fetchRewardsData = async () => {
    try {
      setLoading(true);

      // Fetch vendor points and names
      const { data: pointsData, error: pointsError } = await supabase
        .from('vendor_rewards_points')
        .select('vendor_id, points')
        .eq('year', CURRENT_YEAR);

      if (pointsError) throw pointsError;

      const vendorIds = [...new Set(pointsData.map(item => item.vendor_id))];

      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds);

      if (vendorsError) throw vendorsError;

      // Fetch referral codes
      const { data: referralCodesData, error: referralCodesError } = await supabase
        .from('vendor_referral_codes')
        .select('vendor_id, code')
        .eq('is_active', true)
        .in('vendor_id', vendorIds);

      if (referralCodesError) throw referralCodesError;

      const referralCodesByVendor = referralCodesData.reduce((acc, { vendor_id, code }) => {
        acc[vendor_id] = code;
        return acc;
      }, {} as Record<string, string>);

      console.log('Referral codes by vendor:', referralCodesByVendor);

      // Fetch referral usages
      const { data: referralUsagesData, error: referralUsagesError } = await supabase
        .from('referral_code_usages')
        .select('vendor_id')
        .in('vendor_id', vendorIds)
        .gte('created_at', `${CURRENT_YEAR}-01-01T00:00:00Z`)
        .lte('created_at', `${CURRENT_YEAR}-12-31T23:59:59Z`);

      if (referralUsagesError) throw referralUsagesError;

      const referralCounts = referralUsagesData.reduce((acc, { vendor_id }) => {
        acc[vendor_id] = (acc[vendor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Aggregate points by vendor
      const pointsByVendor = pointsData.reduce((acc, { vendor_id, points }) => {
        acc[vendor_id] = (acc[vendor_id] || 0) + points;
        return acc;
      }, {} as Record<string, number>);

      // Fetch rewards achieved
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('vendor_rewards')
        .select('vendor_id, points_required, prize')
        .eq('year', CURRENT_YEAR);

      if (rewardsError) throw rewardsError;

      const rewardsByVendor = rewardsData.reduce((acc, reward) => {
        if (!acc[reward.vendor_id]) {
          acc[reward.vendor_id] = [];
        }
        acc[reward.vendor_id].push({ points_required: reward.points_required, prize: reward.prize });
        return acc;
      }, {} as Record<string, { points_required: number; prize: number }[]>);

      // Build top vendors
      const vendorPoints = vendorsData.map(vendor => ({
        id: vendor.id,
        name: vendor.name,
        points: pointsByVendor[vendor.id] || 0,
        rewardsAchieved: (rewardsByVendor[vendor.id] || []).length,
        referralCount: referralCounts[vendor.id] || 0,
      }));

      const sortedTopVendors = vendorPoints
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      // Build all vendors
      const allVendorsData = vendorsData.map(vendor => ({
        vendor_id: vendor.id,
        name: vendor.name,
        total_points: pointsByVendor[vendor.id] || 0,
        referral_count: referralCounts[vendor.id] || 0,
        referral_code: referralCodesByVendor[vendor.id] || 'No code',
        rewards: rewardsByVendor[vendor.id] || [],
      }));

      setTopVendors(sortedTopVendors);
      setAllVendors(allVendorsData);
    } catch (error: any) {
      console.error('Error fetching rewards data:', error);
      toast.error('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = allVendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
            Rewards Leaderboard
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
          Rewards Leaderboard
        </h1>
        <p className="mt-2 text-gray-500">View the top vendors and their rewards for {CURRENT_YEAR}.</p>
      </div>

      {/* Top 10 Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Vendors by Points</h2>
        {topVendors.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No vendors have points yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rewards Achieved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topVendors.map((vendor, index) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/vendor/${vendor.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.points.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.referralCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.rewardsAchieved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Vendors Rewards Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Vendor Rewards ({filteredVendors.length})
          </h2>
          <div className="w-1/3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Vendors
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by vendor name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        {filteredVendors.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No vendors match your search' : 'No vendors have rewards yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referral Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rewards Achieved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.vendor_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/vendor/${vendor.vendor_id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {vendor.referral_code || 'No code'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.referral_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.total_points.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {vendor.rewards.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {vendor.rewards.map((reward, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              ${reward.prize} ({reward.points_required.toLocaleString()} points)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No rewards</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}