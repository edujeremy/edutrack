'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreditCard, Filter, Loader2 } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  student_id: string;
  teacher_id: string;
  total_sessions: number;
  completed_sessions: number;
  tuition_amount: number;
  tuition_status: 'unpaid' | 'paid' | 'overdue';
  status: string;
  students?: { name: string };
  teachers?: { profiles?: { name: string } };
  lessons?: any[];
}

export default function BillingPage() {
  const supabase = createClient();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' or 'unpaid'

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('packages')
      .select(`
        id,
        name,
        student_id,
        teacher_id,
        total_sessions,
        completed_sessions,
        tuition_amount,
        tuition_status,
        status,
        students(name),
        teachers(profiles(name)),
        lessons(id)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error) {
      setPackages(data || []);
    }
    setLoading(false);
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filterStatus === 'unpaid') {
      return pkg.tuition_status === 'unpaid' || pkg.tuition_status === 'overdue';
    }
    return true;
  });

  const handleTogglePaid = async (packageId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    await supabase
      .from('packages')
      .update({ tuition_status: newStatus })
      .eq('id', packageId);

    fetchPackages();
  };

  const getTotalTuition = (): number => {
    return filteredPackages.reduce((sum, pkg) => sum + pkg.tuition_amount, 0);
  };

  const getPaidTuition = (): number => {
    return filteredPackages
      .filter((pkg) => pkg.tuition_status === 'paid')
      .reduce((sum, pkg) => sum + pkg.tuition_amount, 0);
  };

  const getUnpaidTuition = (): number => {
    return filteredPackages
      .filter((pkg) => pkg.tuition_status !== 'paid')
      .reduce((sum, pkg) => sum + pkg.tuition_amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">수강료 관리</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-2">전체 수강료</p>
            <p className="text-3xl font-bold text-gray-900">
              ₩{getTotalTuition().toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-2">입금 완료</p>
            <p className="text-3xl font-bold text-green-600">
              ₩{getPaidTuition().toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600 mb-2">미입금</p>
            <p className="text-3xl font-bold text-red-600">
              ₩{getUnpaidTuition().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">필터</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">상태</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">전체</option>
              <option value="unpaid">미입금만</option>
            </select>
          </div>
        </div>

        {/* Packages Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">학생</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">패키지</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">선생님</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  수업
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  수강료
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">상태</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPackages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {(pkg.students as any)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">{pkg.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {(pkg.teachers as any)?.profiles?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {pkg.completed_sessions} / {pkg.total_sessions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    ₩{pkg.tuition_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pkg.tuition_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : pkg.tuition_status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {pkg.tuition_status === 'paid'
                        ? '입금완료'
                        : pkg.tuition_status === 'overdue'
                          ? '연체'
                          : '미입금'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleTogglePaid(pkg.id, pkg.tuition_status)}
                      className={`px-3 py-1 text-sm rounded font-medium ${
                        pkg.tuition_status === 'paid'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {pkg.tuition_status === 'paid' ? '미입금으로 변경' : '입금 완료'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          총 {filteredPackages.length}개 패키지
        </div>
      </div>
    </div>
  );
}
