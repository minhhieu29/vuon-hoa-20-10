# Vườn Hoa 20.10

Trang web chúc mừng 20/10, viết bằng **React + TypeScript + Vite**. Có 4 trang: Vườn hoa · Lời chúc · Bó hoa · Lá thư.

- Thiệp gửi chung cho mọi người phụ nữ, và có thể **gọi đúng tên từng người** chỉ bằng cách thêm vài chữ vào link (xem bên dưới).
- Khu vườn tự nở dần cho tới khi kín 120 bông, có sen, cúc họa mi và lá vàng mùa thu bay ngang. Khi có nhạc, hoa nở và khẽ rung **theo từng nốt giai điệu** (nốt trầm bên trái, nốt cao bên phải). Hoa không bao giờ mất, kể cả khi tải lại trang.
- Màn mở quà có lựa chọn "Mở trong im lặng" cho người đang ở văn phòng hay chỗ đông người. Trên thiệp không có nút bật/tắt nhạc nào.
- Lá thư hiện ra như đang được viết tay; lúc đọc thư, vườn phía sau tối lại và nhạc chỉ còn giai điệu. Các nút chỉ hiện khi thư đã viết xong.
- Không có bộ đếm, thanh tiến độ hay dấu "đã xong": người nhận không phải làm cho đủ gì cả, muốn đọc thư ngay cũng được.
- "Lưu thiệp về máy" tạo ảnh dọc 1080×1920, đăng story hay đặt hình nền đều vừa. "Gửi tặng một người phụ nữ khác" gửi link thiệp chung (không kèm tên người đang xem).

## Chạy thử

```bash
npm install
npm run dev
```

Mở địa chỉ mà terminal in ra (thường là http://localhost:5173).

## Gửi cho từng người: gọi tên qua link

Thêm vào sau địa chỉ trang. Dấu cách viết thành `+`.

| Thêm vào link | Tác dụng |
| --- | --- |
| `?goi=chi` | gọi "chị" thay cho "bạn". Có sẵn: `ban`, `chi`, `em`, `co`, `me`, `ba` (bà), `di` (dì), `vo` (vợ) |
| `&ten=Lan` | "Gửi chị Lan", tiêu đề "Một khu vườn nở để cảm ơn chị Lan", chữ hạt sáng thành "Lan" |
| `&loi=Cảm+ơn+chị+đã+kèm+em+suốt+năm+đầu+đi+làm.` | một dòng riêng của anh, hiện ngay sau lời mở thư (tối đa 240 chữ cái) |
| `&tu=Minh` | ký tên cuối thư thay cho "Với tất cả sự trân trọng" |

Ví dụ:

- `https://ten-trang/?goi=me`: thiệp gửi mẹ.
- `https://ten-trang/?goi=chi&ten=Lan&tu=Minh&loi=Cảm+ơn+chị+đã+kèm+em+suốt+năm+đầu+đi+làm.`
- `https://ten-trang/`: thiệp chung "Gửi những người phụ nữ thân yêu", gọi người đọc là "bạn".

Các câu trong thiệp không dùng "tôi/anh/em" cho người gửi, nên cách gọi nào cũng đọc xuôi.

## Sửa nội dung

| Muốn đổi | Sửa ở |
| --- | --- |
| Lời đề gửi, chữ ký mặc định, 6 lời chúc, lá thư | `src/config.ts` |
| Nút "Nhắn lời cảm ơn" (link Zalo/Messenger của anh) | `src/config.ts` (`REPLY_URL`, để trống thì ẩn nút) |
| Các cách gọi (chị, em, mẹ...) | `src/recipient.ts` |
| Tên và ý nghĩa 6 loài hoa trong bó | `src/bouquet.ts` (mảng `BOUQUET`) |
| Số bông tối đa của vườn | `src/garden/plan.ts` (`LAYER_CAP`) |
| Màu chung, phông chữ | `src/styles/global.css` (`:root`) và `src/garden/palette.ts` |

Giọng văn hiện tại cố ý **ghi nhận công sức và chúc được nghỉ ngơi**, tránh khen theo khuôn mẫu ("phái đẹp", "dịu dàng", "luôn rạng rỡ"). Nếu viết thêm, nên giữ hướng đó.

## Đưa lên mạng để gửi link

Nên build kèm địa chỉ trang, để khi dán link vào Zalo, Messenger hay Facebook thì hiện ảnh xem trước (`public/og-image.png`). Zalo và Facebook cần địa chỉ đầy đủ mới lấy được ảnh.

PowerShell:

```powershell
$env:SITE_URL='https://ten-trang.netlify.app/'; npm run build
```

Git Bash / macOS / Linux:

```bash
SITE_URL=https://ten-trang.netlify.app/ npm run build
```

Chưa biết địa chỉ thì cứ `npm run build`, đưa lên mạng một lần để lấy địa chỉ, rồi build lại với `SITE_URL` và đưa lên lần nữa.

Lệnh này tạo thư mục `dist/`. Thư mục `dist` không mở trực tiếp bằng file được, cần đưa lên một hosting tĩnh, ví dụ:

- **GitHub Pages** (đang dùng): mỗi lần đẩy lên nhánh `main`, `.github/workflows/deploy.yml` tự build (đã kèm `SITE_URL`) và đăng lên `https://<tài-khoản>.github.io/<tên-repo>/`. Không cần build tay.
- **Netlify Drop**: vào app.netlify.com/drop rồi kéo thả thư mục `dist`.
- **Vercel**: trang dùng đường dẫn dạng `#/loi-chuc` và `base: './'`, nên chạy được cả trong thư mục con, không cần cấu hình chuyển hướng.

Xem trước bản build: `npm run preview`.

### Ảnh xem trước khi gửi link

Nguồn của ảnh nằm ở `scripts/og-image.html`. Sửa chữ ở đó rồi chụp lại bằng Chrome:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=3000 --screenshot="$PWD/public/og-image.png" "file:///$PWD/scripts/og-image.html"
```

Ảnh xem trước luôn là bản chung (Zalo không đọc được phần `?ten=...` của từng link).

## Trước khi gửi: thử với người thật

Mọi lựa chọn về lời văn và hình ảnh ở đây vẫn là suy đoán. Cách rẻ nhất để biết thật: gửi link cho khoảng 5 phụ nữ ở các độ tuổi khác nhau (khoảng 20, 30, 45, 55+), mở trên điện thoại của họ, rồi hỏi 3 câu:

1. Đến chỗ nào thì muốn thoát ra?
2. Câu nào làm cười, câu nào thấy gượng hay khó chịu?
3. Có muốn gửi cho ai khác không?

Sửa theo những gì lặp lại ở từ hai người trở lên.

## Cấu trúc

```
src/
  config.ts            nội dung của món quà (lời chúc, lá thư, chữ ký)
  recipient.ts         đọc tên và cách gọi từ link
  bouquet.ts           6 loài hoa và cách xếp bó
  router.ts            4 trang và địa chỉ #/...
  App.tsx              khung chính: chuyển trang, mở quà, phím tắt, vuốt
  pages/               mỗi trang một component (+ cardImage.ts: lưu thiệp thành ảnh dọc)
  components/          thanh trên, thanh điều hướng, màn mở quà, lớp vườn
  state/               tiến trình (lưu localStorage) và điều hướng
  garden/              engine canvas của khu vườn (hoa sen, lá thu, hoa nở theo nhạc)
  fx/                  hiệu ứng chuyển trang và cánh hoa rơi
  lib/                 toán, nhạc (Web Audio), lưu trữ, chia sẻ link
scripts/og-image.html  nguồn ảnh xem trước khi gửi link
public/og-image.png    ảnh xem trước 1200×630
```

## Về hiệu năng

Engine khu vườn (`src/garden/engine.ts`) làm những việc sau để không bị giật khi vườn đầy:

- Bông đã nở xong được vẽ sẵn thành ảnh (sprite). Mỗi khung hình chỉ vẽ lại ảnh, không vẽ lại từng cánh.
- 64 bông ở lớp xa được "nướng" luôn vào ảnh nền, nên không tốn gì mỗi khung.
- Thân và lá của cả một lớp được tô một lần.
- Ở các trang phụ, vườn chỉ vẽ 30 khung/giây. Khi tab bị ẩn thì dừng hẳn.
- Nếu máy yếu, engine tự giảm độ phân giải canvas và bớt hiệu ứng.
- Không dùng `backdrop-filter` hay `filter: drop-shadow` trên các phần tử đè lên canvas.
- Tôn trọng cài đặt "giảm chuyển động" của hệ điều hành.
