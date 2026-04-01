import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process invoice creation events
    if (event.type !== 'create' || event.entity_name !== 'Invoice') {
      return Response.json({ skipped: true });
    }

    const invoice = data;
    if (!invoice.items || invoice.items.length === 0) {
      return Response.json({ updated: 0 });
    }

    let updatedCount = 0;

    // Process each line item in the invoice
    for (const item of invoice.items) {
      try {
        // Find inventory by product name
        const inventoryList = await base44.asServiceRole.entities.Inventory.filter(
          { product_name: item.name }
        );

        if (inventoryList.length > 0) {
          const inv = inventoryList[0];
          const newQuantity = Math.max(0, inv.quantity - (item.quantity || 0));

          // Update inventory
          await base44.asServiceRole.entities.Inventory.update(inv.id, {
            quantity: newQuantity,
          });

          updatedCount++;
        }
      } catch (err) {
        console.log(`Error updating inventory for ${item.name}:`, err.message);
      }
    }

    return Response.json({ updated: updatedCount, totalItems: invoice.items.length });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});