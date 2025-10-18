import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { Heart, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [editTargetAmount, setEditTargetAmount] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<WishlistItem | null>(null);

  useEffect(() => {
    fetchWishlist();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items'
        },
        () => fetchWishlist()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleAddMoney = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;

    const amount = parseFormattedNumber(addAmount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create expense transaction
      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: user.id,
        title: `Menabung untuk ${selectedItem.title}`,
        amount,
        type: "expense",
        category: "Tabungan",
        notes: "Tabungan wishlist",
      });

      if (transactionError) throw transactionError;

      // Update wishlist item
      const newSavedAmount = selectedItem.saved_amount + amount;
      const { error: updateError } = await supabase
        .from("wishlist_items")
        .update({ saved_amount: newSavedAmount })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      toast.success("Berhasil menambah tabungan!");
      setAddMoneyOpen(false);
      setAddAmount("");
      setSelectedItem(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah tabungan");
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const priority = formData.get("priority") as string;
    const amount = parseFormattedNumber(editTargetAmount);

    try {
      const { error } = await supabase
        .from("wishlist_items")
        .update({
          title,
          target_amount: amount,
          priority,
        })
        .eq("id", editItem.id);

      if (error) throw error;

      toast.success("Item wishlist berhasil diupdate!");
      setEditOpen(false);
      setEditItem(null);
      setEditTargetAmount("");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengupdate item");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", deleteItem.id);

      if (error) throw error;

      toast.success("Item wishlist berhasil dihapus!");
      setDeleteOpen(false);
      setDeleteItem(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus item");
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className={`text-sm ${getPriorityColor(item.priority)}`}>
                        Prioritas: {item.priority === "high" ? "Tinggi" : item.priority === "medium" ? "Sedang" : "Rendah"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditItem(item);
                          setEditTargetAmount(formatNumber(item.target_amount.toString()));
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
                          setDeleteItem(item);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Target</p>
                    <p className="font-semibold text-warning">
                      {formatCurrency(item.target_amount)}
                    </p>
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
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      setSelectedItem(item);
                      setAddMoneyOpen(true);
                    }}
                    disabled={progress >= 100}
                  >
                    {progress >= 100 ? "Target Tercapai! 🎉" : "Tambah Tabungan"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tabungan</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Item</p>
                <p className="font-medium">{selectedItem.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Terkumpul: {formatCurrency(selectedItem.saved_amount)} / {formatCurrency(selectedItem.target_amount)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addAmount">Jumlah Tabungan</Label>
                <Input
                  id="addAmount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(formatNumber(e.target.value))}
                  placeholder="0"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Jumlah ini akan dipotong dari saldo Anda
                </p>
              </div>
              <Button type="submit" className="w-full">
                Simpan Tabungan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wishlist</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Nama Item</Label>
                <Input
                  id="editTitle"
                  name="title"
                  defaultValue={editItem.title}
                  placeholder="Contoh: Laptop baru"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTarget">Target Harga</Label>
                <Input
                  id="editTarget"
                  value={editTargetAmount}
                  onChange={(e) => setEditTargetAmount(formatNumber(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPriority">Prioritas</Label>
                <Select name="priority" defaultValue={editItem.priority} required>
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
                Simpan Perubahan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Wishlist</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus "{deleteItem?.title}"? Tindakan ini tidak dapat dibatalkan.
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
