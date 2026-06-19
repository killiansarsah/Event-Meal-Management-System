'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormError } from '@/components/FormError';

interface PaymentRecord {
  id: string;
  full_name: string;
  category_name: string | null;
  payment_status: 'pending' | 'approved' | 'declined';
  receipt_number: string | null;
}

interface PaymentsData {
  payments: PaymentRecord[];
  stats: {
    total_approved: number;
    total_declined: number;
    total_pending: number;
  };
}

export default function PaymentsOverviewContent() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createClient();
  const { request, isLoading, error } = useApiRequest();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState({
    total_approved: 0,
    total_declined: 0,
    total_pending: 0,
  });
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'declined' | 'pending'>('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      const response = await request(`/api/events/${eventId}/reports/payments`, 'GET');
      if (response.success && (response.data as any)) {
        const data = (response.data as any);
        setPayments(data.payments || []);
        setStats(data.stats || {
          total_approved: 0,
          total_declined: 0,
          total_pending: 0,
        });
      }
    };

    fetchPayments();
  }, [eventId, request]);

  // Filter and search
  useEffect(() => {
    let filtered = payments;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status === statusFilter);
    }

    // Apply search (name or receipt number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.full_name.toLowerCase().includes(query) ||
        (p.receipt_number && p.receipt_number.toLowerCase().includes(query))
      );
    }

    setFilteredPayments(filtered);
  }, [payments, statusFilter, searchQuery]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'declined':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  // Handle export
  const handleExport = async (type: 'csv' | 'pdf' | 'excel') => {
    setExportLoading(true);
    setExportError(null);

    try {
      const response = await fetch(
        `/api/events/${eventId}/reports/export?type=${type}&report=payments`,
        {
          method: 'GET',
          headers: {
            'Content-Type': `application/${type === 'pdf' ? 'pdf' : type === 'excel' ? 'vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'csv; charset=utf-8'}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `payments-export.${type}`;
      if (contentDisposition) {
        const filenamePart = contentDisposition.split('filename=')[1];
        if (filenamePart) {
          filename = filenamePart.replace(/"/g, '');
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      setExportError(errorMsg);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payments Overview</h1>
          <p className="text-foreground-secondary">View and manage all participant payment records</p>
        </div>

        {/* Summary Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Approved Card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-sm font-medium text-green-700 mb-2">Approved</div>
            <div className="text-4xl font-bold text-green-900">{stats.total_approved}</div>
          </div>

          {/* Declined Card */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-sm font-medium text-red-700 mb-2">Declined</div>
            <div className="text-4xl font-bold text-red-900">{stats.total_declined}</div>
          </div>

          {/* Pending Card */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-sm font-medium text-yellow-700 mb-2">Pending</div>
            <div className="text-4xl font-bold text-yellow-900">{stats.total_pending}</div>
          </div>
        </div>

        {error && <FormError message={error} />}
        {exportError && <FormError message={`Export Error: ${exportError}`} />}

        {/* Controls Section */}
        <div className="bg-background-secondary border border-border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search</label>
              <input
                type="text"
                placeholder="Name or receipt number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
              className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
              className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={exportLoading}
              className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {exportLoading ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-foreground-secondary">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
              <p className="mt-4">Loading payment records...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">
              {payments.length === 0 ? 'No payments found' : 'No payments match your search or filter'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Participant Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Receipt Number</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border hover:bg-background transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground">{payment.full_name}</td>
                      <td className="px-6 py-4 text-sm text-foreground-secondary">
                        {payment.category_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                          {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground-secondary font-mono">
                        {payment.receipt_number || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Counter */}
        <div className="mt-4 text-sm text-foreground-secondary">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>
      </div>
    </div>
  );
}
