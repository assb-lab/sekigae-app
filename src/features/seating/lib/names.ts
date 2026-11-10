const CJK = /[぀-ヿ㐀-鿿]/u;

/** 表示名: 日本語は姓、それ以外は最後の語 */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/u);
  if (parts.length < 2) return name;
  return CJK.test(name) ? parts[0]! : parts[parts.length - 1]!;
}
