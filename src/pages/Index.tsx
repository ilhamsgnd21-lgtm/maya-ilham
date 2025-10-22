import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/Dashboard";
import { TransactionForm } from "@/components/TransactionForm";
import { WishlistSection } from "@/components/WishlistSection";
import { SavingsSection } from "@/components/SavingsSection";
import { signOut } from "@/lib/supabase";
import { toast } from "sonner";
import { LogOut, Wallet, Pencil, History } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setFullName(data.full_name || "");
      setProfileName(data.full_name || "");
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Gagal keluar");
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileName })
      .eq("id", user.id);

    if (error) {
      toast.error("Gagal memperbarui profil");
    } else {
      setFullName(profileName);
      setProfileOpen(false);
      toast.success("Profil berhasil diperbarui");
    }
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
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {fullName ? (
                    <>
                      <span className="font-medium">{fullName}</span> ({user.email})
                    </>
                  ) : (
                    user.email
                  )}
                </p>
                <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setProfileName(fullName)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profil</DialogTitle>
                      <DialogDescription>
                        Ubah informasi profil Anda
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Nama Lengkap</Label>
                        <Input
                          id="profile-name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user.email} disabled />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setProfileOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleProfileUpdate}>
                        Simpan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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

        <div className="space-y-8">
          <TransactionForm onSuccess={() => {}} />
          
          <Link to="/transactions">
            <Button variant="outline" className="w-full" size="lg">
              <History className="w-5 h-5 mr-2" />
              Lihat Semua Riwayat Transaksi
            </Button>
          </Link>

          <SavingsSection />
          <WishlistSection />
        </div>
      </main>
    </div>
  );
};

export default Index;
