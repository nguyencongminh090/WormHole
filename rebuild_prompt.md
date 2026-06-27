# Tài liệu Hướng dẫn Tái thiết kế & Xây dựng Dự án Wormhole Gomoku Editor (Zcaro)

Tài liệu này tổng hợp chi tiết cấu trúc, chức năng, luồng dữ liệu và thiết kế của dự án **Wormhole Gomoku Editor** (Zcaro) để phục vụ cho việc xây dựng lại hoặc phát triển thêm Front-end.

---

## 1. Giới thiệu dự án
Zcaro là một trình soạn thảo thế cờ trên trình duyệt dành cho biến thể **Wormhole Gomoku** (Cờ vây lỗ đen). Luật chơi cốt lõi của biến thể này là các cặp cổng dịch chuyển (portal) cho phép nối liền các hàng 5 quân cờ qua không gian, tạo ra các đường thắng liên kết qua cổng.

Dự án hiện tại được xây dựng hoàn toàn bằng **HTML, CSS thuần và Vanilla JS**, không sử dụng thư viện ngoài hoặc công cụ build. Tất cả mã nguồn giao tiếp qua các biến toàn cục trên đối tượng `window`.

---

## 2. Kiến trúc & Cấu trúc mã nguồn

Mã nguồn được phân tách rõ ràng theo mô hình hướng chức năng, tải tuần tự theo thứ tự sau trong [index.html](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/index.html):

1. **[constants.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/constants.js) (`window.C`)**: Định nghĩa hằng số toàn cục (kích thước lưới ô, bán kính quân cờ, danh sách màu cổng/đường phân tích, bảng màu giao diện chủ đạo và định dạng loại ô).
2. **[i18n.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/i18n.js) (`window.I18n`)**: Quản lý đa ngôn ngữ (Anh/Việt) bằng cách ánh xạ các khóa dịch và cập nhật động các phần tử DOM có thuộc tính `data-i18n`, lưu ngôn ngữ đã chọn vào `localStorage`.
3. **[state.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/state.js) (`window.State`)**: Quản lý trạng thái bất biến (immutable state). Mọi hành động (place/erase) đều nhận vào trạng thái cũ và trả về một đối tượng trạng thái mới (Deep Clone).
4. **[renderer.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/renderer.js) (`window.Renderer`)**: Vẽ bàn cờ, quân cờ, khối vật cản (vân gạch SVG), cổng dịch chuyển (hiệu ứng xoáy vũ trụ accretion rings và star core), các đường phân tích, và vòng tròn nét đứt của Safe Mode lên thẻ `<canvas>`.
5. **[history.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/history.js) (`window.History`)**: Quản lý ngăn xếp (stack) hoàn tác (Undo) và làm lại (Redo) với giới hạn 200 bước, lưu trữ nhật ký di chuyển dạng văn bản.
6. **[notation.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/notation.js) (`window.Notation`)**: Chuyển đổi trạng thái bàn cờ sang chuỗi ký hiệu (notation) rút gọn và ngược lại.
7. **[export.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/export.js) (`window.Export`)**: Xuất hình ảnh canvas sạch (không có lớp phủ chỉ dẫn) thành tệp PNG hoặc lưu trực tiếp vào Clipboard.
8. **[app.js](file:///run/media/ngmint/Data/Programming/Programming/HTML/WormHole/src/app.js)**: Lớp điều khiển chính (Controller), lắng nghe sự kiện từ chuột, bàn phím và cảm ứng để cập nhật trạng thái và gọi hàm vẽ lại (`redraw()`).

---

## 3. Các tính năng & Chức năng chi tiết (Focus cho Front-end)

### 3.1. Các công cụ tương tác trên bàn cờ (`ui.tool`)
*   **Quân Đen (STONE_X) & Quân Trắng (STONE_O)**:
    *   Đặt quân cờ có số thứ tự di chuyển tự động tăng dần.
    *   Tính năng **Đánh 2 bên (Auto-switch)**: Tự động chuyển đổi công cụ giữa Đen và Trắng sau khi đặt một quân cờ thành công.
*   **Khóa / Vật cản (BLOCK)**:
    *   Đặt khối vật cản dạng gạch xếp (không cho phép đặt quân cờ lên).
    *   Được kết xuất ngẫu nhiên deterministic (dựa vào tọa độ ô) để màu gạch không thay đổi khi vẽ lại bàn cờ.
*   **Cổng dịch chuyển (HOLE)**:
    *   Đặt theo cặp 2 cổng cùng màu. Có 5 màu định sẵn: `red`, `blue`, `green`, `orange`, `purple`.
    *   **Ràng buộc Chebyshev**: Khoảng cách Chebyshev giữa 2 cổng trong một cặp phải $\ge 5$ ô (tức là $\max(|dx|, |dy|) \ge 5$).
    *   Khi đang đặt cổng thứ nhất, một chỉ dẫn (hint) sẽ xuất hiện trên thanh bên. Nhấn ô thứ hai để hoàn thành cặp.
    *   Khi xóa một cổng bất kỳ, cổng đối tác cùng cặp cũng sẽ tự động bị xóa để tránh rác dữ liệu.
*   **Đường phân tích (LINE)**:
    *   Vẽ mũi tên phân tích từ ô nguồn tới ô đích với 5 màu: `red`, `blue`, `green`, `orange`, `black`.
*   **Tẩy (ERASER)**:
    *   Xóa bất kỳ đối tượng nào tại ô click (quân cờ, vật cản, hoặc cặp cổng dịch chuyển).
    *   **Thao tác nhanh**: Nhấp chuột phải vào bất kỳ ô nào trên bàn cờ sẽ thực hiện xóa nhanh ô đó mà không cần đổi công cụ hiện tại.

### 3.2. Chế độ an toàn (Safe Mode)
*   Bật/Tắt qua nút 🔒 trên thanh công cụ.
*   Khi bật, click/chạm lần đầu vào ô trống sẽ hiển thị một vòng tròn màu cam nét đứt nhấp nháy chuyển động và thông báo "TAP AGAIN TO CONFIRM". Click/chạm lần thứ hai vào đúng ô đó mới xác nhận đặt.

### 3.3. Kính lúp phóng to khi cảm ứng (Touch/Hover Zoom Bubble)
*   Khi người dùng chạm giữ trên màn hình cảm ứng di động (hoặc hover chuột), một khung tròn nhỏ phóng to 3x3 (hoặc 7x7 tùy cấu hình) quanh ô hiện tại sẽ hiển thị lơ lửng phía trên ngón tay.
*   Mục đích: Giúp định vị chính xác ô cờ trên thiết bị di động có màn hình nhỏ.

### 3.4. Quản lý lịch sử & Lưu trữ vị trí qua URL
*   **Undo/Redo**: Phím tắt `Ctrl + Z` và `Ctrl + Y`.
*   **Nhật ký nước đi (Move Log)**: Hiển thị danh sách các nước đi ở thanh bên theo dạng `1. X H6`, `2. O I9`.
*   **Nén URL (Share Link)**: Trạng thái bàn cờ được nén bằng thuật toán **Deflate-raw** (`CompressionStream`), mã hóa sang chuỗi Base64 an toàn cho URL và cập nhật vào thuộc tính `?pos=...` trên thanh địa chỉ. Khi tải trang, tham số này được giải nén tự động để phục hồi thế cờ.

---

## 4. Định dạng ký hiệu bàn cờ (Notation Format)
Chuỗi văn bản mô tả trạng thái bàn cờ có cấu trúc dòng như sau:
```text
SIZE:17
X:h6(1),g8(3)
O:i6(2),h8(4)
BLOCK:d5,l5,n5
PORTAL:red(h13:m13),blue(l8:l13)
LINE:red(h6>l10)
```
*   `SIZE`: Kích thước bàn cờ ($9, 13, 15, 17, 19$).
*   `X` / `O`: Tọa độ quân cờ đi kèm số thứ tự nước đi trong ngoặc đơn.
*   `BLOCK`: Danh sách các ô bị khóa cách nhau bởi dấu phẩy.
*   `PORTAL`: Định dạng `<màu>(<tọa_độ_1>:<tọa_độ_2>)`.
*   `LINE`: Định dạng `<màu>(<nguồn>><đích>)`.

---

## 5. Cấu trúc dữ liệu trạng thái (`gameState`)
Trạng thái trong `state.js` được thiết kế dưới dạng một đối tượng chứa:
```javascript
{
  boardSize: 17,
  cells: {
    "h,6": { type: "X", moveNum: 1 },
    "i,6": { type: "O", moveNum: 2 },
    "d,5": { type: "block" },
    "h,13": { type: "hole", holeColorId: "red", holeGroupId: "g1" },
    "m,13": { type: "hole", holeColorId: "red", holeGroupId: "g1" }
  },
  holePairs: {
    "g1": {
      colorId: "red",
      positions: [ { col: "h", row: 13 }, { col: "m", row: 13 } ]
    }
  },
  lines: [
    { from: { col: "h", row: 6 }, to: { col: "l", row: 10 }, colorId: "red" }
  ],
  moveCounter: 5,
  lastMovePos: { col: "g", row: 8 },
  showMoveNumbers: true,
  _nextHoleId: 2
}
```

---

## 6. Gợi ý nâng cấp Front-end trong tương lai
1.  **Chuyển đổi sang Framework**: Sử dụng React, Vue hoặc Svelte kết hợp TailwindCSS để tạo giao diện hiện đại, bóng bẩy hơn.
2.  **Tách cấu trúc Canvas**: Tách biệt Canvas tương tác (vẽ quân tạm thời, hover) và Canvas tĩnh (lưới ô cờ, cổng dịch chuyển cố định) để tối ưu hóa hiệu năng render.
3.  **Tạo hiệu ứng động (VFX)**: Thêm các hiệu ứng động khi đặt cờ, hiệu ứng cổng dịch chuyển xoay liên tục bằng CSS/WebGL thay vì vẽ tĩnh trên Canvas 2D.
