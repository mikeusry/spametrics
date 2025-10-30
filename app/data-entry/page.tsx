'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Save, Store as StoreIcon, Users, DollarSign, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getStores,
  getSalesReps,
  getDailyStoreRevenue,
  getDailySalesRepRevenue,
  upsertDailyStoreRevenue,
  upsertDailySalesRepRevenue,
  bulkUpsertDailyStoreRevenue,
  bulkUpsertDailySalesRepRevenue,
  formatCurrency,
  type Store,
  type SalesRep,
  type DailyStoreRevenue,
  type DailySalesRepRevenue,
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function DataEntryPage() {
  // Get today's date as default
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [storeRevenue, setStoreRevenue] = useState<DailyStoreRevenue[]>([]);
  const [repRevenue, setRepRevenue] = useState<DailySalesRepRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    setLoading(true);
    try {
      const [storesData, repsData, storeRevenueData, repRevenueData] = await Promise.all([
        getStores(),
        getSalesReps(),
        getDailyStoreRevenue(selectedDate),
        getDailySalesRepRevenue(selectedDate),
      ]);

      setStores(storesData);
      setSalesReps(repsData);
      setStoreRevenue(storeRevenueData);
      setRepRevenue(repRevenueData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    // Prevent future dates
    const today = format(new Date(), 'yyyy-MM-dd');
    if (newDate > today) {
      toast.error('Cannot enter data for future dates');
      return;
    }
    setSelectedDate(newDate);
  }

  function handlePreviousDate() {
    // Parse the date string directly to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    const prevDate = subDays(currentDate, 1);
    setSelectedDate(format(prevDate, 'yyyy-MM-dd'));
  }

  function handleNextDate() {
    // Parse the date string directly to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    const nextDate = addDays(currentDate, 1);
    const today = format(new Date(), 'yyyy-MM-dd');
    const nextDateStr = format(nextDate, 'yyyy-MM-dd');

    // Prevent future dates
    if (nextDateStr > today) {
      toast.error('Cannot enter data for future dates');
      return;
    }
    setSelectedDate(nextDateStr);
  }

  async function handleSaveStoreRevenue(storeId: number, dailyRevenue: number) {
    setSaving(true);
    try {
      const success = await upsertDailyStoreRevenue({
        date_id: selectedDate,
        store_id: storeId,
        daily_revenue: dailyRevenue,
      });

      if (success) {
        toast.success('Store revenue saved successfully');
        await loadData();
      } else {
        toast.error('Failed to save store revenue');
      }
    } catch (error) {
      console.error('Error saving store revenue:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRepRevenue(repId: number, dailyRevenue: number) {
    setSaving(true);
    try {
      const success = await upsertDailySalesRepRevenue({
        date_id: selectedDate,
        rep_id: repId,
        daily_revenue: dailyRevenue,
      });

      if (success) {
        toast.success('Rep revenue saved successfully');
        await loadData();
      } else {
        toast.error('Failed to save rep revenue');
      }
    } catch (error) {
      console.error('Error saving rep revenue:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  }

  // Calculate stats
  const storeEntriesCount = storeRevenue.filter(r => r.daily_revenue > 0).length;
  const repEntriesCount = repRevenue.filter(r => r.daily_revenue > 0).length;
  const totalStoreRevenue = storeRevenue.reduce((sum, r) => sum + (r.daily_revenue || 0), 0);
  const totalRepRevenue = repRevenue.reduce((sum, r) => sum + (r.daily_revenue || 0), 0);

  // Format date for display - parse date string directly to avoid timezone issues
  const [year, month, day] = selectedDate.split('-').map(Number);
  const displayDateObj = new Date(year, month - 1, day);
  const displayDate = format(displayDateObj, 'EEEE, MMMM d, yyyy');

  // Check if date is today
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Sales Data Entry</h1>
          <p className="text-muted-foreground mt-1">
            Enter daily revenue for stores and sales representatives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousDate}
            disabled={loading || saving}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-48"
              disabled={loading || saving}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDate}
            disabled={loading || saving || isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Entering data for</p>
            <h2 className="text-2xl font-bold text-primary">{displayDate}</h2>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Entries</CardTitle>
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storeEntriesCount} / {stores.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stores.length > 0 ? ((storeEntriesCount / stores.length) * 100).toFixed(0) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rep Entries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repEntriesCount} / {salesReps.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {salesReps.length > 0 ? ((repEntriesCount / salesReps.length) * 100).toFixed(0) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Store Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStoreRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All stores combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rep Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRepRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All reps combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Store Revenue and Rep Revenue */}
      <Tabs defaultValue="stores" className="w-full">
        <TabsList>
          <TabsTrigger value="stores">
            <StoreIcon className="h-4 w-4 mr-2" />
            Store Revenue
          </TabsTrigger>
          <TabsTrigger value="reps">
            <Users className="h-4 w-4 mr-2" />
            Sales Rep Revenue
          </TabsTrigger>
        </TabsList>

        {/* Store Revenue Tab */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store Daily Revenue for {displayDate}</CardTitle>
              <CardDescription>
                Enter the daily revenue for each store location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <StoreRevenueTable
                  stores={stores}
                  storeRevenue={storeRevenue}
                  selectedDate={selectedDate}
                  saving={saving}
                  onSave={handleSaveStoreRevenue}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rep Revenue Tab */}
        <TabsContent value="reps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Rep Daily Revenue for {displayDate}</CardTitle>
              <CardDescription>
                Enter the daily revenue for each sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <RepRevenueTable
                  salesReps={salesReps}
                  repRevenue={repRevenue}
                  selectedDate={selectedDate}
                  saving={saving}
                  onSave={handleSaveRepRevenue}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Store Revenue Table Component
function StoreRevenueTable({
  stores,
  storeRevenue,
  selectedDate,
  saving,
  onSave,
}: {
  stores: Store[];
  storeRevenue: DailyStoreRevenue[];
  selectedDate: string;
  saving: boolean;
  onSave: (storeId: number, dailyRevenue: number) => void;
}) {
  const [editingRevenue, setEditingRevenue] = useState<Record<number, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  const getRevenueForStore = (storeId: number) => {
    return storeRevenue.find((r) => r.store_id === storeId);
  };

  const validateRevenue = (value: string): { isValid: boolean; error?: string; numValue?: number } => {
    if (!value || value.trim() === '') {
      return { isValid: false, error: 'Revenue is required' };
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
      return { isValid: false, error: 'Must be a valid number' };
    }

    if (numValue < 0) {
      return { isValid: false, error: 'Cannot be negative' };
    }

    if (numValue > 1000000) {
      return { isValid: false, error: 'Exceeds maximum ($1,000,000)' };
    }

    if (!isFinite(numValue)) {
      return { isValid: false, error: 'Must be a finite number' };
    }

    return { isValid: true, numValue };
  };

  const handleInputChange = (storeId: number, value: string) => {
    setEditingRevenue((prev) => ({ ...prev, [storeId]: value }));
    setPendingChanges((prev) => new Set(prev).add(storeId));

    // Clear validation error when user starts typing
    if (validationErrors[storeId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[storeId];
        return newErrors;
      });
    }
  };

  const handleSave = (storeId: number) => {
    const existingRevenue = getRevenueForStore(storeId);
    const value = editingRevenue[storeId] ?? existingRevenue?.daily_revenue?.toString();

    if (!value) {
      setValidationErrors((prev) => ({ ...prev, [storeId]: 'Revenue is required' }));
      return;
    }

    const validation = validateRevenue(value);

    if (!validation.isValid) {
      setValidationErrors((prev) => ({ ...prev, [storeId]: validation.error! }));
      return;
    }

    onSave(storeId, validation.numValue!);
    setEditingRevenue((prev) => {
      const newState = { ...prev };
      delete newState[storeId];
      return newState;
    });
    setPendingChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(storeId);
      return newSet;
    });
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[storeId];
      return newErrors;
    });
  };

  const handleClearInput = (storeId: number) => {
    setEditingRevenue((prev) => {
      const newState = { ...prev };
      delete newState[storeId];
      return newState;
    });
    setPendingChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(storeId);
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    const entries: DailyStoreRevenue[] = [];

    pendingChanges.forEach((storeId) => {
      const value = editingRevenue[storeId];
      if (value && !isNaN(Number(value))) {
        entries.push({
          date_id: selectedDate,
          store_id: storeId,
          daily_revenue: Number(value),
        });
      }
    });

    if (entries.length === 0) return;

    // Import the bulk save function
    const { bulkUpsertDailyStoreRevenue } = await import('@/lib/api');
    const success = await bulkUpsertDailyStoreRevenue(entries);

    if (success) {
      setEditingRevenue({});
      setPendingChanges(new Set());
      // Reload page data
      window.location.reload();
    }
  };

  const handleDiscardAll = () => {
    setEditingRevenue({});
    setPendingChanges(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {pendingChanges.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-action rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {pendingChanges.size} unsaved {pendingChanges.size === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardAll}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Discard
            </Button>
            <Button
              variant="action"
              size="sm"
              onClick={handleSaveAll}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" />
              Save All Changes
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Store Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Region</TableHead>
            <TableHead className="text-right">Current Revenue</TableHead>
            <TableHead className="text-right">Daily Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => {
            const existingRevenue = getRevenueForStore(store.store_id);
            const editingValue = editingRevenue[store.store_id];
            const hasPendingChange = pendingChanges.has(store.store_id);
            const error = validationErrors[store.store_id];

            return (
              <TableRow key={store.store_id} className={hasPendingChange ? 'bg-action/5' : ''}>
                <TableCell className="font-medium">{store.store_name}</TableCell>
                <TableCell>{store.store_type}</TableCell>
                <TableCell>{store.region || '-'}</TableCell>
                <TableCell className="text-right">
                  {existingRevenue ? formatCurrency(existingRevenue.daily_revenue) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <Input
                      type="number"
                      placeholder="Enter revenue"
                      value={editingValue !== undefined ? editingValue : (existingRevenue?.daily_revenue ?? '')}
                      onChange={(e) => handleInputChange(store.store_id, e.target.value)}
                      onFocus={(e) => {
                        if (existingRevenue && editingValue === undefined) {
                          setEditingRevenue((prev) => ({ ...prev, [store.store_id]: existingRevenue.daily_revenue.toString() }));
                        }
                      }}
                      className={cn("w-32", error && "border-red-500")}
                      disabled={saving}
                      min="0"
                      max="1000000"
                      step="0.01"
                    />
                    {error && (
                      <span className="text-xs text-red-600">{error}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {hasPendingChange && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearInput(store.store_id)}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="action"
                      onClick={() => handleSave(store.store_id)}
                      disabled={saving || (!editingValue && !existingRevenue?.daily_revenue)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Total Row */}
          <TableRow className="border-t-2 border-primary bg-muted/50">
            <TableCell colSpan={3} className="font-bold text-primary">
              TOTAL DAILY REVENUE
            </TableCell>
            <TableCell className="text-right font-bold text-primary text-lg">
              {formatCurrency(
                storeRevenue.reduce((sum, rev) => sum + (rev.daily_revenue || 0), 0)
              )}
            </TableCell>
            <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
              Sum of all store revenue
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// Rep Revenue Table Component
function RepRevenueTable({
  salesReps,
  repRevenue,
  selectedDate,
  saving,
  onSave,
}: {
  salesReps: SalesRep[];
  repRevenue: DailySalesRepRevenue[];
  selectedDate: string;
  saving: boolean;
  onSave: (repId: number, dailyRevenue: number) => void;
}) {
  const [editingRevenue, setEditingRevenue] = useState<Record<number, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getRevenueForRep = (repId: number) => {
    return repRevenue.find((r) => r.rep_id === repId);
  };

  const handleInputChange = (repId: number, value: string) => {
    setEditingRevenue((prev) => ({ ...prev, [repId]: value }));
    setPendingChanges((prev) => new Set(prev).add(repId));
  };

  const handleSave = (repId: number) => {
    const existingRevenue = getRevenueForRep(repId);
    const value = editingRevenue[repId] ?? existingRevenue?.daily_revenue?.toString();
    if (value && !isNaN(Number(value))) {
      onSave(repId, Number(value));
      setEditingRevenue((prev) => {
        const newState = { ...prev };
        delete newState[repId];
        return newState;
      });
      setPendingChanges((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repId);
        return newSet;
      });
    }
  };

  const handleClearInput = (repId: number) => {
    setEditingRevenue((prev) => {
      const newState = { ...prev };
      delete newState[repId];
      return newState;
    });
    setPendingChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(repId);
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    const entries: DailySalesRepRevenue[] = [];

    pendingChanges.forEach((repId) => {
      const value = editingRevenue[repId];
      if (value && !isNaN(Number(value))) {
        entries.push({
          date_id: selectedDate,
          rep_id: repId,
          daily_revenue: Number(value),
        });
      }
    });

    if (entries.length === 0) return;

    // Import the bulk save function
    const { bulkUpsertDailySalesRepRevenue } = await import('@/lib/api');
    const success = await bulkUpsertDailySalesRepRevenue(entries);

    if (success) {
      setEditingRevenue({});
      setPendingChanges(new Set());
      // Reload page data
      window.location.reload();
    }
  };

  const handleDiscardAll = () => {
    setEditingRevenue({});
    setPendingChanges(new Set());
  };

  // Sort reps by revenue
  const sortedReps = [...salesReps].sort((a, b) => {
    const revenueA = getRevenueForRep(a.rep_id)?.daily_revenue || 0;
    const revenueB = getRevenueForRep(b.rep_id)?.daily_revenue || 0;
    return sortOrder === 'desc' ? revenueB - revenueA : revenueA - revenueB;
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {pendingChanges.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-action rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {pendingChanges.size} unsaved {pendingChanges.size === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardAll}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Discard
            </Button>
            <Button
              variant="action"
              size="sm"
              onClick={handleSaveAll}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" />
              Save All Changes
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sales Rep Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">
              <button
                onClick={toggleSort}
                className="flex items-center justify-end w-full hover:text-primary transition-colors"
              >
                Current Revenue
                <ChevronDown className={cn(
                  'ml-1 h-4 w-4 transition-transform',
                  sortOrder === 'asc' && 'rotate-180'
                )} />
              </button>
            </TableHead>
            <TableHead className="text-right">Daily Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReps.map((rep) => {
            const existingRevenue = getRevenueForRep(rep.rep_id);
            const editingValue = editingRevenue[rep.rep_id];
            const hasPendingChange = pendingChanges.has(rep.rep_id);

            return (
              <TableRow key={rep.rep_id} className={hasPendingChange ? 'bg-action/5' : ''}>
                <TableCell className="font-medium">{rep.full_name}</TableCell>
                <TableCell>{rep.role || '-'}</TableCell>
                <TableCell className="text-right">
                  {existingRevenue ? formatCurrency(existingRevenue.daily_revenue) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    placeholder="Enter revenue"
                    value={editingValue !== undefined ? editingValue : (existingRevenue?.daily_revenue ?? '')}
                    onChange={(e) => handleInputChange(rep.rep_id, e.target.value)}
                    onFocus={(e) => {
                      if (existingRevenue && editingValue === undefined) {
                        setEditingRevenue((prev) => ({ ...prev, [rep.rep_id]: existingRevenue.daily_revenue.toString() }));
                      }
                    }}
                    className="w-32 ml-auto"
                    disabled={saving}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {hasPendingChange && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearInput(rep.rep_id)}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="action"
                      onClick={() => handleSave(rep.rep_id)}
                      disabled={saving || (!editingValue && !existingRevenue?.daily_revenue)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Total Row */}
          <TableRow className="border-t-2 border-primary bg-muted/50">
            <TableCell colSpan={2} className="font-bold text-primary">
              TOTAL REP REVENUE
            </TableCell>
            <TableCell className="text-right font-bold text-primary text-lg">
              {formatCurrency(
                repRevenue.reduce((sum, rev) => sum + (rev.daily_revenue || 0), 0)
              )}
            </TableCell>
            <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
              Sum of all rep revenue
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
