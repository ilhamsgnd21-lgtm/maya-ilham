import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/format";
import { PiggyBank, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
}

export const SavingsSection = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState("");
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [addAmount, setAddAmount] = useState("");

  useEffect(() => {
    fetchGoals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('savings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'savings_goals'
        },
        () => fetchGoals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const deadline = formData.get("deadline") as string;
    const amount = parseFormattedNumber(targetAmount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        title,
        target_amount: amount,
        deadline: deadline || null,
      });

      if (error) throw error;

      toast.success("Target tabungan berhasil ditambahkan!");
      setOpen(false);
      setTargetAmount("");
      fetchGoals();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan target tabungan");
    }
  };

  const handleAddMoney = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGoal) return;

    const amount = parseFormattedNumber(addAmount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create expense transaction
      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: user.id,
        title: `Menabung untuk ${selectedGoal.title}`,
        amount,
        type: "expense",
        category: "Tabungan",
        notes: "Tabungan goal",
      });

      if (transactionError) throw transactionError;

      // Update savings goal
      const newCurrentAmount = selectedGoal.current_amount + amount;
      const { error: updateError } = await supabase
        .from("savings_goals")
        .update({ current_amount: newCurrentAmount })
        .eq("id", selectedGoal.id);

      if (updateError) throw updateError;

      toast.success("Berhasil menambah tabungan!");
      setAddMoneyOpen(false);
      setAddAmount("");
      setSelectedGoal(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menambah tabungan");
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>Target Tabungan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
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
          <PiggyBank className="w-5 h-5 text-success" />
          Target Tabungan
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-success">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Target Tabungan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nama Target</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Contoh: Dana Darurat"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target Jumlah</Label>
                <Input
                  id="target"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(formatNumber(e.target.value))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Opsional)</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                />
              </div>
              <Button type="submit" className="w-full">
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Belum ada target tabungan
          </p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-lg border border-border/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{goal.title}</h4>
                      {goal.deadline && (
                        <p className="text-sm text-muted-foreground">
                          Deadline: {new Date(goal.deadline).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="font-semibold text-success">
                        {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terkumpul</span>
                      <span className="font-medium">
                        {formatCurrency(goal.current_amount)}
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
                      setSelectedGoal(goal);
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
          {selectedGoal && (
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-medium">{selectedGoal.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Terkumpul: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}
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
    </Card>
  );
};
