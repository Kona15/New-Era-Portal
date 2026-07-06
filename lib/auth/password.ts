import { hash, verify } from "@node-rs/argon2";

const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return verify(hashed, password, OPTIONS);
}
