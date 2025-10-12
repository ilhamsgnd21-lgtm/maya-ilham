import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowUpCircle, ArrowDownCircle, Calendar } from "lucide-react";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  notes?: string;
}

export const TransactionList = ({ refresh }: { refresh: number }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [refresh]);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Riwayat Transaksi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Belum ada transaksi
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income"
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpCircle className="w-5 h-5 text-success" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.category} •{" "}
                      {format(new Date(transaction.date), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>
                <div
                  className={`font-semibold ${
                    transaction.type === "income"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
