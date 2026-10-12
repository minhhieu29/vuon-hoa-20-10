/** Link thiệp chung: bỏ tên và lời riêng của người đang xem, để người nhận tiếp theo có một tấm thiệp của riêng họ. */
export function giftLink(): string {
  return location.origin + location.pathname;
}

/** Gửi tặng tiếp: điện thoại mở bảng chia sẻ, máy tính chép link. Trả về lời nhắn để hiện ra (rỗng nếu không cần). */
export async function shareGift(): Promise<string> {
  const url = giftLink();
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Vườn Hoa 20.10', text: 'Gửi bạn một khu vườn nhỏ nhân ngày Phụ nữ Việt Nam 20/10.', url });
      return '';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return '';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'Đã chép link. Dán vào Zalo hay Messenger để gửi nhé.';
  } catch {
    return `Link để gửi: ${url}`;
  }
}
