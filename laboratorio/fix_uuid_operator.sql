-- Allow uuid = text comparison
CREATE OR REPLACE FUNCTION public.uuid_eq_text(uuid, text) RETURNS boolean
LANGUAGE SQL IMMUTABLE
AS $$ SELECT $1 = $2::uuid $$;

CREATE OPERATOR = (
    LEFTARG = uuid,
    RIGHTARG = text,
    PROCEDURE = public.uuid_eq_text,
    COMMUTATOR = =
);

-- Allow text = uuid comparison
CREATE OR REPLACE FUNCTION public.text_eq_uuid(text, uuid) RETURNS boolean
LANGUAGE SQL IMMUTABLE
AS $$ SELECT $1::uuid = $2 $$;

CREATE OPERATOR = (
    LEFTARG = text,
    RIGHTARG = uuid,
    PROCEDURE = public.text_eq_uuid,
    COMMUTATOR = =
);
