import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey);

async function seed() {
  console.log("🌱 Seeding database...");

  const defaultPassword = process.env.DEFAULT_MEMBER_PASSWORD || "NewEra2026!";
  const passwordHash = await hash(defaultPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  // Create admin account (no-op if phone already exists)
  const { data: existingAdmin } = await supabase
    .from("members")
    .select("id")
    .eq("phone", "08000000000")
    .maybeSingle();

  if (!existingAdmin) {
    const { error } = await supabase.from("members").insert({
      full_name: "System Administrator",
      phone: "08000000000",
      password_hash: passwordHash,
      role: "admin",
      status: "active",
      must_change_password: false,
    });

    if (error) throw error;
    console.log("✅ Admin created: phone=08000000000, password=" + defaultPassword);
  } else {
    console.log("ℹ️  Admin already exists");
  }

  // Create current financial year (no-op if it already exists)
  const currentYear = new Date().getFullYear();
  const { data: existingYear } = await supabase
    .from("financial_years")
    .select("id")
    .eq("year", currentYear)
    .maybeSingle();

  if (!existingYear) {
    const { error } = await supabase.from("financial_years").insert({
      year: currentYear,
      label: `${currentYear} Financial Year`,
      is_active: true,
    });
    if (error) throw error;
    console.log(`✅ Financial year ${currentYear} created`);
  } else {
    console.log(`ℹ️  Financial year ${currentYear} already exists`);
  }

  console.log("🎉 Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
