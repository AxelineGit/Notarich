import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const includedMenus = formData.get("includedMenus") as string;
    const discountId = formData.get("discountId") as string;
    const modifierIds = formData.get("modifierIds") as string;
    const imageFile = formData.get("image") as File;

    if (!name || !price) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Simpan file ke Vercel Blob
    let imagePath = "";
    if (imageFile) {
      const blob = await put(imageFile.name, imageFile, {
        access: "public",
        addRandomSuffix: true,
      });
      imagePath = blob.url;
    }

    //cari HPP
    let totalHargaBakul = 0;
    if (includedMenus) {
      const parsed = JSON.parse(includedMenus); // array of { menuId, amount }

      for (const row of parsed) {
        const [rows] = await db.execute(
          `SELECT hargaBakul FROM menu WHERE id = ?`,
          [row.menuId]
        );

        if ((rows as any[]).length === 0) continue;

        const harga = (rows as any[])[0].hargaBakul || 0;
        totalHargaBakul += harga * row.amount;
      }
    }

    // Cek nama yang sama
    const [existing] = await db.query(
      'SELECT id FROM menu WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Menu name already exists' }, { status: 400 });
    }

    // Simpan bundle ke database
    const [result] = await db.execute(
      `INSERT INTO menu (name, description, image, price, category, Status, type, hargaBakul)
       VALUES (?, ?, ?, ?, 'bundle', 'tersedia', 'BUNDLE', ?)`,
      [name, description || null, imagePath, parseFloat(price), totalHargaBakul]
    );

    const newBundleId = (result as any).insertId;

    if (includedMenus) {
      const parsed = JSON.parse(includedMenus);
      for (const row of parsed) {
        await db.execute(
          `INSERT INTO menuComposition (bundleId, menuId, amount) VALUES (?, ?, ?)`,
          [newBundleId, row.menuId, row.amount]
        );
      }
    }

    if (discountId && discountId.trim() !== "") {
      await db.execute(
        `INSERT INTO menuDiscount (menuId, discountId) VALUES (?, ?)`,
        [newBundleId, parseInt(discountId)]
      );
    }

    if (modifierIds) {
      const parsed = JSON.parse(modifierIds);
      for (const modId of parsed) {
        await db.execute(
          `INSERT INTO menuModifier (menuId, modifierId) VALUES (?, ?)`,
          [newBundleId, modId]
        );
      }
    }

    return NextResponse.json({
      message: "Bundle created successfully",
      bundleId: newBundleId,
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating bundle (App Router):", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}