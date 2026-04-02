import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active monthly templates
    const templates = await base44.asServiceRole.entities.ReportTemplate.filter({
      frequency: 'monthly',
      is_active: true,
    }, '-created_date', 200);

    let successCount = 0;
    let errorCount = 0;

    for (const template of templates) {
      try {
        await base44.functions.invoke('generateAndSendReport', { templateId: template.id });
        successCount++;
      } catch (error) {
        console.error(`Gabim në template ${template.id}:`, error.message);
        errorCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Dërgimi i raporteve mujore u përfundua: ${successCount} me sukses, ${errorCount} me gabim`,
      successCount,
      errorCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});