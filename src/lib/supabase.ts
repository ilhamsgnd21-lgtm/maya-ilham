import { supabase } from "@/integrations/supabase/client";

export const signUp = async (email: string, password: string, fullName: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });
  
  return { error };
};

export const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
