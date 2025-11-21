import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { store, payFee, getFinanceForStudent } from '../lib/store';
import { useAuth } from '../lib/authContext';
import { Finance } from '../types';
import { DollarSign, CreditCard, Award, TrendingDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function StudentFinance() {
  const { user } = useAuth();
  const [finance, setFinance] = useState<Finance | null>(null);
  const [paying, setPaying] = useState(false);

  const loadFinance = useCallback(async (studentId: string) => {
    try {
      const record = await getFinanceForStudent(studentId);
      setFinance(record ? { ...record } : null);
    } catch (error) {
      console.error('Failed to load finance record', error);
      setFinance(null);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setFinance(null);
      return;
    }
    loadFinance(user.id);
  }, [user?.id, loadFinance]);

  const paidPercentage = finance ? (finance.paid / finance.totalFee) * 100 : 0;

  const handlePayment = async (mode: 'custom' | 'full') => {
    if (!finance) {
      toast.error('No finance record found');
      return;
    }
    if (paying) return;

    try {
      setPaying(true);
      let amount = 0;
      if (mode === 'full') {
        amount = finance.totalFee - finance.scholarship - finance.paid;
      } else {
        const input = window.prompt('Enter amount to pay', String(finance.due));
        const maxPayable = finance.totalFee - finance.scholarship - finance.paid;
        amount = Math.max(0, Math.min(Number(input || 0), maxPayable));
      }
      if (!amount || Number.isNaN(amount)) {
        toast.error('Please enter a valid amount');
        return;
      }
      await payFee(finance.studentId, amount);
      await loadFinance(finance.studentId);
      toast.success('Payment recorded successfully');
    } catch (e:any) {
      toast.error(e?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };
  if (!finance) {
    return (
      <DashboardLayout>
        <div className="p-8 space-y-4">
          <h1>Finance & Payments</h1>
          <p className="text-gray-600">No finance records are available for your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1>Finance & Payments</h1>
          <p className="text-gray-600">Manage your tuition fees and payments.</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Fee</CardTitle>
              <DollarSign className="size-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">${finance?.totalFee?.toLocaleString?.() ?? 0}</div>
              <p className="text-xs text-gray-600 mt-1">{finance?.semester ?? '—'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Scholarship</CardTitle>
              <Award className="size-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-green-600">-${finance?.scholarship?.toLocaleString?.() ?? 0}</div>
              <p className="text-xs text-gray-600 mt-1">Merit-based award</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Amount Paid</CardTitle>
              <CreditCard className="size-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">${finance?.paid?.toLocaleString?.() ?? 0}</div>
              <Progress value={paidPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Balance Due</CardTitle>
              <TrendingDown className="size-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-red-600">${finance?.due?.toLocaleString?.() ?? 0}</div>
              <p className="text-xs text-gray-600 mt-1">Due by Dec 15, 2025</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Tuition Fee</span>
                <span>${finance?.totalFee?.toLocaleString?.() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Scholarship Applied</span>
                <span className="text-green-600">-${finance?.scholarship?.toLocaleString?.() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Net Payable</span>
                <span>${((finance?.totalFee ?? 0) - (finance?.scholarship ?? 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Already Paid</span>
                <span className="text-green-600">${finance?.paid?.toLocaleString?.() ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span>Outstanding Balance</span>
                <span className="text-red-600">${finance?.due?.toLocaleString?.() ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 mb-2">Outstanding Balance</p>
                <p className="text-2xl text-blue-900">${finance?.due?.toLocaleString?.() ?? 0}</p>
              </div>
              
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={() => handlePayment('full')} disabled={paying}>
                  <CreditCard className="mr-2 size-4" />
                  Pay Full Amount
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => handlePayment('custom')}
                  disabled={paying}
                >
                  Pay Custom Amount
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Payment Methods Accepted</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">Credit Card</Badge>
                  <Badge variant="outline">Debit Card</Badge>
                  <Badge variant="outline">Bank Transfer</Badge>
                  <Badge variant="outline">PayPal</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        {/*
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 1, date: '2025-10-15', amount: 5000, method: 'Credit Card', status: 'completed' },
                { id: 2, date: '2025-09-01', amount: 3000, method: 'Bank Transfer', status: 'completed' },
              ].map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p>Payment via {payment.method}</p>
                    <p className="text-sm text-gray-600">{payment.date}</p>
                  </div>
                  <div className="text-right">
                    <p>${payment.amount.toLocaleString()}</p>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        */}
      </div>
    </DashboardLayout>
  );
}
