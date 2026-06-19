'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';
import { FormInput } from '@/components/FormInput';
import { FormError } from '@/components/FormError';
import { SuccessMessage } from '@/components/SuccessMessage';

interface Category {
  id: string;
  name: string;
  registration_fee: number;
}

export default function ManageCategoriesContent({ eventId }: { eventId: string }) {
  const supabase = createClient();
  const { request, isLoading } = useApiRequest();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', fee: '0' });
  const [success, setSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [eventId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('participant_categories')
      .select('*')
      .eq('event_id', eventId);

    if (data) setCategories(data);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await request(`/api/events/${eventId}/categories`, 'POST', {
      name: newCategory.name,
      registration_fee: parseFloat(newCategory.fee),
    });

    if (response.success) {
      setSuccess('Category added successfully');
      setNewCategory({ name: '', fee: '0' });
      setIsAddingCategory(false);
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const response = await request(`/api/events/${eventId}/categories/${categoryId}`, 'DELETE');

    if (!response.success) {
      if (response.error?.includes('409') || response.error?.includes('participants')) {
        setDeleteError('Cannot delete: participants are assigned to this category');
        setTimeout(() => setDeleteError(''), 4000);
        return;
      }
    }

    setSuccess('Category deleted');
    fetchCategories();
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/events/${eventId}`} className="text-accent hover:underline mb-6 inline-block">
          ← Back to Event
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Manage Categories</h1>
        <p className="text-foreground-secondary mb-8">Add and configure participant categories for this event</p>

        {success && <SuccessMessage message={success} />}
        {deleteError && <FormError message={deleteError} />}

        {/* Add Category Form */}
        {!isAddingCategory ? (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="mb-8 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
          >
            + Add Category
          </button>
        ) : (
          <form onSubmit={handleAddCategory} className="bg-background-secondary border border-border rounded-lg p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Category Name"
                name="name"
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g. VIP, Regular, Student"
                required
              />
              <FormInput
                label="Registration Fee"
                name="fee"
                type="number"
                step="0.01"
                value={newCategory.fee}
                onChange={(e) => setNewCategory({ ...newCategory, fee: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex gap-4 mt-6">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium">
                Add Category
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-4 py-2 bg-background-secondary border border-border rounded-lg hover:bg-background transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="bg-background-secondary border border-border rounded-lg overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">No categories yet</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Registration Fee</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-foreground">{category.name}</td>
                    <td className="px-6 py-4 text-foreground">${category.registration_fee.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
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
  );
}
