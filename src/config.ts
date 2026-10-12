import { R, cap } from './recipient';

/**
 * Mọi nội dung của món quà nằm ở file này: lời đề gửi, lời chúc, lá thư.
 * Đổi ở đây là cả trang đổi theo (kể cả chữ hạt sáng và ảnh "Lưu thiệp").
 * Cách gọi người đọc (bạn, chị, mẹ...) lấy từ link, xem src/recipient.ts.
 * Giọng văn: ghi nhận công sức và chúc được nghỉ ngơi, tránh khen theo khuôn mẫu ("phái đẹp", "dịu dàng", "luôn rạng rỡ").
 */
const you = R.you, You = cap(R.you);

/** Lời đề gửi ở màn mở quà và thanh trên cùng. */
export const TO = R.named ? `Gửi ${R.addr}` : 'Gửi những người phụ nữ thân yêu';
/** Chữ ký cuối thư; link có &tu=... thì ký theo tên đó. */
export const SIGNATURE = R.from || 'Với tất cả sự trân trọng';
/** Link để người nhận nhắn lại (Zalo, Messenger...), ví dụ 'https://zalo.me/0901234567'. Để trống thì ẩn nút. */
export const REPLY_URL = '';
export const DATE_TEXT = '20.10.2026';
/** Chữ hạt sáng trên trang đầu: LABEL_A và LABEL_B đổi qua lại. */
export const LABEL_A = '20/10';
export const LABEL_B = R.name || (you === 'mẹ' || you === 'bà' ? You : 'Cảm ơn');

export const COPY = {
  you, You, addr: R.addr,
  gate: `Có một món quà nhỏ đang chờ ${you} mở`,
  heroLead: `Mỗi bông hoa là một điều ${you} đã làm mà ít ai kể tên. Cứ thong thả, hoa sẽ tự nở kín vườn. Chạm vào một bông để thấy nó rung rinh.`,
  heroFull: `Khu vườn đã nở kín, như những điều ${you} lặng lẽ vun trồng mỗi ngày. Chạm vào một bông để thấy nó rung rinh.`,
};

export interface Wish { title: string; text: string; color: string; center?: string }

export const WISHES: Wish[] = [
  { title: 'Sức khỏe', text: 'Thật nhiều sức khỏe, ngủ sâu giấc, sáng dậy thấy người nhẹ tênh.', color: '#FF7FAE' },
  { title: 'Được nghỉ ngơi', text: 'Được nghỉ mà không thấy có lỗi. Việc gì chưa xong, cứ để ngày mai lo.', color: '#C69CFF' },
  { title: 'Được ghi nhận', text: `Những việc ${you} lặng lẽ làm mỗi ngày đều có người nhìn thấy, và biết ơn.`, color: '#FFD36E', center: '#FF8A80' },
  { title: 'Thời gian cho mình', text: `Có những giờ chỉ dành riêng cho ${you}: một cuốn sách, một buổi cà phê, một sở thích còn dang dở.`, color: '#8FD3FF' },
  { title: 'Niềm vui', text: `Ngày nào cũng có ít nhất một chuyện khiến ${you} bật cười thật to.`, color: '#FF9E80' },
  { title: 'Theo cách của mình', text: `Mọi dự định đều có cơ hội thành hình, theo đúng cách ${you} muốn.`, color: '#6EE7C0' },
];

export const LETTER = {
  greeting: `Gửi ${R.addr} thân mến,`,
  /** dòng riêng của người gửi (từ link &loi=...), hiện ngay sau lời mở thư */
  note: R.note,
  paragraphs: [
    `Cảm ơn ${you} vì rất nhiều điều: những việc lớn ai cũng thấy, và cả những việc nhỏ lặng lẽ mỗi ngày mà hiếm khi có người nói lời cảm ơn.`,
    `Nhân ngày Phụ nữ Việt Nam 20/10, chúc ${you} thật nhiều sức khỏe, có thời gian cho chính mình và được nghỉ ngơi mà không thấy có lỗi. ${You} không cần lúc nào cũng phải mạnh mẽ hay hoàn hảo, chỉ cần là chính ${you} là đủ.`,
    `Mong khu vườn nhỏ này khiến ${you} mỉm cười.`,
  ],
  signature: SIGNATURE,
};
