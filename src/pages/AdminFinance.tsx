
import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import * as api from '../lib/api';
import type { Finance } from '../types';
import { Mail, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type FinanceRow = {
  id: string;
  name: string;
  email: string;
  total: number;
  paid: number;
  scholarship: number;
  balance: number;
};

export function AdminFinance() {
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'settled'>('all');
  const [minBalance, setMinBalance] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    const loadFinances = async () => {
      try {
        setLoading(true);
        const finances = await api.getFinances();
        const studentIds = finances.map((fin) => fin.studentId).filter(Boolean);
        const students = await api.getStudentsByIds(studentIds);
        const studentMap = new Map(students.map((s) => [s.id, s]));
        const mapped = finances.map<FinanceRow>((fin: Finance) => {
          const student = studentMap.get(fin.studentId);
          const netDue = Math.max(0, fin.totalFee - fin.scholarship - fin.paid);
          return {
            id: fin.id,
            name: student?.name ?? 'Unknown Student',
            email: student?.email ?? '—',
            total: fin.totalFee,
            paid: fin.paid,
            scholarship: fin.scholarship,
            balance: netDue,
          };
        });
        setRows(mapped);
      } catch (error) {
        console.error('Failed to load finance data', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadFinances();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, balanceFilter, minBalance, rows.length]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBalanceFilter =
        balanceFilter === 'all'
          ? true
          : balanceFilter === 'due'
          ? row.balance > 0
          : row.balance === 0;
      const minBalanceValue = Number(minBalance);
      const matchesMinBalance =
        !minBalance || Number.isNaN(minBalanceValue) ? true : row.balance >= minBalanceValue;
      return matchesSearch && matchesBalanceFilter && matchesMinBalance;
    });
  }, [rows, searchTerm, balanceFilter, minBalance]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalFee += row.total;
        acc.scholarship += row.scholarship;
        acc.paid += row.paid;
        acc.balance += row.balance;
        return acc;
      },
      { totalFee: 0, scholarship: 0, paid: 0, balance: 0 }
    );
  }, [filteredRows]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const handleMail = (row: FinanceRow) => {
    toast.success(`Opening mail client for ${row.name}`);
    window.location.href = `mailto:${row.email}?subject=${encodeURIComponent('Finance Update')}`;
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filteredRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-8">
        <div className="space-y-1">
          <h1>Finance Overview</h1>
          <p className="text-gray-600">
            Review student balances, scholarships, and payment status in a quick glance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Search by name or email</p>
              <Input
                placeholder="e.g. Alex Johnson"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Balance status</p>
              <Select value={balanceFilter} onValueChange={(value) => setBalanceFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All records</SelectItem>
                  <SelectItem value="due">Balance due</SelectItem>
                  <SelectItem value="settled">Paid in full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Minimum balance (USD)</p>
              <Input
                type="number"
                min="0"
                value={minBalance}
                onChange={(event) => setMinBalance(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Totals</CardTitle>
            <p className="text-sm text-gray-600">
              Showing {filteredRows.length} of {rows.length} records
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3 bg-blue-50">
                <p className="text-xs uppercase text-blue-700">Total Fees</p>
                <p className="text-xl font-semibold text-blue-900">{formatCurrency(totals.totalFee)}</p>
              </div>
              <div className="rounded-lg border p-3 bg-green-50">
                <p className="text-xs uppercase text-green-700">Scholarships</p>
                <p className="text-xl font-semibold text-green-900">
                  {formatCurrency(totals.scholarship)}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-emerald-50">
                <p className="text-xs uppercase text-emerald-700">Paid</p>
                <p className="text-xl font-semibold text-emerald-900">{formatCurrency(totals.paid)}</p>
              </div>
              <div className="rounded-lg border p-3 bg-rose-50">
                <p className="text-xs uppercase text-rose-700">Balance</p>
                <p className="text-xl font-semibold text-rose-900">{formatCurrency(totals.balance)}</p>
              </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">Loading finance records...</CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              No records match your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((row) => (
                <Card key={row.id} className="h-full border border-slate-100 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                      <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                      <p className="text-sm text-slate-500 truncate">{row.email}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Total Fee</span>
                        <span className="font-medium text-slate-800">{formatCurrency(row.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Scholarship</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(row.scholarship)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Paid</span>
                        <span className="font-medium text-blue-700">{formatCurrency(row.paid)}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs text-rose-600">
                        <span>Balance</span>
                        <span className="text-lg font-semibold">{formatCurrency(row.balance)}</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => handleMail(row)}>
                      <Mail className="mr-2 size-4" />
                      Email Student
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm md:flex-row md:items-center md:justify-between">
              <p>
                Showing {filteredRows.length === 0 ? 0 : currentPage * pageSize + 1}-
                {Math.min((currentPage + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminFinance;
