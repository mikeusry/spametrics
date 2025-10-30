'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Target, Users, Store as StoreIcon, Plus, Trash2, Save, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  getMonthlyGoals,
  getSalesRepGoals,
  upsertMonthlyGoal,
  upsertSalesRepGoal,
  deleteMonthlyGoal,
  deleteSalesRepGoal,
  formatCurrency,
  type Store,
  type SalesRep,
  type MonthlyGoal,
  type SalesRepGoal,
} from '@/lib/api';
import { cn } from '@/lib/utils';

export default function GoalsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>([]);
  const [repGoals, setRepGoals] = useState<SalesRepGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const [storesData, repsData, goalsData, repGoalsData] = await Promise.all([
        getStores(),
        getSalesReps(),
        getMonthlyGoals(selectedMonth),
        getSalesRepGoals(selectedMonth),
      ]);

      setStores(storesData);
      setSalesReps(repsData);
      setMonthlyGoals(goalsData);
      setRepGoals(repGoalsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = new Date(e.target.value);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    setSelectedMonth(format(firstDay, 'yyyy-MM-dd'));
  }

  async function handleSaveStoreGoal(storeId: number, goal: number) {
    setSaving(true);
    try {
      const success = await upsertMonthlyGoal({
        month: selectedMonth,
        store_id: storeId,
        store_goal: goal,
      });

      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error saving store goal:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRepGoal(repId: number, goal: number) {
    setSaving(true);
    try {
      const success = await upsertSalesRepGoal({
        month: selectedMonth,
        rep_id: repId,
        monthly_goal: goal,
      });

      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error saving rep goal:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStoreGoal(goalId: number) {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    setSaving(true);
    try {
      const success = await deleteMonthlyGoal(goalId);
      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting store goal:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRepGoal(repGoalId: number) {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    setSaving(true);
    try {
      const success = await deleteSalesRepGoal(repGoalId);
      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting rep goal:', error);
    } finally {
      setSaving(false);
    }
  }

  // Parse date explicitly to avoid timezone issues
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthDisplay = format(new Date(year, month - 1, 1), 'MMMM yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Goal Management</h1>
          <p className="text-muted-foreground mt-1">
            Set and manage monthly revenue goals for stores and sales representatives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Input
            type="month"
            value={selectedMonth.substring(0, 7)}
            onChange={handleMonthChange}
            className="w-48"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Month</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthDisplay}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stores.length} stores • {salesReps.length} reps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Goals Set</CardTitle>
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyGoals.length} / {stores.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((monthlyGoals.length / stores.length) * 100).toFixed(0)}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rep Goals Set</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repGoals.length} / {salesReps.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((repGoals.length / salesReps.length) * 100).toFixed(0)}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Store Goals and Rep Goals */}
      <Tabs defaultValue="stores" className="w-full">
        <TabsList>
          <TabsTrigger value="stores">
            <StoreIcon className="h-4 w-4 mr-2" />
            Store Goals
          </TabsTrigger>
          <TabsTrigger value="reps">
            <Users className="h-4 w-4 mr-2" />
            Sales Rep Goals
          </TabsTrigger>
        </TabsList>

        {/* Store Goals Tab */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Store Goals for {monthDisplay}</CardTitle>
              <CardDescription>
                Set revenue targets for each store location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <StoreGoalsTable
                  stores={stores}
                  monthlyGoals={monthlyGoals}
                  selectedMonth={selectedMonth}
                  saving={saving}
                  onSave={handleSaveStoreGoal}
                  onDelete={handleDeleteStoreGoal}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rep Goals Tab */}
        <TabsContent value="reps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Rep Goals for {monthDisplay}</CardTitle>
              <CardDescription>
                Set revenue targets for each sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <RepGoalsTable
                  salesReps={salesReps}
                  repGoals={repGoals}
                  selectedMonth={selectedMonth}
                  saving={saving}
                  onSave={handleSaveRepGoal}
                  onDelete={handleDeleteRepGoal}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Store Goals Table Component
function StoreGoalsTable({
  stores,
  monthlyGoals,
  selectedMonth,
  saving,
  onSave,
  onDelete,
}: {
  stores: Store[];
  monthlyGoals: MonthlyGoal[];
  selectedMonth: string;
  saving: boolean;
  onSave: (storeId: number, goal: number) => void;
  onDelete: (goalId: number) => void;
}) {
  const [editingGoals, setEditingGoals] = useState<Record<number, string>>({});

  const getGoalForStore = (storeId: number) => {
    return monthlyGoals.find((g) => g.store_id === storeId);
  };

  const handleInputChange = (storeId: number, value: string) => {
    setEditingGoals((prev) => ({ ...prev, [storeId]: value }));
  };

  const handleSave = (storeId: number) => {
    const existingGoal = getGoalForStore(storeId);
    const value = editingGoals[storeId] ?? existingGoal?.store_goal?.toString();
    if (value && !isNaN(Number(value))) {
      onSave(storeId, Number(value));
      setEditingGoals((prev) => {
        const newState = { ...prev };
        delete newState[storeId];
        return newState;
      });
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Store Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Region</TableHead>
          <TableHead className="text-right">Current Goal</TableHead>
          <TableHead className="text-right">New Goal</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stores.map((store) => {
          const existingGoal = getGoalForStore(store.store_id);
          const editingValue = editingGoals[store.store_id];

          return (
            <TableRow key={store.store_id}>
              <TableCell className="font-medium">{store.store_name}</TableCell>
              <TableCell>{store.store_type}</TableCell>
              <TableCell>{store.region || '-'}</TableCell>
              <TableCell className="text-right">
                {existingGoal ? formatCurrency(existingGoal.store_goal) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  placeholder="Enter goal"
                  value={editingValue !== undefined ? editingValue : (existingGoal?.store_goal ?? '')}
                  onChange={(e) => handleInputChange(store.store_id, e.target.value)}
                  onFocus={(e) => {
                    if (existingGoal && editingValue === undefined) {
                      setEditingGoals((prev) => ({ ...prev, [store.store_id]: existingGoal.store_goal.toString() }));
                    }
                  }}
                  className="w-32 ml-auto"
                  disabled={saving}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="action"
                    onClick={() => handleSave(store.store_id)}
                    disabled={saving || (!editingValue && !existingGoal?.store_goal)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  {existingGoal && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(existingGoal.goal_id!)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {/* Total Company Goal Row */}
        <TableRow className="border-t-2 border-primary bg-muted/50">
          <TableCell colSpan={3} className="font-bold text-primary">
            TOTAL COMPANY GOAL
          </TableCell>
          <TableCell className="text-right font-bold text-primary text-lg">
            {formatCurrency(
              monthlyGoals.reduce((sum, goal) => sum + (goal.store_goal || 0), 0)
            )}
          </TableCell>
          <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
            Sum of all store goals
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

// Rep Goals Table Component
function RepGoalsTable({
  salesReps,
  repGoals,
  selectedMonth,
  saving,
  onSave,
  onDelete,
}: {
  salesReps: SalesRep[];
  repGoals: SalesRepGoal[];
  selectedMonth: string;
  saving: boolean;
  onSave: (repId: number, goal: number) => void;
  onDelete: (repGoalId: number) => void;
}) {
  const [editingGoals, setEditingGoals] = useState<Record<number, string>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getGoalForRep = (repId: number) => {
    return repGoals.find((g) => g.rep_id === repId);
  };

  const handleInputChange = (repId: number, value: string) => {
    setEditingGoals((prev) => ({ ...prev, [repId]: value }));
  };

  const handleSave = (repId: number) => {
    const existingGoal = getGoalForRep(repId);
    const value = editingGoals[repId] ?? existingGoal?.monthly_goal?.toString();
    if (value && !isNaN(Number(value))) {
      onSave(repId, Number(value));
      setEditingGoals((prev) => {
        const newState = { ...prev };
        delete newState[repId];
        return newState;
      });
    }
  };

  // Sort reps by goal amount
  const sortedReps = [...salesReps].sort((a, b) => {
    const goalA = getGoalForRep(a.rep_id)?.monthly_goal || 0;
    const goalB = getGoalForRep(b.rep_id)?.monthly_goal || 0;
    return sortOrder === 'desc' ? goalB - goalA : goalA - goalB;
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  return (
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
              Current Goal
              <ChevronDown className={cn(
                'ml-1 h-4 w-4 transition-transform',
                sortOrder === 'asc' && 'rotate-180'
              )} />
            </button>
          </TableHead>
          <TableHead className="text-right">New Goal</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedReps.map((rep) => {
          const existingGoal = getGoalForRep(rep.rep_id);
          const editingValue = editingGoals[rep.rep_id];

          return (
            <TableRow key={rep.rep_id}>
              <TableCell className="font-medium">{rep.full_name}</TableCell>
              <TableCell>{rep.role || '-'}</TableCell>
              <TableCell className="text-right">
                {existingGoal ? formatCurrency(existingGoal.monthly_goal) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  placeholder="Enter goal"
                  value={editingValue !== undefined ? editingValue : (existingGoal?.monthly_goal ?? '')}
                  onChange={(e) => handleInputChange(rep.rep_id, e.target.value)}
                  onFocus={(e) => {
                    if (existingGoal && editingValue === undefined) {
                      setEditingGoals((prev) => ({ ...prev, [rep.rep_id]: existingGoal.monthly_goal.toString() }));
                    }
                  }}
                  className="w-32 ml-auto"
                  disabled={saving}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="action"
                    onClick={() => handleSave(rep.rep_id)}
                    disabled={saving || (!editingValue && !existingGoal?.monthly_goal)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  {existingGoal && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(existingGoal.rep_goal_id!)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {/* Total Sales Rep Goals Row */}
        <TableRow className="border-t-2 border-primary bg-muted/50">
          <TableCell colSpan={2} className="font-bold text-primary">
            TOTAL SALES REP GOALS
          </TableCell>
          <TableCell className="text-right font-bold text-primary text-lg">
            {formatCurrency(
              repGoals.reduce((sum, goal) => sum + (goal.monthly_goal || 0), 0)
            )}
          </TableCell>
          <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
            Sum of all rep goals
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
