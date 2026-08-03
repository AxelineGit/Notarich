import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const [menus] = await db.query(`SELECT * FROM menu WHERE type = 'NORMAL'`);

    const [ingredients] = await db.query(`
      SELECT mi.menuId, mi.amount, i.*
      FROM menuIngredient mi
      JOIN ingredient i ON mi.ingredientId = i.id
    `);

    const [discounts] = await db.query(`
      SELECT md.menuId, d.*
      FROM menuDiscount md
      JOIN discount d ON md.discountId = d.id
      WHERE d.isActive = true
    `);

    const [modifiers] = await db.query(`
      SELECT mm.menuId, m.*
      FROM menuModifier mm
      JOIN modifier m ON mm.modifierId = m.id
    `);

    const ingredientMap = new Map<number, any[]>();
    const discountMap = new Map<number, any[]>();
    const modifierMap = new Map<number, any[]>();

    for (const row of ingredients as any[]) {
      const menuId = row.menuId;
      if (!ingredientMap.has(menuId)) ingredientMap.set(menuId, []);
      ingredientMap.get(menuId)!.push({
        amount: row.amount,
        unit: row.unit,
        finishedUnit: row.finishedUnit,
        ingredient: {
          id: row.id,
          name: row.name,
          price: Number(row.price),
          batchYield: Number(row.batchYield),
          type: row.type,
        },
      });
    }

    for (const row of discounts as any[]) {
      const menuId = row.menuId;
      if (!discountMap.has(menuId)) discountMap.set(menuId, []);
      discountMap.get(menuId)!.push({
        discount: {
          id: row.id, name: row.name, type: row.type,
          scope: row.scope, value: row.value, isActive: row.isActive,
        },
      });
    }

    for (const row of modifiers as any[]) {
      const menuId = row.menuId;
      if (!modifierMap.has(menuId)) modifierMap.set(menuId, []);
      modifierMap.get(menuId)!.push({
        modifier: { id: row.id, name: row.name, type: row.type, options: row.options },
      });
    }

    // Calculate costs in plain JS — no DB call in this step at all
    const updatedMenus = (menus as any[]).map((menu) => {
      const menuId = menu.id;
      const menuIngredients = ingredientMap.get(menuId) || [];

      const totalCost = menuIngredients.reduce((acc, item) => {
        const amount = Number(item.amount) || 0;
        const price = Number(item.ingredient.price) || 0;
        return acc + amount * price;
      }, 0);

      return {
        ...menu,
        hargaBakul: totalCost,
        ingredients: menuIngredients,
        discounts: discountMap.get(menuId) || [],
        modifiers: modifierMap.get(menuId) || [],
      };
    });

    // Single batched UPDATE for all menus at once — one connection, one query
    if (updatedMenus.length > 0) {
      const caseClauses = updatedMenus.map(() => `WHEN ? THEN ?`).join(' ');
      const caseParams = updatedMenus.flatMap((m) => [m.id, m.hargaBakul]);
      const ids = updatedMenus.map((m) => m.id);

      await db.query(
        `UPDATE menu SET hargaBakul = CASE id ${caseClauses} END WHERE id IN (?)`,
        [...caseParams, ids]
      );
    }

    return NextResponse.json(updatedMenus);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}