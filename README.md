# Một chiếc hẹn · Heo & Bé Hai

Thiệp mời của Nguyễn Viết Anh Minh (Heo) dành cho Phan Thị Huyền Trân (Bé Hai), mừng 4 năm bên nhau và dịp 20/10.

**Buổi hẹn:** Chủ nhật **18/10/2026, 19:00**, tại **Sushi Miyagi**.

HTML, CSS, JavaScript thuần. Không cần npm, framework, server backend hay bước build. Lottie 5.13.0 và font tiếng Việt được lưu trong bộ code; website chỉ cần mạng ngoài khi xem Google Maps.

## Chạy thử

Mở terminal tại thư mục này:

```sh
python3 -m http.server 4173
```

Truy cập `http://localhost:4173`. Có thể mở `index.html` trực tiếp, nhưng Clipboard API hoạt động ổn định hơn trên localhost/HTTPS.

## Những phần đã làm

- Bó lily trắng, cẩm chướng hồng, hoa tím nhạt và giấy gói hồng theo ảnh mẫu; chuyển động nhẹ bằng **Lottie**, có ảnh tĩnh dự phòng. Chạm hoa để mở lời nhắn.
- Cappy pixel art dùng sprite gốc do chủ website chọn, có animation chạy trái/phải, đứng nghỉ, vẫy tay khi chạm và tư thế nhấc lên khi kéo. Tự đi lại và nghỉ gần mép dưới màn hình. Kéo bằng chuột/cảm ứng, bấm để nghe lời nhắn, thu nhỏ và gọi lại. Khi focus, dùng phím mũi tên để di chuyển; Home đưa Capy về góc trang. Pet dừng khi hover/focus, mở dialog, chuyển tab hoặc bật giảm chuyển động.
- Hành trình năm 1 → 4: mỗi năm 1–3 có hai ảnh theo đúng thứ tự a → b; năm 4 đang chờ kỷ niệm mới. Không còn số 01/02 dưới ảnh. Trên điện thoại, vuốt ngang để xem ảnh lớn tiếp theo; desktop hiển thị hai ảnh cạnh nhau. Bấm ảnh để xem lớn, dùng mũi tên hoặc bàn phím để chuyển ảnh.
- Thiệp riêng của Heo trong hộp thư có thể mở/đóng bằng chuột, cảm ứng hoặc bàn phím.
- Ảnh, thiệp và các phần nội dung hiện nhẹ khi cuộn đến; ảnh kế tiếp trên điện thoại hiện khi vuốt ngang. Nút nhún khi chạm, thư mở/đóng và ảnh chuyển mượt. Animation dùng Web Animations API; nội dung luôn đọc được nếu trình duyệt không hỗ trợ, và tắt chuyển động khi bật `prefers-reduced-motion`.
- Cursor có bông hoa đi theo và hoa nở khi chạm/bấm; tự tắt khi bật chế độ giảm chuyển động.
- Nhạc nền hộp nhạc tạm, được tạo bằng Web Audio; **chỉ phát sau khi bấm nút nhạc**. Có nút tắt. Nhạc dừng khi chuyển tab.
- Đếm ngược đến ngày hẹn theo mốc `2026-10-18T19:00:00+07:00`.
- Link Google Maps đúng địa chỉ được cung cấp, iframe chỉ được nạp khi mở mục bản đồ.
- Nút nhận lời hoặc xin đổi giờ. Website tạo lời nhắn để Bé Hai sao chép và tự gửi cho Heo; **không tự gửi hoặc lưu phản hồi lên server**.
- Giao diện mobile-first: CSS mặc định cho điện thoại, mở rộng bằng `min-width`; nút mở thiệp xuất hiện trước bó hoa trên mobile. Dialog có focus/đóng Escape, hỗ trợ `prefers-reduced-motion`.

## Sửa lời nhắn và nhạc

Sửa `config.js`:

```js
time: "19:00",
dateISO: "2026-10-18T19:00:00+07:00",
musicSrc: "./assets/music.mp3", // đặt file nhạc riêng vào assets/
letter: ["Đoạn 1", "Đoạn 2", "Đoạn 3"]
```

Để `musicSrc: ""` sẽ dùng giai điệu tạm có sẵn. Khi đổi ngày/địa điểm/tên, cập nhật thêm các nội dung tương ứng và metadata trong `index.html`, lời mời/nhắn trả lời trong `script.js`. `config.js` điều khiển giờ hiển thị, đếm ngược, nhạc, nội dung thư và URL bản đồ.

## Deploy đúng repository của bạn

Repository đích: <https://github.com/minhng-178/invitation-anniversary>.

1. Đưa toàn bộ nội dung của thư mục này vào **gốc repository**, gồm `.github/workflows/pages.yml` và `.nojekyll`.
2. Dùng tài khoản có quyền quản lý repository, vào **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push lên nhánh `main`, hoặc vào **Actions → Deploy invitation to GitHub Pages → Run workflow**.
4. Chờ workflow thành công. URL dự kiến: `https://minhng-178.github.io/invitation-anniversary/`.

Workflow publish HTML/CSS/JS, gồm `motion.css`, `motion.js`, `mini-pet.css` và `mini-pet.js`, cùng ảnh, font và Lottie. Các đường dẫn đều tương đối nên chạy được dưới thư mục tên repository. Tài liệu giấy phép nằm trong bộ asset; không được hiển thị trên giao diện.

Hướng dẫn chính thức: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Asset và giấy phép

- `vendor/lottie_light.min.js`: **lottie-web 5.13.0**, MIT; giấy phép kèm `vendor/LOTTIE-LICENSE.md`. [Tài liệu loadAnimation](https://github.com/airbnb/lottie-web/wiki/loadAnimation-options).
- Lora và Be Vietnam Pro được tải từ Google Fonts, có giấy phép SIL Open Font License kèm trong `assets/`.
- `assets/bouquet.webp`: minh họa riêng tạo bằng **built-in image_gen**, rồi tối ưu thành WebP 960 × 960 (242,452 bytes). PNG gốc 1254 × 1254 có nền trong suốt. Dùng một lượt tạo bó hoa mới, tham chiếu ảnh bó hoa do chủ website gửi.
- `assets/cappy/`: [Cappy trên Codex Pet Share](https://codexpetshare.com/pets/cappy), sprite gốc 1536 × 1872 RGBA, 8 × 9 ô; mỗi ô 192 × 208. Giữ nguyên sprite và manifest; ảnh poster dự phòng từ cùng nguồn. Ghi nhận nguồn trong `assets/cappy/SOURCE.md`. Renderer CSS chỉ dùng số frame có hình của từng hàng; vị trí di chuyển dùng `requestAnimationFrame` khi chạy, nghỉ dùng timeout. Không cần thư viện pet ngoài hoặc mạng để chạy pet.
- Giai điệu hộp nhạc là giai điệu tạm được lập trình trong `script.js`, không dùng bản ghi âm thương mại.
- `motion.js` và `motion.css`: hiệu ứng cuộn/chạm viết bằng JavaScript và CSS thuần; không thêm thư viện. `script.js` điều khiển chuyển động dialog, ảnh lớn và lời nhắn.
- Ảnh kỷ niệm do chủ website cung cấp. `1b.HEIC` đã chuyển thành PNG, chỉnh đúng hướng và tối ưu thêm bản WebP để tải nhanh. Ảnh gốc trong Downloads không bị chỉnh sửa. Sáu ảnh dùng bản WebP tối đa 1600 px, hiển thị nguyên khung hình; `assets/journey/1b.png` là bản PNG dự phòng.

## Kiểm tra trước khi bàn giao

Đã kiểm tra bằng trình duyệt: desktop, màn hình cảm ứng 390 px và 320 px; cỡ chữ 200% không tràn ngang; bó hoa Lottie; Cappy dùng đúng hàng sprite chạy trái/phải, vẫy tay khi chạm, tự di chuyển, kéo/thu nhỏ/gọi lại, lời nhắn không tràn viewport, dừng khi mở dialog. Nhánh giảm chuyển động được kiểm tra bằng mô phỏng MediaQueryList: pet đứng yên, vẫn mở lời nhắn khi chạm. Các chức năng thư, trả lời, sao chép, nhạc và bản đồ đã được kiểm tra ở bản trước và giữ lại. GitHub Pages cần được kiểm tra thêm tại URL thật sau khi deploy.

Cappy: lấy mẫu animation trong 23,5 giây, thấy idle/chạy trái/chạy phải và không có frame rỗng. Đã kéo bằng công cụ trình duyệt và mô phỏng thêm PointerEvent touch, kiểm tra chặn click sau kéo, pointercancel, vẫy tay khi bấm liên tiếp, ẩn/hiện, pause/resume, mở/đóng dialog. Không có lỗi hoặc cảnh báo console trong lần kiểm tra này. CSS sprite và file JavaScript đã qua kiểm tra cú pháp.

Animation mới: đã kiểm tra cuộn, vuốt ảnh và chạm nút ở 320/390 px; desktop 1440 px giữ nguyên góc nghiêng của ảnh. Thư đóng/mở liên tiếp không kẹt, trả focus về nút mở, chuyển ảnh nhanh đúng thứ tự và dùng WebP. Đã mô phỏng bật giảm chuyển động giữa lúc đóng thư, cùng trình duyệt thiếu IntersectionObserver/Web Animations API: nội dung và thao tác vẫn hoạt động. Không có lỗi/cảnh báo console; `script.js`, `motion.js` và `mini-pet.js` qua `node --check`.

## Prompt tạo bó hoa

Built-in image_gen, reference là ảnh bó hoa do chủ website cung cấp:

```text
Use case: illustration-story
Asset type: transparent hero PNG for a sophisticated romantic Vietnamese anniversary invitation.
Input images: the provided photo is a composition and flower reference only.
Primary request: exactly one elegant, full upright flower bouquet, loosely round flower head with large white lilies as the focal flowers, many pink carnations, small white daisies and filler flowers, delicate pale lavender tiny flowers, and graceful fresh green leaves. Blush pink folded wrapping paper fans open broadly behind the flowers; white paper wraps the lower stems into a narrow handle, finished with a soft pink satin ribbon. Preserve the reference bouquet's tender round shape and layered pink and white wrapping arrangement.
Style/medium: premium, very detailed watercolor and gouache illustration with subtle hand-painted texture restricted to the bouquet and wrapper. Beautiful realistic botanical forms interpreted as delicate painterly art. Fine warm neutral outlines, soft rich tonal shading, elegant refined composition.
Color palette: cream-white lilies, petal pink and blush carnations, pale lavender small flowers, muted natural green foliage, dusty blush pink paper, white lower wrapping, pink satin ribbon.
Composition/framing: square canvas; entire single upright bouquet and wrapped handle visible; centered and balanced; generous transparent margins around every edge; no cropping.
Scene/backdrop: genuine fully transparent background with alpha, isolated bouquet, no environment.
Mood: tender, romantic, sophisticated.
Constraints: no card, no tag, no text, no lettering, no signature, no watermark, no animals, no scenery, no background fill, no paper rectangle behind the image, no vase, no hands. One bouquet only.
```
# invitation-anniversary
# invitation-anniversary
