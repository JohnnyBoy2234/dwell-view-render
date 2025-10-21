import {serve} from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";



serve(async (res: Request) => {
    try{
        const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const {to, subject, html} = await res.json();

        const data = await resend.emails.send({
        
            from: `SwiftRent <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@swiftrent.co"}>`,
            to: [to],
            subject: subject,
            html: html
            
    });

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
            status: 200,

        });
    } catch (error) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});