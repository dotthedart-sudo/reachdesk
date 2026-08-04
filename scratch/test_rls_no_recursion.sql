-- Reproduce former recursion path under authenticated role if possible.
-- Pick a real user with leads/folders.
DO $$
DECLARE
  v_uid uuid;
  v_folders int;
  v_shares int;
  v_leads int;
BEGIN
  SELECT id INTO v_uid
  FROM user_profiles
  WHERE email = 'esemdot@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    SELECT id INTO v_uid FROM user_profiles LIMIT 1;
  END IF;

  -- Simulate JWT for RLS
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);

  -- These three queries previously could recurse via folders <-> folder_shares
  SELECT count(*) INTO v_folders FROM folders;
  SELECT count(*) INTO v_shares FROM folder_shares;
  SELECT count(*) INTO v_leads FROM leads;

  RAISE NOTICE 'uid=% folders=% shares=% leads=%', v_uid, v_folders, v_shares, v_leads;
END $$;
