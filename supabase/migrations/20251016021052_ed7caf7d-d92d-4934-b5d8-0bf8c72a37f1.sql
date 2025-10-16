-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_goals;