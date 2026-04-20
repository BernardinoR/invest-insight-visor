
ALTER TABLE public.account_split_configs
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;

ALTER TABLE public."ConsolidadoPerformance"
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;

ALTER TABLE public."DadosPerformance"
ADD COLUMN is_outra_pessoa boolean NOT NULL DEFAULT false;
