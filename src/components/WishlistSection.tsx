import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { Heart, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  priority: string;
}

export const WishlistSection = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState("");

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const priority = formData.get("priority") as string;
    const amount = parseFormattedNumber(targetAmount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("wishlist_items").insert({
        user_id: user.id,
        title,
        target_amount: amount,
        priority,
      });

      if (error) throw error;

      toast.success("Item wishlist berhasil ditambahkan!");
      setOpen(false);
      setTargetAmount("");
      fetchWishlist();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan item");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Dompet Wishlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-warning" />
          Dompet Wishlist
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-warning">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Wishlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nama Item</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Contoh: Laptop baru"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target Harga</Label>
                <Input
                  id="target"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(formatNumber(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas</Label>
                <Select name="priority" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Belum ada item wishlist
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const progress = (item.saved_amount / item.target_amount) * 100;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-border/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className={`text-sm ${getPriorityColor(item.priority)}`}>
                        Prioritas: {item.priority === "high" ? "Tinggi" : item.priority === "medium" ? "Sedang" : "Rendah"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="font-semibold text-warning">
                        {formatCurrency(item.target_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terkumpul</span>
                      <span className="font-medium">
                        {formatCurrency(item.saved_amount)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {progress.toFixed(0)}% tercapai
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
