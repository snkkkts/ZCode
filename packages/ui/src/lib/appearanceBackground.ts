import { MAX_BACKGROUND_BYTES } from "./appearanceSettings.js";

export async function readAppearanceBackground(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("type");
  if (file.size > MAX_BACKGROUND_BYTES) throw new Error("size");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("decode"));
    reader.onerror = () => reject(new Error("decode"));
    reader.readAsDataURL(file);
  });
  await decodeAppearanceBackground(data);
  return data;
}

export async function decodeAppearanceBackground(data: string): Promise<void> {
  const image = new Image();
  image.src = data;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      image.decode(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("decode")), 10_000);
      }),
    ]);
  } catch {
    throw new Error("decode");
  } finally {
    clearTimeout(timer);
  }
}
