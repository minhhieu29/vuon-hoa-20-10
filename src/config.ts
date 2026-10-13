import { R, cap } from './recipient';
import { coarse } from './lib/env';
import type { FlowerKey } from './bouquet';

/**
 * Mọi nội dung của món quà nằm ở file này: lời đề gửi, lời chúc, lá thư.
 * Đổi ở đây là cả trang đổi theo (kể cả chữ hạt sáng).
 * Cách gọi người đọc (bạn, chị, mẹ...) lấy từ link, xem src/recipient.ts.
 * Giọng văn: ghi nhận công sức và chúc được nghỉ ngơi, tránh khen theo khuôn mẫu ("phái đẹp", "dịu dàng", "luôn rạng rỡ").
 */
const you = R.you, You = cap(R.you);
/** điện thoại thì "chạm", máy tính thì "bấm" */
const Tap = coarse ? 'Chạm' : 'Bấm';

/** Lời đề gửi ở màn mở quà và thanh trên cùng. Thiệp chung thì không có dòng này. */
export const TO = R.named ? `Gửi ${R.addr}` : '';
/** Chữ ký cuối thư; link có &tu=... thì ký theo tên đó. */
export const SIGNATURE = R.from || 'Với tất cả sự trân trọng';
export const DATE_TEXT = '20.10.2026';
/** Chữ hạt sáng trên trang đầu: LABEL_A và LABEL_B đổi qua lại. */
export const LABEL_A = '20/10';
export const LABEL_B = R.name || (you === 'mẹ' || you === 'bà' ? You : 'Cảm ơn');

const NUM = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
/** Số viết bằng chữ cho câu văn: 6 → "sáu". */
export const say = (n: number): string => NUM[n] ?? String(n);

export const COPY = {
  you, You, addr: R.addr,
  gate: `Có một món quà nhỏ đang chờ ${you} mở`,
  heroLead: `Mỗi bông hoa là một điều ${you} đã làm mà ít ai kể tên. Cứ thong thả, hoa sẽ tự nở kín vườn. ${Tap} vào một bông để thấy nó rung rinh.`,
  heroFull: `Khu vườn đã nở kín, như những điều ${you} lặng lẽ vun trồng mỗi ngày. ${Tap} vào một bông để thấy nó rung rinh.`,
};

/**
 * Mười lời chúc cho mỗi loài hoa, theo đúng ý nghĩa của loài đó (xem src/bouquet.ts).
 * Mỗi bông người xem chọn mang theo một lời rút ngẫu nhiên, hai bông cùng loài không trùng lời.
 * Các câu không dùng "tôi/anh/em" cho người gửi, nên cách gọi nào cũng đọc xuôi.
 */
export const WISHES: Record<FlowerKey, string[]> = {
  /* lòng biết ơn */
  rose: [
    `Cảm ơn ${you} vì bao việc không tên: chẳng ai ghi vào sổ, nhưng thiếu đi là ai cũng thấy.`,
    `Mong những gì ${you} đã cho đi, từ sự kiên nhẫn, lời hỏi han đến bàn tay đỡ lúc khó, đều quay về với ${you} gấp đôi.`,
    `Chúc ${you} được nghe hai chữ “cảm ơn” thật nhiều, không phải vì phép lịch sự, mà vì có người thật lòng nhận ra công sức của ${you}.`,
    `Có những ngày ${you} gánh nhiều hơn phần mình mà không ai hay. Hôm nay xin được nói: có người thấy hết, và biết ơn lắm.`,
    `Chúc ${you} một năm được đối xử tử tế, đúng như cách ${you} vẫn tử tế với mọi người.`,
    `Mong ${you} luôn có người hỏi “${You} có mệt không?” và kiên nhẫn đợi nghe câu trả lời thật.`,
    `Chúc những nỗ lực ${you} bỏ ra năm nay được đền đáp xứng đáng: bằng sự ghi nhận, bằng cơ hội, và cả bằng tiền nữa.`,
    `Cảm ơn ${you} vì đã luôn ở đó, kể cả những lúc chính ${you} cũng mệt nhoài.`,
    `Mong ${you} biết rằng chỉ cần có ${you} ở đó, ngày của nhiều người đã nhẹ nhõm hơn hẳn.`,
    `Chúc ${you} nhận lại nhiều yêu thương hơn số lần ${you} phải nói “không sao đâu”.`,
  ],
  /* thanh khiết, bền bỉ vươn lên */
  lotus: [
    `Như sen vẫn thơm dù mọc giữa bùn, mong những ngày vất vả chỉ làm ${you} vững vàng hơn, chứ không làm ${you} mỏi mòn.`,
    `Chúc ${you} đủ bền bỉ để đi tiếp, và đủ khôn ngoan để biết lúc nào nên dừng lại nghỉ một chút.`,
    `Mong ${you} không bao giờ phải thu mình nhỏ lại cho vừa lòng ai. Cứ vươn lên, cao như ${you} muốn.`,
    `Những ngày khó rồi sẽ qua. Chúc ${you} khi nhìn lại, thấy mình đã đi được một quãng xa đến bất ngờ.`,
    `Chúc ${you} giữ được sự trong trẻo của mình, dù cuộc sống có lúc chẳng mấy nhẹ nhàng.`,
    `Mong những gì ${you} đang âm thầm vun đắp, đến một ngày sẽ nở thành hoa, đúng mùa của nó.`,
    `Chúc ${you} được học điều mới, thử điều khó, và không ai bảo “phụ nữ thì cần gì phải thế”.`,
    `Mong ${you} luôn nhớ: chậm cũng là đang đi. Sen cũng phải đợi cả mùa mới vươn lên khỏi mặt nước.`,
    `Chúc ${you} đủ can đảm để nói “không” với những điều làm mình kiệt sức, và nói “có” với những điều giúp mình lớn lên.`,
    `Chúc ${you} một năm vững vàng: chân đứng chắc, lòng thật nhẹ, và đầu luôn ngẩng cao.`,
  ],
  /* luôn hướng về phía ánh sáng */
  sunflower: [
    `Chúc ${you} sáng nào thức dậy cũng có một lý do nhỏ để mỉm cười, dù chỉ là nắng đẹp hay ly cà phê vừa miệng.`,
    `Mong những ngày u ám của ${you} đều thật ngắn, còn những ngày nắng thì dài thật dài.`,
    `Chúc ${you} gặp toàn người tốt, tin vui đến đúng lúc, và may mắn thì cứ hay ghé qua nhà.`,
    `Mong ${you} luôn tìm thấy ánh sáng, và những lúc chưa tìm thấy, luôn có người cầm đèn đứng bên cạnh.`,
    `Chúc ${you} một năm có nhiều “lần đầu tiên” thú vị: lần đầu đến một nơi mới, lần đầu thử một món lạ, lần đầu dám làm một việc từng ngại.`,
    `Mong mọi dự định ${you} ấp ủ đều có ngày bắt đầu, và mọi bắt đầu đều có ngày thành hình.`,
    `Chúc ${you} lúc nào cũng có điều để mong chờ: một chuyến đi, một cuộc hẹn, một buổi chiều rảnh rỗi.`,
    `Mong ${you} nhìn vào gương và thấy một người đáng tự hào, vì ${you} thật sự là như thế.`,
    `Chúc ${you} hạnh phúc theo kiểu của riêng mình: không cần giống ai, không cần ai duyệt.`,
    `Chúc ${you} đi về phía nào cũng gặp nắng, và nắng nào cũng vừa đủ ấm.`,
  ],
  /* trong trẻo như thu Hà Nội */
  daisy: [
    `Chúc ${you} có một buổi chiều thu thong thả: gió heo may, một con phố vắng, và chẳng có việc gì phải vội.`,
    `Mong ${you} giữ mãi đôi mắt biết ngạc nhiên trước những điều giản dị: một gánh hoa, một khung cửa sổ đầy nắng.`,
    `Chúc ${you} có những người bạn mà ở bên họ, ${you} chẳng cần giữ kẽ, chẳng cần giải thích gì.`,
    `Mong lòng ${you} luôn trong như trời thu: có mây thì mây trôi, rồi trời lại xanh.`,
    `Chúc ${you} được ăn ngon, ngủ kỹ, và thỉnh thoảng được ai đó chiều chuộng chẳng cần lý do.`,
    `Mong ${you} có thật nhiều kỷ niệm đẹp, đẹp đến mức sau này nhắc lại vẫn thấy lòng ấm áp.`,
    `Chúc ${you} một mùa thu chậm rãi: đọc hết cuốn sách đang dở, gặp lại người bạn lâu rồi chưa gặp.`,
    `Mong những niềm vui nhỏ, như cúc họa mi, năm nào cũng tìm về với ${you}, chẳng bao giờ lỡ hẹn.`,
    `Chúc ${you} giữ được một góc riêng thật trong trẻo, nơi chẳng áp lực nào chạm tới.`,
    `Mong ${you} có lúc sống chậm lại, đủ để nghe mùi hoa sữa, ngắm lá vàng rơi, và nhận ra mình đang hạnh phúc.`,
  ],
  /* bình yên, thư thái */
  lavender: [
    `Chúc ${you} được ngủ một giấc thật sâu, sáng dậy không cần báo thức mà người vẫn nhẹ tênh.`,
    `Chúc ${you} có những buổi tối được thả lỏng hoàn toàn: việc gì chưa xong, cứ để ngày mai lo.`,
    `Mong ${you} có thật nhiều sức khỏe: lưng không mỏi, mắt không thâm, lòng không nặng.`,
    `Chúc ${you} có những giờ chỉ dành cho riêng mình: tắt điện thoại, pha ấm trà, và chẳng ai gọi tên.`,
    `Mong mọi lo toan của ${you} được chia đôi, còn mọi bình yên thì nhân lên gấp bội.`,
    `Chúc ${you} một năm không phải gồng: mệt thì nghỉ, buồn thì khóc, vui thì cười cho thỏa.`,
    `Mong ${you} luôn có một nơi để về, nơi mọi muộn phiền được để lại ngoài cửa như đôi giày.`,
    `Chúc ${you} có những ngày cuối tuần đúng nghĩa: không hạn chót, không việc dồn, chỉ có thảnh thơi.`,
    `Mong tâm trí ${you} được yên: bớt lo chuyện chưa tới, bớt tiếc chuyện đã qua.`,
    `Chúc ${you} một năm bình an: người thân khỏe mạnh, công việc êm xuôi, trong lòng không gợn sóng.`,
  ],
  /* những điều nhỏ xinh */
  baby: [
    `Chúc ${you} đi đường gặp toàn đèn xanh, ghé quán quen vẫn còn đúng món mình thích.`,
    `Mong ngày nào ${you} cũng có ít nhất một chuyện khiến mình bật cười thật to.`,
    `Chúc ${you} nhận được tin nhắn hỏi han đúng lúc đang cần, và một món quà bất ngờ chẳng nhân dịp gì.`,
    `Mong ${you} có nhiều bữa sáng không phải vội, và nhiều buổi tối ấm tiếng cười.`,
    `Chúc ${you} gửi xe không phải chờ, đặt đồ không bị giao trễ, chụp tấm ảnh nào cũng ưng.`,
    `Mong những điều nhỏ xinh cứ lần lượt tìm đến ${you}: một bông hoa, một cái ôm, một lời khen thật lòng.`,
    `Chúc ${you} có một thú vui nhỏ để vui một mình, và một người bạn để cùng vui.`,
    `Chúc ${you} được ăn những bữa cơm có người khác nấu, và rửa bát thì có người giành làm.`,
    `Mong ${you} gặp may ở cả những chuyện nhỏ nhất: mưa vừa tạnh lúc ra đường, tìm thấy món đồ tưởng đã mất.`,
    `Mong ${you} luôn có người để ý từng điều nhỏ xíu: nhắc ${you} uống nước, đưa thêm áo khoác lúc trời trở lạnh.`,
  ],
};

export const LETTER = {
  greeting: `Gửi ${R.addr} thân mến,`,
  /** dòng riêng của người gửi (từ link &loi=...), hiện ngay sau lời mở thư */
  note: R.note,
  paragraphs: [
    `Cảm ơn ${you} vì rất nhiều điều: những việc lớn ai cũng thấy, và cả những việc nhỏ lặng lẽ mỗi ngày mà hiếm ai nhớ để nói thành lời.`,
    `Nhân ngày Phụ nữ Việt Nam 20/10, chúc ${you} thật nhiều sức khỏe, có thời gian cho chính mình và được nghỉ ngơi mà không thấy áy náy. ${You} không cần lúc nào cũng phải mạnh mẽ hay hoàn hảo; được là chính mình đã là đủ.`,
    `Mong khu vườn nhỏ này khiến ${you} mỉm cười.`,
  ],
  signature: SIGNATURE,
};
