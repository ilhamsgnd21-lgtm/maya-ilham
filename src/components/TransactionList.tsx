import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowUpCircle, ArrowDownCircle, Calendar, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  const [editOpen, setEditOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTransaction) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const type = formData.get("type") as "income" | "expense";
    const date = formData.get("date") as string;
    const notes = formData.get("notes") as string;
    const amount = parseFormattedNumber(editAmount);

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          title,
          amount,
          type,
          category,
          date,
          notes: notes || null,
        })
        .eq("id", editTransaction.id);

      if (error) throw error;

      toast.success("Transaksi berhasil diupdate!");
      setEditOpen(false);
      setEditTransaction(null);
      setEditAmount("");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengupdate transaksi");
    }
  };

  const handleDelete = async () => {
    if (!deleteTransaction) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deleteTransaction.id);

      if (error) throw error;

      toast.success("Transaksi berhasil dihapus!");
      setDeleteOpen(false);
      setDeleteTransaction(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus transaksi");
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
                <div className="flex items-center gap-3 flex-1">
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{transaction.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.category} •{" "}
                      {format(new Date(transaction.date), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditTransaction(transaction);
                        setEditAmount(formatNumber(transaction.amount.toString()));
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteTransaction(transaction);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Judul</Label>
                <Input
                  id="editTitle"
                  name="title"
                  defaultValue={editTransaction.title}
                  placeholder="Contoh: Gaji Bulanan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAmount">Jumlah</Label>
                <Input
                  id="editAmount"
                  value={editAmount}
                  onChange={(e) => setEditAmount(formatNumber(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editType">Tipe</Label>
                <Select name="type" defaultValue={editTransaction.type} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Pemasukan</SelectItem>
                    <SelectItem value="expense">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory">Kategori</Label>
                <Input
                  id="editCategory"
                  name="category"
                  defaultValue={editTransaction.category}
                  placeholder="Contoh: Makanan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDate">Tanggal</Label>
                <Input
                  id="editDate"
                  name="date"
                  type="date"
                  defaultValue={new Date(editTransaction.date).toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Catatan (Opsional)</Label>
                <Input
                  id="editNotes"
                  name="notes"
                  defaultValue={editTransaction.notes || ""}
                  placeholder="Catatan tambahan"
                />
              </div>
              <Button type="submit" className="w-full">
                Simpan Perubahan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus transaksi "{deleteTransaction?.title}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
