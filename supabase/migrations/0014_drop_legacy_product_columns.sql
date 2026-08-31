-- =====================================================================
-- Retire length, fabric and wash_care as columns
-- =====================================================================
-- Their values were copied into product_attribute_values by 0013, and as of
-- Stage 3 nothing reads them: the product page builds its spec table from
-- the attributes its category asks for, and the Material filter is one of
-- several generated from filterable attributes.
--
-- Run this only once the Stage 3 deploy is live. Until then the columns are
-- harmless — nothing writes them either — so there is no hurry, and leaving
-- them a while means a rollback does not need a restore.
--
-- Deliberately last, and deliberately separate. A drop is the one thing here
-- that cannot be undone by re-running a migration.

alter table products drop column if exists length;
alter table products drop column if exists fabric;
alter table products drop column if exists wash_care;
