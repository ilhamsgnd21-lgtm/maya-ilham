import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/Dashboard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { WishlistSection } from "@/components/WishlistSection";
import { signOut } from "@/lib/supabase";
import { toast } from "sonner";
import { LogOut, Wallet } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Gagal keluar");
    }
  };

  const handleTransactionSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DompetKu
              </h1>
              <p className="text-sm text-muted-foreground">
                Selamat datang, {user.email}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Dashboard />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <TransactionForm onSuccess={handleTransactionSuccess} />
            <WishlistSection />
          </div>
          <div>
            <TransactionList refresh={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
