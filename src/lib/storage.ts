const PREFIX = 'vuon-hoa-2010:';

/** Đọc từ localStorage; trình duyệt chặn bộ nhớ hoặc dữ liệu hỏng thì trả về giá trị mặc định. */
export function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* chế độ ẩn danh hoặc hết chỗ: bỏ qua, trang vẫn chạy */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* bỏ qua */
  }
}
