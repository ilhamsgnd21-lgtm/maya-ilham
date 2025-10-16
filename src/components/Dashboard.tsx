import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";

interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsTotal: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savingsTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.id);

      const { data: savings } = await supabase
        .from("savings_goals")
        .select("current_amount")
        .eq("user_id", user.id);

      const income = transactions
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const expense = transactions
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const savingsTotal = savings
        ?.reduce((sum, s) => sum + Number(s.current_amount), 0) || 0;

      setStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        savingsTotal,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted" />
            <CardContent className="h-16 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
      <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Saldo
          </CardTitle>
          <Wallet className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {formatCurrency(stats.balance)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pemasukan
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            {formatCurrency(stats.totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pengeluaran
          </CardTitle>
          <TrendingDown className="w-4 h-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(stats.totalExpense)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Tabungan
          </CardTitle>
          <Target className="w-4 h-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {formatCurrency(stats.savingsTotal)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
