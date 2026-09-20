create extension if not exists pg_cron; select cron.schedule('portal-push-dispatch','*/2 * * * *',$job$select public.dispatch_portal_push();$job$);
