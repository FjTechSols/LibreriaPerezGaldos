// Supabase Edge Function: trigger-ftps-sync
// Triggers GitHub Actions workflow for FTPS upload directly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // GitHub API configuration
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_REPO_OWNER = 'FjTechSols';
    const GITHUB_REPO_NAME = 'LibreriaPerezGaldos';
    const WORKFLOW_ID = 'abebooks-sync.yml';

    // Parse body for incoming sync mode request
    let isPurge = false;
    let mode = 'upload';
    try {
      if (req.body) {
         const bodyJson = await req.json();
         if (bodyJson?.mode === 'empty' || bodyJson?.mode === 'purge' || bodyJson?.mode === 'upload') {
             mode = bodyJson.mode;
         }
         if (bodyJson && bodyJson.purge) {
             isPurge = true;
             mode = 'empty';
         }
      }
    } catch (e) {
      console.warn("Could not parse request body for sync mode", e);
    }

    if (!GITHUB_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not configured' }), 
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Trigger workflow dispatch
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // Branch to run workflow on
          inputs: {
            purge: String(isPurge),
            sync_mode: mode
          }
        }),
      }
    );

    if (response.status === 204) {
      // Success - workflow triggered
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Workflow triggered successfully',
          status: `Sincronizacion FTPS ${mode === 'empty' ? '(VACIADO TOTAL) ' : mode === 'purge' ? '(PURGA SEGURA) ' : ''}iniciada. El proceso tardara unos minutos.`
        }), 
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else {
      const errorData = await response.text();
      console.error('GitHub API error:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to trigger workflow',
          details: errorData,
          status: response.status
        }), 
        {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
