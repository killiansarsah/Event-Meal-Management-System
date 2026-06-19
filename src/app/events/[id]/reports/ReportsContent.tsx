'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ReportTab {
  id: string;
  name: string;
  icon: string;
}

const reportTabs: ReportTab[] = [
  { id: 'registration', name: 'Registration', icon: '📋' },
  { id: 'meals', name: 'Meals', icon: '🍽️' },
  { id: 'payments', name: 'Payments', icon: '💳' },
  { id: 'audit', name: 'Audit Log', icon: '📝' },
];

export default function ReportsContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('registration');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, eventId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let query;

      switch (activeTab) {
        case 'registration':
          query = supabase
            .from('participants')
            .select('id, full_name, category_id, payment_status, registered_online, created_at')
            .eq('event_id', eventId);
          break;

        case 'meals':
          query = supabase
            .from('meal_checkins')
            .select('id, participant_id, session_id, scanned_at, is_override')
            .eq('event_id', eventId);
          break;

        case 'payments':
          query = supabase
            .from('participants')
            .select('id, full_name, payment_status, created_at')
            .eq('event_id', eventId);
          break;

        case 'audit':
          query = supabase
            .from('audit_logs')
            .select('id, action, entity_type, details, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
          break;

        default:
          query = supabase
            .from('participants')
            .select('*')
            .eq('event_id', eventId);
      }

      const { data: result, error } = await query.limit(1000);

      if (result) {
        setData(result);
      }
    } catch (error) {
      console.error('[v0] Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    // Convert data to CSV
    let csvContent = '';

    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);
    csvContent = headers.join(',') + '\n';

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvContent += values.join(',') + '\n';
    });

    if (format === 'csv') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report.csv`;
      a.click();
    } else {
      // For PDF and Excel, show message (would require additional libraries)
      alert(`${format.toUpperCase()} export requires additional setup. CSV export is available now.`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/events/${eventId}`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Event
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Reports</h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-border pb-4">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-background-secondary text-foreground hover:bg-background-secondary/80'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Export Excel
          </button>
        </div>

        {/* Report Data */}
        <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-foreground-secondary">Loading report...</div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">No data available for this report</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-background">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-background transition-colors">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="px-6 py-4 text-foreground text-sm">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-foreground-secondary text-sm mt-4">{data.length} records</p>
      </div>
    </div>
  );
}
