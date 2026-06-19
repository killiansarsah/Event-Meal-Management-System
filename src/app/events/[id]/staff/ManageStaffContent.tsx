'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormInput } from '@/components/FormInput';
import { SuccessMessage } from '@/components/SuccessMessage';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface StaffInvite {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export default function ManageStaffContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const { request } = useApiRequest();

  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<StaffInvite[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [newInvite, setNewInvite] = useState({ name: '', email: '', role: 'registration_staff' });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [eventId]);

  const fetchStaff = async () => {
    // Fetch active staff
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('event_id', eventId)
      .neq('role', 'organizer');

    if (staff) setActiveStaff(staff);

    // Fetch pending invites
    const { data: invites, error: invitesError } = await supabase
      .from('staff_invites')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (invites) setPendingInvites(invites);
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await request(`/api/events/${eventId}/staff/invite`, 'POST', {
      full_name: newInvite.name,
      email: newInvite.email,
      role: newInvite.role,
    });

    if (response.success) {
      setSuccess('Invitation sent successfully');
      setNewInvite({ name: '', email: '', role: 'registration_staff' });
      setIsInviting(false);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      const response = await request(`/api/events/${eventId}/staff/${staffId}`, 'DELETE');

      if (response.success) {
        setSuccess('Staff member removed');
        fetchStaff();
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    const response = await request(`/api/events/${eventId}/staff/invite/${inviteId}/resend`, 'POST');

    if (response.success) {
      setSuccess('Invitation resent');
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/events/${eventId}`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Event
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Manage Staff</h1>
        <p className="text-foreground-secondary mb-8">Invite and manage staff members for this event</p>

        {success && <SuccessMessage message={success} />}

        {/* Invite Form */}
        {!isInviting ? (
          <button
            onClick={() => setIsInviting(true)}
            className="mb-8 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            + Invite Staff Member
          </button>
        ) : (
          <form onSubmit={handleInviteStaff} className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <FormInput
                label="Full Name"
                name="name"
                type="text"
                value={newInvite.name}
                onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                required
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                <select
                  value={newInvite.role}
                  onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="registration_staff">Registration Staff</option>
                  <option value="catering_staff">Catering Staff</option>
                  <option value="finance_team">Finance Team</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium">
                Send Invite
              </button>
              <button
                type="button"
                onClick={() => setIsInviting(false)}
                className="px-4 py-2 bg-background-secondary border border-border rounded-lg hover:bg-background transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Active Staff */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Active Staff</h2>
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {activeStaff.length === 0 ? (
              <div className="p-8 text-center text-foreground-secondary">No active staff members</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map((staff) => (
                    <tr key={staff.id} className="border-b border-border hover:bg-background transition-colors">
                      <td className="px-6 py-4 text-foreground">{staff.full_name}</td>
                      <td className="px-6 py-4 text-foreground-secondary">{staff.email}</td>
                      <td className="px-6 py-4 text-foreground capitalize">{staff.role.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveStaff(staff.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Invites */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Pending Invitations</h2>
          <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
            {pendingInvites.length === 0 ? (
              <div className="p-8 text-center text-foreground-secondary">No pending invitations</div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expires</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((invite) => (
                    <tr key={invite.id} className="border-b border-border hover:bg-background transition-colors">
                      <td className="px-6 py-4 text-foreground">{invite.full_name}</td>
                      <td className="px-6 py-4 text-foreground-secondary">{invite.email}</td>
                      <td className="px-6 py-4 text-foreground capitalize">{invite.role.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-foreground-secondary text-sm">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          className="text-accent hover:text-accent/80 font-medium text-sm mr-4"
                        >
                          Resend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
