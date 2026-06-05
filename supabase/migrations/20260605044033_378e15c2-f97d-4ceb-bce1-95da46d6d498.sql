ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS credits integer;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS grade numeric(3,1);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS weight numeric(5,2);