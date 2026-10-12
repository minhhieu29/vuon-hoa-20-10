/**
 * Người nhận, đọc từ link. Không có gì thì thiệp gửi chung cho mọi người phụ nữ và gọi người đọc là "bạn".
 *   ?ten=Lan&goi=chi        → "Gửi chị Lan", mọi câu gọi "chị"
 *   ?goi=me                 → "Gửi mẹ"
 *   &loi=Cảm ơn chị...      → một dòng riêng ở đầu lá thư
 *   &tu=Minh                → ký tên cuối thư
 * Phần sau dấu ? chỉ là chữ: React tự thoát ký tự, không có gì được chèn thành HTML.
 */
const PRONOUNS: Record<string, string> = { ban: 'bạn', chi: 'chị', em: 'em', co: 'cô', me: 'mẹ', ba: 'bà', di: 'dì', vo: 'vợ' };

function param(q: URLSearchParams, key: string, max: number): string {
  return (q.get(key) ?? '').replace(/[\p{Cc}<>]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function read() {
  let q: URLSearchParams;
  try { q = new URLSearchParams(location.search); } catch { q = new URLSearchParams(); }
  const g = param(q, 'goi', 12).toLowerCase();
  const you = PRONOUNS[g] ?? (Object.values(PRONOUNS).includes(g) ? g : 'bạn');
  const name = param(q, 'ten', 30);
  return {
    /** cách gọi trong câu: bạn, chị, em, mẹ... */
    you,
    name,
    /** cách gọi ở tiêu đề và lời mở thư: "chị Lan", "mẹ", "Lan", "bạn" */
    addr: you === 'bạn' ? name || 'bạn' : name ? `${you} ${name}` : you,
    /** link có gọi tên hoặc gọi riêng (không phải thiệp chung) */
    named: Boolean(name) || you !== 'bạn',
    note: param(q, 'loi', 240),
    from: param(q, 'tu', 40),
  };
}

export const R = read();

/** Viết hoa chữ cái đầu (đầu câu). */
export const cap = (s: string): string => s.charAt(0).toLocaleUpperCase('vi') + s.slice(1);
