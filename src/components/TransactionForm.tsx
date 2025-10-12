import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const categories = {
  income: ["Gaji", "Bonus", "Investasi", "Lainnya"],
  expense: ["Makanan", "Transport", "Belanja", "Tagihan", "Hiburan", "Lainnya"],
};

interface TransactionFormProps {
  onSuccess: () => void;
}

export const TransactionForm = ({ onSuccess }: TransactionFormProps) => {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const notes = formData.get("notes") as string;
    const numericAmount = parseFormattedNumber(amount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        title,
        amount: numericAmount,
        type,
        category,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Transaksi berhasil ditambahkan!");
      e.currentTarget.reset();
      setAmount("");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Tambah Transaksi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className={type === "income" ? "bg-success hover:bg-success/90" : ""}
            >
              Pemasukan
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className={type === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Pengeluaran
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              name="title"
              placeholder="Contoh: Belanja bulanan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Jumlah</Label>
            <Input
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select name="category" required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories[type].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Tambahkan catatan..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
